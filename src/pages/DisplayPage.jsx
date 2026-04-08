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
import { endCurrentRound, endSession, nextQuestion } from "../utils/sessionFlow";
import { getRemainingSeconds } from "../utils/timerHelpers";

/* ── Hero Countdown ──────────────────────────────────── */
function HeroCountdown({ endsAt, label = "Thời gian còn lại", onExpire }) {
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

  if (remaining === null) return null;

  const isUrgent = remaining <= 10 && remaining > 0;
  const isDone = remaining === 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className={`relative overflow-hidden py-6 px-4 text-center sm:py-10 ${
      isUrgent || isDone
        ? "bg-gradient-to-r from-red-700 via-rose-700 to-red-700"
        : "bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-700"
    }`}>
      {/* subtle texture overlay */}
      <div className="absolute inset-0 bg-black/15 pointer-events-none" />
      <div className="relative z-10">
        <p className={`mb-2 text-xs font-bold uppercase tracking-[0.22em] sm:text-sm ${
          isUrgent ? "text-red-200 animate-pulse" : "text-indigo-200"
        }`}>
          ⏱ {label}
        </p>
        <div
          className={`font-mono font-black tabular-nums leading-none text-white ${
            isUrgent ? "animate-pulse" : ""
          }`}
          style={{ fontSize: "clamp(4rem, 14vw, 9rem)" }}
        >
          {mm}:{ss}
        </div>
        {isUrgent ? (
          <p className="mt-3 text-sm font-bold uppercase tracking-widest text-red-200 animate-pulse sm:text-base">
            ⚠ Sắp hết giờ!
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ── Small secondary countdown (round) ──────────────── */
function SmallRoundCountdown({ endsAt, onExpire }) {
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

  if (remaining === null) return null;

  const isUrgent = remaining <= 10 && remaining > 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <span className={`font-mono font-bold tabular-nums text-sm sm:text-base ${
      isUrgent ? "text-red-500 animate-pulse" : "text-emerald-700"
    }`}>
      Round: {mm}:{ss}
    </span>
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
  const sessionExpireFiredRef = useRef(new Set());

  const currentRound = useMemo(() => rounds.find((r) => r.id === session?.current_round_id), [rounds, session?.current_round_id]);
  const voteUrl = `${window.location.origin}/vote/${code}`;

  // Background music: play when session is active
  const isVoting = session?.status === "active";
  const shouldPlayMusic = isVoting && musicEnabled;
  const { audioUnlocked, unlockAudio } = useBackgroundMusic(shouldPlayMusic);

  const isContinuousVoterMode = (session?.voter_progress_mode || "round_gated") === "continuous";
  const isAutoRoundTransition = (session?.round_transition_mode || "manual") === "auto";
  const configuredReportMode = session?.display_report_mode || "current_round";
  const effectiveReportMode = (isAutoRoundTransition || isContinuousVoterMode) ? "cumulative" : configuredReportMode;
  const enableRoundCheer = !isAutoRoundTransition && !isContinuousVoterMode && effectiveReportMode === "current_round";

  const reportRounds = useMemo(() => {
    const ordered = [...rounds].sort((a, b) => (a.order || 0) - (b.order || 0));
    if (isContinuousVoterMode) return ordered;
    if (!currentRound) return [];
    if (effectiveReportMode === "current_round") return [currentRound];
    const currentOrder = currentRound.order || 0;
    return ordered.filter((r) => (r.order || 0) <= currentOrder);
  }, [rounds, currentRound, effectiveReportMode, isContinuousVoterMode]);

  useAutoNextQuestion({
    currentQuestion,
    enabled: session?.status === "active",
    onNextQuestion: async () => { await nextQuestion(code, session?.current_round_id, session?.current_question_id); },
  });

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

  const handleSessionExpire = useCallback(async () => {
    if (!code || session?.status !== "active") return;
    const key = `session_expire_${session.session_version || 1}`;
    if (sessionExpireFiredRef.current.has(key)) return;
    sessionExpireFiredRef.current.add(key);
    try {
      await endSession(code);
    } catch {
      sessionExpireFiredRef.current.delete(key);
    }
  }, [code, session?.status, session?.session_version]);

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
    ? "🔊 Nhạc ON"
    : "🔈 Nhạc OFF";

  // QR panel — smaller, fixed corner
  function ScanQrPanel() {
    return (
      <div className="fixed bottom-4 right-4 z-20 w-[140px] rounded-2xl border-2 border-indigo-400 bg-white p-2 shadow-xl">
        <p className="mb-1 text-center text-[9px] font-black uppercase tracking-wider text-indigo-700">Quét để vào vote</p>
        <div className="flex justify-center rounded-lg border border-slate-100 bg-white p-1">
          <QRCodeSVG value={voteUrl} size={116} bgColor="#ffffff" fgColor="#111827" includeMargin={false} />
        </div>
        <p className="mt-1 text-center text-[9px] font-bold text-slate-600">/vote/{code?.toUpperCase()}</p>
      </div>
    );
  }

  if (loading || roundsLoading) return <LoadingSpinner label="Đang tải màn hình chiếu..." />;
  if (!session) return (
    <div className="flex min-h-screen items-center justify-center text-slate-500 bg-slate-50">
      Phiên không tồn tại
    </div>
  );

  // ─── WAITING state ───
  if (session.status === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50/60 text-slate-800">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur-sm sm:px-7">
          <div>
            <p className="text-base font-bold text-slate-900 sm:text-lg">{session.name}</p>
            <p className="font-mono text-xs text-slate-400">{code?.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 sm:text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1 align-middle" />
              {onlineCount} online
            </span>
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

  // ─── ENDED state — show all round results ───
  if (session.status === "ended") {
    const endedRounds = [...rounds]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .filter((r) => r.status === "ended" || r.status === "active");
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/30 px-5 py-3 backdrop-blur-sm sm:px-7">
          <div>
            <p className="text-base font-bold text-white sm:text-lg">{session.name}</p>
            <p className="font-mono text-xs text-white/40">{code?.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">{onlineCount} online</span>
            <button onClick={onMusicButtonClick} className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">{musicButtonText}</button>
          </div>
        </div>

        {/* Title banner */}
        <div className="py-8 px-4 text-center sm:py-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-300">Kết thúc sự kiện</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">{session.name}</h1>
          <p className="mt-2 text-base text-white/60">Cảm ơn tất cả đã tham gia bình chọn! 🎉</p>
        </div>

        {/* All rounds results */}
        {endedRounds.length > 0 ? (
          <div className="mx-auto max-w-4xl space-y-4 px-4 pb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 text-center mb-6">
              🏆 Kết quả các vòng bình chọn
            </p>
            {endedRounds.map((round) => (
              <RoundSummaryCard
                key={round.id}
                code={code}
                round={round}
                teams={round.teams || session.teams || []}
                isCurrentRound={false}
                showRoundName={true}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-xl px-4 pb-12 text-center">
            <p className="text-white/50 text-base">Chưa có dữ liệu bình chọn</p>
          </div>
        )}
        <ScanQrPanel />
      </div>
    );
  }

  // ─── ACTIVE state ───
  // Determine which timer is the hero (session > round)
  const hasSessionTimer = !!session.session_ends_at;
  const hasRoundTimer = !!currentRound?.ends_at;
  const heroEndsAt = hasSessionTimer ? session.session_ends_at : (hasRoundTimer ? currentRound.ends_at : null);
  const heroLabel = hasSessionTimer ? "Thời gian session còn lại" : "Thời gian round còn lại";
  const heroExpire = hasSessionTimer ? handleSessionExpire : handleRoundExpire;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50/50 text-slate-800">
      {/* Compact Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-sm sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 sm:text-base">{session.name}</p>
          <p className="font-mono text-[10px] text-slate-400 sm:text-xs">{code?.toUpperCase()}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 ml-3">
          {/* Show round countdown inline if session timer is hero */}
          {hasSessionTimer && hasRoundTimer ? (
            <SmallRoundCountdown endsAt={currentRound.ends_at} onExpire={handleRoundExpire} />
          ) : null}
          <span className="hidden text-xs text-slate-500 sm:block">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1 align-middle" />
            {onlineCount} online
          </span>
          <button onClick={onMusicButtonClick} className={musicButtonClass}>{musicButtonText}</button>
        </div>
      </div>

      {/* Hero countdown — centered & prominent */}
      {heroEndsAt ? (
        <HeroCountdown
          endsAt={heroEndsAt}
          label={heroLabel}
          onExpire={heroExpire}
        />
      ) : null}

      {/* Body — vote results (secondary) */}
      <div className="px-3 py-4 sm:px-5 sm:py-6">
        {!isContinuousVoterMode && currentRound ? (
          <ActiveRoundDisplay
            code={code}
            round={currentRound}
            teams={currentRound.teams || session.teams}
            currentQuestion={currentQuestion}
            enableRoundCheer={enableRoundCheer}
          />
        ) : !isContinuousVoterMode ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">Đang chờ admin mở round...</p>
            <p className="mt-2 text-sm text-slate-400">Màn hình sẽ tự động cập nhật khi round được bắt đầu</p>
          </div>
        ) : null}

        {/* Cumulative reports */}
        {(effectiveReportMode === "cumulative" || isContinuousVoterMode) && reportRounds.length > 0 ? (
          <div className="mx-auto mt-5 w-full max-w-5xl space-y-3">
            {isContinuousVoterMode ? null : (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Báo cáo tổng hợp theo round</p>
              </div>
            )}
            <div className="space-y-3">
              {reportRounds.map((round) => (
                <RoundSummaryCard
                  key={round.id}
                  code={code}
                  round={round}
                  teams={round.teams || session.teams || []}
                  isCurrentRound={!isContinuousVoterMode && round.id === currentRound?.id}
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
