import { useMemo } from "react";
import { useParams } from "react-router-dom";
import DisplayWaiting from "../components/display/DisplayWaiting";
import DisplayResult from "../components/display/DisplayResult";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { useRounds } from "../hooks/useRounds";
import { useSession } from "../hooks/useSession";
import { useOnlineCount } from "../hooks/useOnlinePresence";

export default function DisplayPage() {
  const { code } = useParams();
  const { session, loading } = useSession(code);
  const { rounds, loading: roundsLoading } = useRounds(code);
  const onlineCount = useOnlineCount(code);

  const currentRound = useMemo(() => rounds.find((r) => r.id === session?.current_round_id), [rounds, session?.current_round_id]);
  const showRoundLabel = rounds.length >= 2 || session?.show_round_label;

  const statusLabel = session?.status === "ended" ? "Đã kết thúc" : session?.status === "active" ? "Đang diễn ra" : "Chờ bắt đầu";

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
          />
        )}
      </div>
    </div>
  );
}
