import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import LiveChart from "../components/display/LiveChart";
import WinnerAnnounce from "../components/display/WinnerAnnounce";
import CountdownTimer from "../components/shared/CountdownTimer";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { db } from "../firebase";
import { useAutoNext } from "../hooks/useAutoNext";
import { useRounds } from "../hooks/useRounds";
import { useSession } from "../hooks/useSession";
import { makeEndsAt } from "../utils/timerHelpers";
import { buildChartData, sumVoteCounts } from "../utils/voteHelpers";

export default function DisplayPage() {
  const { code } = useParams();
  const { session, loading, isOffline } = useSession(code);
  const { rounds, loading: roundsLoading } = useRounds(code);

  const currentRound = useMemo(
    () => rounds.find((round) => round.id === session?.current_round_id),
    [rounds, session?.current_round_id]
  );

  const transitionMode = session?.transition_mode || "auto";

  const totalCounts = useMemo(() => {
    if (!session) return {};
    return sumVoteCounts(rounds, session.teams || []);
  }, [rounds, session]);

  const chartCounts = currentRound?.vote_counts || totalCounts;
  const chartRoundStatus = currentRound?.status || (session?.status === "ended" ? "closed" : "pending");
  const chartTitlePrefix = currentRound ? "Tieu chi hien tai" : "Tong session";

  const currentData = useMemo(
    () => buildChartData(session?.teams || [], currentRound?.vote_counts || {}),
    [session?.teams, currentRound?.vote_counts]
  );

  const totalData = useMemo(
    () => buildChartData(session?.teams || [], totalCounts),
    [session?.teams, totalCounts]
  );

  useAutoNext({
    currentRound,
    enabled: session?.status === "active" && transitionMode === "auto",
    onNextRound: async () => {
      if (!currentRound?.id) return;

      await updateDoc(doc(db, "sessions", code, "rounds", currentRound.id), {
        status: "closed",
      });

      const pending = rounds.filter((round) => round.status === "pending").sort((a, b) => a.order - b.order);
      if (!pending.length) {
        await updateDoc(doc(db, "sessions", code), {
          status: "ended",
          current_round_id: null,
        });
        return;
      }

      await updateDoc(doc(db, "sessions", code), { current_round_id: pending[0].id });
      await updateDoc(doc(db, "sessions", code, "rounds", pending[0].id), {
        status: "open",
        ends_at: pending[0].duration ? makeEndsAt(pending[0].duration) : null,
      });
    },
  });

  if (loading || roundsLoading) return <LoadingSpinner label="Đang tải màn hình chiếu..." />;
  if (!session) return <div className="p-8 text-center">Session không tồn tại</div>;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gray-900 text-white">
      {isOffline ? (
        <div className="bg-yellow-600 px-4 py-2 text-center text-sm font-semibold">Đang kết nối lại...</div>
      ) : null}

      <div className="flex items-center justify-between border-b border-gray-700 p-6">
        <h1 className="text-3xl font-bold">{session.name}</h1>
        <div className="text-xl text-gray-300">
          {currentRound ? `Vòng: ${currentRound.name}` : session.status === "ended" ? "Tong ket session" : "Chờ bắt đầu..."}
        </div>
        {currentRound?.ends_at && currentRound.status === "open" ? (
          <CountdownTimer endsAt={currentRound.ends_at} className="text-white" />
        ) : (
          <div className="w-[70px]" />
        )}
      </div>

      <div className="grid min-h-[60vh] flex-1 gap-4 p-6 lg:grid-cols-2">
        <LiveChart
          teams={session.teams}
          voteCounts={chartCounts}
          roundStatus={chartRoundStatus}
          metric="votes"
          title={`${chartTitlePrefix} - So luong`}
        />
        <LiveChart
          teams={session.teams}
          voteCounts={chartCounts}
          roundStatus={chartRoundStatus}
          metric="pct"
          title={`${chartTitlePrefix} - Phan tram`}
        />
      </div>

      <div className="grid gap-4 border-t border-slate-700 p-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">Tieu chi hien tai</p>
          <div className="space-y-3">
            {currentData.map((item) => (
              <div key={item.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{item.name}</span>
                  <span>
                    {item.votes} | {item.pct}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">Tong toan session</p>
          <div className="space-y-3">
            {totalData.map((item) => (
              <div key={item.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{item.name}</span>
                  <span>
                    {item.votes} | {item.pct}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {currentRound?.status === "closed" || session.status === "ended" ? (
        <WinnerAnnounce teams={session.teams} voteCounts={session.status === "ended" ? totalCounts : currentRound.vote_counts || {}} />
      ) : null}
    </div>
  );
}


