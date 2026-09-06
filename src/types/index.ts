export type Quarter = '1Q' | '2Q' | '3Q' | '4Q' | 'OT';

export type ActionType =
  | 'FT_MADE'
  | 'FT_MISS'
  | '2PT_MADE'
  | '2PT_MISS'
  | '3PT_MADE'
  | '3PT_MISS'
  | 'FOUL_OFFENSE'
  | 'FOUL_DEFENSE';

export interface ActionConfig {
  type: ActionType;
  label: string;
  shortLabel: string;
  points: number;
  isFoul: boolean;
  isMade: boolean;
  category: 'FT' | '2PT' | '3PT' | 'FOUL';
}

export const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  FT_MADE: {
    type: 'FT_MADE',
    label: 'FT 成功',
    shortLabel: '+1 FT',
    points: 1,
    isFoul: false,
    isMade: true,
    category: 'FT',
  },
  FT_MISS: {
    type: 'FT_MISS',
    label: 'FT 失敗',
    shortLabel: 'FT 失敗',
    points: 0,
    isFoul: false,
    isMade: false,
    category: 'FT',
  },
  '2PT_MADE': {
    type: '2PT_MADE',
    label: '2PT 成功',
    shortLabel: '+2 ミドル',
    points: 2,
    isFoul: false,
    isMade: true,
    category: '2PT',
  },
  '2PT_MISS': {
    type: '2PT_MISS',
    label: '2PT 失敗',
    shortLabel: '2PT 失敗',
    points: 0,
    isFoul: false,
    isMade: false,
    category: '2PT',
  },
  '3PT_MADE': {
    type: '3PT_MADE',
    label: '3PT 成功',
    shortLabel: '+3 3ポイント',
    points: 3,
    isFoul: false,
    isMade: true,
    category: '3PT',
  },
  '3PT_MISS': {
    type: '3PT_MISS',
    label: '3PT 失敗',
    shortLabel: '3PT 失敗',
    points: 0,
    isFoul: false,
    isMade: false,
    category: '3PT',
  },
  FOUL_OFFENSE: {
    type: 'FOUL_OFFENSE',
    label: 'オフェンスファール',
    shortLabel: 'OFファール',
    points: 0,
    isFoul: true,
    isMade: false,
    category: 'FOUL',
  },
  FOUL_DEFENSE: {
    type: 'FOUL_DEFENSE',
    label: 'ディフェンスファール',
    shortLabel: 'DFファール',
    points: 0,
    isFoul: true,
    isMade: false,
    category: 'FOUL',
  },
};

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  createdAt: number;
  isMyTeam?: boolean;
  seasonYear?: number; // 年度（例: 2026）
}

export interface PlayerNumberHistory {
  number: number;
  changedAt: number;
  note?: string;
}

export interface Player {
  id: string;
  teamId: string;
  number: number;
  name: string;
  position?: string;
  grade?: string;
  numberHistory?: PlayerNumberHistory[];
  createdAt: number;
}

export type GameStatus = 'scheduled' | 'in_progress' | 'finished';

export interface ShotLocation {
  x: number; // 0 ~ 100% (コート横幅)
  y: number; // 0 ~ 100% (ゴール側0% ~ ハーフライン100%)
}

export interface StatEvent {
  id: string;
  gameId: string;
  timestamp: number;
  quarter: Quarter;
  teamId: string;
  playerId: string;
  playerNumber?: number; // イベント記録当時の背番号
  playerName?: string; // イベント記録当時の選手名
  type: ActionType;
  points: number;
  location?: ShotLocation;
}

export interface Game {
  id: string;
  date: string;
  tournamentName?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeRosterPlayerIds: string[];
  awayRosterPlayerIds: string[];
  homeOnCourtPlayerIds?: string[];
  awayOnCourtPlayerIds?: string[];
  rosterSnapshots?: Record<string, { number: number; name: string }>; // 試合当時の選手背番号・名前
  currentQuarter: Quarter;
  status: GameStatus;
  isU12?: boolean; // U12モード（ミニバス・3P不適用）
  venue?: string; // 試合会場（体育館・アリーナ名）
  venueLocation?: { lat: number; lng: number }; // 会場の位置情報（緯度・経度）
  venueUrl?: string; // マップアプリ（Google Maps / Apple Maps等）の共有URL
  videoUrl?: string; // 試合動画（YouTube）の共有URL
  events: StatEvent[];
  createdAt: number;
}

// 選手スタッツ集計結果
export interface PlayerBoxScore {
  playerId: string;
  number: number;
  name: string;
  teamId: string;
  points: number;
  // 2PT
  fg2m: number;
  fg2a: number;
  fg2pct: number;
  // 3PT
  fg3m: number;
  fg3a: number;
  fg3pct: number;
  // FT
  ftm: number;
  fta: number;
  ftpct: number;
  // Foul
  foulOffense: number;
  foulDefense: number;
  foulTotal: number;
}

// クォーター別得点集計
export interface QuarterScores {
  '1Q': number;
  '2Q': number;
  '3Q': number;
  '4Q': number;
  OT: number;
  total: number;
}

// チームスタッツ集計結果
export interface TeamStatsSummary {
  team: Team;
  score: number;
  quarterScores: QuarterScores;
  teamFoulsCurrentQuarter: number;
  teamFoulsTotal: number;
  players: PlayerBoxScore[];
  // チーム合計シュートスタッツ
  totals: {
    points: number;
    fg2m: number;
    fg2a: number;
    fg2pct: number;
    fg3m: number;
    fg3a: number;
    fg3pct: number;
    ftm: number;
    fta: number;
    ftpct: number;
    foulOffense: number;
    foulDefense: number;
    foulTotal: number;
  };
}

// 選手通算（全試合）スタッツ
export interface PlayerGameLog {
  gameId: string;
  date: string;
  tournamentName?: string;
  opponentTeamName: string;
  opponentTeamColor: string;
  playerNumberInGame: number;
  playerNameInGame: string;
  points: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  foulTotal: number;
}

export interface PlayerCareerStats {
  playerId: string;
  currentNumber: number;
  name: string;
  teamId: string;
  position?: string;
  grade?: string;
  numberHistory?: PlayerNumberHistory[];
  gamesPlayed: number;
  points: number;
  pointsPerGame: number;
  fg2m: number;
  fg2a: number;
  fg2pct: number;
  fg3m: number;
  fg3a: number;
  fg3pct: number;
  ftm: number;
  fta: number;
  ftpct: number;
  foulTotal: number;
  foulPerGame: number;
  shotEvents: StatEvent[]; // 全試合のシュートイベント（通算シュートチャート用）
  gameLogs: PlayerGameLog[]; // 試合別ログ履歴
}

export interface TeamCareerStats {
  team: Team;
  totalGames: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  totalPoints: number;
  pointsPerGame: number;
  totalPointsAllowed: number;
  pointsAllowedPerGame: number;
  playerStats: PlayerCareerStats[];
}

// 試合単位の共有データパッケージ
export interface SingleGameSharePackage {
  version: '1.0';
  exportedAt: number;
  appName: 'swish-log';
  game: Game;
  teams: Team[]; // その試合のホーム・アウェイチーム情報
  players: Player[]; // その試合のベンチ入り・出場選手情報
}

// インポート前のプレビュー情報
export interface GameImportPreview {
  isValid: boolean;
  errorMessage?: string;
  packageData?: SingleGameSharePackage;
  gameTitle: string; // 例: "レッド・ファルコンズ vs ブルー・サンダース"
  gameDate: string;
  tournamentName?: string;
  score: {
    home: number;
    away: number;
  };
  totalEventsCount: number;
  totalShotsCount: number;
  isDuplicate: boolean; // 既存試合とIDが一致するか
  duplicateGameName?: string;
}

