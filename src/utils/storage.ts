import type { Team, Player, Game } from '../types';

const STORAGE_KEYS = {
  TEAMS: 'courtstats_teams_v1',
  PLAYERS: 'courtstats_players_v1',
  GAMES: 'courtstats_games_v1',
  ACTIVE_GAME_ID: 'courtstats_active_game_id_v1',
};

// 初期サンプルデータ
export const INITIAL_TEAMS: Team[] = [
  {
    id: 'team_red',
    name: 'レッド・ファルコンズ',
    shortName: 'RF',
    color: '#ef4444', // 赤
    createdAt: Date.now() - 1000000,
  },
  {
    id: 'team_blue',
    name: 'ブルー・サンダース',
    shortName: 'BT',
    color: '#3b82f6', // 青
    createdAt: Date.now() - 900000,
  },
];

export const INITIAL_PLAYERS: Player[] = [
  // レッド・ファルコンズ (RF)
  { id: 'p_rf_4', teamId: 'team_red', number: 4, name: '赤井 翼 (C)', position: 'C', createdAt: 1 },
  { id: 'p_rf_7', teamId: 'team_red', number: 7, name: '佐藤 翔太', position: 'PG', createdAt: 2 },
  { id: 'p_rf_10', teamId: 'team_red', number: 10, name: '流川 楓斗', position: 'SF', createdAt: 3 },
  { id: 'p_rf_11', teamId: 'team_red', number: 11, name: '桜庭 蓮', position: 'PF', createdAt: 4 },
  { id: 'p_rf_14', teamId: 'team_red', number: 14, name: '三井 健司', position: 'SG', createdAt: 5 },
  { id: 'p_rf_15', teamId: 'team_red', number: 15, name: '木暮 勇気', position: 'SF', createdAt: 6 },
  { id: 'p_rf_23', teamId: 'team_red', number: 23, name: 'マイケル 高橋', position: 'SG', createdAt: 7 },

  // ブルー・サンダース (BT)
  { id: 'p_bt_4', teamId: 'team_blue', number: 4, name: '魚住 大樹 (C)', position: 'C', createdAt: 8 },
  { id: 'p_bt_7', teamId: 'team_blue', number: 7, name: '仙道 彰', position: 'PG', createdAt: 9 },
  { id: 'p_bt_8', teamId: 'team_blue', number: 8, name: '植草 智紀', position: 'PG', createdAt: 10 },
  { id: 'p_bt_9', teamId: 'team_blue', number: 9, name: '越野 宏明', position: 'SG', createdAt: 11 },
  { id: 'p_bt_13', teamId: 'team_blue', number: 13, name: '福田 吉兆', position: 'PF', createdAt: 12 },
  { id: 'p_bt_15', teamId: 'team_blue', number: 15, name: '菅平 誠', position: 'C', createdAt: 13 },
];

export const INITIAL_GAMES: Game[] = [
  {
    id: 'game_sample_1',
    date: new Date().toISOString().split('T')[0],
    tournamentName: '市民バスケットボール選手権 第1回戦',
    homeTeamId: 'team_red',
    awayTeamId: 'team_blue',
    homeRosterPlayerIds: ['p_rf_4', 'p_rf_7', 'p_rf_10', 'p_rf_11', 'p_rf_14', 'p_rf_15', 'p_rf_23'],
    awayRosterPlayerIds: ['p_bt_4', 'p_bt_7', 'p_bt_8', 'p_bt_9', 'p_bt_13', 'p_bt_15'],
    homeOnCourtPlayerIds: ['p_rf_4', 'p_rf_7', 'p_rf_10', 'p_rf_11', 'p_rf_14'],
    awayOnCourtPlayerIds: ['p_bt_4', 'p_bt_7', 'p_bt_8', 'p_bt_9', 'p_bt_13'],
    currentQuarter: '2Q',
    status: 'in_progress',
    createdAt: Date.now() - 3600000,
    events: [
      { id: 'ev_1', gameId: 'game_sample_1', timestamp: Date.now() - 3000000, quarter: '1Q', teamId: 'team_red', playerId: 'p_rf_14', type: '3PT_MADE', points: 3 },
      { id: 'ev_2', gameId: 'game_sample_1', timestamp: Date.now() - 2900000, quarter: '1Q', teamId: 'team_blue', playerId: 'p_bt_7', type: '2PT_MADE', points: 2 },
      { id: 'ev_3', gameId: 'game_sample_1', timestamp: Date.now() - 2800000, quarter: '1Q', teamId: 'team_red', playerId: 'p_rf_10', type: '2PT_MADE', points: 2 },
      { id: 'ev_4', gameId: 'game_sample_1', timestamp: Date.now() - 2700000, quarter: '1Q', teamId: 'team_blue', playerId: 'p_bt_13', type: '2PT_MISS', points: 0 },
      { id: 'ev_5', gameId: 'game_sample_1', timestamp: Date.now() - 2600000, quarter: '1Q', teamId: 'team_blue', playerId: 'p_bt_4', type: 'FOUL_DEFENSE', points: 0 },
      { id: 'ev_6', gameId: 'game_sample_1', timestamp: Date.now() - 2500000, quarter: '1Q', teamId: 'team_red', playerId: 'p_rf_4', type: 'FT_MADE', points: 1 },
      { id: 'ev_7', gameId: 'game_sample_1', timestamp: Date.now() - 2400000, quarter: '1Q', teamId: 'team_red', playerId: 'p_rf_4', type: 'FT_MADE', points: 1 },
      { id: 'ev_8', gameId: 'game_sample_1', timestamp: Date.now() - 2300000, quarter: '1Q', teamId: 'team_blue', playerId: 'p_bt_7', type: '3PT_MADE', points: 3 },
      { id: 'ev_9', gameId: 'game_sample_1', timestamp: Date.now() - 1500000, quarter: '2Q', teamId: 'team_red', playerId: 'p_rf_7', type: '2PT_MADE', points: 2 },
      { id: 'ev_10', gameId: 'game_sample_1', timestamp: Date.now() - 1400000, quarter: '2Q', teamId: 'team_blue', playerId: 'p_bt_13', type: '2PT_MADE', points: 2 },
      { id: 'ev_11', gameId: 'game_sample_1', timestamp: Date.now() - 1300000, quarter: '2Q', teamId: 'team_red', playerId: 'p_rf_11', type: 'FOUL_OFFENSE', points: 0 },
    ],
  },
];

export const storage = {
  getTeams(): Team[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TEAMS);
    if (!raw) {
      this.saveTeams(INITIAL_TEAMS);
      return INITIAL_TEAMS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TEAMS;
    }
  },

  saveTeams(teams: Team[]): void {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
  },

  getPlayers(): Player[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYERS);
    if (!raw) {
      this.savePlayers(INITIAL_PLAYERS);
      return INITIAL_PLAYERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PLAYERS;
    }
  },

  savePlayers(players: Player[]): void {
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
  },

  getGames(): Game[] {
    const raw = localStorage.getItem(STORAGE_KEYS.GAMES);
    if (!raw) {
      this.saveGames(INITIAL_GAMES);
      return INITIAL_GAMES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_GAMES;
    }
  },

  saveGames(games: Game[]): void {
    localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
  },

  getActiveGameId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_ID);
  },

  setActiveGameId(gameId: string | null): void {
    if (gameId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME_ID, gameId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_ID);
    }
  },

  resetAllData(): void {
    this.saveTeams(INITIAL_TEAMS);
    this.savePlayers(INITIAL_PLAYERS);
    this.saveGames(INITIAL_GAMES);
    this.setActiveGameId(null);
  },
};
