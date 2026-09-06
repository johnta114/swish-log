import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateGameStats } from '../../utils/stats';
import { ImportGameModal } from '../common/ImportGameModal';
import {
  PlusCircle,
  Play,
  BarChart2,
  Calendar,
  Trophy,
  Trash2,
  Shield,
  Users,
  Search,
  X,
  RotateCcw,
  UploadCloud,
  MapPin,
  Video,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const { games, teams, players, myTeamId, myTeam, screenParams, navigateTo, deleteGame } = useApp();

  // 試合データ取り込みモーダル
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(() => {
    return screenParams.importModal === 'true';
  });

  // 検索・絞り込みステート
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'my_team'>('all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');

  const getTeam = (teamId: string) => teams.find((t) => t.id === teamId);

  const activeGames = games.filter((g) => g.status === 'in_progress');
  const finishedGames = games.filter((g) => g.status === 'finished');

  // チーム選択用（マイチームを先頭に配置）
  const sortedTeamsForSelect = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (a.id === myTeamId) return -1;
      if (b.id === myTeamId) return 1;
      return 0;
    });
  }, [teams, myTeamId]);

  // フィルター済み試合履歴
  const filteredFinishedGames = useMemo(() => {
    return finishedGames.filter((game) => {
      const homeTeam = getTeam(game.homeTeamId);
      const awayTeam = getTeam(game.awayTeamId);
      if (!homeTeam || !awayTeam) return false;

      // 1. カレンダー日付フィルター
      if (selectedDate && game.date !== selectedDate) {
        return false;
      }

      // 2. マイチームフィルター
      if (filterMode === 'my_team') {
        if (!myTeamId) return false;
        if (game.homeTeamId !== myTeamId && game.awayTeamId !== myTeamId) {
          return false;
        }
      }

      // 3. チーム個別セレクトフィルター
      if (selectedTeamFilter !== 'all') {
        if (game.homeTeamId !== selectedTeamFilter && game.awayTeamId !== selectedTeamFilter) {
          return false;
        }
      }

      // 4. フリーワード検索（チーム名・大会名・会場名）
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchHome =
          homeTeam.name.toLowerCase().includes(q) ||
          homeTeam.shortName.toLowerCase().includes(q);
        const matchAway =
          awayTeam.name.toLowerCase().includes(q) ||
          awayTeam.shortName.toLowerCase().includes(q);
        const matchTournament = game.tournamentName?.toLowerCase().includes(q);
        const matchVenue = game.venue?.toLowerCase().includes(q);
        if (!matchHome && !matchAway && !matchTournament && !matchVenue) {
          return false;
        }
      }

      return true;
    });
  }, [finishedGames, selectedDate, filterMode, selectedTeamFilter, searchQuery, myTeamId, teams]);

  const hasFilterActive =
    searchQuery.trim() !== '' ||
    selectedDate !== '' ||
    filterMode !== 'all' ||
    selectedTeamFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDate('');
    setFilterMode('all');
    setSelectedTeamFilter('all');
  };

  const handleDeleteGame = (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    if (window.confirm('この試合データを削除しますか？')) {
      deleteGame(gameId);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 新規試合開始ボタン */}
      <div>
        <button
          onClick={() => navigateTo('new_game')}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-orange-950/40 transition"
        >
          <PlusCircle className="w-5 h-5" />
          <span>新しい試合を開始</span>
        </button>
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
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate max-w-[130px]">
                        {game.tournamentName || '練習試合'}
                      </span>
                      {game.venue && (
                        <span className="text-slate-400 flex items-center gap-0.5 truncate text-[11px]">
                          <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                          <span className="truncate max-w-[100px]">{game.venue}</span>
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] shrink-0">
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

      {/* 終了した試合（試合履歴）セクション */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-400 tracking-wide uppercase">
              試合履歴 ({filteredFinishedGames.length}/{finishedGames.length})
            </h3>
            {hasFilterActive && (
              <span className="text-[10px] bg-orange-600/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.2 rounded-full font-bold">
                絞り込み中
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasFilterActive && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1 active:scale-95 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>クリア</span>
              </button>
            )}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700/80 px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1.5 transition active:scale-95 shadow-sm"
              title="AirDropやLINE等で受け取った試合データ（.json）を取り込む"
            >
              <UploadCloud className="w-3.5 h-3.5 shrink-0" />
              <span>データ取り込み</span>
            </button>
          </div>
        </div>

        {/* 検索・カレンダーフィルターバー */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 space-y-2">
          {/* 上段: フリーワード検索 & カレンダー日付入力 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* チーム名・大会名検索 */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="チーム名や大会名で検索..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* カレンダー日付ピッカー */}
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-slate-500 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="absolute right-2 text-slate-500 hover:text-white"
                  title="日付解除"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 下段: クイックフィルタータブ（すべて / マイチーム / チーム絞り込み） */}
          <div className="flex items-center space-x-1.5 pt-0.5">
            <button
              onClick={() => {
                setFilterMode('all');
                setSelectedTeamFilter('all');
              }}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterMode === 'all' && selectedTeamFilter === 'all'
                  ? 'bg-orange-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              すべて
            </button>

            {myTeam && (
              <button
                onClick={() => {
                  setFilterMode('my_team');
                  setSelectedTeamFilter('all');
                }}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                  filterMode === 'my_team'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3 h-3 text-orange-400" />
                <span>マイチーム</span>
              </button>
            )}

            {/* チーム個別ドロップダウン（画面幅に合わせて自動伸縮・はみ出さない） */}
            <div className="flex-1 min-w-0">
              <select
                value={selectedTeamFilter}
                onChange={(e) => {
                  setSelectedTeamFilter(e.target.value);
                  if (e.target.value !== 'all') setFilterMode('all');
                }}
                className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-orange-500 truncate"
              >
                <option value="all">チームを選択...</option>
                {sortedTeamsForSelect.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.shortName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 試合一覧リスト */}
        {filteredFinishedGames.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700/80 rounded-2xl p-6 text-center text-slate-400 text-xs space-y-2">
            <p>
              {hasFilterActive
                ? '条件に一致する試合が見つかりませんでした。'
                : 'まだ終了した試合はありません。'}
            </p>
            {hasFilterActive && (
              <button
                onClick={handleResetFilters}
                className="text-orange-400 underline text-xs font-semibold"
              >
                絞り込み条件をリセット
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFinishedGames.map((game) => {
              const homeTeam = getTeam(game.homeTeamId);
              const awayTeam = getTeam(game.awayTeamId);
              if (!homeTeam || !awayTeam) return null;

              const stats = calculateGameStats(game, homeTeam, awayTeam, players);
              const isHomeWin = stats.homeStats.score > stats.awayStats.score;
              const isTie = stats.homeStats.score === stats.awayStats.score;

              // マイチーム勝敗判定
              const isHomeMyTeam = game.homeTeamId === myTeamId;
              const isAwayMyTeam = game.awayTeamId === myTeamId;
              const hasMyTeam = isHomeMyTeam || isAwayMyTeam;
              const myTeamWon = hasMyTeam && ((isHomeMyTeam && isHomeWin) || (isAwayMyTeam && !isHomeWin && !isTie));
              const myTeamLost = hasMyTeam && ((isHomeMyTeam && !isHomeWin && !isTie) || (isAwayMyTeam && isHomeWin));

              return (
                <div
                  key={game.id}
                  onClick={() => navigateTo('stats_view', { gameId: game.id })}
                  className="bg-slate-800/70 border border-slate-700/60 hover:border-slate-500 rounded-2xl p-4 shadow cursor-pointer transition space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center space-x-1.5 truncate min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono">{game.date}</span>
                      {game.tournamentName && (
                        <span className="text-slate-400 truncate max-w-[110px]">
                          • {game.tournamentName}
                        </span>
                      )}
                      {game.venue && (
                        <span
                          onClick={(e) => {
                            if (game.venueUrl) {
                              e.stopPropagation();
                              window.open(game.venueUrl, '_blank');
                            }
                          }}
                          className={`flex items-center gap-0.5 truncate text-[11px] ${
                            game.venueUrl
                              ? 'text-sky-400 hover:underline cursor-pointer'
                              : 'text-slate-400'
                          }`}
                          title={game.venueUrl ? 'マップアプリで会場を開く' : undefined}
                        >
                          <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                          <span className="truncate max-w-[100px]">{game.venue}</span>
                        </span>
                      )}
                    </div>

                    {/* 勝敗バッジ（マイチーム参加時）または試合終了バッジ */}
                    {hasMyTeam ? (
                      myTeamWon ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[10px] flex items-center space-x-0.5">
                          <Trophy className="w-2.5 h-2.5 text-emerald-400" />
                          <span>WIN</span>
                        </span>
                      ) : myTeamLost ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-black text-[10px]">
                          LOSE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-bold text-[10px]">
                          DRAW
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px] border border-slate-700">
                        試合終了
                      </span>
                    )}
                  </div>

                  {/* スコア */}
                  <div className="space-y-1.5 py-1">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: homeTeam.color }}
                        />
                        <span
                          className={`text-sm flex items-center space-x-1 ${
                            isHomeWin ? 'font-bold text-white' : 'text-slate-300'
                          }`}
                        >
                          <span>{homeTeam.name}</span>
                          {isHomeMyTeam && (
                            <Shield className="w-3 h-3 text-orange-400 shrink-0" />
                          )}
                        </span>
                      </div>
                      <span
                        className={`text-base font-black font-mono ${
                          isHomeWin ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {stats.homeStats.score}
                      </span>
                    </div>

                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: awayTeam.color }}
                        />
                        <span
                          className={`text-sm flex items-center space-x-1 ${
                            !isHomeWin && !isTie ? 'font-bold text-white' : 'text-slate-300'
                          }`}
                        >
                          <span>{awayTeam.name}</span>
                          {isAwayMyTeam && (
                            <Shield className="w-3 h-3 text-orange-400 shrink-0" />
                          )}
                        </span>
                      </div>
                      <span
                        className={`text-base font-black font-mono ${
                          !isHomeWin && !isTie ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {stats.awayStats.score}
                      </span>
                    </div>
                  </div>

                  {/* フッター */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-[11px]">
                    <span className="flex items-center space-x-1 text-orange-400 font-semibold">
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>ボックススコア・詳細を確認</span>
                    </span>

                    <div className="flex items-center space-x-2">
                      {game.videoUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(game.videoUrl, '_blank');
                          }}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-bold active:scale-95 transition text-[10px]"
                          title="YouTubeで試合動画を見る"
                        >
                          <Video className="w-3 h-3 text-red-400" />
                          <span>試合動画</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteGame(e, game.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition"
                        title="試合を削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* チーム・選手・通算スタッツ クイックアクセス (3分割) */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <button
          onClick={() => navigateTo('total_stats')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3 text-center transition flex flex-col items-center justify-center space-y-1 active:scale-95"
        >
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-white">通算スタッツ</div>
          <div className="text-[9px] text-slate-400">全試合の選手成績</div>
        </button>

        <button
          onClick={() => navigateTo('teams')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3 text-center transition flex flex-col items-center justify-center space-y-1 active:scale-95"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-white">チーム管理</div>
          <div className="text-[9px] text-slate-400">{teams.length} チーム</div>
        </button>

        <button
          onClick={() => navigateTo('players')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3 text-center transition flex flex-col items-center justify-center space-y-1 active:scale-95"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-white">選手管理</div>
          <div className="text-[9px] text-slate-400">{players.length} 名登録</div>
        </button>
      </div>

      {/* 試合データ取り込みモーダル */}
      <ImportGameModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
