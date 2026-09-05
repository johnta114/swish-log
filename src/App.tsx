import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { HomeScreen } from './components/screens/HomeScreen';
import { TeamsScreen } from './components/screens/TeamsScreen';
import { PlayersScreen } from './components/screens/PlayersScreen';
import { NewGameScreen } from './components/screens/NewGameScreen';
import { LiveGameScreen } from './components/screens/LiveGameScreen';
import { GameStatsScreen } from './components/screens/GameStatsScreen';
import { TotalStatsScreen } from './components/screens/TotalStatsScreen';

const MainContent: React.FC = () => {
  const { currentScreen } = useApp();

  return (
    <div className={`min-h-screen ${currentScreen === 'live_game' ? 'h-[100dvh] overflow-hidden' : ''} bg-slate-950 flex flex-col justify-start items-center text-slate-100 selection:bg-orange-500 selection:text-white`}>
      {/* スマホ用コンテナ（最大幅 448px、画面幅がそれ以下の場合は 100% 幅） */}
      <div className={`w-full max-w-md min-w-0 ${currentScreen === 'live_game' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen pb-safe'} bg-slate-900 shadow-2xl flex flex-col relative border-x border-slate-800/80`}>
        <Navbar />

        <main className={`flex-1 ${currentScreen === 'live_game' ? 'p-0 overflow-hidden flex flex-col' : 'px-4 pt-4'}`}>
          {currentScreen === 'home' && <HomeScreen />}
          {currentScreen === 'total_stats' && <TotalStatsScreen />}
          {currentScreen === 'teams' && <TeamsScreen />}
          {currentScreen === 'players' && <PlayersScreen />}
          {currentScreen === 'new_game' && <NewGameScreen />}
          {currentScreen === 'live_game' && <LiveGameScreen />}
          {currentScreen === 'stats_view' && <GameStatsScreen />}
        </main>
      </div>
    </div>

  );
};

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;

