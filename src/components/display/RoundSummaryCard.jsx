import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRoundAggregatedVotes } from "../../hooks/useRoundAggregatedVotes";

const STATUS_MAP = {
  pending: { label: "Chờ", cls: "bg-slate-100 text-slate-400 border border-slate-200" },
  active:  { label: "Đang diễn ra", cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  ended:   { label: "Hoàn thành",   cls: "bg-violet-100 text-violet-700 border border-violet-200" },
};

export default function RoundSummaryCard({
  code,
  round,
  teams,
  isCurrentRound,
  onData,
  showRoundName = true,
  showDetails = true,
  showTeamSummary = true,
  showQuestionBreakdown = true,
  allowToggle = false,
  defaultExpanded = true,
  variant = "list",
}) {
  const { teamTotals, totalVotes, questions } = useRoundAggregatedVotes(code, round.id);
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded, round.id]);

  // Bubble data up for parent aggregation
  useEffect(() => {
    onData?.(round.id, { teamTotals, totalVotes, questions, roundName: round.name, roundOrder: round.order || 0 });
  }, [round.id, round.name, round.order, teamTotals, totalVotes, questions, onData]);

  const statusInfo = STATUS_MAP[round.status] || STATUS_MAP.pending;
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [teams],
  );
  const winnerVotes = useMemo(
    () => Math.max(0, ...sortedTeams.map((t) => teamTotals[t.id] || 0)),
    [sortedTeams, teamTotals],
  );
  const maxVotes = useMemo(
    () => Math.max(1, ...sortedTeams.map((t) => teamTotals[t.id] || 0)),
    [sortedTeams, teamTotals],
  );
  const winners = useMemo(
    () => sortedTeams.filter((t) => (teamTotals[t.id] || 0) === winnerVotes && winnerVotes > 0),
    [sortedTeams, teamTotals, winnerVotes],
  );
  const winnerPercent = totalVotes > 0 ? Math.round((winnerVotes / totalVotes) * 100) : 0;

  const hasTeamSummary = showDetails && showTeamSummary && sortedTeams.length > 0;
  const hasQuestionBreakdown = showDetails && showQuestionBreakdown && sortedTeams.length > 0 && questions.length > 0;
  const canShowDetails = hasTeamSummary || hasQuestionBreakdown;
  const showExpandedBody = canShowDetails && (!allowToggle || expanded);
  const winnerLabel = winners.length
    ? winners.map((team) => team.name).join(" & ")
    : "Chưa có dữ liệu";
  const isGridVariant = variant === "grid";
  const containerClass = variant === "grid"
    ? "h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    : `rounded-2xl border p-5 shadow-sm sm:p-6 transition-all ${
      isCurrentRound
        ? "border-violet-300 bg-violet-50/60 ring-2 ring-violet-200/60 shadow-violet-100"
        : "border-slate-200 bg-white"
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={containerClass}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className={`font-bold text-slate-800 truncate ${isGridVariant ? "text-base sm:text-lg" : "text-lg sm:text-xl"}`}>{showRoundName ? round.name : "Kết quả bình chọn"}</h3>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className={`mt-1.5 font-semibold text-violet-600 truncate ${isGridVariant ? "text-xs sm:text-sm" : "text-sm sm:text-base"}`}>
            🏆 {winnerLabel}
            {winners.length > 0 ? ` - ${winnerVotes} phiếu (${winnerPercent}%)` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className={`block font-bold text-slate-800 tabular-nums ${isGridVariant ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>{totalVotes}</span>
          <span className="text-xs text-slate-400 uppercase tracking-wide">phiếu</span>
        </div>
      </div>

      {!showDetails ? null : allowToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mb-4 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700"
        >
          {expanded ? "Thu gọn" : "Xem chi tiết"}
          <span>{expanded ? "▴" : "▾"}</span>
        </button>
      ) : null}

      {showExpandedBody ? (
        <>
          {hasTeamSummary ? (
            <div className={isGridVariant ? "space-y-4" : "space-y-5"}>
              {sortedTeams.map((team) => {
                const votes = teamTotals[team.id] || 0;
                const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const barW = totalVotes > 0 ? (votes / maxVotes) * 100 : 0;
                const isWinner = votes === winnerVotes && votes > 0;
                const dimmed = winners.length > 0 && !isWinner;

                return (
                  <div key={team.id} className={dimmed ? "opacity-50" : ""}>
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
                        <span className={`truncate ${isWinner ? "font-bold text-slate-900" : "font-medium text-slate-700"} ${isGridVariant ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}>
                          {team.name}
                        </span>
                        {isWinner ? <span className="text-sm">👑</span> : null}
                      </div>
                      <div className="shrink-0 flex items-baseline gap-2 tabular-nums">
                        <span className={`font-bold ${isWinner ? "text-slate-900" : "text-slate-700"} ${isGridVariant ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"}`}>
                          {votes}
                        </span>
                        <span className="text-sm text-slate-400 font-medium">phiếu</span>
                        <span className={`text-sm font-semibold ${isWinner ? "text-violet-600" : "text-slate-500"}`}>
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className={`overflow-hidden rounded-full bg-slate-100 ${isGridVariant ? "h-3.5 sm:h-4" : "h-4 sm:h-5"}`}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: team.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${barW}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {hasQuestionBreakdown ? (
            <div className={`${hasTeamSummary ? "mt-5 border-t border-slate-100 pt-5" : ""}`}>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Chi tiết theo câu hỏi</p>
              <div className="space-y-3.5">
                {questions.map((q) => {
                  const questionTotal = q.voteTotal || 0;
                  return (
                    <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <p className="truncate text-base font-semibold text-slate-700">{q.text || "Câu hỏi"}</p>
                        <span className="shrink-0 text-sm font-medium text-slate-500 tabular-nums">{questionTotal} phiếu</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sortedTeams.map((team) => {
                          const count = q.voteCounts?.[team.id] || 0;
                          const pct = questionTotal > 0 ? Math.round((count / questionTotal) * 100) : 0;
                          return (
                            <span key={`${q.id}_${team.id}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 sm:text-sm">
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
        </>
      ) : null}

      {totalVotes === 0 && round.status !== "pending" ? (
        <p className="mt-3 text-center text-xs text-slate-400">Chưa có phiếu bầu</p>
      ) : null}
    </motion.div>
  );
}

