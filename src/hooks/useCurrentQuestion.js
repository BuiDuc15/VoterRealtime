import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useCurrentQuestion(code, session) {
  const [question, setQuestion] = useState(null);

  useEffect(() => {
    if (!code || !session?.current_round_id || !session?.current_question_id) {
      setQuestion(null);
      return undefined;
    }

    const ref = doc(
      db,
      "sessions",
      code,
      "rounds",
      session.current_round_id,
      "questions",
      session.current_question_id
    );

    return onSnapshot(ref, (snap) => {
      setQuestion(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [code, session?.current_round_id, session?.current_question_id]);

  return question;
}

