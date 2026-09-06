import { dbService } from '../sqliteService';

export class SettingsRepository {
  /**
   * 設定値を取得
   */
  public async get(key: string, defaultValue = ''): Promise<string> {
    const rows = await dbService.query<any>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    );
    if (rows.length > 0) {
      return rows[0].value;
    }
    return defaultValue;
  }

  /**
   * JSONオブジェクト設定値を取得
   */
  public async getJson<T>(key: string, defaultValue: T): Promise<T> {
    const val = await this.get(key);
    if (!val) return defaultValue;
    try {
      return JSON.parse(val) as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * 設定値を保存
   */
  public async set(key: string, value: string): Promise<void> {
    await dbService.run(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  /**
   * JSONオブジェクト設定値を保存
   */
  public async setJson(key: string, value: any): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }
}

export const settingsRepository = new SettingsRepository();
