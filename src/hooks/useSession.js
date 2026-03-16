import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useSession(code) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!code) return undefined;

    setLoading(true);
    const ref = doc(db, "sessions", code);
    const unsub = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        setSession(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setIsOffline(snap.metadata.fromCache && !navigator.onLine);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsub;
  }, [code]);

  return { session, loading, isOffline };
}

