import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Team, Player, Game, StatEvent, Quarter, ActionType, ShotLocation, SingleGameSharePackage } from '../types';
import { storage, INITIAL_TEAMS, INITIAL_PLAYERS } from '../utils/storage';
import { executeGameImport } from '../utils/gameShare';
import { dbService } from '../db/sqliteService';
import { checkAndMigrateData } from '../db/dataMigration';
import { teamRepository } from '../db/repositories/teamRepository';
import { playerRepository } from '../db/repositories/playerRepository';
import { gameRepository } from '../db/repositories/gameRepository';
import { settingsRepository } from '../db/repositories/settingsRepository';

export type ScreenType =
  | 'home'
  | 'my_team'
  | 'total_stats'
  | 'teams'
  | 'players'
  | 'new_game'
  | 'live_game'
  | 'stats_view';

interface AppContextType {
  // DB状態
  isDbReady: boolean;

  // 画面管理
  currentScreen: ScreenType;
  screenParams: Record<string, any>;
  navigateTo: (screen: ScreenType, params?: Record<string, any>) => void;

  // データ一覧
  teams: Team[];
  players: Player[];
  games: Game[];
  myTeamId: string | null;
  myTeam: Team | undefined;

  // チーム操作
  setMyTeamId: (teamId: string | null) => void;
  addTeam: (team: Omit<Team, 'id' | 'createdAt'>) => Team;
  updateTeam: (team: Team) => void;
  deleteTeam: (teamId: string) => void;

  // 選手操作
  addPlayer: (player: Omit<Player, 'id' | 'createdAt'>) => Player;
  updatePlayer: (player: Player) => void;
  deletePlayer: (playerId: string) => void;

  // 試合操作
  createGame: (gameData: {
    date: string;
    tournamentName?: string;
    venue?: string;
    venueLocation?: { lat: number; lng: number };
    venueUrl?: string;
    videoUrl?: string;
    homeTeamId: string;
    awayTeamId: string;
    homeRosterPlayerIds: string[];
    awayRosterPlayerIds: string[];
    homeOnCourtPlayerIds?: string[];
    awayOnCourtPlayerIds?: string[];
    isU12?: boolean;
  }) => Game;
  updateGame: (game: Game) => void;
  deleteGame: (gameId: string) => void;
  finishGame: (gameId: string) => void;
  changeQuarter: (gameId: string, nextQuarter: Quarter) => void;
  setCourtPlayers: (gameId: string, teamSide: 'home' | 'away', playerIds: string[]) => void;
  substitutePlayer: (gameId: string, teamSide: 'home' | 'away', playerOutId: string, playerInId: string) => void;

  // スタッツ記録（コア）
  recordStatEvent: (
    gameId: string,
    teamId: string,
    playerId: string,
    type: ActionType,
    points: number,
    location?: ShotLocation
  ) => StatEvent | null;
  undoLastStatEvent: (gameId: string) => StatEvent | null;
  deleteStatEvent: (gameId: string, eventId: string) => void;


  // データ共有・インポート
  importGame: (pkg: SingleGameSharePackage, mode?: 'add_new' | 'overwrite') => string;

  // ヘルパー
  getTeamById: (teamId: string) => Team | undefined;
  getPlayerById: (playerId: string) => Player | undefined;
  getGameById: (gameId: string) => Game | undefined;
  getPlayersByTeam: (teamId: string) => Player[];
  resetData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const scr = sp.get('screen') as ScreenType;
      if (scr && ['home', 'my_team', 'total_stats', 'teams', 'players', 'new_game', 'live_game', 'stats_view'].includes(scr)) {
        return scr;
      }
    }
    return 'home';
  });

  const [screenParams, setScreenParams] = useState<Record<string, any>>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const params: Record<string, any> = {};
      sp.forEach((val, key) => {
        if (key !== 'screen') params[key] = val;
      });
      return params;
    }
    return {};
  });

  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [teams, setTeams] = useState<Team[]>(() => storage.getTeams());
  const [players, setPlayers] = useState<Player[]>(() => storage.getPlayers());
  const [games, setGames] = useState<Game[]>(() => storage.getGames());
  const [myTeamId, setMyTeamIdState] = useState<string | null>(() => storage.getMyTeamId());

  // 初回マウント時に SQLite DB の初期化と既存データのマイグレーションを実行
  useEffect(() => {
    let isMounted = true;
    const initDb = async () => {
      try {
        await dbService.initialize();
        await checkAndMigrateData();
        const [dbTeams, dbPlayers, dbGames, dbMyTeamId] = await Promise.all([
          teamRepository.getAll(),
          playerRepository.getAll(),
          gameRepository.getAll(),
          settingsRepository.get('my_team_id', ''),
        ]);

        if (isMounted) {
          if (dbTeams.length > 0) setTeams(dbTeams);
          if (dbPlayers.length > 0) setPlayers(dbPlayers);
          if (dbGames.length > 0) setGames(dbGames);
          if (dbMyTeamId) setMyTeamIdState(dbMyTeamId);
          setIsDbReady(true);
        }
      } catch (err) {
        console.error('Failed to initialize SQLite, falling back to storage:', err);
        if (isMounted) setIsDbReady(true);
      }
    };

    initDb();
    return () => {
      isMounted = false;
    };
  }, []);

  const setMyTeamId = (teamId: string | null) => {
    setMyTeamIdState(teamId);
    storage.saveMyTeamId(teamId);
    if (teamId) {
      teamRepository.setMyTeam(teamId).catch(console.error);
      settingsRepository.set('my_team_id', teamId).catch(console.error);
    }
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        isMyTeam: t.id === teamId,
      }))
    );
  };

  const myTeam = useMemo(() => teams.find((t) => t.id === myTeamId), [teams, myTeamId]);

  // ストレージ & SQLite 同期
  useEffect(() => {
    storage.saveTeams(teams);
    if (isDbReady) {
      teamRepository.saveAll(teams).catch(console.error);
    }
  }, [teams, isDbReady]);

  useEffect(() => {
    storage.savePlayers(players);
    if (isDbReady) {
      playerRepository.saveAll(players).catch(console.error);
    }
  }, [players, isDbReady]);

  useEffect(() => {
    storage.saveGames(games);
    if (isDbReady) {
      gameRepository.saveAll(games).catch(console.error);
    }
  }, [games, isDbReady]);

  const navigateTo = (screen: ScreenType, params: Record<string, any> = {}) => {
    setCurrentScreen(screen);
    setScreenParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams();
      sp.set('screen', screen);
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.set(k, String(v));
      });
      const newUrl = `${window.location.pathname}?${sp.toString()}`;
      window.history.pushState({}, '', newUrl);
    }
  };


  // チーム操作
  const addTeam = (teamData: Omit<Team, 'id' | 'createdAt'>): Team => {
    const newTeam: Team = {
      ...teamData,
      id: `team_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };
    setTeams((prev) => [...prev, newTeam]);
    return newTeam;
  };

  const updateTeam = (updated: Team) => {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const deleteTeam = (teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    setPlayers((prev) => prev.filter((p) => p.teamId !== teamId));
    teamRepository.delete(teamId).catch(console.error);
    if (myTeamId === teamId) {
      setMyTeamId(null);
    }
  };

  // 選手操作
  const addPlayer = (playerData: Omit<Player, 'id' | 'createdAt'>): Player => {
    const newPlayer: Player = {
      ...playerData,
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };
    setPlayers((prev) => [...prev, newPlayer]);
    return newPlayer;
  };

  const updatePlayer = (updated: Player) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== updated.id) return p;
        let newHistory = p.numberHistory ? [...p.numberHistory] : [];
        // 背番号が変更された場合、過去履歴に自動記録
        if (p.number !== updated.number) {
          newHistory.push({
            number: p.number,
            changedAt: Date.now(),
            note: `${new Date().getFullYear()}年度変更`,
          });
        }
        return {
          ...updated,
          numberHistory: newHistory,
        };
      })
    );
  };

  const deletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    playerRepository.delete(playerId).catch(console.error);
  };

  // 試合操作
  const createGame = (data: {
    date: string;
    tournamentName?: string;
    venue?: string;
    venueLocation?: { lat: number; lng: number };
    venueUrl?: string;
    videoUrl?: string;
    homeTeamId: string;
    awayTeamId: string;
    homeRosterPlayerIds: string[];
    awayRosterPlayerIds: string[];
    homeOnCourtPlayerIds?: string[];
    awayOnCourtPlayerIds?: string[];
    isU12?: boolean;
  }): Game => {
    const defaultHomeOnCourt =
      data.homeOnCourtPlayerIds && data.homeOnCourtPlayerIds.length > 0
        ? data.homeOnCourtPlayerIds
        : data.homeRosterPlayerIds.slice(0, 5);

    const defaultAwayOnCourt =
      data.awayOnCourtPlayerIds && data.awayOnCourtPlayerIds.length > 0
        ? data.awayOnCourtPlayerIds
        : data.awayRosterPlayerIds.slice(0, 5);

    // ロスター選手の当時の背番号・名前スナップショットを生成（過去の記録保持）
    const rosterSnapshots: Record<string, { number: number; name: string }> = {};
    const allRosterIds = [...data.homeRosterPlayerIds, ...data.awayRosterPlayerIds];
    allRosterIds.forEach((pid) => {
      const pl = players.find((p) => p.id === pid);
      if (pl) {
        rosterSnapshots[pid] = { number: pl.number, name: pl.name };
      }
    });

    if (data.venue) {
      storage.saveVenueHistory(data.venue);
    }

    const newGame: Game = {
      id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: data.date,
      tournamentName: data.tournamentName,
      venue: data.venue,
      venueLocation: data.venueLocation,
      venueUrl: data.venueUrl,
      videoUrl: data.videoUrl,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      homeRosterPlayerIds: data.homeRosterPlayerIds,
      awayRosterPlayerIds: data.awayRosterPlayerIds,
      homeOnCourtPlayerIds: defaultHomeOnCourt,
      awayOnCourtPlayerIds: defaultAwayOnCourt,
      rosterSnapshots,
      currentQuarter: '1Q',
      status: 'in_progress',
      isU12: data.isU12 ?? false,
      events: [],
      createdAt: Date.now(),
    };

    setGames((prev) => [newGame, ...prev]);
    return newGame;
  };

  const updateGame = (updated: Game) => {
    setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  const deleteGame = (gameId: string) => {
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    gameRepository.delete(gameId).catch(console.error);
  };

  const finishGame = (gameId: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, status: 'finished' } : g))
    );
  };

  const changeQuarter = (gameId: string, nextQuarter: Quarter) => {
    setGames((prev) =>
      prev.map((g) =>
        g.id === gameId ? { ...g, currentQuarter: nextQuarter } : g
      )
    );
  };

  const setCourtPlayers = (gameId: string, teamSide: 'home' | 'away', playerIds: string[]) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        if (teamSide === 'home') {
          return { ...g, homeOnCourtPlayerIds: playerIds };
        } else {
          return { ...g, awayOnCourtPlayerIds: playerIds };
        }
      })
    );
  };

  const substitutePlayer = (
    gameId: string,
    teamSide: 'home' | 'away',
    playerOutId: string,
    playerInId: string
  ) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        const currentCourt =
          teamSide === 'home'
            ? (g.homeOnCourtPlayerIds ?? g.homeRosterPlayerIds.slice(0, 5))
            : (g.awayOnCourtPlayerIds ?? g.awayRosterPlayerIds.slice(0, 5));

        const nextCourt = currentCourt.map((id) => (id === playerOutId ? playerInId : id));
        if (teamSide === 'home') {
          return { ...g, homeOnCourtPlayerIds: nextCourt };
        } else {
          return { ...g, awayOnCourtPlayerIds: nextCourt };
        }
      })
    );
  };

  // コア: スタッツイベント記録
  const recordStatEvent = (
    gameId: string,
    teamId: string,
    playerId: string,
    type: ActionType,
    points: number,
    location?: ShotLocation
  ): StatEvent | null => {
    let createdEvent: StatEvent | null = null;

    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;

        const targetPlayer = players.find((p) => p.id === playerId);
        const newEvent: StatEvent = {
          id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          gameId,
          timestamp: Date.now(),
          quarter: g.currentQuarter,
          teamId,
          playerId,
          playerNumber: targetPlayer?.number,
          playerName: targetPlayer?.name,
          type,
          points,
          location,
        };
        createdEvent = newEvent;

        return {
          ...g,
          events: [...g.events, newEvent],
        };
      })
    );

    return createdEvent;
  };

  // コア: 1タップUndo
  const undoLastStatEvent = (gameId: string): StatEvent | null => {
    let removedEvent: StatEvent | null = null;

    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId || g.events.length === 0) return g;

        const lastEv = g.events[g.events.length - 1];
        removedEvent = lastEv;

        return {
          ...g,
          events: g.events.slice(0, -1),
        };
      })
    );

    return removedEvent;
  };

  const deleteStatEvent = (gameId: string, eventId: string) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        return {
          ...g,
          events: g.events.filter((e) => e.id !== eventId),
        };
      })
    );
  };

  // ヘルパー
  const getTeamById = (teamId: string) => teams.find((t) => t.id === teamId);
  const getPlayerById = (playerId: string) => players.find((p) => p.id === playerId);
  const getGameById = (gameId: string) => games.find((g) => g.id === gameId);
  const getPlayersByTeam = (teamId: string) =>
    players
      .filter((p) => p.teamId === teamId)
      .sort((a, b) => a.number - b.number);

  const resetData = () => {
    storage.resetAllData();
    setTeams(storage.getTeams());
    setPlayers(storage.getPlayers());
    setGames(storage.getGames());
    setMyTeamIdState(storage.getMyTeamId());
    // SQLite側も初期データでリセット
    teamRepository.saveAll(INITIAL_TEAMS).catch(console.error);
    playerRepository.saveAll(INITIAL_PLAYERS).catch(console.error);
    gameRepository.saveAll([]).catch(console.error);
    settingsRepository.set('my_team_id', 'team_red').catch(console.error);
    navigateTo('home');
  };

  const importGame = (pkg: SingleGameSharePackage, mode: 'add_new' | 'overwrite' = 'add_new'): string => {
    const result = executeGameImport(pkg, games, teams, players, mode);
    setGames(result.updatedGames);
    setTeams(result.updatedTeams);
    setPlayers(result.updatedPlayers);
    storage.saveGames(result.updatedGames);
    storage.saveTeams(result.updatedTeams);
    storage.savePlayers(result.updatedPlayers);
    if (isDbReady) {
      gameRepository.saveAll(result.updatedGames).catch(console.error);
      teamRepository.saveAll(result.updatedTeams).catch(console.error);
      playerRepository.saveAll(result.updatedPlayers).catch(console.error);
    }
    return result.importedGameId;
  };

  const contextValue = useMemo(
    () => ({
      isDbReady,
      currentScreen,
      screenParams,
      navigateTo,
      teams,
      players,
      games,
      myTeamId,
      myTeam,
      setMyTeamId,
      addTeam,
      updateTeam,
      deleteTeam,
      addPlayer,
      updatePlayer,
      deletePlayer,
      createGame,
      updateGame,
      deleteGame,
      finishGame,
      changeQuarter,
      setCourtPlayers,
      substitutePlayer,
      recordStatEvent,
      undoLastStatEvent,
      deleteStatEvent,
      getTeamById,
      getPlayerById,
      getGameById,
      getPlayersByTeam,
      resetData,
      importGame,
    }),
    [isDbReady, currentScreen, screenParams, teams, players, games, myTeamId, myTeam]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
