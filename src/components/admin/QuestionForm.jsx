import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { createZeroCounts } from "../../utils/voteHelpers";

function parseDuration(value) {
  if (value === "") return null;
  if (value.includes(":")) {
    const [mm, ss] = value.split(":").map((part) => Number(part));
    if (Number.isNaN(mm) || Number.isNaN(ss)) return null;
    return mm * 60 + ss;
  }

  const seconds = Number(value);
  return Number.isNaN(seconds) || seconds < 0 ? null : seconds;
}

function toDurationInput(seconds) {
  if (seconds === null || seconds === undefined) return "";
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function QuestionForm({ code, roundId, questions, teams, editingQuestion, onDone }) {
  const [text, setText] = useState("");
  const [voteMode, setVoteMode] = useState("single");
  const [durationText, setDurationText] = useState("");
  const [autoNext, setAutoNext] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = !editingQuestion || editingQuestion.status !== "open";
  const parsedDuration = useMemo(() => parseDuration(durationText), [durationText]);

  useEffect(() => {
    if (!editingQuestion) {
      setText("");
      setVoteMode("single");
      setDurationText("");
      setAutoNext(false);
      return;
    }

    setText(editingQuestion.text || "");
    setVoteMode(editingQuestion.vote_mode || "single");
    setDurationText(toDurationInput(editingQuestion.duration));
    setAutoNext(Boolean(editingQuestion.auto_next));
  }, [editingQuestion]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit || !roundId || !text.trim()) return;

    setLoading(true);
    try {
      if (editingQuestion?.id) {
        await updateDoc(doc(db, "sessions", code, "rounds", roundId, "questions", editingQuestion.id), {
          text: text.trim(),
          vote_mode: voteMode,
          duration: parsedDuration,
          auto_next: autoNext,
        });
      } else {
        await addDoc(collection(db, "sessions", code, "rounds", roundId, "questions"), {
          text: text.trim(),
          order: questions.length,
          vote_mode: voteMode,
          status: "pending",
          duration: parsedDuration,
          ends_at: null,
          auto_next: autoNext,
          show_realtime: false,
          vote_counts: createZeroCounts(teams),
          total_votes: 0,
          created_at: serverTimestamp(),
        });
      }

      onDone();
    } finally {
      setLoading(false);
    }
  }

  if (!roundId) {
    return <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">Chọn round để thêm câu hỏi.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-white p-4">
      <h3 className="text-lg font-bold">{editingQuestion ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h3>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Nhập nội dung câu hỏi"
        className="min-h-[92px] w-full rounded-lg border p-3"
        required
        disabled={!canEdit || loading}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setVoteMode("single")}
          className={`h-11 rounded-lg border ${voteMode === "single" ? "bg-gray-900 text-white" : "bg-white"}`}
          disabled={!canEdit || loading}
        >
          Chọn 1
        </button>
        <button
          type="button"
          onClick={() => setVoteMode("multi")}
          className={`h-11 rounded-lg border ${voteMode === "multi" ? "bg-gray-900 text-white" : "bg-white"}`}
          disabled={!canEdit || loading}
        >
          Chọn nhiều
        </button>
      </div>

      <input
        value={durationText}
        onChange={(event) => setDurationText(event.target.value)}
        placeholder="Thời gian (giây hoặc mm:ss, bỏ trống = không giới hạn)"
        className="h-11 w-full rounded-lg border px-3"
        disabled={!canEdit || loading}
      />

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-semibold text-gray-700">Chế độ chuyển câu</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAutoNext(false)}
            className={`h-10 rounded-lg border text-sm font-semibold ${!autoNext ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}
            disabled={!canEdit || loading}
          >
            Manual (Admin chuyển)
          </button>
          <button
            type="button"
            onClick={() => setAutoNext(true)}
            className={`h-10 rounded-lg border text-sm font-semibold ${autoNext ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}
            disabled={!canEdit || loading}
          >
            Auto (Tự chuyển)
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Auto: voter submit xong sẽ chuyển câu tiếp theo; nếu có thời gian thì hết giờ cũng tự chuyển.
        </p>
      </div>

      {!canEdit ? <p className="text-sm text-red-600">Không thể sửa câu hỏi đang mở.</p> : null}

      <div className="flex gap-2">
        <button type="submit" disabled={!canEdit || loading} className="h-11 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:bg-gray-400">
          {loading ? "Đang lưu..." : editingQuestion ? "Cập nhật" : "Thêm câu"}
        </button>
        {editingQuestion ? (
          <button type="button" onClick={onDone} className="h-11 rounded-lg border px-4" disabled={loading}>
            Hủy
          </button>
        ) : null}
      </div>
    </form>
  );
}

