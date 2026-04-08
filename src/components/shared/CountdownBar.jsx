import { useEffect, useState } from "react";
import { getRemainingSeconds } from "../../utils/timerHelpers";

export default function CountdownBar({ endsAt, duration, onExpire, variant = "dark", size = "normal" }) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(endsAt));
  const pct = duration && remaining !== null ? (remaining / duration) * 100 : 100;
  const isUrgent = remaining !== null && remaining <= 10 && remaining > 0;
  const isHero = size === "hero";

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

  const trackClass = variant === "light" ? "bg-gray-200" : "bg-white/20";
  const fillClass = isUrgent ? "animate-pulse bg-red-400" : variant === "light" ? "bg-indigo-500" : "bg-emerald-400";
  const textClass = isUrgent
    ? "animate-pulse text-red-500 font-semibold"
    : variant === "light"
    ? "text-gray-500"
    : "text-white/80";

  return (
    <div className={`flex items-center gap-3 ${isHero ? "gap-4" : ""}`}>
      <div className={`${isHero ? "h-3" : "h-1.5"} flex-1 overflow-hidden rounded-full ${trackClass}`}>
        <div
          className={`h-full rounded-full transition-all duration-1000 ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`${isHero ? "min-w-[86px] text-3xl" : "min-w-[36px] text-xs"} font-mono font-black tabular-nums ${textClass}`}>
        {String(Math.floor((remaining || 0) / 60)).padStart(2, "0")}:{String((remaining || 0) % 60).padStart(2, "0")}
      </span>
    </div>
  );
}
