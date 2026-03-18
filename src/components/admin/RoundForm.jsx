import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function RoundForm({ code, rounds, editingRound, onDone }) {
  const [name, setName] = useState("");
  const [autoNext, setAutoNext] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = !editingRound || editingRound.status !== "active";
  const canSubmit = useMemo(() => Boolean(name.trim()), [name]);

  useEffect(() => {
    if (!editingRound) {
      setName("");
      setAutoNext(false);
      return;
    }

    setName(editingRound.name || "");
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
          auto_next: autoNext,
        });
      } else {
        await addDoc(collection(db, "sessions", code, "rounds"), {
          name: name.trim(),
          order: rounds.length,
          status: "pending",
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
      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-semibold text-gray-700">Chế độ chuyển round</p>
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
      </div>
      {!canEdit ? <p className="text-sm text-red-600">Không thể sửa round đang active</p> : null}
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

