import { useEffect, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
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

function formatDuration(seconds) {
  if (!seconds) return "";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const PRESETS = [
  { label: "30s", value: 30 },
  { label: "1 phút", value: 60 },
  { label: "2 phút", value: 120 },
  { label: "3 phút", value: 180 },
  { label: "5 phút", value: 300 },
  { label: "Không giới hạn", value: null },
];

export default function SessionTimeoutSettings({ code, session }) {
  const [questionTimeout, setQuestionTimeout] = useState("");
  const [roundTimeout, setRoundTimeout] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const parsedQuestionTimeout = useMemo(() => parseDuration(questionTimeout), [questionTimeout]);
  const parsedRoundTimeout = useMemo(() => parseDuration(roundTimeout), [roundTimeout]);

  useEffect(() => {
    setQuestionTimeout(session?.default_question_duration ? String(session.default_question_duration) : "");
    setRoundTimeout(session?.default_round_duration ? String(session.default_round_duration) : "");
  }, [session?.default_question_duration, session?.default_round_duration]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, "sessions", code), {
        default_question_duration: parsedQuestionTimeout,
        default_round_duration: parsedRoundTimeout,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    parsedQuestionTimeout !== (session?.default_question_duration || null) ||
    parsedRoundTimeout !== (session?.default_round_duration || null);

  return (
    <div className="space-y-4 rounded-xl border bg-white p-3 sm:p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">⏱ Timeout mặc định cho phiên</h3>
        <p className="mt-0.5 text-xs text-gray-400">Áp dụng cho câu hỏi / round chưa thiết lập riêng</p>
      </div>

      {/* Default question timeout */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">Timeout câu hỏi (giây)</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setQuestionTimeout(p.value != null ? String(p.value) : "")}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                parsedQuestionTimeout === p.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          value={questionTimeout}
          onChange={(e) => setQuestionTimeout(e.target.value)}
          placeholder="Bỏ trống = không giới hạn (ví dụ: 60 hoặc 1:30)"
          className="h-10 w-full rounded-lg border px-3 text-sm"
        />
        {parsedQuestionTimeout ? (
          <p className="text-xs text-gray-500">= {parsedQuestionTimeout}s ({formatDuration(parsedQuestionTimeout)})</p>
        ) : null}
      </div>

      {/* Default round timeout */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">Timeout round (giây)</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setRoundTimeout(p.value != null ? String(p.value) : "")}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                parsedRoundTimeout === p.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          value={roundTimeout}
          onChange={(e) => setRoundTimeout(e.target.value)}
          placeholder="Bỏ trống = không giới hạn (ví dụ: 300 hoặc 5:00)"
          className="h-10 w-full rounded-lg border px-3 text-sm"
        />
        {parsedRoundTimeout ? (
          <p className="text-xs text-gray-500">= {parsedRoundTimeout}s ({formatDuration(parsedRoundTimeout)})</p>
        ) : null}
      </div>

      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition disabled:bg-gray-300"
      >
        {saving ? "Đang lưu..." : saved ? "✓ Đã lưu" : "Lưu timeout"}
      </button>
    </div>
  );
}

