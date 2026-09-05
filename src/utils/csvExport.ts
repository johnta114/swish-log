import type { Game, Team, Player, TeamCareerStats } from '../types';
import { calculateGameStats, formatPct } from './stats';

/**
 * UTF-8 BOM付きテキストファイル（CSVやJSON）を端末にダウンロード、またはWeb Share API（AirDrop/LINEなど）で共有する
 */
export async function shareOrDownloadFile(
  filename: string,
  content: string,
  mimeType: string,
  title?: string
): Promise<void> {
  const blob = new Blob([content], { type: mimeType });

  // モバイル端末で Web Share API (Files) が利用可能な場合はAirDropやLINEで共有
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title || filename,
          text: `swish log から出力されたデータ: ${filename}`,
        });
        return;
      }
    } catch (err: any) {
      // ユーザーが共有シートをキャンセルした場合は何もしない
      if (err.name === 'AbortError') return;
      console.warn('Web Share API failed, falling back to download', err);
    }
  }

  // フォールバック: aタグによるブラウザダウンロード
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 試合のボックススコアをCSV形式でエクスポート
 */
export async function exportGameBoxScoreCSV(
  game: Game,
  homeTeam: Team,
  awayTeam: Team,
  players: Player[]
): Promise<void> {
  const BOM = '\uFEFF';
  const lines: string[] = [];
  const { homeStats, awayStats } = calculateGameStats(game, homeTeam, awayTeam, players);

  // 試合メタ情報
  lines.push(`試合対戦日,${game.date}`);
  if (game.tournamentName) lines.push(`大会・マッチ名,${escapeCSV(game.tournamentName)}`);
  lines.push(`対戦カード,${escapeCSV(homeTeam.name)} vs ${escapeCSV(awayTeam.name)}`);
  lines.push(`最終スコア,${homeStats.score} - ${awayStats.score}`);
  lines.push(`クォーター別得点,1Q,2Q,3Q,4Q,OT,合計`);
  lines.push(
    `${escapeCSV(homeTeam.name)},${homeStats.quarterScores['1Q']},${homeStats.quarterScores['2Q']},${homeStats.quarterScores['3Q']},${homeStats.quarterScores['4Q']},${homeStats.quarterScores['OT']},${homeStats.score}`
  );
  lines.push(
    `${escapeCSV(awayTeam.name)},${awayStats.quarterScores['1Q']},${awayStats.quarterScores['2Q']},${awayStats.quarterScores['3Q']},${awayStats.quarterScores['4Q']},${awayStats.quarterScores['OT']},${awayStats.score}`
  );
  lines.push('');

  // 各チームの選手別スタッツを出力するヘルパー
  const appendTeamStats = (teamName: string, playerList: typeof homeStats.players) => {
    lines.push(`■ ${escapeCSV(teamName)} ボックススコア`);
    lines.push(
      '背番号,選手名,得点(PTS),2P成功(2PM),2P試投(2PA),2P成功率(%),3P成功(3PM),3P試投(3PA),3P成功率(%),FT成功(FTM),FT試投(FTA),FT成功率(%),OFファール,DFファール,合計ファール'
    );

    playerList.forEach((p) => {
      lines.push(
        `#${p.number},${escapeCSV(p.name)},${p.points},${p.fg2m},${p.fg2a},${formatPct(p.fg2m, p.fg2a)},${p.fg3m},${p.fg3a},${formatPct(p.fg3m, p.fg3a)},${p.ftm},${p.fta},${formatPct(p.ftm, p.fta)},${p.foulOffense},${p.foulDefense},${p.foulTotal}`
      );
    });
    lines.push('');
  };

  appendTeamStats(homeTeam.name, homeStats.players);
  appendTeamStats(awayTeam.name, awayStats.players);

  const csvContent = BOM + lines.join('\r\n');
  const filename = `boxscore_${game.date}_${homeTeam.shortName}vs${awayTeam.shortName}.csv`;
  await shareOrDownloadFile(filename, csvContent, 'text/csv;charset=utf-8', `${homeTeam.name} vs ${awayTeam.name} ボックススコア`);
}

/**
 * 試合の全イベント（シュート位置座標含む）をCSV形式でエクスポート
 */
export async function exportGamePlayLogCSV(
  game: Game,
  homeTeam: Team,
  awayTeam: Team,
  players: Player[]
): Promise<void> {
  const BOM = '\uFEFF';
  const lines: string[] = [];

  lines.push(`試合対戦日,${game.date}`);
  lines.push(`対戦カード,${escapeCSV(homeTeam.name)} vs ${escapeCSV(awayTeam.name)}`);
  lines.push('No,時間,クォーター,チーム,背番号,選手名,アクション,得点,シュート位置X(%),シュート位置Y(%)');

  game.events.forEach((ev, idx) => {
    const timeStr = new Date(ev.timestamp).toLocaleTimeString();
    const team = ev.teamId === homeTeam.id ? homeTeam : awayTeam;
    const snap = game.rosterSnapshots?.[ev.playerId];
    const playerObj = players.find((p) => p.id === ev.playerId);
    const num = ev.playerNumber ?? snap?.number ?? playerObj?.number ?? 0;
    const name = ev.playerName ?? snap?.name ?? playerObj?.name ?? '不明';

    let actionLabel: string = ev.type;
    if (ev.type === '2PT_MADE') actionLabel = '2P成功 (+2)';
    else if (ev.type === '2PT_MISS') actionLabel = '2P失敗';
    else if (ev.type === '3PT_MADE') actionLabel = '3P成功 (+3)';
    else if (ev.type === '3PT_MISS') actionLabel = '3P失敗';
    else if (ev.type === 'FT_MADE') actionLabel = 'FT成功 (+1)';
    else if (ev.type === 'FT_MISS') actionLabel = 'FT失敗';
    else if (ev.type === 'FOUL_DEFENSE') actionLabel = 'ディフェンスファール';
    else if (ev.type === 'FOUL_OFFENSE') actionLabel = 'オフェンスファール';

    const posX = ev.location ? ev.location.x.toFixed(1) : '';
    const posY = ev.location ? ev.location.y.toFixed(1) : '';

    lines.push(
      `${idx + 1},${timeStr},${ev.quarter},${escapeCSV(team.name)},#${num},${escapeCSV(name)},${escapeCSV(actionLabel)},${ev.points},${posX},${posY}`
    );
  });

  const csvContent = BOM + lines.join('\r\n');
  const filename = `playlog_${game.date}_${homeTeam.shortName}vs${awayTeam.shortName}.csv`;
  await shareOrDownloadFile(filename, csvContent, 'text/csv;charset=utf-8', `${homeTeam.name} vs ${awayTeam.name} プレイログ`);
}

/**
 * チーム通算スタッツをCSV形式でエクスポート
 */
export async function exportTeamCareerStatsCSV(stats: TeamCareerStats): Promise<void> {
  const BOM = '\uFEFF';
  const lines: string[] = [];

  lines.push(`チーム通算スタッツ,${escapeCSV(stats.team.name)} (${stats.team.shortName})`);
  lines.push(`通算戦績,${stats.wins}勝 ${stats.losses}敗 ${stats.ties}分 (勝率: ${stats.winRate}%)`);
  lines.push(`総得点,${stats.totalPoints} 点 (平均: ${stats.pointsPerGame} 点)`);
  lines.push(`総失点,${stats.totalPointsAllowed} 点 (平均: ${stats.pointsAllowedPerGame} 点)`);
  lines.push('');

  lines.push(
    '順位,背番号,選手名,ポジション,学年,試合数(GP),総得点(PTS),平均得点(PPG),2P成功,2P試投,2P成功率(%),3P成功,3P試投,3P成功率(%),FT成功,FT試投,FT成功率(%),ファール数,平均ファール'
  );

  stats.playerStats.forEach((p, idx) => {
    lines.push(
      `${idx + 1},#${p.currentNumber},${escapeCSV(p.name)},${p.position || '-'},${p.grade || '-'},${p.gamesPlayed},${p.points},${p.pointsPerGame},${p.fg2m},${p.fg2a},${p.fg2pct}%,${p.fg3m},${p.fg3a},${p.fg3pct}%,${p.ftm},${p.fta},${p.ftpct}%,${p.foulTotal},${p.foulPerGame}`
    );
  });

  const csvContent = BOM + lines.join('\r\n');
  const filename = `career_stats_${stats.team.shortName}.csv`;
  await shareOrDownloadFile(filename, csvContent, 'text/csv;charset=utf-8', `${stats.team.name} 通算スタッツ`);
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
