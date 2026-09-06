import type { Team, Player, Game, StatEvent, PlayerCareerStats, PlayerGameLog, TeamCareerStats } from '../types';
import { calculateGameStats } from './stats';

/**
 * 特定選手の全試合通算スタッツを集計
 */
export function calculatePlayerCareerStats(
  player: Player,
  games: Game[],
  teams: Team[]
): PlayerCareerStats {
  const playerId = player.id;
  let gamesPlayed = 0;
  let points = 0;
  let fg2m = 0;
  let fg2a = 0;
  let fg3m = 0;
  let fg3a = 0;
  let ftm = 0;
  let fta = 0;
  let foulTotal = 0;

  const shotEvents: StatEvent[] = [];
  const gameLogs: PlayerGameLog[] = [];

  // 日付順にソート（新しい順）
  const sortedGames = [...games].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt;
  });

  for (const game of sortedGames) {
    const isHome = game.homeTeamId === player.teamId;
    const isAway = game.awayTeamId === player.teamId;

    // 選手が所属するチームが参加した試合か
    if (!isHome && !isAway) continue;

    const rosterIds = isHome ? game.homeRosterPlayerIds : game.awayRosterPlayerIds;
    // 該当試合のこの選手のイベント
    const playerEvents = game.events.filter((e) => e.playerId === playerId);

    // ロスター登録されているか、あるいは何かしらのアクションが記録されていれば出場とみなす
    const isParticipated = rosterIds.includes(playerId) || playerEvents.length > 0;
    if (!isParticipated) continue;

    gamesPlayed += 1;

    // 相手チーム情報
    const opponentTeamId = isHome ? game.awayTeamId : game.homeTeamId;
    const opponentTeam = teams.find((t) => t.id === opponentTeamId);

    // 当時の背番号・選手名（スナップショットがあれば優先、なければ現在のもの）
    const snapshot = game.rosterSnapshots?.[playerId];
    const playerNumberInGame = snapshot?.number ?? playerEvents[0]?.playerNumber ?? player.number;
    const playerNameInGame = snapshot?.name ?? playerEvents[0]?.playerName ?? player.name;

    let gamePts = 0;
    let g2m = 0;
    let g2a = 0;
    let g3m = 0;
    let g3a = 0;
    let gFtm = 0;
    let gFta = 0;
    let gFoul = 0;

    for (const ev of playerEvents) {
      if (ev.type === 'FT_MADE') {
        gamePts += 1;
        gFtm += 1;
        gFta += 1;
      } else if (ev.type === 'FT_MISS') {
        gFta += 1;
      } else if (ev.type === '2PT_MADE') {
        gamePts += 2;
        g2m += 1;
        g2a += 1;
        if (ev.location) shotEvents.push(ev);
      } else if (ev.type === '2PT_MISS') {
        g2a += 1;
        if (ev.location) shotEvents.push(ev);
      } else if (ev.type === '3PT_MADE') {
        gamePts += 3;
        g3m += 1;
        g3a += 1;
        if (ev.location) shotEvents.push(ev);
      } else if (ev.type === '3PT_MISS') {
        g3a += 1;
        if (ev.location) shotEvents.push(ev);
      } else if (ev.type === 'FOUL_OFFENSE' || ev.type === 'FOUL_DEFENSE') {
        gFoul += 1;
      }
    }

    // 累積加算
    points += gamePts;
    fg2m += g2m;
    fg2a += g2a;
    fg3m += g3m;
    fg3a += g3a;
    ftm += gFtm;
    fta += gFta;
    foulTotal += gFoul;

    gameLogs.push({
      gameId: game.id,
      date: game.date,
      tournamentName: game.tournamentName,
      opponentTeamName: opponentTeam?.name ?? '対戦相手',
      opponentTeamColor: opponentTeam?.color ?? '#64748b',
      playerNumberInGame,
      playerNameInGame,
      points: gamePts,
      fg2m: g2m,
      fg2a: g2a,
      fg3m: g3m,
      fg3a: g3a,
      ftm: gFtm,
      fta: gFta,
      foulTotal: gFoul,
    });
  }

  const pointsPerGame = gamesPlayed > 0 ? Math.round((points / gamesPlayed) * 10) / 10 : 0;
  const foulPerGame = gamesPlayed > 0 ? Math.round((foulTotal / gamesPlayed) * 10) / 10 : 0;
  const fg2pct = fg2a > 0 ? Math.round((fg2m / fg2a) * 1000) / 10 : 0;
  const fg3pct = fg3a > 0 ? Math.round((fg3m / fg3a) * 1000) / 10 : 0;
  const ftpct = fta > 0 ? Math.round((ftm / fta) * 1000) / 10 : 0;

  return {
    playerId,
    currentNumber: player.number,
    name: player.name,
    teamId: player.teamId,
    position: player.position,
    grade: player.grade,
    age: player.age,
    numberHistory: player.numberHistory,
    gamesPlayed,
    points,
    pointsPerGame,
    fg2m,
    fg2a,
    fg2pct,
    fg3m,
    fg3a,
    fg3pct,
    ftm,
    fta,
    ftpct,
    foulTotal,
    foulPerGame,
    shotEvents,
    gameLogs,
  };
}

/**
 * チーム全体の通算スタッツおよび所属全選手の通算スタッツを集計
 */
export function calculateTeamCareerStats(
  team: Team,
  games: Game[],
  allPlayers: Player[],
  allTeams: Team[]
): TeamCareerStats {
  const teamId = team.id;
  const teamPlayers = allPlayers.filter((p) => p.teamId === teamId);

  let totalGames = 0;
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let totalPoints = 0;
  let totalPointsAllowed = 0;

  for (const game of games) {
    const isHome = game.homeTeamId === teamId;
    const isAway = game.awayTeamId === teamId;
    if (!isHome && !isAway) continue;

    const homeTeam = allTeams.find((t) => t.id === game.homeTeamId);
    const awayTeam = allTeams.find((t) => t.id === game.awayTeamId);
    if (!homeTeam || !awayTeam) continue;

    const stats = calculateGameStats(game, homeTeam, awayTeam, allPlayers);
    const myScore = isHome ? stats.homeStats.score : stats.awayStats.score;
    const opponentScore = isHome ? stats.awayStats.score : stats.homeStats.score;

    totalGames += 1;
    totalPoints += myScore;
    totalPointsAllowed += opponentScore;

    if (myScore > opponentScore) {
      wins += 1;
    } else if (myScore < opponentScore) {
      losses += 1;
    } else {
      ties += 1;
    }
  }

  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 1000) / 10 : 0;
  const pointsPerGame = totalGames > 0 ? Math.round((totalPoints / totalGames) * 10) / 10 : 0;
  const pointsAllowedPerGame = totalGames > 0 ? Math.round((totalPointsAllowed / totalGames) * 10) / 10 : 0;

  // 所属選手の通算スタッツ
  const playerStats = teamPlayers
    .map((p) => calculatePlayerCareerStats(p, games, allTeams))
    .sort((a, b) => b.points - a.points || a.currentNumber - b.currentNumber);

  return {
    team,
    totalGames,
    wins,
    losses,
    ties,
    winRate,
    totalPoints,
    pointsPerGame,
    totalPointsAllowed,
    pointsAllowedPerGame,
    playerStats,
  };
}
