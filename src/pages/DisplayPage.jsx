import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import DisplayWaiting from "../components/display/DisplayWaiting";
import DisplayResult from "../components/display/DisplayResult";
import EndSessionCelebration from "../components/display/EndSessionCelebration";
import CountdownBar from "../components/shared/CountdownBar";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { useAutoNextQuestion } from "../hooks/useAutoNextQuestion";
import { useAutoNextRound } from "../hooks/useAutoNextRound";
import { useRounds } from "../hooks/useRounds";
import { useSession } from "../hooks/useSession";
import { useOnlineCount } from "../hooks/useOnlinePresence";
import { useShardedVoteCounts } from "../hooks/useShardedVoteCounts";
import { nextQuestion, nextRound } from "../utils/sessionFlow";

export default function DisplayPage() {
  const { code } = useParams();
  const { session, loading } = useSession(code);
  const { rounds, loading: roundsLoading } = useRounds(code);
  const onlineCount = useOnlineCount(code);
  const currentQuestion = useCurrentQuestion(code, session);
  const { total: liveTotalVotes } = useShardedVoteCounts(code, session?.current_round_id, session?.current_question_id);
  const [showEndCelebration, setShowEndCelebration] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const prevStatusRef = useRef();

  const currentRound = useMemo(() => rounds.find((r) => r.id === session?.current_round_id), [rounds, session?.current_round_id]);
  const groupResultsByRound = session?.group_results_by_round !== false;
  const showRoundLabel = groupResultsByRound && (rounds.length >= 2 || session?.show_round_label);
  const roundDuration = Number(currentRound?.duration) > 0
    ? Number(currentRound.duration)
    : Number(session?.default_round_duration) > 0
    ? Number(session.default_round_duration)
    : null;
  const questionDuration = Number(currentQuestion?.duration) > 0
    ? Number(currentQuestion.duration)
    : Number(session?.default_question_duration) > 0
    ? Number(session.default_question_duration)
    : null;

  const statusLabel = session?.status === "ended" ? "Đã kết thúc" : session?.status === "active" ? "Đang diễn ra" : "Chờ bắt đầu";

  useAutoNextQuestion({
    currentQuestion,
    enabled: session?.status === "active",
    onlineCount,
    totalVotes: liveTotalVotes,
    onNextQuestion: async () => { await nextQuestion(code, session?.current_round_id, session?.current_question_id); },
  });

  useAutoNextRound({
    currentRound,
    enabled: session?.status === "active",
    onNextRound: async () => { await nextRound(code); },
  });

  useEffect(() => {
    if (!session) return;
    const prevStatus = prevStatusRef.current;

    // Show celebration on active -> ended transition and when opening display while already ended.
    if (session.status === "ended" && (prevStatus === "active" || prevStatus == null)) {
      setShowEndCelebration(true);
    }

    if (session.status !== "ended") {
      setShowEndCelebration(false);
    }

    prevStatusRef.current = session.status;
  }, [session?.status, session?.session_version, session]);

  const handleSummary = useCallback((payload) => {
    setSessionSummary(payload);
  }, []);

  if (loading || roundsLoading) return <LoadingSpinner label="Đang tải màn hình chiếu..." />;
  if (!session) return (
    <div className="flex min-h-screen items-center justify-center text-slate-500 bg-slate-50">
      Phiên không tồn tại
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50/60 text-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3">
        <div>
          <p className="text-base font-bold text-slate-900 sm:text-lg">{session.name}</p>
          <p className="font-mono text-[10px] text-slate-400 sm:text-xs">{code?.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 sm:text-sm">
          {session.status === "active" ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> : null}
          {session.status === "ended"  ? <span className="h-2 w-2 rounded-full bg-slate-400" /> : null}
          <span className="font-medium">{statusLabel}</span>
          {showRoundLabel && currentRound ? (
            <span className="text-slate-400">· {currentRound.name}</span>
          ) : null}
        </div>
        <p className="text-xs text-slate-400 sm:text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1 align-middle" />
          {onlineCount} người đang online
        </p>
      </div>

      {session.status === "active" && (currentRound?.ends_at || currentQuestion?.ends_at) ? (
        <div className="border-b border-slate-200 bg-white/80 px-4 py-2.5 sm:px-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            {currentRound?.ends_at ? (
              <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex-1">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Timeout round</p>
                <CountdownBar endsAt={currentRound.ends_at} duration={roundDuration} variant="light" />
              </div>
            ) : null}
            {currentQuestion?.ends_at ? (
              <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex-1">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Timeout câu hỏi</p>
                <CountdownBar endsAt={currentQuestion.ends_at} duration={questionDuration} variant="light" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {session.status === "ended" && showEndCelebration ? (
        <EndSessionCelebration
          sessionName={session.name}
          summary={sessionSummary}
          onShowDetails={() => setShowEndCelebration(false)}
        />
      ) : null}

      {/* Body — scrollable */}
      <div className="px-4 py-5 sm:px-6 sm:py-7">
        {rounds.length === 0 ? (
          <DisplayWaiting sessionName={session.name} code={code} isEnded={session.status === "ended"} />
        ) : (
          <DisplayResult
            code={code}
            rounds={rounds}
            teams={session.teams}
            currentRoundId={session.current_round_id}
            showRoundLabel={showRoundLabel}
            currentRoundName={currentRound?.name}
            sessionStatus={session.status}
            groupResultsByRound={groupResultsByRound}
            onSessionSummary={handleSummary}
          />
        )}
      </div>
    </div>
  );
}
