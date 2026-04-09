import { motion } from "framer-motion";

const FIREWORK_SPECS = [
  { x: "16%", y: "28%", color: "#60a5fa", delay: 0.0 },
  { x: "34%", y: "20%", color: "#fbbf24", delay: 0.5 },
  { x: "52%", y: "26%", color: "#34d399", delay: 1.1 },
  { x: "72%", y: "22%", color: "#fb7185", delay: 1.7 },
  { x: "86%", y: "30%", color: "#c084fc", delay: 2.2 },
];

const PARTICLE_VECTORS = [
  [0, -54],
  [38, -38],
  [54, 0],
  [38, 38],
  [0, 54],
  [-38, 38],
  [-54, 0],
  [-38, -38],
];

function FireworkBurst({ x, y, color, delay = 0 }) {
  return (
    <div className="pointer-events-none absolute" style={{ left: x, top: y }}>
      <motion.span
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
        transition={{ duration: 1.2, ease: "easeOut", repeat: Infinity, repeatDelay: 2.2, delay }}
      />
      <motion.span
        className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ borderColor: color }}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.2, 1.2, 1.5] }}
        transition={{ duration: 1.2, ease: "easeOut", repeat: Infinity, repeatDelay: 2.2, delay }}
      />
      {PARTICLE_VECTORS.map(([dx, dy], idx) => (
        <motion.span
          key={`${x}_${y}_${idx}`}
          className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
          animate={{ x: [0, dx], y: [0, dy], opacity: [0, 1, 0], scale: [0.5, 1, 0.7] }}
          transition={{ duration: 1.2, ease: "easeOut", repeat: Infinity, repeatDelay: 2.2, delay: delay + idx * 0.015 }}
        />
      ))}
    </div>
  );
}

export default function EndSessionCelebration({
  sessionName,
  summary,
  roundSummaries = [],
  onShowDetails,
}) {
  const hasVotes = (summary?.sessionTotal || 0) > 0;
  const leaders = summary?.leaders || [];
  const isTie = leaders.length > 1;

  const orderedRoundSummaries = [...roundSummaries]
    .sort((a, b) => (a.roundOrder || 0) - (b.roundOrder || 0));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 text-white backdrop-blur-md">
      <div className="relative flex min-h-screen items-center justify-center px-4 py-5 sm:px-6 sm:py-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-80">
          <div className="absolute left-1/2 top-[18%] h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute left-[12%] top-[65%] h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="absolute right-[8%] top-[35%] h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
          {FIREWORK_SPECS.map((item) => (
            <FireworkBurst key={`${item.x}_${item.y}`} x={item.x} y={item.y} color={item.color} delay={item.delay} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative w-full max-w-[96vw] rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl sm:p-8"
        >
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65 sm:text-xs">
            K?t thúc session
          </p>
          <h1 className="mt-2 text-center text-2xl font-black leading-tight sm:text-4xl">
            B?ng công b? k?t qu? round
          </h1>
          <p className="mt-1 text-center text-sm text-white/70 sm:text-base">{sessionName}</p>

          {hasVotes && leaders.length > 0 ? (
            <div className="mt-7">
              <div className="rounded-2xl border border-emerald-200/25 bg-emerald-400/10 px-5 py-5 text-center sm:px-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/85 sm:text-sm">
                  {isTie ? "Ð?ng h?ng chung cu?c" : "Ð?i th?ng chung cu?c"}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2.5 sm:gap-3">
                  {leaders.map((team) => (
                    <span
                      key={team.id}
                      className="inline-flex items-center rounded-full px-4 py-2 text-xl font-black text-slate-900 shadow-lg sm:text-2xl"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-5 text-center">
              <p className="text-lg font-bold">Chua có d? li?u bình ch?n</p>
            </div>
          )}

          {orderedRoundSummaries.length > 0 ? (
            <div className="mt-7">
              <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-white/60 sm:text-sm">
                K?t qu? t?ng round
              </p>
              <div className="space-y-4">
                {orderedRoundSummaries.map((item) => {
                  const isRoundTie = (item.winners?.length || 0) > 1;
                  const winnerName = item.winners?.length
                    ? item.winners.map((team) => team.name).join(" & ")
                    : "Chua có d? li?u";

                  return (
                    <div key={item.roundId} className="rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-4 sm:px-6 sm:py-5">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <p className="text-base font-semibold text-white/80 sm:text-lg">{item.roundName}</p>
                        <p className="text-xl font-black text-white sm:text-2xl">{winnerName}</p>
                      </div>
                      <p className="mt-2 text-sm text-white/70 sm:text-base">
                        {isRoundTie ? "Ð?ng h?ng" : "Th?ng round"} ({item.winnerVotes || 0} phi?u, {item.winnerPercent || 0}%)
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={onShowDetails}
              className="rounded-xl border border-white/30 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-900 shadow-lg transition hover:shadow-xl sm:text-sm"
            >
              Xem chi ti?t
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
