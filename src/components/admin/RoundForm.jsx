import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../firebase";

const PRESET_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"];

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

export default function RoundForm({ code, rounds, editingRound, onDone, sessionTeams = [], sessionStatus = "waiting" }) {
  const [name, setName] = useState("");
  const [durationText, setDurationText] = useState("");
  const [questionFlowMode, setQuestionFlowMode] = useState("manual");
  const [teams, setTeams] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const canEdit = !editingRound || sessionStatus === "ended" || editingRound.status === "pending";
  const canSubmit = useMemo(() => Boolean(name.trim()) && teams.length >= 2, [name, teams]);
  const parsedDuration = useMemo(() => parseDuration(durationText), [durationText]);

  useEffect(() => {
    if (!editingRound) {
      setName("");
      setDurationText("");
      setQuestionFlowMode("manual");
      setTeams(sessionTeams.map((t, i) => ({ ...t, order: i })));
      setTeamName("");
      setTeamColor(PRESET_COLORS[0]);
      return;
    }

    setName(editingRound.name || "");
    setDurationText(editingRound.duration ? String(editingRound.duration) : "");
    setQuestionFlowMode(editingRound.question_flow_mode || "manual");
    setTeams((editingRound.teams || sessionTeams).map((t, i) => ({ ...t, order: t.order ?? i })));
    setTeamName("");
    setTeamColor(PRESET_COLORS[0]);
  }, [editingRound, sessionTeams]);

  function addTeam() {
    if (!teamName.trim() || teams.length >= 10) return;
    const usedColors = teams.map((t) => t.color);
    const nextColor = PRESET_COLORS.find((c) => !usedColors.includes(c)) || PRESET_COLORS[teams.length % 8];
    setTeams((prev) => [...prev, { id: uuidv4(), name: teamName.trim(), color: teamColor, order: prev.length }]);
    setTeamName("");
    setTeamColor(nextColor);
  }

  function removeTeam(id) {
    setTeams((prev) => prev.filter((t) => t.id !== id).map((t, i) => ({ ...t, order: i })));
  }

  function moveTeam(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= teams.length) return;
    const sorted = [...teams].sort((a, b) => (a.order || 0) - (b.order || 0));
    [sorted[index], sorted[targetIndex]] = [sorted[targetIndex], sorted[index]];
    setTeams(sorted.map((t, i) => ({ ...t, order: i })));
  }

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => (a.order || 0) - (b.order || 0)), [teams]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit || !canSubmit) return;

    const normalizedTeams = sortedTeams.map((t, i) => ({ id: t.id, name: t.name, color: t.color, order: i }));

    setLoading(true);
    try {
      if (editingRound?.id) {
        await updateDoc(doc(db, "sessions", code, "rounds", editingRound.id), {
          name: name.trim(),
          duration: parsedDuration,
          auto_next: false,
          question_flow_mode: questionFlowMode,
          teams: normalizedTeams,
        });
      } else {
        await addDoc(collection(db, "sessions", code, "rounds"), {
          name: name.trim(),
          order: rounds.length,
          status: "pending",
          duration: parsedDuration,
          auto_next: false,
          question_flow_mode: questionFlowMode,
          teams: normalizedTeams,
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

      {/* Per-round team editor */}
      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-semibold text-gray-700">Danh sách đội trong round này</p>
        {canEdit ? (
          <>
            <div className="flex gap-2">
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTeam(); } }}
                className="h-10 flex-1 rounded-lg border px-3 text-sm"
                placeholder="Tên đội"
                disabled={loading}
              />
              <button type="button" onClick={addTeam} className="h-10 shrink-0 rounded-lg bg-gray-900 px-3 text-sm text-white" disabled={loading}>
                Thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setTeamColor(color)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${teamColor === color ? "border-black scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </>
        ) : null}

        {sortedTeams.map((team, index) => (
          <div key={team.id} className="flex items-center justify-between rounded-lg border p-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
              <span className="text-sm">{team.name}</span>
            </div>
            {canEdit ? (
              <div className="flex gap-1">
                <button type="button" className="rounded border px-2 text-xs" onClick={() => moveTeam(index, -1)} disabled={index === 0 || loading}>↑</button>
                <button type="button" className="rounded border px-2 text-xs" onClick={() => moveTeam(index, 1)} disabled={index === sortedTeams.length - 1 || loading}>↓</button>
                <button type="button" className="rounded border border-red-300 px-2 text-xs text-red-600" onClick={() => removeTeam(team.id)} disabled={loading}>Xóa</button>
              </div>
            ) : null}
          </div>
        ))}

        {sortedTeams.length < 2 ? <p className="text-xs text-red-500">Cần ít nhất 2 đội cho round này</p> : null}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-semibold text-gray-700">Mode điều hướng câu hỏi trong round</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setQuestionFlowMode("manual")}
            className={`h-10 rounded-lg border text-sm font-semibold ${questionFlowMode === "manual" ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}
            disabled={!canEdit || loading}
          >
            Admin chuyển tay từng câu
          </button>
          <button
            type="button"
            onClick={() => setQuestionFlowMode("auto")}
            className={`h-10 rounded-lg border text-sm font-semibold ${questionFlowMode === "auto" ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}
            disabled={!canEdit || loading}
          >
            Voter vote xong tự sang câu kế
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Timeout vẫn cấu hình theo từng câu hỏi. Mode round chỉ quyết định ai điều hướng sang câu tiếp theo.
        </p>
      </div>

      <div className="rounded-lg border bg-slate-50 px-3 py-2">
        <p className="text-xs text-slate-500">Round luôn chuyển vòng thủ công bởi admin (không tự chuyển round).</p>
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
