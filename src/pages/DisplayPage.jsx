import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import DisplayWaiting from "../components/display/DisplayWaiting";
import ActiveRoundDisplay from "../components/display/ActiveRoundDisplay";
import RoundSummaryCard from "../components/display/RoundSummaryCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { useAutoNextQuestion } from "../hooks/useAutoNextQuestion";
import { useRounds } from "../hooks/useRounds";
import { useSession } from "../hooks/useSession";
import { useOnlineCount } from "../hooks/useOnlinePresence";
import { useBackgroundMusic } from "../hooks/useBackgroundMusic";
import { endCurrentRound, nextQuestion } from "../utils/sessionFlow";
import { getRemainingSeconds } from "../utils/timerHelpers";

function BigCountdownCard({ label, endsAt, onExpire, tone = "indigo" }) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(endsAt));

  useEffect(() => {
    if (!endsAt) return undefined;
    const tick = () => {
      const secs = getRemainingSeconds(endsAt);
      setRemaining(secs);
      if (secs === 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt, onExpire]);

  const isUrgent = remaining !== null && remaining <= 10 && remaining > 0;
  const mm = String(Math.floor((remaining || 0) / 60)).padStart(2, "0");
  const ss = String((remaining || 0) % 60).padStart(2, "0");
  const style = tone === "emerald"
    ? {
        wrapper: "border-emerald-200 from-emerald-50 to-teal-50",
        label: "text-emerald-700",
        time: "text-emerald-700",
      }
    : {
        wrapper: "border-indigo-200 from-indigo-50 to-violet-50",
        label: "text-indigo-700",
        time: "text-indigo-700",
      };

  return (
    <div className={`w-full rounded-2xl border-2 bg-gradient-to-r px-4 py-3 shadow-sm sm:flex-1 ${style.wrapper}`}>
      <p className={`mb-1 text-sm font-bold uppercase tracking-wide ${style.label}`}>{label}</p>
      <div className={`font-mono text-5xl font-black tabular-nums sm:text-6xl ${isUrgent ? "animate-pulse text-red-500" : style.time}`}>
        {mm}:{ss}
      </div>
      {isUrgent ? <p className="mt-1 text-xs font-bold uppercase tracking-wider text-red-500 animate-pulse">Sap het gio</p> : null}
    </div>
  );
}

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

  const isAutoRoundTransition = (session?.round_transition_mode || "manual") === "auto";
  const configuredReportMode = session?.display_report_mode || "current_round";
  const effectiveReportMode = isAutoRoundTransition ? "cumulative" : configuredReportMode;
  const enableRoundCheer = !isAutoRoundTransition && effectiveReportMode === "current_round";

  const reportRounds = useMemo(() => {
    if (!currentRound) return [];
    const ordered = [...rounds].sort((a, b) => (a.order || 0) - (b.order || 0));
    if (effectiveReportMode === "current_round") return [currentRound];
    const currentOrder = currentRound.order || 0;
    return ordered.filter((r) => (r.order || 0) <= currentOrder);
  }, [rounds, currentRound, effectiveReportMode]);

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
      <div className="fixed bottom-5 right-5 z-20 hidden w-[250px] rounded-2xl border-2 border-indigo-500 bg-white p-3 shadow-xl sm:block">
        <p className="text-center text-xs font-black uppercase tracking-wider text-indigo-700">Quét để vào vote</p>
        <div className="mt-2 flex justify-center rounded-xl border border-slate-200 bg-white p-2">
          <QRCodeSVG value={voteUrl} size={180} bgColor="#ffffff" fgColor="#111827" includeMargin />
        </div>
        <p className="mt-2 text-center text-xs font-bold text-slate-700">/vote/{code?.toUpperCase()}</p>
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
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-500 sm:text-base">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1 align-middle" />
            {onlineCount} người đang online
          </p>
          <button onClick={onMusicButtonClick} className={musicButtonClass}>{musicButtonText}</button>
        </div>
      </div>

      {/* Countdown numeric cards */}
      {(currentRound?.ends_at || currentQuestion?.ends_at) ? (
        <div className="border-b border-slate-200 bg-white/80 px-5 py-3 sm:px-7">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
            {currentRound?.ends_at ? (
              <BigCountdownCard label="Thời gian round còn lại" endsAt={currentRound.ends_at} onExpire={handleRoundExpire} tone="indigo" />
            ) : null}
            {currentQuestion?.ends_at ? (
              <BigCountdownCard label="Thời gian câu hỏi còn lại" endsAt={currentQuestion.ends_at} tone="emerald" />
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
            enableRoundCheer={enableRoundCheer}
          />
        ) : (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">Đang chờ admin mở round...</p>
            <p className="mt-2 text-sm text-slate-400">Màn hình sẽ tự động cập nhật khi round được bắt đầu</p>
          </div>
        )}

        {effectiveReportMode === "cumulative" && reportRounds.length > 0 ? (
          <div className="mx-auto mt-6 w-full max-w-6xl space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Bao cao tong hop theo round</p>
              <p className="text-sm text-slate-600">Dang hien thi tu round dau den round hien tai.</p>
            </div>
            <div className="space-y-3">
              {reportRounds.map((round) => (
                <RoundSummaryCard
                  key={round.id}
                  code={code}
                  round={round}
                  teams={round.teams || session.teams || []}
                  isCurrentRound={round.id === currentRound?.id}
                  showRoundName={true}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <ScanQrPanel />
    </div>
  );
}
