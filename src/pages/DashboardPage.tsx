import { useState, useEffect, useMemo } from 'react';
import { usePlannerStore } from '../state/planner-store';
import { useGardenStore } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import {
  getMonthName,
  isInWindow,
  getCurrentMonth,
} from '../lib/calendar-utils';
import {
  fetchWeather,
  getFrostAlert,
  getRainAlert,
  getWindAlert,
  type WeatherForecast,
  type FrostAlert,
  type RainAlert,
  type WindAlert,
} from '../lib/weather-service';
import { getHarvestEstimates, type HarvestEstimate } from '../lib/harvest-countdown';
import { SnapshotDashboardWidget } from '../components/SnapshotFlow';
import type { Plant } from '../types/plant';

// ── Key dates ────────────────────────────────────────────────────────────────
const MOVE_IN = new Date('2026-04-17');
const GEAR_ARRIVES = new Date('2026-05-15');
const FIRST_FROST = new Date('2026-10-25');

type Phase = 'PRE_MOVE' | 'NO_GEAR' | 'EARLY_SEASON' | 'PEAK_SEASON' | 'LATE_SEASON' | 'DORMANT';

function getPhase(d: Date): Phase {
  if (d < MOVE_IN) return 'PRE_MOVE';
  if (d < GEAR_ARRIVES) return 'NO_GEAR';
  const m = d.getMonth() + 1;
  if (m <= 6) return 'EARLY_SEASON';
  if (m <= 8) return 'PEAK_SEASON';
  if (m <= 10) return 'LATE_SEASON';
  return 'DORMANT';
}

const PHASE_LABELS: Record<Phase, { label: string; emoji: string }> = {
  PRE_MOVE: { label: 'Pre-Move', emoji: '📦' },
  NO_GEAR: { label: 'Conservatory Season', emoji: '🏠' },
  EARLY_SEASON: { label: 'Setup & Planting', emoji: '🌱' },
  PEAK_SEASON: { label: 'Peak Growing', emoji: '☀️' },
  LATE_SEASON: { label: 'Harvest & Wind Down', emoji: '🍂' },
  DORMANT: { label: 'Planning Season', emoji: '❄️' },
};

const PHASE_BADGE_COLORS: Record<Phase, string> = {
  PRE_MOVE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  NO_GEAR: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  EARLY_SEASON: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  PEAK_SEASON: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  LATE_SEASON: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  DORMANT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Priority Tasks with parseable deadlines ─────────────────────────────────

interface PriorityTask {
  id: string;
  priority: number;
  label: string;
  detail: string;
  phases: Phase[];
  category: 'setup' | 'planting' | 'maintenance' | 'shopping';
  oneTime: boolean;
  deadline?: string;       // Display string
  deadlineDate?: string;   // ISO date for comparison (2026-MM-DD)
  buyUrl?: string;
  /** When overdue, what should the user do instead? */
  overdueAlt?: string;
}

const PRIORITY_TASKS: PriorityTask[] = [
  { id: 'buy-compost', priority: 1, label: 'Buy peat-free compost + perlite', detail: 'Mix 3:1 ratio. Get at least 100L for two GreenStalks. Can order online now or buy at garden centre after move-in.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'Apr 20', deadlineDate: '2026-04-20', buyUrl: 'https://www.thompson-morgan.com/p/peat-free-multipurpose-compost/t67890' },
  { id: 'buy-seed-trays', priority: 2, label: 'Buy seed trays + small pots', detail: 'Start seeds indoors on conservatory windowsill. First weekend after move-in.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'Apr 19', deadlineDate: '2026-04-19', buyUrl: 'https://www.thompson-morgan.com/c/seed-trays-and-pots' },
  { id: 'sow-tomato-indoor', priority: 3, label: 'Sow tomato seeds indoors', detail: 'Tumbling Tom needs 6-8 weeks to transplant size. Sow first weekend in new house.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 20', deadlineDate: '2026-04-20', overdueAlt: 'Getting tight for seed — buy Tumbling Tom transplants from garden centre in mid-May if you miss this window.', buyUrl: 'https://www.thompson-morgan.com/p/tomato-tumbling-tom-red/t59034' },
  { id: 'sow-basil-indoor', priority: 4, label: 'Sow basil seeds indoors', detail: 'Needs warmth to germinate. Conservatory windowsill ideal.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 22', deadlineDate: '2026-04-22', overdueAlt: 'Still OK until early May from seed — or buy basil plug plants from garden centre.', buyUrl: 'https://www.thompson-morgan.com/p/basil-sweet-genovese/t55100' },
  { id: 'sow-courgette-indoor', priority: 5, label: 'Sow courgette seeds indoors', detail: 'One seed per 9cm pot. Grows fast — sow 4 weeks before transplant.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 25', deadlineDate: '2026-04-25', overdueAlt: 'Still viable until end of May — sow now or buy transplants.' },
  { id: 'divide-strawberries', priority: 6, label: 'Divide existing strawberry runners from raised bed', detail: 'FREE strawberries! The raised bed already has healthy runners (photo-verified). Snip rooted plantlets, pot into 9cm pots, keep watered 2-3 weeks, then transplant to GreenStalk tiers 3-4 when gear arrives. No need to buy new plants.', phases: ['NO_GEAR', 'EARLY_SEASON'], category: 'planting', oneTime: true, deadline: 'May 10', deadlineDate: '2026-05-10', overdueAlt: 'Still fine to divide until June — runners keep producing all summer.' },
  { id: 'buy-sweet-pea-plugs', priority: 7, label: 'Buy sweet pea plug plants', detail: 'Too late to start from seed (should have been February). Buy as plugs.', phases: ['PRE_MOVE', 'NO_GEAR', 'EARLY_SEASON'], category: 'shopping', oneTime: true, deadline: 'May 1', deadlineDate: '2026-05-01', overdueAlt: 'Still available as plugs through May — buy now before stock runs out.', buyUrl: 'https://www.thompson-morgan.com/p/sweet-pea-spencer-mixed/t10886' },
  { id: 'assess-garden', priority: 8, label: 'Assess garden: photos + sun patterns', detail: 'Take photos from every angle. Note morning vs afternoon sun on the terrace. Use Photo Coach tab!', phases: ['NO_GEAR'], category: 'setup', oneTime: true, deadline: 'Apr 26', deadlineDate: '2026-04-26' },
  { id: 'position-greenstalks', priority: 9, label: 'Position GreenStalks on sunniest spot', detail: 'Use the Sun Heatmap on the Garden page. Aim for 6+ hours direct sun.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 16', deadlineDate: '2026-05-16' },
  { id: 'fill-greenstalks', priority: 10, label: 'Fill GreenStalks with compost mix', detail: '3:1 peat-free compost to perlite. Add slow-release fertiliser (NPK 14-14-14).', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 17', deadlineDate: '2026-05-17' },
  { id: 'check-drainage', priority: 11, label: 'Check all GreenStalk drainage holes', detail: 'Poke a pencil through each pocket drain. Blocked drains = root rot.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 17', deadlineDate: '2026-05-17' },
  { id: 'test-watering', priority: 12, label: 'Fill top reservoir + test water flow', detail: 'Water should trickle through all 5 tiers evenly. Adjust perlite ratio if pooling.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 18', deadlineDate: '2026-05-18' },
  { id: 'setup-titan-cages', priority: 13, label: 'Set up Titan cages for climbers', detail: 'Allocate: 2x runner beans, 2x cucumbers, 2x cordon tomatoes (if in-ground).', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 25', deadlineDate: '2026-05-25' },
  { id: 'transplant-seedlings', priority: 14, label: 'Transplant indoor seedlings to GreenStalks', detail: 'Harden off for 7 days first. Move outside during day, in at night.', phases: ['EARLY_SEASON'], category: 'planting', oneTime: true, deadline: 'May 25', deadlineDate: '2026-05-25', overdueAlt: 'Transplant ASAP — each day of delay reduces growing season.' },
  { id: 'direct-sow-salad', priority: 15, label: 'Direct sow: radish, lettuce, rocket, peas', detail: 'Safe late-start crops. Radish ready in 25 days, lettuce in 30.', phases: ['EARLY_SEASON', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'May 30', deadlineDate: '2026-05-30' },
  { id: 'sow-beans', priority: 16, label: 'Direct sow French beans + runner beans', detail: 'Beans from seed are fine in late May. Sow 5cm deep, 15cm apart.', phases: ['EARLY_SEASON'], category: 'planting', oneTime: true, deadline: 'Jun 7', deadlineDate: '2026-06-07', overdueAlt: 'Still OK until mid-June — sow now for late-season harvest.' },
  { id: 'buy-herb-plants', priority: 17, label: 'Buy potted herbs: mint, chives, thyme, rosemary', detail: 'Garden centre potted herbs establish faster than seed at this stage.', phases: ['NO_GEAR', 'EARLY_SEASON'], category: 'shopping', oneTime: true, deadline: 'May 20', deadlineDate: '2026-05-20', buyUrl: 'https://www.thompson-morgan.com/c/herb-plants' },
  { id: 'water-daily', priority: 20, label: 'Water GreenStalks', detail: 'Daily in spring/autumn, twice daily June–August. Fill the top reservoir.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'pest-check', priority: 21, label: 'Check for pests (undersides of leaves)', detail: 'Look for aphids, whitefly, caterpillars. Check twice weekly minimum.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'feed-weekly', priority: 22, label: 'Liquid feed tomatoes + peppers', detail: 'Tomato feed (high potash) once flowering starts. Weekly through summer.', phases: ['PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false, buyUrl: 'https://www.thompson-morgan.com/p/tomorite-concentrated-tomato-food/t69481' },
  { id: 'harvest-daily', priority: 23, label: 'Harvest ripe crops daily', detail: 'Regular picking encourages more fruit. Don\'t let beans go stringy.', phases: ['PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'succession-sow', priority: 24, label: 'Succession sow salads every 2 weeks', detail: 'Lettuce, rocket, radish — keep sowing for continuous harvest.', phases: ['EARLY_SEASON', 'PEAK_SEASON'], category: 'planting', oneTime: false },
  { id: 'rotate-greenstalks', priority: 25, label: 'Rotate GreenStalks 90° every 2 weeks', detail: 'Ensures even sun exposure on all sides.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
];

// ── Care data (condensed from CarePage) ─────────────────────────────────────

type WaterUrgency = 'daily' | 'regular' | 'occasional';

function getWaterUrgency(plant: Plant, month: number): WaterUrgency {
  const isSummer = month >= 6 && month <= 8;
  if (plant.water === 'high') return isSummer ? 'daily' : 'regular';
  if (plant.water === 'moderate') return isSummer ? 'regular' : 'occasional';
  return 'occasional';
}

interface PestAlert {
  name: string;
  plants: string[];
  months: number[];
  advice: string;
}

const SEASONAL_PESTS: PestAlert[] = [
  { name: 'Aphids', plants: [], months: [4, 5, 6, 7, 8], advice: 'Check shoot tips daily. Squash by hand or blast with water.' },
  { name: 'Slugs & snails', plants: [], months: [3, 4, 5, 6, 7, 8, 9, 10], advice: 'Beer traps, copper tape, or nematode bio-control.' },
  { name: 'Cabbage white caterpillars', plants: ['kale', 'cabbage', 'broccoli-sprouting'], months: [5, 6, 7, 8, 9], advice: 'Net brassicas. Check leaf undersides weekly.' },
  { name: 'Carrot fly', plants: ['carrot', 'parsnip'], months: [5, 6, 7, 8], advice: 'Fine mesh cover. 60cm barrier works.' },
  { name: 'Blight', plants: ['tomato-tumbling'], months: [7, 8, 9], advice: 'Remove affected foliage immediately. Check daily Jul-Aug.' },
  { name: 'Vine weevil', plants: ['strawberry-everbearing'], months: [3, 4, 5, 9, 10], advice: 'Nematode bio-control. GreenStalk pockets vulnerable.' },
];

function getFrostGuidance(month: number): { level: 'safe' | 'caution' | 'frost'; message: string } | null {
  if (month >= 11 || month <= 2) return { level: 'frost', message: 'Frost likely. Protect all tender crops. Wrap GreenStalks or move under cover.' };
  if (month === 3) return { level: 'frost', message: 'Hard frosts still possible. Keep tender crops indoors.' };
  if (month === 4) return { level: 'caution', message: 'Last frost mid-April. Keep fleece ready. Harden off seedlings 7-10 days.' };
  if (month === 10) return { level: 'caution', message: 'First frost mid-October. Harvest tender crops. Move containers under cover.' };
  return { level: 'safe', message: 'Frost-free. Focus on watering and feeding.' };
}

// ── Setup reference data ────────────────────────────────────────────────────

interface SetupStep { emoji: string; title: string; detail: string; tip?: string; }

const GREENSTALK_SETUP: SetupStep[] = [
  { emoji: '🪣', title: 'Compost mix', detail: 'Peat-free compost + perlite 3:1. Do NOT use garden soil.', tip: 'Sylvagrow or Dalefoot wool compost recommended.' },
  { emoji: '🧪', title: 'Slow-release fertiliser', detail: 'Mix Osmocote 14-14-14 granules at planting. Feeds 3-4 months.', tip: 'Switch to weekly liquid tomato feed once fruiting crops flower.' },
  { emoji: '💧', title: 'Watering', detail: 'Fill top saucer. Summer: twice daily. Spring/autumn: once daily.', tip: '#1 failure cause is underwatering.' },
  { emoji: '🌊', title: 'Drainage check', detail: 'Clear all pocket drainage holes before planting. Water through and check.', },
  { emoji: '🌱', title: 'Planting density', detail: 'One plant per pocket. Exceptions: lettuce/rocket (2-3), radish/spring onion (4-5).', },
  { emoji: '☀️', title: 'Positioning', detail: '6+ hours direct sun. Rotate 90° every 2 weeks.', tip: 'Afternoon shade for lettuce/spinach prevents bolting.' },
];

// ── Checklist persistence ───────────────────────────────────────────────────

const CHECKLIST_STORAGE_KEY = 'garden-plotter-checklist';

function loadChecklist(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch { return new Set(); }
}

function saveChecklist(completed: Set<string>) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...completed]));
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  setup: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', label: '🔧 Setup' },
  planting: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: '🌱 Planting' },
  maintenance: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: '🔄 Ongoing' },
  shopping: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', label: '🛒 Buy' },
};

// ── Section collapse state ──────────────────────────────────────────────────
type Section = 'overdue' | 'today' | 'care' | 'setup' | 'upcoming' | 'harvest';

// ── Component ───────────────────────────────────────────────────────────────

export function DashboardPage({ onNavigate }: { onNavigate?: (tab: string, view?: string) => void }) {
  const settings = usePlannerStore((s) => s.settings);
  const towers = usePlannerStore((s) => s.towers);
  const garden = useGardenStore((s) => s.garden);
  const region = useRegion();
  const { plants, plantMap } = usePlantDb(region);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => loadChecklist());
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [collapsed, setCollapsed] = useState<Set<Section>>(new Set());

  const toggleSection = (s: Section) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      saveChecklist(next);
      return next;
    });
  };

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const phase = getPhase(today);
  const phaseInfo = PHASE_LABELS[phase];
  const currentMonth = getCurrentMonth();
  const daysToFrost = daysBetween(today, FIRST_FROST);

  // Weather service (cached, expanded fields)
  useEffect(() => {
    const lat = settings.latitude || 51.3867;
    const lng = settings.longitude || -0.4175;
    fetchWeather(lat, lng, 5).then(setForecast).catch(() => {});
  }, [settings.latitude, settings.longitude]);

  const frostAlert: FrostAlert | null = forecast ? getFrostAlert(forecast) : null;
  const rainAlert: RainAlert | null = forecast ? getRainAlert(forecast) : null;
  const windAlert: WindAlert | null = forecast ? getWindAlert(forecast) : null;

  // ── Task classification ───────────────────────────────────────────────────

  const { overdueTasks, todayTasks, upcomingTasks, recurringTasks } = useMemo(() => {
    const phaseTasks = PRIORITY_TASKS.filter((t) => t.phases.includes(phase));
    const overdue: PriorityTask[] = [];
    const todayGroup: PriorityTask[] = [];
    const upcoming: PriorityTask[] = [];
    const recurring: PriorityTask[] = [];

    for (const task of phaseTasks) {
      const done = completedTasks.has(task.id);

      if (!task.oneTime) {
        recurring.push(task);
        continue;
      }

      if (task.deadlineDate) {
        const daysUntil = daysBetween(today, new Date(task.deadlineDate));
        if (daysUntil < 0 && !done) {
          overdue.push(task);
        } else if (daysUntil <= 3 || phase === 'PRE_MOVE' || phase === 'NO_GEAR') {
          // In pre-move/no-gear phases, show ALL tasks in "Do Now" since
          // they're the only actionable items and shouldn't be buried
          todayGroup.push(task);
        } else {
          upcoming.push(task);
        }
      } else {
        todayGroup.push(task);
      }
    }

    // Keep completed tasks in their original position — re-sorting causes them
    // to jump on mobile, making it look like they vanished.
    overdue.sort((a, b) => (a.deadlineDate ?? '').localeCompare(b.deadlineDate ?? ''));
    todayGroup.sort((a, b) => a.priority - b.priority);
    upcoming.sort((a, b) => (a.deadlineDate ?? '').localeCompare(b.deadlineDate ?? ''));

    return { overdueTasks: overdue, todayTasks: todayGroup, upcomingTasks: upcoming, recurringTasks: recurring };
  }, [phase, completedTasks, today]);

  // ── Planted crops ─────────────────────────────────────────────────────────

  const plantedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const tower of towers) {
      for (const tier of tower.tiers) {
        for (const pocket of tier.pockets) {
          if (pocket.plantSlug) slugs.add(pocket.plantSlug);
        }
      }
    }
    for (const row of garden.cells) {
      for (const cell of row) {
        if (cell.plantSlug) slugs.add(cell.plantSlug);
      }
    }
    return slugs;
  }, [towers, garden.cells]);

  const plantedPlants = useMemo(
    () => Array.from(plantedSlugs).map((s) => plantMap.get(s)).filter(Boolean) as Plant[],
    [plantedSlugs, plantMap]
  );

  // ── Care summary for this month ───────────────────────────────────────────

  const wateringSummary = useMemo(() => {
    const daily: Plant[] = [];
    const regular: Plant[] = [];
    for (const p of plantedPlants) {
      const u = getWaterUrgency(p, currentMonth);
      if (u === 'daily') daily.push(p);
      else if (u === 'regular') regular.push(p);
    }
    return { daily, regular };
  }, [plantedPlants, currentMonth]);

  const activePests = useMemo(() => {
    return SEASONAL_PESTS.filter((pest) => {
      if (!pest.months.includes(currentMonth)) return false;
      if (pest.plants.length === 0) return true;
      return pest.plants.some((slug) => plantedSlugs.has(slug));
    });
  }, [currentMonth, plantedSlugs]);

  const harvestNow = useMemo(() => {
    return plantedPlants.filter((p) => isInWindow(currentMonth, p.plantingWindow.harvest));
  }, [plantedPlants, currentMonth]);

  const sowNow = useMemo(() => {
    return plants.filter((p) => {
      const pw = p.plantingWindow;
      return isInWindow(currentMonth, pw.sowIndoors) || isInWindow(currentMonth, pw.sowOutdoors) || isInWindow(currentMonth, pw.transplant);
    }).slice(0, 12);
  }, [plants, currentMonth]);

  const frost = getFrostGuidance(currentMonth);

  // ── Harvest countdown ────────────────────────────────────────────────────

  const harvestEstimates = useMemo(
    () => getHarvestEstimates(towers, plantMap),
    [towers, plantMap],
  );

  // ── Progress ──────────────────────────────────────────────────────────────

  const totalOneTime = PRIORITY_TASKS.filter((t) => t.oneTime && t.phases.includes(phase)).length;
  const completedCount = PRIORITY_TASKS.filter((t) => t.oneTime && t.phases.includes(phase) && completedTasks.has(t.id)).length;
  const progressPct = totalOneTime > 0 ? Math.round((completedCount / totalOneTime) * 100) : 0;

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderTask(task: PriorityTask, isOverdue = false) {
    const done = completedTasks.has(task.id);
    const cat = CATEGORY_COLORS[task.category];
    const daysLate = task.deadlineDate ? -daysBetween(today, new Date(task.deadlineDate)) : 0;

    return (
      <div
        key={task.id}
        className={`px-3 py-2.5 flex items-start gap-3 cursor-pointer transition-all hover:bg-stone-50 dark:hover:bg-stone-700/30 ${done ? 'opacity-50' : ''}`}
        onClick={() => toggleTask(task.id)}
      >
        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
          done ? 'bg-emerald-500 border-emerald-500 text-white' : isOverdue ? 'border-red-400 dark:border-red-500' : 'border-stone-300 dark:border-stone-500'
        }`}>
          {done && <span className="text-xs">✓</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${done ? 'line-through text-stone-400' : 'text-stone-800 dark:text-stone-100'}`}>
              {task.label}
            </span>
            {done && <span className="text-[9px] text-stone-400 dark:text-stone-500">tap to undo</span>}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>{cat.label}</span>
            {!task.oneTime && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-600 text-stone-400">recurring</span>
            )}
          </div>

          {/* Overdue adaptive recommendation */}
          {isOverdue && task.overdueAlt && !done && (
            <div className="mt-1 px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                ⚠️ {daysLate} days overdue — {task.overdueAlt}
              </p>
            </div>
          )}
          {isOverdue && !task.overdueAlt && !done && (
            <p className="text-xs mt-0.5 font-medium text-red-600 dark:text-red-400">
              ⚠️ {daysLate} days overdue
            </p>
          )}

          {!isOverdue && (
            <p className={`text-xs mt-0.5 ${done ? 'text-stone-300 dark:text-stone-600' : 'text-stone-500 dark:text-stone-400'}`}>
              {task.detail}
            </p>
          )}

          <div className="flex items-center gap-2 mt-0.5">
            {task.deadline && !isOverdue && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                done ? 'bg-stone-100 dark:bg-stone-600 text-stone-300' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
              }`}>
                📅 By {task.deadline}
              </span>
            )}
            {task.buyUrl && !done && (
              <a
                href={task.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-200 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                🛒 Buy →
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  function SectionHeader({ section, title, count, color = 'text-stone-800 dark:text-stone-100' }: { section: Section; title: string; count: number; color?: string }) {
    const isOpen = !collapsed.has(section);
    return (
      <button
        onClick={() => toggleSection(section)}
        className="w-full px-4 py-2.5 flex items-center justify-between border-b border-stone-100 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors"
      >
        <h2 className={`text-sm font-bold ${color}`}>{title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stone-400">{count}</span>
          <span className="text-stone-400 text-xs">{isOpen ? '▾' : '▸'}</span>
        </div>
      </button>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
              Dashboard
            </h1>
            <p className="text-sm text-stone-400 mt-0.5">
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${PHASE_BADGE_COLORS[phase]}`}>
              {phaseInfo.emoji} {phaseInfo.label}
            </div>
            {daysToFrost > 0 && (
              <span className="text-[10px] text-stone-400">{daysToFrost}d left in season</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {totalOneTime > 0 && (
          <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-stone-600 dark:text-stone-300">Season progress</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-stone-200 dark:bg-stone-600 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-stone-400">{completedCount} of {totalOneTime} setup tasks done</span>
              {overdueTasks.length > 0 && (
                <span className="text-[10px] font-semibold text-red-500">{overdueTasks.length} overdue</span>
              )}
            </div>
          </div>
        )}

        {/* Alerts row — weather-driven + seasonal */}
        <div className="flex flex-col gap-2">
          {frostAlert && frostAlert.level !== 'none' && (
            <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
              frostAlert.level === 'hard'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
            }`}>
              {frostAlert.level === 'hard' ? '🥶' : '❄️'} {frostAlert.message}
            </div>
          )}
          {rainAlert?.message && (
            <div className="text-xs px-3 py-2 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 rounded-lg font-medium">
              {rainAlert.totalMm > 30 ? '🌧️' : '☀️'} {rainAlert.message}
            </div>
          )}
          {windAlert?.message && (
            <div className="text-xs px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium">
              💨 {windAlert.message}
            </div>
          )}
          {frost && frost.level !== 'safe' && !frostAlert?.frostDays.length && (
            <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
              frost.level === 'frost' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
            }`}>
              {frost.level === 'frost' ? '❄️' : '⚠️'} {frost.message}
            </div>
          )}
          {harvestNow.length > 0 && (
            <div className="text-xs px-3 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-lg font-medium">
              🍎 Harvest ready: {harvestNow.map((p) => `${p.emoji} ${p.commonName}`).join(', ')}
            </div>
          )}
        </div>

        {/* ── OVERDUE ─────────────────────────────────────────────────────── */}
        {overdueTasks.length > 0 && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border-2 border-red-300 dark:border-red-700 overflow-hidden">
            <SectionHeader section="overdue" title={`🚨 Overdue — Needs Attention`} count={overdueTasks.length} color="text-red-700 dark:text-red-300" />
            {!collapsed.has('overdue') && (
              <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
                {overdueTasks.map((t) => renderTask(t, true))}
              </div>
            )}
          </div>
        )}

        {/* ── YOUR TO-DO LIST ───────────────────────────────────────────── */}
        {(todayTasks.length > 0 || recurringTasks.length > 0) && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <SectionHeader section="today" title="📋 Your To-Do List" count={todayTasks.length + recurringTasks.length} />
            {!collapsed.has('today') && (
              <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
                {todayTasks.map((t) => renderTask(t))}
                {recurringTasks.map((t) => renderTask(t))}
              </div>
            )}
          </div>
        )}

        {/* ── COMING UP ───────────────────────────────────────────────────── */}
        {upcomingTasks.length > 0 && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <SectionHeader section="upcoming" title="📅 Coming Up" count={upcomingTasks.length} />
            {!collapsed.has('upcoming') && (
              <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
                {upcomingTasks.map((t) => renderTask(t))}
              </div>
            )}
          </div>
        )}

        {/* ── 5-DAY WEATHER STRIP ──────────────────────────────────────── */}
        {forecast && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden px-4 py-3">
            <h2 className="text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-2">🌤️ 5-Day Forecast</h2>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {forecast.days.map((d) => {
                const dayName = new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short' });
                const isFrosty = d.minTemp < 3;
                const isWet = d.precipMm > 5;
                return (
                  <div key={d.date} className={`rounded-lg py-1.5 px-1 ${isFrosty ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-stone-50 dark:bg-stone-700/30'}`}>
                    <div className="text-[10px] font-medium text-stone-500 dark:text-stone-400">{dayName}</div>
                    <div className="text-sm font-bold text-stone-800 dark:text-stone-100">
                      {isFrosty ? '❄️' : isWet ? '🌧️' : d.maxTemp > 25 ? '☀️' : '⛅'}
                    </div>
                    <div className={`text-[10px] font-semibold ${isFrosty ? 'text-blue-600 dark:text-blue-400' : 'text-stone-600 dark:text-stone-300'}`}>
                      {d.minTemp.toFixed(0)}° / {d.maxTemp.toFixed(0)}°
                    </div>
                    {d.precipMm > 0.5 && (
                      <div className="text-[9px] text-sky-500">{d.precipMm.toFixed(0)}mm</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── GARDEN SNAPSHOT ───────────────────────────────────────────── */}
        <SnapshotDashboardWidget
          onStartSnapshot={() => onNavigate?.('coach', 'snapshot')}
          onViewTimeline={() => onNavigate?.('coach', 'timeline')}
        />

        {/* ── HARVEST COUNTDOWN ─────────────────────────────────────────── */}
        {harvestEstimates.length > 0 && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <SectionHeader section="harvest" title="🌾 Harvest Countdown" count={harvestEstimates.length} />
            {!collapsed.has('harvest') && (
              <div className="px-4 py-3 space-y-2">
                {harvestEstimates.map((est) => {
                  const statusStyles: Record<string, string> = {
                    overdue: 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10',
                    ready: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10',
                    soon: 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10',
                    growing: 'border-stone-100 dark:border-stone-700 bg-stone-50/30 dark:bg-stone-800/30',
                  };
                  const labelStyles: Record<string, string> = {
                    overdue: 'text-red-600 dark:text-red-400',
                    ready: 'text-emerald-600 dark:text-emerald-400',
                    soon: 'text-amber-600 dark:text-amber-400',
                    growing: 'text-stone-500 dark:text-stone-400',
                  };
                  const barStyles: Record<string, string> = {
                    overdue: 'bg-red-500',
                    ready: 'bg-emerald-500',
                    soon: 'bg-amber-500',
                    growing: 'bg-sky-500',
                  };
                  return (
                    <div key={`${est.plantSlug}-${est.location}`} className={`rounded-xl border px-3 py-2 ${statusStyles[est.status]}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{est.emoji}</span>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate block">{est.plantName}</span>
                            <span className="text-[10px] text-stone-400 truncate block">{est.location}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-bold ${labelStyles[est.status]}`}>{est.label}</span>
                          <div className="text-[10px] text-stone-400">Planted {new Date(est.plantedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-1.5 w-full h-1.5 bg-stone-200 dark:bg-stone-600 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barStyles[est.status]}`} style={{ width: `${Math.round(est.progress * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CARE SUMMARY ───────────────────────────────────────────────── */}
        {plantedPlants.length > 0 && currentMonth >= 3 && currentMonth <= 10 && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <SectionHeader section="care" title={`🩺 ${getMonthName(currentMonth)} Care`} count={wateringSummary.daily.length + wateringSummary.regular.length + activePests.length} />
            {!collapsed.has('care') && (
              <div className="px-4 py-3 space-y-3">
                {/* Watering */}
                {(wateringSummary.daily.length > 0 || wateringSummary.regular.length > 0) && (
                  <div>
                    <h3 className="text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1.5">💧 Watering</h3>
                    {wateringSummary.daily.length > 0 && (
                      <div className="mb-1.5">
                        <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">Daily{currentMonth >= 6 && currentMonth <= 8 ? ' (2x in heat)' : ''}: </span>
                        <span className="text-[10px] text-stone-500">
                          {wateringSummary.daily.map((p) => `${p.emoji} ${p.commonName}`).join(', ')}
                        </span>
                      </div>
                    )}
                    {wateringSummary.regular.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Every 2-3 days: </span>
                        <span className="text-[10px] text-stone-500">
                          {wateringSummary.regular.map((p) => `${p.emoji} ${p.commonName}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Pest alerts */}
                {activePests.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1.5">🐛 Pest Watch</h3>
                    <div className="space-y-1">
                      {activePests.map((pest) => (
                        <div key={pest.name} className="text-[10px] px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                          <span className="font-semibold text-red-700 dark:text-red-300">{pest.name}</span>
                          <span className="text-stone-500 dark:text-stone-400"> — {pest.advice}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sow now */}
                {sowNow.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1.5">🌱 In Season Now</h3>
                    <div className="flex flex-wrap gap-1">
                      {sowNow.map((p) => (
                        <span key={p.slug} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                          plantedSlugs.has(p.slug)
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : 'bg-stone-50 dark:bg-stone-700/50 border-stone-100 dark:border-stone-700 text-stone-500'
                        }`}>
                          {p.emoji} {p.commonName}
                          {plantedSlugs.has(p.slug) && <span className="text-emerald-500">✓</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              {/* Full guide link */}
                <button
                  onClick={() => onNavigate?.('care')}
                  className="mt-2 w-full text-[11px] py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium"
                >
                  View Full Monthly Guide → Feeding, succession sowing, hardening off
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SETUP REFERENCE ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
          <SectionHeader section="setup" title="🔧 Setup Reference" count={GREENSTALK_SETUP.length} />
          {!collapsed.has('setup') && (
            <div className="px-4 py-3 space-y-2">
              {GREENSTALK_SETUP.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="text-base mt-0.5">{step.emoji}</span>
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">{step.title}: </span>
                    <span className="text-stone-500 dark:text-stone-400">{step.detail}</span>
                    {step.tip && (
                      <span className="text-emerald-600 dark:text-emerald-400 ml-1">💡 {step.tip}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All done? */}
        {overdueTasks.length === 0 && todayTasks.length === 0 && recurringTasks.length === 0 && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-8 text-center text-stone-400">
            <div className="text-3xl mb-2">✅</div>
            All caught up! Check back tomorrow.
          </div>
        )}

        {/* Attribution */}
        <p className="text-[10px] text-stone-400 text-center pb-4">
          Guidance from RHS, BBC Gardeners' World, Charles Dowding, and GreenStalk best practice.
        </p>
      </div>
    </div>
  );
}
