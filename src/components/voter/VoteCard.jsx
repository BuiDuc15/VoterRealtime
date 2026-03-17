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
    <div className="mx-auto min-h-screen w-full max-w-4xl space-y-5 p-4 pb-24 md:p-6 md:pb-28">
      <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-5 text-white shadow-lg shadow-blue-900/25">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">Bình chọn trực tiếp</p>
            <h1 className="mt-2 text-2xl font-black md:text-3xl">{round.name}</h1>
            <p className="mt-2 text-sm text-indigo-100">
              {round.vote_mode === "single"
                ? "Mỗi người chỉ chọn 1 đội trong tiêu chí này."
                : "Bạn có thể chọn nhiều đội trong tiêu chí này."}
            </p>
          </div>
          {round.ends_at ? (
            <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-100">Thời gian còn lại</p>
              <CountdownTimer endsAt={round.ends_at} className="text-white" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-600">Danh sách đội tham gia</p>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            Đã chọn: <span className="font-bold text-slate-800">{selected.length}</span>
          </p>
        </div>

        <div className={`grid gap-3 ${teams.length >= 4 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {teams.map((team) => {
            const active = selected.includes(team.id);
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => toggle(team.id)}
                className={`min-h-[116px] rounded-2xl border-2 px-4 py-3 text-left text-white transition ${
                  active ? "scale-[1.01] border-white/80 shadow-lg ring-2 ring-offset-2" : "border-transparent"
                }`}
                style={{ backgroundColor: team.color, ringColor: team.color }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xl font-black">{team.name}</p>
                  <span className="rounded-full bg-black/25 px-2 py-1 text-xs font-semibold">
                    {active ? "Đã chọn" : "Chọn"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-white/90">
                  {active ? "Bạn đã chọn đội này." : "Nhấn để thêm vào phiếu bình chọn."}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:left-auto md:right-auto md:w-full md:max-w-4xl md:rounded-t-2xl">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected.length || loading}
          className="h-14 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading ? "Đang gửi bình chọn..." : "Gửi bình chọn"}
        </button>
      </div>
    </div>
  );
}

