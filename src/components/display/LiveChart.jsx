import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { buildChartData, getWinners } from "../../utils/voteHelpers";

export default function LiveChart({ teams, voteCounts = {}, roundStatus, metric = "votes", title }) {
  const data = buildChartData(teams, voteCounts);
  const isPct = metric === "pct";

  const winnerNames = (roundStatus === "closed" ? getWinners(data) : []).map((winner) => winner.name);

  return (
    <div className="h-full rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</p>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 24, right: 20, left: 4, bottom: 18 }}>
          <XAxis dataKey="name" tick={{ fill: "#e2e8f0", fontSize: 14, fontWeight: 700 }} interval={0} />
          <YAxis hide domain={isPct ? [0, 100] : undefined} />
          <Bar dataKey={metric} radius={[10, 10, 0, 0]} isAnimationActive animationDuration={350}>
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={entry.color}
                opacity={winnerNames.length && !winnerNames.includes(entry.name) ? 0.35 : 1}
              />
            ))}
            <LabelList
              content={({ x, y, width, value, index }) => {
                const entry = data[index];
                return (
                  <text x={x + width / 2} y={y - 10} textAnchor="middle" fill="#f8fafc" fontSize={14}>
                    {isPct ? `${value}%` : `${value} phieu`} | {entry.pct}%
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

