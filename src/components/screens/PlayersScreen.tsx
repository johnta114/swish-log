import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { Player } from '../../types';
import { Users, Plus, Edit2, Trash2, ArrowLeft, Check } from 'lucide-react';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

export const PlayersScreen: React.FC = () => {
  const { teams, players, addPlayer, updatePlayer, deletePlayer, navigateTo } = useApp();

  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    return teams.length > 0 ? teams[0].id : '';
  });

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [number, setNumber] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [position, setPosition] = useState<string>('PG');
  const [error, setError] = useState<string>('');

  const currentTeam = teams.find((t) => t.id === selectedTeamId);

  const teamPlayers = useMemo(() => {
    return players
      .filter((p) => p.teamId === selectedTeamId)
      .sort((a, b) => a.number - b.number);
  }, [players, selectedTeamId]);

  const handleStartEdit = (p: Player) => {
    setEditingPlayerId(p.id);
    setNumber(p.number.toString());
    setName(p.name);
    setPosition(p.position || 'PG');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingPlayerId(null);
    setNumber('');
    setName('');
    setPosition('PG');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError('チームを選択してください');
      return;
    }
    const numVal = parseInt(number, 10);
    if (isNaN(numVal) || numVal < 0 || numVal > 99) {
      setError('背番号は 0〜99 の数値を入力してください');
      return;
    }
    if (!name.trim()) {
      setError('選手氏名を入力してください');
      return;
    }

    // 重複背番号チェック（同じチーム内）
    const duplicate = teamPlayers.find(
      (p) => p.number === numVal && p.id !== editingPlayerId
    );
    if (duplicate) {
      setError(`背番号 #${numVal} はすでに登録されています（${duplicate.name}）`);
      return;
    }

    if (editingPlayerId) {
      const existing = players.find((p) => p.id === editingPlayerId);
      if (existing) {
        updatePlayer({
          ...existing,
          number: numVal,
          name: name.trim(),
          position,
        });
      }
    } else {
      addPlayer({
        teamId: selectedTeamId,
        number: numVal,
        name: name.trim(),
        position,
      });
    }

    handleCancelEdit();
  };

  const handleDelete = (playerId: string, playerName: string) => {
    if (window.confirm(`選手「${playerName}」を削除しますか？`)) {
      deletePlayer(playerId);
      if (editingPlayerId === playerId) {
        handleCancelEdit();
      }
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
          <h2 className="text-lg font-bold text-white">選手登録・管理</h2>
        </div>
        <button
          onClick={() => navigateTo('teams')}
          className="text-xs text-orange-400 hover:underline"
        >
          チーム追加
        </button>
      </div>

      {/* チーム選択タブ・セレクター */}
      {teams.length === 0 ? (
        <div className="bg-slate-800/60 border border-dashed border-slate-700 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-slate-300">
            選手を登録するには、まずチームを登録してください。
          </p>
          <button
            onClick={() => navigateTo('teams')}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition"
          >
            チーム登録画面へ
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 px-1">
              対象チームを選択
            </label>
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTeamId(t.id);
                    handleCancelEdit();
                  }}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                    selectedTeamId === t.id
                      ? 'bg-slate-800 border-orange-500 text-white shadow-md'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 選手登録・編集フォーム */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-orange-500" />
                <span>
                  {editingPlayerId
                    ? '選手情報を編集'
                    : `「${currentTeam?.name}」に選手を追加`}
                </span>
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {/* 背番号 */}
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    背番号 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="例: 7"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                {/* 選手氏名 */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    選手氏名 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 佐藤 翔太"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* ポジション選択 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ポジション（任意）
                </label>
                <div className="flex gap-1.5">
                  {POSITIONS.map((pos) => (
                    <button
                      type="button"
                      key={pos}
                      onClick={() => setPosition(pos)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                        position === pos
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition"
                >
                  {editingPlayerId ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>変更を保存</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>選手を追加</span>
                    </>
                  )}
                </button>
                {editingPlayerId && (
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

          {/* 所属選手一覧（背番号順） */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                登録選手一覧 ({teamPlayers.length} 名)
              </h3>
              <span className="text-[11px] text-slate-500">背番号順</span>
            </div>

            {teamPlayers.length === 0 ? (
              <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-6 text-center text-slate-400 text-xs">
                このチームにはまだ選手が登録されていません。
              </div>
            ) : (
              <div className="space-y-2">
                {teamPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      {/* 背番号バッジ */}
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 font-mono font-black text-orange-400 text-base flex items-center justify-center shadow-inner">
                        #{player.number}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white">
                            {player.name}
                          </span>
                          {player.position && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">
                              {player.position}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStartEdit(player)}
                        className="p-2 text-slate-400 hover:text-white rounded-lg transition"
                        title="編集"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(player.id, player.name)}
                        className="p-2 text-slate-400 hover:text-red-400 rounded-lg transition"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
