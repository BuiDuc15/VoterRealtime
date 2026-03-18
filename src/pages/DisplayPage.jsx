import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import LiveChart from "../components/display/LiveChart";
import WinnerAnnounce from "../components/display/WinnerAnnounce";
import CountdownTimer from "../components/shared/CountdownTimer";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { useRounds } from "../hooks/useRounds";
import { useSession } from "../hooks/useSession";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { buildChartData } from "../utils/voteHelpers";

export default function DisplayPage() {
  const { code } = useParams();
  const { session, loading, isOffline } = useSession(code);
  const { rounds, loading: roundsLoading } = useRounds(code);
  const currentQuestion = useCurrentQuestion(code, session);
  const [lastClosedQuestion, setLastClosedQuestion] = useState(null);

  const currentRound = useMemo(
    () => rounds.find((round) => round.id === session?.current_round_id),
    [rounds, session?.current_round_id]
  );

  const sessionStatusLabel =
    session?.status === "ended"
      ? "Đã kết thúc"
      : session?.status === "active"
        ? "Đang diễn ra"
        : "Đang chờ bắt đầu";

  const showRoundLabel = rounds.length >= 2 || session?.show_round_label;

  useEffect(() => {
    if (currentQuestion?.status === "closed") {
      setLastClosedQuestion(currentQuestion);
    }
  }, [currentQuestion]);

  const resultQuestion = currentQuestion?.status === "closed" ? currentQuestion : lastClosedQuestion;
  const resultData = useMemo(
    () => buildChartData(session?.teams || [], resultQuestion?.vote_counts || {}),
    [resultQuestion, session?.teams]
  );

  const isWaiting = !session || session.status === "waiting" || (!currentQuestion && !resultQuestion);
  const isVoting = currentQuestion?.status === "open";
  const isResult = !isVoting && Boolean(resultQuestion);

  if (loading || roundsLoading) return <LoadingSpinner label="Đang tải màn hình chiếu..." />;
  if (!session) return <div className="p-8 text-center">Phiên bình chọn không tồn tại</div>;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-white">
      {isOffline ? (
        <div className="bg-yellow-600 px-4 py-2 text-center text-sm font-semibold">Đang kết nối lại...</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/70 p-6 backdrop-blur">
        <div>
          <h1 className="text-3xl font-bold">{session.name}</h1>
          <p className="mt-1 text-sm text-slate-300">Mã phiên: {code?.toUpperCase()}</p>
          {showRoundLabel && currentRound ? <p className="mt-1 text-sm text-slate-400">{currentRound.name}</p> : null}
        </div>
        <div className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1 text-sm font-semibold text-sky-200">
          Trạng thái: {sessionStatusLabel}
        </div>
        <div className="text-xl text-slate-300">
          {currentQuestion?.text || resultQuestion?.text || (session.status === "ended" ? "Tổng kết phiên" : "Chờ bắt đầu...")}
        </div>
        {currentQuestion?.ends_at && isVoting ? (
          <CountdownTimer endsAt={currentQuestion.ends_at} className="text-white" />
        ) : (
          <div className="w-[70px]" />
        )}
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        {isWaiting ? (
          <div className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-800/80 p-8 text-center">
            <p className="text-3xl font-black">Sự kiện sắp bắt đầu</p>
            <p className="mt-3 text-slate-300">Mời voter quét mã QR để vào bình chọn.</p>
          </div>
        ) : null}

        {isVoting ? (
          <div className="w-full max-w-5xl space-y-8 text-center">
            <h2 className="text-5xl font-black leading-tight">{currentQuestion.text}</h2>
            {currentQuestion.ends_at ? <CountdownTimer endsAt={currentQuestion.ends_at} className="text-8xl" /> : null}
            <p className="text-xl text-slate-300">{currentQuestion.total_votes || 0} phiếu đã được ghi nhận</p>
            <div className="flex flex-wrap justify-center gap-3">
              {(session.teams || []).map((team) => (
                <div key={team.id} className="rounded-full px-5 py-2 text-xl font-semibold text-white" style={{ backgroundColor: team.color }}>
                  {team.name}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isResult ? (
          <div className="w-full max-w-6xl space-y-4">
            <LiveChart teams={session.teams} voteCounts={resultQuestion.vote_counts || {}} roundStatus="closed" title="Kết quả câu vừa đóng" />

            <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">Chi tiết kết quả</p>
              <div className="space-y-3">
                {resultData.map((item) => (
                  <div key={item.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold">{item.name}</span>
                      <span>
                        {item.votes} | {item.pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <WinnerAnnounce teams={session.teams} voteCounts={resultQuestion.vote_counts || {}} />
          </div>
        ) : null}
      </div>
    </div>
  );
}


