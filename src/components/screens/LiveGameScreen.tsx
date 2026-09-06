import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { ActionType, ShotLocation, Quarter } from '../../types';

import { calculateGameStats, getNextQuarter, formatEventText } from '../../utils/stats';
import { isThreePointer, getZoneLabel } from '../../utils/court';
import { triggerHaptic } from '../../utils/haptics';
import { CourtCanvas } from '../common/CourtCanvas';
import {
  RotateCcw,
  BarChart2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Trophy,
  ListOrdered,
  X,
  Trash2,
  ArrowLeftRight,
  Users,
  Check,
  Plus,
} from 'lucide-react';

export const LiveGameScreen: React.FC = () => {
  const {
    screenParams,
    getGameById,
    teams,
    players,
    addPlayer,
    updateGame,
    recordStatEvent,
    undoLastStatEvent,
    deleteStatEvent,
    changeQuarter,
    finishGame,
    navigateTo,
    setCourtPlayers,
    substitutePlayer,
  } = useApp();

  const gameId = screenParams.gameId as string;
  const game = getGameById(gameId);

  // ホーム / アウェイ 切り替えタブ（'home' | 'away'）
  const [activeSide, setActiveSide] = useState<'home' | 'away'>('home');
  // 選択中の選手ID
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  // 選択中のシュート位置（デフォルト: ペイント中央付近）
  const [selectedLocation, setSelectedLocation] = useState<ShotLocation | null>({ x: 50, y: 25 });
  // クォーター別ログ管理モーダルの表示状態
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  // ログモーダル内での選択クォーターフィルター ('all' | Quarter)
  const [logQuarterFilter, setLogQuarterFilter] = useState<Quarter | 'all'>('all');

  // 選手交代モーダルの表示状態（URLクエリ ?subModal=open にも対応）
  const [isSubModalOpen, setIsSubModalOpen] = useState<boolean>(
    () => new URLSearchParams(window.location.search).get('subModal') === 'open'
  );
  // 交代モーダル内の選択状態（OUT選手、IN選手）
  const [subOutPlayerId, setSubOutPlayerId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('subOut')
  );
  const [subInPlayerId, setSubInPlayerId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('subIn')
  );
  // 一括交代（5人チェック選択）モード
  const [subBatchMode, setSubBatchMode] = useState<boolean>(
    () => new URLSearchParams(window.location.search).get('batch') === 'true'
  );
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);

  // 試合中未登録選手のクイック追加ステート
  const [isAddingNewPlayer, setIsAddingNewPlayer] = useState<boolean>(false);
  const [quickPlayerNumber, setQuickPlayerNumber] = useState<string>('');
  const [quickPlayerName, setQuickPlayerName] = useState<string>('');
  const [quickPlayerError, setQuickPlayerError] = useState<string>('');

  // 直近アクションのトーストフィードバック
  const [lastFeedback, setLastFeedback] = useState<{
    text: string;
    isScore: boolean;
    isFoul: boolean;
  } | null>(null);

  if (!game) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-sm text-slate-300">試合が見つかりませんでした。</p>
        <button
          onClick={() => navigateTo('home')}
          className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
        >
          ホームへ戻る
        </button>
      </div>
    );
  }

  const isU12 = game.isU12 ?? false;

  const homeTeam = teams.find((t) => t.id === game.homeTeamId);
  const awayTeam = teams.find((t) => t.id === game.awayTeamId);

  if (!homeTeam || !awayTeam) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-sm text-slate-300">チーム情報が見つかりませんでした。</p>
        <button
          onClick={() => navigateTo('home')}
          className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
        >
          ホームへ戻る
        </button>
      </div>
    );
  }

  // スタッツ計算
  const stats = useMemo(() => {
    return calculateGameStats(game, homeTeam, awayTeam, players);
  }, [game, homeTeam, awayTeam, players]);

  const isHome = activeSide === 'home';
  const currentTeam = isHome ? homeTeam : awayTeam;
  const currentTeamStats = isHome ? stats.homeStats : stats.awayStats;
  const rosterIds = isHome ? game.homeRosterPlayerIds : game.awayRosterPlayerIds;

  // 登録選手オブジェクト一覧
  const rosterPlayers = useMemo(() => {
    return rosterIds
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .sort((a, b) => a.number - b.number);
  }, [rosterIds, players]);

  // 現在コート上の出場選手ID一覧（未設定ならロスター先頭5名）
  const onCourtIds = useMemo(() => {
    const raw = isHome ? game.homeOnCourtPlayerIds : game.awayOnCourtPlayerIds;
    if (raw && raw.length > 0) {
      return raw.filter((id) => rosterIds.includes(id));
    }
    return rosterIds.slice(0, 5);
  }, [isHome, game.homeOnCourtPlayerIds, game.awayOnCourtPlayerIds, rosterIds]);

  // コート上の出場選手オブジェクト一覧
  const courtPlayers = useMemo(() => {
    return onCourtIds
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .sort((a, b) => a.number - b.number);
  }, [onCourtIds, players]);

  // ベンチ選手オブジェクト一覧
  const benchPlayers = useMemo(() => {
    const benchIds = rosterIds.filter((id) => !onCourtIds.includes(id));
    return benchIds
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .sort((a, b) => a.number - b.number);
  }, [rosterIds, onCourtIds, players]);

  // 初回・チーム切替・交代時に、選択中選手がコート上の選手に含まれていなければ先頭選手を選択
  useEffect(() => {
    if (courtPlayers.length > 0) {
      if (!selectedPlayerId || !onCourtIds.includes(selectedPlayerId)) {
        setSelectedPlayerId(courtPlayers[0].id);
      }
    } else if (rosterPlayers.length > 0) {
      setSelectedPlayerId(rosterPlayers[0].id);
    } else {
      setSelectedPlayerId(null);
    }
  }, [activeSide, onCourtIds, courtPlayers, rosterPlayers]);

  useEffect(() => {
    if (batchSelectedIds.length === 0 && onCourtIds.length > 0) {
      setBatchSelectedIds(onCourtIds);
    }
  }, [onCourtIds, batchSelectedIds.length]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  // 1名交代の実行
  const handleExecuteSub = () => {
    if (!subOutPlayerId || !subInPlayerId) return;
    const outPlayer = players.find((p) => p.id === subOutPlayerId);
    const inPlayer = players.find((p) => p.id === subInPlayerId);

    substitutePlayer(game.id, activeSide, subOutPlayerId, subInPlayerId);
    setSelectedPlayerId(subInPlayerId);
    triggerHaptic.miss();

    const text = `交代: OUT #${outPlayer?.number ?? ''} ⇄ IN #${inPlayer?.number ?? ''} ${inPlayer?.name ?? ''}`;
    setLastFeedback({ text, isScore: false, isFoul: false });
    setTimeout(() => {
      setLastFeedback((prev) => (prev?.text === text ? null : prev));
    }, 2500);

    setIsSubModalOpen(false);
  };

  // 5名一括交代の実行
  const handleExecuteBatchSub = () => {
    if (batchSelectedIds.length === 0) return;
    if (batchSelectedIds.length > 5) {
      alert('コート上の選手は最大5名まで選択できます');
      return;
    }
    setCourtPlayers(game.id, activeSide, batchSelectedIds);
    if (!batchSelectedIds.includes(selectedPlayerId ?? '')) {
      setSelectedPlayerId(batchSelectedIds[0]);
    }
    triggerHaptic.miss();

    const text = `出場メンバー更新 (${batchSelectedIds.length}名)`;
    setLastFeedback({ text, isScore: false, isFoul: false });
    setTimeout(() => {
      setLastFeedback((prev) => (prev?.text === text ? null : prev));
    }, 2500);

    setIsSubModalOpen(false);
  };

  // 現在選択中位置のゾーン情報

  const zoneInfo = useMemo(() => {
    if (!selectedLocation) {
      return {
        category: '2PT' as const,
        points: 2,
        label: isU12 ? '2PT (U12)' : '2PT (+2点)',
        badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      };
    }
    return getZoneLabel(selectedLocation, isU12);
  }, [selectedLocation, isU12]);

  // コート上シュート記録ハンドラ（成功 / 失敗）
  const handleRecordCourtShot = (isMade: boolean) => {
    if (!selectedPlayerId) {
      alert('選手を選択してください');
      return;
    }

    const loc = selectedLocation || { x: 50, y: 25 };
    const is3P = isThreePointer(loc, isU12);

    let actionType: ActionType;
    let points: number;

    if (is3P) {
      actionType = isMade ? '3PT_MADE' : '3PT_MISS';
      points = isMade ? 3 : 0;
    } else {
      actionType = isMade ? '2PT_MADE' : '2PT_MISS';
      points = isMade ? 2 : 0;
    }

    const ev = recordStatEvent(
      game.id,
      currentTeam.id,
      selectedPlayerId,
      actionType,
      points,
      loc
    );

    if (ev) {
      if (isMade) {
        triggerHaptic.score();
      } else {
        triggerHaptic.miss();
      }

      const p = players.find((pl) => pl.id === selectedPlayerId);
      const isScore = points > 0;
      const typeLabel = is3P ? '3PT' : '2PT';
      const text = `${ev.quarter} #${p?.number} ${p?.name}: ${typeLabel} ${
        isMade ? `成功 (+${points}点)` : '失敗 (Miss)'
      }`;

      setLastFeedback({ text, isScore, isFoul: false });
      setTimeout(() => {
        setLastFeedback((prev) => (prev?.text === text ? null : prev));
      }, 2000);
    }
  };

  // フリースローおよびファール記録ハンドラ（位置指定不要）
  const handleAction = (type: ActionType, points: number, label: string) => {
    if (!selectedPlayerId) {
      alert('選手を選択してください');
      return;
    }

    const ev = recordStatEvent(
      game.id,
      currentTeam.id,
      selectedPlayerId,
      type,
      points,
      undefined
    );

    if (ev) {
      const isFoul = type.startsWith('FOUL');
      if (isFoul) {
        triggerHaptic.foul();
      } else if (points > 0) {
        triggerHaptic.score();
      } else {
        triggerHaptic.miss();
      }

      const p = players.find((pl) => pl.id === selectedPlayerId);
      const isScore = points > 0;
      const text = `${ev.quarter} #${p?.number} ${p?.name}: ${label}`;

      setLastFeedback({ text, isScore, isFoul });
      setTimeout(() => {
        setLastFeedback((prev) => (prev?.text === text ? null : prev));
      }, 2000);
    }
  };

  // 1タップUndo
  const handleUndo = () => {
    const undone = undoLastStatEvent(game.id);
    if (undone) {
      triggerHaptic.undo();
      const p = players.find((pl) => pl.id === undone.playerId);
      const t = teams.find((tm) => tm.id === undone.teamId);
      const text = `取消: ${formatEventText(undone, p, t)}`;
      setLastFeedback({ text, isScore: false, isFoul: false });
      setTimeout(() => {
        setLastFeedback((prev) => (prev?.text === text ? null : prev));
      }, 2000);
    }
  };

  // 次のクォーターへ進める
  const handleAdvanceQuarter = () => {
    const nextQ = getNextQuarter(game.currentQuarter);
    if (!nextQ) {
      if (window.confirm('すでにOTです。試合を終了しますか？')) {
        finishGame(game.id);
        navigateTo('stats_view', { gameId: game.id });
      }
      return;
    }
    if (
      window.confirm(
        `現在のクォーター（${game.currentQuarter}）から【${nextQ}】へ進めますか？`
      )
    ) {
      changeQuarter(game.id, nextQ);
    }
  };

  // 試合終了処理
  const handleFinishGame = () => {
    if (
      window.confirm(
        `試合を終了しますか？\n（スコア: ${homeTeam.name} ${stats.homeStats.score} - ${stats.awayStats.score} ${awayTeam.name}）`
      )
    ) {
      finishGame(game.id);
      navigateTo('stats_view', { gameId: game.id });
    }
  };

  // 試合中未登録選手のクイック追加処理
  const handleQuickAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!game) return;
    const num = parseInt(quickPlayerNumber, 10);
    if (isNaN(num) || num < 0 || num > 99) {
      setQuickPlayerError('背番号は 0〜99 の数値を入力してください');
      return;
    }
    const name = quickPlayerName.trim() || `選手 #${num}`;

    // 1. 選手を登録
    const newP = addPlayer({
      teamId: currentTeam.id,
      number: num,
      name,
    });

    // 2. 試合ロスターに追加
    const isHomeTeam = currentTeam.id === game.homeTeamId;
    const updatedGame = {
      ...game,
      homeRosterPlayerIds: isHomeTeam
        ? [...game.homeRosterPlayerIds, newP.id]
        : game.homeRosterPlayerIds,
      awayRosterPlayerIds: !isHomeTeam
        ? [...game.awayRosterPlayerIds, newP.id]
        : game.awayRosterPlayerIds,
      rosterSnapshots: {
        ...(game.rosterSnapshots || {}),
        [newP.id]: { number: num, name },
      },
    };
    updateGame(updatedGame);

    // 3. 交代モーダル内で自動選択
    if (subBatchMode) {
      setBatchSelectedIds((prev) => [...prev, newP.id]);
    } else {
      setSubInPlayerId(newP.id);
    }

    setQuickPlayerNumber('');
    setQuickPlayerName('');
    setQuickPlayerError('');
    setIsAddingNewPlayer(false);
  };

  // 直近1件のイベント
  const lastEvent = game.events.length > 0 ? game.events[game.events.length - 1] : null;
  const lastEventPlayer = lastEvent ? players.find((p) => p.id === lastEvent.playerId) : null;


  // ログモーダル用のフィルタリング済みイベント一覧（最新順）
  const modalFilteredEvents = useMemo(() => {
    let list = [...game.events].reverse();
    if (logQuarterFilter !== 'all') {
      list = list.filter((e) => e.quarter === logQuarterFilter);
    }
    return list;
  }, [game.events, logQuarterFilter]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden select-none bg-slate-950 text-slate-100 relative">
      {/* ========================================================
          1. ウルトラスリム・ヘッダー & スコアボード (高さ固定・約88px)
         ======================================================== */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 shadow-sm z-20 pt-safe">
        {/* 最上部ナビバー (約32px) */}
        <div className="px-2.5 py-1 flex items-center justify-between border-b border-slate-800/60">
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center space-x-1 text-slate-400 hover:text-white text-xs font-semibold py-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>試合一覧</span>
          </button>

          <div className="flex items-center space-x-1.5">
            {isU12 && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                U12
              </span>
            )}
            <button
              onClick={() => navigateTo('stats_view', { gameId: game.id })}
              className="flex items-center space-x-1 text-[11px] bg-slate-800 hover:bg-slate-700 active:scale-95 text-orange-400 font-bold px-2 py-0.5 rounded-lg border border-slate-700 transition"
            >
              <BarChart2 className="w-3 h-3" />
              <span>集計</span>
            </button>
            <button
              onClick={handleFinishGame}
              className="flex items-center space-x-1 text-[11px] bg-red-600/90 hover:bg-red-500 active:scale-95 text-white font-bold px-2 py-0.5 rounded-lg transition"
            >
              <Trophy className="w-3 h-3" />
              <span>終了</span>
            </button>
          </div>
        </div>

        {/* スマート・スコアボード (約54px) */}
        <div className="px-2 py-1.5 grid grid-cols-7 items-center bg-slate-950/70">
          {/* ホームチーム */}
          <div
            onClick={() => setActiveSide('home')}
            className={`col-span-3 py-1 px-1.5 rounded-xl transition cursor-pointer flex flex-col items-center border ${
              isHome
                ? 'bg-slate-800/90 border-orange-500/80 shadow-md ring-1 ring-orange-500/40'
                : 'border-transparent opacity-65 hover:opacity-90'
            }`}
          >
            <div className="flex items-center space-x-1 max-w-full">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: homeTeam.color }}
              />
              <span className="text-[11px] font-black text-white truncate">
                {homeTeam.shortName || homeTeam.name}
              </span>
            </div>
            <span className="text-2xl font-black font-mono tracking-tight text-white leading-none mt-0.5">
              {stats.homeStats.score}
            </span>
            <div className="text-[9px] text-slate-400 font-semibold flex items-center space-x-1">
              <span>{game.currentQuarter}F:</span>
              <span
                className={`font-mono font-bold ${
                  stats.homeStats.teamFoulsCurrentQuarter >= 5
                    ? 'text-red-400 font-black'
                    : 'text-slate-300'
                }`}
              >
                {stats.homeStats.teamFoulsCurrentQuarter}
              </span>
              {stats.homeStats.teamFoulsCurrentQuarter >= 5 && (
                <span className="text-[8px] bg-red-500/30 text-red-300 px-0.5 rounded font-bold">
                  B
                </span>
              )}
            </div>
          </div>

          {/* クォーター中央 */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            <button
              onClick={handleAdvanceQuarter}
              className="bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/50 text-orange-300 px-1.5 py-0.5 rounded-lg text-xs font-black flex flex-col items-center transition active:scale-95 shadow-sm"
              title="タップで次のクォーターへ"
            >
              <span className="text-xs leading-tight">{game.currentQuarter}</span>
              <span className="text-[8px] text-orange-400 flex items-center leading-none">
                次Q <ChevronRight className="w-2 h-2 inline -ml-0.5" />
              </span>
            </button>
          </div>

          {/* アウェイチーム */}
          <div
            onClick={() => setActiveSide('away')}
            className={`col-span-3 py-1 px-1.5 rounded-xl transition cursor-pointer flex flex-col items-center border ${
              !isHome
                ? 'bg-slate-800/90 border-blue-500/80 shadow-md ring-1 ring-blue-500/40'
                : 'border-transparent opacity-65 hover:opacity-90'
            }`}
          >
            <div className="flex items-center space-x-1 max-w-full">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: awayTeam.color }}
              />
              <span className="text-[11px] font-black text-white truncate">
                {awayTeam.shortName || awayTeam.name}
              </span>
            </div>
            <span className="text-2xl font-black font-mono tracking-tight text-white leading-none mt-0.5">
              {stats.awayStats.score}
            </span>
            <div className="text-[9px] text-slate-400 font-semibold flex items-center space-x-1">
              <span>{game.currentQuarter}F:</span>
              <span
                className={`font-mono font-bold ${
                  stats.awayStats.teamFoulsCurrentQuarter >= 5
                    ? 'text-red-400 font-black'
                    : 'text-slate-300'
                }`}
              >
                {stats.awayStats.teamFoulsCurrentQuarter}
              </span>
              {stats.awayStats.teamFoulsCurrentQuarter >= 5 && (
                <span className="text-[8px] bg-red-500/30 text-red-300 px-0.5 rounded font-bold">
                  B
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* トースト・フィードバック (絶対配置で高さを圧迫しない) */}
      {lastFeedback && (
        <div
          className={`absolute top-24 left-3 right-3 z-40 p-2 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xl transition animate-in fade-in slide-in-from-top-1 ${
            lastFeedback.isScore
              ? 'bg-emerald-600 text-white'
              : lastFeedback.isFoul
              ? 'bg-amber-600 text-white'
              : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          <div className="flex items-center space-x-1.5 truncate">
            {lastFeedback.isScore ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : lastFeedback.isFoul ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <RotateCcw className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate">{lastFeedback.text}</span>
          </div>
          <button
            onClick={() => setLastFeedback(null)}
            className="text-white/80 hover:text-white ml-2 text-sm leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================
          2. ハーフコート（flex-1 で画面高さいっぱいに無駄なく収まる）
         ======================================================== */}
      <div className="flex-1 min-h-0 px-2 py-1 flex flex-col justify-center relative overflow-hidden">
        {/* ガイド & 判定バッジ (コート上部) */}
        <div className="flex items-center justify-between text-[11px] px-1 pb-1">
          <span className="text-slate-400 flex items-center space-x-1 text-xs">
            <span>選択選手:</span>
            <strong className="text-orange-400 font-bold">
              #{selectedPlayer?.number} {selectedPlayer?.name}
            </strong>
          </span>

          <span
            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-black transition ${zoneInfo.badgeClass}`}
          >
            {zoneInfo.label}
          </span>
        </div>

        {/* インタラクティブコート */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <CourtCanvas
            interactive={true}
            selectedLocation={selectedLocation}
            onLocationSelect={(loc) => setSelectedLocation(loc)}
            events={game.events}
            isU12={isU12}
            className="max-h-[38vh] w-auto h-full"
          />
        </div>
      </div>

      {/* ========================================================
          3. チーム切替 & 選手選択バー (コート直下・親指の届く位置へ移動！)
         ======================================================== */}
      <div className="shrink-0 px-1.5 py-1.5 bg-slate-900/95 border-t border-b border-slate-800 flex items-center space-x-1.5 z-10 w-full shadow-md">
        {/* チーム即時トグルボタン */}
        <button
          onClick={() => setActiveSide(isHome ? 'away' : 'home')}
          className="shrink-0 px-2 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-black flex items-center space-x-1 text-white shadow-sm hover:border-slate-600 active:scale-95 transition"
          title="タップで相手チームに切り替え"
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentTeam.color }}
          />
          <span className="truncate max-w-[40px]">{currentTeam.shortName || currentTeam.name}</span>
          <span className="text-[10px] text-slate-400">⇄</span>
        </button>

        {/* 出場中選手リスト（コート上の選手のみ表示・min-w-0で交代ボタンを押し出さない） */}
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar flex items-center space-x-1.5 py-0.5">
          {courtPlayers.map((p) => {
            const isSelected = selectedPlayerId === p.id;
            const box = currentTeamStats.players.find((b) => b.playerId === p.id);
            const fouls = box?.foulTotal ?? 0;
            const isTrouble = fouls >= 4;

            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                className={`shrink-0 px-2 py-1 rounded-xl text-xs font-bold flex items-center space-x-1 transition border relative active:scale-95 ${
                  isSelected
                    ? 'bg-orange-600 border-orange-400 text-white shadow-md ring-2 ring-orange-400/50'
                    : 'bg-slate-850 border-slate-750 text-slate-200 hover:border-slate-600 bg-slate-800'
                }`}
              >
                <span className="font-mono font-black text-sm">#{p.number}</span>
                <span className="text-[11px] truncate max-w-[42px]">{p.name.split(' ')[0]}</span>
                {fouls > 0 && (
                  <span
                    className={`text-[8px] px-1 rounded font-mono font-bold ${
                      isTrouble ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    F{fouls}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 選手交代ボタン（右端に固定） */}
        <button
          onClick={() => {
            setSubOutPlayerId(null);
            setSubInPlayerId(null);
            setBatchSelectedIds(onCourtIds);
            setSubBatchMode(false);
            setIsSubModalOpen(true);
          }}
          className="shrink-0 px-2 py-1.5 rounded-xl bg-sky-950/90 hover:bg-sky-900 border border-sky-500/50 text-sky-300 text-[11px] font-bold flex items-center space-x-1 active:scale-95 transition shadow-sm"
          title="選手交代"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
          <span>交代</span>
          <span className="text-[9px] bg-sky-500/30 px-1 py-0.2 rounded font-mono text-sky-200">
            {courtPlayers.length}/{rosterPlayers.length}
          </span>
        </button>
      </div>

      {/* ========================================================
          4. 親指アクションボタンプラットフォーム (高さ約96px・最下部に固定)
         ======================================================== */}
      <div className="shrink-0 px-2.5 pt-1.5 pb-1 space-y-1.5 bg-slate-900/95 border-t border-slate-800 z-20 pb-safe">
        {/* メイン: シュート 成功 / 失敗 ボタン (高さ46px) */}
        <div className="grid grid-cols-2 gap-2">
          {/* 成功ボタン */}
          <button
            onClick={() => handleRecordCourtShot(true)}
            className="h-[46px] rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 active:scale-95 text-white font-black shadow-md border border-emerald-400/50 flex flex-col items-center justify-center transition"
          >
            <div className="text-sm leading-none flex items-center space-x-1">
              <span>⭕ シュート成功</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-100 mt-0.5">
              {zoneInfo.category} (+{zoneInfo.points}点) を記録
            </div>
          </button>

          {/* 失敗ボタン */}
          <button
            onClick={() => handleRecordCourtShot(false)}
            className="h-[46px] rounded-2xl bg-slate-800 active:scale-95 text-slate-200 font-black shadow border border-slate-700 flex flex-col items-center justify-center transition"
          >
            <div className="text-sm leading-none flex items-center space-x-1">
              <span>❌ シュート失敗</span>
            </div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
              {zoneInfo.category} Miss (0点) を記録
            </div>
          </button>
        </div>

        {/* サブ: [FT+1] [FT✕] [DF] [OF] [Undo] (横5分割・高さ36px) */}
        <div className="grid grid-cols-5 gap-1.5">
          <button
            onClick={() => handleAction('FT_MADE', 1, 'FT 成功 (+1)')}
            className="h-[36px] rounded-xl bg-slate-800 active:scale-95 text-slate-100 font-bold border border-slate-700 text-xs flex items-center justify-center space-x-0.5"
          >
            <span className="text-emerald-400 font-black text-xs">+1</span>
            <span className="text-[11px]">FT</span>
          </button>

          <button
            onClick={() => handleAction('FT_MISS', 0, 'FT 失敗')}
            className="h-[36px] rounded-xl bg-slate-800 active:scale-95 text-slate-400 font-bold border border-slate-700 text-[11px] flex items-center justify-center"
          >
            FT ✕
          </button>

          <button
            onClick={() => handleAction('FOUL_DEFENSE', 0, 'ディフェンスファール')}
            className="h-[36px] rounded-xl bg-amber-900/70 active:scale-95 text-amber-200 font-bold border border-amber-600/50 text-[11px] flex items-center justify-center"
          >
            DF
          </button>

          <button
            onClick={() => handleAction('FOUL_OFFENSE', 0, 'オフェンスファール')}
            className="h-[36px] rounded-xl bg-rose-900/70 active:scale-95 text-rose-200 font-bold border border-rose-600/50 text-[11px] flex items-center justify-center"
          >
            OF
          </button>

          <button
            onClick={handleUndo}
            disabled={game.events.length === 0}
            className={`h-[36px] rounded-xl font-bold text-[11px] flex items-center justify-center space-x-1 ${
              game.events.length > 0
                ? 'bg-slate-800 active:scale-95 text-amber-300 border border-amber-500/50'
                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
            title="直前の入力を1つ取り消す"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>
        </div>

        {/* 最下部 ミニマル・ログバー (高さ約26px) */}
        <div
          onClick={() => setIsLogModalOpen(true)}
          className="h-[26px] px-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[10px] text-slate-400 cursor-pointer hover:border-slate-700 transition"
        >
          <div className="flex items-center space-x-1.5 truncate">
            <span className="font-bold text-slate-500">直前:</span>
            {lastEvent ? (
              <span className="text-slate-300 truncate">
                <strong className="text-orange-400 mr-0.5">[{lastEvent.quarter}]</strong>
                #{lastEventPlayer?.number} {lastEventPlayer?.name}:{' '}
                {lastEvent.points > 0 ? `+${lastEvent.points}点` : lastEvent.type.replace('_', ' ')}
              </span>
            ) : (
              <span className="text-slate-600">まだ記録がありません</span>
            )}
          </div>

          <div className="flex items-center space-x-1 text-orange-400 font-bold shrink-0">
            <ListOrdered className="w-3 h-3" />
            <span>全Qログ管理 ({game.events.length})</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          5. クォーター別ログ管理モーダル (全クォーター閲覧 & 個別削除)
         ======================================================== */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* モーダルヘッダー */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ListOrdered className="w-4 h-4 text-orange-500" />
                  <span>クォーター別プレイログ管理</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  全 {game.events.length} 件のイベント（個別削除可能）
                </p>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* クォーター切り替えタブ */}
            <div className="p-2 border-b border-slate-800 flex overflow-x-auto no-scrollbar gap-1.5 bg-slate-950/60">
              {(['all', '1Q', '2Q', '3Q', '4Q', 'OT'] as const).map((q) => {
                const count =
                  q === 'all'
                    ? game.events.length
                    : game.events.filter((e) => e.quarter === q).length;

                return (
                  <button
                    key={q}
                    onClick={() => setLogQuarterFilter(q)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      logQuarterFilter === q
                        ? 'bg-orange-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {q === 'all' ? '全クォーター' : q} ({count})
                  </button>
                );
              })}
            </div>

            {/* イベント一覧（スクロール可能） */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh]">
              {modalFilteredEvents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  このクォーターの記録はありません。
                </div>
              ) : (
                modalFilteredEvents.map((ev) => {
                  const p = players.find((pl) => pl.id === ev.playerId);
                  const t = teams.find((tm) => tm.id === ev.teamId);
                  const isScore = ev.points > 0;
                  const isFoul = ev.type.startsWith('FOUL');

                  return (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-orange-400 font-mono font-bold text-[10px]">
                          {ev.quarter}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t?.color }}
                        />
                        <span className="font-bold text-white truncate">
                          #{p?.number} {p?.name}
                        </span>
                        <span
                          className={`font-semibold text-[11px] ${
                            isScore
                              ? 'text-emerald-400'
                              : isFoul
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {ev.points > 0 ? `+${ev.points}点` : ''}{' '}
                          {ev.type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* 個別削除ボタン */}
                      <button
                        onClick={() => {
                          if (window.confirm(`この記録を取り消しますか？\n（${ev.quarter} #${p?.number} ${p?.name}）`)) {
                            deleteStatEvent(game.id, ev.id);
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 active:scale-95 transition"
                        title="このイベントを削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* モーダルフッター */}
            <div className="p-3 border-t border-slate-800 bg-slate-950">
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. 選手交代モーダル (SubstitutionModal)
         ======================================================== */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* モーダルヘッダー */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: currentTeam.color }}
                />
                <div>
                  <h3 className="text-sm font-black text-white flex items-center space-x-1.5">
                    <ArrowLeftRight className="w-4 h-4 text-sky-400" />
                    <span>選手交代（{currentTeam.shortName || currentTeam.name}）</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    コート上: {courtPlayers.length}名 / 登録: {rosterPlayers.length}名
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* モード切替タブ */}
            <div className="px-3 pt-2 pb-1 border-b border-slate-800 bg-slate-950/60 flex space-x-2">
              <button
                type="button"
                onClick={() => setSubBatchMode(false)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 ${
                  !subBatchMode
                    ? 'bg-sky-600 text-white shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>クイック交代 (1人)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubBatchMode(true);
                  setBatchSelectedIds(onCourtIds);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 ${
                  subBatchMode
                    ? 'bg-sky-600 text-white shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>5人一括選択</span>
              </button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[60vh]">
              {!subBatchMode ? (
                <>
                  {/* STEP 1: ベンチへ下がる選手（OUT） */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-rose-400 flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>① 下がる選手（OUT）を選択</span>
                      </span>
                      {subOutPlayerId && (
                        <span className="text-[10px] text-rose-300 font-mono">
                          選択中: #{players.find((p) => p.id === subOutPlayerId)?.number}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {courtPlayers.map((p) => {
                        const isOut = subOutPlayerId === p.id;
                        const box = currentTeamStats.players.find((b) => b.playerId === p.id);
                        const fouls = box?.foulTotal ?? 0;
                        const pts = box?.points ?? 0;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSubOutPlayerId(p.id)}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                              isOut
                                ? 'bg-rose-500/20 border-rose-500 text-white ring-1 ring-rose-500'
                                : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                                isOut ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-200'
                              }`}>
                                #{p.number}
                              </span>
                              <div>
                                <span className="font-bold text-xs">{p.name}</span>
                                {p.position && (
                                  <span className="ml-1 text-[10px] text-slate-400">({p.position})</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] font-mono">
                              <span className="text-orange-400 font-bold">{pts}点</span>
                              <span className={fouls >= 4 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                                {fouls}F
                              </span>
                              {isOut && (
                                <span className="text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded font-sans">
                                  OUT
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* STEP 2: コートに入る選手（IN） */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>② コートに入る選手（IN）を選択</span>
                      </span>
                      {subInPlayerId && (
                        <span className="text-[10px] text-emerald-300 font-mono">
                          選択中: #{players.find((p) => p.id === subInPlayerId)?.number}
                        </span>
                      )}
                    </div>

                    {benchPlayers.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-500">
                        ベンチ選手がいません（全員出場中）
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5">
                        {benchPlayers.map((p) => {
                          const isIn = subInPlayerId === p.id;
                          const box = currentTeamStats.players.find((b) => b.playerId === p.id);
                          const fouls = box?.foulTotal ?? 0;
                          const pts = box?.points ?? 0;

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSubInPlayerId(p.id)}
                              className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                                isIn
                                  ? 'bg-emerald-500/20 border-emerald-500 text-white ring-1 ring-emerald-500'
                                  : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                                  isIn ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
                                }`}>
                                  #{p.number}
                                </span>
                                <div>
                                  <span className="font-bold text-xs">{p.name}</span>
                                  {p.position && (
                                    <span className="ml-1 text-[10px] text-slate-400">({p.position})</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 text-[11px] font-mono">
                                <span className="text-orange-400 font-bold">{pts}点</span>
                                <span className={fouls >= 4 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                                  {fouls}F
                                </span>
                                {isIn && (
                                  <span className="text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded font-sans">
                                    IN
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* 5名一括選択モード */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">
                      出場選手を選択（最大5名）:
                    </span>
                    <span className={`font-mono font-black ${
                      batchSelectedIds.length === 5
                        ? 'text-emerald-400'
                        : batchSelectedIds.length > 5
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }`}>
                      {batchSelectedIds.length} / 5 名選択中
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {rosterPlayers.map((p) => {
                      const isChecked = batchSelectedIds.includes(p.id);
                      const box = currentTeamStats.players.find((b) => b.playerId === p.id);
                      const fouls = box?.foulTotal ?? 0;
                      const pts = box?.points ?? 0;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setBatchSelectedIds((prev) => prev.filter((id) => id !== p.id));
                            } else {
                              if (batchSelectedIds.length >= 5) {
                                alert('コート上の選手は最大5名までです');
                                return;
                              }
                              setBatchSelectedIds((prev) => [...prev, p.id]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                            isChecked
                              ? 'bg-sky-600/20 border-sky-500 text-white'
                              : 'bg-slate-800/80 border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`w-5 h-5 rounded flex items-center justify-center border text-xs ${
                              isChecked ? 'bg-sky-600 border-sky-400 text-white' : 'border-slate-600 text-transparent'
                            }`}>
                              ✓
                            </span>
                            <span className="font-mono font-black text-xs">#{p.number}</span>
                            <span className="font-bold text-xs">{p.name}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                            <span>{pts}点</span>
                            <span className={fouls >= 4 ? 'text-red-400 font-bold' : ''}>{fouls}F</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 事前登録外の選手クイック追加 */}
              <div className="pt-2 border-t border-slate-800">
                {!isAddingNewPlayer ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewPlayer(true);
                      setQuickPlayerError('');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-dashed border-slate-700 text-xs text-sky-400 font-semibold flex items-center justify-center space-x-1.5 transition active:scale-98"
                  >
                    <Plus className="w-4 h-4" />
                    <span>事前登録外の選手をその場で追加</span>
                  </button>
                ) : (
                  <div className="bg-slate-950 border border-sky-500/40 rounded-xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-300 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-sky-400" />
                        <span>未登録選手の追加（{currentTeam.shortName || currentTeam.name}）</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewPlayer(false)}
                        className="text-slate-400 hover:text-white text-xs p-1"
                      >
                        ✕
                      </button>
                    </div>

                    {quickPlayerError && (
                      <p className="text-[11px] text-red-400 font-medium">{quickPlayerError}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">背番号 *</label>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={quickPlayerNumber}
                          onChange={(e) => setQuickPlayerNumber(e.target.value)}
                          placeholder="99"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                          required
                          autoFocus
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">選手氏名（任意）</label>
                        <input
                          type="text"
                          value={quickPlayerName}
                          onChange={(e) => setQuickPlayerName(e.target.value)}
                          placeholder="例: 山本 健太"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingNewPlayer(false)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickAddPlayer}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold rounded-lg text-xs shadow transition flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>追加して交代選択</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* モーダルフッター確定ボタン */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 pb-safe">
              {!subBatchMode ? (
                <button
                  type="button"
                  disabled={!subOutPlayerId || !subInPlayerId}
                  onClick={handleExecuteSub}
                  className={`w-full py-3 rounded-xl font-bold text-sm shadow transition flex items-center justify-center space-x-2 ${
                    subOutPlayerId && subInPlayerId
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>
                    {subOutPlayerId && subInPlayerId
                      ? `交代を確定 (OUT #${players.find((p) => p.id === subOutPlayerId)?.number} ⇄ IN #${players.find((p) => p.id === subInPlayerId)?.number})`
                      : '①下がる選手 と ②入る選手 を選択'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={batchSelectedIds.length === 0}
                  onClick={handleExecuteBatchSub}
                  className="w-full py-3 rounded-xl font-bold text-sm shadow transition bg-sky-600 hover:bg-sky-500 text-white active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>選択した {batchSelectedIds.length} 名を出場メンバーに設定</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
