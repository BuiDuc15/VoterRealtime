import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

function statusBadge(status, isCurrent) {
  if (status === "open") return "border-emerald-700 bg-emerald-950 text-emerald-300";
  if (status === "closed") return "border-gray-200 bg-gray-100 text-gray-500 opacity-50";
  if (isCurrent) return "border-blue-200 bg-blue-50 text-blue-600";
  return "border-gray-200 bg-white text-gray-600";
}

export default function QuestionList({ code, roundId, questions, currentQuestionId, onEdit }) {
  async function moveQuestion(index, dir) {
    if (!roundId) return;
    const t = index + dir;
    if (t < 0 || t >= questions.length) return;
    const a = questions[index];
    const b = questions[t];
    await updateDoc(doc(db, "sessions", code, "rounds", roundId, "questions", a.id), { order: b.order });
    await updateDoc(doc(db, "sessions", code, "rounds", roundId, "questions", b.id), { order: a.order });
  }

  async function removeQuestion(q) {
    if (!roundId || q.status === "open") return;
    await deleteDoc(doc(db, "sessions", code, "rounds", roundId, "questions", q.id));
  }

  if (!roundId) return null;
  if (!questions.length) return <div className="rounded-xl border bg-white p-4 text-sm text-gray-500">Round này chưa có câu hỏi.</div>;

  return (
    <div className="space-y-2">
      {questions.map((q, i) => {
        const isCurrent = currentQuestionId === q.id;
        return (
          <div key={q.id} className={`rounded-xl border p-3 ${statusBadge(q.status, isCurrent)}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400">#{i + 1}</span>
                  {q.status === "open" ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> : null}
                </div>
                <p className="mt-0.5 text-sm font-semibold">{q.text}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Kiểu vote: {q.vote_mode === "multi" ? "Nhiều" : "1"} · Timeout câu: {q.duration ? `${q.duration}s` : "không giới hạn"}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${q.status === "open" ? "bg-emerald-900/50 text-emerald-300" : q.status === "closed" ? "bg-gray-200 text-gray-500" : "bg-gray-100 text-gray-400"}`}>{q.status}</span>
            </div>
            {isCurrent ? <p className="mt-1 text-[10px] font-semibold text-blue-500">Câu hiện tại</p> : null}
            <div className="mt-2 flex flex-wrap gap-1">
              <button className="rounded border px-2 py-0.5 text-[10px]" onClick={() => moveQuestion(i, -1)} disabled={i === 0}>↑</button>
              <button className="rounded border px-2 py-0.5 text-[10px]" onClick={() => moveQuestion(i, 1)} disabled={i === questions.length - 1}>↓</button>
              <button className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onEdit(q)} disabled={q.status === "open"}>Sửa</button>
              <button className="rounded border border-red-200 px-2 py-0.5 text-[10px] text-red-500" onClick={() => removeQuestion(q)} disabled={q.status === "open"}>Xóa</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
