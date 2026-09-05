import type { Game, Team, Player, SingleGameSharePackage, GameImportPreview } from '../types';
import { shareOrDownloadFile } from './csvExport';

/**
 * 1試合の全スタッツ（シュート位置座標含む）および関連チーム・選手情報を
 * 単独のJSON共有パッケージとしてエクスポート（AirDrop / LINE / ファイル保存）
 */
export async function exportSingleGameFile(
  game: Game,
  homeTeam: Team,
  awayTeam: Team,
  allPlayers: Player[]
): Promise<void> {
  // その試合のベンチ入り選手のみを抽出
  const relatedPlayerIds = new Set([
    ...game.homeRosterPlayerIds,
    ...game.awayRosterPlayerIds,
    ...game.events.map((e) => e.playerId),
  ]);

  const relatedPlayers = allPlayers.filter((p) => relatedPlayerIds.has(p.id));

  const pkg: SingleGameSharePackage = {
    version: '1.0',
    exportedAt: Date.now(),
    appName: 'swish-log',
    game,
    teams: [homeTeam, awayTeam],
    players: relatedPlayers,
  };

  const jsonString = JSON.stringify(pkg, null, 2);
  const safeHome = homeTeam.shortName.replace(/[^a-zA-Z0-9_\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g, '');
  const safeAway = awayTeam.shortName.replace(/[^a-zA-Z0-9_\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g, '');
  const filename = `game_${game.date}_${safeHome}_vs_${safeAway}.json`;

  await shareOrDownloadFile(
    filename,
    jsonString,
    'application/json',
    `【swish log】${homeTeam.name} vs ${awayTeam.name} (${game.date}) 試合データ`
  );
}

/**
 * 読み込んだファイル（JSON文字列）を検証・解析し、インポート前のプレビュー情報を生成
 */
export function inspectGamePackage(
  jsonString: string,
  existingGames: Game[],
  existingTeams: Team[]
): GameImportPreview {
  try {
    const data = JSON.parse(jsonString);

    // 基本構造のバリデーション
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errorMessage: '無効なファイル形式です（JSONデータではありません）。',
        gameTitle: '',
        gameDate: '',
        score: { home: 0, away: 0 },
        totalEventsCount: 0,
        totalShotsCount: 0,
        isDuplicate: false,
      };
    }

    // swish-log の SingleGameSharePackage かどうか判定
    const game = data.game as Game | undefined;
    const teams = data.teams as Team[] | undefined;

    if (!game || !game.id || !game.date || !game.homeTeamId || !game.awayTeamId || !Array.isArray(game.events)) {
      return {
        isValid: false,
        errorMessage: 'swish log の試合データ形式と一致しません。',
        gameTitle: '',
        gameDate: '',
        score: { home: 0, away: 0 },
        totalEventsCount: 0,
        totalShotsCount: 0,
        isDuplicate: false,
      };
    }

    // チーム名の取得
    const homeTeam = teams?.find((t) => t.id === game.homeTeamId) ||
      existingTeams.find((t) => t.id === game.homeTeamId);
    const awayTeam = teams?.find((t) => t.id === game.awayTeamId) ||
      existingTeams.find((t) => t.id === game.awayTeamId);

    const homeName = homeTeam?.name || 'ホームチーム';
    const awayName = awayTeam?.name || 'アウェイチーム';
    const gameTitle = `${homeName} vs ${awayName}`;

    // スコア計算
    const homeScore = game.events
      .filter((e) => e.teamId === game.homeTeamId)
      .reduce((sum, e) => sum + (e.points || 0), 0);
    const awayScore = game.events
      .filter((e) => e.teamId === game.awayTeamId)
      .reduce((sum, e) => sum + (e.points || 0), 0);

    // 重複チェック
    const duplicateGame = existingGames.find((g) => g.id === game.id);
    const isDuplicate = !!duplicateGame;
    let duplicateGameName = undefined;
    if (duplicateGame) {
      duplicateGameName = `${gameTitle} (${duplicateGame.date})`;
    }

    // シュート数・位置情報付きシュート数の集計
    const shotsCount = game.events.filter((e) =>
      ['2PT_MADE', '2PT_MISS', '3PT_MADE', '3PT_MISS'].includes(e.type)
    ).length;

    return {
      isValid: true,
      packageData: data as SingleGameSharePackage,
      gameTitle,
      gameDate: game.date,
      tournamentName: game.tournamentName,
      score: {
        home: homeScore,
        away: awayScore,
      },
      totalEventsCount: game.events.length,
      totalShotsCount: shotsCount,
      isDuplicate,
      duplicateGameName,
    };
  } catch (err: any) {
    return {
      isValid: false,
      errorMessage: `ファイルの解析に失敗しました: ${err.message}`,
      gameTitle: '',
      gameDate: '',
      score: { home: 0, away: 0 },
      totalEventsCount: 0,
      totalShotsCount: 0,
      isDuplicate: false,
    };
  }
}

/**
 * 共有パッケージのデータを既存データに安全に統合（マージ）する
 * - 既存のマイチーム設定は一切変更しない
 * - 既存のチーム・選手データは破壊せず、必要に応じて不足分を追加
 */
export function executeGameImport(
  pkg: SingleGameSharePackage,
  existingGames: Game[],
  existingTeams: Team[],
  existingPlayers: Player[],
  mode: 'add_new' | 'overwrite' = 'add_new'
): {
  updatedGames: Game[];
  updatedTeams: Team[];
  updatedPlayers: Player[];
  importedGameId: string;
} {
  let gameToImport = { ...pkg.game };
  let newGameId = gameToImport.id;

  // 1. チームのマージ
  // 既存チームと同名・同IDがあればそれを尊重し、無ければ追加（isMyTeamは相手のファイルの設定を無視してfalseにする）
  const updatedTeams = [...existingTeams];
  const teamIdMap: Record<string, string> = {}; // 旧ID -> 新ID（もし必要なら）

  (pkg.teams || []).forEach((pkgTeam) => {
    const existingById = updatedTeams.find((t) => t.id === pkgTeam.id);
    if (existingById) {
      teamIdMap[pkgTeam.id] = existingById.id;
    } else {
      // 既存チーム一覧に追加（マイチームフラグは勝手に立てない）
      const newT: Team = {
        ...pkgTeam,
        isMyTeam: false,
      };
      updatedTeams.push(newT);
      teamIdMap[pkgTeam.id] = newT.id;
    }
  });

  // 2. 選手のマージ
  // 既存選手と同IDがあれば尊重、無ければ追加
  const updatedPlayers = [...existingPlayers];
  const playerIdMap: Record<string, string> = {};

  (pkg.players || []).forEach((pkgPlayer) => {
    const existingP = updatedPlayers.find((p) => p.id === pkgPlayer.id);
    if (existingP) {
      playerIdMap[pkgPlayer.id] = existingP.id;
    } else {
      // 新規選手として追加
      const newP: Player = {
        ...pkgPlayer,
        teamId: teamIdMap[pkgPlayer.teamId] || pkgPlayer.teamId,
      };
      updatedPlayers.push(newP);
      playerIdMap[pkgPlayer.id] = newP.id;
    }
  });

  // 3. 試合IDの重複ハンドリング
  const isDuplicate = existingGames.some((g) => g.id === gameToImport.id);
  let updatedGames = [...existingGames];

  if (isDuplicate) {
    if (mode === 'overwrite') {
      // 既存試合を上書き置換
      updatedGames = updatedGames.map((g) => (g.id === gameToImport.id ? gameToImport : g));
    } else {
      // 別試合として新規追加（新しいIDを発行し、イベントのgameIdも更新）
      newGameId = `game_imported_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      gameToImport = {
        ...gameToImport,
        id: newGameId,
        events: gameToImport.events.map((e) => ({
          ...e,
          id: `ev_imported_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          gameId: newGameId,
        })),
      };
      updatedGames.push(gameToImport);
    }
  } else {
    // 重複なし → 新規追加
    updatedGames.push(gameToImport);
  }

  return {
    updatedGames,
    updatedTeams,
    updatedPlayers,
    importedGameId: newGameId,
  };
}
