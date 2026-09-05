import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Team, Player, Game, StatEvent, Quarter, ActionType, ShotLocation, SingleGameSharePackage } from '../types';
import { storage } from '../utils/storage';
import { executeGameImport } from '../utils/gameShare';

export type ScreenType =
  | 'home'
  | 'total_stats'
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
      if (scr && ['home', 'total_stats', 'teams', 'players', 'new_game', 'live_game', 'stats_view'].includes(scr)) {
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
  const [myTeamId, setMyTeamIdState] = useState<string | null>(() => storage.getMyTeamId());

  const setMyTeamId = (teamId: string | null) => {
    setMyTeamIdState(teamId);
    storage.saveMyTeamId(teamId);
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        isMyTeam: t.id === teamId,
      }))
    );
  };

  const myTeam = useMemo(() => teams.find((t) => t.id === myTeamId), [teams, myTeamId]);


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
            note: `背番号変更（#${p.number} → #${updated.number}）`,
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
  };

  // 試合操作
  const createGame = (data: {
    date: string;
    tournamentName?: string;
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

    const newGame: Game = {
      id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: data.date,
      tournamentName: data.tournamentName,
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
    return result.importedGameId;
  };

  const contextValue = useMemo(
    () => ({
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
    [currentScreen, screenParams, teams, players, games, myTeamId, myTeam]
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
