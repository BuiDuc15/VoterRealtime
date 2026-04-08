import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import CountdownTimer from "../shared/CountdownTimer";
import { useShardedVoteCounts } from "../../hooks/useShardedVoteCounts";
import { endCurrentRound, nextQuestion as goNextQuestion, nextRound as goNextRound } from "../../utils/sessionFlow";
import { makeEndsAt } from "../../utils/timerHelpers";

export default function LiveControls({ code, session, currentRound, currentQuestion, questions, canControl, onlineCount = 0 }) {
  // Realtime vote counts for current question
  const { counts: voteCounts, total: totalVotes } = useShardedVoteCounts(code, session?.current_round_id, session?.current_question_id);
  const votePercent = onlineCount > 0 ? Math.min(100, Math.round((totalVotes / onlineCount) * 100)) : 0;

  // Next pending question after the current one (by order)
  const currentOrder = currentQuestion ? (questions.find((q) => q.id === currentQuestion.id)?.order ?? -1) : -1;
  const pendingQuestion = currentQuestion?.status === "open"
    ? questions.find((q) => q.status === "pending" && (q.order ?? 0) > currentOrder)
    : questions.find((q) => q.status === "pending");

  const teams = currentRound?.teams || session?.teams || [];
  const isAutoRoundMode = (currentRound?.question_flow_mode || "manual") === "auto";
  const isContinuousVoterMode = (session?.voter_progress_mode || "round_gated") === "continuous";

  async function openQuestion(question) {
    if (!question || !currentRound?.id) return;
    // Close any currently open question first
    if (currentQuestion?.id && currentQuestion.status === "open") {
      await updateDoc(doc(db, "sessions", code, "rounds", currentRound.id, "questions", currentQuestion.id), {
        status: "closed", ends_at: null,
      });
    }
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

  const isOpen = currentQuestion?.status === "open";

  return (
    <div className="rounded-2xl p-6 text-white" style={{ background: "#0d1117" }}>
      {/* Question info */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-white/40">{currentRound?.name || "Chưa có round"}</p>
          <h2 className="mt-1 text-xl font-bold truncate">
            {isAutoRoundMode ? "Mode auto theo round" : (currentQuestion?.text || "Chưa mở câu hỏi")}
          </h2>
          {!isAutoRoundMode && currentQuestion?.description ? <p className="mt-1 text-sm text-white/40 line-clamp-2">{currentQuestion.description}</p> : null}
          {!isAutoRoundMode && isOpen ? (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Đang mở · {isAutoRoundMode ? "Auto theo round" : "Manual"}</span>
            </div>
          ) : !isAutoRoundMode && currentQuestion?.status === "closed" ? (
            <span className="mt-1 inline-block text-xs text-red-400">Đã đóng</span>
          ) : isAutoRoundMode ? (
            <span className="mt-1 inline-block text-xs text-cyan-300">Voter vote xong sẽ tự sang câu kế tiếp</span>
          ) : null}
          {isContinuousVoterMode ? (
            <span className="mt-1 inline-block text-xs text-amber-300">Mode liên tục: voter tự đi hết tất cả round, không phụ thuộc chuyển round của admin</span>
          ) : null}
        </div>
        {!isAutoRoundMode && currentQuestion?.ends_at && isOpen ? (
          <CountdownTimer endsAt={currentQuestion.ends_at} duration={currentQuestion.duration} size="normal" />
        ) : null}
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3" style={{ background: "#161b22" }}>
          <p className="text-2xl font-semibold">{totalVotes}</p>
          <p className="text-xs text-white/40">phiếu đã vote</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#161b22" }}>
          <p className="text-2xl font-semibold">{onlineCount}</p>
          <p className="text-xs text-white/40">người online</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#161b22" }}>
          <p className="text-2xl font-semibold">{votePercent}%</p>
          <p className="text-xs text-white/40">đã vote</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${votePercent}%` }} />
      </div>

      {/* Per-team vote breakdown */}
      {session?.current_question_id && teams.length > 0 && totalVotes > 0 ? (
        <div className="mb-4 space-y-1.5">
          {teams.map((team) => {
            const count = voteCounts[team.id] || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return (
              <div key={team.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
                <span className="w-24 truncate text-xs text-white/70">{team.name}</span>
                <div className="flex-1 overflow-hidden rounded-full" style={{ background: "#161b22" }}>
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: team.color }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-white/60">{count} <span className="text-white/30">({pct}%)</span></span>
              </div>
            );
          })}
        </div>
      ) : session?.current_question_id && totalVotes === 0 ? (
        <p className="mb-4 text-xs text-white/30 italic">Chưa có phiếu bầu nào...</p>
      ) : null}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!isAutoRoundMode ? (
          <>
            <button
              onClick={() => openQuestion(pendingQuestion)}
              disabled={!canControl || !pendingQuestion || isOpen}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              {isOpen ? "Câu đang mở" : "Mở câu"}
            </button>
            <button
              onClick={closeCurrentQuestion}
              disabled={!canControl || !isOpen}
              className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-40"
            >
              Đóng câu
            </button>
          </>
        ) : null}
        <button
          onClick={() => endCurrentRound(code)}
          disabled={!canControl || !currentRound?.id || currentRound?.status === "ended" || isContinuousVoterMode}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-40"
        >
          Kết thúc round
        </button>
        {!isAutoRoundMode ? (
          <button
            onClick={() => goNextQuestion(code, currentRound?.id, currentQuestion?.id)}
            disabled={!canControl || !currentQuestion?.id || !isOpen}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/15 disabled:opacity-40"
          >
            Câu tiếp →
          </button>
        ) : null}
        <button
          onClick={() => goNextRound(code)}
          disabled={!canControl || !currentRound?.id || currentRound?.status !== "ended" || isContinuousVoterMode}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/50 transition hover:bg-white/10 disabled:opacity-40"
        >
          Round tiếp ⏭
        </button>
      </div>
    </div>
  );
}
