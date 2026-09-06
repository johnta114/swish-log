import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  Settings,
  Database,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Users,
  Trophy,
  Shield,
  Info,
  X,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { navigateTo, resetData, teams, players, games, myTeam, isDbReady } = useApp();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const handleConfirmReset = () => {
    resetData();
    setIsResetModalOpen(false);
    setResetSuccessMessage('データをデモ初期状態に正常にリセットしました');
    setTimeout(() => {
      setResetSuccessMessage('');
    }, 4000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto">
      {/* 画面ヘッダー */}
      <div className="flex items-center space-x-3 pb-2 border-b border-slate-800">
        <button
          onClick={() => navigateTo('home')}
          className="p-2 -ml-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          title="戻る"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-slate-800 text-orange-400 border border-slate-700">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">設定・データ管理</h2>
            <p className="text-xs text-slate-400">アプリ設定とデータベース保守</p>
          </div>
        </div>
      </div>

      {/* リセット完了トースト */}
      {resetSuccessMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center space-x-2.5 text-emerald-300 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{resetSuccessMessage}</span>
        </div>
      )}

      {/* データストレージ統計カード */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
            <HardDrive className="w-4 h-4 text-sky-400" />
            <span>端末内データ保存状況</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
            {isDbReady ? 'SQLite 稼働中' : '準備中'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1 mb-1">
              <Users className="w-3 h-3 text-orange-400" />
              <span>登録チーム</span>
            </div>
            <div className="text-lg font-black text-white font-mono">{teams.length}</div>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1 mb-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>登録選手</span>
            </div>
            <div className="text-lg font-black text-white font-mono">{players.length}</div>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1 mb-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>試合数</span>
            </div>
            <div className="text-lg font-black text-white font-mono">{games.length}</div>
          </div>
        </div>

        {myTeam && (
          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-400">現在のマイチーム:</span>
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: myTeam.color }} />
              {myTeam.name} {myTeam.seasonYear ? `(${myTeam.seasonYear}年度)` : ''}
            </span>
          </div>
        )}
      </div>

      {/* データ初期化・リセットセクション（安全設計） */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
          <Database className="w-4 h-4 text-red-400" />
          <span>データ初期化・保守</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          アプリの動作確認や検証用として、全データを初期サンプル（デモデータ）へリセットすることができます。
        </p>

        <div className="pt-1">
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 active:scale-98 border border-red-500/40 text-red-300 text-xs font-bold flex items-center justify-center space-x-2 transition shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-400" />
            <span>デモ初期データにリセットする</span>
          </button>
        </div>
      </div>

      {/* アプリ仕様 & オフライン情報 */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
          <Info className="w-4 h-4 text-sky-400" />
          <span>アプリ仕様情報</span>
        </div>
        <div className="space-y-1.5 text-xs text-slate-300 divide-y divide-slate-700/40">
          <div className="flex justify-between py-1">
            <span className="text-slate-400">アプリ名</span>
            <span className="font-bold text-white">swish log</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">バージョン</span>
            <span className="font-mono text-slate-200 font-semibold">v1.2.0</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">データベース方式</span>
            <span className="text-sky-300 font-medium">Capacitor SQLite (ローカル暗号化対応)</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">動作モード</span>
            <span className="text-emerald-400 font-semibold">完全オフライン動作</span>
          </div>
        </div>
      </div>

      {/* 2段階確認リセットモーダル */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <span>データ初期化の確認</span>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-red-950/40 border border-red-900/60 p-3 rounded-xl">
              <p className="font-bold text-red-300">⚠️ 本当に全データをリセットしますか？</p>
              <p>
                現在記録されているすべての試合データ、スコア、チーム、所属選手情報が初期サンプルデータに上書きされます。
              </p>
              <p className="text-slate-400">
                ※この操作は取り消すことができません。
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black transition shadow-lg flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>はい、リセットする</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
