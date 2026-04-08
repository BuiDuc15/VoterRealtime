import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRoundAggregatedVotes } from "../../hooks/useRoundAggregatedVotes";

/* ── helpers ─────────────────────────────────────────── */

/** Build a union of all teams from all rounds (deduped by id) */
function buildUnionTeams(rounds, fallbackTeams) {
  const map = new Map();
  for (const round of rounds) {
    const teams = round.teams || fallbackTeams || [];
    for (const t of teams) {
      if (!map.has(t.id)) map.set(t.id, t);
    }
  }
  return [...map.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function RoundDataCollector({ code, round, onData }) {
  const { teamTotals, totalVotes, questions } = useRoundAggregatedVotes(code, round.id);

  useEffect(() => {
    onData?.(round.id, { teamTotals, totalVotes, questions, roundName: round.name, roundOrder: round.order || 0, roundTeams: round.teams || [] });
  }, [round.id, round.name, round.order, round.teams, teamTotals, totalVotes, questions, onData]);

  return null;
}

/* ── Main: Final results (only shown when session ended) ── */
export default function DisplayResult({
  code,
  rounds,
  teams,
  sessionStatus,
  onSessionSummary,
}) {
  const [allRoundData, setAllRoundData] = useState({});

  useEffect(() => {
    const roundIds = new Set(rounds.map((r) => r.id));
    setAllRoundData((prev) => {
      const next = Object.fromEntries(Object.entries(prev).filter(([rid]) => roundIds.has(rid)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [rounds]);

  const handleData = useCallback((roundId, payload) => {
    setAllRoundData((prev) => {
      const cur = prev[roundId];
      if (
        cur?.totalVotes === payload.totalVotes
        && cur?.teamTotals === payload.teamTotals
        && cur?.questions === payload.questions
      ) {
        return prev;
      }
      return { ...prev, [roundId]: payload };
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

  const unionTeams = useMemo(() => buildUnionTeams(rounds, teams), [rounds, teams]);

  useEffect(() => {
    const sortedTeams = [...unionTeams].sort((a, b) => (a.order || 0) - (b.order || 0));
    const leaderVotes = Math.max(0, ...sortedTeams.map((t) => sessionTotals[t.id] || 0));
    const leaders = sortedTeams.filter((t) => (sessionTotals[t.id] || 0) === leaderVotes && leaderVotes > 0);
    const leaderPercent = sessionTotal > 0 ? Math.round((leaderVotes / sessionTotal) * 100) : 0;

    onSessionSummary?.({
      sessionTotals,
      sessionTotal,
      leaderVotes,
      leaderPercent,
      leaders,
    });
  }, [unionTeams, sessionTotals, sessionTotal, onSessionSummary]);

  // Per-round results
  const roundResults = useMemo(() => {
    return rounds
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((round) => {
        const data = allRoundData[round.id];
        if (!data) return null;
        const roundTeams = (round.teams || teams || []).sort((a, b) => (a.order || 0) - (b.order || 0));
        const roundWinnerVotes = Math.max(0, ...roundTeams.map((t) => data.teamTotals[t.id] || 0));
        const roundWinners = roundTeams.filter((t) => (data.teamTotals[t.id] || 0) === roundWinnerVotes && roundWinnerVotes > 0);
        return {
          round,
          roundTeams,
          teamTotals: data.teamTotals,
          totalVotes: data.totalVotes,
          questions: data.questions || [],
          winners: roundWinners,
          winnerVotes: roundWinnerVotes,
        };
      })
      .filter(Boolean);
  }, [rounds, allRoundData, teams]);

  const maxVotes = Math.max(1, ...unionTeams.map((t) => sessionTotals[t.id] || 0));
  const winnerVotes = Math.max(0, ...unionTeams.map((t) => sessionTotals[t.id] || 0));
  const winners = unionTeams.filter((t) => (sessionTotals[t.id] || 0) === winnerVotes && winnerVotes > 0);
  const isEnded = sessionStatus === "ended";

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-5xl space-y-6">

        {/* Data collectors */}
        {rounds.map((round) => (
          <RoundDataCollector key={round.id} code={code} round={round} onData={handleData} />
        ))}

        {/* ── Overall Summary ── */}
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
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">🏆 Kết quả cuối</p>
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Tổng hợp tất cả vòng</h2>
              {winners.length > 0 ? (
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

          <div className="space-y-4">
            {unionTeams.map((team) => {
              const votes = sessionTotals[team.id] || 0;
              const pct = sessionTotal > 0 ? Math.round((votes / sessionTotal) * 100) : 0;
              const barW = sessionTotal > 0 ? (votes / maxVotes) * 100 : 0;
              const isWinner = votes === winnerVotes && votes > 0;
              const dimmed = !isWinner && winnerVotes > 0 && isEnded;

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

        {/* ── Per-round results ── */}
        {roundResults.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-700">Chi tiết từng vòng</h3>
            {roundResults.map(({ round, roundTeams, teamTotals: rTotals, totalVotes: rTotal, questions: rQuestions, winners: rWinners }) => {
              const rMaxVotes = Math.max(1, ...roundTeams.map((t) => rTotals[t.id] || 0));
              return (
                <motion.div
                  key={round.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-800 sm:text-lg">{round.name}</h4>
                      {rWinners.length > 0 ? (
                        <p className="mt-0.5 text-xs font-semibold text-violet-600">
                          🏆 {rWinners.map((w) => w.name).join(" & ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-lg font-bold text-slate-800 tabular-nums">{rTotal}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">phiếu</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {roundTeams.map((team) => {
                      const votes = rTotals[team.id] || 0;
                      const pct = rTotal > 0 ? Math.round((votes / rTotal) * 100) : 0;
                      const barW = rTotal > 0 ? (votes / rMaxVotes) * 100 : 0;
                      const isW = rWinners.some((w) => w.id === team.id);
                      const dimmed = rWinners.length > 0 && !isW;

                      return (
                        <div key={team.id} className={dimmed ? "opacity-50" : ""}>
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
                              <span className={`text-sm truncate ${isW ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                                {team.name}
                              </span>
                              {isW ? <span className="text-sm">👑</span> : null}
                            </div>
                            <div className="shrink-0 flex items-baseline gap-1.5 tabular-nums">
                              <span className={`text-base font-bold ${isW ? "text-slate-900" : "text-slate-700"}`}>{votes}</span>
                              <span className="text-xs text-slate-400">phiếu</span>
                              <span className={`text-xs font-semibold ${isW ? "text-violet-600" : "text-slate-500"}`}>({pct}%)</span>
                            </div>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
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

                  {/* Per-question detail inside round */}
                  {rQuestions.length > 0 ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chi tiết câu hỏi</p>
                      <div className="space-y-2">
                        {rQuestions.map((q) => {
                          const qTotal = q.voteTotal || 0;
                          return (
                            <div key={q.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-slate-700">{q.text || "Câu hỏi"}</p>
                                <span className="shrink-0 text-xs font-medium text-slate-500 tabular-nums">{qTotal} phiếu</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {roundTeams.map((team) => {
                                  const count = q.voteCounts?.[team.id] || 0;
                                  const pctQ = qTotal > 0 ? Math.round((count / qTotal) * 100) : 0;
                                  return (
                                    <span key={`${q.id}_${team.id}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                                      {team.name}: {count} ({pctQ}%)
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
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
