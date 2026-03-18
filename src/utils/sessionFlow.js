import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { makeEndsAt } from "./timerHelpers";
import { createZeroCounts } from "./voteHelpers";

function resolveQuestionEndsAt(question) {
  const duration = Number(question?.duration);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return makeEndsAt(duration);
}

async function loadOrderedRounds(code) {
  const roundsQuery = query(collection(db, "sessions", code, "rounds"), orderBy("order", "asc"));
  const snap = await getDocs(roundsQuery);
  return [...snap.docs].sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
}

async function loadOrderedQuestions(code, roundId) {
  const questionsQuery = query(collection(db, "sessions", code, "rounds", roundId, "questions"), orderBy("order", "asc"));
  const snap = await getDocs(questionsQuery);
  return [...snap.docs].sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
}

export async function startSessionRun(code) {
  const sessionRef = doc(db, "sessions", code);
  const [sessionSnap, orderedRounds] = await Promise.all([getDoc(sessionRef), loadOrderedRounds(code)]);
  if (!sessionSnap.exists()) return false;

  const firstPending = orderedRounds.find((roundDoc) => roundDoc.data().status === "pending");
  const firstQuestionId = firstPending ? (await loadOrderedQuestions(code, firstPending.id)).find((q) => q.data().status === "pending")?.id : null;

  await runTransaction(db, async (tx) => {
    const liveSessionSnap = await tx.get(sessionRef);
    if (!liveSessionSnap.exists()) return;

    let firstQuestionRef = null;
    let firstQuestionSnap = null;
    if (firstPending && firstQuestionId) {
      firstQuestionRef = doc(db, "sessions", code, "rounds", firstPending.id, "questions", firstQuestionId);
      firstQuestionSnap = await tx.get(firstQuestionRef);
    }

    tx.update(sessionRef, {
      status: "active",
      current_round_id: firstPending ? firstPending.id : null,
      current_question_id: firstQuestionId || null,
    });

    if (!firstPending) return;

    tx.update(firstPending.ref, { status: "active" });
    if (firstQuestionId && firstQuestionRef && firstQuestionSnap?.exists()) {
      tx.update(firstQuestionRef, {
          status: "open",
          ends_at: resolveQuestionEndsAt(firstQuestionSnap.data()),
      });
    }
  });

  return true;
}

export async function nextRound(code) {
  const sessionRef = doc(db, "sessions", code);
  const sessionSnap = await getDoc(sessionRef);
  if (!sessionSnap.exists()) return false;

  const session = sessionSnap.data();
  const currentRoundId = session.current_round_id;
  const currentQuestionId = session.current_question_id;

  if (!currentRoundId) return false;

  const orderedRounds = await loadOrderedRounds(code);
  const currentRoundDoc = orderedRounds.find((roundDoc) => roundDoc.id === currentRoundId);
  const nextRoundDoc = orderedRounds.find((roundDoc) => roundDoc.data().status === "pending" && (roundDoc.data().order || 0) > (currentRoundDoc?.data().order || -1));

  if (!currentRoundDoc) return false;

  const nextQuestionId = nextRoundDoc ? (await loadOrderedQuestions(code, nextRoundDoc.id)).find((q) => q.data().status === "pending")?.id : null;

  return runTransaction(db, async (tx) => {
    const liveSessionSnap = await tx.get(sessionRef);
    if (!liveSessionSnap.exists()) return false;
    const liveCurrentRoundSnap = await tx.get(currentRoundDoc.ref);

    const currentQuestionRef =
      currentQuestionId ? doc(db, "sessions", code, "rounds", currentRoundId, "questions", currentQuestionId) : null;
    const liveCurrentQuestionSnap = currentQuestionRef ? await tx.get(currentQuestionRef) : null;

    const nextQuestionRef =
      nextQuestionId && nextRoundDoc
        ? doc(db, "sessions", code, "rounds", nextRoundDoc.id, "questions", nextQuestionId)
        : null;
    const liveNextQuestionSnap = nextQuestionRef ? await tx.get(nextQuestionRef) : null;

    const liveSession = liveSessionSnap.data();
    if (!liveCurrentRoundSnap.exists() || liveSession.status !== "active" || liveSession.current_round_id !== currentRoundId) {
      return false;
    }

    if (liveCurrentQuestionSnap?.exists() && liveCurrentQuestionSnap.data().status === "open") {
      tx.update(currentQuestionRef, { status: "closed", ends_at: null });
    }
    tx.update(currentRoundDoc.ref, { status: "ended" });

    if (!nextRoundDoc) {
      tx.update(sessionRef, {
        status: "ended",
        current_round_id: null,
        current_question_id: null,
      });
      return true;
    }

    tx.update(nextRoundDoc.ref, { status: "active" });
    tx.update(sessionRef, { current_round_id: nextRoundDoc.id, current_question_id: nextQuestionId || null });

    if (nextQuestionRef && liveNextQuestionSnap?.exists()) {
      tx.update(nextQuestionRef, {
        status: "open",
        ends_at: resolveQuestionEndsAt(liveNextQuestionSnap.data()),
      });
    }

    return true;
  });
}

export async function nextQuestion(code, currentRoundId, currentQuestionId) {
  if (!currentRoundId || !currentQuestionId) return false;

  const sessionRef = doc(db, "sessions", code);
  const [sessionSnap, roundSnap, orderedQuestions] = await Promise.all([
    getDoc(sessionRef),
    getDoc(doc(db, "sessions", code, "rounds", currentRoundId)),
    loadOrderedQuestions(code, currentRoundId),
  ]);

  if (!sessionSnap.exists() || !roundSnap.exists()) return false;

  const currentQuestionDoc = orderedQuestions.find((questionDoc) => questionDoc.id === currentQuestionId);
  const nextQuestionDoc = orderedQuestions.find(
    (questionDoc) => questionDoc.data().status === "pending" && (questionDoc.data().order || 0) > (currentQuestionDoc?.data().order || -1)
  );

  if (!currentQuestionDoc) return false;

  const shouldAdvanceRound = await runTransaction(db, async (tx) => {
    const liveSessionSnap = await tx.get(sessionRef);
    if (!liveSessionSnap.exists()) return false;

    const liveSession = liveSessionSnap.data();
    if (
      liveSession.status !== "active" ||
      liveSession.current_round_id !== currentRoundId ||
      liveSession.current_question_id !== currentQuestionId
    ) {
      return false;
    }

    const liveCurrentQuestionSnap = await tx.get(currentQuestionDoc.ref);
    if (!liveCurrentQuestionSnap.exists() || liveCurrentQuestionSnap.data().status !== "open") {
      return false;
    }

    const liveNextQuestionSnap = nextQuestionDoc ? await tx.get(nextQuestionDoc.ref) : null;
    const liveRoundSnap = await tx.get(roundSnap.ref);
    if (!liveRoundSnap.exists()) return false;

    tx.update(currentQuestionDoc.ref, { status: "closed", ends_at: null });

    if (nextQuestionDoc) {
      if (!liveNextQuestionSnap?.exists()) return false;

      tx.update(nextQuestionDoc.ref, {
        status: "open",
        ends_at: resolveQuestionEndsAt(liveNextQuestionSnap.data()),
      });
      tx.update(sessionRef, { current_question_id: nextQuestionDoc.id });
      return false;
    }


    const roundData = liveRoundSnap.data();
    tx.update(roundSnap.ref, { status: "ended" });
    tx.update(sessionRef, { current_question_id: null });

    return Boolean(roundData.auto_next);
  });

  if (shouldAdvanceRound) {
    return nextRound(code);
  }

  return true;
}

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
    batch.update(roundDoc.ref, {
      status: "pending",
    });

    const questions = await loadOrderedQuestions(code, roundDoc.id);
    questions.forEach((questionDoc) => {
      batch.update(questionDoc.ref, {
        status: "pending",
        ends_at: null,
        total_votes: 0,
        vote_counts: createZeroCounts(teams),
      });
    });
  }

  await batch.commit();
  return true;
}

