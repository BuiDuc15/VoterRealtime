export function calcResults(teams, voteCounts = {}) {
  const total = Object.values(voteCounts).reduce((acc, value) => acc + value, 0);

  return teams.map((team) => ({
    ...team,
    votes: voteCounts[team.id] || 0,
    pct: total > 0 ? Math.round(((voteCounts[team.id] || 0) / total) * 100) : 0,
  }));
}

export function getWinners(results) {
  if (!results.length) return [];
  const max = Math.max(...results.map((result) => result.votes));
  if (max === 0) return [];
  return results.filter((result) => result.votes === max);
}

export function createZeroCounts(teams = []) {
  return teams.reduce((acc, team) => {
    acc[team.id] = 0;
    return acc;
  }, {});
}

export function sumVoteCounts(rounds = [], teams = []) {
  const teamIds = new Set(teams.map((team) => team.id));

  return rounds.reduce((acc, round) => {
    const counts = round.vote_counts || {};
    Object.entries(counts).forEach(([teamId, votes]) => {
      if (!teamIds.size || teamIds.has(teamId)) {
        acc[teamId] = (acc[teamId] || 0) + (Number(votes) || 0);
      }
    });
    return acc;
  }, createZeroCounts(teams));
}

export function buildChartData(teams = [], voteCounts = {}) {
  const total = Object.values(voteCounts).reduce((acc, value) => acc + value, 0);

  return teams.map((team) => {
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

