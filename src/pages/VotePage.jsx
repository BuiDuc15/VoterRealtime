import { useEffect, useMemo, useState } from "react";
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
  const currentQuestion = useCurrentQuestion(code, session);
  const voterToken = useVoterToken();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [votedMap, setVotedMap] = useState({});

  useVoterPresence(code, voterToken);

  const currentRound = useMemo(() => rounds.find((r) => r.id === session?.current_round_id), [rounds, session?.current_round_id]);
  const totalRounds = rounds.length;
  const showRoundLabel = totalRounds >= 2 || session?.show_round_label;
  const roundId = currentRound?.id;
  const questionId = currentQuestion?.id;
  const roundDuration = Number(currentRound?.duration) > 0
    ? Number(currentRound.duration)
    : Number(session?.default_round_duration) > 0
    ? Number(session.default_round_duration)
    : null;
  const questionDuration = Number(currentQuestion?.duration) > 0
    ? Number(currentQuestion.duration)
    : Number(session?.default_question_duration) > 0
    ? Number(session.default_question_duration)
    : null;


  const { questions: allQuestionsRaw } = useQuestions(code, roundId);
  const allQuestions = useMemo(() => allQuestionsRaw.map((q) => ({ ...q, roundId })), [allQuestionsRaw, roundId]);

  // session_version is bumped each time admin resets the session run,
  // so old localStorage entries are automatically invalidated.
  const runVersion = session?.session_version ?? 1;
  const voteKeyPrefix = `${code}_v${runVersion}`;

  useEffect(() => {
    setVotedMap({});
  }, [voteKeyPrefix]);

  // Lớp 1: localStorage guard
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
    if (submitting) return; // debounce double-tap
    setSubmitting(true);
    setSubmitError(null);

    // Lớp 1: check lại trước khi gửi (race condition)
    if (localStorage.getItem(`voted_${voteKeyPrefix}_${roundId}_${questionId}`)) {
      setSubmitting(false);
      return;
    }

    // Lớp 2+3+4: submitVoteWithRetry (idempotency + status check + retry)
    const result = await submitVoteWithRetry(code, roundId, questionId, voterToken, choices, runVersion);

    if (result.success) {
      localStorage.setItem(`voted_${voteKeyPrefix}_${roundId}_${questionId}`, "true");
      localStorage.setItem(`choice_${voteKeyPrefix}_${roundId}_${questionId}`, JSON.stringify(choices));
      setVotedMap((prev) => ({ ...prev, [questionId]: true }));

      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", () => window.history.pushState(null, "", window.location.href));

      // NOTE: Không gọi nextQuestion() tại đây!
      // Việc chuyển câu hỏi là trách nhiệm của admin (useAutoNextQuestion hook ở AdminPage
      // dựa trên timer ends_at) hoặc admin thao tác tay. Nếu voter tự gọi nextQuestion(),
      // câu hỏi sẽ đóng ngay sau khi người đầu tiên vote, khiến những người khác không
      // thể vote được nữa.
    } else {
      setSubmitError(VOTE_ERROR_MESSAGES[result.reason] || "Có lỗi xảy ra.");
    }

    setSubmitting(false);
  }

  if (loading) return <LoadingSpinner />;
  if (!session) return <WaitingScreen message="Phiên bình chọn không tồn tại" />;
  if (session.status === "waiting") return <WaitingScreen message="Sự kiện chưa bắt đầu" sub="Vui lòng chờ admin bắt đầu phiên..." />;
  if (session.status === "ended") return <WaitingScreen message="Cảm ơn bạn đã tham gia! 🎉" />;
  if (!currentQuestion || currentQuestion.status === "pending") return <WaitingScreen message="Chờ câu hỏi tiếp theo..." sub="Màn hình sẽ tự cập nhật"><VoteHistory code={code} runVersion={runVersion} teams={session.teams} allQuestions={allQuestions} /></WaitingScreen>;
  if (currentQuestion.status === "closed") return <WaitingScreen message="Câu này đã đóng. Chờ tiếp..." sub="Màn hình sẽ tự cập nhật"><VoteHistory code={code} runVersion={runVersion} teams={session.teams} allQuestions={allQuestions} /></WaitingScreen>;

  if (hasVoted && currentQuestion.status === "open") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/40">
        <ResultsPreview
          code={code}
          roundId={roundId}
          question={currentQuestion}
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

  return (
    <VoteCard
      question={currentQuestion}
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
