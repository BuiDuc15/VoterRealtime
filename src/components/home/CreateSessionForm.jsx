import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../firebase";
import { generateUniqueCode } from "../../utils/sessionCode";
import { createZeroCounts } from "../../utils/voteHelpers";

const PRESET_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"];

export default function CreateSessionForm() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [timerMode, setTimerMode] = useState("per_round");
  const [transitionMode, setTransitionMode] = useState("auto");
  const [sessionMinutes, setSessionMinutes] = useState(60);

  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState(PRESET_COLORS[0]);
  const [teams, setTeams] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (password.length < 4) return false;
    if (teams.length < 2) return false;
    if (timerMode === "session" && (!sessionMinutes || Number(sessionMinutes) <= 0)) return false;
    return true;
  }, [name, password, teams.length, timerMode, sessionMinutes]);

  function addTeam() {
    if (!teamName.trim()) return;

    setTeams((prev) => [
      ...prev,
      {
        id: uuidv4(),
        name: teamName.trim(),
        color: teamColor,
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
        timer_mode: timerMode,
        transition_mode: transitionMode,
        session_duration: timerMode === "session" ? Number(sessionMinutes) * 60 : null,
        session_ends_at: null,
        current_round_id: null,
        teams,
        chart_total_counts: createZeroCounts(teams),
        chart_total_votes: 0,
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

      <div className="space-y-2 rounded-xl border p-3">
        <p className="font-semibold">Chế độ thời gian</p>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={timerMode === "per_round"}
            onChange={() => setTimerMode("per_round")}
          />
          Thời gian từng vòng
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={timerMode === "session"}
            onChange={() => setTimerMode("session")}
          />
          Thời gian toàn bộ session
        </label>
        {timerMode === "session" ? (
          <input
            type="number"
            min="1"
            value={sessionMinutes}
            onChange={(event) => setSessionMinutes(event.target.value)}
            className="h-12 w-full rounded-lg border px-3"
            placeholder="Số phút"
          />
        ) : null}
      </div>

      <div className="space-y-2 rounded-xl border p-3">
        <p className="font-semibold">Chế độ chuyển vòng</p>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={transitionMode === "manual"}
            onChange={() => setTransitionMode("manual")}
          />
          Admin thao tác tay (Next round)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={transitionMode === "auto"}
            onChange={() => setTransitionMode("auto")}
          />
          Tự động chuyển vòng khi hết thời gian
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="h-12 w-full rounded-lg bg-blue-600 text-white disabled:bg-gray-400"
      >
        {loading ? "Đang tạo session..." : "Tạo session"}
      </button>
    </form>
  );
}

