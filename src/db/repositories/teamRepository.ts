import { dbService } from '../sqliteService';
import type { Team } from '../../types';

export class TeamRepository {
  /**
   * 全チームを取得
   */
  public async getAll(): Promise<Team[]> {
    const rows = await dbService.query<any>(
      'SELECT id, name, short_name, color, is_my_team, created_at FROM teams ORDER BY created_at ASC'
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      shortName: r.short_name,
      color: r.color,
      isMyTeam: Boolean(r.is_my_team),
      createdAt: Number(r.created_at),
    }));
  }

  /**
   * チームを保存（作成または更新）
   */
  public async save(team: Team): Promise<void> {
    await dbService.run(
      `INSERT OR REPLACE INTO teams (id, name, short_name, color, is_my_team, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        team.id,
        team.name,
        team.shortName,
        team.color,
        team.isMyTeam ? 1 : 0,
        team.createdAt,
      ]
    );
  }

  /**
   * 複数チームを一括保存
   */
  public async saveAll(teams: Team[]): Promise<void> {
    for (const t of teams) {
      await this.save(t);
    }
  }

  /**
   * チームを削除
   */
  public async delete(id: string): Promise<void> {
    await dbService.run('DELETE FROM teams WHERE id = ?', [id]);
  }

  /**
   * マイチームを設定
   */
  public async setMyTeam(myTeamId: string): Promise<void> {
    await dbService.run('UPDATE teams SET is_my_team = 0');
    if (myTeamId) {
      await dbService.run('UPDATE teams SET is_my_team = 1 WHERE id = ?', [myTeamId]);
    }
  }
}

export const teamRepository = new TeamRepository();
