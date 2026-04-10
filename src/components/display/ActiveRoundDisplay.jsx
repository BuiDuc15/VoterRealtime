import { useEffect, useMemo, useRef, useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { useRoundAggregatedVotes } from "../../hooks/useRoundAggregatedVotes";

export default function ActiveRoundDisplay({
  code,
  round,
  teams,
  currentQuestion,
  enableRoundCheer = true,
  showDetails = true,
  showTeamSummary = true,
  showQuestionBreakdown = true,
}) {
  const { teamTotals, totalVotes, questions } = useRoundAggregatedVotes(code, round.id);

  /* Sort teams by vote count descending for the animated ranking */
  const rankedTeams = useMemo(
    () =>
      [...teams]
        .map((t) => ({ ...t, votes: teamTotals[t.id] || 0 }))
        .sort((a, b) => b.votes - a.votes || (a.order || 0) - (b.order || 0)),
    [teams, teamTotals],
  );

  /* Keep original order for breakdowns */
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [teams],
  );

  const maxVotes = useMemo(
    () => Math.max(1, ...rankedTeams.map((t) => t.votes)),
    [rankedTeams],
  );
  const winnerVotes = useMemo(
    () => Math.max(0, ...rankedTeams.map((t) => t.votes)),
    [rankedTeams],
  );

  const isRoundEnded = round.status === "ended";
  const winners = isRoundEnded
    ? rankedTeams.filter((t) => t.votes === winnerVotes && winnerVotes > 0)
    : [];
  const [showEndRoundOverlay, setShowEndRoundOverlay] = useState(false);
  const prevRoundStatusRef = useRef(round.status);

  useEffect(() => {
    const prev = prevRoundStatusRef.current;
    if (enableRoundCheer && round.status === "ended" && prev !== "ended") {
      setShowEndRoundOverlay(true);
    }
    if (!enableRoundCheer || round.status !== "ended") {
      setShowEndRoundOverlay(false);
    }
    prevRoundStatusRef.current = round.status;
  }, [round.status, round.id, enableRoundCheer]);

  const winnerNames = winners.map((w) => w.name).join(" & ");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      {showEndRoundOverlay ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-3xl rounded-3xl border border-violet-200 bg-white p-8 text-center shadow-2xl sm:p-10"
          >
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-500">Kết thúc round</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900 sm:text-5xl">{round.name}</h2>
            {winners.length > 0 ? (
              <>
                <p className="mt-4 text-lg font-semibold text-slate-600">Đội chiến thắng</p>
                <p className="mt-1 text-2xl font-black text-violet-700 sm:text-4xl">🏆 {winnerNames}</p>
              </>
            ) : (
              <p className="mt-5 text-xl font-semibold text-slate-500">Chưa có dữ liệu bình chọn</p>
            )}
            <button
              type="button"
              onClick={() => setShowEndRoundOverlay(false)}
              className="mt-8 rounded-2xl bg-violet-600 px-6 py-3 text-base font-bold text-white transition hover:bg-violet-500"
            >
              Xem kết quả chi tiết
            </button>
          </motion.div>
        </div>
      ) : null}

      {/* Current question */}
      {currentQuestion && currentQuestion.status === "open" ? (
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 text-center shadow-md sm:p-8"
        >
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-indigo-500 sm:text-base">Câu hỏi đang mở</p>
          <h3 className="text-2xl font-bold text-slate-900 sm:text-4xl">{currentQuestion.text}</h3>
          {currentQuestion.description ? (
            <p className="mt-3 text-base text-slate-600 sm:text-xl">{currentQuestion.description}</p>
          ) : null}
        </motion.div>
      ) : null}

      {/* Team vote bars — main display with animated ranking */}
      {showTeamSummary ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`rounded-3xl border-2 p-6 shadow-md sm:p-8 ${
            isRoundEnded
              ? "border-violet-300 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-violet-100"
              : "border-slate-200 bg-white shadow-slate-100"
          }`}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-500">
                {isRoundEnded ? "🏆 Kết quả vòng" : "📊 Kết quả realtime"}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{round.name}</h3>
            </div>
            <div className="text-right shrink-0">
              <span className="block text-5xl font-black text-slate-900 tabular-nums sm:text-6xl">{totalVotes}</span>
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">tổng phiếu</span>
            </div>
          </div>

          <LayoutGroup>
            <div className="space-y-5">
              {rankedTeams.map((team, index) => {
                const votes = team.votes;
                const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const barW = totalVotes > 0 ? (votes / maxVotes) * 100 : 0;
                const isWinner = isRoundEnded && votes === winnerVotes && votes > 0;
                const dimmed = isRoundEnded && !isWinner && winnerVotes > 0;
                const rank = index + 1;

                return (
                  <motion.div
                    key={team.id}
                    layout
                    transition={{
                      layout: { type: "spring", stiffness: 300, damping: 30, duration: 0.5 },
                    }}
                    className={dimmed ? "opacity-50" : ""}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums ${
                            rank === 1 && votes > 0
                              ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                              : rank === 2 && votes > 0
                                ? "bg-slate-100 text-slate-600 ring-2 ring-slate-300"
                                : rank === 3 && votes > 0
                                  ? "bg-orange-50 text-orange-600 ring-2 ring-orange-200"
                                  : "bg-slate-50 text-slate-400"
                          }`}
                        >
                          {rank}
                        </span>
                        <span className="h-4 w-4 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: team.color }} />
                        <span className={`text-xl truncate ${isWinner ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}>
                          {team.name}
                        </span>
                        {isWinner ? <span className="text-xl">👑</span> : null}
                      </div>
                      <div className="shrink-0 flex items-baseline gap-2 tabular-nums">
                        <span className={`text-3xl font-extrabold sm:text-4xl ${isWinner ? "text-slate-900" : "text-slate-700"}`}>
                          {votes}
                        </span>
                        <span className="text-base text-slate-500 font-medium">phiếu</span>
                        <span className={`text-base font-bold ${isWinner ? "text-violet-700" : "text-slate-500"}`}>
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-6 overflow-hidden rounded-full bg-slate-100 sm:h-7">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: team.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${barW}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </LayoutGroup>

          {totalVotes === 0 ? (
            <p className="mt-5 text-center text-lg text-slate-500">Chưa có phiếu bầu nào...</p>
          ) : null}
        </motion.div>
      ) : null}

      {/* Per-question breakdown */}
      {showDetails && showQuestionBreakdown && questions.length > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Chi tiết theo câu hỏi</p>
          <div className="space-y-3">
            {questions.map((q) => {
              const questionTotal = q.voteTotal || 0;
              const isOpen = q.status === "open";
              return (
                <div key={q.id} className={`rounded-xl border p-3 ${isOpen ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 bg-slate-50/70"}`}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shrink-0" /> : null}
                      <p className="truncate text-sm font-semibold text-slate-700">{q.text || "Câu hỏi"}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-500 tabular-nums">{questionTotal} phiếu</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sortedTeams.map((team) => {
                      const count = q.voteCounts?.[team.id] || 0;
                      const pct = questionTotal > 0 ? Math.round((count / questionTotal) * 100) : 0;
                      return (
                        <span key={`${q.id}_${team.id}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                          {team.name}: {count} ({pct}%)
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

