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
import {
  type Phase, type PriorityTask, PRIORITY_TASKS,
  MOVE_IN, GEAR_ARRIVES, FIRST_FROST,
  PHASE_LABELS, PHASE_BADGE_COLORS, CATEGORY_COLORS,
  getPhase, daysBetween,
  loadChecklist, saveChecklist,
} from '../lib/priority-tasks';
import { groupPlantingActions, type PlantingActionGroup } from '../lib/planting-actions';
import {
  getCurrentWeeklyMethods,
  getNextWeeklyMethods,
  type WeeklyExpertWindow,
} from '../data/expert-weekly-methods';
import {
  useSowEventStore,
  computeSuccessionReminders,
  type SuccessionReminder,
  type SowActionType,
} from '../state/sow-event-store';
import {
  getUKExpertKnowledge,
  getExpertProfile,
  EXPERT_COLORS,
  type UKExpertId,
} from '../data/expert-uk-knowledge';

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

// Checklist persistence + CATEGORY_COLORS imported from ../lib/priority-tasks

// ── Section collapse state ──────────────────────────────────────────────────
type Section = 'overdue' | 'today' | 'care' | 'upcoming' | 'harvest' | 'planting-actions';

// ── Component ───────────────────────────────────────────────────────────────

export function DashboardPage({ onNavigate }: { onNavigate?: (tab: string, view?: string) => void }) {
  const settings = usePlannerStore((s) => s.settings);
  const towers = usePlannerStore((s) => s.towers);
  const markPlanted = usePlannerStore((s) => s.markPlanted);
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

  // ── Harvest → Kitchen (Stephanie Hafferty angle) ─────────────────────────
  // Pull Hafferty tips + any harvest/flavour-category tip for crops you're
  // actively harvesting this month. Becomes the "What to cook" card.
  const cookingTips = useMemo(() => {
    const tips: { plantSlug: string; plantName: string; emoji: string; expert: string; tip: string; category: string }[] = [];
    for (const plant of harvestNow) {
      const uk = getUKExpertKnowledge(plant.slug);
      if (!uk) continue;
      for (const t of uk.tips) {
        // Hafferty is the harvest-to-kitchen bridge; also include harvest/flavour tips from other experts.
        if (t.expert === 'hafferty' || t.category === 'harvest' || t.category === 'flavour') {
          tips.push({
            plantSlug: plant.slug,
            plantName: plant.commonName,
            emoji: plant.emoji,
            expert: t.expert,
            tip: t.tip,
            category: t.category,
          });
        }
      }
    }
    // Prioritise Hafferty first (the harvest-to-kitchen specialist), then harvest, then flavour.
    const expertOrder: Record<string, number> = { hafferty: 0, larkcom: 1, wong: 2, fowler: 3, monty: 4, flowerdew: 5, richards: 6, rhs: 7 };
    tips.sort((a, b) => (expertOrder[a.expert] ?? 99) - (expertOrder[b.expert] ?? 99));
    return tips;
  }, [harvestNow]);

  const sowNow = useMemo(() => {
    return plants.filter((p) => {
      const pw = p.plantingWindow;
      return isInWindow(currentMonth, pw.sowIndoors) || isInWindow(currentMonth, pw.sowOutdoors) || isInWindow(currentMonth, pw.transplant);
    }).slice(0, 12);
  }, [plants, currentMonth]);

  // ── Planting actions for the current month (sow/transplant/harvest) ──────
  // Drives the "Planting Actions" card in the to-do column.
  const plantingActionGroups = useMemo<PlantingActionGroup[]>(() => {
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    return groupPlantingActions(plantedPlants, currentMonth, getMonthName(nextMonth));
  }, [plantedPlants, currentMonth]);

  const totalPlantingActions = plantingActionGroups
    .filter((g) => g.id !== 'coming-next')
    .reduce((sum, g) => sum + g.actions.length, 0);

  // ── Succession reminders (event-driven) ──────────────────────────────────
  const sowEvents = useSowEventStore((s) => s.events);
  const logSowEvent = useSowEventStore((s) => s.logEvent);

  const successionReminders = useMemo<SuccessionReminder[]>(() => {
    const candidates = plantedPlants
      .map((p) => {
        const uk = getUKExpertKnowledge(p.slug);
        if (!uk?.successionDays) return null;
        return { slug: p.slug, commonName: p.commonName, emoji: p.emoji, successionDays: uk.successionDays };
      })
      .filter(Boolean) as { slug: string; commonName: string; emoji: string; successionDays: number }[];
    return computeSuccessionReminders(candidates, sowEvents, today);
  }, [plantedPlants, sowEvents, today]);

  // ── Unified Action Plan ──────────────────────────────────────────────────
  // Merges priority tasks, planting actions, pest alerts, and watering into
  // ONE prioritized list so the Dashboard has a single place to see "what
  // needs doing, when, and why". See `UnifiedAction` for the shared shape.

  type UnifiedTier = 'urgent' | 'this-week' | 'ongoing' | 'this-month';

  interface UnifiedAction {
    id: string;
    tier: UnifiedTier;
    sortKey: number;           // lower = higher in list
    icon: string;              // leading emoji
    label: string;             // what to do
    when: string;              // short deadline/window chip text
    why: string;               // one-line reasoning
    chipClass: string;         // tailwind classes for the "when" chip
    taskRef?: PriorityTask;    // if set, renders as checkable PriorityTask row
    accentClass?: string;      // left-border accent
  }

  const unifiedActions = useMemo<UnifiedAction[]>(() => {
    const items: UnifiedAction[] = [];
    const isSummer = currentMonth >= 6 && currentMonth <= 8;

    // 1. Priority tasks (one-time) — bucketed by deadline proximity
    for (const task of todayTasks) {
      if (completedTasks.has(task.id)) continue;
      const daysUntil = task.deadlineDate
        ? daysBetween(today, new Date(task.deadlineDate))
        : 99;
      const tier: UnifiedTier =
        daysUntil <= 2 ? 'urgent' : daysUntil <= 7 ? 'this-week' : 'this-month';
      items.push({
        id: `task-${task.id}`,
        tier,
        sortKey: task.priority + (tier === 'urgent' ? 0 : tier === 'this-week' ? 100 : 300),
        icon: task.category === 'shopping' ? '🛒' : task.category === 'planting' ? '🌱' : task.category === 'setup' ? '🧰' : '🔧',
        label: task.label,
        when: task.deadline ? `By ${task.deadline}` : 'This week',
        why: task.detail,
        chipClass: tier === 'urgent'
          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
        taskRef: task,
        accentClass: tier === 'urgent' ? 'border-l-red-400' : 'border-l-rose-300',
      });
    }

    // 2. Last-chance planting actions — window closes THIS month. Critical.
    const lastChancePlantingReasons: Record<string, string> = {
      'sow-indoors': 'Window closes this month — sow now or skip the season for this crop.',
      'sow-outdoors': 'Soil window closes this month — direct-sow now while soil temp still holds.',
      'transplant': 'Last transplant slot — hardened-off seedlings need the ground now.',
      'harvest': 'Peak picking — leaving crops on the plant past their window reduces flavour and yield.',
    };
    const justStartedReasons: Record<string, string> = {
      'sow-indoors': 'Window just opened — starting now gives the longest growing window.',
      'sow-outdoors': 'Soil is warm enough — direct-sow for an even, fast-germinating crop.',
      'transplant': 'Safe to transplant — harden seedlings 7 days then move out.',
      'harvest': 'First crops ready — pick early for concentrated flavour.',
    };
    const allMonthReasons: Record<string, string> = {
      'sow-indoors': 'Active sowing window — stagger every 2 weeks for succession.',
      'sow-outdoors': 'Active direct-sow window — succession sow for continuous harvest.',
      'transplant': 'Active transplant window — move seedlings when roots fill their modules.',
      'harvest': 'Picking window active — harvest little and often to keep plants producing.',
    };
    const kindMeta: Record<string, { icon: string; verb: string }> = {
      'sow-indoors': { icon: '🏠', verb: 'Sow indoors' },
      'sow-outdoors': { icon: '🌤️', verb: 'Direct-sow' },
      'transplant': { icon: '🪴', verb: 'Transplant' },
      'harvest': { icon: '🍎', verb: 'Harvest' },
    };

    for (const group of plantingActionGroups) {
      if (group.id === 'coming-next') continue;
      const meta = kindMeta[group.id as keyof typeof kindMeta];
      for (const a of group.actions) {
        const isLastChance = a.timing === 'last-chance';
        const isJustStarted = a.timing === 'just-started';
        const tier: UnifiedTier = isLastChance ? 'urgent' : isJustStarted ? 'this-week' : 'ongoing';
        const whenText = isLastChance
          ? `Closes ${getMonthName(currentMonth)}`
          : isJustStarted
            ? `New this ${getMonthName(currentMonth)}`
            : `${getMonthName(currentMonth)} window`;
        const reasons = isLastChance
          ? lastChancePlantingReasons
          : isJustStarted
            ? justStartedReasons
            : allMonthReasons;
        items.push({
          id: `plant-${a.plantSlug}-${a.kind}`,
          tier,
          sortKey: isLastChance ? 5 : isJustStarted ? 150 : 400,
          icon: `${a.emoji}${meta.icon}`,
          label: `${meta.verb}: ${a.plantName}`,
          when: whenText,
          why: reasons[a.kind as keyof typeof reasons],
          chipClass: isLastChance
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            : isJustStarted
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-stone-100 dark:bg-stone-700/50 text-stone-600 dark:text-stone-300',
          accentClass: isLastChance
            ? 'border-l-red-400'
            : isJustStarted
              ? 'border-l-emerald-400'
              : 'border-l-stone-300',
        });
      }
    }

    // 3. Pest alerts — actionable NOW, slotted as urgent/this-week.
    for (const pest of activePests) {
      items.push({
        id: `pest-${pest.name}`,
        tier: 'this-week',
        sortKey: 50,
        icon: '🐛',
        label: `Pest watch: ${pest.name}`,
        when: `${getMonthName(currentMonth)} risk`,
        why: pest.advice,
        chipClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
        accentClass: 'border-l-orange-400',
      });
    }

    // 4. Watering — surfaced as ongoing rhythm, escalated in peak summer.
    if (wateringSummary.daily.length > 0) {
      const names = wateringSummary.daily.map((p) => `${p.emoji} ${p.commonName}`).join(', ');
      items.push({
        id: 'water-daily',
        tier: isSummer ? 'urgent' : 'ongoing',
        sortKey: isSummer ? 20 : 500,
        icon: '💧',
        label: isSummer ? 'Water daily (2× in heatwaves)' : 'Water daily',
        when: 'Every day',
        why: `${names} — high-water crops in small pockets dry out fast. Morning or evening, not midday.`,
        chipClass: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
        accentClass: isSummer ? 'border-l-sky-500' : 'border-l-sky-300',
      });
    }
    if (wateringSummary.regular.length > 0) {
      const names = wateringSummary.regular.map((p) => `${p.emoji} ${p.commonName}`).join(', ');
      items.push({
        id: 'water-regular',
        tier: 'ongoing',
        sortKey: 520,
        icon: '💧',
        label: 'Water every 2-3 days',
        when: 'Every 2-3d',
        why: `${names} — check before watering. GreenStalk top tier dries faster than lower tiers.`,
        chipClass: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
        accentClass: 'border-l-sky-200',
      });
    }

    // 5. Recurring priority tasks (feeding, checks) — ongoing rhythm.
    for (const task of recurringTasks) {
      if (completedTasks.has(task.id)) continue;
      items.push({
        id: `recurring-${task.id}`,
        tier: 'ongoing',
        sortKey: 550 + task.priority,
        icon: task.category === 'maintenance' ? '🔧' : '🔁',
        label: task.label,
        when: 'Recurring',
        why: task.detail,
        chipClass: 'bg-stone-100 dark:bg-stone-700/50 text-stone-600 dark:text-stone-300',
        taskRef: task,
        accentClass: 'border-l-stone-300',
      });
    }

    // 6. Succession reminders — "Time to re-sow!" driven by actual sow events.
    for (const r of successionReminders) {
      const isVeryOverdue = r.daysOverdue > r.successionDays; // missed a whole cycle
      items.push({
        id: `succession-${r.slug}-${r.action}`,
        tier: isVeryOverdue ? 'urgent' : 'this-week',
        sortKey: isVeryOverdue ? 15 : 120,
        icon: `${r.emoji}🔁`,
        label: `Re-sow: ${r.plantName}`,
        when: `${r.daysOverdue}d overdue`,
        why: `Last sowed ${new Date(r.lastSowDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (${r.daysSinceLast}d ago). Larkcom interval: every ${r.successionDays} days for continuous harvest.`,
        chipClass: isVeryOverdue
          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          : 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300',
        accentClass: isVeryOverdue ? 'border-l-red-400' : 'border-l-lime-400',
      });
    }

    items.sort((a, b) => a.sortKey - b.sortKey);
    return items;
  }, [todayTasks, recurringTasks, plantingActionGroups, activePests, wateringSummary, currentMonth, completedTasks, today, successionReminders]);

  const actionsByTier = useMemo(() => {
    const map: Record<UnifiedTier, UnifiedAction[]> = {
      'urgent': [],
      'this-week': [],
      'ongoing': [],
      'this-month': [],
    };
    for (const a of unifiedActions) map[a.tier].push(a);
    return map;
  }, [unifiedActions]);

  // ── Fortnightly expert methods (date-aware) ──────────────────────────────
  const weeklyMethod: WeeklyExpertWindow = useMemo(() => getCurrentWeeklyMethods(today), [today.toDateString()]);
  const nextWeeklyMethod: WeeklyExpertWindow = useMemo(() => getNextWeeklyMethods(today), [today.toDateString()]);

  const frost = getFrostGuidance(currentMonth);

  // ── Harvest countdown ────────────────────────────────────────────────────

  const harvestEstimates = useMemo(
    () => getHarvestEstimates(towers, plantMap),
    [towers, plantMap],
  );

  // Count planned-but-not-planted pockets (plantSlug set, plantedDate null)
  const unplantedPockets = useMemo(() => {
    const items: { towerId: string; towerName: string; tierNumber: number; pocketIndex: number; slug: string; name: string; emoji: string }[] = [];
    for (const tower of towers) {
      for (const tier of tower.tiers) {
        for (let pi = 0; pi < tier.pockets.length; pi++) {
          const p = tier.pockets[pi];
          if (p.plantSlug && !p.plantedDate) {
            const plant = plantMap.get(p.plantSlug);
            items.push({
              towerId: tower.id, towerName: tower.name,
              tierNumber: tier.tierNumber, pocketIndex: pi,
              slug: p.plantSlug,
              name: plant?.commonName ?? p.plantSlug,
              emoji: plant?.emoji ?? '🌱',
            });
          }
        }
      }
    }
    return items;
  }, [towers, plantMap]);

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

  function renderUnifiedAction(item: UnifiedAction) {
    // If the item wraps a real PriorityTask, keep the checkable behavior.
    const isCheckable = !!item.taskRef;
    const done = item.taskRef ? completedTasks.has(item.taskRef.id) : false;

    return (
      <div
        key={item.id}
        className={`px-3 py-2.5 flex items-start gap-3 border-l-4 ${item.accentClass ?? 'border-l-stone-200 dark:border-l-stone-700'} ${
          isCheckable ? 'cursor-pointer transition-all hover:bg-stone-50 dark:hover:bg-stone-700/30' : ''
        } ${done ? 'opacity-50' : ''}`}
        onClick={isCheckable && item.taskRef ? () => toggleTask(item.taskRef!.id) : undefined}
      >
        {isCheckable ? (
          <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
            done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 dark:border-stone-500'
          }`}>
            {done && <span className="text-xs">✓</span>}
          </div>
        ) : (
          <div className="mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 text-base" aria-hidden>
            {item.icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${done ? 'line-through text-stone-400' : 'text-stone-800 dark:text-stone-100'}`}>
              {item.label}
            </span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${item.chipClass}`}>
              📅 {item.when}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${done ? 'text-stone-300 dark:text-stone-600' : 'text-stone-500 dark:text-stone-400'}`}>
            {item.why}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.taskRef?.buyUrl && !done && (
              <a
                href={item.taskRef.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-200 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                🛒 Buy →
              </a>
            )}
            {/* "I did this" button for planting actions and succession reminders */}
            {(item.id.startsWith('plant-') || item.id.startsWith('succession-')) && (
              <button
                className="text-[9px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-colors font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  // Extract slug and action from item.id:
                  // plant-{slug}-{action} or succession-{slug}-{action}
                  const parts = item.id.split('-');
                  const prefix = parts[0]; // 'plant' or 'succession'
                  const actionPart = parts[parts.length - 1] as SowActionType; // last segment
                  // slug is everything between prefix and action
                  const slug = parts.slice(1, -1).join('-');
                  // Only valid sow actions
                  const validActions: SowActionType[] = ['sow-indoors', 'sow-outdoors', 'transplant', 'harvest'];
                  // For compound action like "sow-indoors", the split creates extra parts.
                  // Re-derive from the actual planting action groups instead:
                  let resolvedSlug = slug;
                  let resolvedAction: SowActionType = 'sow-outdoors';
                  if (prefix === 'plant') {
                    // item.id = "plant-{slug}-{kind}" where kind is like "sow-indoors"
                    // But kind itself has a hyphen, so we have to parse carefully
                    for (const kind of validActions) {
                      if (item.id.endsWith(`-${kind}`)) {
                        resolvedAction = kind;
                        resolvedSlug = item.id.slice('plant-'.length, -(kind.length + 1));
                        break;
                      }
                    }
                  } else {
                    // succession-{slug}-{action}
                    for (const kind of validActions) {
                      if (item.id.endsWith(`-${kind}`)) {
                        resolvedAction = kind;
                        resolvedSlug = item.id.slice('succession-'.length, -(kind.length + 1));
                        break;
                      }
                    }
                  }
                  logSowEvent(resolvedSlug, resolvedAction);
                }}
              >
                ✅ I did this today
              </button>
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
    <div className="h-full overflow-y-auto scroll-touch">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
        {/* Header — refined hierarchy */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-800 dark:text-stone-100">
              Dashboard
            </h1>
            <p className="text-[13px] text-stone-400 dark:text-stone-500 mt-0.5">
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ${PHASE_BADGE_COLORS[phase]}`}>
              {phaseInfo.emoji} {phaseInfo.label}
            </div>
            {daysToFrost > 0 && (
              <span className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">{daysToFrost}d left in season</span>
            )}
          </div>
        </div>

        {/* Progress bar — gradient fill, always visible sliver */}
        {totalOneTime > 0 && (
          <div className="bg-white dark:bg-stone-800/80 rounded-2xl border border-stone-200/60 dark:border-stone-700/40 px-4 py-3.5 elevation-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-stone-600 dark:text-stone-300">Season progress</span>
              <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
              <div className="progress-bar-fill h-full" style={{ width: `${Math.max(progressPct, 2)}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-stone-400 dark:text-stone-500">{completedCount} of {totalOneTime} setup tasks done</span>
              {overdueTasks.length > 0 && (
                <span className="text-[11px] font-semibold text-red-500">{overdueTasks.length} overdue</span>
              )}
            </div>
          </div>
        )}

        {/* Alerts row — refined gradient banners */}
        <div className="flex flex-col gap-2.5">
          {frostAlert && frostAlert.level !== 'none' && (
            <div className={`text-[13px] px-4 py-2.5 rounded-xl font-medium border ${
              frostAlert.level === 'hard'
                ? 'bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-900/20 dark:to-red-900/10 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/40'
                : 'bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-900/20 dark:to-amber-900/10 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40'
            }`}>
              {frostAlert.level === 'hard' ? '🥶' : '⚠️'} {frostAlert.message}
            </div>
          )}
          {rainAlert?.message && (
            <div className="text-[13px] px-4 py-2.5 bg-gradient-to-r from-sky-50 to-sky-50/50 dark:from-sky-900/20 dark:to-sky-900/10 text-sky-700 dark:text-sky-300 rounded-xl font-medium border border-sky-200/60 dark:border-sky-800/40">
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
            <div className="text-[13px] px-4 py-2.5 bg-gradient-to-r from-rose-50 to-orange-50/50 dark:from-rose-900/20 dark:to-orange-900/10 text-rose-700 dark:text-rose-300 rounded-xl font-medium border border-rose-200/60 dark:border-rose-800/40">
              🍎 Harvest ready: {harvestNow.map((p) => `${p.emoji} ${p.commonName}`).join(', ')}
            </div>
          )}
        </div>

        {/* ── GARDEN CENTRE TRIPS ──────────────────────────────────────── */}
        {(() => {
          const gcTrips = PRIORITY_TASKS
            .filter((t) => t.id.startsWith('gc-') && t.phases.includes(phase) && !completedTasks.has(t.id))
            .sort((a, b) => (a.deadlineDate ?? '').localeCompare(b.deadlineDate ?? ''));
          if (gcTrips.length === 0) return null;
          return (
            <div className="bg-white dark:bg-stone-800/80 rounded-2xl border border-teal-200/60 dark:border-teal-800/40 overflow-hidden elevation-1">
              <div className="px-4 py-2.5 border-b border-teal-100 dark:border-teal-800/50">
                <h2 className="text-sm font-bold text-teal-800 dark:text-teal-300">
                  🚗 Garden Centre Trips
                </h2>
                <p className="text-[10px] text-stone-400 mt-0.5">Max 1 trip per week — Squires for plugs, Wisley for premium starts</p>
              </div>
              <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
                {gcTrips.map((trip) => {
                  const done = completedTasks.has(trip.id);
                  // Extract plant names from detail (after "Buy: ")
                  const plantList = trip.detail.match(/Buy:\s*([^.]+)/)?.[1] ?? '';
                  const isOverdue = trip.deadlineDate ? daysBetween(today, new Date(trip.deadlineDate)) < 0 : false;
                  return (
                    <div
                      key={trip.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors ${done ? 'opacity-50' : ''}`}
                      onClick={() => toggleTask(trip.id)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-teal-400 dark:border-teal-600'
                          }`}>
                            {done && <span className="text-[10px]">✓</span>}
                          </div>
                          <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">{trip.label}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                        }`}>
                          📅 By {trip.deadline}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-6">
                        {plantList.split(',').map((p, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
                            {p.trim()}
                          </span>
                        ))}
                      </div>
                      {trip.buyUrl && (
                        <a
                          href={trip.buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block ml-6 mt-1.5 text-[10px] text-teal-600 dark:text-teal-400 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📍 Directions →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ═══ FORTNIGHTLY EXPERT METHODS ═══ */}
        <section className="bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 dark:from-amber-900/15 dark:via-stone-800/40 dark:to-emerald-900/15 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 overflow-hidden elevation-1">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-amber-200/40 dark:border-amber-800/30 flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <span>🌿</span> This Fortnight — {weeklyMethod.dateLabel}
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                {weeklyMethod.stage} · {weeklyMethod.title}
              </p>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-white/70 dark:bg-stone-800/70 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
              Weeks {weeklyMethod.startWeek}–{weeklyMethod.endWeek}
            </span>
          </div>

          <div className="px-4 sm:px-5 py-3 sm:py-4">
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-snug italic mb-4">
              {weeklyMethod.headline}
            </p>

            {/* Featured technique — the hero of each fortnight */}
            <div className="bg-white/80 dark:bg-stone-800/70 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/30 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🧑‍🌾</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400 font-bold mb-0.5">
                    Dowding · Featured Technique
                  </div>
                  <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-1.5">
                    {weeklyMethod.dowding.technique.title}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    {weeklyMethod.dowding.technique.detail}
                  </p>
                  <p className="text-[11px] italic text-amber-700 dark:text-amber-400 mt-2">
                    💡 {weeklyMethod.dowding.keyTip}
                  </p>
                </div>
              </div>
            </div>

            {/* Three-column expert grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Dowding tasks */}
              <div className="bg-white/60 dark:bg-stone-800/50 rounded-xl p-3 border border-amber-200/40 dark:border-amber-800/30">
                <div className="text-[10px] uppercase tracking-wide font-bold text-amber-700 dark:text-amber-400 mb-1.5">
                  Dowding · No-Dig Tasks
                </div>
                <ul className="space-y-1">
                  {weeklyMethod.dowding.tasks.map((task, i) => (
                    <li key={i} className="text-[11px] text-stone-600 dark:text-stone-300 flex gap-1.5">
                      <span className="text-amber-500 shrink-0">▸</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Fukuoka */}
              <div className="bg-white/60 dark:bg-stone-800/50 rounded-xl p-3 border border-emerald-200/40 dark:border-emerald-800/30">
                <div className="text-[10px] uppercase tracking-wide font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                  Fukuoka · Natural Farming
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed italic mb-2">
                  "{weeklyMethod.fukuoka.reflection}"
                </p>
                <p className="text-[11px] text-stone-700 dark:text-stone-200 font-medium leading-snug">
                  🌱 {weeklyMethod.fukuoka.practice}
                </p>
              </div>

              {/* Hessayon */}
              <div className="bg-white/60 dark:bg-stone-800/50 rounded-xl p-3 border border-stone-200 dark:border-stone-700">
                <div className="text-[10px] uppercase tracking-wide font-bold text-stone-600 dark:text-stone-300 mb-1.5">
                  Hessayon · Reference
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug mb-2">
                  {weeklyMethod.hessayon.focus}
                </p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 italic">
                  📖 {weeklyMethod.hessayon.reference}
                </p>
              </div>
            </div>

            {/* Featured crop of the fortnight */}
            {weeklyMethod.featuredCrop && (
              <div className="mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/70 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                <span className="text-2xl">{weeklyMethod.featuredCrop.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400 font-bold">
                    Featured Crop
                  </div>
                  <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                    {weeklyMethod.featuredCrop.name}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    {weeklyMethod.featuredCrop.action}
                  </div>
                </div>
              </div>
            )}

            {/* Next window preview */}
            <div className="mt-3 text-[10px] text-stone-400 dark:text-stone-500">
              Next fortnight ({nextWeeklyMethod.dateLabel}): <span className="text-stone-500 dark:text-stone-400 font-medium">{nextWeeklyMethod.title}</span>
            </div>
          </div>
        </section>

        {/* ═══ TWO-COLUMN GRID ON DESKTOP ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── LEFT COLUMN: Action Items ────────────────────────────────── */}
        <div className="space-y-5">

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

        {/* ── UNIFIED ACTION PLAN ────────────────────────────────────────── */}
        {/* Merges priority tasks, planting actions, pest alerts, and watering */}
        {/* rhythm into ONE prioritized list. Each item: what · when · why. */}
        {unifiedActions.length > 0 && (
          <div className="bg-white dark:bg-stone-800/80 rounded-2xl border border-stone-200/60 dark:border-stone-700/40 overflow-hidden elevation-1">
            <SectionHeader
              section="today"
              title={`🎯 Your ${getMonthName(currentMonth)} Action Plan`}
              count={unifiedActions.length}
            />
            {!collapsed.has('today') && (
              <>
                <p className="px-4 pt-3 text-[11px] text-stone-500 dark:text-stone-400">
                  One prioritized list: setup tasks, planting windows, pest alerts, and watering rhythm — merged and ranked by urgency.
                </p>

                {actionsByTier['urgent'].length > 0 && (
                  <div className="mt-3">
                    <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                      🚨 Do Now — urgent
                    </div>
                    <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
                      {actionsByTier['urgent'].map(renderUnifiedAction)}
                    </div>
                  </div>
                )}

                {actionsByTier['this-week'].length > 0 && (
                  <div className="mt-3">
                    <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      ⏰ This Week
                    </div>
                    <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
                      {actionsByTier['this-week'].map(renderUnifiedAction)}
                    </div>
                  </div>
                )}

                {actionsByTier['ongoing'].length > 0 && (
                  <div className="mt-3">
                    <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      🔁 Ongoing Rhythm
                    </div>
                    <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
                      {actionsByTier['ongoing'].map(renderUnifiedAction)}
                    </div>
                  </div>
                )}

                {actionsByTier['this-month'].length > 0 && (
                  <div className="mt-3 border-t border-stone-100 dark:border-stone-700/50">
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      📅 Later This Month
                    </div>
                    <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
                      {actionsByTier['this-month'].map(renderUnifiedAction)}
                    </div>
                  </div>
                )}

                {upcomingTasks.length > 0 && (
                  <div className="mt-3 border-t border-stone-100 dark:border-stone-700/50">
                    <button
                      onClick={() => toggleSection('upcoming')}
                      className="w-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/30"
                    >
                      <span>🔮 Next Few Weeks ({upcomingTasks.length})</span>
                      <span>{collapsed.has('upcoming') ? '▸' : '▾'}</span>
                    </button>
                    {!collapsed.has('upcoming') && (
                      <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
                        {upcomingTasks.map((t) => renderTask(t))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        </div>{/* end left column */}

        {/* ── RIGHT COLUMN: Data & Status ─────────────────────────────── */}
        <div className="space-y-5">

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
            {(() => {
              // Actionable advice line — picks the most urgent situation.
              // Priority: hard frost > frost risk > heavy rain > heat > dry warm > perfect > default.
              const days = forecast.days;
              if (days.length === 0) return null;
              const hardFrostDay = days.find((d) => d.minTemp <= 0);
              const frostDay = days.find((d) => d.minTemp > 0 && d.minTemp <= 3);
              const heavyRainDay = days.find((d) => d.precipMm > 10);
              const moderateRainDay = days.find((d) => d.precipMm > 5);
              const hotDays = days.filter((d) => d.maxTemp > 25).length;
              const sunnyDry = days.filter((d) => d.maxTemp >= 15 && d.precipMm < 1).length;
              const windyDay = days.find((d) => d.maxGustKph > 50);

              type Tone = 'warn' | 'info' | 'good';
              let advice: { tone: Tone; text: string } | null = null;

              const labelFor = (iso: string) => {
                const d = new Date(iso);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                if (d.toDateString() === today.toDateString()) return 'tonight';
                if (d.toDateString() === tomorrow.toDateString()) return 'tomorrow night';
                return d.toLocaleDateString('en-GB', { weekday: 'long' }) + ' night';
              };

              if (hardFrostDay) {
                advice = { tone: 'warn', text: `Hard frost ${labelFor(hardFrostDay.date)} (${hardFrostDay.minTemp.toFixed(0)}°C). Cover tender plants with fleece or move pots inside.` };
              } else if (frostDay) {
                advice = { tone: 'warn', text: `Frost risk ${labelFor(frostDay.date)} (${frostDay.minTemp.toFixed(0)}°C). Cover tender plants with fleece.` };
              } else if (heavyRainDay) {
                advice = { tone: 'info', text: `Heavy rain ${new Date(heavyRainDay.date).toLocaleDateString('en-GB', { weekday: 'long' })} (${heavyRainDay.precipMm.toFixed(0)}mm). Skip watering, check drainage on GreenStalks.` };
              } else if (hotDays >= 2) {
                advice = { tone: 'warn', text: `🌡️ Hot spell ahead (${hotDays} days > 25°C). Water GreenStalks twice daily, shade lettuce and spinach.` };
              } else if (windyDay) {
                advice = { tone: 'warn', text: `💨 Windy ${new Date(windyDay.date).toLocaleDateString('en-GB', { weekday: 'long' })} (gusts ${windyDay.maxGustKph.toFixed(0)} km/h). Stake tall plants, secure pots.` };
              } else if (moderateRainDay) {
                advice = { tone: 'info', text: `Rain ${new Date(moderateRainDay.date).toLocaleDateString('en-GB', { weekday: 'long' })} — nature's watering day, skip the watering can.` };
              } else if (sunnyDry >= 3) {
                advice = { tone: 'good', text: '☀️ Perfect planting weather this week. Great time to sow outdoors or transplant.' };
              } else {
                advice = { tone: 'good', text: 'Steady growing weather. Keep an eye on soil moisture; water if the top 2cm feels dry.' };
              }

              const toneClass =
                advice.tone === 'warn'
                  ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                  : advice.tone === 'info'
                  ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/50'
                  : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50';

              return (
                <div className={`mt-2 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border ${toneClass}`}>
                  {advice.text}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── GARDEN SNAPSHOT ───────────────────────────────────────────── */}
        <SnapshotDashboardWidget
          onStartSnapshot={() => onNavigate?.('coach', 'snapshot')}
          onViewTimeline={() => onNavigate?.('coach', 'timeline')}
        />

        {/* ── PLANT THE CLOCK — planned but not yet physically planted ──── */}
        {unplantedPockets.length > 0 && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-amber-100 dark:border-amber-800/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                🌱 Ready to plant? Start the clock!
              </h2>
              <button
                onClick={() => {
                  for (const p of unplantedPockets) {
                    markPlanted(p.towerId, p.tierNumber, p.pocketIndex);
                  }
                }}
                className="text-[11px] px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
              >
                Plant all today
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                You have {unplantedPockets.length} plants planned but not yet marked as planted. Tap individual plants or "Plant all" to start harvest countdowns.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...new Map(unplantedPockets.map(p => [p.slug, p])).values()].map((p) => {
                  const count = unplantedPockets.filter(x => x.slug === p.slug).length;
                  return (
                    <button
                      key={p.slug}
                      onClick={() => {
                        for (const pocket of unplantedPockets.filter(x => x.slug === p.slug)) {
                          markPlanted(pocket.towerId, pocket.tierNumber, pocket.pocketIndex);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 active:scale-95 transition-all"
                    >
                      <span>{p.emoji}</span>
                      <span className="font-medium">{p.name}</span>
                      {count > 1 && <span className="text-amber-500">x{count}</span>}
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Plant</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

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

        {/* ── IN-SEASON REFERENCE (not actions — those live in Action Plan) */}
        {plantedPlants.length > 0 && currentMonth >= 3 && currentMonth <= 10 && sowNow.length > 0 && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="px-4 py-3">
              <h3 className="text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-2">
                🌱 In Season This {getMonthName(currentMonth)}
              </h3>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-2">
                Reference only — actionable items for YOUR crops are in the Action Plan above.
                Green ✓ = you already grow it.
              </p>
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
              <button
                onClick={() => onNavigate?.('care')}
                className="mt-3 w-full text-[11px] py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium"
              >
                View Full Care Guide → Feeding, succession, hardening off
              </button>
            </div>
          </div>
        )}

        {/* ── WHAT TO COOK THIS WEEK (Hafferty harvest-to-kitchen angle) ── */}
        {cookingTips.length > 0 && (
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-2xl border border-pink-200 dark:border-pink-800/50 overflow-hidden">
            <div className="px-4 py-3">
              <h3 className="text-[11px] font-bold text-pink-700 dark:text-pink-300 mb-2 flex items-center gap-1.5">
                🍳 What to Cook This {getMonthName(currentMonth)}
                <span className="text-[9px] font-normal text-stone-400 dark:text-stone-500">
                  Hafferty · Larkcom · Wong
                </span>
              </h3>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 mb-3">
                Harvest-to-kitchen guidance for the {harvestNow.length} crop{harvestNow.length === 1 ? '' : 's'} you're picking right now.
              </p>
              <div className="space-y-2">
                {cookingTips.slice(0, 5).map((t, i) => {
                  const colors = EXPERT_COLORS[t.expert as keyof typeof EXPERT_COLORS] ?? EXPERT_COLORS.rhs;
                  const profile = getExpertProfile(t.expert as UKExpertId);
                  return (
                    <div
                      key={`${t.plantSlug}-${i}`}
                      className={`text-xs rounded-lg px-2.5 py-2 ring-1 bg-white/70 dark:bg-stone-800/40 ${colors.ring}`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-sm">{t.emoji}</span>
                        <span className="font-semibold text-stone-700 dark:text-stone-200">{t.plantName}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                          {profile?.name ?? t.expert} · {t.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug">{t.tip}</div>
                    </div>
                  );
                })}
                {cookingTips.length > 5 && (
                  <p className="text-[10px] text-stone-400 italic">
                    + {cookingTips.length - 5} more kitchen tips in the Plant Details for each crop.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick-link to GreenStalk Setup Guide (full version lives in Learn > Setup Guide) */}
        <button
          onClick={() => onNavigate?.('learn')}
          className="w-full text-left bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">📐 GreenStalk Setup Guide</span>
            <span className="text-xs text-stone-400">Learn → Setup Guide →</span>
          </div>
        </button>

        </div>{/* end right column */}
        </div>{/* end grid */}

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
