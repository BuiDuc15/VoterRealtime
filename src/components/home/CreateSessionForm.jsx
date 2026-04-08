import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../firebase";
import { generateUniqueCode } from "../../utils/sessionCode";

const TEAM_COLORS = ["#1D9E75", "#534AB7", "#D85A30", "#1A7FBD", "#B8860B", "#C2185B", "#2E7D32", "#6D4C41"];

export default function CreateSessionForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => name.trim() && password.length >= 4 && teams.length >= 2, [name, password, teams]);

  function addTeam() {
    if (!teamName.trim() || teams.length >= 10) return;
    const usedColors = teams.map((t) => t.color);
    const nextColor = TEAM_COLORS.find((c) => !usedColors.includes(c)) || TEAM_COLORS[teams.length % 8];
    setTeams((prev) => [...prev, { id: uuidv4(), name: teamName.trim(), color: teamColor, order: prev.length }]);
    setTeamName("");
    setTeamColor(nextColor);
  }

  function removeTeam(id) {
    setTeams((prev) => prev.filter((t) => t.id !== id).map((t, i) => ({ ...t, order: i })));
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
        round_transition_mode: "manual",
        display_report_mode: "current_round",
        teams,
        show_round_label: false,
        group_results_by_round: true,
        current_round_id: null,
        current_question_id: null,
        online_count: 0,
        session_version: 1,
        created_at: serverTimestamp(),
      });
      navigate(`/session-created/${code}`);
    } catch {
      setError("Không thể tạo phiên, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-lg space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl sm:space-y-5 sm:p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Tên sự kiện</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 sm:h-12 sm:text-base"
          placeholder="Ví dụ: Hackathon 2025"
          required
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 sm:p-4">
        <p className="mb-2 text-sm font-semibold text-gray-700 sm:mb-3">Danh sách đội</p>
        <div className="flex gap-2">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTeam();
              }
            }}
            className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-violet-500 focus:outline-none sm:h-11"
            placeholder="Tên đội"
          />
          <button
            type="button"
            onClick={addTeam}
            className="h-10 shrink-0 rounded-lg bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-700 sm:h-11 sm:px-4"
          >
            + Thêm
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
          {TEAM_COLORS.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => setTeamColor(color)}
              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 sm:h-8 sm:w-8 ${
                teamColor === color ? "border-gray-900 scale-110 ring-2 ring-violet-300" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
          {teams.map((team) => (
            <span
              key={team.id}
              className="inline-flex items-center gap-1 rounded-full py-1 pl-2 pr-1 text-xs font-medium text-white sm:text-sm sm:gap-1.5"
              style={{ backgroundColor: team.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 sm:h-2 sm:w-2" />
              {team.name}
              <button
                type="button"
                onClick={() => removeTeam(team.id)}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/20 text-[10px] hover:bg-black/40 sm:h-5 sm:w-5 sm:text-xs"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {teams.length < 2 ? <p className="mt-2 text-xs text-red-500">Cần ít nhất 2 đội</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu admin</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 sm:h-12 sm:text-base"
          placeholder="Tối thiểu 4 ký tự"
          minLength={4}
          required
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="h-11 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700 disabled:bg-gray-300 disabled:shadow-none sm:h-12 sm:text-base"
      >
        {loading ? "Đang tạo phiên..." : "Tạo phiên bình chọn"}
      </button>
    </form>
  );
}
