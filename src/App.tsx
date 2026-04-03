import { useState } from 'react';
import { PlannerPage } from './pages/PlannerPage';
import { GardenPage } from './pages/GardenPage';
import { HarvestPage } from './pages/HarvestPage';
import { SeedFinderPage } from './pages/SeedFinderPage';
import { CalendarPage } from './pages/CalendarPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { SettingsPage } from './pages/SettingsPage';
import { useDarkMode } from './hooks/use-dark-mode';
import { usePlannerStore } from './state/planner-store';

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
  const { isDark, toggle: toggleDark } = useDarkMode();
  const location = usePlannerStore((s) => s.settings.location);

  return (
    <div className="h-screen flex flex-col bg-stone-100 dark:bg-stone-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-stone-800 border-b border-emerald-200/40 dark:border-emerald-900/30 px-4 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{'\ud83c\udf3f'}</span>
            <h1 className="text-xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
              Garden Plotter
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400">
              {'\ud83c\udf0d'} {location.includes('Manhattan') ? 'Manhattan Beach, CA' : 'Surrey, UK'}
            </span>
          </div>
          <button
            onClick={toggleDark}
            className="p-2 rounded-full text-sm hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '\u2600\ufe0f' : '\ud83c\udf19'}
          </button>
        </div>

        {/* Tab navigation */}
        <nav className="mt-3 -mb-1 flex gap-2 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition-all duration-200 ${
                page === item.id
                  ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-white'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-700/50'
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
        <div key={page} className="h-full animate-fadeIn">
          {page === 'planner' && <PlannerPage />}
          {page === 'garden' && <GardenPage />}
          {page === 'harvest' && <HarvestPage />}
          {page === 'seeds' && <SeedFinderPage />}
          {page === 'calendar' && <CalendarPage />}
          {page === 'knowledge' && <KnowledgeBasePage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

export default App;
