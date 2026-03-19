import { motion } from "framer-motion";

export default function EndSessionCelebration({
  sessionName,
  summary,
  onShowDetails,
}) {
  const hasVotes = (summary?.sessionTotal || 0) > 0;
  const leaders = summary?.leaders || [];
  const isTie = leaders.length > 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -right-24 bottom-8 h-64 w-64 rounded-full bg-cyan-300/20 blur-2xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative w-full max-w-4xl rounded-3xl border border-white/25 bg-white/12 p-6 shadow-2xl backdrop-blur-md sm:p-10"
        >
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/80 sm:text-sm">
            Ket thuc phien
          </p>
          <h1 className="mt-2 text-center text-2xl font-black leading-tight sm:text-4xl">
            Chuc mung doi chien thang!
          </h1>
          <p className="mt-2 text-center text-sm text-white/80 sm:text-base">{sessionName}</p>

          {hasVotes && leaders.length > 0 ? (
            <div className="mt-8 space-y-5">
              <div className="text-center">
                <p className="text-sm font-semibold text-white/80">
                  {isTie ? "Dong hang nhat" : "Quan quan"}
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
                <div className="rounded-2xl border border-white/25 bg-white/10 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-white/70">Tong phieu</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">{summary.sessionTotal}</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-white/70">Phieu dan dau</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">{summary.leaderVotes}</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-white/70">Ty le</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">{summary.leaderPercent}%</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/25 bg-white/10 p-5 text-center">
              <p className="text-lg font-bold">Chua co du lieu binh chon</p>
              <p className="mt-1 text-sm text-white/80">Ban van co the xem trang chi tiet de kiem tra tung cau hoi.</p>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onShowDetails}
              className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 shadow-lg transition hover:shadow-xl sm:text-base"
            >
              Xem chi tiet ket qua
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
