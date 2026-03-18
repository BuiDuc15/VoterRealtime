import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

export function useQuestions(code, roundId) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code || !roundId) {
      setQuestions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const q = query(collection(db, "sessions", code, "rounds", roundId, "questions"), orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setQuestions(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsub;
  }, [code, roundId]);

  return { questions, loading };
}

