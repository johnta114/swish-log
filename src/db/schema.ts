export const DB_NAME = 'swish_log_db';
export const DB_VERSION = 1;

export const CREATE_TABLES_SQL = `
-- チームテーブル
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ef4444',
  is_my_team INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 選手テーブル
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  grade TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

-- 背番号変更履歴テーブル
CREATE TABLE IF NOT EXISTS player_number_histories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  changed_at INTEGER NOT NULL,
  note TEXT,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pnh_player_id ON player_number_histories(player_id);

-- 試合テーブル
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  tournament_name TEXT,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  current_quarter TEXT NOT NULL DEFAULT '1Q',
  status TEXT NOT NULL DEFAULT 'scheduled',
  is_u12 INTEGER NOT NULL DEFAULT 0,
  venue TEXT,
  venue_lat REAL,
  venue_lng REAL,
  venue_url TEXT,
  video_url TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date DESC);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_teams ON games(home_team_id, away_team_id);

-- 試合ロスター＆出場管理テーブル
CREATE TABLE IF NOT EXISTS game_rosters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  roster_number INTEGER NOT NULL,
  roster_name TEXT NOT NULL,
  is_on_court INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(game_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_roster_game ON game_rosters(game_id);
CREATE INDEX IF NOT EXISTS idx_roster_player ON game_rosters(player_id);

-- スタッツイベントテーブル
CREATE TABLE IF NOT EXISTS stat_events (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  quarter TEXT NOT NULL,
  team_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_number INTEGER,
  player_name TEXT,
  type TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  location_x REAL,
  location_y REAL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_events_game ON stat_events(game_id);
CREATE INDEX IF NOT EXISTS idx_events_player ON stat_events(player_id);
CREATE INDEX IF NOT EXISTS idx_events_team ON stat_events(team_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON stat_events(type);

-- アプリ設定（キーバリュー）テーブル
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
