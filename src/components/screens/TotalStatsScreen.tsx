import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateTeamCareerStats } from '../../utils/careerStats';
import { exportTeamCareerStatsCSV } from '../../utils/csvExport';
import { CourtCanvas } from '../common/CourtCanvas';
import type { PlayerCareerStats } from '../../types';
import {
  Trophy,
  Users,
  Target,
  ArrowUpDown,
  History,
  X,
  ChevronRight,
  Flame,
  FileSpreadsheet,
} from 'lucide-react';

type SortKey = 'points' | 'pointsPerGame' | 'fg3m' | 'fg2pct' | 'ftpct' | 'gamesPlayed';

export const TotalStatsScreen: React.FC = () => {
  const { teams, players, games, myTeamId, screenParams } = useApp();

  // 選択チーム（初期値: params指定 > マイチーム > チーム先頭）
  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    if (screenParams.teamId && teams.some((t) => t.id === screenParams.teamId)) {
      return screenParams.teamId;
    }
    if (myTeamId && teams.some((t) => t.id === myTeamId)) {
      return myTeamId;
    }
    return teams.length > 0 ? teams[0].id : '';
  });

  // ソート項目
  const [sortKey, setSortKey] = useState<SortKey>('points');

  const currentTeam = teams.find((t) => t.id === selectedTeamId);

  // チーム全体の通算スタッツ計算
  const careerStats = useMemo(() => {
    if (!currentTeam) return null;
    return calculateTeamCareerStats(currentTeam, games, players, teams);
  }, [currentTeam, games, players, teams]);

  // 詳細モーダルで表示する選手
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<PlayerCareerStats | null>(() => {
    if (screenParams.playerId && careerStats) {
      return careerStats.playerStats.find((p) => p.playerId === screenParams.playerId) || null;
    }
    return null;
  });

  // URLパラメーターやナビゲーションで playerId が渡された場合に該当選手モーダルを開く
  useEffect(() => {
    if (screenParams.playerId && careerStats) {
      const found = careerStats.playerStats.find((p) => p.playerId === screenParams.playerId);
      if (found) {
        setSelectedPlayerStats(found);
      }
    }
  }, [screenParams.playerId, careerStats]);

  // ソートされた選手リスト
  const sortedPlayers = useMemo(() => {
    if (!careerStats) return [];
    return [...careerStats.playerStats].sort((a, b) => {
      if (sortKey === 'points') return b.points - a.points || a.currentNumber - b.currentNumber;
      if (sortKey === 'pointsPerGame') return b.pointsPerGame - a.pointsPerGame || b.points - a.points;
      if (sortKey === 'fg3m') return b.fg3m - a.fg3m || b.points - a.points;
      if (sortKey === 'fg2pct') return b.fg2pct - a.fg2pct || b.points - a.points;
      if (sortKey === 'ftpct') return b.ftpct - a.ftpct || b.points - a.points;
      if (sortKey === 'gamesPlayed') return b.gamesPlayed - a.gamesPlayed || b.points - a.points;
      return 0;
    });
  }, [careerStats, sortKey]);

  if (!currentTeam || !careerStats) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        チームが登録されていません。「チーム管理」からチームを作成してください。
      </div>
    );
  }

  // チーム選択用（マイチームを先頭に配置）
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (a.id === myTeamId) return -1;
      if (b.id === myTeamId) return 1;
      return 0;
    });
  }, [teams, myTeamId]);

  return (
    <div className="space-y-4 pb-20">
      {/* チーム切り替えバー & 通算CSVエクスポート（上部をすっきり統合） */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {sortedTeams.length > 1 ? (
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
            {sortedTeams.map((t) => {
              const isSelected = t.id === selectedTeamId;

              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border ${
                    isSelected
                      ? 'bg-slate-800 border-orange-500 text-white shadow ring-1 ring-orange-500/40'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span>{t.shortName}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div />
        )}

        <button
          onClick={() => careerStats && exportTeamCareerStatsCSV(careerStats)}
          className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition active:scale-95 shadow-sm shrink-0"
          title="チーム通算スタッツ一覧をCSV形式で出力"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>通算CSV</span>
        </button>
      </div>

      {/* チーム通算サマリーカード */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-3.5 shadow-lg space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className="w-3.5 h-3.5 rounded-full shadow-sm"
              style={{ backgroundColor: currentTeam.color }}
            />
            <span className="font-black text-sm text-white">{currentTeam.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
              {currentTeam.shortName}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold">
            通算 {careerStats.totalGames} 試合
          </span>
        </div>

        {/* スタッツグリッド */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 text-center">
            <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center space-x-0.5">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>通算戦績</span>
            </div>
            <div className="text-base font-black text-white font-mono mt-0.5">
              {careerStats.wins}勝{careerStats.losses}敗
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              勝率 {careerStats.winRate}%
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 text-center">
            <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center space-x-0.5">
              <Flame className="w-3 h-3 text-orange-400" />
              <span>総得点</span>
            </div>
            <div className="text-base font-black text-orange-400 font-mono mt-0.5">
              {careerStats.totalPoints}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              平均 {careerStats.pointsPerGame}点
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 text-center">
            <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center space-x-0.5">
              <Target className="w-3 h-3 text-sky-400" />
              <span>平均失点</span>
            </div>
            <div className="text-base font-black text-slate-300 font-mono mt-0.5">
              {careerStats.pointsAllowedPerGame}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              計 {careerStats.totalPointsAllowed}点
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 text-center">
            <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center space-x-0.5">
              <Users className="w-3 h-3 text-emerald-400" />
              <span>登録選手</span>
            </div>
            <div className="text-base font-black text-white font-mono mt-0.5">
              {careerStats.playerStats.length}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">名</div>
          </div>
        </div>
      </div>

      {/* ソートセレクターバー */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center space-x-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>選手ランキング・一覧 ({sortedPlayers.length}名)</span>
          </span>
          <span className="text-[10px] text-slate-400">タップで詳細確認</span>
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
          {[
            { key: 'points' as const, label: '総得点 (PTS)' },
            { key: 'pointsPerGame' as const, label: '平均得点 (PPG)' },
            { key: 'fg3m' as const, label: '3P成功 (3PM)' },
            { key: 'fg2pct' as const, label: '2P成功率 (%)' },
            { key: 'ftpct' as const, label: 'FT成功率 (%)' },
            { key: 'gamesPlayed' as const, label: '試合数 (GP)' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setSortKey(item.key)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                sortKey === item.key
                  ? 'bg-orange-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 選手スタッツ一覧リスト */}
      {sortedPlayers.length === 0 ? (
        <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-6 text-center text-slate-400 text-xs">
          選手が登録されていません。
        </div>
      ) : (
        <div className="space-y-2">
          {sortedPlayers.map((p, index) => {
            const hasHistory = p.numberHistory && p.numberHistory.length > 0;

            return (
              <div
                key={p.playerId}
                onClick={() => setSelectedPlayerStats(p)}
                className="bg-slate-800/80 border border-slate-700/80 hover:border-orange-500/60 rounded-2xl p-3 shadow cursor-pointer transition active:scale-[0.99] space-y-2"
              >
                {/* 選手ヘッダー情報 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    {/* ランキング順位 */}
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-black shrink-0 ${
                        index === 0
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : index === 1
                          ? 'bg-slate-300 text-slate-950'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </span>

                    {/* 背番号バッジ */}
                    <div className="flex flex-col items-center shrink-0">
                      <span className="font-mono font-black text-sm text-white bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-lg">
                        #{p.currentNumber}
                      </span>
                      {p.subNumber != null && (
                        <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                          Rev:#{p.subNumber}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="font-black text-sm text-white truncate">{p.name}</span>
                        {p.position && (
                          <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                            ({p.position})
                          </span>
                        )}
                        {p.age !== undefined && !isNaN(p.age) && (
                          <span className="text-[9px] bg-sky-950/70 text-sky-300 border border-sky-800/60 px-1.5 py-0.5 rounded shrink-0 font-medium">
                            {p.age}歳
                          </span>
                        )}
                        {p.notes && (
                          <span className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded shrink-0">
                            {p.notes}
                          </span>
                        )}
                      </div>

                      {/* 過去の背番号履歴 */}
                      {hasHistory && (
                        <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                          <History className="w-2.5 h-2.5 text-slate-500" />
                          <span>
                            旧: {p.numberHistory!.map((h) => `#${h.number}`).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right">
                      <span className="text-lg font-black text-orange-400 font-mono leading-none">
                        {p.points}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-0.5">点</span>
                      <div className="text-[10px] text-slate-400 font-mono leading-tight">
                        平均 {p.pointsPerGame}点
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* 主要スタッツピル */}
                <div className="grid grid-cols-5 gap-1 pt-1 border-t border-slate-700/60 text-center font-mono">
                  <div className="bg-slate-900/60 py-1 px-1 rounded-lg">
                    <div className="text-[9px] text-slate-400">試合数</div>
                    <div className="text-xs font-bold text-slate-200">{p.gamesPlayed}</div>
                  </div>

                  <div className="bg-slate-900/60 py-1 px-1 rounded-lg">
                    <div className="text-[9px] text-slate-400">2PT</div>
                    <div className="text-xs font-bold text-slate-200">
                      {p.fg2m}/{p.fg2a}
                    </div>
                    <div className="text-[8px] text-slate-400">{p.fg2pct}%</div>
                  </div>

                  <div className="bg-slate-900/60 py-1 px-1 rounded-lg">
                    <div className="text-[9px] text-slate-400">3PT</div>
                    <div className="text-xs font-bold text-sky-300">
                      {p.fg3m}/{p.fg3a}
                    </div>
                    <div className="text-[8px] text-sky-400">{p.fg3pct}%</div>
                  </div>

                  <div className="bg-slate-900/60 py-1 px-1 rounded-lg">
                    <div className="text-[9px] text-slate-400">FT</div>
                    <div className="text-xs font-bold text-emerald-300">
                      {p.ftm}/{p.fta}
                    </div>
                    <div className="text-[8px] text-emerald-400">{p.ftpct}%</div>
                  </div>

                  <div className="bg-slate-900/60 py-1 px-1 rounded-lg">
                    <div className="text-[9px] text-slate-400">Foul</div>
                    <div className="text-xs font-bold text-slate-300">{p.foulTotal}</div>
                    <div className="text-[8px] text-slate-400">平 {p.foulPerGame}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          選手詳細モーダル（通算シュートチャート・試合ログ・背番号履歴）
         ======================================================== */}
      {selectedPlayerStats && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* モーダルヘッダー */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex flex-col items-center shrink-0">
                  <span className="font-mono font-black text-base text-white bg-orange-600 px-2.5 py-1 rounded-xl shadow">
                    #{selectedPlayerStats.currentNumber}
                  </span>
                  {selectedPlayerStats.subNumber != null && (
                    <span className="text-[9px] font-mono text-slate-300 mt-0.5">
                      Rev:#{selectedPlayerStats.subNumber}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center space-x-1.5 flex-wrap">
                    <span>{selectedPlayerStats.name}</span>
                    {selectedPlayerStats.position && (
                      <span className="text-xs text-slate-400 font-semibold">
                        ({selectedPlayerStats.position})
                      </span>
                    )}
                    {selectedPlayerStats.age !== undefined && !isNaN(selectedPlayerStats.age) && (
                      <span className="text-[10px] bg-sky-950/70 border border-sky-800/60 text-sky-300 px-1.5 py-0.2 rounded font-medium">
                        {selectedPlayerStats.age}歳
                      </span>
                    )}
                    {selectedPlayerStats.notes && (
                      <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.2 rounded">
                        {selectedPlayerStats.notes}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    通算 {selectedPlayerStats.gamesPlayed} 試合出場 • 総得点 {selectedPlayerStats.points} 点 (平均 {selectedPlayerStats.pointsPerGame}点)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayerStats(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* モーダルスクロール領域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 背番号履歴セクション（変更歴がある場合） */}
              {selectedPlayerStats.numberHistory && selectedPlayerStats.numberHistory.length > 0 && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>背番号・登録歴</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-white font-medium">
                      <span className="font-bold">現在: #{selectedPlayerStats.currentNumber}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded font-bold">現行</span>
                    </div>
                    {selectedPlayerStats.numberHistory.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                        <span>旧: #{h.number} {h.note ? `(${h.note})` : ''}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(h.changedAt).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 通算シュートチャート（全試合で打ったシュートのプロット） */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <Target className="w-3.5 h-3.5 text-sky-400" />
                    <span>通算シュートチャート（全試合のプロット）</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    計 {selectedPlayerStats.shotEvents.length} 本
                  </span>
                </div>

                <div className="flex justify-center bg-slate-950/90 rounded-2xl p-2 border border-slate-800">
                  <CourtCanvas
                    events={selectedPlayerStats.shotEvents}
                    interactive={false}
                    className="max-h-[260px] w-auto h-full"
                  />
                </div>
              </div>

              {/* 試合別ログ履歴 */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-200">試合別スタッツ推移</span>
                {selectedPlayerStats.gameLogs.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    出場記録がまだありません。
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedPlayerStats.gameLogs.map((log) => (
                      <div
                        key={log.gameId}
                        className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-slate-400 text-[11px]">{log.date}</span>
                            <span className="font-bold text-white">vs {log.opponentTeamName}</span>
                            <span className="text-[9px] bg-slate-800 text-slate-400 font-mono px-1 py-0.2 rounded">
                              当時の背番号: #{log.playerNumberInGame}
                            </span>
                          </div>
                          {log.tournamentName && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                              {log.tournamentName}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2.5 font-mono text-right shrink-0">
                          <div>
                            <span className="font-black text-sm text-orange-400">{log.points}</span>
                            <span className="text-[10px] text-slate-400 ml-0.5">点</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            <div>2P: {log.fg2m}/{log.fg2a}</div>
                            <div>3P: {log.fg3m}/{log.fg3a}</div>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            <div>FT: {log.ftm}/{log.fta}</div>
                            <div>F: {log.foulTotal}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 pb-safe">
              <button
                onClick={() => setSelectedPlayerStats(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
