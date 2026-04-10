import { buildChartData, getWinners } from "../../utils/voteHelpers";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

export default function LiveChart({ teams, voteCounts = {}, roundStatus, title }) {
    const data = useMemo(() => buildChartData(teams, voteCounts), [teams, voteCounts]);
    const sortedData = useMemo(() => [...data].sort((a, b) => b.votes - a.votes), [data]);
    const totalVotes = data.reduce((sum, item) => sum + item.votes, 0);

    const winnerNames = (roundStatus === "closed" ? getWinners(data) : []).map((winner) => winner.name);

    return (
        <div className="h-full rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</p>
                <p className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-200">Tổng: {totalVotes} phiếu</p>
            </div>

            {sortedData.length ? (
                <div className="relative h-[260px] w-full">
                    <AnimatePresence>
                        {sortedData.map((entry, index) => (
                            <motion.div
                                key={entry.id}
                                layout
                                initial={{ opacity: 0, y: 50 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    x: `${(index / sortedData.length) * 100}%`,
                                    width: `${100 / sortedData.length}%`,
                                }}
                                exit={{ opacity: 0, y: -50 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="absolute bottom-0 flex flex-col items-center"
                                style={{
                                    paddingLeft: '5px',
                                    paddingRight: '5px',
                                }}
                            >
                                <div className="relative w-full h-full flex flex-col justify-end items-center">
                                    <div className="text-center mb-2 z-10">
                                        <p className="text-sm font-bold text-white">{entry.votes} phiếu</p>
                                        <p className="text-xs text-slate-300">({entry.pct}%)</p>
                                    </div>
                                    <motion.div
                                        className="w-full rounded-t-lg"
                                        style={{
                                            backgroundColor: entry.color,
                                            opacity: winnerNames.length && !winnerNames.includes(entry.name) ? 0.35 : 1,
                                        }}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${entry.pct}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                    />
                                    <p className="mt-2 text-xs font-bold text-center text-slate-200 truncate w-full">{entry.name}</p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-600 text-sm text-slate-400">
                    Chưa có dữ liệu đội thi.
                </div>
            )}
        </div>
    );
}
