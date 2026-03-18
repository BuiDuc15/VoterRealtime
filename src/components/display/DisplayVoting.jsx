import CountdownTimer from "../shared/CountdownTimer";
import { useShardedVoteCounts } from "../../hooks/useShardedVoteCounts";

export default function DisplayVoting({ code, roundId, question, teams, showRound, roundName, qIndex, qTotal }) {
  const { total } = useShardedVoteCounts(code, roundId, question.id);

  return (
    <div className="w-full max-w-4xl space-y-4 text-center sm:space-y-8">
      {showRound ? (
        <span className="inline-block rounded-full border border-violet-700/50 bg-violet-900/30 px-3 py-1 text-xs text-violet-300 sm:px-4 sm:text-sm">
          {roundName} · Câu {qIndex}/{qTotal}
        </span>
      ) : null}

      <h1 className="text-2xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">{question.text}</h1>
      {question.description ? <p className="text-sm text-white/40 sm:text-lg">{question.description}</p> : null}

      {question.ends_at ? (
        <div className="flex justify-center">
          <CountdownTimer endsAt={question.ends_at} duration={question.duration} size="large" />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap justify-center gap-2 sm:mt-6 sm:gap-3">
        {teams.map((team) => (
          <div key={team.id} className="rounded-full px-4 py-1.5 text-sm font-semibold text-white sm:px-6 sm:py-2 sm:text-xl" style={{ background: `${team.color}33`, border: `1px solid ${team.color}80` }}>
            {team.name}
          </div>
        ))}
      </div>

      <p className="text-sm text-white/40 sm:text-base">{total} phiếu đã được ghi nhận</p>
    </div>
  );
}
