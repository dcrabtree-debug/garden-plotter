import { useState, useCallback } from 'react';
import { PlannerPage } from './pages/PlannerPage';
import { GardenPage } from './pages/GardenPage';
import { HarvestPage } from './pages/HarvestPage';
import { SeedFinderPage } from './pages/SeedFinderPage';
import { CalendarPage } from './pages/CalendarPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { SettingsPage } from './pages/SettingsPage';
import { SetupGuidePage } from './pages/SetupGuidePage';
import { ShadowPage } from './pages/ShadowPage';
import { YieldPage } from './pages/YieldPage';
import { DashboardPage } from './pages/DashboardPage';
import { PhotoCoachPage } from './pages/PhotoCoachPage';
import { CarePage } from './pages/CarePage';
import { useDarkMode } from './hooks/use-dark-mode';
import { usePlannerStore } from './state/planner-store';

type TopTab = 'dashboard' | 'coach' | 'plan' | 'calendar' | 'harvest' | 'care' | 'learn' | 'seeds' | 'settings';
type PlanSub = 'greenstalk' | 'garden';
type LearnSub = 'plants' | 'yield' | 'sun' | 'setup';

const topNav: { id: TopTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📋' },
  { id: 'coach', label: 'Coach', icon: '📸' },
  { id: 'plan', label: 'Plan', icon: '🗺️' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'harvest', label: 'Harvest', icon: '🌾' },
  { id: 'learn', label: 'Learn', icon: '📚' },
  { id: 'seeds', label: 'Shopping', icon: '🛒' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const planSubs: { id: PlanSub; label: string }[] = [
  { id: 'greenstalk', label: 'GreenStalk Planner' },
  { id: 'garden', label: 'Garden Map' },
];
const learnSubs: { id: LearnSub; label: string }[] = [
  { id: 'plants', label: 'Plant Encyclopedia' },
  { id: 'yield', label: 'Yield Calculator' },
  { id: 'sun', label: 'Sun & Shadow' },
  { id: 'setup', label: 'Setup Guide' },
];

function SubNav({ items, active, onSelect }: { items: { id: string; label: string }[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-1 px-4 sm:px-5 py-1.5 bg-stone-100/80 dark:bg-stone-800/40 border-b border-stone-200/40 dark:border-stone-700/20 overflow-x-auto scrollbar-hide">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`px-3.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
            active === item.id
              ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm elevation-1'
              : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-white/50 dark:hover:bg-stone-700/30'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** Primary bottom-tab items shown on mobile (≤5 max for thumb reach) */
const mobileNav: { id: TopTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Home', icon: '📋' },
  { id: 'plan', label: 'Plan', icon: '🗺️' },
  { id: 'harvest', label: 'Harvest', icon: '🌾' },
  { id: 'seeds', label: 'Shop', icon: '🛒' },
  { id: 'settings', label: 'More', icon: '⚙️' },
];

/** "More" drawer items — everything not in the bottom 5 */
const moreItems: { id: TopTab; label: string; icon: string }[] = [
  { id: 'coach', label: 'Garden Coach', icon: '📸' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'learn', label: 'Learn', icon: '📚' },
  { id: 'care', label: 'Monthly Care', icon: '🧑‍🌾' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

function App() {
  const [topTab, setTopTab] = useState<TopTab>('dashboard');
  const [planSub, setPlanSub] = useState<PlanSub>('greenstalk');
  const [learnSub, setLearnSub] = useState<LearnSub>('plants');
  const [coachInitialView, setCoachInitialView] = useState<string | undefined>();
  const [moreOpen, setMoreOpen] = useState(false);
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
    setMoreOpen(false);
  }, []);

  const handleMobileTab = useCallback((id: TopTab) => {
    if (id === 'settings') {
      // "More" button toggles the drawer
      setMoreOpen((prev) => !prev);
    } else {
      setTopTab(id);
      setMoreOpen(false);
    }
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col bg-stone-50 dark:bg-stone-900 transition-colors">
      {/* ═══ HEADER — glassmorphism on scroll, clean hierarchy ═══ */}
      <header className="glass border-b border-stone-200/60 dark:border-stone-700/40 px-4 sm:px-5 py-2.5 sm:py-3 flex-shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-xl sm:text-2xl">{'\ud83c\udf3f'}</span>
            <h1 className="text-[15px] sm:text-lg font-semibold tracking-tight text-stone-800 dark:text-stone-100">
              Garden Plotter
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30">
              {'\ud83c\udf0d'} {location.includes('Manhattan') ? 'Manhattan Beach, CA' : 'Surrey, UK'}
            </span>
          </div>
          <button
            onClick={toggleDark}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-sm hover:bg-stone-100 dark:hover:bg-stone-700/60 active:scale-95 transition-all"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '\u2600\ufe0f' : '\ud83c\udf19'}
          </button>
        </div>

        {/* Desktop-only primary navigation — refined pill tabs */}
        <nav className="hidden md:flex mt-2.5 -mb-1.5 gap-1 overflow-x-auto scrollbar-hide pb-0.5">
          {topNav.map((item) => (
            <button
              key={item.id}
              onClick={() => { setTopTab(item.id); setMoreOpen(false); }}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap flex items-center gap-1.5 transition-all duration-200 ${
                topTab === item.id
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 dark:bg-emerald-500 dark:shadow-emerald-500/20'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-700/40'
              }`}
            >
              <span className="text-[13px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Sub-navigation for grouped tabs */}
      {topTab === 'plan' && <SubNav items={planSubs} active={planSub} onSelect={(id) => setPlanSub(id as PlanSub)} />}
      {topTab === 'learn' && <SubNav items={learnSubs} active={learnSub} onSelect={(id) => setLearnSub(id as LearnSub)} />}

      {/* ═══ PAGE CONTENT ═══ */}
      <main className="flex-1 overflow-hidden relative">
        <div key={`${topTab}-${planSub}-${learnSub}`} className="h-full animate-fadeIn">
          {topTab === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {topTab === 'coach' && <PhotoCoachPage initialView={coachInitialView as any} key={coachInitialView ?? 'gallery'} />}
          {topTab === 'plan' && planSub === 'greenstalk' && <PlannerPage />}
          {topTab === 'plan' && planSub === 'garden' && <GardenPage />}
          {topTab === 'calendar' && <CalendarPage />}
          {topTab === 'harvest' && <HarvestPage />}
          {topTab === 'care' && <CarePage />}
          {topTab === 'learn' && learnSub === 'plants' && <KnowledgeBasePage />}
          {topTab === 'learn' && learnSub === 'yield' && <YieldPage />}
          {topTab === 'learn' && learnSub === 'sun' && <ShadowPage />}
          {topTab === 'learn' && learnSub === 'setup' && <SetupGuidePage />}
          {topTab === 'seeds' && <SeedFinderPage />}
          {topTab === 'settings' && <SettingsPage />}
        </div>

        {/* ═══ MOBILE "MORE" DRAWER — premium sheet ═══ */}
        {moreOpen && (
          <div className="md:hidden absolute inset-0 z-40">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 glass rounded-t-3xl elevation-3 px-5 pt-3 pb-4 animate-slideUp">
              <div className="w-9 h-1 bg-stone-300 dark:bg-stone-600 rounded-full mx-auto mb-5" />
              <div className="grid grid-cols-3 gap-3 mb-2">
                {moreItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl transition-all active:scale-95 ${
                      topTab === item.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/40'
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </button>
                ))}
                <button
                  onClick={toggleDark}
                  className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/40 transition-all active:scale-95"
                >
                  <span className="text-2xl">{isDark ? '\u2600\ufe0f' : '\ud83c\udf19'}</span>
                  <span className="text-[11px] font-medium">{isDark ? 'Light' : 'Dark'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══ MOBILE BOTTOM TAB BAR — iOS-grade polish ═══ */}
      <nav className="md:hidden flex-shrink-0 glass border-t border-stone-200/60 dark:border-stone-700/40 flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileNav.map((item) => {
          const isActive = item.id === 'settings'
            ? moreOpen
            : topTab === item.id && !moreOpen;
          return (
            <button
              key={item.id}
              onClick={() => handleMobileTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] transition-all relative ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-stone-400 dark:text-stone-500 active:text-stone-600 dark:active:text-stone-300'
              }`}
            >
              {/* Active indicator dot */}
              {isActive && <div className="absolute top-1.5 w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
              <span className={`text-xl leading-none transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className={`text-[10px] font-medium leading-tight ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
