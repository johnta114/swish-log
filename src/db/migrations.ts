import type { SQLiteService } from './sqliteService';

export interface Migration {
  version: number;
  name: string;
  up: (service: SQLiteService) => Promise<void>;
}

/**
 * マイグレーション一覧
 * 
 * 【重要ルール】
 * - 過去のマイグレーションは絶対に編集・削除しないこと（すでにユーザー端末で実行されているため）
 * - 新しいカラムやテーブルを追加する場合は、新しいバージョン（例: v2, v3...）を追加すること
 * - カラム追加時は NULL 許容、または DEFAULT 値を必ず設定すること
 * - DROP TABLE や DROP COLUMN などの破壊的変更は行わないこと
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema_v1',
    up: async (_service: SQLiteService) => {
      // v1 のテーブル群は schema.ts の CREATE_TABLES_SQL で初期作成済み
      // ここでは v1 のマーカーとして記録
    },
  },
  {
    version: 2,
    name: 'add_team_season_year',
    up: async (service: SQLiteService) => {
      // 既存カラムの存在チェック（二重追加エラー防止）
      try {
        const tableInfo = await service.query<any>('PRAGMA table_info(teams)');
        const hasColumn = tableInfo.some((col: any) => col.name === 'season_year');
        if (!hasColumn) {
          await service.run('ALTER TABLE teams ADD COLUMN season_year INTEGER DEFAULT NULL');
        }
      } catch (err: any) {
        if (!err?.message?.includes('duplicate column')) {
          throw err;
        }
      }
    },
  },
  {
    version: 3,
    name: 'add_player_age',
    up: async (service: SQLiteService) => {
      try {
        const tableInfo = await service.query<any>('PRAGMA table_info(players)');
        const hasColumn = tableInfo.some((col: any) => col.name === 'age');
        if (!hasColumn) {
          await service.run('ALTER TABLE players ADD COLUMN age INTEGER DEFAULT NULL');
        }
      } catch (err: any) {
        if (!err?.message?.includes('duplicate column')) {
          throw err;
        }
      }
    },
  },
  {
    version: 4,
    name: 'add_team_logo_url',
    up: async (service: SQLiteService) => {
      try {
        const tableInfo = await service.query<any>('PRAGMA table_info(teams)');
        const hasColumn = tableInfo.some((col: any) => col.name === 'logo_url');
        if (!hasColumn) {
          await service.run('ALTER TABLE teams ADD COLUMN logo_url TEXT DEFAULT NULL');
        }
      } catch (err: any) {
        if (!err?.message?.includes('duplicate column')) {
          throw err;
        }
      }
    },
  },
  {
    version: 5,
    name: 'add_player_sub_number_and_notes',
    up: async (service: SQLiteService) => {
      try {
        const tableInfo = await service.query<any>('PRAGMA table_info(players)');
        const hasSubNumber = tableInfo.some((col: any) => col.name === 'sub_number');
        if (!hasSubNumber) {
          await service.run('ALTER TABLE players ADD COLUMN sub_number INTEGER DEFAULT NULL');
        }
        const hasNotes = tableInfo.some((col: any) => col.name === 'notes');
        if (!hasNotes) {
          await service.run('ALTER TABLE players ADD COLUMN notes TEXT DEFAULT NULL');
        }
      } catch (err: any) {
        if (!err?.message?.includes('duplicate column')) {
          throw err;
        }
      }
    },
  },
];

/**
 * 未適用のマイグレーションを検出し、順番に安全に実行する
 */
export async function runMigrations(service: SQLiteService): Promise<void> {
  try {
    // 1. schema_migrations テーブルの存在を保証
    await service.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);

    // 2. すでに適用されているバージョンを取得
    const appliedRows = await service.query<any>(
      'SELECT version FROM schema_migrations ORDER BY version ASC'
    );
    const appliedVersions = new Set<number>(appliedRows.map((r: any) => Number(r.version)));

    // 3. 未適用のマイグレーションをバージョン昇順で抽出
    const pendingMigrations = MIGRATIONS.filter((m) => !appliedVersions.has(m.version)).sort(
      (a, b) => a.version - b.version
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ Database schema is up to date.');
      return;
    }

    console.log(`📦 Found ${pendingMigrations.length} pending database migration(s)...`);

    // 4. 未適用マイグレーションを順番に実行
    for (const migration of pendingMigrations) {
      console.log(`⏳ Applying migration v${migration.version}: ${migration.name}...`);
      
      // マイグレーション本体を実行
      await migration.up(service);

      // マイグレーション履歴テーブルに記録
      await service.run(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        [migration.version, migration.name, Date.now()]
      );

      console.log(`✅ Applied migration v${migration.version}: ${migration.name}`);
    }

    // Web環境の場合は IndexedDB へ即時保存
    await service.persistWeb();
    console.log('🎉 All pending database migrations completed successfully!');
  } catch (error) {
    console.error('❌ Failed to run database migrations:', error);
    throw error;
  }
}
