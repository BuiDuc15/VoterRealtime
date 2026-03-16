import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { useRounds } from "../hooks/useRounds";
import { useSession } from "../hooks/useSession";
import { useVoterToken } from "../hooks/useVoterToken";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import WaitingScreen from "../components/voter/WaitingScreen";
import VoteCard from "../components/voter/VoteCard";
import ResultsPreview from "../components/voter/ResultsPreview";

export default function VotePage() {
  const { code } = useParams();
  const { session, loading, isOffline } = useSession(code);
  const { rounds } = useRounds(code);
  const voterToken = useVoterToken();
  const [votedRoundMap, setVotedRoundMap] = useState({});

  const currentRound = useMemo(
    () => rounds.find((round) => round.id === session?.current_round_id),
    [rounds, session?.current_round_id]
  );

  const hasVoted = Boolean(
    currentRound?.id &&
      (votedRoundMap[currentRound.id] || localStorage.getItem(`voted_${code}_${currentRound.id}`) === "true")
  );

  useEffect(() => {
    if (!hasVoted || !currentRound?.id) return undefined;

    window.history.pushState(null, "", window.location.href);
    const onPopState = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [hasVoted, currentRound?.id]);

  async function submitVote(choices) {
    const sessionRef = doc(db, "sessions", code);
    const roundRef = doc(db, "sessions", code, "rounds", currentRound.id);
    const voteRef = doc(collection(db, "sessions", code, "rounds", currentRound.id, "votes"));

    await runTransaction(db, async (tx) => {
      const sessionSnap = await tx.get(sessionRef);
      const snap = await tx.get(roundRef);
      if (!sessionSnap.exists() || !snap.exists() || snap.data().status !== "open") {
        throw new Error("Round đã đóng");
      }

      const counts = { ...(snap.data().vote_counts || {}) };
      const sessionTotalCounts = { ...(sessionSnap.data().chart_total_counts || {}) };
      let addedVotes = 0;

      choices.forEach((teamId) => {
        counts[teamId] = (counts[teamId] || 0) + 1;
        sessionTotalCounts[teamId] = (sessionTotalCounts[teamId] || 0) + 1;
        addedVotes += 1;
      });

      tx.update(roundRef, { vote_counts: counts });
      tx.update(sessionRef, {
        chart_total_counts: sessionTotalCounts,
        chart_total_votes: (sessionSnap.data().chart_total_votes || 0) + addedVotes,
      });
      tx.set(voteRef, {
        voter_token: voterToken,
        choices,
        voted_at: serverTimestamp(),
      });
    });

    localStorage.setItem(`voted_${code}_${currentRound.id}`, "true");
    setVotedRoundMap((prev) => ({ ...prev, [currentRound.id]: true }));
  }

  if (loading) return <LoadingSpinner />;
  if (!session) return <WaitingScreen message="Session không tồn tại" />;

  if (session.status === "waiting") return <WaitingScreen message="Sự kiện chưa bắt đầu" />;
  if (session.status === "ended") return <WaitingScreen message="Sự kiện đã kết thúc. Cảm ơn bạn!" />;

  if (!currentRound || currentRound.status === "pending") {
    return <WaitingScreen message="Chờ vòng tiếp theo..." />;
  }

  if (currentRound.status === "closed") {
    return <WaitingScreen message="Vòng này đã đóng. Chờ vòng tiếp theo..." />;
  }

  if (hasVoted) {
    return (
      <div>
        {isOffline ? (
          <div className="bg-yellow-100 px-3 py-2 text-center text-sm font-semibold text-yellow-700">
            Đang kết nối lại...
          </div>
        ) : null}
        <ResultsPreview code={code} round={currentRound} teams={session.teams} />
      </div>
    );
  }

  return (
    <div>
      {isOffline ? (
        <div className="bg-yellow-100 px-3 py-2 text-center text-sm font-semibold text-yellow-700">
          Đang kết nối lại...
        </div>
      ) : null}
      <VoteCard round={currentRound} teams={session.teams} onSubmit={submitVote} />
    </div>
  );
}


