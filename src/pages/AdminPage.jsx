import { useEffect, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import AdminLogin from "../components/admin/AdminLogin";
import TeamManager from "../components/admin/TeamManager";
import RoundForm from "../components/admin/RoundForm";
import RoundList from "../components/admin/RoundList";
import QuestionForm from "../components/admin/QuestionForm";
import QuestionList from "../components/admin/QuestionList";
import LiveControls from "../components/admin/LiveControls";
import SessionTimeoutSettings from "../components/admin/SessionTimeoutSettings";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { db } from "../firebase";
import { useRounds } from "../hooks/useRounds";
import { useQuestions } from "../hooks/useQuestions";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { useAutoNextQuestion } from "../hooks/useAutoNextQuestion";
import { useAutoNextRound } from "../hooks/useAutoNextRound";
import { useSession } from "../hooks/useSession";
import { useOnlineCount } from "../hooks/useOnlinePresence";
import { nextQuestion, nextRound, resetSessionRun, startSessionRun } from "../utils/sessionFlow";

const TABS = [
  { key: "control", label: "⚡ Điều khiển" },
  { key: "content", label: "📝 Nội dung" },
  { key: "settings", label: "⚙ Cài đặt" },
  { key: "links", label: "🔗 QR / Links" },
];

export default function AdminPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(sessionStorage.getItem(`admin_authed_${code}`) === "true");
  const [tab, setTab] = useState("control");
  const [editingRound, setEditingRound] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [actionError, setActionError] = useState("");

  const { session, loading } = useSession(code);
  const { rounds, loading: roundsLoading } = useRounds(code);
  const onlineCount = useOnlineCount(code);
  const currentQuestion = useCurrentQuestion(code, session);

  const contentRoundId = selectedRoundId || session?.current_round_id || rounds[0]?.id || null;
  const { questions: contentQuestions } = useQuestions(code, contentRoundId);
  const { questions: currentRoundQuestions } = useQuestions(code, session?.current_round_id || null);

  const currentRound = useMemo(() => rounds.find((r) => r.id === session?.current_round_id), [rounds, session?.current_round_id]);

  useEffect(() => { if (!selectedRoundId && rounds[0]?.id) setSelectedRoundId(rounds[0].id); }, [rounds, selectedRoundId]);

  // Auto-next hooks
  useAutoNextQuestion({
    currentQuestion,
    enabled: session?.status === "active",
    onNextQuestion: async () => { await nextQuestion(code, session?.current_round_id, session?.current_question_id); },
  });

  useAutoNextRound({
    currentRound,
    canAdvanceRound: session?.status === "active" && currentRound?.status === "ended" && currentRound?.auto_next && !session?.current_question_id,
    onNextRound: async () => { await nextRound(code); },
  });

  if (!authed) return <AdminLogin code={code} onSuccess={() => setAuthed(true)} />;
  if (loading || roundsLoading) return <LoadingSpinner label="Đang tải dashboard admin..." />;
  if (!session) return <div className="p-8 text-center">Session không tồn tại</div>;

  const base = window.location.origin;

  async function action(fn, errMsg) {
    try { setActionError(""); await fn(); } catch (e) { setActionError(e?.message || errMsg); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h1 className="text-base font-bold sm:text-lg">{session.name}</h1>
          <p className="font-mono text-xs text-gray-400">{code}</p>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm ${tab === t.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>{t.label}</button>
          ))}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button onClick={() => navigate("/")} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition">🏠 Tạo cuộc thi mới</button>
          <button onClick={() => { sessionStorage.removeItem(`admin_authed_${code}`); setAuthed(false); }} className="rounded-lg border px-3 py-1.5 text-sm">Đăng xuất</button>
        </div>
      </div>

      {actionError ? <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:px-6">{actionError}</div> : null}

      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-3 sm:p-4 lg:flex-row">
        {/* Sidebar — full width on mobile, fixed width on desktop */}
        <div className="w-full space-y-3 sm:space-y-4 lg:w-60 lg:shrink-0">
          <div className="rounded-xl border bg-white p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">Trạng thái</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${session.status === "active" ? "bg-emerald-100 text-emerald-700" : session.status === "ended" ? "bg-gray-200 text-gray-600" : "bg-yellow-100 text-yellow-700"}`}>{session.status}</span>
            </div>
            <p className="text-sm text-gray-500">Round: {rounds.filter((r) => r.status !== "pending").length} / {rounds.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-3 sm:p-4">
            <p className="mb-2 text-sm font-semibold text-gray-600">Đội tham gia</p>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-0">
              {session.teams.map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-0.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-sm">{t.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs font-medium text-emerald-600">{onlineCount} online</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-2 lg:grid-cols-1">
            <button onClick={() => action(() => startSessionRun(code), "Không thể bắt đầu phiên")} disabled={session.status !== "waiting"} className="h-10 rounded-lg bg-emerald-600 text-xs font-semibold text-white disabled:bg-gray-300 sm:h-11 sm:text-sm">Bắt đầu</button>
            <button onClick={() => action(() => updateDoc(doc(db, "sessions", code), { status: "ended", current_round_id: null, current_question_id: null }), "Lỗi")} disabled={session.status === "ended"} className="h-10 rounded-lg border border-red-300 text-xs font-semibold text-red-600 disabled:text-gray-400 sm:h-11 sm:text-sm">Kết thúc</button>
            <button onClick={() => action(() => resetSessionRun(code), "Lỗi")} disabled={session.status === "active"} className="h-10 rounded-lg border text-xs font-semibold text-blue-600 disabled:text-gray-400 sm:h-11 sm:text-sm">Phiên mới</button>
          </div>
          <button onClick={() => navigate("/")} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition sm:h-11 sm:text-sm">🏠 Tạo cuộc thi mới</button>
        </div>

        {/* Main */}
        <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
          {tab === "control" ? (
            <>
              <LiveControls code={code} session={session} currentRound={currentRound} currentQuestion={currentQuestion} questions={currentRoundQuestions} canControl={session.status === "active"} onlineCount={onlineCount} />
              <QuestionList code={code} roundId={session.current_round_id} questions={currentRoundQuestions} currentQuestionId={session.current_question_id} onEdit={() => {}} />
            </>
          ) : null}

          {tab === "content" ? (
            <>
              <RoundForm code={code} rounds={rounds} editingRound={editingRound} onDone={() => setEditingRound(null)} />
              <RoundList code={code} rounds={rounds} currentRoundId={session.current_round_id} onEdit={(r) => { setSelectedRoundId(r.id); setEditingRound(r); }} />
              <div className="rounded-xl border bg-white p-3 sm:p-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">Chọn round để cấu hình câu hỏi</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {rounds.map((r) => (
                    <button key={r.id} onClick={() => { setSelectedRoundId(r.id); setEditingQuestion(null); }} className={`rounded-lg border px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm ${contentRoundId === r.id ? "border-gray-900 bg-gray-900 text-white" : "bg-white"}`}>{r.name}</button>
                  ))}
                </div>
              </div>
              <QuestionForm code={code} roundId={contentRoundId} questions={contentQuestions} editingQuestion={editingQuestion} onDone={() => setEditingQuestion(null)} />
              <QuestionList code={code} roundId={contentRoundId} questions={contentQuestions} currentQuestionId={session.current_question_id} onEdit={setEditingQuestion} />
            </>
          ) : null}

          {tab === "settings" ? (
            <>
              <SessionTimeoutSettings code={code} session={session} />
              <TeamManager code={code} teams={session.teams} sessionStatus={session.status} />
              <div className="rounded-xl border bg-white p-3 sm:p-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">Hiển thị kết quả</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateDoc(doc(db, "sessions", code), { group_results_by_round: (session.group_results_by_round ?? true) ? false : true })}
                    className="rounded-lg border px-3 py-1.5 text-xs sm:text-sm"
                  >
                    {(session.group_results_by_round ?? true) ? "Gộp kết quả theo danh sách câu hỏi" : "Phân nhóm kết quả theo round"}
                  </button>
                  <button
                    onClick={() => updateDoc(doc(db, "sessions", code), { show_round_label: !session.show_round_label })}
                    className="rounded-lg border px-3 py-1.5 text-xs sm:text-sm"
                  >
                    {session.show_round_label ? "Ẩn tên round khi chỉ có 1 round" : "Hiện tên round dù chỉ có 1 round"}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {tab === "links" ? (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
              {[{ label: "Vote", url: `${base}/vote/${code}` }, { label: "Display", url: `${base}/display/${code}` }, { label: "Admin", url: `${base}/admin/${code}` }].map((link) => (
                <div key={link.label} className="flex flex-col items-center rounded-xl border bg-white p-3 text-center sm:p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-600">{link.label}</p>
                  <QRCodeSVG value={link.url} size={140} />
                  <p className="mt-2 break-all text-[10px] text-gray-400 sm:text-xs">{link.url}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
