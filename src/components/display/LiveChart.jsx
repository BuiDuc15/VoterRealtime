import { buildChartData, getWinners } from "../../utils/voteHelpers";
import { motion, LayoutGroup } from "framer-motion";
import { useMemo } from "react";

export default function LiveChart({ teams, voteCounts = {}, roundStatus, title }) {
    const data = useMemo(() => buildChartData(teams, voteCounts), [teams, voteCounts]);
    const sortedData = useMemo(() => [...data].sort((a, b) => b.votes - a.votes), [data]);
    const totalVotes = data.reduce((sum, item) => sum + item.votes, 0);
    const maxVotes = Math.max(1, ...sortedData.map((d) => d.votes));

    const winnerNames = (roundStatus === "closed" ? getWinners(data) : []).map((winner) => winner.name);

    return (
        <div className="h-full rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</p>
                <p className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-200">Tổng: {totalVotes} phiếu</p>
            </div>

            {sortedData.length ? (
                <LayoutGroup>
                    <div className="space-y-3">
                        {sortedData.map((entry, index) => {
                            const barW = totalVotes > 0 ? (entry.votes / maxVotes) * 100 : 0;
                            const dimmed = winnerNames.length > 0 && !winnerNames.includes(entry.name);
                            const rank = index + 1;

                            return (
                                <motion.div
                                    key={entry.id}
                                    layout
                                    transition={{
                                        layout: { type: "spring", stiffness: 300, damping: 30, duration: 0.5 },
                                    }}
                                    className={dimmed ? "opacity-40" : ""}
                                >
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black tabular-nums ${
                                                    rank === 1 && entry.votes > 0
                                                        ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/50"
                                                        : "bg-slate-700 text-slate-400"
                                                }`}
                                            >
                                                {rank}
                                            </span>
                                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-sm font-semibold text-slate-200 truncate">{entry.name}</span>
                                        </div>
                                        <div className="shrink-0 flex items-baseline gap-1.5 tabular-nums">
                                            <span className="text-lg font-bold text-white">{entry.votes}</span>
                                            <span className="text-xs text-slate-400">({entry.pct}%)</span>
                                        </div>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-full bg-slate-700/60">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: entry.color }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${barW}%` }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </LayoutGroup>
            ) : (
                <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-600 text-sm text-slate-400">
                    Chưa có dữ liệu đội thi.
                </div>
            )}
        </div>
    );
}
