import { useEffect, useRef } from "react";

export function useAutoNextRound({ currentRound, enabled = true, onNextRound }) {
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || !currentRound?.id) {
      fired.current = false;
      return undefined;
    }

    // Fallback: round already ended and auto_next is on.
    if (currentRound.status === "ended" && currentRound.auto_next) {
      if (fired.current) return undefined;
      fired.current = true;
      onNextRound?.();
      return undefined;
    }

    // Timer-driven round advance.
    if (currentRound.status !== "active" || !currentRound.ends_at) {
      fired.current = false;
      return undefined;
    }

    fired.current = false;
    const diff = currentRound.ends_at.toMillis() - Date.now();

    if (diff <= 0) {
      if (!fired.current) {
        fired.current = true;
        onNextRound?.();
      }
      return undefined;
    }

    const timer = setTimeout(() => {
      if (!fired.current) {
        fired.current = true;
        onNextRound?.();
      }
    }, diff);

    return () => clearTimeout(timer);
  }, [enabled, currentRound?.id, currentRound?.status, currentRound?.auto_next, currentRound?.ends_at, onNextRound]);
}

