import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

export function useRounds(code) {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return undefined;

    const q = query(collection(db, "sessions", code, "rounds"), orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRounds(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsub;
  }, [code]);

  return { rounds, loading };
}

