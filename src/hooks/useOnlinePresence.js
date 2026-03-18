import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { PRESENCE_INTERVAL, PRESENCE_TIMEOUT } from "../utils/config";

export function useVoterPresence(code, voterToken) {
  useEffect(() => {
    if (!code || !voterToken) return undefined;
    const ref = doc(db, "sessions", code, "presence", voterToken);

    const beat = () => setDoc(ref, { last_seen: serverTimestamp(), session_code: code }, { merge: true }).catch(() => {});

    beat();
    const id = setInterval(beat, PRESENCE_INTERVAL);

    return () => {
      clearInterval(id);
      deleteDoc(ref).catch(() => {});
    };
  }, [code, voterToken]);
}

export function useOnlineCount(code) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!code) return undefined;
    const ref = collection(db, "sessions", code, "presence");
    return onSnapshot(ref, (snap) => {
      const threshold = Date.now() - PRESENCE_TIMEOUT;
      const active = snap.docs.filter((d) => {
        const ls = d.data().last_seen;
        return ls && ls.toMillis() > threshold;
      });
      setCount(active.length);
    });
  }, [code]);

  return count;
}
