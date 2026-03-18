import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Aggregates real-time vote counts across ALL questions in a round.
 * Returns { questions, teamTotals, totalVotes, loading }
 */
export function useRoundAggregatedVotes(code, roundId) {
  const [questions, setQuestions] = useState([]);
  const [voteData, setVoteData] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. Listen to questions in this round
  useEffect(() => {
    if (!code || !roundId) {
      setQuestions([]);
      setVoteData({});
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const q = query(
      collection(db, "sessions", code, "rounds", roundId, "questions"),
      orderBy("order", "asc"),
    );

    return onSnapshot(q, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [code, roundId]);

  // Stable key for question IDs to avoid re-subscribing on every render
  const questionIds = useMemo(() => questions.map((q) => q.id).join(","), [questions]);

  // 2. Listen to shards for every question
  useEffect(() => {
    if (!code || !roundId || !questions.length) {
      setVoteData({});
      return undefined;
    }

    const unsubs = [];

    questions.forEach((q) => {
      const shardsRef = collection(
        db, "sessions", code, "rounds", roundId, "questions", q.id, "shards",
      );

      const unsub = onSnapshot(shardsRef, (snap) => {
        const counts = {};
        let total = 0;

        snap.docs.forEach((d) => {
          const { vote_counts = {}, total: t = 0 } = d.data();
          Object.entries(vote_counts).forEach(([teamId, count]) => {
            counts[teamId] = (counts[teamId] || 0) + count;
          });
          total += t;
        });

        setVoteData((prev) => ({ ...prev, [q.id]: { counts, total } }));
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, roundId, questionIds]);

  // 3. Aggregate
  const result = useMemo(() => {
    const teamTotals = {};
    let totalVotes = 0;

    const questionResults = questions.map((q) => {
      const qv = voteData[q.id] || { counts: {}, total: 0 };

      Object.entries(qv.counts).forEach(([tid, c]) => {
        teamTotals[tid] = (teamTotals[tid] || 0) + c;
      });
      totalVotes += qv.total;

      return { ...q, voteCounts: qv.counts, voteTotal: qv.total };
    });

    return { questions: questionResults, teamTotals, totalVotes };
  }, [questions, voteData]);

  return { ...result, loading };
}

