import { dbService } from '../sqliteService';

export interface SqlPlayerCareerSummary {
  playerId: string;
  gamesPlayed: number;
  points: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  foulOffense: number;
  foulDefense: number;
  foulTotal: number;
}

export class StatsRepository {
  /**
   * 単一選手の通算スタッツをSQLで高速集計
   */
  public async getPlayerSummary(playerId: string): Promise<SqlPlayerCareerSummary | null> {
    const rows = await dbService.query<any>(
      `SELECT
        e.player_id,
        COUNT(DISTINCT e.game_id) AS games_played,
        SUM(e.points) AS points,
        SUM(CASE WHEN e.type = '2PT_MADE' THEN 1 ELSE 0 END) AS fg2m,
        SUM(CASE WHEN e.type IN ('2PT_MADE', '2PT_MISS') THEN 1 ELSE 0 END) AS fg2a,
        SUM(CASE WHEN e.type = '3PT_MADE' THEN 1 ELSE 0 END) AS fg3m,
        SUM(CASE WHEN e.type IN ('3PT_MADE', '3PT_MISS') THEN 1 ELSE 0 END) AS fg3a,
        SUM(CASE WHEN e.type = 'FT_MADE' THEN 1 ELSE 0 END) AS ftm,
        SUM(CASE WHEN e.type IN ('FT_MADE', 'FT_MISS') THEN 1 ELSE 0 END) AS fta,
        SUM(CASE WHEN e.type = 'FOUL_OFFENSE' THEN 1 ELSE 0 END) AS foul_offense,
        SUM(CASE WHEN e.type = 'FOUL_DEFENSE' THEN 1 ELSE 0 END) AS foul_defense,
        SUM(CASE WHEN e.type IN ('FOUL_OFFENSE', 'FOUL_DEFENSE') THEN 1 ELSE 0 END) AS foul_total
       FROM stat_events e
       WHERE e.player_id = ?
       GROUP BY e.player_id`,
      [playerId]
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      playerId: r.player_id,
      gamesPlayed: Number(r.games_played || 0),
      points: Number(r.points || 0),
      fg2m: Number(r.fg2m || 0),
      fg2a: Number(r.fg2a || 0),
      fg3m: Number(r.fg3m || 0),
      fg3a: Number(r.fg3a || 0),
      ftm: Number(r.ftm || 0),
      fta: Number(r.fta || 0),
      foulOffense: Number(r.foul_offense || 0),
      foulDefense: Number(r.foul_defense || 0),
      foulTotal: Number(r.foul_total || 0),
    };
  }

  /**
   * 全選手の通算スタッツを一括集計
   */
  public async getAllPlayersSummary(): Promise<Map<string, SqlPlayerCareerSummary>> {
    const rows = await dbService.query<any>(
      `SELECT
        e.player_id,
        COUNT(DISTINCT e.game_id) AS games_played,
        SUM(e.points) AS points,
        SUM(CASE WHEN e.type = '2PT_MADE' THEN 1 ELSE 0 END) AS fg2m,
        SUM(CASE WHEN e.type IN ('2PT_MADE', '2PT_MISS') THEN 1 ELSE 0 END) AS fg2a,
        SUM(CASE WHEN e.type = '3PT_MADE' THEN 1 ELSE 0 END) AS fg3m,
        SUM(CASE WHEN e.type IN ('3PT_MADE', '3PT_MISS') THEN 1 ELSE 0 END) AS fg3a,
        SUM(CASE WHEN e.type = 'FT_MADE' THEN 1 ELSE 0 END) AS ftm,
        SUM(CASE WHEN e.type IN ('FT_MADE', 'FT_MISS') THEN 1 ELSE 0 END) AS fta,
        SUM(CASE WHEN e.type = 'FOUL_OFFENSE' THEN 1 ELSE 0 END) AS foul_offense,
        SUM(CASE WHEN e.type = 'FOUL_DEFENSE' THEN 1 ELSE 0 END) AS foul_defense,
        SUM(CASE WHEN e.type IN ('FOUL_OFFENSE', 'FOUL_DEFENSE') THEN 1 ELSE 0 END) AS foul_total
       FROM stat_events e
       GROUP BY e.player_id`
    );

    const map = new Map<string, SqlPlayerCareerSummary>();
    for (const r of rows) {
      map.set(r.player_id, {
        playerId: r.player_id,
        gamesPlayed: Number(r.games_played || 0),
        points: Number(r.points || 0),
        fg2m: Number(r.fg2m || 0),
        fg2a: Number(r.fg2a || 0),
        fg3m: Number(r.fg3m || 0),
        fg3a: Number(r.fg3a || 0),
        ftm: Number(r.ftm || 0),
        fta: Number(r.fta || 0),
        foulOffense: Number(r.foul_offense || 0),
        foulDefense: Number(r.foul_defense || 0),
        foulTotal: Number(r.foul_total || 0),
      });
    }
    return map;
  }
}

export const statsRepository = new StatsRepository();
