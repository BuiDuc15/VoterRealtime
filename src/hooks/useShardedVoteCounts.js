import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useShardedVoteCounts(code, roundId, questionId) {
  const [result, setResult] = useState({ counts: {}, total: 0 });

  useEffect(() => {
    if (!code || !roundId || !questionId) {
      setResult({ counts: {}, total: 0 });
      return undefined;
    }

    const shardsRef = collection(db, "sessions", code, "rounds", roundId, "questions", questionId, "shards");

    return onSnapshot(shardsRef, (snap) => {
      const merged = {};
      let total = 0;

      snap.docs.forEach((d) => {
        const { vote_counts = {}, total: t = 0 } = d.data();
        Object.entries(vote_counts).forEach(([teamId, count]) => {
          merged[teamId] = (merged[teamId] || 0) + count;
        });
        total += t;
      });

      setResult({ counts: merged, total });
    });
  }, [code, roundId, questionId]);

  return result;
}

