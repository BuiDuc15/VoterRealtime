import { useMemo, useState } from "react";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import AdminLogin from "../components/admin/AdminLogin";
import RoundControls from "../components/admin/RoundControls";
import RoundForm from "../components/admin/RoundForm";
import RoundList from "../components/admin/RoundList";
import SessionUrlCard from "../components/shared/SessionUrlCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { db } from "../firebase";
import { useAutoNext } from "../hooks/useAutoNext";
import { useRounds } from "../hooks/useRounds";
import { useSession } from "../hooks/useSession";

export default function AdminPage() {
  const { code } = useParams();
  const [authed, setAuthed] = useState(sessionStorage.getItem(`admin_authed_${code}`) === "true");
  const [editingRound, setEditingRound] = useState(null);

  const { session, loading, isOffline } = useSession(code);
  const { rounds, loading: roundsLoading } = useRounds(code);

  const currentRound = useMemo(
    () => rounds.find((round) => round.id === session?.current_round_id),
    [rounds, session?.current_round_id]
  );

  const transitionMode = session?.transition_mode || "auto";

  useAutoNext({
    currentRound,
    enabled: session?.status === "active" && transitionMode === "auto",
    onNextRound: async () => {
      const pending = rounds.filter((round) => round.status === "pending").sort((a, b) => a.order - b.order);
      if (!pending.length) return;

      await updateDoc(doc(db, "sessions", code, "rounds", currentRound.id), { status: "closed" });
      await updateDoc(doc(db, "sessions", code), { current_round_id: pending[0].id });
      await updateDoc(doc(db, "sessions", code, "rounds", pending[0].id), {
        status: "open",
        ends_at: pending[0].duration ? Timestamp.fromDate(new Date(Date.now() + pending[0].duration * 1000)) : null,
      });
    },
  });

  if (!authed) return <AdminLogin code={code} onSuccess={() => setAuthed(true)} />;
  if (loading || roundsLoading) return <LoadingSpinner label="Đang tải dashboard admin..." />;
  if (!session) return <div className="p-8 text-center">Session không tồn tại</div>;

  const voteUrl = `${window.location.origin}/vote/${code}`;
  const displayUrl = `${window.location.origin}/display/${code}`;
  const adminUrl = `${window.location.origin}/admin/${code}`;

  async function startSession() {
    await updateDoc(doc(db, "sessions", code), {
      status: "active",
      session_ends_at:
        session.timer_mode === "session" && session.session_duration
          ? Timestamp.fromDate(new Date(Date.now() + session.session_duration * 1000))
          : null,
    });
  }

  async function endSession() {
    await updateDoc(doc(db, "sessions", code), {
      status: "ended",
      current_round_id: null,
    });

    if (currentRound?.status === "open") {
      await updateDoc(doc(db, "sessions", code, "rounds", currentRound.id), { status: "closed" });
    }
  }

  async function setTransitionMode(mode) {
    await updateDoc(doc(db, "sessions", code), { transition_mode: mode });
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl space-y-4 p-4">
      {isOffline ? (
        <div className="rounded-lg bg-yellow-100 p-2 text-center text-sm font-semibold text-yellow-700">
          Đang kết nối lại...
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-4 shadow">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="text-sm text-gray-500">Mã session: {code}</p>
        </div>
        <button
          className="h-11 rounded-lg border px-4"
          onClick={() => {
            sessionStorage.removeItem(`admin_authed_${code}`);
            setAuthed(false);
          }}
        >
          Logout
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <p className="font-semibold">Thông tin session</p>
            <p className="mt-2 text-sm text-gray-600">Trạng thái: {session.status}</p>
            <p className="text-sm text-gray-600">Timer mode: {session.timer_mode}</p>
            <p className="text-sm text-gray-600">Chuyển vòng: {transitionMode === "auto" ? "Tự động" : "Thủ công"}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className={`h-10 rounded-lg border px-3 text-sm font-semibold ${
                  transitionMode === "manual" ? "border-slate-900 bg-slate-900 text-white" : "bg-white"
                }`}
                onClick={() => setTransitionMode("manual")}
                disabled={session.status === "ended"}
              >
                Manual
              </button>
              <button
                type="button"
                className={`h-10 rounded-lg border px-3 text-sm font-semibold ${
                  transitionMode === "auto" ? "border-slate-900 bg-slate-900 text-white" : "bg-white"
                }`}
                onClick={() => setTransitionMode("auto")}
                disabled={session.status === "ended"}
              >
                Auto
              </button>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              {session.teams.map((team) => (
                <div key={team.id} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span>{team.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border bg-white p-4">
            <button
              className="h-12 w-full rounded-lg bg-green-600 font-semibold text-white disabled:bg-gray-400"
              onClick={startSession}
              disabled={session.status === "active" || session.status === "ended"}
            >
              Bắt đầu session
            </button>
            <button
              className="h-12 w-full rounded-lg bg-red-600 font-semibold text-white disabled:bg-gray-400"
              onClick={endSession}
              disabled={session.status === "ended"}
            >
              Kết thúc session
            </button>
          </div>

          <SessionUrlCard title="Link Vote" icon="📱" url={voteUrl} />
          <SessionUrlCard title="Link Display" icon="📺" url={displayUrl} />
          <SessionUrlCard title="Link Admin" icon="⚙️" url={adminUrl} showQR={false} />
        </div>

        <div className="space-y-4">
          <RoundForm
            code={code}
            rounds={rounds}
            teams={session.teams}
            editingRound={editingRound}
            onDone={() => setEditingRound(null)}
          />
          <RoundList code={code} rounds={rounds} currentRoundId={session.current_round_id} onEdit={setEditingRound} />
          <RoundControls
            code={code}
            rounds={rounds}
            currentRound={currentRound}
            canControl={session.status === "active"}
          />
        </div>
      </div>
    </div>
  );
}

