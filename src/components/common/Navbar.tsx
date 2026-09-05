import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, Users, UserCheck, PlusCircle, RotateCcw, BarChart2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentScreen, navigateTo, resetData } = useApp();

  // スタッツ登録画面では入力集中・画面領域最大化のためナビゲーションは非表示または最小化
  if (currentScreen === 'live_game') {
    return null;
  }

  const handleReset = () => {
    if (window.confirm('全データをデモ初期データにリセットしますか？')) {
      resetData();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 pt-safe">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* ロゴ / タイトル */}
        <button
          onClick={() => navigateTo('home')}
          className="flex items-center space-x-2 text-left focus:outline-none group min-w-0"
        >
          <img
            src="/swish-icon-192.png"
            alt="swish log icon"
            className="w-8 h-8 rounded-lg shadow-sm object-cover border border-slate-700/60 group-hover:scale-105 transition-transform shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-black text-white tracking-wider leading-none uppercase">
              swish <span className="text-sky-400">log</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">バスケ スタッツ管理</p>
          </div>
        </button>

        {/* 右側アクション */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => navigateTo('new_game')}
            className="flex items-center space-x-1 text-xs bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-semibold px-2.5 py-1.5 rounded-lg transition shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>新規試合</span>
          </button>
          <button
            onClick={handleReset}
            title="サンプルデータ再読み込み"
            className="p-1 text-slate-400 hover:text-slate-200 active:rotate-180 transition duration-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* サブナビゲーションバー（試合、通算スタッツ、チーム、選手） */}
      <nav className="max-w-md mx-auto px-1 flex border-t border-slate-800/80 bg-slate-900/60">
        <button
          onClick={() => navigateTo('home')}
          className={`flex-1 py-2 flex items-center justify-center space-x-1 text-[11px] font-semibold border-b-2 transition ${
            currentScreen === 'home'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-3.5 h-3.5 shrink-0" />
          <span>試合一覧</span>
        </button>
        <button
          onClick={() => navigateTo('total_stats')}
          className={`flex-1 py-2 flex items-center justify-center space-x-1 text-[11px] font-semibold border-b-2 transition ${
            currentScreen === 'total_stats'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 shrink-0" />
          <span>通算スタッツ</span>
        </button>
        <button
          onClick={() => navigateTo('teams')}
          className={`flex-1 py-2 flex items-center justify-center space-x-1 text-[11px] font-semibold border-b-2 transition ${
            currentScreen === 'teams'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>チーム</span>
        </button>
        <button
          onClick={() => navigateTo('players')}
          className={`flex-1 py-2 flex items-center justify-center space-x-1 text-[11px] font-semibold border-b-2 transition ${
            currentScreen === 'players'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
          <span>選手</span>
        </button>
      </nav>
    </header>
  );
};
