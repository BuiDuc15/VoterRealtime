export default function VoteHistory({ code, runVersion = 1, teams, allQuestions = [] }) {
  if (!allQuestions.length) return null;

  const voteKeyPrefix = `${code}_v${runVersion}`;

  return (
    <div className="mt-6 w-full max-w-md rounded-xl border border-gray-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-gray-600">Lịch sử vote của bạn</p>
      <div className="divide-y divide-gray-100">
        {allQuestions.map((q) => {
          const runScopedVoted = localStorage.getItem(`voted_${voteKeyPrefix}_${q.roundId}_${q.id}`) === "true";
          const legacyVoted = localStorage.getItem(`voted_${code}_${q.roundId}_${q.id}`) === "true";
          const voted = runScopedVoted || legacyVoted;
          const choices = JSON.parse(
            localStorage.getItem(`choice_${voteKeyPrefix}_${q.roundId}_${q.id}`)
            || localStorage.getItem(`choice_${code}_${q.roundId}_${q.id}`)
            || "[]"
          );
          const chosenTeams = teams.filter((t) => choices.includes(t.id));

          return (
            <div key={q.id} className={`flex items-center justify-between py-2 ${!voted ? "opacity-40" : ""}`}>
              <span className="truncate text-sm text-gray-700 pr-2">{q.text}</span>
              {voted && chosenTeams.length > 0 ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  {chosenTeams.map((t) => (
                    <span key={t.id} className="flex items-center gap-1 text-xs font-medium">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="shrink-0 text-xs text-gray-400">{q.status === "closed" ? "Đã đóng" : "Chưa mở"}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

