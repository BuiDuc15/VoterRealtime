import { useShardedVoteCounts } from "../../hooks/useShardedVoteCounts";

export default function ResultsPreview({ code, roundId, question, teams, myChoices = [] }) {
  const { counts, total } = useShardedVoteCounts(code, roundId, question.id);

  return (
    <div className="space-y-3 p-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
        <p className="text-sm font-semibold text-emerald-700">✅ Đã ghi nhận lượt vote của bạn!</p>
      </div>
      <p className="text-sm font-semibold text-gray-600">{question.text}</p>
      {teams.map((team) => {
        const votes = counts[team.id] || 0;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
        const isMyChoice = myChoices.includes(team.id);
        return (
          <div key={team.id} className={isMyChoice ? "opacity-100" : "opacity-70"}>
            <div className="mb-1 flex justify-between text-sm">
              <span className={isMyChoice ? "font-semibold" : ""}>{team.name}</span>
              <span className="text-gray-500">{pct}% · {votes}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: team.color }} />
            </div>
          </div>
        );
      })}
      <p className="mt-2 text-center text-xs text-gray-400">Đang cập nhật · {total} phiếu</p>
    </div>
  );
}
