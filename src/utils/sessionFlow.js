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

/* ── startSessionRun ──────────────────────────────────── */

export async function startSessionRun(code) {
  const sessionRef = doc(db, "sessions", code);

  // Pre-read everything outside transaction
  const [sessionSnap, orderedRounds] = await Promise.all([getDoc(sessionRef), loadOrderedRounds(code)]);
  if (!sessionSnap.exists()) return false;

  const firstRound = orderedRounds.find((d) => d.data().status === "pending");
  let firstQuestionDoc = null;
  if (firstRound) {
    const questions = await loadOrderedQuestions(code, firstRound.id);
    firstQuestionDoc = questions.find((d) => d.data().status === "pending") || null;
  }

  // Transaction: only reads needed for validation, then writes
  await runTransaction(db, async (tx) => {
    // Reads first
    const liveSession = await tx.get(sessionRef);
    if (!liveSession.exists()) return;
    const liveFirstQuestion = firstQuestionDoc ? await tx.get(firstQuestionDoc.ref) : null;
    const sessionData = liveSession.data();

    // Writes
    tx.update(sessionRef, {
      status: "active",
      current_round_id: firstRound ? firstRound.id : null,
      current_question_id: firstQuestionDoc ? firstQuestionDoc.id : null,
    });

    if (firstRound) {
      tx.update(firstRound.ref, { status: "active" });
    }
    if (firstQuestionDoc && liveFirstQuestion?.exists()) {
      tx.update(firstQuestionDoc.ref, {
        status: "open",
        ends_at: questionEndsAt(liveFirstQuestion.data(), sessionData.default_question_duration),
      });
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
  const nextQDoc = orderedQuestions.find(
    (d) => d.data().status === "pending" && (d.data().order || 0) > (currentQDoc?.data().order ?? -1)
  );

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
      tx.update(nextQDoc.ref, { status: "open", ends_at: questionEndsAt(liveNextQ.data(), s.default_question_duration) });
      tx.update(sessionRef, { current_question_id: nextQDoc.id });
      return false; // no round advance needed
    }

    // No more questions in this round
    tx.update(liveRound.ref, { status: "ended" });
    tx.update(sessionRef, { current_question_id: null });
    return Boolean(liveRound.data().auto_next);
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

  let nextQDoc = null;
  if (nextRoundDoc) {
    const questions = await loadOrderedQuestions(code, nextRoundDoc.id);
    nextQDoc = questions.find((d) => d.data().status === "pending") || null;
  }

  // Optionally need to close current question
  const currentQRef = currentQuestionId
    ? doc(db, "sessions", code, "rounds", currentRoundId, "questions", currentQuestionId)
    : null;

  return runTransaction(db, async (tx) => {
    // ALL reads first
    const liveSession = await tx.get(sessionRef);
    const liveCurrentQ = currentQRef ? await tx.get(currentQRef) : null;
    const liveNextQ = nextQDoc ? await tx.get(nextQDoc.ref) : null;

    if (!liveSession.exists()) return false;
    const s = liveSession.data();
    if (s.status !== "active" || s.current_round_id !== currentRoundId) return false;

    // ALL writes after
    if (liveCurrentQ?.exists() && liveCurrentQ.data().status === "open") {
      tx.update(currentQRef, { status: "closed", ends_at: null });
    }
    tx.update(currentRoundDoc.ref, { status: "ended" });

    if (!nextRoundDoc) {
      tx.update(sessionRef, { status: "ended", current_round_id: null, current_question_id: null });
      return true;
    }

    tx.update(nextRoundDoc.ref, { status: "active" });
    tx.update(sessionRef, { current_round_id: nextRoundDoc.id, current_question_id: nextQDoc ? nextQDoc.id : null });

    if (nextQDoc && liveNextQ?.exists()) {
      tx.update(nextQDoc.ref, { status: "open", ends_at: questionEndsAt(liveNextQ.data(), s.default_question_duration) });
    }

    return true;
  });
}

/* ── resetSessionRun ──────────────────────────────────── */

export async function resetSessionRun(code, teams) {
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
  });

  for (const roundDoc of orderedRounds) {
    batch.update(roundDoc.ref, { status: "pending" });
    const questions = await loadOrderedQuestions(code, roundDoc.id);
    questions.forEach((qDoc) => {
      batch.update(qDoc.ref, {
        status: "pending",
        ends_at: null,
      });
    });

    // Delete shards + votes (outside batch since they can exceed 500 ops)
    for (const qDoc of questions) {
      const shardsSnap = await getDocs(collection(db, "sessions", code, "rounds", roundDoc.id, "questions", qDoc.id, "shards"));
      await Promise.all(shardsSnap.docs.map((d) => deleteDoc(d.ref)));
      const votesSnap = await getDocs(collection(db, "sessions", code, "rounds", roundDoc.id, "questions", qDoc.id, "votes"));
      await Promise.all(votesSnap.docs.map((d) => deleteDoc(d.ref)));
    }
  }

  await batch.commit();
  return true;
}
