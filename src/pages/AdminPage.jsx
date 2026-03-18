import { useEffect, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import AdminLogin from "../components/admin/AdminLogin";
import LiveControls from "../components/admin/LiveControls";
import RoundForm from "../components/admin/RoundForm";
import RoundList from "../components/admin/RoundList";
import TeamManager from "../components/admin/TeamManager";
import QuestionForm from "../components/admin/QuestionForm";
import QuestionList from "../components/admin/QuestionList";
import SessionUrlCard from "../components/shared/SessionUrlCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { db } from "../firebase";
import { useRounds } from "../hooks/useRounds";
import { useQuestions } from "../hooks/useQuestions";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { useAutoNextQuestion } from "../hooks/useAutoNextQuestion";
import { useAutoNextRound } from "../hooks/useAutoNextRound";
import { useSession } from "../hooks/useSession";
import { nextQuestion, nextRound, resetSessionRun, startSessionRun } from "../utils/sessionFlow";

export default function AdminPage() {
  const { code } = useParams();
  const [authed, setAuthed] = useState(sessionStorage.getItem(`admin_authed_${code}`) === "true");
  const [editingRound, setEditingRound] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [actionError, setActionError] = useState("");

  const { session, loading, isOffline } = useSession(code);
  const { rounds, loading: roundsLoading } = useRounds(code);
  const contentRoundId = selectedRoundId || session?.current_round_id || null;
  const { questions: contentQuestions, loading: contentQuestionsLoading } = useQuestions(code, contentRoundId);
  const { questions: currentRoundQuestions, loading: currentRoundQuestionsLoading } = useQuestions(code, session?.current_round_id || null);
  const currentQuestion = useCurrentQuestion(code, session);

  const currentRound = useMemo(
    () => rounds.find((round) => round.id === session?.current_round_id),
    [rounds, session?.current_round_id]
  );

  const activeRoundId = contentRoundId || rounds[0]?.id || null;
  const showRoundLabel = rounds.length >= 2 || session?.show_round_label;

  useEffect(() => {
    if (activeRoundId !== selectedRoundId && !selectedRoundId && activeRoundId) {
      setSelectedRoundId(activeRoundId);
    }
  }, [activeRoundId, selectedRoundId]);

  useAutoNextQuestion({
    currentQuestion,
    enabled: session?.status === "active",
    onNextQuestion: async () => {
      await nextQuestion(code, session?.current_round_id, session?.current_question_id);
    },
  });

  const canAdvanceRoundAutomatically =
    session?.status === "active" &&
    currentRound?.status === "ended" &&
    currentRound?.auto_next &&
    !session?.current_question_id;

  useAutoNextRound({
    currentRound,
    canAdvanceRound: canAdvanceRoundAutomatically,
    onNextRound: async () => {
      await nextRound(code);
    },
  });

  if (!authed) return <AdminLogin code={code} onSuccess={() => setAuthed(true)} />;
  // Keep the page mounted when switching selected round to avoid scroll reset to top.
  if (loading || roundsLoading) return <LoadingSpinner label="Đang tải dashboard admin..." />;
  if (!session) return <div className="p-8 text-center">Session không tồn tại</div>;

  const voteUrl = `${window.location.origin}/vote/${code}`;
  const displayUrl = `${window.location.origin}/display/${code}`;
  const adminUrl = `${window.location.origin}/admin/${code}`;

  async function startSession() {
    try {
      setActionError("");
      await startSessionRun(code);
    } catch (error) {
      setActionError(error?.message || "Không thể bắt đầu phiên.");
    }
  }

  async function endSession() {
    try {
      setActionError("");
      await updateDoc(doc(db, "sessions", code), {
        status: "ended",
        current_round_id: null,
        current_question_id: null,
      });
    } catch (error) {
      setActionError(error?.message || "Không thể kết thúc phiên.");
    }
  }

  async function restartSessionOnSameLink() {
    try {
      setActionError("");
      await resetSessionRun(code, session.teams || []);
    } catch (error) {
      setActionError(error?.message || "Không thể tạo phiên mới trên link hiện tại.");
    }
  }

  async function setShowRoundLabel(value) {
    try {
      setActionError("");
      await updateDoc(doc(db, "sessions", code), { show_round_label: value });
    } catch (error) {
      setActionError(error?.message || "Không thể lưu cài đặt hiển thị round.");
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl space-y-4 p-4">
      {isOffline ? (
        <div className="rounded-lg bg-yellow-100 p-2 text-center text-sm font-semibold text-yellow-700">
          Đang kết nối lại...
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm font-semibold text-red-700">{actionError}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-4 shadow">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="text-sm text-gray-500">Mã phiên: {code}</p>
        </div>
        <button
          className="h-11 rounded-lg border px-4"
          onClick={() => {
            sessionStorage.removeItem(`admin_authed_${code}`);
            setAuthed(false);
          }}
        >
          Đăng xuất
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <p className="font-semibold">Thông tin phiên</p>
            <p className="mt-2 text-sm text-gray-600">Trạng thái: {session.status}</p>
            <p className="text-sm text-gray-600">Hiển thị round ở voter/display: {showRoundLabel ? "Bật" : "Tự động"}</p>
            <button
              type="button"
              className="mt-2 h-10 rounded-lg border px-3 text-sm font-semibold"
              onClick={() => setShowRoundLabel(!session.show_round_label)}
            >
              {session.show_round_label ? "Tắt hiển thị round khi chỉ có 1 round" : "Luôn hiển thị round"}
            </button>
            <div className="mt-2 space-y-1 text-sm">
              {session.teams.map((team) => (
                <div key={team.id} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span>{team.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border bg-white p-4">
            <button
              className="h-12 w-full rounded-lg bg-green-600 font-semibold text-white disabled:bg-gray-400"
              onClick={startSession}
              disabled={session.status === "active" || session.status === "ended"}
            >
              Bắt đầu phiên
            </button>
            <button
              className="h-12 w-full rounded-lg bg-red-600 font-semibold text-white disabled:bg-gray-400"
              onClick={endSession}
              disabled={session.status === "ended"}
            >
              Kết thúc phiên
            </button>
            <button
              className="h-12 w-full rounded-lg border border-blue-200 bg-blue-50 font-semibold text-blue-700 disabled:bg-gray-100 disabled:text-gray-400"
              onClick={restartSessionOnSameLink}
              disabled={session.status === "active"}
            >
              Tạo phiên mới trên link này
            </button>
          </div>

          <TeamManager code={code} teams={session.teams || []} sessionStatus={session.status} />

          <SessionUrlCard title="Link Vote" icon="📱" url={voteUrl} />
          <SessionUrlCard title="Link Display" icon="📺" url={displayUrl} />
          <SessionUrlCard title="Link Admin" icon="⚙️" url={adminUrl} showQR={false} />
        </div>

        <div className="space-y-4">
          <RoundForm code={code} rounds={rounds} editingRound={editingRound} onDone={() => setEditingRound(null)} />
          <RoundList
            code={code}
            rounds={rounds}
            currentRoundId={session.current_round_id}
            onEdit={(round) => {
              setSelectedRoundId(round.id);
              setEditingRound(round);
            }}
          />

          <div className="rounded-xl border bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">Chọn round để cấu hình câu hỏi</p>
            <div className="flex flex-wrap gap-2">
              {rounds.map((round) => (
                <button
                  key={round.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoundId(round.id);
                    setEditingQuestion(null);
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm ${activeRoundId === round.id ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}
                >
                  {round.name}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Round đang cấu hình: <span className="font-semibold">{rounds.find((round) => round.id === activeRoundId)?.name || "Chưa chọn"}</span>
            </p>
          </div>

          <QuestionForm
            code={code}
            roundId={activeRoundId}
            questions={contentQuestions}
            teams={session.teams || []}
            editingQuestion={editingQuestion}
            onDone={() => setEditingQuestion(null)}
          />
          {contentQuestionsLoading || currentRoundQuestionsLoading ? (
            <div className="rounded-xl border bg-white p-3 text-sm text-gray-500">Đang tải danh sách câu hỏi...</div>
          ) : null}
          <QuestionList
            code={code}
            roundId={activeRoundId}
            questions={contentQuestions}
            currentQuestionId={session.current_question_id}
            onEdit={setEditingQuestion}
          />

          <LiveControls
            code={code}
            currentRound={currentRound}
            currentQuestion={currentQuestion}
            questions={currentRoundQuestions}
            canControl={session.status === "active"}
          />
        </div>
      </div>
    </div>
  );
}

