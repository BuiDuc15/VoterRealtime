import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

function parseDuration(value) {
  if (value === "") return null;
  if (value.includes(":")) {
    const [mm, ss] = value.split(":").map(Number);
    if (Number.isNaN(mm) || Number.isNaN(ss)) return null;
    return mm * 60 + ss;
  }
  const s = Number(value);
  return Number.isNaN(s) || s < 0 ? null : s;
}

export default function QuestionForm({ code, roundId, questions, editingQuestion, onDone }) {
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [voteMode, setVoteMode] = useState("single");
  const [durationText, setDurationText] = useState("");
  const [autoNext, setAutoNext] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = !editingQuestion || editingQuestion.status !== "open";
  const parsedDuration = useMemo(() => parseDuration(durationText), [durationText]);

  useEffect(() => {
    if (!editingQuestion) { setText(""); setDescription(""); setVoteMode("single"); setDurationText(""); setAutoNext(false); return; }
    setText(editingQuestion.text || "");
    setDescription(editingQuestion.description || "");
    setVoteMode(editingQuestion.vote_mode || "single");
    setDurationText(editingQuestion.duration ? String(editingQuestion.duration) : "");
    setAutoNext(Boolean(editingQuestion.auto_next));
  }, [editingQuestion]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit || !roundId || !text.trim()) return;
    setLoading(true);
    try {
      if (editingQuestion?.id) {
        await updateDoc(doc(db, "sessions", code, "rounds", roundId, "questions", editingQuestion.id), {
          text: text.trim(), description: description.trim() || null, vote_mode: voteMode, duration: parsedDuration, auto_next: autoNext,
        });
      } else {
        await addDoc(collection(db, "sessions", code, "rounds", roundId, "questions"), {
          text: text.trim(), description: description.trim() || null, order: questions.length, vote_mode: voteMode, status: "pending",
          duration: parsedDuration, ends_at: null, auto_next: autoNext, show_realtime: false,
          created_at: serverTimestamp(),
        });
      }
      onDone();
    } finally { setLoading(false); }
  }

  if (!roundId) return <div className="rounded-xl border bg-white p-4 text-sm text-gray-500">Chọn round để thêm câu hỏi.</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-white p-4">
      <h3 className="text-base font-bold">{editingQuestion ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h3>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Nội dung câu hỏi" className="min-h-[80px] w-full rounded-lg border p-3 text-sm" required disabled={!canEdit || loading} />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả phụ (tùy chọn)" className="h-10 w-full rounded-lg border px-3 text-sm" disabled={!canEdit || loading} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setVoteMode("single")} className={`h-10 rounded-lg border text-sm font-medium ${voteMode === "single" ? "bg-gray-900 text-white" : ""}`} disabled={!canEdit}>Chọn 1</button>
        <button type="button" onClick={() => setVoteMode("multi")} className={`h-10 rounded-lg border text-sm font-medium ${voteMode === "multi" ? "bg-gray-900 text-white" : ""}`} disabled={!canEdit}>Chọn nhiều</button>
      </div>
      <input value={durationText} onChange={(e) => setDurationText(e.target.value)} placeholder="Thời gian (giây, bỏ trống = không giới hạn)" className="h-10 w-full rounded-lg border px-3 text-sm" disabled={!canEdit || loading} />
      <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
        <button type="button" onClick={() => setAutoNext(false)} className={`h-9 rounded-lg border text-xs font-semibold ${!autoNext ? "bg-gray-900 text-white" : ""}`} disabled={!canEdit}>Manual</button>
        <button type="button" onClick={() => setAutoNext(true)} className={`h-9 rounded-lg border text-xs font-semibold ${autoNext ? "bg-gray-900 text-white" : ""}`} disabled={!canEdit}>Auto</button>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={!canEdit || loading} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-gray-300">{loading ? "Đang lưu..." : editingQuestion ? "Cập nhật" : "Thêm câu"}</button>
        {editingQuestion ? <button type="button" onClick={onDone} className="h-10 rounded-lg border px-4 text-sm">Hủy</button> : null}
      </div>
    </form>
  );
}
