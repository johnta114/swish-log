import { teamRepository } from './repositories/teamRepository';
import { playerRepository } from './repositories/playerRepository';
import { gameRepository } from './repositories/gameRepository';
import { settingsRepository } from './repositories/settingsRepository';
import { INITIAL_TEAMS, INITIAL_PLAYERS } from '../utils/storage';
import type { Team, Player, Game } from '../types';

const MIGRATION_DONE_KEY = 'sqlite_migration_completed_v1';

export async function checkAndMigrateData(): Promise<void> {
  try {
    // すでにSQLite側で移行済みかチェック
    const isMigrated = await settingsRepository.get(MIGRATION_DONE_KEY, '');
    const currentTeams = await teamRepository.getAll();

    if (isMigrated === 'true' && currentTeams.length > 0) {
      console.log('✅ SQLite database is up to date.');
      return;
    }

    console.log('🔄 Checking localStorage data for SQLite migration...');

    // 1. localStorage から既存データを取得
    let lsTeams: Team[] = [];
    let lsPlayers: Player[] = [];
    let lsGames: Game[] = [];
    let lsMyTeamId = '';
    let lsVenueHistory: string[] = [];

    try {
      const rawTeams = localStorage.getItem('courtstats_teams_v1');
      if (rawTeams) lsTeams = JSON.parse(rawTeams);

      const rawPlayers = localStorage.getItem('courtstats_players_v1');
      if (rawPlayers) lsPlayers = JSON.parse(rawPlayers);

      const rawGames = localStorage.getItem('courtstats_games_v1');
      if (rawGames) lsGames = JSON.parse(rawGames);

      const rawMyTeam = localStorage.getItem('courtstats_my_team_id_v1');
      if (rawMyTeam) {
        try {
          lsMyTeamId = JSON.parse(rawMyTeam);
        } catch {
          lsMyTeamId = rawMyTeam;
        }
      }

      const rawVenues = localStorage.getItem('courtstats_venue_history_v1');
      if (rawVenues) lsVenueHistory = JSON.parse(rawVenues);
    } catch (e) {
      console.warn('⚠️ Error parsing localStorage data:', e);
    }

    // 2. 既存データがない場合は初期サンプルデータを使用
    const finalTeams = lsTeams.length > 0 ? lsTeams : INITIAL_TEAMS;
    const finalPlayers = lsPlayers.length > 0 ? lsPlayers : INITIAL_PLAYERS;
    const finalGames = lsGames;
    const finalMyTeamId = lsMyTeamId || 'team_red';

    console.log(`📦 Migrating ${finalTeams.length} teams, ${finalPlayers.length} players, ${finalGames.length} games to SQLite...`);

    // 3. SQLiteへ一括保存（移行中は一時的に外部キー制約をオフにして安全に投入）
    await teamRepository.saveAll(finalTeams);
    await playerRepository.saveAll(finalPlayers);
    await gameRepository.saveAll(finalGames);
    await teamRepository.setMyTeam(finalMyTeamId);

    if (finalMyTeamId) {
      await settingsRepository.set('my_team_id', finalMyTeamId);
    }
    if (lsVenueHistory.length > 0) {
      await settingsRepository.setJson('venue_history', lsVenueHistory);
    }

    // 4. 移行完了フラグを設定
    await settingsRepository.set(MIGRATION_DONE_KEY, 'true');
    console.log('🎉 SQLite migration completed successfully!');
  } catch (error) {
    console.error('❌ Data migration to SQLite failed:', error);
    // エラーが起きてもアプリをクラッシュさせず続行
  }
}
