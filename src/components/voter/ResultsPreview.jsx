import { useShardedVoteCounts } from "../../hooks/useShardedVoteCounts";
import CountdownBar from "../shared/CountdownBar";

export default function ResultsPreview({
  code,
  roundId,
  question,
  teams,
  myChoices = [],
  round = null,
  roundDuration = null,
  questionDuration = null,
}) {
  const { counts, total } = useShardedVoteCounts(code, roundId, question.id);
  const isStillOpen = question.status === "open";

  return (
    <div className="space-y-3 p-4 pt-5">
      {/* Success banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
        <p className="text-sm font-bold text-emerald-700">✅ Đã ghi nhận lượt vote của bạn!</p>
        {isStillOpen ? (
          <p className="mt-0.5 text-xs text-emerald-600 opacity-80">
            {question.auto_next && question.ends_at
              ? "Câu hỏi sẽ tự động chuyển khi hết giờ"
              : "Chờ admin chuyển câu tiếp theo"}
          </p>
        ) : null}
      </div>

      {round?.ends_at ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Thời gian round còn lại</p>
          <CountdownBar endsAt={round.ends_at} duration={roundDuration} variant="light" />
        </div>
      ) : null}

      {/* Countdown if timer is set and question is still open */}
      {isStillOpen && question.ends_at ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Thời gian câu hỏi còn lại</p>
          <CountdownBar endsAt={question.ends_at} duration={questionDuration} variant="light" />
        </div>
      ) : null}

      <p className="text-sm font-semibold text-gray-700">{question.text}</p>

      {/* Per-team results */}
      {teams.map((team) => {
        const votes = counts[team.id] || 0;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
        const isMyChoice = myChoices.includes(team.id);
        return (
          <div key={team.id} className={isMyChoice ? "opacity-100" : "opacity-70"}>
            <div className="mb-1 flex justify-between text-sm">
              <span className={isMyChoice ? "font-bold text-gray-800" : "text-gray-600"}>
                {team.name}
                {isMyChoice ? <span className="ml-1.5 text-xs font-normal text-indigo-500">✓ bạn chọn</span> : null}
              </span>
              <span className="text-gray-500">{pct}% · <strong>{votes}</strong></span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: team.color }}
              />
            </div>
          </div>
        );
      })}

      <p className="mt-2 text-center text-xs text-gray-400">
        {isStillOpen ? (
          <>⏳ Đang cập nhật · <strong>{total}</strong> phiếu</>
        ) : (
          <>Kết quả cuối · <strong>{total}</strong> phiếu</>
        )}
      </p>
    </div>
  );
}
