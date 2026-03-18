import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { useRounds } from "../hooks/useRounds";
import { useSession } from "../hooks/useSession";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { useVoterToken } from "../hooks/useVoterToken";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import WaitingScreen from "../components/voter/WaitingScreen";
import VoteCard from "../components/voter/VoteCard";
import ResultsPreview from "../components/voter/ResultsPreview";
import { nextQuestion } from "../utils/sessionFlow";

export default function VotePage() {
  const { code } = useParams();
  const { session, loading, isOffline } = useSession(code);
  const { rounds } = useRounds(code);
  const currentQuestion = useCurrentQuestion(code, session);
  const voterToken = useVoterToken();
  const [votedRoundMap, setVotedRoundMap] = useState({});

  const currentRound = useMemo(
    () => rounds.find((round) => round.id === session?.current_round_id),
    [rounds, session?.current_round_id]
  );

  const totalRounds = rounds.length;
  const showRoundLabel = totalRounds >= 2 || session?.show_round_label;

  const sessionVersion = session?.session_version || 1;
  const voteStorageKey =
    currentRound?.id && currentQuestion?.id ? `voted_${code}_${sessionVersion}_${currentRound.id}_${currentQuestion.id}` : null;

  const hasVoted = Boolean(
    currentQuestion?.id && voteStorageKey && (votedRoundMap[currentQuestion.id] || localStorage.getItem(voteStorageKey) === "true")
  );

  useEffect(() => {
    if (!hasVoted || !currentQuestion?.id) return undefined;

    window.history.pushState(null, "", window.location.href);
    const onPopState = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [hasVoted, currentQuestion?.id]);

  async function submitVote(choices) {
    if (!currentRound?.id || !currentQuestion?.id) return;

    const roundId = currentRound.id;
    const questionId = currentQuestion.id;
    const sessionRef = doc(db, "sessions", code);
    const questionRef = doc(db, "sessions", code, "rounds", roundId, "questions", questionId);
    const voteRef = doc(collection(db, "sessions", code, "rounds", roundId, "questions", questionId, "votes"), `${sessionVersion}_${voterToken}`);

    await runTransaction(db, async (tx) => {
      const sessionSnap = await tx.get(sessionRef);
      const snap = await tx.get(questionRef);
      const votedSnap = await tx.get(voteRef);

      if (!sessionSnap.exists() || !snap.exists() || snap.data().status !== "open") {
        throw new Error("Câu hỏi đã đóng");
      }
      if (votedSnap.exists()) {
        throw new Error("Bạn đã bình chọn ở vòng này");
      }

      const counts = { ...(snap.data().vote_counts || {}) };
      let addedVotes = 0;

      choices.forEach((teamId) => {
        counts[teamId] = (counts[teamId] || 0) + 1;
        addedVotes += 1;
      });

      tx.update(questionRef, {
        vote_counts: counts,
        total_votes: (snap.data().total_votes || 0) + addedVotes,
      });
      tx.set(voteRef, {
        session_version: sessionVersion,
        voter_token: voterToken,
        choices,
        voted_at: serverTimestamp(),
      });
    });

    if (voteStorageKey) {
      localStorage.setItem(voteStorageKey, "true");
    }
    setVotedRoundMap((prev) => ({ ...prev, [questionId]: true }));

    if (currentQuestion.auto_next) {
      await nextQuestion(code, roundId, questionId);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!session) return <WaitingScreen message="Phiên bình chọn không tồn tại" />;

  if (session.status === "waiting") return <WaitingScreen message="Sự kiện chưa bắt đầu" />;
  if (session.status === "ended") return <WaitingScreen message="Sự kiện đã kết thúc. Cảm ơn bạn!" />;

  if (!currentRound || currentRound.status === "pending") {
    return <WaitingScreen message="Chờ round tiếp theo..." />;
  }

  if (!currentQuestion || currentQuestion.status === "pending") {
    return <WaitingScreen message="Chờ câu hỏi tiếp theo..." />;
  }

  if (currentQuestion.status === "closed") {
    return <WaitingScreen message="Câu này đã đóng. Chờ câu tiếp theo..." />;
  }

  if (hasVoted && currentQuestion.auto_next) {
    return <WaitingScreen message="Đã gửi bình chọn. Đang chuyển sang câu tiếp theo..." />;
  }

  if (hasVoted) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0e7ff_0,_#f8fafc_35%,_#ecfeff_100%)]">
        {isOffline ? (
          <div className="bg-amber-100 px-3 py-2 text-center text-sm font-semibold text-amber-700">
            Đang kết nối lại...
          </div>
        ) : null}
        <ResultsPreview
          code={code}
          roundId={currentRound.id}
          question={currentQuestion}
          teams={session.teams}
          showRoundLabel={showRoundLabel}
          roundName={currentRound?.name}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#312e81_0,_#1e1b4b_25%,_#0f172a_60%,_#020617_100%)]">
      <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
      {isOffline ? (
        <div className="bg-amber-100 px-3 py-2 text-center text-sm font-semibold text-amber-700">
          Đang kết nối lại...
        </div>
      ) : null}
      <VoteCard
        question={currentQuestion}
        teams={session.teams}
        showRoundLabel={showRoundLabel}
        roundName={currentRound?.name}
        onSubmit={submitVote}
      />
    </div>
  );
}


