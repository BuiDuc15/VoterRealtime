import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useRounds } from "../hooks/useRounds";
import { useSession } from "../hooks/useSession";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { useQuestions } from "../hooks/useQuestions";
import { useVoterToken } from "../hooks/useVoterToken";
import { useVoterPresence } from "../hooks/useOnlinePresence";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import WaitingScreen from "../components/voter/WaitingScreen";
import VoteCard from "../components/voter/VoteCard";
import ResultsPreview from "../components/voter/ResultsPreview";
import VoteHistory from "../components/voter/VoteHistory";
import { submitVoteWithRetry } from "../utils/sharding";

const VOTE_ERROR_MESSAGES = {
  already_voted: "Bạn đã vote câu này rồi.",
  closed: "Câu hỏi đã đóng trước khi vote được ghi nhận.",
  network_error: "Mạng không ổn định. Vui lòng thử lại.",
  not_found: "Câu hỏi không tồn tại.",
};

export default function VotePage() {
  const { code } = useParams();
  const { session, loading } = useSession(code);
  const { rounds } = useRounds(code);
  const globalQuestion = useCurrentQuestion(code, session);
  const voterToken = useVoterToken();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [votedMap, setVotedMap] = useState({});

  useVoterPresence(code, voterToken);

  const currentRound = useMemo(() => rounds.find((r) => r.id === session?.current_round_id), [rounds, session?.current_round_id]);
  const totalRounds = rounds.length;
  const showRoundLabel = totalRounds >= 2 || session?.show_round_label;
  const roundId = currentRound?.id;

  // Load ALL questions for the current round (realtime)
  const { questions: allQuestionsRaw } = useQuestions(code, roundId);
  const allQuestions = useMemo(() => allQuestionsRaw.map((q) => ({ ...q, roundId })), [allQuestionsRaw, roundId]);

  const runVersion = session?.session_version ?? 1;
  const voteKeyPrefix = `${code}_v${runVersion}`;

  useEffect(() => {
    setVotedMap({});
  }, [voteKeyPrefix]);

  // Helper: check if this voter already voted on a specific question
  const isVotedByMe = useCallback((qId) => {
    if (!qId || !roundId) return false;
    if (votedMap[qId]) return true;
    return localStorage.getItem(`voted_${voteKeyPrefix}_${roundId}_${qId}`) === "true";
  }, [votedMap, voteKeyPrefix, roundId]);

  // ──────────────────────────────────────────────────────────
  // LOCAL PROGRESSION: determine the "effective question" for THIS voter
  //
  // Auto mode (auto_next = true):
  //   Tất cả câu auto được mở đồng thời khi round bắt đầu.
  //   Mỗi voter tự lần lượt vote qua các câu auto theo thứ tự,
  //   hoàn toàn cục bộ, không ảnh hưởng voter khác.
  //   Vote xong câu auto → re-render → tự hiện câu auto tiếp theo.
  //
  // Manual mode (auto_next = false):
  //   Voter chờ admin mở câu (global session.current_question_id).
  //   Vote xong câu manual → hiện ResultsPreview → chờ admin chuyển.
  // ──────────────────────────────────────────────────────────
  const effectiveQuestion = useMemo(() => {
    if (!roundId || !allQuestions.length) return globalQuestion;

    // 1. Find the first OPEN auto_next question that this voter hasn't voted on
    const nextAutoQ = allQuestions.find(
      (q) => q.status === "open" && q.auto_next && !isVotedByMe(q.id)
    );
    if (nextAutoQ) return nextAutoQ;

    // 2. If all auto questions are voted/none available, check global manual question
    if (
      globalQuestion &&
      globalQuestion.status === "open" &&
      !globalQuestion.auto_next &&
      !isVotedByMe(globalQuestion.id)
    ) {
      return globalQuestion;
    }

    // 3. If voter already voted on the current global manual question, show results
    if (
      globalQuestion &&
      globalQuestion.status === "open" &&
      !globalQuestion.auto_next &&
      isVotedByMe(globalQuestion.id)
    ) {
      return globalQuestion;
    }

    // 4. All auto questions done, no manual question open → null
    return null;
  }, [allQuestions, globalQuestion, isVotedByMe, roundId]);

  const questionId = effectiveQuestion?.id;

  const roundDuration = Number(currentRound?.duration) > 0
    ? Number(currentRound.duration)
    : Number(session?.default_round_duration) > 0
    ? Number(session.default_round_duration)
    : null;
  const questionDuration = Number(effectiveQuestion?.duration) > 0
    ? Number(effectiveQuestion.duration)
    : Number(session?.default_question_duration) > 0
    ? Number(session.default_question_duration)
    : null;

  // Vote status for effective question
  const voteKey = roundId && questionId ? `voted_${voteKeyPrefix}_${roundId}_${questionId}` : null;
  const hasVoted = Boolean(questionId && voteKey && (votedMap[questionId] || localStorage.getItem(voteKey) === "true"));
  const myChoices = questionId && roundId
    ? JSON.parse(localStorage.getItem(`choice_${voteKeyPrefix}_${roundId}_${questionId}`) || "[]")
    : [];

  // Block back after voting
  useEffect(() => {
    if (!hasVoted || !questionId) return undefined;
    window.history.pushState(null, "", window.location.href);
    const handler = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [hasVoted, questionId]);

  async function handleSubmit(choices) {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    if (localStorage.getItem(`voted_${voteKeyPrefix}_${roundId}_${questionId}`)) {
      setSubmitting(false);
      return;
    }

    const result = await submitVoteWithRetry(code, roundId, questionId, voterToken, choices, runVersion);

    if (result.success) {
      localStorage.setItem(`voted_${voteKeyPrefix}_${roundId}_${questionId}`, "true");
      localStorage.setItem(`choice_${voteKeyPrefix}_${roundId}_${questionId}`, JSON.stringify(choices));
      setVotedMap((prev) => ({ ...prev, [questionId]: true }));

      // NOTE: Không gọi nextQuestion() ở voter!
      // Ở mode auto, tất cả câu hỏi auto đã được mở sẵn khi round bắt đầu.
      // Voter chỉ cần update votedMap → React re-render → effectiveQuestion
      // tự động trỏ sang câu tiếp theo chưa vote. Hoàn toàn cục bộ,
      // không ảnh hưởng voter khác.

      window.history.pushState(null, "", window.location.href);
    } else {
      setSubmitError(VOTE_ERROR_MESSAGES[result.reason] || "Có lỗi xảy ra.");
    }

    setSubmitting(false);
  }

  // ── Render logic ─────────────────────────────────────────

  if (loading) return <LoadingSpinner />;
  if (!session) return <WaitingScreen message="Phiên bình chọn không tồn tại" />;
  if (session.status === "waiting") return <WaitingScreen message="Sự kiện chưa bắt đầu" sub="Vui lòng chờ admin bắt đầu phiên..." />;
  if (session.status === "ended") return <WaitingScreen message="Cảm ơn bạn đã tham gia! 🎉" />;

  // No effective question: voter has voted all available auto questions
  if (!effectiveQuestion) {
    // Check if there are still pending (manual or future) questions in this round
    const hasPendingQuestions = allQuestions.some((q) => q.status === "pending" || (q.status === "open" && !q.auto_next));
    const message = hasPendingQuestions
      ? "Chờ câu hỏi tiếp theo..."
      : "Bạn đã hoàn thành tất cả câu hỏi! 🎉";
    const sub = hasPendingQuestions
      ? "Admin sẽ mở câu tiếp theo, màn hình tự cập nhật"
      : "Chờ vòng tiếp theo hoặc kết quả...";
    return (
      <WaitingScreen message={message} sub={sub}>
        <VoteHistory code={code} runVersion={runVersion} teams={session.teams} allQuestions={allQuestions} />
      </WaitingScreen>
    );
  }

  if (effectiveQuestion.status === "pending") {
    return (
      <WaitingScreen message="Chờ câu hỏi tiếp theo..." sub="Màn hình sẽ tự cập nhật">
        <VoteHistory code={code} runVersion={runVersion} teams={session.teams} allQuestions={allQuestions} />
      </WaitingScreen>
    );
  }

  if (effectiveQuestion.status === "closed") {
    return (
      <WaitingScreen message="Câu này đã đóng. Chờ tiếp..." sub="Màn hình sẽ tự cập nhật">
        <VoteHistory code={code} runVersion={runVersion} teams={session.teams} allQuestions={allQuestions} />
      </WaitingScreen>
    );
  }

  // MANUAL mode: voter already voted on this manual question → show ResultsPreview, wait for admin
  if (hasVoted && effectiveQuestion.status === "open" && !effectiveQuestion.auto_next) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/40">
        <ResultsPreview
          code={code}
          roundId={roundId}
          question={effectiveQuestion}
          teams={session.teams}
          myChoices={myChoices}
          round={currentRound}
          roundDuration={roundDuration}
          questionDuration={questionDuration}
        />
        <VoteHistory code={code} runVersion={runVersion} teams={session.teams} allQuestions={allQuestions} />
      </div>
    );
  }

  // Show voting card for the effective question
  return (
    <VoteCard
      question={effectiveQuestion}
      teams={session.teams}
      showRoundLabel={showRoundLabel}
      roundName={currentRound?.name}
      roundEndsAt={currentRound?.ends_at}
      roundDuration={roundDuration}
      questionDuration={questionDuration}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
    />
  );
}
