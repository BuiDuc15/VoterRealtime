import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../firebase";
import { generateUniqueCode } from "../../utils/sessionCode";

const PRESET_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"];

export default function CreateSessionForm() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState(PRESET_COLORS[0]);
  const [teams, setTeams] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (password.length < 4) return false;
    if (teams.length < 2) return false;
    return true;
  }, [name, password, teams.length]);

  function addTeam() {
    if (!teamName.trim()) return;

    setTeams((prev) => [
      ...prev,
      {
        id: uuidv4(),
        name: teamName.trim(),
        color: teamColor,
        order: prev.length,
      },
    ]);
    setTeamName("");
  }

  function removeTeam(id) {
    setTeams((prev) => prev.filter((team) => team.id !== id));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      const code = await generateUniqueCode();

      await setDoc(doc(db, "sessions", code), {
        name: name.trim(),
        admin_password: btoa(password),
        status: "waiting",
        show_round_label: false,
        session_version: 1,
        current_round_id: null,
        current_question_id: null,
        teams,
        created_at: serverTimestamp(),
      });

      navigate(`/session-created/${code}`);
    } catch {
      setError("Không thể tạo session, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow">
      <div>
        <label className="mb-1 block text-sm font-medium">Tên sự kiện</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-12 w-full rounded-lg border px-3"
          placeholder="Ví dụ: Hackathon 2025"
          required
        />
      </div>

      <div className="space-y-2 rounded-xl border p-3">
        <p className="font-semibold">Danh sách đội</p>
        <div className="flex gap-2">
          <input
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            className="h-12 flex-1 rounded-lg border px-3"
            placeholder="Tên đội"
          />
          <button type="button" onClick={addTeam} className="h-12 rounded-lg bg-gray-900 px-4 text-white">
            Thêm
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => setTeamColor(color)}
              className={`h-9 w-9 rounded-full border-2 ${teamColor === color ? "border-black" : "border-transparent"}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="space-y-2">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center justify-between rounded-lg border p-2">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: team.color }} />
                <span>{team.name}</span>
              </div>
              <button type="button" onClick={() => removeTeam(team.id)} className="text-sm text-red-600">
                Xóa
              </button>
            </div>
          ))}
        </div>
        {teams.length < 2 ? <p className="text-sm text-red-600">Cần ít nhất 2 đội</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Mật khẩu admin</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 w-full rounded-lg border px-3"
          minLength={4}
          required
        />
      </div>

      <div className="rounded-xl border p-3 text-sm text-slate-600">
        Thời gian mặc định mỗi vòng sẽ được cài đặt tại màn quản trị sau khi tạo phiên.
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="h-12 w-full rounded-lg bg-blue-600 text-white disabled:bg-gray-400"
      >
        {loading ? "Đang tạo phiên..." : "Tạo phiên"}
      </button>
    </form>
  );
}

