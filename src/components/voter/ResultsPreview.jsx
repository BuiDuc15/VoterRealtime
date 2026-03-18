import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db } from "../../firebase";
import { buildChartData } from "../../utils/voteHelpers";
import AlreadyVoted from "./AlreadyVoted";

export default function ResultsPreview({ code, roundId, question, teams, showRoundLabel, roundName }) {
  const [counts, setCounts] = useState(question.vote_counts || {});
  const [total, setTotal] = useState(question.total_votes || 0);

  useEffect(() => {
    const ref = doc(db, "sessions", code, "rounds", roundId, "questions", question.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setCounts(snap.data().vote_counts || {});
        setTotal(snap.data().total_votes || 0);
      }
    });

    return unsub;
  }, [code, roundId, question.id]);

  const data = buildChartData(teams, counts);

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl space-y-4 bg-slate-50 p-4 md:p-6">
      <AlreadyVoted />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tiêu chí hiện tại</p>
        {showRoundLabel ? <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{roundName}</p> : null}
        <h1 className="mt-1 text-2xl font-black text-slate-900">{question.text}</h1>
        <p className="mt-2 text-sm text-slate-600">Bạn có thể theo dõi kết quả thay đổi trực tiếp theo từng đội.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Biểu đồ số lượng</p>
            <p className="text-sm text-slate-600">Tổng: {total} phiếu</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={40} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [value, "Phiếu"]} />
                <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Biểu đồ phần trăm</p>
            <p className="text-sm text-slate-600">Thời gian thực</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={40} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Tỷ lệ"]} />
                <Bar dataKey="pct" radius={[8, 8, 0, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Chi tiết từng đội</p>
        {data.map((team) => (
          <div key={team.id}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-semibold">{team.name}</span>
              <span>
                {team.pct}% ({team.votes})
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${team.pct}%`, backgroundColor: team.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

