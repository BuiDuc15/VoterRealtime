import { useEffect, useState } from "react";
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
  overallSummaryVisibility = "show",
  onShowDetails,
}) {
  const allowOverallSummary = overallSummaryVisibility !== "hide";
  const [showOverallSummary, setShowOverallSummary] = useState(allowOverallSummary);

  useEffect(() => {
    setShowOverallSummary(allowOverallSummary);
  }, [allowOverallSummary]);

  const hasVotes = (summary?.sessionTotal || 0) > 0;
  const leaders = summary?.leaders || [];
  const isTie = leaders.length > 1;

  const orderedRoundSummaries = [...roundSummaries]
    .sort((a, b) => (a.roundOrder || 0) - (b.roundOrder || 0));

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-amber-50 via-white to-sky-100 text-slate-900">
      <div className="relative flex min-h-screen items-center justify-center px-4 py-5 sm:px-6 sm:py-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-100">
          <div className="absolute left-1/2 top-[20%] h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-200/50 blur-3xl" />
          <div className="absolute left-[8%] top-[72%] h-64 w-64 rounded-full bg-violet-200/45 blur-3xl" />
          <div className="absolute right-[6%] top-[30%] h-72 w-72 rounded-full bg-amber-200/60 blur-3xl" />
          <div className="absolute left-1/3 top-[42%] h-56 w-56 rounded-full bg-white/70 blur-3xl" />
          {FIREWORK_SPECS.map((item) => (
            <FireworkBurst key={`${item.x}_${item.y}`} x={item.x} y={item.y} color={item.color} delay={item.delay} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative w-full max-w-[96vw] rounded-3xl border border-indigo-100 bg-white p-6 shadow-[0_20px_80px_rgba(79,70,229,0.25)] sm:p-8"
        >
          <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600/80 sm:text-sm">
            Kết thúc phiên
          </p>
          <h1 className="mt-2 text-center text-2xl font-black leading-tight text-indigo-900 sm:text-4xl">
            Công bố đội thắng theo từng round 🏆
          </h1>
          <p className="mt-1 text-center text-sm text-slate-600 sm:text-base">{sessionName}</p>

          {allowOverallSummary ? (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setShowOverallSummary((prev) => !prev)}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-indigo-700 transition hover:bg-indigo-100 sm:text-sm"
              >
                {showOverallSummary ? "Ẩn kết quả chung cuộc" : "Hiện kết quả chung cuộc"}
              </button>
            </div>
          ) : null}

          {showOverallSummary ? (
            hasVotes && leaders.length > 0 ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center sm:px-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 sm:text-sm">
                    {isTie ? "Đồng hạng chung cuộc" : "Đội thắng chung cuộc"}
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2.5 sm:gap-3">
                    {leaders.map((team) => (
                      <span
                        key={team.id}
                        className="inline-flex items-center rounded-full px-4 py-2 text-xl font-black text-slate-900 shadow-sm sm:text-2xl"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-indigo-100 bg-white p-3 text-center sm:p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Tổng phiếu</p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-slate-900">{summary?.sessionTotal || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-white p-3 text-center sm:p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Phiếu dẫn đầu</p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-slate-900">{summary?.leaderVotes || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-white p-3 text-center sm:p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Tỷ lệ</p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-slate-900">{summary?.leaderPercent || 0}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-center">
                <p className="text-lg font-bold text-slate-700">Chưa có dữ liệu bình chọn</p>
              </div>
            )
          ) : null}

          {orderedRoundSummaries.length > 0 ? (
            <div className="mt-6">
              <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-sm">
                Kết quả theo từng round
              </p>
              <div className="space-y-4">
                {orderedRoundSummaries.map((item) => {
                  const isRoundTie = (item.winners?.length || 0) > 1;
                  const winnerName = item.winners?.length
                    ? item.winners.map((team) => team.name).join(" & ")
                    : "Chưa có dữ liệu";

                  return (
                    <div key={item.roundId} className="rounded-2xl border border-indigo-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <p className="text-base font-semibold text-slate-700 sm:text-lg">{item.roundName}</p>
                        <p className="text-xl font-black text-indigo-900 sm:text-2xl">{winnerName}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 sm:text-base">
                        {isRoundTie ? "Đồng hạng" : "Thắng round"} ({item.winnerVotes || 0} phiếu, {item.winnerPercent || 0}%)
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {onShowDetails ? (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={onShowDetails}
                className="rounded-xl border border-indigo-200 bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-indigo-500 hover:shadow-xl sm:text-sm"
              >
                Xem chi tiết
              </button>
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
