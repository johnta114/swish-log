import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { Player } from '../../types';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  BarChart2,
  Sparkles,
  History,
  Check,
  X,
  Users,
} from 'lucide-react';

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

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const GRADE_PRESETS = ['1年', '2年', '3年', '4年', '一般'];

export const MyTeamScreen: React.FC = () => {
  const {
    teams,
    players,
    games,
    myTeamId,
    myTeam,
    setMyTeamId,
    addTeam,
    updateTeam,
    addPlayer,
    updatePlayer,
    deletePlayer,
    navigateTo,
  } = useApp();

  // マイチーム候補一覧（isMyTeam が true の全チーム、または現在の myTeam）
  const myTeamList = useMemo(() => {
    return teams.filter((t) => t.isMyTeam || t.id === myTeamId);
  }, [teams, myTeamId]);

  // チーム編集モーダル状態
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamShortName, setTeamShortName] = useState('');
  const [teamColor, setTeamColor] = useState('#3b82f6');
  const [teamYear, setTeamYear] = useState<number>(new Date().getFullYear());
  const [teamError, setTeamError] = useState('');

  // 新年度チーム引き継ぎ作成モーダル状態
  const [isNewSeasonModalOpen, setIsNewSeasonModalOpen] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState<number>(new Date().getFullYear() + 1);
  const [carryOverPlayerIds, setCarryOverPlayerIds] = useState<string[]>([]);
  const [newSeasonError, setNewSeasonError] = useState('');

  // 選手追加・編集モーダル状態
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerPosition, setPlayerPosition] = useState('PG');
  const [playerGrade, setPlayerGrade] = useState('');
  const [playerError, setPlayerError] = useState('');

  // マイチーム所属選手
  const myTeamPlayers = useMemo(() => {
    if (!myTeamId) return [];
    return players
      .filter((p) => p.teamId === myTeamId)
      .sort((a, b) => a.number - b.number);
  }, [players, myTeamId]);

  // マイチームの戦績サマリー計算
  const teamStatsSummary = useMemo(() => {
    if (!myTeamId) return { totalGames: 0, wins: 0, losses: 0, ties: 0, totalPts: 0 };
    const myGames = games.filter(
      (g) => g.homeTeamId === myTeamId || g.awayTeamId === myTeamId
    );
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let totalPts = 0;

    myGames.forEach((g) => {
      const isHome = g.homeTeamId === myTeamId;
      let homeScore = 0;
      let awayScore = 0;
      g.events.forEach((ev) => {
        if (ev.points > 0) {
          if (ev.teamId === g.homeTeamId) homeScore += ev.points;
          else if (ev.teamId === g.awayTeamId) awayScore += ev.points;
        }
      });
      const myScore = isHome ? homeScore : awayScore;
      const oppScore = isHome ? awayScore : homeScore;
      totalPts += myScore;

      if (g.status === 'finished') {
        if (myScore > oppScore) wins++;
        else if (myScore < oppScore) losses++;
        else ties++;
      }
    });

    return {
      totalGames: myGames.length,
      wins,
      losses,
      ties,
      totalPts,
    };
  }, [games, myTeamId]);

  // チーム編集開始
  const handleOpenTeamEdit = () => {
    if (myTeam) {
      setTeamName(myTeam.name);
      setTeamShortName(myTeam.shortName);
      setTeamColor(myTeam.color);
      setTeamYear(myTeam.seasonYear || new Date().getFullYear());
    } else {
      setTeamName('');
      setTeamShortName('');
      setTeamColor('#3b82f6');
      setTeamYear(new Date().getFullYear());
    }
    setTeamError('');
    setIsEditingTeam(true);
  };

  // マイチーム解除
  const handleUnsetMyTeam = () => {
    if (window.confirm('マイチームの設定を解除しますか？\n（登録データは対戦チーム一覧に残ります）')) {
      setMyTeamId(null);
      setIsEditingTeam(false);
    }
  };

  // チーム保存
  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setTeamError('チーム名を入力してください');
      return;
    }

    if (myTeam) {
      updateTeam({
        ...myTeam,
        name: teamName.trim(),
        shortName: teamShortName.trim() || teamName.trim().slice(0, 4).toUpperCase(),
        color: teamColor,
        seasonYear: teamYear,
        isMyTeam: true,
      });
    } else {
      const newTeam = addTeam({
        name: teamName.trim(),
        shortName: teamShortName.trim() || teamName.trim().slice(0, 4).toUpperCase(),
        color: teamColor,
        seasonYear: teamYear,
        isMyTeam: true,
      });
      setMyTeamId(newTeam.id);
    }

    setIsEditingTeam(false);
  };

  // 新年度チーム作成モーダル開始
  const handleOpenNewSeason = () => {
    if (!myTeam) return;
    const nextYear = (myTeam.seasonYear || new Date().getFullYear()) + 1;
    setNewSeasonYear(nextYear);
    // 現在の所属選手全員をデフォルト選択
    setCarryOverPlayerIds(myTeamPlayers.map((p) => p.id));
    setNewSeasonError('');
    setIsNewSeasonModalOpen(true);
  };

  // 新年度チーム作成実行（選手引き継ぎ）
  const handleCreateNewSeasonTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam) return;

    if (!newSeasonYear || isNaN(newSeasonYear)) {
      setNewSeasonError('年度を正しく入力してください');
      return;
    }

    // 1. 新年度チームを作成
    const newTeam = addTeam({
      name: myTeam.name,
      shortName: myTeam.shortName,
      color: myTeam.color,
      seasonYear: newSeasonYear,
      isMyTeam: true,
    });

    // 2. 選択された選手を新チームの選手として複製・引き継ぎ
    const playersToCarry = myTeamPlayers.filter((p) => carryOverPlayerIds.includes(p.id));
    for (const p of playersToCarry) {
      // 学年を1つ進める（例: 1年→2年、2年→3年）
      let nextGrade = p.grade;
      if (p.grade === '1年') nextGrade = '2年';
      else if (p.grade === '2年') nextGrade = '3年';
      else if (p.grade === '3年') nextGrade = '4年';
      else if (p.grade === '4年') nextGrade = 'OB/OG';

      addPlayer({
        teamId: newTeam.id,
        number: p.number,
        name: p.name,
        position: p.position,
        grade: nextGrade,
        numberHistory: p.numberHistory ? [...p.numberHistory] : undefined,
      });
    }

    // 3. 新年度チームをアクティブなマイチームに指定
    setMyTeamId(newTeam.id);
    setIsNewSeasonModalOpen(false);
  };

  // 選手追加開始
  const handleOpenAddPlayer = () => {
    if (!myTeamId) return;
    setEditingPlayerId(null);
    setPlayerNumber('');
    setPlayerName('');
    setPlayerPosition('PG');
    setPlayerGrade('');
    setPlayerError('');
    setIsPlayerModalOpen(true);
  };

  // 選手編集開始
  const handleOpenEditPlayer = (p: Player) => {
    setEditingPlayerId(p.id);
    setPlayerNumber(p.number.toString());
    setPlayerName(p.name);
    setPlayerPosition(p.position || 'PG');
    setPlayerGrade(p.grade || '');
    setPlayerError('');
    setIsPlayerModalOpen(true);
  };

  // 選手保存
  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeamId) return;

    const numVal = parseInt(playerNumber, 10);
    if (isNaN(numVal) || numVal < 0 || numVal > 99) {
      setPlayerError('背番号は 0〜99 の数値を入力してください');
      return;
    }
    if (!playerName.trim()) {
      setPlayerError('選手氏名を入力してください');
      return;
    }

    // 同チーム内の背番号重複チェック
    const duplicate = myTeamPlayers.find(
      (p) => p.number === numVal && p.id !== editingPlayerId
    );
    if (duplicate) {
      setPlayerError(`背番号 #${numVal} はすでに登録されています（${duplicate.name}）`);
      return;
    }

    if (editingPlayerId) {
      const existing = players.find((p) => p.id === editingPlayerId);
      if (existing) {
        updatePlayer({
          ...existing,
          number: numVal,
          name: playerName.trim(),
          position: playerPosition,
          grade: playerGrade.trim() || undefined,
        });
      }
    } else {
      addPlayer({
        teamId: myTeamId,
        number: numVal,
        name: playerName.trim(),
        position: playerPosition,
        grade: playerGrade.trim() || undefined,
      });
    }

    setIsPlayerModalOpen(false);
  };

  // 選手削除
  const handleDeletePlayer = (playerId: string, pName: string, pNum: number) => {
    if (window.confirm(`「#${pNum} ${pName}」をマイチームから削除しますか？`)) {
      deletePlayer(playerId);
    }
  };

  // 現在編集対象の選手オブジェクト（背番号履歴表示用）
  const editingPlayer = editingPlayerId
    ? players.find((p) => p.id === editingPlayerId)
    : null;

  return (
    <div className="space-y-6 pb-20">
      {/* 画面ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
              マイチーム管理
              <span className="text-[10px] bg-orange-500/20 text-orange-300 font-semibold px-2 py-0.5 rounded-full border border-orange-500/30">
                自チーム専用
              </span>
            </h2>
            <p className="text-xs text-slate-400">所属選手・登録情報・通算スタッツを一元管理</p>
          </div>
        </div>

        {myTeam && (
          <div className="flex items-center space-x-2">
            {myTeamList.length > 1 && (
              <select
                value={myTeam.id}
                onChange={(e) => setMyTeamId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-orange-400 font-bold rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                {myTeamList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.seasonYear ? `${t.seasonYear}年度` : t.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleOpenNewSeason}
              className="flex items-center space-x-1 text-xs bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 px-2.5 py-1.5 rounded-lg transition font-semibold"
              title="前年度の所属選手を引き継いで新年度チームを作成"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新年度チーム</span>
            </button>

            <button
              onClick={handleOpenTeamEdit}
              className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
              <span>設定</span>
            </button>
          </div>
        )}
      </div>

      {/* マイチーム未登録状態 */}
      {!myTeam ? (
        <div className="bg-slate-800/80 border border-dashed border-slate-700 rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">マイチームがまだ登録されていません</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              あなたの所属チームやクラブを登録すると、試合スコアの記録や通算スタッツの集計が自チーム中心にスムーズに行えます。
            </p>
          </div>
          {teams.length > 0 && (
            <div className="pt-2 border-t border-slate-700/60 max-w-xs mx-auto text-left">
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                登録済みチームからマイチームに指定する:
              </label>
              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) setMyTeamId(e.target.value);
                  }}
                  defaultValue=""
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="" disabled>
                    チームを選択...
                  </option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.seasonYear ? `[${t.seasonYear}年度] ` : ''}{t.name} ({t.shortName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="pt-2">
            <button
              onClick={handleOpenTeamEdit}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>新しくマイチームを作成する</span>
            </button>
          </div>
        </div>
      ) : (
        /* マイチーム登録済みメイン表示 */
        <div className="space-y-4">
          {/* チームカード */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: myTeam.color }}
            />

            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-inner border border-white/20 shrink-0"
                  style={{
                    backgroundColor: myTeam.color,
                    color: myTeam.color === '#ffffff' ? '#0f172a' : '#ffffff',
                  }}
                >
                  {myTeam.shortName}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-black text-white">{myTeam.name}</h3>
                    {myTeam.seasonYear && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40">
                        {myTeam.seasonYear}年度
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">
                      {myTeam.shortName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    所属選手: <span className="text-white font-semibold">{myTeamPlayers.length}名</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 戦績クイックサマリー */}
            <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800">
                <div className="text-[10px] text-slate-400">試合数</div>
                <div className="text-sm font-bold text-white mt-0.5">{teamStatsSummary.totalGames}</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800">
                <div className="text-[10px] text-slate-400">勝敗</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {teamStatsSummary.wins}勝 {teamStatsSummary.losses}敗
                </div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800">
                <div className="text-[10px] text-slate-400">総得点</div>
                <div className="text-sm font-bold text-orange-400 mt-0.5">{teamStatsSummary.totalPts}</div>
              </div>
              <button
                onClick={() => navigateTo('total_stats')}
                className="bg-orange-500/10 hover:bg-orange-500/20 active:scale-95 rounded-xl p-2 border border-orange-500/30 flex flex-col items-center justify-center text-orange-400 transition"
              >
                <BarChart2 className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[10px] font-bold">詳細スタッツ</span>
              </button>
            </div>
          </div>

          {/* 所属選手一覧セクション */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-white">
                  所属選手一覧{' '}
                  <span className="text-xs text-slate-400 font-normal">({myTeamPlayers.length}名)</span>
                </h3>
              </div>
              <button
                onClick={handleOpenAddPlayer}
                className="flex items-center space-x-1 text-xs bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>選手を追加</span>
              </button>
            </div>

            {myTeamPlayers.length === 0 ? (
              <div className="bg-slate-800/40 border border-dashed border-slate-700/80 rounded-xl p-6 text-center">
                <p className="text-xs text-slate-400">所属選手がまだ登録されていません。</p>
                <button
                  onClick={handleOpenAddPlayer}
                  className="mt-3 inline-flex items-center space-x-1 text-xs text-orange-400 hover:text-orange-300 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>最初の選手を登録する</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {myTeamPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 rounded-xl p-3 flex items-center justify-between transition group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-700/80 border border-slate-600 flex items-center justify-center text-sm font-black text-white shrink-0 font-mono shadow-sm">
                        #{player.number}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">{player.name}</span>
                          {player.position && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono font-medium">
                              {player.position}
                            </span>
                          )}
                          {player.grade && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/50">
                              {player.grade}
                            </span>
                          )}
                        </div>

                        {/* 旧背番号履歴 */}
                        {player.numberHistory && player.numberHistory.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                            <History className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>旧番号:</span>
                            <span className="font-mono text-slate-300">
                              {player.numberHistory.map((h) => `#${h.number}`).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditPlayer(player)}
                        title="選手情報を編集"
                        className="p-1.5 text-slate-400 hover:text-sky-400 rounded-lg hover:bg-slate-700/50 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(player.id, player.name, player.number)}
                        title="選手を削除"
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700/50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* チーム設定・編集モーダル */}
      {isEditingTeam && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-400" />
                {myTeam ? 'マイチーム情報の設定' : '新規マイチームの作成'}
              </h3>
              <button
                onClick={() => setIsEditingTeam(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {teamError && (
              <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300">
                {teamError}
              </div>
            )}

            <form onSubmit={handleSaveTeam} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">チーム名 *</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="例: 青山クラブ、渋谷高校"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    略称 (2〜4文字)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={teamShortName}
                    onChange={(e) => setTeamShortName(e.target.value)}
                    placeholder="例: AYM、SBH"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 uppercase font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    活動年度 (年)
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={teamYear}
                    onChange={(e) => setTeamYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                    placeholder="2026"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">チームカラー</label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTeamColor(c)}
                      className={`h-8 rounded-lg border-2 flex items-center justify-center transition ${
                        teamColor === c ? 'border-white scale-105 shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {teamColor === c && (
                        <Check
                          className={`w-4 h-4 ${c === '#ffffff' ? 'text-black' : 'text-white'}`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {myTeam ? (
                  <button
                    type="button"
                    onClick={handleUnsetMyTeam}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium py-1.5"
                  >
                    マイチーム設定を解除
                  </button>
                ) : <div />}

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingTeam(false)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md active:scale-95 transition"
                  >
                    保存する
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新年度チーム引き継ぎ作成モーダル */}
      {isNewSeasonModalOpen && myTeam && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-orange-400" />
                  新年度チームの作成（選手引き継ぎ）
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  「{myTeam.name}」の選手を引き継いで新チームを作成します
                </p>
              </div>
              <button
                onClick={() => setIsNewSeasonModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newSeasonError && (
              <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300">
                {newSeasonError}
              </div>
            )}

            <form onSubmit={handleCreateNewSeasonTeam} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  新しい活動年度 (年) *
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={newSeasonYear}
                  onChange={(e) => setNewSeasonYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    引き継ぐ選手を選択 ({carryOverPlayerIds.length}/{myTeamPlayers.length}名)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (carryOverPlayerIds.length === myTeamPlayers.length) {
                        setCarryOverPlayerIds([]);
                      } else {
                        setCarryOverPlayerIds(myTeamPlayers.map((p) => p.id));
                      }
                    }}
                    className="text-[11px] text-orange-400 hover:underline"
                  >
                    {carryOverPlayerIds.length === myTeamPlayers.length ? '全解除' : '全選択'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  {myTeamPlayers.map((p) => {
                    const isChecked = carryOverPlayerIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                          isChecked ? 'bg-orange-500/15 text-white' : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCarryOverPlayerIds((prev) => [...prev, p.id]);
                              } else {
                                setCarryOverPlayerIds((prev) => prev.filter((id) => id !== p.id));
                              }
                            }}
                            className="rounded border-slate-700 text-orange-500 focus:ring-orange-500"
                          />
                          <span className="font-mono font-bold">#{p.number}</span>
                          <span>{p.name}</span>
                        </div>
                        {p.grade && (
                          <span className="text-[10px] text-slate-500">
                            現在: {p.grade}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  ※引き継ぎ時、学年は自動的に+1年（例: 1年→2年、3年→4年）繰り上がります。
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewSeasonModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md active:scale-95 transition"
                >
                  新年度チームを作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 選手追加・編集モーダル */}
      {isPlayerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                {editingPlayerId ? 'マイチーム選手の編集' : 'マイチームに選手を追加'}
              </h3>
              <button
                onClick={() => setIsPlayerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {playerError && (
              <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300">
                {playerError}
              </div>
            )}

            <form onSubmit={handleSavePlayer} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">背番号 *</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(e.target.value)}
                    placeholder="7"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-orange-500"
                    autoFocus
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ポジション</label>
                  <select
                    value={playerPosition}
                    onChange={(e) => setPlayerPosition(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">選手氏名 *</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="例: 田中 太郎"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  学年 / カテゴリ (任意)
                </label>
                <div className="flex gap-1.5 mb-1.5 flex-wrap">
                  {GRADE_PRESETS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setPlayerGrade(g)}
                      className={`text-[11px] px-2 py-1 rounded-lg border transition ${
                        playerGrade === g
                          ? 'bg-sky-500 text-white border-sky-400 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={playerGrade}
                  onChange={(e) => setPlayerGrade(e.target.value)}
                  placeholder="直接入力も可能（例: 2年、主将、社会人）"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* 背番号変更時の履歴プレビュー */}
              {editingPlayer && editingPlayer.numberHistory && editingPlayer.numberHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>過去の背番号履歴:</span>
                  </div>
                  <div className="space-y-1">
                    {editingPlayer.numberHistory.map((h, i) => (
                      <div
                        key={i}
                        className="text-[11px] bg-slate-800/80 px-2 py-1 rounded text-slate-300 font-mono flex items-center justify-between"
                      >
                        <span>旧 #{h.number}</span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(h.changedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPlayerModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md active:scale-95 transition"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
