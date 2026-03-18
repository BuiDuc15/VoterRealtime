import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { buildChartData, getWinners } from "../../utils/voteHelpers";

export default function LiveChart({ teams, voteCounts = {}, roundStatus, title }) {
  const data = buildChartData(teams, voteCounts);
  const totalVotes = data.reduce((sum, item) => sum + item.votes, 0);

  const winnerNames = (roundStatus === "closed" ? getWinners(data) : []).map((winner) => winner.name);

  return (
    <div className="h-full rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</p>
        <p className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-200">Tổng: {totalVotes} phiếu</p>
      </div>

      {data.length ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 18, right: 12, left: 0, bottom: 12 }}>
            <XAxis dataKey="name" tick={{ fill: "#e2e8f0", fontSize: 12, fontWeight: 700 }} interval={0} />
            <YAxis hide allowDecimals={false} />
            <Bar dataKey="votes" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={320}>
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
                    <text x={x + width / 2} y={y - 8} textAnchor="middle" fill="#f8fafc" fontSize={12}>
                      {value} phiếu ({entry.pct}%)
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-600 text-sm text-slate-400">
          Chưa có dữ liệu đội thi.
        </div>
      )}
    </div>
  );
}

