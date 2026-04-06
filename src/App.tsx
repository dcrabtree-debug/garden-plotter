import { useState, useCallback } from 'react';
import { PlannerPage } from './pages/PlannerPage';
import { GardenPage } from './pages/GardenPage';
import { HarvestPage } from './pages/HarvestPage';
import { SeedFinderPage } from './pages/SeedFinderPage';
import { CalendarPage } from './pages/CalendarPage';
import { CarePage } from './pages/CarePage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { SettingsPage } from './pages/SettingsPage';
import { SetupGuidePage } from './pages/SetupGuidePage';
import { ShadowPage } from './pages/ShadowPage';
import { YieldPage } from './pages/YieldPage';
import { DashboardPage } from './pages/DashboardPage';
import { PhotoCoachPage } from './pages/PhotoCoachPage';
import { useDarkMode } from './hooks/use-dark-mode';
import { usePlannerStore } from './state/planner-store';

type TopTab = 'dashboard' | 'coach' | 'plan' | 'grow' | 'learn' | 'seeds' | 'settings';
type PlanSub = 'greenstalk' | 'garden';
type GrowSub = 'care' | 'calendar' | 'harvest';
type LearnSub = 'plants' | 'yield' | 'sun' | 'setup';

const topNav: { id: TopTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📋' },
  { id: 'coach', label: 'Coach', icon: '📸' },
  { id: 'plan', label: 'Plan', icon: '🗺️' },
  { id: 'grow', label: 'Grow', icon: '🌱' },
  { id: 'learn', label: 'Learn', icon: '📚' },
  { id: 'seeds', label: 'Shopping', icon: '🛒' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const planSubs: { id: PlanSub; label: string }[] = [
  { id: 'greenstalk', label: 'GreenStalk Planner' },
  { id: 'garden', label: 'Garden Map' },
];
const growSubs: { id: GrowSub; label: string }[] = [
  { id: 'care', label: 'Monthly Care' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'harvest', label: 'Harvest' },
];
const learnSubs: { id: LearnSub; label: string }[] = [
  { id: 'plants', label: 'Plant Encyclopedia' },
  { id: 'yield', label: 'Yield Calculator' },
  { id: 'sun', label: 'Sun & Shadow' },
  { id: 'setup', label: 'Setup Guide' },
];

function SubNav({ items, active, onSelect }: { items: { id: string; label: string }[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-1 px-3 sm:px-4 py-1.5 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200/50 dark:border-stone-700/30 overflow-x-auto scrollbar-hide">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            active === item.id
              ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm'
              : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function App() {
  const [topTab, setTopTab] = useState<TopTab>('dashboard');
  const [planSub, setPlanSub] = useState<PlanSub>('greenstalk');
  const [growSub, setGrowSub] = useState<GrowSub>('care');
  const [learnSub, setLearnSub] = useState<LearnSub>('plants');
  const [coachInitialView, setCoachInitialView] = useState<string | undefined>();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const location = usePlannerStore((s) => s.settings.location);

  // Cross-tab navigation handler (used by Dashboard snapshot widget)
  const handleNavigate = useCallback((tab: string, view?: string) => {
    if (tab === 'coach' && view) {
      setCoachInitialView(view);
    } else {
      setCoachInitialView(undefined);
    }
    setTopTab(tab as TopTab);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-stone-100 dark:bg-stone-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-stone-800 border-b border-emerald-200/40 dark:border-emerald-900/30 px-3 sm:px-4 py-2.5 sm:py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl">{'\ud83c\udf3f'}</span>
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
              Garden Plotter
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400">
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

        {/* Primary navigation — 7 tabs */}
        <nav className="mt-2 sm:mt-2.5 -mb-1 flex gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {topNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setTopTab(item.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition-all duration-200 ${
                topTab === item.id
                  ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-white'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-700/50'
              }`}
            >
              <span className="text-xs sm:text-sm">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Sub-navigation for grouped tabs */}
      {topTab === 'plan' && <SubNav items={planSubs} active={planSub} onSelect={(id) => setPlanSub(id as PlanSub)} />}
      {topTab === 'grow' && <SubNav items={growSubs} active={growSub} onSelect={(id) => setGrowSub(id as GrowSub)} />}
      {topTab === 'learn' && <SubNav items={learnSubs} active={learnSub} onSelect={(id) => setLearnSub(id as LearnSub)} />}

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        <div key={`${topTab}-${planSub}-${growSub}-${learnSub}`} className="h-full animate-fadeIn">
          {topTab === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {topTab === 'coach' && <PhotoCoachPage initialView={coachInitialView as any} key={coachInitialView ?? 'gallery'} />}
          {topTab === 'plan' && planSub === 'greenstalk' && <PlannerPage />}
          {topTab === 'plan' && planSub === 'garden' && <GardenPage />}
          {topTab === 'grow' && growSub === 'care' && <CarePage />}
          {topTab === 'grow' && growSub === 'calendar' && <CalendarPage />}
          {topTab === 'grow' && growSub === 'harvest' && <HarvestPage />}
          {topTab === 'learn' && learnSub === 'plants' && <KnowledgeBasePage />}
          {topTab === 'learn' && learnSub === 'yield' && <YieldPage />}
          {topTab === 'learn' && learnSub === 'sun' && <ShadowPage />}
          {topTab === 'learn' && learnSub === 'setup' && <SetupGuidePage />}
          {topTab === 'seeds' && <SeedFinderPage />}
          {topTab === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

export default App;
