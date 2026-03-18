import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

function statusStyle(status) {
  if (status === "open") return "bg-green-100 text-green-700";
  if (status === "closed") return "bg-gray-200 text-gray-700";
  return "bg-yellow-100 text-yellow-700";
}

export default function QuestionList({ code, roundId, questions, currentQuestionId, onEdit }) {
  async function moveQuestion(index, direction) {
    if (!roundId) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const a = questions[index];
    const b = questions[targetIndex];

    await updateDoc(doc(db, "sessions", code, "rounds", roundId, "questions", a.id), { order: b.order });
    await updateDoc(doc(db, "sessions", code, "rounds", roundId, "questions", b.id), { order: a.order });
  }

  async function removeQuestion(question) {
    if (!roundId || question.status === "open") return;
    await deleteDoc(doc(db, "sessions", code, "rounds", roundId, "questions", question.id));
  }

  if (!roundId) {
    return <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">Chưa chọn round nào.</div>;
  }

  if (!questions.length) {
    return <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">Round này chưa có câu hỏi.</div>;
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <h3 className="text-lg font-bold">Danh sách câu hỏi</h3>
      {questions.map((question, index) => {
        const isCurrent = currentQuestionId === question.id;
        return (
          <div key={question.id} className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">Câu {index + 1}</p>
                <p className="text-sm text-gray-700">{question.text}</p>
                <p className="text-xs text-gray-500">
                  {question.vote_mode === "multi" ? "Chọn nhiều" : "Chọn 1"} | {question.duration ? `${question.duration}s` : "Không giới hạn"} | {question.auto_next ? "Auto" : "Manual"}
                </p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyle(question.status)}`}>{question.status}</span>
            </div>

            {isCurrent ? <p className="mt-1 text-xs font-semibold text-blue-600">Đang là câu hiện tại</p> : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button className="h-9 rounded border px-3" onClick={() => moveQuestion(index, -1)} disabled={index === 0 || question.status === "open"}>
                Lên
              </button>
              <button
                className="h-9 rounded border px-3"
                onClick={() => moveQuestion(index, 1)}
                disabled={index === questions.length - 1 || question.status === "open"}
              >
                Xuống
              </button>
              <button className="h-9 rounded border px-3" onClick={() => onEdit(question)} disabled={question.status === "open"}>
                Sửa
              </button>
              <button className="h-9 rounded border border-red-300 px-3 text-red-600" onClick={() => removeQuestion(question)} disabled={question.status === "open"}>
                Xóa
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

