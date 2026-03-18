import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { NUM_SHARDS, MAX_VOTE_RETRIES, RETRY_BASE_DELAY } from "./config";

// Hash voterToken → shard index 0..NUM_SHARDS-1
export function getShardId(voterToken) {
  let hash = 0;
  for (let i = 0; i < voterToken.length; i++) {
    hash = (Math.imul(31, hash) + voterToken.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % NUM_SHARDS;
}

export function shardRef(code, roundId, questionId, shardId) {
  return doc(db, "sessions", code, "rounds", roundId, "questions", questionId, "shards", String(shardId));
}

export function voteRef(code, roundId, questionId, voterToken) {
  return doc(db, "sessions", code, "rounds", roundId, "questions", questionId, "votes", voterToken);
}

export function questionRef(code, roundId, questionId) {
  return doc(db, "sessions", code, "rounds", roundId, "questions", questionId);
}

// Core submit — 1 attempt
async function attemptVote(code, roundId, questionId, voterToken, choices) {
  const shardId = getShardId(voterToken);
  const sRef = shardRef(code, roundId, questionId, shardId);
  const vRef = voteRef(code, roundId, questionId, voterToken);
  const qRef = questionRef(code, roundId, questionId);

  await runTransaction(db, async (tx) => {
    // ALL reads first (Firestore transaction rule)
    const vSnap = await tx.get(vRef);
    const qSnap = await tx.get(qRef);
    const sSnap = await tx.get(sRef);

    // Lớp 2: idempotency — vote doc đã tồn tại → từ chối
    if (vSnap.exists()) throw new Error("ALREADY_VOTED");

    // Lớp 3: check question vẫn open
    if (!qSnap.exists()) throw new Error("NOT_FOUND");
    if (qSnap.data().status !== "open") throw new Error("QUESTION_CLOSED");

    // ALL writes after reads
    const prevCounts = sSnap.exists() ? { ...sSnap.data().vote_counts } : {};
    const prevTotal = sSnap.exists() ? sSnap.data().total || 0 : 0;

    choices.forEach((teamId) => {
      prevCounts[teamId] = (prevCounts[teamId] || 0) + 1;
    });

    tx.set(sRef, { vote_counts: prevCounts, total: prevTotal + 1 });
    tx.set(vRef, { choices, voted_at: serverTimestamp(), shard: shardId });
  });
}

// Submit với exponential backoff retry
export async function submitVoteWithRetry(code, roundId, questionId, voterToken, choices) {
  for (let attempt = 0; attempt < MAX_VOTE_RETRIES; attempt++) {
    try {
      await attemptVote(code, roundId, questionId, voterToken, choices);
      return { success: true };
    } catch (err) {
      // Lỗi logic — không retry
      if (err.message === "ALREADY_VOTED") return { success: false, reason: "already_voted" };
      if (err.message === "QUESTION_CLOSED") return { success: false, reason: "closed" };
      if (err.message === "NOT_FOUND") return { success: false, reason: "not_found" };

      // Lỗi contention / network — retry với backoff
      if (attempt < MAX_VOTE_RETRIES - 1) {
        const jitter = Math.random() * 100;
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt) + jitter;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return { success: false, reason: "network_error" };
    }
  }
  return { success: false, reason: "network_error" };
}

