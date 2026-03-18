import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import RoundSummaryCard from "./RoundSummaryCard";

/* ── helpers ─────────────────────────────────────────── */
function getGridClass(count) {
  if (count === 1) return null;                      // handled separately
  if (count === 2) return "grid grid-cols-1 lg:grid-cols-2 gap-5";
  if (count === 3) return "grid grid-cols-1 md:grid-cols-3 gap-5";
  return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5";
}

/* ── FinalResultSection (inline) ─────────────────────── */
function FinalResultSection({ teams, sessionTotals, sessionTotal, sessionStatus }) {
  const sortedTeams = [...teams].sort((a, b) => (a.order || 0) - (b.order || 0));
  const maxVotes = Math.max(1, ...sortedTeams.map((t) => sessionTotals[t.id] || 0));
  const winnerVotes = Math.max(0, ...sortedTeams.map((t) => sessionTotals[t.id] || 0));
  const winners = sortedTeams.filter((t) => (sessionTotals[t.id] || 0) === winnerVotes && winnerVotes > 0);
  const isEnded = sessionStatus === "ended";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border-2 p-5 sm:p-7 shadow-md ${
        isEnded
          ? "border-violet-300 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-violet-100"
          : "border-slate-200 bg-white shadow-slate-100"
      }`}
    >
      {/* Title */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
            {isEnded ? "🏆 Kết quả cuối" : "📊 Tổng kết hiện tại"}
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            {isEnded ? "Final Result — Tổng hợp tất cả vòng" : "Live Summary"}
          </h2>
          {winners.length > 0 && isEnded ? (
            <p className="mt-1 text-sm font-semibold text-violet-700">
              Dẫn đầu: {winners.map((w) => w.name).join(" & ")}
              {winners.length === 1 ? " 🏆" : " 🤝 Hòa điểm"}
            </p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <span className="block text-3xl font-black text-slate-900 tabular-nums sm:text-4xl">{sessionTotal}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">tổng phiếu</span>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-4">
        {sortedTeams.map((team) => {
          const votes = sessionTotals[team.id] || 0;
          const pct   = sessionTotal > 0 ? Math.round((votes / sessionTotal) * 100) : 0;
          const barW  = sessionTotal > 0 ? (votes / maxVotes) * 100 : 0;
          const isWinner = votes === winnerVotes && votes > 0;
          const dimmed   = !isWinner && winnerVotes > 0 && isEnded;

          return (
            <div key={team.id} className={dimmed ? "opacity-50" : ""}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="h-4 w-4 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: team.color }} />
                  <span className={`text-base truncate ${isWinner ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}>
                    {team.name}
                  </span>
                  {isWinner ? <span className="text-base">👑</span> : null}
                </div>
                <div className="shrink-0 flex items-baseline gap-2 tabular-nums">
                  <span className={`text-xl font-extrabold sm:text-2xl ${isWinner ? "text-slate-900" : "text-slate-700"}`}>
                    {votes}
                  </span>
                  <span className="text-sm text-slate-400 font-medium">phiếu</span>
                  <span className={`text-sm font-bold ${isWinner ? "text-violet-700" : "text-slate-500"}`}>
                    ({pct}%)
                  </span>
                </div>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-slate-100 sm:h-5">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: team.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${barW}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Main ─────────────────────────────────────────────── */
export default function DisplayResult({ code, rounds, teams, currentRoundId, showRoundLabel, currentRoundName, sessionStatus }) {
  // Collect per-round data bubbled up from RoundSummaryCards
  const [allRoundData, setAllRoundData] = useState({});

  const handleData = useCallback((roundId, teamTotals, totalVotes) => {
    setAllRoundData((prev) => {
      const cur = prev[roundId];
      if (cur?.totalVotes === totalVotes && cur?.teamTotals === teamTotals) return prev;
      return { ...prev, [roundId]: { teamTotals, totalVotes } };
    });
  }, []);

  // Aggregate across all rounds
  const { sessionTotals, sessionTotal } = useMemo(() => {
    const totals = {};
    let total = 0;
    Object.values(allRoundData).forEach(({ teamTotals, totalVotes }) => {
      Object.entries(teamTotals).forEach(([tid, v]) => { totals[tid] = (totals[tid] || 0) + v; });
      total += totalVotes;
    });
    return { sessionTotals: totals, sessionTotal: total };
  }, [allRoundData]);

  const endedRounds  = rounds.filter((r) => r.status === "ended").length;
  const activeRounds = rounds.filter((r) => r.status === "active").length;
  const pendingRounds = rounds.filter((r) => r.status === "pending").length;

  const gridClass = getGridClass(rounds.length);
  const singleRound = rounds.length === 1;

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">

        {/* ── Final / Live Summary ── */}
        <FinalResultSection
          teams={teams}
          sessionTotals={sessionTotals}
          sessionTotal={sessionTotal}
          sessionStatus={sessionStatus}
        />

        {/* ── Round header strip ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-base font-bold text-slate-700 sm:text-lg">
              Chi tiết theo từng vòng
              {showRoundLabel && currentRoundName ? (
                <span className="ml-2 text-sm font-normal text-slate-400">· Hiện tại: {currentRoundName}</span>
              ) : null}
            </h3>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600">{rounds.length} vòng</span>
            {endedRounds  > 0 ? <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700">{endedRounds} xong</span>  : null}
            {activeRounds > 0 ? <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">{activeRounds} đang chạy</span> : null}
            {pendingRounds > 0 ? <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-500">{pendingRounds} chờ</span>        : null}
          </div>
        </div>

        {/* ── Round cards ── */}
        {singleRound ? (
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <RoundSummaryCard
                code={code}
                round={rounds[0]}
                teams={teams}
                isCurrentRound={rounds[0].id === currentRoundId}
                onData={handleData}
              />
            </div>
          </div>
        ) : (
          <div className={gridClass}>
            {rounds.map((round) => (
              <RoundSummaryCard
                key={round.id}
                code={code}
                round={round}
                teams={teams}
                isCurrentRound={round.id === currentRoundId}
                onData={handleData}
              />
            ))}
          </div>
        )}

        {rounds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-400">
            Chưa có vòng nào được tạo.
          </div>
        ) : null}
      </div>
    </div>
  );
}
