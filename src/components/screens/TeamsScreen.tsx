import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Team } from '../../types';
import { Shield, Plus, Edit2, Trash2, ArrowLeft, Check, UserCheck } from 'lucide-react';

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
  const { teams, players, myTeamId, myTeam, setMyTeamId, addTeam, updateTeam, deleteTeam, navigateTo } = useApp();

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState('#ef4444');
  const [seasonYear, setSeasonYear] = useState<number>(new Date().getFullYear());
  const [error, setError] = useState('');

  // マイチーム以外の「対戦相手チーム」一覧
  const opponentTeams = teams.filter((t) => t.id !== myTeamId);

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
      {/* 画面ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateTo('home')}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">対戦相手チーム管理</h2>
            <p className="text-xs text-slate-400">試合の対戦相手チームを登録・管理します</p>
          </div>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 font-semibold">
          {opponentTeams.length} チーム
        </span>
      </div>

      {/* 自チームリンク案内バー */}
      {myTeam && (
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ backgroundColor: myTeam.color }}
            />
            <span className="text-slate-400 truncate">
              自チーム（マイチーム）: <strong className="text-white">{myTeam.name}</strong>
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

              return (
                <div
                  key={team.id}
                  className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex items-center justify-between shadow-sm hover:border-slate-600 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="w-4 h-10 rounded-md shadow-sm shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">{team.name}</span>
                        {team.seasonYear && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30 shrink-0 font-mono">
                            {team.seasonYear}年度
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono shrink-0">
                          {team.shortName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-3">
                        <button
                          onClick={() => navigateTo('players')}
                          className="hover:text-slate-200 flex items-center gap-1"
                        >
                          <UserCheck className="w-3 h-3 text-slate-500" />
                          <span>選手: {teamPlayers.length} 名</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => {
                        setMyTeamId(team.id);
                      }}
                      className="px-2 py-1 bg-slate-700 hover:bg-orange-600/30 text-slate-300 hover:text-orange-300 rounded-lg text-[11px] font-semibold border border-slate-600 transition flex items-center gap-1"
                      title="このチームをマイチームに設定"
                    >
                      <Shield className="w-3 h-3 text-orange-400" />
                      <span>マイチームに指定</span>
                    </button>
                    <button
                      onClick={() => handleStartEdit(team)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg transition"
                      title="編集"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(team.id, team.name)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg transition"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
