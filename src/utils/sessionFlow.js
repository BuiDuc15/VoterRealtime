import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { makeEndsAt } from "./timerHelpers";

/* ── helpers ──────────────────────────────────────────── */

async function loadOrderedRounds(code) {
  const q = query(collection(db, "sessions", code, "rounds"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
}

async function loadOrderedQuestions(code, roundId) {
  const q = query(collection(db, "sessions", code, "rounds", roundId, "questions"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
}

function questionEndsAt(questionData, defaultDuration) {
  const dur = Number(questionData?.duration);
  if (Number.isFinite(dur) && dur > 0) return makeEndsAt(dur);
  const fallback = Number(defaultDuration);
  return Number.isFinite(fallback) && fallback > 0 ? makeEndsAt(fallback) : null;
}

function roundEndsAt(roundData, defaultDuration) {
  const dur = Number(roundData?.duration);
  if (Number.isFinite(dur) && dur > 0) return makeEndsAt(dur);
  const fallback = Number(defaultDuration);
  return Number.isFinite(fallback) && fallback > 0 ? makeEndsAt(fallback) : null;
}

function isRoundTransitionAuto(sessionData) {
  return (sessionData?.round_transition_mode || "manual") === "auto";
}

/* ── startSessionRun ──────────────────────────────────── */

export async function startSessionRun(code) {
  const sessionRef = doc(db, "sessions", code);

  // Pre-read everything outside transaction
  const [sessionSnap, orderedRounds] = await Promise.all([getDoc(sessionRef), loadOrderedRounds(code)]);
  if (!sessionSnap.exists()) return false;

  const startInContinuousMode = (sessionSnap.data()?.voter_progress_mode || "round_gated") === "continuous";

  // Continuous mode pre-loads all questions of all rounds
  const allRoundQuestions = new Map();
  if (startInContinuousMode) {
    await Promise.all(
      orderedRounds.map(async (roundDoc) => {
        const questions = await loadOrderedQuestions(code, roundDoc.id);
        allRoundQuestions.set(roundDoc.id, questions);
      })
    );
  }

  const firstRound = orderedRounds.find((d) => d.data().status === "pending");
  let firstRoundQuestions = [];
  if (firstRound && !startInContinuousMode) {
    firstRoundQuestions = await loadOrderedQuestions(code, firstRound.id);
  }
  const firstRoundIsAuto = firstRound?.data()?.question_flow_mode === "auto";
  const firstQuestionDoc = firstRoundQuestions.find((d) => d.data().status === "pending") || null;

  const autoOpenQDocs = firstRoundIsAuto
    ? firstRoundQuestions.filter((d) => d.data().status === "pending")
    : [];

  // Transaction: only reads needed for validation, then writes
  await runTransaction(db, async (tx) => {
    // Reads first
    const liveSession = await tx.get(sessionRef);
    if (!liveSession.exists()) return;
    const liveFirstRound = firstRound ? await tx.get(firstRound.ref) : null;
    const liveFirstQuestion = firstQuestionDoc ? await tx.get(firstQuestionDoc.ref) : null;

    const liveAllRounds = [];
    const liveAllQuestions = [];
    if (startInContinuousMode) {
      for (const roundDoc of orderedRounds) {
        const liveRound = await tx.get(roundDoc.ref);
        liveAllRounds.push({ ref: roundDoc.ref, live: liveRound });
        const questions = allRoundQuestions.get(roundDoc.id) || [];
        for (const qDoc of questions) {
          liveAllQuestions.push({ ref: qDoc.ref, live: await tx.get(qDoc.ref) });
        }
      }
    }

    // Read all auto-open questions (auto mode)
    const liveAutoQs = [];
    for (const qDoc of autoOpenQDocs) {
      liveAutoQs.push({ ref: qDoc.ref, live: await tx.get(qDoc.ref) });
    }

    const sessionData = liveSession.data();

    // Writes
    tx.update(sessionRef, {
      status: "active",
      current_round_id: startInContinuousMode ? null : (firstRound ? firstRound.id : null),
      current_question_id: startInContinuousMode
        ? null
        : (firstRoundIsAuto ? null : (firstQuestionDoc ? firstQuestionDoc.id : null)),
      session_ends_at: sessionData.session_duration
        ? makeEndsAt(Number(sessionData.session_duration))
        : null,
    });

    if (startInContinuousMode) {
      // In continuous mode, all rounds/questions are voter-available immediately.
      for (const { ref, live } of liveAllRounds) {
        if (live.exists()) {
          tx.update(ref, { status: "active", ends_at: null });
        }
      }
      for (const { ref, live } of liveAllQuestions) {
        if (live.exists()) {
          tx.update(ref, { status: "open", ends_at: null });
        }
      }
      return;
    }

    if (firstRound) {
      tx.update(firstRound.ref, {
        status: "active",
        ends_at: liveFirstRound?.exists() ? roundEndsAt(liveFirstRound.data(), sessionData.default_round_duration) : null,
      });
    }
    if (!firstRoundIsAuto && firstQuestionDoc && liveFirstQuestion?.exists()) {
      tx.update(firstQuestionDoc.ref, {
        status: "open",
        ends_at: questionEndsAt(liveFirstQuestion.data(), sessionData.default_question_duration),
      });
    }

    // In auto mode, open all pending questions at once
    for (const { ref, live } of liveAutoQs) {
      if (live.exists()) {
        tx.update(ref, {
          status: "open",
          ends_at: questionEndsAt(live.data(), sessionData.default_question_duration),
        });
      }
    }
  });

  return true;
}

/* ── nextQuestion ─────────────────────────────────────── */

export async function nextQuestion(code, currentRoundId, currentQuestionId) {
  if (!currentRoundId || !currentQuestionId) return false;

  const sessionRef = doc(db, "sessions", code);
  const roundRef = doc(db, "sessions", code, "rounds", currentRoundId);
  const currentQRef = doc(db, "sessions", code, "rounds", currentRoundId, "questions", currentQuestionId);

  // Pre-read
  const orderedQuestions = await loadOrderedQuestions(code, currentRoundId);
  const currentQDoc = orderedQuestions.find((d) => d.id === currentQuestionId);
  const currentOrder = currentQDoc?.data().order ?? -1;

  // Find next question: first try pending, then already-open (auto questions opened at round start)
  const nextPendingQ = orderedQuestions.find(
    (d) => d.data().status === "pending" && (d.data().order || 0) > currentOrder
  );
  const nextOpenQ = !nextPendingQ
    ? orderedQuestions.find(
        (d) => d.id !== currentQuestionId && d.data().status === "open" && (d.data().order || 0) > currentOrder
      )
    : null;
  const nextQDoc = nextPendingQ || nextOpenQ;
  const nextQIsAlreadyOpen = !nextPendingQ && !!nextOpenQ;

  if (!currentQDoc) return false;

  const shouldAdvanceRound = await runTransaction(db, async (tx) => {
    // ALL reads first
    const liveSession = await tx.get(sessionRef);
    const liveCurrentQ = await tx.get(currentQRef);
    const liveRound = await tx.get(roundRef);
    const liveNextQ = nextQDoc ? await tx.get(nextQDoc.ref) : null;

    if (!liveSession.exists() || !liveCurrentQ.exists() || !liveRound.exists()) return false;
    const s = liveSession.data();
    if (s.status !== "active" || s.current_round_id !== currentRoundId || s.current_question_id !== currentQuestionId) return false;
    if (liveCurrentQ.data().status !== "open") return false;

    // ALL writes after
    tx.update(currentQRef, { status: "closed", ends_at: null });

    if (nextQDoc && liveNextQ?.exists()) {
      if (!nextQIsAlreadyOpen) {
        // Open the pending question
        tx.update(nextQDoc.ref, { status: "open", ends_at: questionEndsAt(liveNextQ.data(), s.default_question_duration) });
      }
      tx.update(sessionRef, { current_question_id: nextQDoc.id });
      return false; // no round advance needed
    }

    // No more pending/open questions after current — check if any other question is still open
    const anyStillOpen = orderedQuestions.some(
      (d) => d.id !== currentQuestionId && d.data().status === "open"
    );

    if (anyStillOpen) {
      // Other auto questions still open for voters — don't end round
      const firstOpenOther = orderedQuestions.find(
        (d) => d.id !== currentQuestionId && d.data().status === "open"
      );
      tx.update(sessionRef, { current_question_id: firstOpenOther ? firstOpenOther.id : null });
      return false;
    }

    // All done — end round
    tx.update(liveRound.ref, { status: "ended", ends_at: null });
    tx.update(sessionRef, { current_question_id: null });
    return isRoundTransitionAuto(s);
  });

  if (shouldAdvanceRound) {
    return nextRound(code);
  }
  return true;
}

/* ── nextRound ────────────────────────────────────────── */

export async function nextRound(code) {
  const sessionRef = doc(db, "sessions", code);
  const sessionSnap = await getDoc(sessionRef);
  if (!sessionSnap.exists()) return false;

  const session = sessionSnap.data();
  const currentRoundId = session.current_round_id;
  const currentQuestionId = session.current_question_id;
  if (!currentRoundId) return false;

  const orderedRounds = await loadOrderedRounds(code);
  const currentRoundDoc = orderedRounds.find((d) => d.id === currentRoundId);
  if (!currentRoundDoc) return false;

  const nextRoundDoc = orderedRounds.find(
    (d) => d.data().status === "pending" && (d.data().order || 0) > (currentRoundDoc.data().order || -1)
  );

  // Load ALL questions for the next round so we can open auto ones
  let nextRoundQuestions = [];
  let nextQDoc = null;
  if (nextRoundDoc) {
    nextRoundQuestions = await loadOrderedQuestions(code, nextRoundDoc.id);
    nextQDoc = nextRoundQuestions.find((d) => d.data().status === "pending") || null;
  }
  const nextRoundIsAuto = nextRoundDoc?.data()?.question_flow_mode === "auto";

  const autoOpenNextQDocs = nextRoundIsAuto
    ? nextRoundQuestions.filter((d) => d.data().status === "pending")
    : [];

  // Close ALL still-open questions in current round
  const currentRoundQuestions = await loadOrderedQuestions(code, currentRoundId);
  const openCurrentQs = currentRoundQuestions.filter((d) => d.data().status === "open");

  const currentQRef = currentQuestionId
    ? doc(db, "sessions", code, "rounds", currentRoundId, "questions", currentQuestionId)
    : null;

  return runTransaction(db, async (tx) => {
    // ALL reads first
    const liveSession = await tx.get(sessionRef);
    const liveCurrentQ = currentQRef ? await tx.get(currentQRef) : null;
    const liveCurrentRound = await tx.get(currentRoundDoc.ref);
    const liveNextRound = nextRoundDoc ? await tx.get(nextRoundDoc.ref) : null;
    const liveNextQ = nextQDoc ? await tx.get(nextQDoc.ref) : null;

    // Read all open current round questions (to close them)
    const liveOpenCurrentQs = [];
    for (const qDoc of openCurrentQs) {
      if (qDoc.id !== currentQuestionId) {
        liveOpenCurrentQs.push({ ref: qDoc.ref, live: await tx.get(qDoc.ref) });
      }
    }

    // Read all auto-open questions in next round
    const liveAutoQs = [];
    for (const qDoc of autoOpenNextQDocs) {
      liveAutoQs.push({ ref: qDoc.ref, live: await tx.get(qDoc.ref) });
    }

    if (!liveSession.exists()) return false;
    const s = liveSession.data();
    if (s.status !== "active" || s.current_round_id !== currentRoundId) return false;
    if (!liveCurrentRound.exists()) return false;

    // ALL writes after

    // Close the globally-pointed current question
    if (liveCurrentQ?.exists() && liveCurrentQ.data().status === "open") {
      tx.update(currentQRef, { status: "closed", ends_at: null });
    }

    // Close ALL other still-open questions in current round
    for (const { ref, live } of liveOpenCurrentQs) {
      if (live.exists() && live.data().status === "open") {
        tx.update(ref, { status: "closed", ends_at: null });
      }
    }

    tx.update(currentRoundDoc.ref, { status: "ended", ends_at: null });

    if (!nextRoundDoc) {
      tx.update(sessionRef, { status: "ended", current_round_id: null, current_question_id: null });
      return true;
    }

    tx.update(nextRoundDoc.ref, {
      status: "active",
      ends_at: liveNextRound?.exists() ? roundEndsAt(liveNextRound.data(), s.default_round_duration) : null,
    });
    tx.update(sessionRef, { current_round_id: nextRoundDoc.id, current_question_id: nextRoundIsAuto ? null : (nextQDoc ? nextQDoc.id : null) });

    // Manual mode: open first question only
    if (!nextRoundIsAuto && nextQDoc && liveNextQ?.exists()) {
      tx.update(nextQDoc.ref, { status: "open", ends_at: questionEndsAt(liveNextQ.data(), s.default_question_duration) });
    }

    // Auto mode: open all questions in next round at once
    for (const { ref, live } of liveAutoQs) {
      if (live.exists()) {
        tx.update(ref, {
          status: "open",
          ends_at: questionEndsAt(live.data(), s.default_question_duration),
        });
      }
    }

    return true;
  });
}

/* ── endCurrentRound ─────────────────────────────────── */

export async function endCurrentRound(code) {
  const sessionRef = doc(db, "sessions", code);
  const sessionSnap = await getDoc(sessionRef);
  if (!sessionSnap.exists()) return false;

  const session = sessionSnap.data();
  const currentRoundId = session.current_round_id;
  if (!currentRoundId) return false;

  const roundRef = doc(db, "sessions", code, "rounds", currentRoundId);
  const currentRoundQuestions = await loadOrderedQuestions(code, currentRoundId);
  const openCurrentQs = currentRoundQuestions.filter((d) => d.data().status === "open");

  const shouldAdvanceRound = await runTransaction(db, async (tx) => {
    const liveSession = await tx.get(sessionRef);
    const liveRound = await tx.get(roundRef);
    if (!liveSession.exists() || !liveRound.exists()) return false;

    const s = liveSession.data();
    if (s.status !== "active" || s.current_round_id !== currentRoundId) return false;

    // Firestore requires all tx.get() calls to be completed before tx.update().
    const liveOpenCurrentQs = [];
    for (const qDoc of openCurrentQs) {
      liveOpenCurrentQs.push({ ref: qDoc.ref, live: await tx.get(qDoc.ref) });
    }

    for (const { ref, live } of liveOpenCurrentQs) {
      if (live.exists() && live.data().status === "open") {
        tx.update(ref, { status: "closed", ends_at: null });
      }
    }

    tx.update(roundRef, { status: "ended", ends_at: null });
    tx.update(sessionRef, { current_question_id: null });
    return isRoundTransitionAuto(s);
  });

  if (shouldAdvanceRound) {
    return nextRound(code);
  }
  return true;
}

/* ── resetSessionRun ──────────────────────────────────── */

export async function resetSessionRun(code) {
  const sessionRef = doc(db, "sessions", code);
  const [sessionSnap, orderedRounds] = await Promise.all([getDoc(sessionRef), loadOrderedRounds(code)]);
  if (!sessionSnap.exists()) return false;

  const session = sessionSnap.data();
  const batch = writeBatch(db);

  batch.update(sessionRef, {
    status: "waiting",
    current_round_id: null,
    current_question_id: null,
    session_version: (session.session_version || 1) + 1,
    session_ends_at: null,
  });

  for (const roundDoc of orderedRounds) {
    batch.update(roundDoc.ref, { status: "pending", ends_at: null });
    const questions = await loadOrderedQuestions(code, roundDoc.id);
    questions.forEach((qDoc) => {
      batch.update(qDoc.ref, {
        status: "pending",
        ends_at: null,
      });
    });

    // Delete shards (outside batch since they can exceed 500 ops)
    for (const qDoc of questions) {
      const shardsSnap = await getDocs(collection(db, "sessions", code, "rounds", roundDoc.id, "questions", qDoc.id, "shards"));
      await Promise.all(shardsSnap.docs.map((d) => deleteDoc(d.ref)));
    }
  }

  await batch.commit();
  return true;
}

/* ── endSession ──────────────────────────────────────── */

/**
 * Ends the whole session immediately:
 * - closes all open questions in current round
 * - marks current round as ended
 * - sets session status = "ended"
 */
export async function endSession(code) {
  const sessionRef = doc(db, "sessions", code);
  const sessionSnap = await getDoc(sessionRef);
  if (!sessionSnap.exists()) return false;

  const session = sessionSnap.data();
  if (session.status !== "active") return false;

  const currentRoundId = session.current_round_id;
  const roundRef = currentRoundId ? doc(db, "sessions", code, "rounds", currentRoundId) : null;

  const currentRoundQuestions = currentRoundId
    ? await loadOrderedQuestions(code, currentRoundId)
    : [];
  const openCurrentQs = currentRoundQuestions.filter((d) => d.data().status === "open");

  return runTransaction(db, async (tx) => {
    // ALL reads first
    const liveSession = await tx.get(sessionRef);
    const liveRound = roundRef ? await tx.get(roundRef) : null;

    const liveOpenQs = [];
    for (const qDoc of openCurrentQs) {
      liveOpenQs.push({ ref: qDoc.ref, live: await tx.get(qDoc.ref) });
    }

    if (!liveSession.exists()) return false;
    const s = liveSession.data();
    if (s.status !== "active") return false;

    // ALL writes after
    for (const { ref, live } of liveOpenQs) {
      if (live.exists() && live.data().status === "open") {
        tx.update(ref, { status: "closed", ends_at: null });
      }
    }

    if (roundRef && liveRound?.exists() && liveRound.data().status !== "ended") {
      tx.update(roundRef, { status: "ended", ends_at: null });
    }

    tx.update(sessionRef, {
      status: "ended",
      current_question_id: null,
      session_ends_at: null,
    });

    return true;
  });
}

