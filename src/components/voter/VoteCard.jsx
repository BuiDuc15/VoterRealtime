import { useState } from "react";
import CountdownTimer from "../shared/CountdownTimer";

export default function VoteCard({ round, teams, onSubmit }) {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(teamId) {
    setError("");
    if (round.vote_mode === "single") {
      setSelected((prev) => (prev[0] === teamId ? [] : [teamId]));
      return;
    }

    setSelected((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  }

  async function handleSubmit() {
    if (!selected.length) return;

    setLoading(true);
    setError("");
    try {
      await onSubmit(selected);
    } catch (submitError) {
      setError(submitError.message || "Có lỗi xảy ra, vui lòng thử lại");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl space-y-5 p-4 md:p-6">
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-100">Live Voting</p>
        <h1 className="mt-1 text-2xl font-black md:text-3xl">{round.name}</h1>
        <p className="mt-2 text-sm text-indigo-100">
          {round.vote_mode === "single"
            ? "Chon 1 doi ma ban danh gia cao nhat"
            : "Ban co the chon nhieu doi trong vong nay"}
        </p>
        {round.ends_at ? (
          <div className="mt-3 inline-flex rounded-xl bg-white/20 px-4 py-2 text-center">
            <CountdownTimer endsAt={round.ends_at} />
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-500">Danh sach doi tham gia</p>
          <p className="text-sm text-slate-500">
            Da chon: <span className="font-bold text-slate-700">{selected.length}</span>
          </p>
        </div>

        <div className={`grid gap-3 ${teams.length >= 4 ? "grid-cols-2" : "grid-cols-1"}`}>
        {teams.map((team) => {
          const active = selected.includes(team.id);
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => toggle(team.id)}
              className={`min-h-[112px] rounded-2xl border-4 px-4 text-left text-white transition ${
                active ? "scale-[1.02] border-white shadow-lg" : "border-transparent"
              }`}
              style={{ backgroundColor: team.color }}
            >
              <p className="text-xl font-black">{team.name}</p>
              <p className="mt-1 text-sm text-white/90">{active ? "Da duoc chon" : "Nhan de chon"}</p>
            </button>
          );
        })}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selected.length || loading}
        className="h-14 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {loading ? "Đang gửi..." : "Gửi bình chọn"}
      </button>
    </div>
  );
}

