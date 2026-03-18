import { useEffect, useRef } from "react";

export function useAutoNext({ currentRound, onNextRound, enabled = true }) {
  const triggered = useRef(false);

  useEffect(() => {
    if (!enabled || !currentRound || currentRound.status !== "open" || !currentRound.ends_at) {
      return undefined;
    }

    triggered.current = false;
    const diff = currentRound.ends_at.toMillis() - Date.now();
    if (diff <= 0) {
      onNextRound();
      return undefined;
    }

    const timer = setTimeout(() => {
      if (!triggered.current) {
        triggered.current = true;
        onNextRound();
      }
    }, diff);

    return () => clearTimeout(timer);
  }, [enabled, currentRound?.id, currentRound?.status, currentRound?.ends_at, onNextRound]);
}

