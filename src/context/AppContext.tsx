import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Team, Player, Game, StatEvent, Quarter, ActionType, ShotLocation } from '../types';
import { storage } from '../utils/storage';

export type ScreenType =
  | 'home'
  | 'teams'
  | 'players'
  | 'new_game'
  | 'live_game'
  | 'stats_view';

interface AppContextType {
  // 画面管理
  currentScreen: ScreenType;
  screenParams: Record<string, any>;
  navigateTo: (screen: ScreenType, params?: Record<string, any>) => void;

  // データ一覧
  teams: Team[];
  players: Player[];
  games: Game[];

  // チーム操作
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
    homeTeamId: string;
    awayTeamId: string;
    homeRosterPlayerIds: string[];
    awayRosterPlayerIds: string[];
    isU12?: boolean;
  }) => Game;
  updateGame: (game: Game) => void;
  deleteGame: (gameId: string) => void;
  finishGame: (gameId: string) => void;
  changeQuarter: (gameId: string, nextQuarter: Quarter) => void;

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
      if (scr && ['home', 'teams', 'players', 'new_game', 'live_game', 'stats_view'].includes(scr)) {
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

  const [teams, setTeams] = useState<Team[]>(() => storage.getTeams());
  const [players, setPlayers] = useState<Player[]>(() => storage.getPlayers());
  const [games, setGames] = useState<Game[]>(() => storage.getGames());


  // ストレージ同期
  useEffect(() => {
    storage.saveTeams(teams);
  }, [teams]);

  useEffect(() => {
    storage.savePlayers(players);
  }, [players]);

  useEffect(() => {
    storage.saveGames(games);
  }, [games]);

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
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const deletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  // 試合操作
  const createGame = (data: {
    date: string;
    tournamentName?: string;
    homeTeamId: string;
    awayTeamId: string;
    homeRosterPlayerIds: string[];
    awayRosterPlayerIds: string[];
    isU12?: boolean;
  }): Game => {
    const newGame: Game = {
      id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: data.date,
      tournamentName: data.tournamentName,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      homeRosterPlayerIds: data.homeRosterPlayerIds,
      awayRosterPlayerIds: data.awayRosterPlayerIds,
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

        const newEvent: StatEvent = {
          id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          gameId,
          timestamp: Date.now(),
          quarter: g.currentQuarter,
          teamId,
          playerId,
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
    navigateTo('home');
  };

  const contextValue = useMemo(
    () => ({
      currentScreen,
      screenParams,
      navigateTo,
      teams,
      players,
      games,
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
      recordStatEvent,
      undoLastStatEvent,
      deleteStatEvent,
      getTeamById,
      getPlayerById,
      getGameById,
      getPlayersByTeam,
      resetData,
    }),
    [currentScreen, screenParams, teams, players, games]
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
