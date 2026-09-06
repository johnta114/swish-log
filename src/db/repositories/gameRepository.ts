import { dbService } from '../sqliteService';
import type { Game, StatEvent, Quarter, GameStatus, ActionType } from '../../types';

export class GameRepository {
  /**
   * 全試合を取得（ロスターおよびイベントを含む完全なGameオブジェクト配列）
   */
  public async getAll(): Promise<Game[]> {
    const gameRows = await dbService.query<any>(
      `SELECT id, date, season_year, tournament_name, home_team_id, away_team_id,
              current_quarter, status, is_u12, venue, venue_lat, venue_lng,
              venue_url, video_url, created_at
       FROM games
       ORDER BY date DESC, created_at DESC`
    );

    if (gameRows.length === 0) return [];

    const rosterRows = await dbService.query<any>(
      `SELECT game_id, player_id, team_id, roster_number, roster_sub_number, roster_name, is_on_court
       FROM game_rosters`
    );

    const eventRows = await dbService.query<any>(
      `SELECT id, game_id, timestamp, quarter, team_id, player_id,
              player_number, player_name, type, points, location_x, location_y
       FROM stat_events
       ORDER BY timestamp ASC`
    );

    // ロスターのグループ化
    const rostersByGame = new Map<string, any[]>();
    for (const r of rosterRows) {
      const list = rostersByGame.get(r.game_id) || [];
      list.push(r);
      rostersByGame.set(r.game_id, list);
    }

    // イベントのグループ化
    const eventsByGame = new Map<string, StatEvent[]>();
    for (const e of eventRows) {
      const list = eventsByGame.get(e.game_id) || [];
      list.push({
        id: e.id,
        gameId: e.game_id,
        timestamp: Number(e.timestamp),
        quarter: e.quarter as Quarter,
        teamId: e.team_id,
        playerId: e.player_id,
        playerNumber: e.player_number != null ? Number(e.player_number) : undefined,
        playerName: e.player_name || undefined,
        type: e.type as ActionType,
        points: Number(e.points),
        location:
          e.location_x != null && e.location_y != null
            ? { x: Number(e.location_x), y: Number(e.location_y) }
            : undefined,
      });
      eventsByGame.set(e.game_id, list);
    }

    return gameRows.map((g) => {
      const gRosters = rostersByGame.get(g.id) || [];
      const homeRosterPlayerIds: string[] = [];
      const awayRosterPlayerIds: string[] = [];
      const homeOnCourtPlayerIds: string[] = [];
      const awayOnCourtPlayerIds: string[] = [];
      const rosterSnapshots: Record<string, { number: number; subNumber?: number; name: string }> = {};

      for (const r of gRosters) {
        if (r.team_id === g.home_team_id) {
          homeRosterPlayerIds.push(r.player_id);
          if (r.is_on_court) homeOnCourtPlayerIds.push(r.player_id);
        } else {
          awayRosterPlayerIds.push(r.player_id);
          if (r.is_on_court) awayOnCourtPlayerIds.push(r.player_id);
        }
        rosterSnapshots[r.player_id] = {
          number: Number(r.roster_number),
          subNumber: r.roster_sub_number != null ? Number(r.roster_sub_number) : undefined,
          name: r.roster_name,
        };
      }

      return {
        id: g.id,
        date: g.date,
        seasonYear: g.season_year != null ? Number(g.season_year) : undefined,
        tournamentName: g.tournament_name || undefined,
        homeTeamId: g.home_team_id,
        awayTeamId: g.away_team_id,
        homeRosterPlayerIds,
        awayRosterPlayerIds,
        homeOnCourtPlayerIds,
        awayOnCourtPlayerIds,
        rosterSnapshots,
        currentQuarter: g.current_quarter as Quarter,
        status: g.status as GameStatus,
        isU12: Boolean(g.is_u12),
        venue: g.venue || undefined,
        venueLocation:
          g.venue_lat != null && g.venue_lng != null
            ? { lat: Number(g.venue_lat), lng: Number(g.venue_lng) }
            : undefined,
        venueUrl: g.venue_url || undefined,
        videoUrl: g.video_url || undefined,
        events: eventsByGame.get(g.id) || [],
        createdAt: Number(g.created_at),
      };
    });
  }

  /**
   * 試合を保存（作成または更新）
   */
  public async save(game: Game): Promise<void> {
    // 1. games テーブルへの保存
    await dbService.run(
      `INSERT OR REPLACE INTO games (
        id, date, season_year, tournament_name, home_team_id, away_team_id,
        current_quarter, status, is_u12, venue, venue_lat, venue_lng,
        venue_url, video_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        game.id,
        game.date,
        game.seasonYear != null ? game.seasonYear : null,
        game.tournamentName || null,
        game.homeTeamId,
        game.awayTeamId,
        game.currentQuarter,
        game.status,
        game.isU12 ? 1 : 0,
        game.venue || null,
        game.venueLocation ? game.venueLocation.lat : null,
        game.venueLocation ? game.venueLocation.lng : null,
        game.venueUrl || null,
        game.videoUrl || null,
        game.createdAt,
      ]
    );

    // 2. game_rosters テーブルの同期
    await dbService.run('DELETE FROM game_rosters WHERE game_id = ?', [game.id]);

    const homeOnCourtSet = new Set(game.homeOnCourtPlayerIds || []);
    const awayOnCourtSet = new Set(game.awayOnCourtPlayerIds || []);
    const snapshots = game.rosterSnapshots || {};

    for (const pId of game.homeRosterPlayerIds || []) {
      const snap = snapshots[pId] || { number: 0, name: '' };
      await dbService.run(
        `INSERT INTO game_rosters (game_id, player_id, team_id, roster_number, roster_sub_number, roster_name, is_on_court)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [game.id, pId, game.homeTeamId, snap.number, snap.subNumber ?? null, snap.name, homeOnCourtSet.has(pId) ? 1 : 0]
      );
    }

    for (const pId of game.awayRosterPlayerIds || []) {
      const snap = snapshots[pId] || { number: 0, name: '' };
      await dbService.run(
        `INSERT INTO game_rosters (game_id, player_id, team_id, roster_number, roster_sub_number, roster_name, is_on_court)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [game.id, pId, game.awayTeamId, snap.number, snap.subNumber ?? null, snap.name, awayOnCourtSet.has(pId) ? 1 : 0]
      );
    }

    // 3. stat_events テーブルの同期
    await dbService.run('DELETE FROM stat_events WHERE game_id = ?', [game.id]);
    for (const ev of game.events || []) {
      await dbService.run(
        `INSERT INTO stat_events (
          id, game_id, timestamp, quarter, team_id, player_id,
          player_number, player_name, type, points, location_x, location_y
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ev.id,
          game.id,
          ev.timestamp,
          ev.quarter,
          ev.teamId,
          ev.playerId,
          ev.playerNumber != null ? ev.playerNumber : null,
          ev.playerName || null,
          ev.type,
          ev.points,
          ev.location ? ev.location.x : null,
          ev.location ? ev.location.y : null,
        ]
      );
    }
  }

  /**
   * 複数試合を一括保存
   */
  public async saveAll(games: Game[]): Promise<void> {
    for (const g of games) {
      await this.save(g);
    }
  }

  /**
   * 試合を削除
   */
  public async delete(id: string): Promise<void> {
    await dbService.run('DELETE FROM stat_events WHERE game_id = ?', [id]);
    await dbService.run('DELETE FROM game_rosters WHERE game_id = ?', [id]);
    await dbService.run('DELETE FROM games WHERE id = ?', [id]);
  }
}

export const gameRepository = new GameRepository();
