export function calcResults(teams, vote_counts = {}, total_votes = 0) {
  return teams
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((team) => ({
      ...team,
      votes: vote_counts[team.id] || 0,
      pct: total_votes > 0 ? Math.round(((vote_counts[team.id] || 0) / total_votes) * 100) : 0,
    }));
}

export function getWinners(results) {
  if (!results.length) return [];
  const max = Math.max(...results.map((r) => r.votes));
  if (max === 0) return [];
  return results.filter((r) => r.votes === max);
}

export function buildChartData(teams = [], voteCounts = {}) {
  const total = Object.values(voteCounts).reduce((acc, v) => acc + v, 0);
  return teams
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((team) => {
      const votes = Number(voteCounts[team.id] || 0);
      return {
        id: team.id,
        name: team.name,
        votes,
        pct: total > 0 ? Math.round((votes / total) * 100) : 0,
        color: team.color,
      };
    });
}

export function createZeroCounts(teams = []) {
  return teams.reduce((acc, team) => {
    acc[team.id] = 0;
    return acc;
  }, {});
}
