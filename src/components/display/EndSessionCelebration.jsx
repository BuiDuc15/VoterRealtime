import { motion } from "framer-motion";

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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 text-white">
      <div className="relative flex min-h-screen items-center justify-center px-4 py-4 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -right-24 bottom-8 h-64 w-64 rounded-full bg-cyan-300/20 blur-2xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative w-full max-w-6xl rounded-3xl border border-white/25 bg-black/20 p-5 shadow-2xl backdrop-blur-md sm:p-7"
        >
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 sm:text-xs">
            Kết thúc phiên
          </p>
          <h1 className="mt-2 text-center text-2xl font-black leading-tight sm:text-4xl">
            Công bố đội thắng theo từng round 🏆
          </h1>
          <p className="mt-1 text-center text-sm text-white/80 sm:text-base">{sessionName}</p>

          {hasVotes && leaders.length > 0 ? (
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-white/80">
                  {isTie ? "Đồng hạng nhất 🤝" : "Quán quân 👑"}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  {leaders.map((team) => (
                    <motion.span
                      key={team.id}
                      className="inline-flex items-center rounded-full px-4 py-2 text-lg font-black text-slate-900 shadow-lg"
                      style={{ backgroundColor: team.color }}
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    >
                      {team.name}
                    </motion.span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3 text-center sm:p-4">
                  <p className="text-xs uppercase tracking-wider text-white/70">Tổng phiếu</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">{summary.sessionTotal}</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3 text-center sm:p-4">
                  <p className="text-xs uppercase tracking-wider text-white/70">Phiếu dẫn đầu</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">{summary.leaderVotes}</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3 text-center sm:p-4">
                  <p className="text-xs uppercase tracking-wider text-white/70">Tỷ lệ</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">{summary.leaderPercent}%</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/25 bg-white/10 p-5 text-center">
              <p className="text-lg font-bold">Chưa có dữ liệu bình chọn</p>
              <p className="mt-1 text-sm text-white/80">Bạn vẫn có thể xem trang chi tiết để kiểm tra từng câu hỏi.</p>
            </div>
          )}

          {orderedRoundSummaries.length > 0 ? (
            <div className="mt-5">
              <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
                Kết quả tóm tắt theo round
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {orderedRoundSummaries.map((item) => {
                  const isRoundTie = (item.winners?.length || 0) > 1;
                  const winnerName = item.winners?.length ? item.winners.map((team) => team.name).join(" & ") : "Chưa có dữ liệu";
                  return (
                    <div key={item.roundId} className="rounded-xl border border-white/20 bg-white/10 p-3">
                      <p className="truncate text-xs font-bold text-white/85">{item.roundName}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-black text-white">{winnerName}</p>
                      <p className="mt-1 text-[11px] text-white/80">
                        {isRoundTie ? "Đồng hạng" : "Thắng round"} · {item.winnerVotes || 0} phiếu ({item.winnerPercent || 0}%)
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onShowDetails}
              className="rounded-xl bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-indigo-700 shadow-lg transition hover:shadow-xl sm:text-sm"
            >
              Xem chi tiết kết quả
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
