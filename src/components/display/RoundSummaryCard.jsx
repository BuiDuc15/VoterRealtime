import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRoundAggregatedVotes } from "../../hooks/useRoundAggregatedVotes";

const STATUS_MAP = {
  pending: { label: "Chờ", cls: "bg-slate-100 text-slate-400 border border-slate-200" },
  active:  { label: "Đang diễn ra", cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  ended:   { label: "Hoàn thành",   cls: "bg-violet-100 text-violet-700 border border-violet-200" },
};

export default function RoundSummaryCard({ code, round, teams, isCurrentRound, onData, showRoundName = true }) {
  const { teamTotals, totalVotes, questions } = useRoundAggregatedVotes(code, round.id);

  // Bubble data up for parent aggregation
  useEffect(() => {
    onData?.(round.id, { teamTotals, totalVotes, questions, roundName: round.name, roundOrder: round.order || 0 });
  }, [round.id, round.name, round.order, teamTotals, totalVotes, questions, onData]);

  const maxVotes = useMemo(
    () => Math.max(1, ...teams.map((t) => teamTotals[t.id] || 0)),
    [teams, teamTotals],
  );
  const winnerVotes = useMemo(
    () => Math.max(0, ...teams.map((t) => teamTotals[t.id] || 0)),
    [teams, teamTotals],
  );

  const statusInfo = STATUS_MAP[round.status] || STATUS_MAP.pending;
  const sortedTeams = [...teams].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border p-5 shadow-sm sm:p-6 transition-all ${
        isCurrentRound
          ? "border-violet-300 bg-violet-50/60 ring-2 ring-violet-200/60 shadow-violet-100"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className="text-base font-bold text-slate-800 sm:text-lg truncate">{showRoundName ? round.name : "Kết quả bình chọn"}</h3>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusInfo.cls}`}>
            {statusInfo.label}
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-lg font-bold text-slate-800 tabular-nums">{totalVotes}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">phiếu</span>
        </div>
      </div>

      {/* Team bars */}
      <div className="space-y-3.5">
        {sortedTeams.map((team) => {
          const votes = teamTotals[team.id] || 0;
          const pct   = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const barW  = totalVotes > 0 ? (votes / maxVotes) * 100 : 0;
          const isWinner = round.status === "ended" && votes === winnerVotes && votes > 0;
          const dimmed  = round.status === "ended" && !isWinner && winnerVotes > 0;

          return (
            <div key={team.id} className={dimmed ? "opacity-50" : ""}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className={`text-sm truncate ${isWinner ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                    {team.name}
                  </span>
                  {isWinner ? <span className="text-sm">👑</span> : null}
                </div>
                {/* Absolute + relative */}
                <div className="shrink-0 flex items-baseline gap-1.5 tabular-nums">
                  <span className={`text-base font-bold sm:text-lg ${isWinner ? "text-slate-900" : "text-slate-700"}`}>
                    {votes}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">phiếu</span>
                  <span className={`text-xs font-semibold ${isWinner ? "text-violet-600" : "text-slate-500"}`}>
                    ({pct}%)
                  </span>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 sm:h-4">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: team.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${barW}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {totalVotes === 0 && round.status !== "pending" ? (
        <p className="mt-3 text-center text-xs text-slate-400">Chưa có phiếu bầu</p>
      ) : null}

      {questions.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chi tiết theo câu hỏi</p>
          <div className="space-y-2.5">
            {questions.map((q) => {
              const questionTotal = q.voteTotal || 0;
              return (
                <div key={q.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-700">{q.text || "Câu hỏi"}</p>
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
    </motion.div>
  );
}
