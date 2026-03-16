import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { createZeroCounts } from "../../utils/voteHelpers";

function parseDuration(value) {
  if (!value) return null;
  if (value.includes(":")) {
    const [mm, ss] = value.split(":").map((part) => Number(part));
    if (Number.isNaN(mm) || Number.isNaN(ss)) return null;
    return mm * 60 + ss;
  }

  const seconds = Number(value);
  return Number.isNaN(seconds) || seconds <= 0 ? null : seconds;
}

function toDurationInput(seconds) {
  if (!seconds) return "";
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function RoundForm({ code, rounds, teams, editingRound, onDone }) {
  const [name, setName] = useState("");
  const [voteMode, setVoteMode] = useState("single");
  const [durationText, setDurationText] = useState("");
  const [autoNext, setAutoNext] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = !editingRound || editingRound.status === "pending";

  useEffect(() => {
    if (!editingRound) {
      setName("");
      setVoteMode("single");
      setDurationText("");
      setAutoNext(false);
      return;
    }

    setName(editingRound.name || "");
    setVoteMode(editingRound.vote_mode || "single");
    setDurationText(toDurationInput(editingRound.duration));
    setAutoNext(Boolean(editingRound.auto_next));
  }, [editingRound]);

  const parsedDuration = useMemo(() => parseDuration(durationText), [durationText]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit || !name.trim()) return;

    setLoading(true);
    try {
      if (editingRound?.id) {
        await updateDoc(doc(db, "sessions", code, "rounds", editingRound.id), {
          name: name.trim(),
          vote_mode: voteMode,
          duration: parsedDuration,
          auto_next: parsedDuration ? autoNext : false,
        });
      } else {
        await addDoc(collection(db, "sessions", code, "rounds"), {
          name: name.trim(),
          order: rounds.length,
          vote_mode: voteMode,
          status: "pending",
          duration: parsedDuration,
          ends_at: null,
          auto_next: parsedDuration ? autoNext : false,
          vote_counts: createZeroCounts(teams),
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
      <h3 className="text-lg font-bold">{editingRound ? "Sửa vòng" : "Thêm vòng mới"}</h3>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Tên vòng"
        className="h-12 w-full rounded-lg border px-3"
        required
        disabled={!canEdit || loading}
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setVoteMode("single")}
          className={`h-12 rounded-lg border ${voteMode === "single" ? "bg-gray-900 text-white" : "bg-white"}`}
          disabled={!canEdit || loading}
        >
          Single
        </button>
        <button
          type="button"
          onClick={() => setVoteMode("multi")}
          className={`h-12 rounded-lg border ${voteMode === "multi" ? "bg-gray-900 text-white" : "bg-white"}`}
          disabled={!canEdit || loading}
        >
          Multi
        </button>
      </div>
      <input
        value={durationText}
        onChange={(event) => setDurationText(event.target.value)}
        placeholder="Thời gian (giây hoặc mm:ss, bỏ trống = không giới hạn)"
        className="h-12 w-full rounded-lg border px-3"
        disabled={!canEdit || loading}
      />
      {parsedDuration ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoNext}
            onChange={(event) => setAutoNext(event.target.checked)}
            disabled={!canEdit || loading}
          />
          Tự chuyển vòng khi hết giờ
        </label>
      ) : null}
      {!canEdit ? <p className="text-sm text-red-600">Không thể sửa vòng đang mở/đã khóa</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canEdit || loading}
          className="h-12 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:bg-gray-400"
        >
          {loading ? "Đang lưu..." : editingRound ? "Cập nhật" : "Tạo vòng"}
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

