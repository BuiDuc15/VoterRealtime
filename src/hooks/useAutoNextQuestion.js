import { useEffect, useRef } from "react";

export function useAutoNextQuestion({ currentQuestion, enabled = true, onNextQuestion }) {
  const triggered = useRef(false);

  useEffect(() => {
    if (
      !enabled ||
      !currentQuestion ||
      currentQuestion.status !== "open" ||
      !currentQuestion.auto_next ||
      !currentQuestion.ends_at
    ) {
      return undefined;
    }

    triggered.current = false;
    const diff = currentQuestion.ends_at.toMillis() - Date.now();

    if (diff <= 0) {
      onNextQuestion?.();
      return undefined;
    }

    const timer = setTimeout(() => {
      if (!triggered.current) {
        triggered.current = true;
        onNextQuestion?.();
      }
    }, diff);

    return () => clearTimeout(timer);
  }, [enabled, currentQuestion?.id, currentQuestion?.status, currentQuestion?.auto_next, currentQuestion?.ends_at, onNextQuestion]);
}

