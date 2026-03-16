import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db } from "../../firebase";
import { buildChartData } from "../../utils/voteHelpers";
import AlreadyVoted from "./AlreadyVoted";

export default function ResultsPreview({ code, round, teams }) {
  const [counts, setCounts] = useState(round.vote_counts || {});

  useEffect(() => {
    const ref = doc(db, "sessions", code, "rounds", round.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setCounts(snap.data().vote_counts || {});
    });

    return unsub;
  }, [code, round.id]);

  const total = Object.values(counts).reduce((acc, value) => acc + value, 0);
  const data = buildChartData(teams, counts);

  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl space-y-4 p-4 md:p-6">
      <AlreadyVoted />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Bieu do so luong</p>
            <p className="text-sm text-slate-600">Tong: {total} phieu</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={40} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Bieu do phan tram</p>
            <p className="text-sm text-slate-600">Realtime</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={40} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Ti le"]} />
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

      <div className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Chi tiet tung doi</p>
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

