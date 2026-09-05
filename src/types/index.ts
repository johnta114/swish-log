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
}

export interface Player {
  id: string;
  teamId: string;
  number: number;
  name: string;
  position?: string;
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
  currentQuarter: Quarter;
  status: GameStatus;
  isU12?: boolean; // U12モード（ミニバス・3P不適用）
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
