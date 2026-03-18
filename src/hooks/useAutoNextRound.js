import { useEffect, useRef } from "react";

export function useAutoNextRound({ currentRound, canAdvanceRound = false, onNextRound }) {
  const fired = useRef(false);

  useEffect(() => {
    if (!canAdvanceRound || !currentRound?.id || !currentRound?.auto_next) {
      fired.current = false;
      return undefined;
    }

    if (fired.current) return undefined;

    fired.current = true;
    onNextRound?.();

    return undefined;
  }, [canAdvanceRound, currentRound?.id, currentRound?.auto_next, onNextRound]);
}

