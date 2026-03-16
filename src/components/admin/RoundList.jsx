import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";

function statusStyle(status) {
  if (status === "open") return "bg-green-100 text-green-700";
  if (status === "closed") return "bg-gray-200 text-gray-700";
  return "bg-yellow-100 text-yellow-700";
}

export default function RoundList({ code, rounds, currentRoundId, onEdit }) {
  async function moveRound(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rounds.length) return;

    const roundA = rounds[index];
    const roundB = rounds[targetIndex];

    await updateDoc(doc(db, "sessions", code, "rounds", roundA.id), { order: roundB.order });
    await updateDoc(doc(db, "sessions", code, "rounds", roundB.id), { order: roundA.order });
  }

  async function removeRound(round) {
    if (round.status === "open") return;
    await deleteDoc(doc(db, "sessions", code, "rounds", round.id));
  }

  return (
    <div className="space-y-3">
      {rounds.map((round, index) => {
        const isCurrent = currentRoundId === round.id;
        return (
          <div key={round.id} className="rounded-xl border bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold">{round.name}</p>
                <p className="text-sm text-gray-500">
                  {round.vote_mode} | {round.duration ? `${round.duration}s` : "Không giới hạn"}
                </p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyle(round.status)}`}>
                {round.status}
              </span>
            </div>

            {isCurrent ? <p className="mt-2 text-xs font-semibold text-blue-600">Đang là vòng hiện tại</p> : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button className="h-10 rounded border px-3" onClick={() => moveRound(index, -1)} disabled={index === 0}>
                Lên
              </button>
              <button
                className="h-10 rounded border px-3"
                onClick={() => moveRound(index, 1)}
                disabled={index === rounds.length - 1}
              >
                Xuống
              </button>
              <button
                className="h-10 rounded border px-3"
                onClick={() => onEdit(round)}
                disabled={round.status === "open"}
              >
                Sửa
              </button>
              <button
                className="h-10 rounded border border-red-300 px-3 text-red-600"
                onClick={() => removeRound(round)}
                disabled={round.status === "open"}
              >
                Xóa
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

