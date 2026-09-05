import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateGameStats, formatPct } from '../../utils/stats';
import { exportGameBoxScoreCSV, exportGamePlayLogCSV } from '../../utils/csvExport';
import { exportSingleGameFile } from '../../utils/gameShare';
import { getShotZone } from '../../utils/court';
import { CourtCanvas } from '../common/CourtCanvas';
import type { Quarter } from '../../types';
import {
  ArrowLeft,
  Play,
  Share2,
  Calendar,
  Trophy,
  Check,
  BarChart3,
  Crosshair,
  Clock,
  FileSpreadsheet,
  UploadCloud,
} from 'lucide-react';

export const GameStatsScreen: React.FC = () => {
  const { screenParams, getGameById, teams, players, navigateTo } = useApp();

  const gameId = screenParams.gameId as string;
  const game = getGameById(gameId);

  // 画面モード: 'boxscore' | 'shotchart' | 'timeline'
  const [viewMode, setViewMode] = useState<'boxscore' | 'shotchart' | 'timeline'>(() => {
    if (screenParams.view === 'shotchart') return 'shotchart';
    if (screenParams.view === 'timeline') return 'timeline';
    return 'boxscore';
  });

  // 対象チーム: 'home' | 'away'
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');
  // シュートチャート用選手フィルター (null は全員)
  const [filterPlayerId, setFilterPlayerId] = useState<string | null>(null);
  // シュートチャート用クォーターフィルター ('all' | Quarter)
  const [chartQuarterFilter, setChartQuarterFilter] = useState<Quarter | 'all'>('all');

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

  const stats = useMemo(() => {
    return calculateGameStats(game, homeTeam, awayTeam, players);
  }, [game, homeTeam, awayTeam, players]);

  const currentTeam = activeTab === 'home' ? homeTeam : awayTeam;
  const currentTeamStats = activeTab === 'home' ? stats.homeStats : stats.awayStats;

  // シュートチャート用イベント（チーム + 選手 + クォーター絞り込み）
  const filteredShotEvents = useMemo(() => {
    return game.events.filter((ev) => {
      if (ev.teamId !== currentTeam.id) return false;
      if (!ev.type.startsWith('2PT') && !ev.type.startsWith('3PT')) return false;
      if (filterPlayerId && ev.playerId !== filterPlayerId) return false;
      if (chartQuarterFilter !== 'all' && ev.quarter !== chartQuarterFilter) return false;
      return true;
    });
  }, [game.events, currentTeam.id, filterPlayerId, chartQuarterFilter]);

  // シュートチャート用集計統計
  const chartStats = useMemo(() => {
    let totalMade = 0;
    let totalAttempt = filteredShotEvents.length;

    let paintMade = 0;
    let paintAtt = 0;
    let midMade = 0;
    let midAtt = 0;
    let threeMade = 0;
    let threeAtt = 0;

    filteredShotEvents.forEach((ev) => {
      const isMade = ev.type.endsWith('MADE');
      if (isMade) totalMade += 1;

      if (ev.location) {
        const zone = getShotZone(ev.location, isU12);
        if (zone === 'paint') {
          paintAtt += 1;
          if (isMade) paintMade += 1;
        } else if (zone === 'mid') {
          midAtt += 1;
          if (isMade) midMade += 1;
        } else if (zone === 'three') {
          threeAtt += 1;
          if (isMade) threeMade += 1;
        }
      } else {
        if (ev.type.startsWith('3PT')) {
          threeAtt += 1;
          if (isMade) threeMade += 1;
        } else {
          midAtt += 1;
          if (isMade) midMade += 1;
        }
      }
    });

    return {
      totalMade,
      totalAttempt,
      totalPct: formatPct(totalMade, totalAttempt),
      paintMade,
      paintAtt,
      paintPct: formatPct(paintMade, paintAtt),
      midMade,
      midAtt,
      midPct: formatPct(midMade, midAtt),
      threeMade,
      threeAtt,
      threePct: formatPct(threeMade, threeAtt),
    };
  }, [filteredShotEvents, isU12]);

  // クォーター別タイムライン用グループ化（1Q, 2Q, 3Q, 4Q, OT）
  const quarterGroups = useMemo(() => {
    const quarters: Quarter[] = ['1Q', '2Q', '3Q', '4Q', 'OT'];
    return quarters.map((q) => {
      const qEvents = game.events.filter((e) => e.quarter === q);
      const homeQPoints = qEvents
        .filter((e) => e.teamId === homeTeam.id)
        .reduce((sum, e) => sum + e.points, 0);
      const awayQPoints = qEvents
        .filter((e) => e.teamId === awayTeam.id)
        .reduce((sum, e) => sum + e.points, 0);

      return {
        quarter: q,
        events: qEvents,
        homePoints: homeQPoints,
        awayPoints: awayQPoints,
      };
    });
  }, [game.events, homeTeam.id, awayTeam.id]);

  const [exportNotice, setExportNotice] = useState<string>('');

  // 試合データ共有（.json）
  const handleShareGame = async () => {
    if (!game || !homeTeam || !awayTeam) return;
    try {
      await exportSingleGameFile(game, homeTeam, awayTeam, players);
      setExportNotice('試合データ（.json）を出力しました');
      setTimeout(() => setExportNotice(''), 3500);
    } catch (e: any) {
      console.error(e);
    }
  };

  // ボックススコアCSV出力
  const handleExportBoxScoreCSV = async () => {
    if (!game || !homeTeam || !awayTeam) return;
    try {
      await exportGameBoxScoreCSV(game, homeTeam, awayTeam, players);
      setExportNotice('ボックススコアCSVを出力しました');
      setTimeout(() => setExportNotice(''), 3500);
    } catch (e: any) {
      console.error(e);
    }
  };

  // プレイログCSV（シュート座標付き）出力
  const handleExportPlayLogCSV = async () => {
    if (!game || !homeTeam || !awayTeam) return;
    try {
      await exportGamePlayLogCSV(game, homeTeam, awayTeam, players);
      setExportNotice('プレイログCSVを出力しました');
      setTimeout(() => setExportNotice(''), 3500);
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* 画面ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateTo('home')}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-white">試合スタッツ確認</h2>
        </div>

        {game.status === 'in_progress' ? (
          <button
            onClick={() => navigateTo('live_game', { gameId: game.id })}
            className="flex items-center space-x-1 text-xs bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl transition shadow"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>入力を再開</span>
          </button>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
            試合終了
          </span>
        )}
      </div>

      {/* 試合サマリーカード */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{game.date}</span>
            </div>
            {isU12 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                U12
              </span>
            )}
          </div>
          {game.tournamentName && (
            <div className="flex items-center space-x-1 text-amber-400 font-medium truncate max-w-[150px]">
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{game.tournamentName}</span>
            </div>
          )}
        </div>

        {/* スコア表示 */}
        <div className="grid grid-cols-5 items-center gap-2 py-2">
          {/* ホーム */}
          <div className="col-span-2 text-center space-y-1">
            <div className="flex items-center justify-center space-x-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: homeTeam.color }}
              />
              <span className="font-bold text-sm text-white truncate max-w-[110px]">
                {homeTeam.name}
              </span>
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {stats.homeStats.score}
            </div>
          </div>

          {/* VS */}
          <div className="col-span-1 text-center font-bold text-xs text-slate-500">
            VS
          </div>

          {/* アウェイ */}
          <div className="col-span-2 text-center space-y-1">
            <div className="flex items-center justify-center space-x-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: awayTeam.color }}
              />
              <span className="font-bold text-sm text-white truncate max-w-[110px]">
                {awayTeam.name}
              </span>
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {stats.awayStats.score}
            </div>
          </div>
        </div>
      </div>

      {/* データ共有・エクスポートエリア */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Share2 className="w-3.5 h-3.5 text-orange-400" />
            <span>データ共有・出力</span>
          </span>
          {exportNotice && (
            <span className="text-[11px] text-emerald-400 font-bold flex items-center space-x-1 animate-pulse">
              <Check className="w-3 h-3" />
              <span>{exportNotice}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* 試合データ共有（.json） */}
          <button
            onClick={handleShareGame}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow transition"
            title="AirDropやLINE等で他の端末のswish logアプリに共有"
          >
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span>この試合を共有 (.json)</span>
          </button>

          {/* ボックススコアCSV */}
          <button
            onClick={handleExportBoxScoreCSV}
            className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 active:scale-95 text-slate-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
            title="Excel/Numbersで開ける選手別スタッツCSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>ボックススコア CSV</span>
          </button>

          {/* プレイログCSV */}
          <button
            onClick={handleExportPlayLogCSV}
            className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 active:scale-95 text-slate-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
            title="シュート位置X/Y座標付きの全イベント履歴CSV"
          >
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <span>プレイログ CSV</span>
          </button>
        </div>
      </div>

      {/* スコアボード（クォーター別得点推移表） */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          クォーター別スコア推移
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="py-2 px-2 text-left font-semibold">チーム</th>
                <th className="py-2 px-1 font-semibold">1Q</th>
                <th className="py-2 px-1 font-semibold">2Q</th>
                <th className="py-2 px-1 font-semibold">3Q</th>
                <th className="py-2 px-1 font-semibold">4Q</th>
                <th className="py-2 px-1 font-semibold">OT</th>
                <th className="py-2 px-2 font-bold text-white bg-slate-900/60 rounded-t-lg">
                  合計
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 font-mono">
              <tr>
                <td className="py-2.5 px-2 text-left font-sans font-bold text-white flex items-center space-x-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: homeTeam.color }}
                  />
                  <span className="truncate">{homeTeam.shortName || homeTeam.name}</span>
                </td>
                <td className="py-2 px-1">{stats.homeStats.quarterScores['1Q']}</td>
                <td className="py-2 px-1">{stats.homeStats.quarterScores['2Q']}</td>
                <td className="py-2 px-1">{stats.homeStats.quarterScores['3Q']}</td>
                <td className="py-2 px-1">{stats.homeStats.quarterScores['4Q']}</td>
                <td className="py-2 px-1">{stats.homeStats.quarterScores['OT']}</td>
                <td className="py-2 px-2 font-black text-sm text-white bg-slate-900/60 font-mono">
                  {stats.homeStats.score}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 text-left font-sans font-bold text-white flex items-center space-x-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: awayTeam.color }}
                  />
                  <span className="truncate">{awayTeam.shortName || awayTeam.name}</span>
                </td>
                <td className="py-2 px-1">{stats.awayStats.quarterScores['1Q']}</td>
                <td className="py-2 px-1">{stats.awayStats.quarterScores['2Q']}</td>
                <td className="py-2 px-1">{stats.awayStats.quarterScores['3Q']}</td>
                <td className="py-2 px-1">{stats.awayStats.quarterScores['4Q']}</td>
                <td className="py-2 px-1">{stats.awayStats.quarterScores['OT']}</td>
                <td className="py-2 px-2 font-black text-sm text-white bg-slate-900/60 font-mono">
                  {stats.awayStats.score}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3つの表示モード切り替え（ボックススコア / シュートチャート / タイムライン） */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('boxscore')}
            className={`py-2 px-1 rounded-lg font-bold text-xs flex items-center justify-center space-x-1 transition ${
              viewMode === 'boxscore'
                ? 'bg-orange-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>ボックススコア</span>
          </button>

          <button
            onClick={() => setViewMode('shotchart')}
            className={`py-2 px-1 rounded-lg font-bold text-xs flex items-center justify-center space-x-1 transition ${
              viewMode === 'shotchart'
                ? 'bg-orange-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>シュート位置</span>
          </button>

          <button
            onClick={() => setViewMode('timeline')}
            className={`py-2 px-1 rounded-lg font-bold text-xs flex items-center justify-center space-x-1 transition ${
              viewMode === 'timeline'
                ? 'bg-orange-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>タイムライン</span>
          </button>
        </div>

        {/* チーム切り替えタブ (タイムライン以外で表示) */}
        {viewMode !== 'timeline' && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('home');
                setFilterPlayerId(null);
              }}
              className={`py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                activeTab === 'home'
                  ? 'bg-slate-800 text-white shadow border border-orange-500/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: homeTeam.color }}
              />
              <span className="truncate">{homeTeam.name}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('away');
                setFilterPlayerId(null);
              }}
              className={`py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                activeTab === 'away'
                  ? 'bg-slate-800 text-white shadow border border-blue-500/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: awayTeam.color }}
              />
              <span className="truncate">{awayTeam.name}</span>
            </button>
          </div>
        )}

        {/* 1. ボックススコアモード */}
        {viewMode === 'boxscore' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-bold uppercase tracking-wider">
                {currentTeam.name} ボックススコア
              </span>
              <span className="text-[11px] text-slate-500">※ 横スクロールで全項目表示</span>
            </div>
            {renderBoxScoreTable(currentTeamStats, isU12)}
          </div>
        )}

        {/* 2. シュートチャートモード（クォーター別フィルター付き） */}
        {viewMode === 'shotchart' && (
          <div className="space-y-3 bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white">
                {currentTeam.name} シュートマップ
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                計 {chartStats.totalAttempt}本中 <strong className="text-emerald-400">{chartStats.totalMade}本</strong> 成功 ({chartStats.totalPct})
              </span>
            </div>

            {/* クォーター別絞り込みピル */}
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Q絞り込み:</span>
              <div className="flex overflow-x-auto no-scrollbar gap-1 flex-1">
                {(['all', '1Q', '2Q', '3Q', '4Q', 'OT'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setChartQuarterFilter(q)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                      chartQuarterFilter === q
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {q === 'all' ? '全Q' : q}
                  </button>
                ))}
              </div>
            </div>

            {/* 選手別絞り込みピル */}
            <div className="flex overflow-x-auto gap-1 text-[11px] no-scrollbar py-1">
              <button
                onClick={() => setFilterPlayerId(null)}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                  filterPlayerId === null
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                全員表示
              </button>
              {currentTeamStats.players.map((p) => {
                const isSelected = filterPlayerId === p.playerId;
                const totalShots = p.fg2a + p.fg3a;
                const totalMade = p.fg2m + p.fg3m;
                return (
                  <button
                    key={p.playerId}
                    onClick={() => setFilterPlayerId(p.playerId)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition border ${
                      isSelected
                        ? 'bg-slate-700 border-orange-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    #{p.number} {p.name.split(' ')[0]} ({totalMade}/{totalShots})
                  </button>
                );
              })}
            </div>

            {/* コートキャンバス */}
            <CourtCanvas
              interactive={false}
              events={filteredShotEvents}
              isU12={isU12}
            />

            {/* エリア別サマリーカード */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/80">
                <div className="text-slate-400">ペイント・ゴール下</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {chartStats.paintMade}/{chartStats.paintAtt} ({chartStats.paintPct})
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/80">
                <div className="text-slate-400">ミドルレンジ</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {chartStats.midMade}/{chartStats.midAtt} ({chartStats.midPct})
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/80">
                <div className="text-slate-400">{isU12 ? '外角 (2P扱い)' : '3ポイント'}</div>
                <div className="text-xs font-bold text-purple-300 mt-0.5">
                  {chartStats.threeMade}/{chartStats.threeAtt} ({chartStats.threePct})
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. タイムラインモード（クォーター別全イベント履歴） */}
        {viewMode === 'timeline' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-bold uppercase tracking-wider">
                クォーター別 プレイバイプレイ履歴
              </span>
              <span>全 {game.events.length} 件</span>
            </div>

            {quarterGroups.map((grp) => {
              if (grp.events.length === 0) return null;

              return (
                <div
                  key={grp.quarter}
                  className="bg-slate-800/85 border border-slate-700 rounded-2xl overflow-hidden shadow-sm space-y-2"
                >
                  {/* クォーターヘッダー */}
                  <div className="bg-slate-900/90 px-3.5 py-2 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-lg bg-orange-600 font-mono font-black text-white text-xs shadow-sm">
                        {grp.quarter}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {grp.quarter} プレイログ ({grp.events.length} アクション)
                      </span>
                    </div>

                    {/* クォーター得点小計 */}
                    <div className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1.5">
                      <span>Q得点:</span>
                      <span style={{ color: homeTeam.color }}>{grp.homePoints}</span>
                      <span>-</span>
                      <span style={{ color: awayTeam.color }}>{grp.awayPoints}</span>
                    </div>
                  </div>

                  {/* イベントリスト */}
                  <div className="px-3 pb-3 space-y-1.5">
                    {grp.events.map((ev, idx) => {
                      const p = players.find((pl) => pl.id === ev.playerId);
                      const t = teams.find((tm) => tm.id === ev.teamId);
                      const isScore = ev.points > 0;
                      const isFoul = ev.type.startsWith('FOUL');

                      return (
                        <div
                          key={ev.id}
                          className="px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="text-[10px] text-slate-500 font-mono w-4">
                              {idx + 1}.
                            </span>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: t?.color }}
                            />
                            <span className="font-bold text-white truncate">
                              #{p?.number} {p?.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({t?.shortName || t?.name})
                            </span>
                          </div>

                          <div className="shrink-0 flex items-center space-x-2">
                            <span
                              className={`font-bold ${
                                isScore
                                  ? 'text-emerald-400'
                                  : isFoul
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {ev.points > 0 ? `+${ev.points}点 ` : ''}
                              {ev.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ボックススコアテーブル（U12モードなら3PT列を省略）
function renderBoxScoreTable(
  teamStats: ReturnType<typeof calculateGameStats>['homeStats'],
  isU12: boolean
) {
  return (
    <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-700 text-slate-400 font-semibold">
              <th className="py-2.5 px-3 text-left sticky left-0 bg-slate-900/95 z-10 w-24">
                選手
              </th>
              <th className="py-2.5 px-2 text-center font-bold text-white bg-slate-950/40">
                PTS
              </th>
              <th className="py-2.5 px-2 text-center whitespace-nowrap">
                {isU12 ? 'シュート (2P)' : '2PT (M/A)'}
              </th>
              <th className="py-2.5 px-2 text-center">
                {isU12 ? '成功率' : '2P%'}
              </th>
              {!isU12 && (
                <>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">3PT (M/A)</th>
                  <th className="py-2.5 px-2 text-center">3P%</th>
                </>
              )}
              <th className="py-2.5 px-2 text-center whitespace-nowrap">FT (M/A)</th>
              <th className="py-2.5 px-2 text-center">FT%</th>
              <th className="py-2.5 px-2 text-center">OF-F</th>
              <th className="py-2.5 px-2 text-center">DF-F</th>
              <th className="py-2.5 px-2 text-center font-bold text-amber-300">FOUL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60 font-mono text-slate-200">
            {teamStats.players.map((p) => (
              <tr key={p.playerId} className="hover:bg-slate-700/40 transition">
                <td className="py-2 px-3 text-left font-sans font-bold text-white sticky left-0 bg-slate-800/95 z-10 whitespace-nowrap">
                  <span className="font-mono text-orange-400 mr-1">#{p.number}</span>
                  <span>{p.name}</span>
                </td>
                <td className="py-2 px-2 text-center font-bold text-sm text-white bg-slate-950/30">
                  {p.points}
                </td>
                <td className="py-2 px-2 text-center whitespace-nowrap text-slate-300">
                  {p.fg2m}/{p.fg2a}
                </td>
                <td className="py-2 px-2 text-center text-slate-400">
                  {formatPct(p.fg2m, p.fg2a)}
                </td>
                {!isU12 && (
                  <>
                    <td className="py-2 px-2 text-center whitespace-nowrap text-slate-300">
                      {p.fg3m}/{p.fg3a}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-400">
                      {formatPct(p.fg3m, p.fg3a)}
                    </td>
                  </>
                )}
                <td className="py-2 px-2 text-center whitespace-nowrap text-slate-300">
                  {p.ftm}/{p.fta}
                </td>
                <td className="py-2 px-2 text-center text-slate-400">
                  {formatPct(p.ftm, p.fta)}
                </td>
                <td className="py-2 px-2 text-center text-slate-400">{p.foulOffense}</td>
                <td className="py-2 px-2 text-center text-slate-400">{p.foulDefense}</td>
                <td
                  className={`py-2 px-2 text-center font-bold ${
                    p.foulTotal >= 4 ? 'text-red-400 font-black' : 'text-slate-200'
                  }`}
                >
                  {p.foulTotal}
                </td>
              </tr>
            ))}

            {/* チーム合計行 */}
            <tr className="bg-slate-900/90 font-bold border-t-2 border-slate-600 text-white">
              <td className="py-3 px-3 text-left font-sans sticky left-0 bg-slate-900/95 z-10">
                TEAM TOTAL
              </td>
              <td className="py-3 px-2 text-center text-base text-orange-400 bg-slate-950/50">
                {teamStats.totals.points}
              </td>
              <td className="py-3 px-2 text-center whitespace-nowrap">
                {teamStats.totals.fg2m}/{teamStats.totals.fg2a}
              </td>
              <td className="py-3 px-2 text-center">
                {formatPct(teamStats.totals.fg2m, teamStats.totals.fg2a)}
              </td>
              {!isU12 && (
                <>
                  <td className="py-3 px-2 text-center whitespace-nowrap">
                    {teamStats.totals.fg3m}/{teamStats.totals.fg3a}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {formatPct(teamStats.totals.fg3m, teamStats.totals.fg3a)}
                  </td>
                </>
              )}
              <td className="py-3 px-2 text-center whitespace-nowrap">
                {teamStats.totals.ftm}/{teamStats.totals.fta}
              </td>
              <td className="py-3 px-2 text-center">
                {formatPct(teamStats.totals.ftm, teamStats.totals.fta)}
              </td>
              <td className="py-3 px-2 text-center">{teamStats.totals.foulOffense}</td>
              <td className="py-3 px-2 text-center">{teamStats.totals.foulDefense}</td>
              <td className="py-3 px-2 text-center text-amber-300">
                {teamStats.totals.foulTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
