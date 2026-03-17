import { motion } from "framer-motion";
import { calcResults, getWinners } from "../../utils/voteHelpers";

export default function WinnerAnnounce({ teams, voteCounts }) {
  const results = calcResults(teams, voteCounts);
  const winners = getWinners(results);

  if (!winners.length) return null;

  const isTie = winners.length > 1;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="rounded-3xl border border-white/20 bg-slate-900/70 p-12 text-center backdrop-blur"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <p className="mb-4 text-4xl">{isTie ? "🤝 Đồng hạng" : "🏆 Đội chiến thắng"}</p>
        {winners.map((winner) => (
          <div key={winner.id}>
            <p className="text-7xl font-black" style={{ color: winner.color }}>
              {winner.name}
            </p>
            <p className="mt-2 text-3xl text-slate-100">
              {winner.pct}% — {winner.votes} phiếu
            </p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

