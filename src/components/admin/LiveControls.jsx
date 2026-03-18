import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import CountdownTimer from "../shared/CountdownTimer";
import { useShardedVoteCounts } from "../../hooks/useShardedVoteCounts";
import { nextQuestion as goNextQuestion, nextRound as goNextRound } from "../../utils/sessionFlow";
import { makeEndsAt } from "../../utils/timerHelpers";

export default function LiveControls({ code, session, currentRound, currentQuestion, questions, canControl, onlineCount = 0 }) {
  const { total: totalVotes } = useShardedVoteCounts(code, session?.current_round_id, currentQuestion?.id);
  const votePercent = onlineCount > 0 ? Math.min(100, Math.round((totalVotes / onlineCount) * 100)) : 0;
  const pendingQuestion = questions.find((q) => q.status === "pending");

  async function openQuestion(question) {
    if (!question || !currentRound?.id) return;
    const dur = question.duration || session?.default_question_duration || null;
    const endsAt = dur ? makeEndsAt(dur) : null;
    await updateDoc(doc(db, "sessions", code), { current_round_id: currentRound.id, current_question_id: question.id });
    await updateDoc(doc(db, "sessions", code, "rounds", currentRound.id), { status: "active" });
    await updateDoc(doc(db, "sessions", code, "rounds", currentRound.id, "questions", question.id), { status: "open", ends_at: endsAt });
  }

  async function closeCurrentQuestion() {
    if (!currentRound?.id || !currentQuestion?.id) return;
    await updateDoc(doc(db, "sessions", code, "rounds", currentRound.id, "questions", currentQuestion.id), { status: "closed", ends_at: null });
    await updateDoc(doc(db, "sessions", code), { current_question_id: null });
  }

  return (
    <div className="rounded-2xl p-6 text-white" style={{ background: "#0d1117" }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40">{currentRound?.name || "Chưa có round"}</p>
          <h2 className="mt-1 text-xl font-bold">{currentQuestion?.text || "Chưa mở câu hỏi"}</h2>
          {currentQuestion?.description ? <p className="mt-1 text-sm text-white/40">{currentQuestion.description}</p> : null}
        </div>
        {currentQuestion?.ends_at && currentQuestion.status === "open" ? (
          <CountdownTimer endsAt={currentQuestion.ends_at} duration={currentQuestion.duration} size="normal" />
        ) : null}
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3" style={{ background: "#161b22" }}>
          <p className="text-2xl font-semibold">{totalVotes}</p>
          <p className="text-xs text-white/40">phiếu</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#161b22" }}>
          <p className="text-2xl font-semibold">{onlineCount}</p>
          <p className="text-xs text-white/40">online</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#161b22" }}>
          <p className="text-2xl font-semibold">{votePercent}%</p>
          <p className="text-xs text-white/40">đã vote</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${votePercent}%` }} />
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => openQuestion(pendingQuestion)} disabled={!canControl || !pendingQuestion || currentQuestion?.status === "open"} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40">Mở câu</button>
        <button onClick={closeCurrentQuestion} disabled={!canControl || currentQuestion?.status !== "open"} className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-40">Đóng câu</button>
        <button onClick={() => goNextQuestion(code, currentRound?.id, currentQuestion?.id)} disabled={!canControl || !currentQuestion?.id} className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/15 disabled:opacity-40">Câu tiếp →</button>
        <button onClick={() => goNextRound(code)} disabled={!canControl || !currentRound?.id} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/50 transition hover:bg-white/10 disabled:opacity-40">Round tiếp ⏭</button>
      </div>
    </div>
  );
}
