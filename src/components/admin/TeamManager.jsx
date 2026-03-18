import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../firebase";

const PRESET_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"];

export default function TeamManager({ code, teams = [], sessionStatus = "waiting" }) {
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState(PRESET_COLORS[0]);

  const canEdit = sessionStatus === "waiting";
  const sortedTeams = useMemo(() => [...teams].sort((a, b) => (a.order || 0) - (b.order || 0)), [teams]);

  async function saveTeams(nextTeams) {
    const normalized = nextTeams.map((team, index) => ({ ...team, order: index }));
    await updateDoc(doc(db, "sessions", code), { teams: normalized });
  }

  async function addTeam() {
    if (!canEdit || !teamName.trim()) return;
    await saveTeams([...sortedTeams, { id: uuidv4(), name: teamName.trim(), color: teamColor }]);
    setTeamName("");
  }

  async function removeTeam(id) {
    if (!canEdit) return;
    await saveTeams(sortedTeams.filter((team) => team.id !== id));
  }

  async function moveTeam(index, direction) {
    if (!canEdit) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedTeams.length) return;

    const next = [...sortedTeams];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    await saveTeams(next);
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold">Danh sách đội</h3>
        {!canEdit ? <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">🔒 Đang diễn ra</span> : null}
      </div>

      {canEdit ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              className="h-11 flex-1 rounded-lg border px-3"
              placeholder="Tên đội"
            />
            <button type="button" onClick={addTeam} className="h-11 rounded-lg bg-gray-900 px-4 text-white">
              Thêm
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => setTeamColor(color)}
                className={`h-8 w-8 rounded-full border-2 ${teamColor === color ? "border-black" : "border-transparent"}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {sortedTeams.map((team, index) => (
        <div key={team.id} className="flex items-center justify-between rounded-lg border p-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
            <span>{team.name}</span>
          </div>
          {canEdit ? (
            <div className="flex gap-1">
              <button type="button" className="rounded border px-2 text-xs" onClick={() => moveTeam(index, -1)} disabled={index === 0}>
                ↑
              </button>
              <button
                type="button"
                className="rounded border px-2 text-xs"
                onClick={() => moveTeam(index, 1)}
                disabled={index === sortedTeams.length - 1}
              >
                ↓
              </button>
              <button type="button" className="rounded border border-red-300 px-2 text-xs text-red-600" onClick={() => removeTeam(team.id)}>
                Xóa
              </button>
            </div>
          ) : null}
        </div>
      ))}

      {sortedTeams.length < 2 ? <p className="text-sm text-red-600">Cần ít nhất 2 đội để bắt đầu phiên.</p> : null}
    </div>
  );
}

