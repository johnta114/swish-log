import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { storage } from '../../utils/storage';
import {
  Play,
  ArrowLeft,
  Calendar,
  Trophy,
  AlertCircle,
  Shield,
  MapPin,
  ExternalLink,
  ClipboardPaste,
  Video,
  CheckSquare,
  Square,
} from 'lucide-react';

export const NewGameScreen: React.FC = () => {
  const { teams, players, myTeamId, createGame, navigateTo } = useApp();

  const [date, setDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [tournamentName, setTournamentName] = useState<string>('');
  const [venue, setVenue] = useState<string>('');
  const [venueUrl, setVenueUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [venueHistory, setVenueHistory] = useState<string[]>([]);
  const [isU12, setIsU12] = useState<boolean>(false);
  const [homeTeamId, setHomeTeamId] = useState<string>('');

  useEffect(() => {
    setVenueHistory(storage.getVenueHistory());
  }, []);

  const [awayTeamId, setAwayTeamId] = useState<string>('');
  const [homeRoster, setHomeRoster] = useState<string[]>([]);
  const [awayRoster, setAwayRoster] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  // 初期チーム設定（マイチーム優先）
  useEffect(() => {
    if (teams.length >= 2) {
      if (!homeTeamId) {
        if (myTeamId && teams.some((t) => t.id === myTeamId)) {
          setHomeTeamId(myTeamId);
          const otherTeam = teams.find((t) => t.id !== myTeamId);
          if (otherTeam && !awayTeamId) {
            setAwayTeamId(otherTeam.id);
          }
        } else {
          setHomeTeamId(teams[0].id);
          if (!awayTeamId) setAwayTeamId(teams[1].id);
        }
      }
    } else if (teams.length === 1) {
      if (!homeTeamId) setHomeTeamId(teams[0].id);
    }
  }, [teams, myTeamId]);

  // ホームチームの選手が変更されたら全選手をデフォルト選択
  useEffect(() => {
    if (homeTeamId) {
      const pIds = players.filter((p) => p.teamId === homeTeamId).map((p) => p.id);
      setHomeRoster(pIds);
    } else {
      setHomeRoster([]);
    }
  }, [homeTeamId, players]);

  // アウェイチームの選手が変更されたら全選手をデフォルト選択
  useEffect(() => {
    if (awayTeamId) {
      const pIds = players.filter((p) => p.teamId === awayTeamId).map((p) => p.id);
      setAwayRoster(pIds);
    } else {
      setAwayRoster([]);
    }
  }, [awayTeamId, players]);

  const homeTeam = teams.find((t) => t.id === homeTeamId);
  const awayTeam = teams.find((t) => t.id === awayTeamId);

  const homePlayers = players
    .filter((p) => p.teamId === homeTeamId)
    .sort((a, b) => a.number - b.number);
  const awayPlayers = players
    .filter((p) => p.teamId === awayTeamId)
    .sort((a, b) => a.number - b.number);

  const toggleHomePlayer = (id: string) => {
    setHomeRoster((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleAwayPlayer = (id: string) => {
    setAwayRoster((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSelectAllHome = () => {
    if (homeRoster.length === homePlayers.length) {
      setHomeRoster([]);
    } else {
      setHomeRoster(homePlayers.map((p) => p.id));
    }
  };

  const handleSelectAllAway = () => {
    if (awayRoster.length === awayPlayers.length) {
      setAwayRoster([]);
    } else {
      setAwayRoster(awayPlayers.map((p) => p.id));
    }
  };

  const handlePasteMapUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setVenueUrl(text.trim());
    } catch {
      // 権限エラー時は手動入力を促す
    }
  };

  const handleOpenGoogleMaps = () => {
    const query = venue.trim() || '体育館';
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  };

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeamId || !awayTeamId) {
      setError('ホームチームとアウェイチームの両方を選択してください');
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError('異なる2つのチームを選択してください');
      return;
    }
    if (homeRoster.length === 0) {
      setError(`ホームチーム（${homeTeam?.name}）の出場選手を最低1名選択してください`);
      return;
    }
    if (awayRoster.length === 0) {
      setError(`アウェイチーム（${awayTeam?.name}）の出場選手を最低1名選択してください`);
      return;
    }

    const newGame = createGame({
      date,
      tournamentName: tournamentName.trim() || undefined,
      venue: venue.trim() || undefined,
      venueUrl: venueUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      homeTeamId,
      awayTeamId,
      homeRosterPlayerIds: homeRoster,
      awayRosterPlayerIds: awayRoster,
      homeOnCourtPlayerIds: homeRoster.slice(0, 5),
      awayOnCourtPlayerIds: awayRoster.slice(0, 5),
      isU12,
    });

    navigateTo('live_game', { gameId: newGame.id });
  };

  if (teams.length < 2) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateTo('home')}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-white">新規試合の登録</h2>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-white">
              チームが不足しています
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              試合を作成するには、最低2つのチームの登録が必要です。
            </p>
          </div>
          <button
            onClick={() => navigateTo('teams')}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow"
          >
            チーム登録画面へ行く
          </button>
        </div>
      </div>
    );
  }

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
          <h2 className="text-lg font-bold text-white">新規試合の登録</h2>
        </div>
      </div>

      <form onSubmit={handleStartGame} className="space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 基本情報 */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            試合情報
          </h3>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                <span>開催日</span>
              </label>
              <button
                type="button"
                onClick={() => setDate(new Date().toISOString().split('T')[0])}
                className="text-[11px] text-orange-400 hover:text-orange-300 font-bold px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 active:scale-95 transition"
              >
                今日
              </button>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 bg-slate-900 border border-slate-700 rounded-xl px-3.5 text-sm text-white focus:outline-none focus:border-orange-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>大会名 / マッチ名（任意）</span>
            </label>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="例: ウィンターカップ予選 準決勝"
              className="w-full h-11 bg-slate-900 border border-slate-700 rounded-xl px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* 試合会場入力欄 & マップURL紐づけ */}
          <div className="space-y-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                <span>試合会場 / 体育館名（任意）</span>
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="例: 市民総合体育館、代々木第二体育館"
                className="w-full h-11 bg-slate-900 border border-slate-700 rounded-xl px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* 過去会場履歴のクイック選択チップ */}
            {venueHistory.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400">よく使う会場:</span>
                {venueHistory.slice(0, 4).map((hist, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setVenue(hist)}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition ${
                      venue === hist
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-semibold'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    {hist}
                  </button>
                ))}
              </div>
            )}

            {/* マップURL入力 & 連携 */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>マップURL（Googleマップ・Appleマップ等）</span>
                </label>
                <button
                  type="button"
                  onClick={handleOpenGoogleMaps}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center space-x-0.5 hover:underline font-medium"
                  title="Googleマップを開いて会場を検索"
                >
                  <span>Googleマップで探す</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="flex space-x-1.5">
                <input
                  type="url"
                  value={venueUrl}
                  onChange={(e) => setVenueUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... または共有リンク"
                  className="flex-1 h-10 bg-slate-900 border border-slate-700 rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handlePasteMapUrl}
                  className="px-3 h-10 bg-slate-800 hover:bg-slate-750 active:scale-95 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition shrink-0 shadow-sm"
                  title="クリップボードから貼り付け"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-orange-400" />
                  <span>貼付</span>
                </button>
              </div>
            </div>

            {/* 試合動画URL（YouTube） */}
            <div className="pt-1">
              <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <Video className="w-3.5 h-3.5 text-red-400" />
                <span>試合動画URL（YouTubeなど・後からでも追加可能）</span>
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="例: https://www.youtube.com/watch?v=...（後から登録可）"
                className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* U12モード（ミニバス）トグル */}
          <div className="pt-1 border-t border-slate-700/60">
            <label className="flex items-start space-x-3 p-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl cursor-pointer hover:border-orange-500/50 transition">
              <input
                type="checkbox"
                checked={isU12}
                onChange={(e) => setIsU12(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-orange-500 rounded bg-slate-800 border-slate-600 focus:ring-orange-500 focus:ring-offset-slate-900"
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-white">U12モード（ミニバス）を適用</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold border border-amber-500/30">
                    3Pなし
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  ミニバス規則に準拠し、3ポイントシュートは適用されず、全シュートが2点として集計されます。
                </p>
              </div>
            </label>
          </div>
        </div>


        {/* 対戦チーム選択 */}
        <div className="grid grid-cols-2 gap-3">
          {/* ホームチーム */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>ホームチーム</span>
              </div>
              {homeTeamId === myTeamId && (
                <span className="text-[10px] text-orange-400 flex items-center space-x-0.5 font-bold">
                  <Shield className="w-2.5 h-2.5" />
                  <span>自チーム</span>
                </span>
              )}
            </div>
            <select
              value={homeTeamId}
              onChange={(e) => setHomeTeamId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-orange-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === awayTeamId}>
                  {t.id === myTeamId ? `🛡️ ${t.name} (マイチーム)` : t.name}
                </option>
              ))}
            </select>
            {homeTeam && (
              <div
                className="h-1.5 rounded-full"
                style={{ backgroundColor: homeTeam.color }}
              />
            )}
          </div>

          {/* アウェイチーム */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>アウェイチーム</span>
              </div>
              {awayTeamId === myTeamId && (
                <span className="text-[10px] text-orange-400 flex items-center space-x-0.5 font-bold">
                  <Shield className="w-2.5 h-2.5" />
                  <span>自チーム</span>
                </span>
              )}
            </div>
            <select
              value={awayTeamId}
              onChange={(e) => setAwayTeamId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-orange-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === homeTeamId}>
                  {t.id === myTeamId ? `🛡️ ${t.name} (マイチーム)` : t.name}
                </option>
              ))}
            </select>
            {awayTeam && (
              <div
                className="h-1.5 rounded-full"
                style={{ backgroundColor: awayTeam.color }}
              />
            )}
          </div>
        </div>

        {/* 出場登録選手（ベンチ入り選手）チェック */}
        <div className="space-y-4">
          {/* ホーム出場選手 */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: homeTeam?.color }}
                />
                <h4 className="text-xs font-bold text-white">
                  {homeTeam?.name} 出場選手 ({homeRoster.length}/{homePlayers.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={handleSelectAllHome}
                className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold"
              >
                {homeRoster.length === homePlayers.length ? '全解除' : '全選択'}
              </button>
            </div>

            {homePlayers.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                選手が登録されていません。「選手管理」から登録してください。
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {homePlayers.map((p) => {
                  const checked = homeRoster.includes(p.id);
                  const isStarter = checked && homeRoster.slice(0, 5).includes(p.id);

                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => toggleHomePlayer(p.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-left text-xs transition border ${
                        checked
                          ? 'bg-slate-700/80 border-orange-500/80 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-orange-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="font-mono font-bold">#{p.number}</span>
                        <span className="truncate">{p.name}</span>
                      </div>
                      {isStarter && (
                        <span className="text-[9px] bg-orange-500/20 text-orange-300 px-1 py-0.2 rounded font-bold shrink-0">
                          先発
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* アウェイ出場選手 */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: awayTeam?.color }}
                />
                <h4 className="text-xs font-bold text-white">
                  {awayTeam?.name} 出場選手 ({awayRoster.length}/{awayPlayers.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={handleSelectAllAway}
                className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold"
              >
                {awayRoster.length === awayPlayers.length ? '全解除' : '全選択'}
              </button>
            </div>

            {awayPlayers.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                選手が登録されていません。「選手管理」から登録してください。
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {awayPlayers.map((p) => {
                  const checked = awayRoster.includes(p.id);
                  const isStarter = checked && awayRoster.slice(0, 5).includes(p.id);

                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => toggleAwayPlayer(p.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-left text-xs transition border ${
                        checked
                          ? 'bg-slate-700/80 border-blue-500/80 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="font-mono font-bold">#{p.number}</span>
                        <span className="truncate">{p.name}</span>
                      </div>
                      {isStarter && (
                        <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-bold shrink-0">
                          先発
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 試合開始ボタン */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-black py-3.5 px-6 rounded-2xl text-sm flex items-center justify-center space-x-2 shadow-lg transition"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>試合を開始（スタッツ記録へ）</span>
          </button>
        </div>
      </form>
    </div>
  );
};
