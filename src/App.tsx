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
import { PrintPage } from './pages/PrintPage';
import { useDarkMode } from './hooks/use-dark-mode';

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
    <div className="flex gap-1 px-4 sm:px-5 py-1.5 bg-stone-100 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-700/20 overflow-x-auto scrollbar-hide">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`px-3.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
            active === item.id
              ? 'bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 border border-stone-200 dark:border-stone-600'
              : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50/50 dark:hover:bg-stone-700/30'
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
  const [showPrint, setShowPrint] = useState(false);
  const { isDark, toggle: toggleDark } = useDarkMode();

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
    <div className="h-[100dvh] flex flex-col bg-stone-100 dark:bg-stone-900 transition-colors">
      {/* ═══ HEADER — editorial garden journal aesthetic ═══ */}
      <header className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700/40 px-4 sm:px-5 py-3 sm:py-4 flex-shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-lg sm:text-xl font-normal tracking-tight text-stone-800 dark:text-stone-100" style={{ fontFamily: 'var(--font-serif)' }}>
              Garden Plotter
            </h1>
            <div className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-light">
              21 Esher Avenue, Walton-on-Thames, Surrey KT12 2SZ
            </div>
            <div className="hidden sm:block text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 font-mono">
              51.3867°N, -0.4175°W · Elev ~17m · RHS Zone H5 · USDA ~8b
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPrint(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm hover:bg-stone-200/60 dark:hover:bg-stone-700/60 active:scale-95 transition-all"
              title="Export garden plan as PDF"
            >
              📄
            </button>
            <button
              onClick={toggleDark}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm hover:bg-stone-200/60 dark:hover:bg-stone-700/60 active:scale-95 transition-all"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '\u2600\ufe0f' : '\ud83c\udf19'}
            </button>
          </div>
        </div>

        {/* Desktop-only primary navigation — understated tab bar */}
        <nav className="hidden md:flex mt-3 -mb-1.5 gap-0.5 overflow-x-auto scrollbar-hide pb-0.5 border-t border-stone-200/60 dark:border-stone-700/30 pt-2.5">
          {topNav.map((item) => (
            <button
              key={item.id}
              onClick={() => { setTopTab(item.id); setMoreOpen(false); }}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap flex items-center gap-1.5 transition-all duration-150 ${
                topTab === item.id
                  ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-700/40'
              }`}
            >
              <span className="text-[12px]">{item.icon}</span>
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

        {/* ═══ MOBILE "MORE" DRAWER ═══ */}
        {moreOpen && (
          <div className="md:hidden absolute inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-stone-50 dark:bg-stone-900 rounded-t-2xl elevation-3 border-t border-stone-200 dark:border-stone-700/40 px-5 pt-3 pb-4 animate-slideUp">
              <div className="w-9 h-1 bg-stone-300 dark:bg-stone-600 rounded-full mx-auto mb-5" />
              <div className="grid grid-cols-3 gap-3 mb-2">
                {moreItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl transition-all active:scale-95 border ${
                      topTab === item.id
                        ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-stone-800 dark:border-stone-200'
                        : 'text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700/40'
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </button>
                ))}
                <button
                  onClick={toggleDark}
                  className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700/40 transition-all active:scale-95"
                >
                  <span className="text-2xl">{isDark ? '\u2600\ufe0f' : '\ud83c\udf19'}</span>
                  <span className="text-[11px] font-medium">{isDark ? 'Light' : 'Dark'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      <nav className="md:hidden flex-shrink-0 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700/40 flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
                  ? 'text-stone-800 dark:text-stone-100'
                  : 'text-stone-400 dark:text-stone-500 active:text-stone-600 dark:active:text-stone-300'
              }`}
            >
              {isActive && <div className="absolute top-1.5 w-5 h-0.5 rounded-full bg-stone-800 dark:bg-stone-200" />}
              <span className={`text-xl leading-none transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className={`text-[10px] font-medium leading-tight ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Print / PDF Export overlay */}
      {showPrint && <PrintPage onClose={() => setShowPrint(false)} />}
    </div>
  );
}

export default App;
