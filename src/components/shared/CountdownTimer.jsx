import { useEffect, useRef, useState } from "react";

export default function CountdownTimer({ endsAt, onExpire, className = "" }) {
  const [remaining, setRemaining] = useState(0);
  const expired = useRef(false);

  useEffect(() => {
    if (!endsAt) return undefined;

    expired.current = false;
    const tick = () => {
      const diff = endsAt.toMillis() - Date.now();
      if (diff <= 0) {
        setRemaining(0);
        if (!expired.current) {
          expired.current = true;
          onExpire?.();
        }
        return;
      }
      setRemaining(Math.ceil(diff / 1000));
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  const m = String(Math.floor(remaining / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  const isUrgent = remaining <= 10 && remaining > 0;

  return (
    <span
      className={`font-mono text-xl font-bold tabular-nums ${isUrgent ? "animate-pulse text-red-500" : ""} ${className}`}
    >
      {m}:{s}
    </span>
  );
}

