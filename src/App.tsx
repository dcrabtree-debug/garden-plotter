import { useState } from 'react';
import { PlannerPage } from './pages/PlannerPage';
import { GardenPage } from './pages/GardenPage';
import { HarvestPage } from './pages/HarvestPage';
import { SeedFinderPage } from './pages/SeedFinderPage';
import { CalendarPage } from './pages/CalendarPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { SettingsPage } from './pages/SettingsPage';

type Page = 'planner' | 'garden' | 'harvest' | 'seeds' | 'calendar' | 'knowledge' | 'settings';

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'planner', label: 'GreenStalk', icon: '\ud83c\udf31' },
  { id: 'garden', label: 'Garden', icon: '\ud83c\udfe1' },
  { id: 'harvest', label: 'Harvest', icon: '\ud83c\udf53' },
  { id: 'seeds', label: 'Seeds', icon: '\ud83d\udecd\ufe0f' },
  { id: 'calendar', label: 'Calendar', icon: '\ud83d\udcc5' },
  { id: 'knowledge', label: 'Plants', icon: '\ud83d\udcda' },
  { id: 'settings', label: 'Settings', icon: '\u2699\ufe0f' },
];

function App() {
  const [page, setPage] = useState<Page>('planner');

  return (
    <div className="h-screen flex flex-col bg-stone-100">
      {/* Top nav */}
      <header className="bg-white border-b border-stone-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{'\ud83c\udf3f'}</span>
          <h1 className="text-base font-semibold text-stone-800">
            Garden Plotter
          </h1>
          <span className="text-[10px] text-stone-400 ml-1">
            Surrey, UK
          </span>
        </div>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                page === item.id
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        {page === 'planner' && <PlannerPage />}
        {page === 'garden' && <GardenPage />}
        {page === 'harvest' && <HarvestPage />}
        {page === 'seeds' && <SeedFinderPage />}
        {page === 'calendar' && <CalendarPage />}
        {page === 'knowledge' && <KnowledgeBasePage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
