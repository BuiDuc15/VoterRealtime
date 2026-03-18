import { useEffect, useState } from "react";
import { getRemainingSeconds } from "../../utils/timerHelpers";

export default function CountdownTimer({ endsAt, duration, onExpire, size = "normal", className = "" }) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(endsAt));
  const dim = size === "large" ? 120 : 64;
  const r = dim / 2 - 6;
  const circumference = 2 * Math.PI * r;
  const progress = duration && remaining !== null ? remaining / duration : 1;
  const offset = circumference * (1 - progress);
  const isUrgent = remaining !== null && remaining <= 10 && remaining > 0;

  useEffect(() => {
    if (!endsAt) return undefined;
    const tick = () => {
      const secs = getRemainingSeconds(endsAt);
      setRemaining(secs);
      if (secs === 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  const m = String(Math.floor((remaining || 0) / 60)).padStart(2, "0");
  const s = String((remaining || 0) % 60).padStart(2, "0");

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={isUrgent ? "#F87171" : "#34D399"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s linear" }}
        />
      </svg>
      <span
        className={`absolute font-mono font-bold tabular-nums ${isUrgent ? "text-red-400 animate-pulse" : "text-white"} ${size === "large" ? "text-3xl" : "text-base"}`}
      >
        {m}:{s}
      </span>
    </div>
  );
}
