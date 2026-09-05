import React from 'react';
import { useApp } from '../../context/AppContext';
import { calculateGameStats } from '../../utils/stats';
import { PlusCircle, Play, BarChart2, Calendar, Trophy, Trash2, Shield, Users } from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const { games, teams, players, navigateTo, deleteGame } = useApp();

  const getTeam = (teamId: string) => teams.find((t) => t.id === teamId);

  const activeGames = games.filter((g) => g.status === 'in_progress');
  const finishedGames = games.filter((g) => g.status === 'finished');

  const handleDeleteGame = (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    if (window.confirm('この試合データを削除しますか？')) {
      deleteGame(gameId);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ヒーローバナー & クイックアクション */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 border border-slate-700/80 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-semibold backdrop-blur-sm mb-1.5">
              <span>swish log - バスケ スタッツ管理</span>
            </div>
            <h2 className="text-lg font-black tracking-tight leading-tight">
              リアルタイムに<br />スタッツを記録・分析
            </h2>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              親指ワンタップでシュート位置・得点を逃さず記録。
            </p>
          </div>
          <div className="shrink-0">
            <img
              src="/swish-icon-192.png"
              alt="swish log"
              className="w-14 h-14 rounded-2xl shadow-lg border border-sky-400/30 object-cover"
            />
          </div>
        </div>

        <div className="mt-3.5 relative z-10">
          <button
            onClick={() => navigateTo('new_game')}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-orange-950/40 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>新しい試合を開始</span>
          </button>
        </div>
      </div>

      {/* 進行中の試合セクション */}
      {activeGames.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
                進行中の試合 ({activeGames.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {activeGames.map((game) => {
              const homeTeam = getTeam(game.homeTeamId);
              const awayTeam = getTeam(game.awayTeamId);
              if (!homeTeam || !awayTeam) return null;

              const stats = calculateGameStats(game, homeTeam, awayTeam, players);

              return (
                <div
                  key={game.id}
                  className="bg-slate-800/90 border border-slate-700/80 hover:border-orange-500/50 rounded-2xl p-4 shadow-md transition space-y-3"
                >
                  {/* ヘッダー情報 */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="truncate max-w-[180px]">
                        {game.tournamentName || '練習試合'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      {game.currentQuarter} 進行中
                    </span>
                  </div>

                  {/* スコア表示 */}
                  <div className="grid grid-cols-5 items-center py-2 bg-slate-900/60 rounded-xl px-3">
                    {/* ホーム */}
                    <div className="col-span-2 flex flex-col items-center text-center">
                      <div
                        className="w-3.5 h-1 rounded-full mb-1"
                        style={{ backgroundColor: homeTeam.color }}
                      />
                      <span className="font-bold text-sm text-white line-clamp-1">
                        {homeTeam.name}
                      </span>
                      <span className="text-2xl font-black text-white mt-0.5">
                        {stats.homeStats.score}
                      </span>
                    </div>

                    {/* VS */}
                    <div className="col-span-1 text-center">
                      <span className="text-xs font-semibold text-slate-500">VS</span>
                    </div>

                    {/* アウェイ */}
                    <div className="col-span-2 flex flex-col items-center text-center">
                      <div
                        className="w-3.5 h-1 rounded-full mb-1"
                        style={{ backgroundColor: awayTeam.color }}
                      />
                      <span className="font-bold text-sm text-white line-clamp-1">
                        {awayTeam.name}
                      </span>
                      <span className="text-2xl font-black text-white mt-0.5">
                        {stats.awayStats.score}
                      </span>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => navigateTo('live_game', { gameId: game.id })}
                      className="flex-1 min-w-0 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span className="truncate">スタッツ記録</span>
                    </button>
                    <button
                      onClick={() => navigateTo('stats_view', { gameId: game.id })}
                      className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1 transition shrink-0"
                    >
                      <BarChart2 className="w-3.5 h-3.5 text-slate-300" />
                      <span>集計</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteGame(e, game.id)}
                      className="p-2 text-slate-500 hover:text-red-400 active:scale-95 transition rounded-lg"
                      title="試合を削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 終了した試合セクション */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-400 tracking-wide uppercase">
            試合履歴 ({finishedGames.length})
          </h3>
        </div>

        {finishedGames.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700/80 rounded-2xl p-6 text-center text-slate-400 text-xs">
            まだ終了した試合はありません。
          </div>
        ) : (
          <div className="space-y-3">
            {finishedGames.map((game) => {
              const homeTeam = getTeam(game.homeTeamId);
              const awayTeam = getTeam(game.awayTeamId);
              if (!homeTeam || !awayTeam) return null;

              const stats = calculateGameStats(game, homeTeam, awayTeam, players);
              const isHomeWin = stats.homeStats.score > stats.awayStats.score;
              const isTie = stats.homeStats.score === stats.awayStats.score;

              return (
                <div
                  key={game.id}
                  onClick={() => navigateTo('stats_view', { gameId: game.id })}
                  className="bg-slate-800/70 border border-slate-700/60 hover:border-slate-500 rounded-2xl p-4 shadow cursor-pointer transition space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{game.date}</span>
                      {game.tournamentName && (
                        <span className="text-slate-400 truncate max-w-[140px]">
                          • {game.tournamentName}
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium text-[10px]">
                      試合終了
                    </span>
                  </div>

                  {/* スコアサマリー */}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: homeTeam.color }}
                      />
                      <span
                        className={`text-sm ${
                          isHomeWin ? 'font-bold text-white' : 'text-slate-300'
                        }`}
                      >
                        {homeTeam.name}
                      </span>
                    </div>
                    <span
                      className={`text-base font-black ${
                        isHomeWin ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {stats.homeStats.score}
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: awayTeam.color }}
                      />
                      <span
                        className={`text-sm ${
                          !isHomeWin && !isTie ? 'font-bold text-white' : 'text-slate-300'
                        }`}
                      >
                        {awayTeam.name}
                      </span>
                    </div>
                    <span
                      className={`text-base font-black ${
                        !isHomeWin && !isTie ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {stats.awayStats.score}
                    </span>
                  </div>

                  {/* フッター */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-[11px] text-orange-400 font-semibold">
                    <span className="flex items-center space-x-1">
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>ボックススコア・詳細を確認</span>
                    </span>
                    <button
                      onClick={(e) => handleDeleteGame(e, game.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition"
                      title="試合を削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* チーム・選手クイックアクセス */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={() => navigateTo('teams')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 text-left transition flex items-center space-x-3"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">チーム管理</div>
            <div className="text-[10px] text-slate-400">{teams.length} チーム登録済</div>
          </div>
        </button>

        <button
          onClick={() => navigateTo('players')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 text-left transition flex items-center space-x-3"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">選手管理</div>
            <div className="text-[10px] text-slate-400">{players.length} 名登録済</div>
          </div>
        </button>
      </div>
    </div>
  );
};
