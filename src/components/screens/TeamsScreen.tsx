import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { Team } from '../../types';
import { Shield, Plus, Edit2, Trash2, Check, UserCheck, History, BarChart2, Calendar, X } from 'lucide-react';

const COLOR_PRESETS = [
  '#ef4444', // 赤
  '#f97316', // オレンジ
  '#eab308', // 黄
  '#10b981', // エメラルド
  '#06b6d4', // シアン
  '#3b82f6', // 青
  '#6366f1', // インディゴ
  '#a855f7', // 紫
  '#ec4899', // ピンク
  '#64748b', // スレート
  '#000000', // 黒
  '#ffffff', // 白
];

export const TeamsScreen: React.FC = () => {
  const { teams, players, games, myTeamId, myTeam, setMyTeamId, addTeam, updateTeam, deleteTeam, navigateTo } = useApp();

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [historyTeam, setHistoryTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState('#ef4444');
  const [seasonYear, setSeasonYear] = useState<number>(new Date().getFullYear());
  const [error, setError] = useState('');

  // マイチーム以外の「対戦相手チーム」一覧
  const opponentTeams = teams.filter((t) => t.id !== myTeamId);

  // 選択された対戦相手チームとの対戦試合一覧（新しい順）
  const historyGames = useMemo(() => {
    if (!historyTeam) return [];
    return games
      .filter((g) => g.homeTeamId === historyTeam.id || g.awayTeamId === historyTeam.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [games, historyTeam]);

  // 試合スコア集計ヘルパー
  const getGameScore = (g: (typeof games)[number]) => {
    const homeScore = g.events.filter((e) => e.teamId === g.homeTeamId).reduce((sum, e) => sum + e.points, 0);
    const awayScore = g.events.filter((e) => e.teamId === g.awayTeamId).reduce((sum, e) => sum + e.points, 0);
    return { homeScore, awayScore };
  };

  // マイチームとの対戦成績集計
  const myTeamRecord = useMemo(() => {
    if (!historyTeam || !myTeamId) return { wins: 0, losses: 0, draws: 0, count: 0 };
    const gamesVsMyTeam = games.filter(
      (g) =>
        (g.homeTeamId === historyTeam.id && g.awayTeamId === myTeamId) ||
        (g.awayTeamId === historyTeam.id && g.homeTeamId === myTeamId)
    );
    let wins = 0;
    let losses = 0;
    let draws = 0;
    gamesVsMyTeam.forEach((g) => {
      const { homeScore, awayScore } = getGameScore(g);
      const myScore = g.homeTeamId === myTeamId ? homeScore : awayScore;
      const oppScore = g.homeTeamId === myTeamId ? awayScore : homeScore;
      if (myScore > oppScore) wins++;
      else if (myScore < oppScore) losses++;
      else draws++;
    });
    return { wins, losses, draws, count: gamesVsMyTeam.length };
  }, [games, historyTeam, myTeamId]);

  const handleStartEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setName(team.name);
    setShortName(team.shortName);
    setColor(team.color);
    setSeasonYear(team.seasonYear || new Date().getFullYear());
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingTeamId(null);
    setName('');
    setShortName('');
    setColor('#ef4444');
    setSeasonYear(new Date().getFullYear());
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('チーム名を入力してください');
      return;
    }

    if (editingTeamId) {
      const existing = teams.find((t) => t.id === editingTeamId);
      if (existing) {
        updateTeam({
          ...existing,
          name: name.trim(),
          shortName: shortName.trim() || name.trim().slice(0, 4).toUpperCase(),
          color,
          seasonYear,
          isMyTeam: false,
        });
      }
    } else {
      addTeam({
        name: name.trim(),
        shortName: shortName.trim() || name.trim().slice(0, 4).toUpperCase(),
        color,
        seasonYear,
        isMyTeam: false,
      });
    }

    handleCancelEdit();
  };

  const handleDelete = (teamId: string, teamName: string) => {
    const pCount = players.filter((p) => p.teamId === teamId).length;
    let msg = `対戦チーム「${teamName}」を削除しますか？`;
    if (pCount > 0) {
      msg += `\n※所属する選手（${pCount}名）も一緒に削除されます。`;
    }
    if (window.confirm(msg)) {
      deleteTeam(teamId);
    }
  };

  return (
    <div className="space-y-6 pb-20">

      {/* 自チームリンク案内バー */}
      {myTeam && (
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ backgroundColor: myTeam.color }}
            />
            <span className="text-slate-400 truncate">
              自チーム: <strong className="text-white">{myTeam.shortName || myTeam.name}</strong>
            </span>
          </div>
          <button
            onClick={() => navigateTo('my_team')}
            className="text-orange-400 hover:text-orange-300 font-semibold shrink-0 ml-2 hover:underline"
          >
            マイチーム画面へ →
          </button>
        </div>
      )}

      {/* 登録 / 編集フォーム */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Shield className="w-4 h-4 text-orange-500" />
          <span>{editingTeamId ? '対戦相手チームを編集' : '新規対戦チームを登録'}</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              チーム名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 横浜クラブ、陵南高校"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                略称（2〜4文字）
              </label>
              <input
                type="text"
                maxLength={4}
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="例: YKH、RYN"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                活動年度 (年)
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={seasonYear}
                onChange={(e) => setSeasonYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                placeholder="2026"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ユニフォームカラー
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {COLOR_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition relative flex items-center justify-center ${
                    color === c
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <Check
                      className={`w-4 h-4 ${c === '#ffffff' ? 'text-black' : 'text-white'}`}
                    />
                  )}
                </button>
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                title="カスタムカラー"
                className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition"
            >
              {editingTeamId ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>変更を保存</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>対戦チームを登録</span>
                </>
              )}
            </button>
            {editingTeamId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2.5 px-3 rounded-xl text-xs transition"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 登録済み対戦相手チーム一覧 */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          登録済み対戦相手チーム ({opponentTeams.length})
        </h3>

        {opponentTeams.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-6 text-center text-slate-400 text-xs">
            対戦相手チームがまだ登録されていません。上のフォームから登録してください。
          </div>
        ) : (
          <div className="space-y-2">
            {opponentTeams.map((team) => {
              const teamPlayers = players.filter((p) => p.teamId === team.id);
              const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);

              return (
                <div
                  key={team.id}
                  className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 shadow-sm hover:border-slate-600 transition space-y-3"
                >
                  {/* 上段: ロゴ・チーム名・略称・編集/削除 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      {team.logoUrl ? (
                        <img
                          src={team.logoUrl}
                          alt={team.name}
                          className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-slate-700 shrink-0 shadow-sm"
                        />
                      ) : (
                        <div
                          className="w-3.5 h-10 rounded-md shadow-sm shrink-0"
                          style={{ backgroundColor: team.color }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-bold text-sm text-white truncate">{team.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono font-bold shrink-0">
                            {team.shortName}
                          </span>
                          {team.seasonYear && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30 shrink-0 font-mono">
                              {team.seasonYear}年度
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          選手: {teamPlayers.length}名
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(team)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition"
                        title="編集"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(team.id, team.name)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 下段: 対戦履歴ボタン・マイチーム指定ボタン・選手一覧リンク */}
                  <div className="pt-2 border-t border-slate-750 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setHistoryTeam(team)}
                      className="flex-1 py-1.5 px-2 bg-sky-950/70 hover:bg-sky-900/90 text-sky-300 hover:text-white rounded-xl text-xs font-bold border border-sky-600/40 transition flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
                    >
                      <History className="w-3.5 h-3.5 text-sky-400" />
                      <span>対戦履歴 ({teamGames.length}試合)</span>
                    </button>
                    <button
                      onClick={() => {
                        setMyTeamId(team.id);
                      }}
                      className="py-1.5 px-3 bg-slate-750 hover:bg-orange-600/30 text-slate-300 hover:text-orange-300 rounded-xl text-xs font-semibold border border-slate-650 transition flex items-center justify-center gap-1.5 active:scale-98"
                      title="このチームをマイチームに設定"
                    >
                      <Shield className="w-3.5 h-3.5 text-orange-400" />
                      <span>マイチームに指定</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 対戦履歴モーダル */}
      {historyTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* モーダルヘッダー */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                {historyTeam.logoUrl ? (
                  <img
                    src={historyTeam.logoUrl}
                    alt={historyTeam.name}
                    className="w-9 h-9 rounded-lg object-contain bg-slate-950 border border-slate-700 shrink-0"
                  />
                ) : (
                  <div
                    className="w-3.5 h-9 rounded shrink-0"
                    style={{ backgroundColor: historyTeam.color }}
                  />
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                    <History className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{historyTeam.shortName}（{historyTeam.name}）対戦履歴</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    全 {historyGames.length} 試合
                    {myTeam && myTeamRecord.count > 0 && (
                      <span className="ml-2 text-amber-300 font-bold">
                        vs {myTeam.shortName}: {myTeamRecord.wins}勝 {myTeamRecord.losses}敗{myTeamRecord.draws > 0 ? ` ${myTeamRecord.draws}分` : ''}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryTeam(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* モーダルコンテンツ: 過去の試合一覧 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyGames.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  <History className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-40" />
                  <p>このチームとの過去の対戦履歴はありません</p>
                </div>
              ) : (
                historyGames.map((g) => {
                  const { homeScore, awayScore } = getGameScore(g);
                  const isAgainstMyTeam = myTeamId && (g.homeTeamId === myTeamId || g.awayTeamId === myTeamId);
                  let resultBadge = null;

                  if (isAgainstMyTeam) {
                    const myIsHome = g.homeTeamId === myTeamId;
                    const myScore = myIsHome ? homeScore : awayScore;
                    const oppScore = myIsHome ? awayScore : homeScore;
                    if (myScore > oppScore) {
                      resultBadge = (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          WIN
                        </span>
                      );
                    } else if (myScore < oppScore) {
                      resultBadge = (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          LOSE
                        </span>
                      );
                    } else {
                      resultBadge = (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-600/30 text-slate-300 border border-slate-600">
                          DRAW
                        </span>
                      );
                    }
                  }

                  const homeTeamObj = teams.find((t) => t.id === g.homeTeamId);
                  const awayTeamObj = teams.find((t) => t.id === g.awayTeamId);

                  return (
                    <div
                      key={g.id}
                      className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 space-y-2.5 shadow hover:border-slate-600 transition"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono text-slate-300">{g.date}</span>
                          {g.tournamentName && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                              ({g.tournamentName})
                            </span>
                          )}
                        </div>
                        {resultBadge}
                      </div>

                      {/* スコアボード（略称表示） */}
                      <div className="flex items-center justify-between bg-slate-950/80 rounded-lg p-2.5 px-4 border border-slate-800">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: homeTeamObj?.color || '#94a3b8' }}
                          />
                          <span className="text-xs font-bold text-white truncate max-w-[90px]">
                            {homeTeamObj?.shortName || homeTeamObj?.name || 'HOME'}
                          </span>
                        </div>

                        <div className="text-sm font-mono font-black text-white px-3 flex items-center space-x-2">
                          <span className={homeScore > awayScore ? 'text-orange-400' : 'text-slate-300'}>
                            {homeScore}
                          </span>
                          <span className="text-slate-600">-</span>
                          <span className={awayScore > homeScore ? 'text-orange-400' : 'text-slate-300'}>
                            {awayScore}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 justify-end min-w-0">
                          <span className="text-xs font-bold text-white truncate max-w-[90px]">
                            {awayTeamObj?.shortName || awayTeamObj?.name || 'AWAY'}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: awayTeamObj?.color || '#94a3b8' }}
                          />
                        </div>
                      </div>

                      {/* 当時のスタッツ確認ボタン */}
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryTeam(null);
                          navigateTo('stats_view', { gameId: g.id });
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 hover:border-sky-500 text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm active:scale-98"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>当時のスタッツを確認</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* モーダルフッター */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryTeam(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
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
