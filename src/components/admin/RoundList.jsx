import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

function statusStyle(status) {
  if (status === "active") return "bg-green-100 text-green-700";
  if (status === "ended") return "bg-gray-200 text-gray-700";
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
    if (round.status !== "pending") return;

    const questionsSnap = await getDocs(collection(db, "sessions", code, "rounds", round.id, "questions"));
    await Promise.all(questionsSnap.docs.map((questionDoc) => deleteDoc(questionDoc.ref)));

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
                  Mode round: {round.auto_next ? "Auto" : "Manual"}
                  {round.duration ? ` · Timeout round: ${round.duration}s` : " · Timeout round: không giới hạn"}
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
                disabled={round.status !== "pending"}
              >
                Sửa
              </button>
              <button
                className="h-10 rounded border border-red-300 px-3 text-red-600"
                onClick={() => removeRound(round)}
                disabled={round.status !== "pending"}
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

