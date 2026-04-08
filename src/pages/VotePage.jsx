import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
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
import { db } from "../firebase";

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

  const isContinuousVoterMode = (session?.voter_progress_mode || "round_gated") === "continuous";
  const currentRound = useMemo(() => rounds.find((r) => r.id === session?.current_round_id), [rounds, session?.current_round_id]);
  const isAutoRoundMode = (currentRound?.question_flow_mode || "manual") === "auto";
  const totalRounds = rounds.length;
  const showRoundLabel = totalRounds >= 2 || session?.show_round_label;

  const [continuousQuestionsByRound, setContinuousQuestionsByRound] = useState({});

  useEffect(() => {
    if (!code || !isContinuousVoterMode || !rounds.length) {
      setContinuousQuestionsByRound({});
      return undefined;
    }

    const unsubs = rounds.map((round) => {
      const qRef = query(
        collection(db, "sessions", code, "rounds", round.id, "questions"),
        orderBy("order", "asc")
      );
      return onSnapshot(qRef, (snap) => {
        setContinuousQuestionsByRound((prev) => ({
          ...prev,
          [round.id]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }));
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [code, isContinuousVoterMode, rounds]);

  const orderedRounds = useMemo(
    () => [...rounds].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [rounds]
  );
  const teamsByRound = useMemo(
    () => Object.fromEntries(orderedRounds.map((r) => [r.id, r.teams || session?.teams || []])),
    [orderedRounds, session?.teams]
  );

  const allContinuousQuestions = useMemo(
    () => orderedRounds.flatMap((round) =>
      (continuousQuestionsByRound[round.id] || []).map((q) => ({
        ...q,
        roundId: round.id,
        roundName: round.name,
        roundOrder: round.order || 0,
      }))
    ),
    [orderedRounds, continuousQuestionsByRound]
  );

  const roundId = isContinuousVoterMode ? null : currentRound?.id;

  // Load ALL questions for the current round (realtime)
  const { questions: allQuestionsRaw } = useQuestions(code, roundId);
  const allQuestions = useMemo(() => {
    if (isContinuousVoterMode) return allContinuousQuestions;
    return allQuestionsRaw.map((q) => ({ ...q, roundId }));
  }, [isContinuousVoterMode, allContinuousQuestions, allQuestionsRaw, roundId]);

  const runVersion = session?.session_version ?? 1;
  const voteKeyPrefix = `${code}_v${runVersion}`;

  useEffect(() => {
    setVotedMap({});
  }, [voteKeyPrefix]);

  // Helper: check if this voter already voted on a specific question
  const isVotedByMe = useCallback((qId, qRoundId) => {
    if (!qId || !qRoundId) return false;
    const mapKey = `${qRoundId}_${qId}`;
    if (votedMap[mapKey]) return true;
    return localStorage.getItem(`voted_${voteKeyPrefix}_${qRoundId}_${qId}`) === "true";
  }, [votedMap, voteKeyPrefix]);

  // ──────────────────────────────────────────────────────────
  // LOCAL PROGRESSION: determine the "effective question" for THIS voter
  //
  // Auto mode (round.question_flow_mode = auto):
  //   Tất cả câu được mở đồng thời khi round bắt đầu.
  //   Mỗi voter tự lần lượt vote qua các câu auto theo thứ tự,
  //   hoàn toàn cục bộ, không ảnh hưởng voter khác.
  //   Vote xong câu auto → re-render → tự hiện câu auto tiếp theo.
  //
  // Manual mode (round.question_flow_mode = manual):
  //   Voter chờ admin mở câu (global session.current_question_id).
  //   Vote xong câu manual → hiện ResultsPreview → chờ admin chuyển.
  // ──────────────────────────────────────────────────────────
  const effectiveQuestion = useMemo(() => {
    if (!allQuestions.length) return isContinuousVoterMode ? null : globalQuestion;

    if (isContinuousVoterMode) {
      const nextContinuousQuestion = allQuestions.find(
        (q) => q.status === "open" && !isVotedByMe(q.id, q.roundId)
      );
      return nextContinuousQuestion || null;
    }

    if (!roundId) return globalQuestion;

    if (isAutoRoundMode) {
      // Auto mode: first open question not yet voted by this voter
      const nextAutoQ = allQuestions.find((q) => q.status === "open" && !isVotedByMe(q.id, roundId));
      return nextAutoQ || null;
    }

    // Manual mode: follow global current_question_id
    if (globalQuestion && globalQuestion.status === "open" && !isVotedByMe(globalQuestion.id, roundId)) {
      return globalQuestion;
    }

    // If already voted current manual question, keep showing it for preview
    if (globalQuestion && globalQuestion.status === "open" && isVotedByMe(globalQuestion.id, roundId)) {
      return globalQuestion;
    }

    return null;
  }, [allQuestions, globalQuestion, isVotedByMe, roundId, isAutoRoundMode, isContinuousVoterMode]);

  const questionId = effectiveQuestion?.id;
  const effectiveRoundId = effectiveQuestion?.roundId || roundId;
  const effectiveRound = useMemo(
    () => rounds.find((r) => r.id === effectiveRoundId) || null,
    [rounds, effectiveRoundId]
  );
  const roundTeams = useMemo(
    () => effectiveRound?.teams || session?.teams || [],
    [effectiveRound, session?.teams]
  );

  const roundDuration = Number(effectiveRound?.duration) > 0
    ? Number(effectiveRound.duration)
    : Number(session?.default_round_duration) > 0
    ? Number(session.default_round_duration)
    : null;
  const questionDuration = Number(effectiveQuestion?.duration) > 0
    ? Number(effectiveQuestion.duration)
    : Number(session?.default_question_duration) > 0
    ? Number(session.default_question_duration)
    : null;

  // Vote status for effective question
  const voteKey = effectiveRoundId && questionId ? `voted_${voteKeyPrefix}_${effectiveRoundId}_${questionId}` : null;
  const voteMapKey = effectiveRoundId && questionId ? `${effectiveRoundId}_${questionId}` : null;
  const hasVoted = Boolean(
    questionId
    && voteKey
    && ((voteMapKey ? votedMap[voteMapKey] : false) || localStorage.getItem(voteKey) === "true")
  );
  const myChoices = questionId && effectiveRoundId
    ? JSON.parse(localStorage.getItem(`choice_${voteKeyPrefix}_${effectiveRoundId}_${questionId}`) || "[]")
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

    if (!effectiveRoundId || !questionId) {
      setSubmitting(false);
      return;
    }

    if (localStorage.getItem(`voted_${voteKeyPrefix}_${effectiveRoundId}_${questionId}`)) {
      setSubmitting(false);
      return;
    }

    const result = await submitVoteWithRetry(code, effectiveRoundId, questionId, voterToken, choices, runVersion);

    if (result.success) {
      localStorage.setItem(`voted_${voteKeyPrefix}_${effectiveRoundId}_${questionId}`, "true");
      localStorage.setItem(`choice_${voteKeyPrefix}_${effectiveRoundId}_${questionId}`, JSON.stringify(choices));
      setVotedMap((prev) => ({ ...prev, [`${effectiveRoundId}_${questionId}`]: true }));

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

  // No effective question: voter has voted all available questions in this round mode
  if (!effectiveQuestion) {
    const hasPendingQuestions = isContinuousVoterMode
      ? allQuestions.some((q) => q.status === "open" && !isVotedByMe(q.id, q.roundId))
      : isAutoRoundMode
      ? allQuestions.some((q) => q.status === "open" && !isVotedByMe(q.id, roundId))
      : allQuestions.some((q) => q.status === "pending" || q.status === "open");
    const message = hasPendingQuestions
      ? "Chờ câu hỏi tiếp theo..."
      : "Bạn đã hoàn thành tất cả câu hỏi! 🎉";
    const sub = hasPendingQuestions
      ? (isContinuousVoterMode
        ? "Mode liên tục: hệ thống tự chuyển sang câu/round kế tiếp cho từng voter"
        : (isAutoRoundMode ? "Đợi các câu còn lại hoặc kết thúc round..." : "Admin sẽ mở câu tiếp theo, màn hình tự cập nhật"))
      : (isContinuousVoterMode ? "Chờ kết quả tổng hợp toàn bộ round..." : "Chờ vòng tiếp theo hoặc kết quả...");
    return (
      <WaitingScreen message={message} sub={sub}>
        <VoteHistory code={code} runVersion={runVersion} teams={roundTeams} teamsByRound={teamsByRound} allQuestions={allQuestions} />
      </WaitingScreen>
    );
  }

  if (effectiveQuestion.status === "pending") {
    return (
      <WaitingScreen message="Chờ câu hỏi tiếp theo..." sub="Màn hình sẽ tự cập nhật">
        <VoteHistory code={code} runVersion={runVersion} teams={roundTeams} teamsByRound={teamsByRound} allQuestions={allQuestions} />
      </WaitingScreen>
    );
  }

  if (effectiveQuestion.status === "closed") {
    return (
      <WaitingScreen message="Câu này đã đóng. Chờ tiếp..." sub="Màn hình sẽ tự cập nhật">
        <VoteHistory code={code} runVersion={runVersion} teams={roundTeams} teamsByRound={teamsByRound} allQuestions={allQuestions} />
      </WaitingScreen>
    );
  }

  // MANUAL mode: voter already voted on this manual question → show ResultsPreview, wait for admin
  if (!isAutoRoundMode && hasVoted && effectiveQuestion.status === "open") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/40">
        <ResultsPreview
          code={code}
          roundId={effectiveRoundId}
          question={effectiveQuestion}
          teams={roundTeams}
          myChoices={myChoices}
          round={effectiveRound}
          roundDuration={roundDuration}
          questionDuration={questionDuration}
        />
        <VoteHistory code={code} runVersion={runVersion} teams={roundTeams} teamsByRound={teamsByRound} allQuestions={allQuestions} />
      </div>
    );
  }

  // Show voting card for the effective question
  return (
    <VoteCard
      key={`${effectiveRoundId || "no_round"}_${questionId || "no_question"}`}
      question={effectiveQuestion}
      teams={roundTeams}
      questionScopeKey={`${effectiveRoundId || "no_round"}_${questionId || "no_question"}`}
      showRoundLabel={showRoundLabel}
      roundName={effectiveRound?.name}
      roundEndsAt={effectiveRound?.ends_at}
      roundDuration={roundDuration}
      questionDuration={questionDuration}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
    />
  );
}
