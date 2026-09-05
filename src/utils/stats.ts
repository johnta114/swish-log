import type {
  Game,
  Team,
  Player,
  Quarter,
  TeamStatsSummary,
  PlayerBoxScore,
  QuarterScores,
  StatEvent,
} from '../types';
import { ACTION_CONFIGS } from '../types';


export const QUARTER_LIST: Quarter[] = ['1Q', '2Q', '3Q', '4Q', 'OT'];

export function getNextQuarter(current: Quarter): Quarter | null {
  const index = QUARTER_LIST.indexOf(current);
  if (index === -1 || index === QUARTER_LIST.length - 1) {
    return null;
  }
  return QUARTER_LIST[index + 1];
}

export function formatPct(made: number, attempt: number): string {
  if (attempt === 0) return '-';
  const pct = (made / attempt) * 100;
  return `${pct.toFixed(1)}%`;
}

export function calculateGameStats(
  game: Game,
  homeTeam: Team,
  awayTeam: Team,
  players: Player[]
): {
  homeStats: TeamStatsSummary;
  awayStats: TeamStatsSummary;
} {
  const playerMap = new Map<string, Player>(players.map((p) => [p.id, p]));

  const calcTeam = (
    team: Team,
    rosterIds: string[]
  ): TeamStatsSummary => {
    const teamEvents = game.events.filter((e) => e.teamId === team.id);

    // クォーター別得点
    const quarterScores: QuarterScores = {
      '1Q': 0,
      '2Q': 0,
      '3Q': 0,
      '4Q': 0,
      OT: 0,
      total: 0,
    };

    let teamFoulsCurrentQuarter = 0;
    let teamFoulsTotal = 0;

    // 選手別集計マップ
    const playerBoxMap = new Map<string, PlayerBoxScore>();

    // ロスター選手を初期化
    rosterIds.forEach((pid) => {
      const p = playerMap.get(pid);
      playerBoxMap.set(pid, {
        playerId: pid,
        number: p?.number ?? 0,
        name: p?.name ?? '不明',
        teamId: team.id,
        points: 0,
        fg2m: 0,
        fg2a: 0,
        fg2pct: 0,
        fg3m: 0,
        fg3a: 0,
        fg3pct: 0,
        ftm: 0,
        fta: 0,
        ftpct: 0,
        foulOffense: 0,
        foulDefense: 0,
        foulTotal: 0,
      });
    });

    for (const ev of teamEvents) {
      // 得点加算
      quarterScores[ev.quarter] += ev.points;
      quarterScores.total += ev.points;

      // ファール加算
      const isFoul = ev.type === 'FOUL_OFFENSE' || ev.type === 'FOUL_DEFENSE';
      if (isFoul) {
        teamFoulsTotal += 1;
        if (ev.quarter === game.currentQuarter) {
          teamFoulsCurrentQuarter += 1;
        }
      }

      // 選手スタッツ加算
      let box = playerBoxMap.get(ev.playerId);
      if (!box) {
        const p = playerMap.get(ev.playerId);
        box = {
          playerId: ev.playerId,
          number: p?.number ?? 0,
          name: p?.name ?? '不明',
          teamId: team.id,
          points: 0,
          fg2m: 0,
          fg2a: 0,
          fg2pct: 0,
          fg3m: 0,
          fg3a: 0,
          fg3pct: 0,
          ftm: 0,
          fta: 0,
          ftpct: 0,
          foulOffense: 0,
          foulDefense: 0,
          foulTotal: 0,
        };
        playerBoxMap.set(ev.playerId, box);
      }

      box.points += ev.points;

      switch (ev.type) {
        case '2PT_MADE':
          box.fg2m += 1;
          box.fg2a += 1;
          break;
        case '2PT_MISS':
          box.fg2a += 1;
          break;
        case '3PT_MADE':
          box.fg3m += 1;
          box.fg3a += 1;
          break;
        case '3PT_MISS':
          box.fg3a += 1;
          break;
        case 'FT_MADE':
          box.ftm += 1;
          box.fta += 1;
          break;
        case 'FT_MISS':
          box.fta += 1;
          break;
        case 'FOUL_OFFENSE':
          box.foulOffense += 1;
          box.foulTotal += 1;
          break;
        case 'FOUL_DEFENSE':
          box.foulDefense += 1;
          box.foulTotal += 1;
          break;
      }
    }

    // 成功率計算とソート（背番号順）
    const playerBoxes = Array.from(playerBoxMap.values()).map((box) => ({
      ...box,
      fg2pct: box.fg2a > 0 ? (box.fg2m / box.fg2a) * 100 : 0,
      fg3pct: box.fg3a > 0 ? (box.fg3m / box.fg3a) * 100 : 0,
      ftpct: box.fta > 0 ? (box.ftm / box.fta) * 100 : 0,
    }));
    playerBoxes.sort((a, b) => a.number - b.number);

    // チームトータル計算
    const totals = playerBoxes.reduce(
      (acc, cur) => {
        acc.points += cur.points;
        acc.fg2m += cur.fg2m;
        acc.fg2a += cur.fg2a;
        acc.fg3m += cur.fg3m;
        acc.fg3a += cur.fg3a;
        acc.ftm += cur.ftm;
        acc.fta += cur.fta;
        acc.foulOffense += cur.foulOffense;
        acc.foulDefense += cur.foulDefense;
        acc.foulTotal += cur.foulTotal;
        return acc;
      },
      {
        points: 0,
        fg2m: 0,
        fg2a: 0,
        fg2pct: 0,
        fg3m: 0,
        fg3a: 0,
        fg3pct: 0,
        ftm: 0,
        fta: 0,
        ftpct: 0,
        foulOffense: 0,
        foulDefense: 0,
        foulTotal: 0,
      }
    );

    totals.fg2pct = totals.fg2a > 0 ? (totals.fg2m / totals.fg2a) * 100 : 0;
    totals.fg3pct = totals.fg3a > 0 ? (totals.fg3m / totals.fg3a) * 100 : 0;
    totals.ftpct = totals.fta > 0 ? (totals.ftm / totals.fta) * 100 : 0;

    return {
      team,
      score: quarterScores.total,
      quarterScores,
      teamFoulsCurrentQuarter,
      teamFoulsTotal,
      players: playerBoxes,
      totals,
    };
  };

  return {
    homeStats: calcTeam(homeTeam, game.homeRosterPlayerIds),
    awayStats: calcTeam(awayTeam, game.awayRosterPlayerIds),
  };
}

export function formatEventText(ev: StatEvent, player?: Player, team?: Team): string {
  const cfg = ACTION_CONFIGS[ev.type];
  const pName = player ? `#${player.number} ${player.name}` : '選手';
  const tName = team ? `[${team.shortName || team.name}]` : '';
  return `${ev.quarter} ${tName} ${pName}: ${cfg.label} (${ev.points > 0 ? `+${ev.points}点` : cfg.shortLabel})`;
}

export function generateStatsCSV(
  game: Game,
  homeTeam: Team,
  awayTeam: Team,
  players: Player[]
): string {
  const { homeStats, awayStats } = calculateGameStats(game, homeTeam, awayTeam, players);

  const lines: string[] = [];
  lines.push(`試合スタッツ: ${homeTeam.name} vs ${awayTeam.name}`);
  lines.push(`日程: ${game.date} 大会名: ${game.tournamentName || 'なし'} 形式: ${game.isU12 ? 'U12モード（3Pなし）' : '一般ルール'}`);
  lines.push('');

  // スコアボード
  lines.push('クォーター別得点');
  lines.push('チーム,1Q,2Q,3Q,4Q,OT,合計');
  lines.push(
    `${homeTeam.name},${homeStats.quarterScores['1Q']},${homeStats.quarterScores['2Q']},${homeStats.quarterScores['3Q']},${homeStats.quarterScores['4Q']},${homeStats.quarterScores['OT']},${homeStats.score}`
  );
  lines.push(
    `${awayTeam.name},${awayStats.quarterScores['1Q']},${awayStats.quarterScores['2Q']},${awayStats.quarterScores['3Q']},${awayStats.quarterScores['4Q']},${awayStats.quarterScores['OT']},${awayStats.score}`
  );
  lines.push('');

  const appendTeamBox = (stats: TeamStatsSummary) => {
    lines.push(`【${stats.team.name}】 選手別ボックススコア`);
    if (game.isU12) {
      lines.push('背番号,選手名,PTS,2PT 成功,2PT 試投,2PT 成功率,FT 成功,FT 試投,FT 成功率,OFファール,DFファール,ファール合計');
      stats.players.forEach((p) => {
        lines.push(
          `${p.number},"${p.name}",${p.points},${p.fg2m},${p.fg2a},${formatPct(p.fg2m, p.fg2a)},${p.ftm},${p.fta},${formatPct(p.ftm, p.fta)},${p.foulOffense},${p.foulDefense},${p.foulTotal}`
        );
      });
      lines.push(
        `合計,-,${stats.totals.points},${stats.totals.fg2m},${stats.totals.fg2a},${formatPct(stats.totals.fg2m, stats.totals.fg2a)},${stats.totals.ftm},${stats.totals.fta},${formatPct(stats.totals.ftm, stats.totals.fta)},${stats.totals.foulOffense},${stats.totals.foulDefense},${stats.totals.foulTotal}`
      );
    } else {
      lines.push('背番号,選手名,PTS,2PT 成功,2PT 試投,2PT 成功率,3PT 成功,3PT 試投,3PT 成功率,FT 成功,FT 試投,FT 成功率,OFファール,DFファール,ファール合計');
      stats.players.forEach((p) => {
        lines.push(
          `${p.number},"${p.name}",${p.points},${p.fg2m},${p.fg2a},${formatPct(p.fg2m, p.fg2a)},${p.fg3m},${p.fg3a},${formatPct(p.fg3m, p.fg3a)},${p.ftm},${p.fta},${formatPct(p.ftm, p.fta)},${p.foulOffense},${p.foulDefense},${p.foulTotal}`
        );
      });
      lines.push(
        `合計,-,${stats.totals.points},${stats.totals.fg2m},${stats.totals.fg2a},${formatPct(stats.totals.fg2m, stats.totals.fg2a)},${stats.totals.fg3m},${stats.totals.fg3a},${formatPct(stats.totals.fg3m, stats.totals.fg3a)},${stats.totals.ftm},${stats.totals.fta},${formatPct(stats.totals.ftm, stats.totals.fta)},${stats.totals.foulOffense},${stats.totals.foulDefense},${stats.totals.foulTotal}`
      );
    }
    lines.push('');
  };

  appendTeamBox(homeStats);
  appendTeamBox(awayStats);

  return lines.join('\n');
}
