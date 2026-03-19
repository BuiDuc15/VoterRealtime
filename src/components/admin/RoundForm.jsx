import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

function parseDuration(value) {
  if (value === "" || value == null) return null;
  if (String(value).includes(":")) {
    const [mm, ss] = String(value).split(":").map(Number);
    if (Number.isNaN(mm) || Number.isNaN(ss)) return null;
    return mm * 60 + ss;
  }
  const s = Number(value);
  return Number.isNaN(s) || s <= 0 ? null : s;
}

export default function RoundForm({ code, rounds, editingRound, onDone }) {
  const [name, setName] = useState("");
  const [durationText, setDurationText] = useState("");
  const [autoNext, setAutoNext] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = !editingRound || editingRound.status === "pending";
  const canSubmit = useMemo(() => Boolean(name.trim()), [name]);
  const parsedDuration = useMemo(() => parseDuration(durationText), [durationText]);

  useEffect(() => {
    if (!editingRound) {
      setName("");
      setDurationText("");
      setAutoNext(false);
      return;
    }

    setName(editingRound.name || "");
    setDurationText(editingRound.duration ? String(editingRound.duration) : "");
    setAutoNext(Boolean(editingRound.auto_next));
  }, [editingRound]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit || !canSubmit) return;

    setLoading(true);
    try {
      if (editingRound?.id) {
        await updateDoc(doc(db, "sessions", code, "rounds", editingRound.id), {
          name: name.trim(),
          duration: parsedDuration,
          auto_next: autoNext,
        });
      } else {
        await addDoc(collection(db, "sessions", code, "rounds"), {
          name: name.trim(),
          order: rounds.length,
          status: "pending",
          duration: parsedDuration,
          auto_next: autoNext,
          created_at: serverTimestamp(),
        });
      }

      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-white p-4">
      <h3 className="text-lg font-bold">{editingRound ? "Sửa round" : "Thêm round mới"}</h3>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Ví dụ: Vòng Chung Kết"
        className="h-12 w-full rounded-lg border px-3"
        required
        disabled={!canEdit || loading}
      />
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Thời gian round (giây)</label>
        <input
          value={durationText}
          onChange={(event) => setDurationText(event.target.value)}
          placeholder="Bỏ trống = dùng mặc định session hoặc không giới hạn (ví dụ: 120 hoặc 2:00)"
          className="h-12 w-full rounded-lg border px-3 text-sm"
          disabled={!canEdit || loading}
        />
        {parsedDuration ? (
          <p className="text-xs text-gray-500">= {parsedDuration}s ({Math.floor(parsedDuration / 60)}:{String(parsedDuration % 60).padStart(2, "0")})</p>
        ) : null}
      </div>
      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-semibold text-gray-700">Mode round (khi round kết thúc)</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAutoNext(false)}
            className={`h-10 rounded-lg border text-sm font-semibold ${!autoNext ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}
            disabled={!canEdit || loading}
          >
            Manual (chờ admin chuyển round)
          </button>
          <button
            type="button"
            onClick={() => setAutoNext(true)}
            className={`h-10 rounded-lg border text-sm font-semibold ${autoNext ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}
            disabled={!canEdit || loading}
          >
            Auto (tự sang round kế tiếp)
          </button>
        </div>
        <p className="text-[11px] text-gray-500">Lưu ý: Mode round khác với mode câu hỏi. Timeout round cũng độc lập với timeout câu hỏi.</p>
      </div>
      {!canEdit ? <p className="text-sm text-red-600">Không thể sửa round đã bắt đầu hoặc kết thúc</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canEdit || !canSubmit || loading}
          className="h-12 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:bg-gray-400"
        >
          {loading ? "Đang lưu..." : editingRound ? "Cập nhật" : "Tạo round"}
        </button>
        {editingRound ? (
          <button type="button" onClick={onDone} className="h-12 rounded-lg border px-4" disabled={loading}>
            Hủy
          </button>
        ) : null}
      </div>
    </form>
  );
}

