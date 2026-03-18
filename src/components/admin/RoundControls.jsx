import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { nextRound as goNextRound } from "../../utils/sessionFlow";
import { makeEndsAt } from "../../utils/timerHelpers";
import CountdownTimer from "../shared/CountdownTimer";

export default function RoundControls({ code, rounds, currentRound, canControl, defaultRoundDuration }) {
  function resolveRoundDuration(roundDuration, fallbackSeconds) {
    const roundSeconds = Number(roundDuration);
    if (Number.isFinite(roundSeconds) && roundSeconds > 0) return roundSeconds;

    const sessionSeconds = Number(fallbackSeconds);
    return Number.isFinite(sessionSeconds) && sessionSeconds > 0 ? sessionSeconds : null;
  }

  async function openRound(round) {
    if (!round) return;
    const duration = resolveRoundDuration(round.duration, defaultRoundDuration);
    const endsAt = duration ? makeEndsAt(duration) : null;

    await updateDoc(doc(db, "sessions", code), { current_round_id: round.id });
    await updateDoc(doc(db, "sessions", code, "rounds", round.id), {
      status: "open",
      ends_at: endsAt,
    });
  }

  async function closeRound(roundId) {
    await updateDoc(doc(db, "sessions", code, "rounds", roundId), {
      status: "closed",
    });
  }

  async function nextRound() {
    await goNextRound(code);
  }

  const pendingRound = rounds.find((round) => round.status === "pending");

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <h3 className="text-lg font-bold">Điều khiển vòng hiện tại</h3>
      <p className="text-sm text-gray-500">
        {currentRound ? `Vòng: ${currentRound.name}` : "Chưa có vòng mở"}
      </p>
      {currentRound?.ends_at && currentRound.status === "open" ? (
        <CountdownTimer
          endsAt={currentRound.ends_at}
          onExpire={() => {
            closeRound(currentRound.id);
          }}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          className="h-12 rounded-lg bg-green-600 px-4 font-semibold text-white disabled:bg-gray-400"
          onClick={() => (currentRound?.status === "open" ? null : openRound(pendingRound || currentRound))}
          disabled={!canControl || !pendingRound || currentRound?.status === "open"}
        >
          Mở vòng
        </button>
        <button
          className="h-12 rounded-lg bg-orange-500 px-4 font-semibold text-white disabled:bg-gray-400"
          onClick={() => closeRound(currentRound.id)}
          disabled={!canControl || currentRound?.status !== "open"}
        >
          Đóng vòng
        </button>
        <button
          className="h-12 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:bg-gray-400"
          onClick={nextRound}
          disabled={!canControl}
        >
          Vòng tiếp →
        </button>
      </div>
    </div>
  );
}

