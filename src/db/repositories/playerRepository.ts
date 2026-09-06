import { dbService } from '../sqliteService';
import type { Player, PlayerNumberHistory } from '../../types';

export class PlayerRepository {
  /**
   * 全選手を取得（背番号履歴を含む）
   */
  public async getAll(): Promise<Player[]> {
    const playerRows = await dbService.query<any>(
      'SELECT id, team_id, number, name, position, grade, age, created_at FROM players ORDER BY number ASC'
    );

    const historyRows = await dbService.query<any>(
      'SELECT id, player_id, number, changed_at, note FROM player_number_histories ORDER BY changed_at ASC'
    );

    const historyMap = new Map<string, PlayerNumberHistory[]>();
    for (const h of historyRows) {
      const list = historyMap.get(h.player_id) || [];
      list.push({
        number: Number(h.number),
        changedAt: Number(h.changed_at),
        note: h.note || undefined,
      });
      historyMap.set(h.player_id, list);
    }

    return playerRows.map((r) => ({
      id: r.id,
      teamId: r.team_id,
      number: Number(r.number),
      name: r.name,
      position: r.position || undefined,
      grade: r.grade || undefined,
      age: r.age != null ? Number(r.age) : undefined,
      numberHistory: historyMap.get(r.id) || [],
      createdAt: Number(r.created_at),
    }));
  }

  /**
   * 選手を保存（作成または更新）
   */
  public async save(player: Player): Promise<void> {
    await dbService.run(
      `INSERT OR REPLACE INTO players (id, team_id, number, name, position, grade, age, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        player.id,
        player.teamId,
        player.number,
        player.name,
        player.position || null,
        player.grade || null,
        player.age != null ? player.age : null,
        player.createdAt,
      ]
    );

    // 背番号履歴の同期
    await dbService.run('DELETE FROM player_number_histories WHERE player_id = ?', [player.id]);
    if (player.numberHistory && player.numberHistory.length > 0) {
      for (const h of player.numberHistory) {
        await dbService.run(
          `INSERT INTO player_number_histories (player_id, number, changed_at, note)
           VALUES (?, ?, ?, ?)`,
          [player.id, h.number, h.changedAt, h.note || null]
        );
      }
    }
  }

  /**
   * 複数選手を一括保存
   */
  public async saveAll(players: Player[]): Promise<void> {
    for (const p of players) {
      await this.save(p);
    }
  }

  /**
   * 選手を削除
   */
  public async delete(id: string): Promise<void> {
    await dbService.run('DELETE FROM players WHERE id = ?', [id]);
  }
}

export const playerRepository = new PlayerRepository();
