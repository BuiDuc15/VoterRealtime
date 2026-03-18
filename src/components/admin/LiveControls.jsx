import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import CountdownTimer from "../shared/CountdownTimer";
import { nextQuestion, nextRound } from "../../utils/sessionFlow";
import { makeEndsAt } from "../../utils/timerHelpers";

export default function LiveControls({ code, currentRound, currentQuestion, questions, canControl }) {
  const pendingQuestion = questions.find((question) => question.status === "pending");

  async function openQuestion(question) {
    if (!question || !currentRound?.id) return;

    const endsAt = question.duration ? makeEndsAt(question.duration) : null;

    await updateDoc(doc(db, "sessions", code), {
      current_round_id: currentRound.id,
      current_question_id: question.id,
    });

    await updateDoc(doc(db, "sessions", code, "rounds", currentRound.id), { status: "active" });
    await updateDoc(doc(db, "sessions", code, "rounds", currentRound.id, "questions", question.id), {
      status: "open",
      ends_at: endsAt,
    });
  }

  async function closeCurrentQuestion() {
    if (!currentRound?.id || !currentQuestion?.id) return;

    await updateDoc(doc(db, "sessions", code, "rounds", currentRound.id, "questions", currentQuestion.id), {
      status: "closed",
      ends_at: null,
    });
    await updateDoc(doc(db, "sessions", code), { current_question_id: null });
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <h3 className="text-lg font-bold">Điều khiển trực tiếp</h3>
      <p className="text-sm text-gray-600">Round hiện tại: {currentRound?.name || "Chưa có"}</p>
      <p className="text-sm text-gray-600">Câu hiện tại: {currentQuestion?.text || "Chưa mở"}</p>
      <p className="text-sm text-gray-500">Phiếu đã ghi nhận: {currentQuestion?.total_votes || 0}</p>

      {currentQuestion?.ends_at && currentQuestion.status === "open" ? (
        <CountdownTimer endsAt={currentQuestion.ends_at} />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          className="h-11 rounded-lg bg-green-600 px-3 font-semibold text-white disabled:bg-gray-400"
          onClick={() => openQuestion(pendingQuestion)}
          disabled={!canControl || !pendingQuestion || currentQuestion?.status === "open"}
        >
          Mở câu
        </button>
        <button
          className="h-11 rounded-lg bg-orange-500 px-3 font-semibold text-white disabled:bg-gray-400"
          onClick={closeCurrentQuestion}
          disabled={!canControl || currentQuestion?.status !== "open"}
        >
          Đóng câu
        </button>
        <button
          className="h-11 rounded-lg bg-blue-600 px-3 font-semibold text-white disabled:bg-gray-400"
          onClick={() => nextQuestion(code, currentRound?.id, currentQuestion?.id)}
          disabled={!canControl || !currentRound?.id || !currentQuestion?.id}
        >
          Câu tiếp
        </button>
        <button
          className="h-11 rounded-lg border px-3 font-semibold disabled:bg-gray-100"
          onClick={() => nextRound(code)}
          disabled={!canControl || !currentRound?.id}
        >
          Round tiếp
        </button>
      </div>
    </div>
  );
}

