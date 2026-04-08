import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import DisplayWaiting from "../components/display/DisplayWaiting";
import ActiveRoundDisplay from "../components/display/ActiveRoundDisplay";
import CountdownBar from "../components/shared/CountdownBar";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { useAutoNextQuestion } from "../hooks/useAutoNextQuestion";
import { useRounds } from "../hooks/useRounds";
import { useSession } from "../hooks/useSession";
import { useOnlineCount } from "../hooks/useOnlinePresence";
import { useBackgroundMusic } from "../hooks/useBackgroundMusic";
import { endCurrentRound, nextQuestion } from "../utils/sessionFlow";

export default function DisplayPage() {
  const { code } = useParams();
  const { session, loading } = useSession(code);
  const { rounds, loading: roundsLoading } = useRounds(code);
  const onlineCount = useOnlineCount(code);
  const currentQuestion = useCurrentQuestion(code, session);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const roundExpireFiredRef = useRef(new Set());

  const currentRound = useMemo(() => rounds.find((r) => r.id === session?.current_round_id), [rounds, session?.current_round_id]);
  const voteUrl = `${window.location.origin}/vote/${code}`;

  // Background music: play when voting is active
  const isVoting = session?.status === "active" && !!currentRound && currentRound.status === "active";
  const shouldPlayMusic = isVoting && musicEnabled;
  const { audioUnlocked, unlockAudio } = useBackgroundMusic(shouldPlayMusic);

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

  const statusLabel = session?.status === "active" ? "Đang diễn ra" : "Chờ bắt đầu";

  useAutoNextQuestion({
    currentQuestion,
    enabled: session?.status === "active",
    onNextQuestion: async () => { await nextQuestion(code, session?.current_round_id, session?.current_question_id); },
  });

  // No auto-next round — admin always controls round transitions

  // Session end now uses waiting screen UX (new business flow)

  const handleRoundExpire = useCallback(async () => {
    if (!code || !currentRound?.id || session?.status !== "active") return;
    const key = `${session.session_version || 1}_${currentRound.id}`;
    if (roundExpireFiredRef.current.has(key)) return;
    roundExpireFiredRef.current.add(key);
    try {
      await endCurrentRound(code);
    } catch {
      roundExpireFiredRef.current.delete(key);
    }
  }, [code, currentRound?.id, session?.status, session?.session_version]);

  function onMusicButtonClick() {
    if (!audioUnlocked) {
      unlockAudio();
      return;
    }
    setMusicEnabled((prev) => !prev);
  }

  const musicButtonClass = `rounded-lg border px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
    !audioUnlocked
      ? "border-violet-300 bg-violet-50 text-violet-700 animate-pulse"
      : musicEnabled
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-slate-300 bg-slate-100 text-slate-600"
  }`;

  const musicButtonText = !audioUnlocked
    ? "🔇 Bật nhạc nền"
    : musicEnabled
    ? "🔊 Nhạc nền ON"
    : "🔈 Nhạc nền OFF";

  function ScanQrPanel() {
    return (
      <div className="fixed bottom-6 right-6 z-20 hidden w-[340px] rounded-3xl border-4 border-indigo-600 bg-white p-5 shadow-2xl sm:block">
        <p className="text-center text-xs font-black uppercase tracking-wider text-indigo-700">Quét để vào vote</p>
        <div className="mt-3 flex justify-center rounded-2xl border-2 border-slate-200 bg-white p-3">
          <QRCodeSVG value={voteUrl} size={260} bgColor="#ffffff" fgColor="#111827" includeMargin />
        </div>
        <p className="mt-3 text-center text-sm font-bold text-slate-700">/vote/{code?.toUpperCase()}</p>
      </div>
    );
  }

  if (loading || roundsLoading) return <LoadingSpinner label="Đang tải màn hình chiếu..." />;
  if (!session) return (
    <div className="flex min-h-screen items-center justify-center text-slate-500 bg-slate-50">
      Phiên không tồn tại
    </div>
  );

  // ─── WAITING / ENDED state ───
  if (session.status === "waiting" || session.status === "ended") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50/60 text-slate-800">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-4">
          <div>
            <p className="text-xl font-bold text-slate-900 sm:text-2xl">{session.name}</p>
            <p className="font-mono text-xs text-slate-400 sm:text-sm">{code?.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 sm:text-base">
            <span className="font-medium">{statusLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-500 sm:text-base">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1 align-middle" />
              {onlineCount} người đang online
            </p>
            <button onClick={onMusicButtonClick} className={musicButtonClass}>{musicButtonText}</button>
          </div>
        </div>
        <div className="px-4 py-5 sm:px-6 sm:py-7">
          <DisplayWaiting sessionName={session.name} code={code} isEnded={false} showQr={false} />
        </div>
        <ScanQrPanel />
      </div>
    );
  }

  // ─── ACTIVE state — show only current round ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50/60 text-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-4">
        <div>
          <p className="text-xl font-bold text-slate-900 sm:text-2xl">{session.name}</p>
          <p className="font-mono text-xs text-slate-400 sm:text-sm">{code?.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 sm:text-base">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="font-medium">{statusLabel}</span>
          {currentRound ? (
            <span className="text-slate-400">· {currentRound.name}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-500 sm:text-base">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1 align-middle" />
            {onlineCount} người đang online
          </p>
          <button onClick={onMusicButtonClick} className={musicButtonClass}>{musicButtonText}</button>
        </div>
      </div>

      {/* Countdown bars */}
      {(currentRound?.ends_at || currentQuestion?.ends_at) ? (
        <div className="border-b border-slate-200 bg-white/80 px-5 py-3 sm:px-7">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            {currentRound?.ends_at ? (
              <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex-1">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Thời gian round còn lại</p>
                <CountdownBar endsAt={currentRound.ends_at} duration={roundDuration} variant="light" onExpire={handleRoundExpire} />
              </div>
            ) : null}
            {currentQuestion?.ends_at ? (
              <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex-1">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Thời gian câu hỏi còn lại</p>
                <CountdownBar endsAt={currentQuestion.ends_at} duration={questionDuration} variant="light" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Body — current round only */}
      <div className="px-4 py-5 sm:px-6 sm:py-7">
        {currentRound ? (
          <ActiveRoundDisplay
            code={code}
            round={currentRound}
            teams={currentRound.teams || session.teams}
            currentQuestion={currentQuestion}
          />
        ) : (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">Đang chờ admin mở round...</p>
            <p className="mt-2 text-sm text-slate-400">Màn hình sẽ tự động cập nhật khi round được bắt đầu</p>
          </div>
        )}
      </div>
      <ScanQrPanel />
    </div>
  );
}
