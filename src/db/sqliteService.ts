import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { DB_NAME, DB_VERSION, CREATE_TABLES_SQL } from './schema';
import { runMigrations } from './migrations';

export class SQLiteService {
  private static instance: SQLiteService;
  private sqliteConnection: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private isWeb = false;

  private constructor() {
    this.isWeb = Capacitor.getPlatform() === 'web';
  }

  public static getInstance(): SQLiteService {
    if (!SQLiteService.instance) {
      SQLiteService.instance = new SQLiteService();
    }
    return SQLiteService.instance;
  }

  /**
   * データベースの初期化
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    try {
      this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);

      // Web環境の場合、jeep-sqlite の初期化を行う
      if (this.isWeb) {
        await this.initWeb();
      }

      // 接続の作成とオープン
      const ret = await this.sqliteConnection.checkConnectionsConsistency();
      const isConn = (await this.sqliteConnection.isConnection(DB_NAME, false)).result;

      if (ret.result && isConn) {
        this.db = await this.sqliteConnection.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqliteConnection.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          DB_VERSION,
          false
        );
      }

      await this.db.open();

      // テーブル作成 (DDL)
      await this.db.execute(CREATE_TABLES_SQL);

      // スキーママイグレーションの実行（アプリアップデート時の安全な差分適用）
      await runMigrations(this);

      // データベース健全性チェック (integrity_check)
      try {
        const integrity = await this.db.query('PRAGMA integrity_check');
        const integrityResult = integrity.values?.[0]?.integrity_check;
        if (integrityResult && integrityResult !== 'ok') {
          console.warn('⚠️ SQLite integrity check warning:', integrityResult);
        }
      } catch (e) {
        console.warn('⚠️ integrity_check failed to run:', e);
      }

      // Web環境の場合、ストアへ保存
      if (this.isWeb) {
        await this.sqliteConnection.saveToStore(DB_NAME);
      }

      this.isInitialized = true;
      if (typeof window !== 'undefined') {
        (window as any).__sqliteService = this;
      }
      console.log('✅ SQLite Database initialized successfully:', DB_NAME);
    } catch (error) {
      console.error('❌ SQLite initialization failed:', error);
      throw error;
    }
  }

  /**
   * Web (ブラウザ) 用の jeep-sqlite 初期化
   */
  private async initWeb(): Promise<void> {
    jeepSqlite(window);
    let jeepSqliteEl = document.querySelector('jeep-sqlite');
    if (!jeepSqliteEl) {
      jeepSqliteEl = document.createElement('jeep-sqlite');
      document.body.appendChild(jeepSqliteEl);
    }
    await customElements.whenDefined('jeep-sqlite');
    if (this.sqliteConnection) {
      await this.sqliteConnection.initWebStore();

      // ページ離脱・リロード時に未保存の変更を確実に保存
      window.addEventListener('beforeunload', () => {
        this.persistWeb();
      });
      window.addEventListener('pagehide', () => {
        this.persistWeb();
      });
    }
  }

  /**
   * データベース接続インスタンスの取得
   */
  public getDatabase(): SQLiteDBConnection {
    if (!this.db) {
      throw new Error('Database is not initialized. Call initialize() first.');
    }
    return this.db;
  }

  private persistTimeout: any = null;
  private queue: Promise<any> = Promise.resolve();

  /**
   * SQL実行（SELECTクエリ）
   */
  public async query<T = any>(statement: string, values: any[] = []): Promise<T[]> {
    return this.enqueue(async () => {
      const db = this.getDatabase();
      const res = await db.query(statement, values);
      return (res.values as T[]) || [];
    });
  }

  /**
   * SQL実行（INSERT / UPDATE / DELETE）
   */
  public async run(statement: string, values: any[] = []): Promise<void> {
    return this.enqueue(async () => {
      const db = this.getDatabase();
      await db.run(statement, values);
      this.schedulePersistWeb();
    });
  }

  /**
   * 複数文の実行
   */
  public async execute(statements: string): Promise<void> {
    return this.enqueue(async () => {
      const db = this.getDatabase();
      await db.execute(statements);
      this.schedulePersistWeb();
    });
  }

  /**
   * 操作を順番に実行するキュー
   */
  private enqueue<T>(op: () => Promise<T>): Promise<T> {
    const next = this.queue.then(op).catch((err) => {
      console.error('SQLite queue operation error:', err);
      throw err;
    });
    this.queue = next.catch(() => {});
    return next;
  }

  /**
   * WebStoreへの保存をデバウンス実行（トランザクション重複防止）
   */
  private schedulePersistWeb(): void {
    if (!this.isWeb || !this.sqliteConnection) return;
    if (this.persistTimeout) clearTimeout(this.persistTimeout);
    this.persistTimeout = setTimeout(async () => {
      try {
        if (this.sqliteConnection) {
          await this.sqliteConnection.saveToStore(DB_NAME);
        }
      } catch (e) {
        console.warn('saveToStore warning:', e);
      }
    }, 150);
  }

  /**
   * 変更をWebStoreへ即時保存
   */
  public async persistWeb(): Promise<void> {
    if (this.isWeb && this.sqliteConnection) {
      if (this.persistTimeout) clearTimeout(this.persistTimeout);
      await this.sqliteConnection.saveToStore(DB_NAME);
    }
  }
}

export const dbService = SQLiteService.getInstance();
