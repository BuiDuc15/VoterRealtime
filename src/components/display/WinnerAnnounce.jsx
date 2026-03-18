import { motion } from "framer-motion";

export default function WinnerAnnounce({ winners, isTie }) {
  return (
    <motion.div
      className="py-6 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
    >
      <p className="mb-2 text-sm uppercase tracking-widest text-white/40">
        {isTie ? "Hòa điểm" : "Dẫn đầu vòng này"}
      </p>
      <div className="flex flex-wrap justify-center gap-6">
        {winners.map((w) => (
          <motion.span
            key={w.name}
            className="text-6xl font-black"
            style={{ color: w.color }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut",
            }}
          >
            {w.name}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}
