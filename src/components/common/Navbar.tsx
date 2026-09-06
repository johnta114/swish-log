import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, Users, BarChart2, Shield, Settings } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentScreen, navigateTo } = useApp();

  // スタッツ登録画面では入力集中・画面領域最大化のためナビゲーションは非表示または最小化
  if (currentScreen === 'live_game') {
    return null;
  }

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
          </div>
        </button>

        {/* 右側アクション: 設定ボタン（歯車アイコン） */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => navigateTo('settings')}
            title="設定"
            className={`p-2 rounded-xl transition ${
              currentScreen === 'settings'
                ? 'bg-slate-800 text-orange-400 border border-orange-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* サブナビゲーションバー（試合一覧、マイチーム、通算スタッツ、対戦チーム） */}
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
          onClick={() => navigateTo('my_team')}
          className={`flex-1 py-2 flex items-center justify-center space-x-1 text-[11px] font-semibold border-b-2 transition ${
            currentScreen === 'my_team'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>マイチーム</span>
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
          <span>対戦チーム</span>
        </button>
      </nav>
    </header>
  );
};
