import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Team } from '../../types';
import { Shield, Plus, Edit2, Trash2, ArrowLeft, Check } from 'lucide-react';

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
  const { teams, players, addTeam, updateTeam, deleteTeam, navigateTo } = useApp();

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState('#ef4444');
  const [error, setError] = useState('');

  const handleStartEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setName(team.name);
    setShortName(team.shortName);
    setColor(team.color);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingTeamId(null);
    setName('');
    setShortName('');
    setColor('#ef4444');
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
        });
      }
    } else {
      addTeam({
        name: name.trim(),
        shortName: shortName.trim() || name.trim().slice(0, 4).toUpperCase(),
        color,
      });
    }

    handleCancelEdit();
  };

  const handleDelete = (teamId: string, teamName: string) => {
    const pCount = players.filter((p) => p.teamId === teamId).length;
    let msg = `チーム「${teamName}」を削除しますか？`;
    if (pCount > 0) {
      msg += `\n※所属する選手（${pCount}名）も一緒に削除されます。`;
    }
    if (window.confirm(msg)) {
      deleteTeam(teamId);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 画面ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateTo('home')}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-white">チーム登録・管理</h2>
        </div>
        <span className="text-xs text-slate-400">{teams.length} チーム</span>
      </div>

      {/* 登録 / 編集フォーム */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Shield className="w-4 h-4 text-orange-500" />
          <span>{editingTeamId ? 'チームを編集' : '新規チームを登録'}</span>
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
              placeholder="例: 湘北高校、レッド・ファルコンズ"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              チーム略称（UI表示用・2〜6文字）
            </label>
            <input
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="例: SHOHOKU, RF"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              チームカラー（識別色）
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {COLOR_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition relative flex items-center justify-center ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
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
                  <span>チームを登録</span>
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

      {/* 登録済みチーム一覧 */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          登録済みチーム ({teams.length})
        </h3>

        {teams.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-6 text-center text-slate-400 text-xs">
            登録されたチームがありません。上のフォームから登録してください。
          </div>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => {
              const teamPlayers = players.filter((p) => p.teamId === team.id);

              return (
                <div
                  key={team.id}
                  className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-9 rounded-md shadow-sm"
                      style={{ backgroundColor: team.color }}
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{team.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                          {team.shortName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        選手: {teamPlayers.length} 名
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
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
