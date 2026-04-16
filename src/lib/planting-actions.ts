// ═══════════════════════════════════════════════════════════════════════════
// Planting actions helper — derives "what to do this month" for planted crops
// from their planting windows. Previously lived inline in CalendarPage; now
// shared with Dashboard (to-do list) and Care page.
// ═══════════════════════════════════════════════════════════════════════════

import type { Plant } from '../types/plant';
import { isInWindow } from './calendar-utils';

export type ActionTiming = 'last-chance' | 'all-month' | 'just-started';
export type ActionKind =
  | 'sow-indoors'
  | 'sow-outdoors'
  | 'transplant'
  | 'harvest';

export interface PlantingAction {
  kind: ActionKind;
  plantSlug: string;
  plantName: string;
  emoji: string;
  timing: ActionTiming;
}

export interface PlantingActionGroup {
  id: ActionKind | 'coming-next';
  title: string;
  icon: string;
  headingClass: string;
  chipClass: string;
  actions: PlantingAction[];
}

function timingFor(window: [number, number] | null, month: number): ActionTiming {
  if (!window) return 'all-month';
  if (month === window[1]) return 'last-chance';
  if (month === window[0]) return 'just-started';
  return 'all-month';
}

/**
 * Compute flat list of actions due THIS month for the given planted plants.
 * Returns a sorted list, urgent first (last-chance before just-started before all-month).
 */
export function getPlantingActions(plantedPlants: Plant[], month: number): PlantingAction[] {
  const result: PlantingAction[] = [];
  for (const plant of plantedPlants) {
    const pw = plant.plantingWindow;
    const base = { plantSlug: plant.slug, plantName: plant.commonName, emoji: plant.emoji };
    if (isInWindow(month, pw.sowIndoors)) {
      result.push({ ...base, kind: 'sow-indoors', timing: timingFor(pw.sowIndoors, month) });
    }
    if (isInWindow(month, pw.sowOutdoors)) {
      result.push({ ...base, kind: 'sow-outdoors', timing: timingFor(pw.sowOutdoors, month) });
    }
    if (isInWindow(month, pw.transplant)) {
      result.push({ ...base, kind: 'transplant', timing: timingFor(pw.transplant, month) });
    }
    if (isInWindow(month, pw.harvest)) {
      result.push({ ...base, kind: 'harvest', timing: timingFor(pw.harvest, month) });
    }
  }
  const order: Record<ActionTiming, number> = { 'last-chance': 0, 'just-started': 1, 'all-month': 2 };
  result.sort((a, b) => order[a.timing] - order[b.timing]);
  return result;
}

/**
 * Group actions by kind for UI rendering. Includes a "coming next month" group
 * for anything that isn't active this month but starts next month.
 */
export function groupPlantingActions(
  plantedPlants: Plant[],
  month: number,
  nextMonthName: string,
): PlantingActionGroup[] {
  const nextMonth = month === 12 ? 1 : month + 1;
  const actions = getPlantingActions(plantedPlants, month);

  const byKind = new Map<ActionKind, PlantingAction[]>();
  for (const a of actions) {
    if (!byKind.has(a.kind)) byKind.set(a.kind, []);
    byKind.get(a.kind)!.push(a);
  }

  const comingNext: PlantingAction[] = [];
  for (const plant of plantedPlants) {
    const pw = plant.plantingWindow;
    const base = { plantSlug: plant.slug, plantName: plant.commonName, emoji: plant.emoji };
    if (!isInWindow(month, pw.sowIndoors) && isInWindow(nextMonth, pw.sowIndoors)) {
      comingNext.push({ ...base, kind: 'sow-indoors', timing: 'all-month' });
    }
    if (!isInWindow(month, pw.transplant) && isInWindow(nextMonth, pw.transplant)) {
      comingNext.push({ ...base, kind: 'transplant', timing: 'all-month' });
    }
  }

  const groups: PlantingActionGroup[] = [];
  const kindMeta: Record<ActionKind, { title: string; icon: string; headingClass: string; chipClass: string }> = {
    'sow-indoors': {
      title: 'Sow Indoors',
      icon: '🏠',
      headingClass: 'text-sky-700 dark:text-sky-300',
      chipClass: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800',
    },
    'sow-outdoors': {
      title: 'Direct Sow Outdoors',
      icon: '🌤️',
      headingClass: 'text-emerald-700 dark:text-emerald-300',
      chipClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    },
    'transplant': {
      title: 'Transplant Out',
      icon: '🪴',
      headingClass: 'text-amber-700 dark:text-amber-300',
      chipClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    },
    'harvest': {
      title: 'Ready to Harvest',
      icon: '🍎',
      headingClass: 'text-rose-700 dark:text-rose-300',
      chipClass: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
    },
  };

  const ORDER: ActionKind[] = ['sow-indoors', 'sow-outdoors', 'transplant', 'harvest'];
  for (const kind of ORDER) {
    const list = byKind.get(kind);
    if (list && list.length > 0) {
      groups.push({ id: kind, ...kindMeta[kind], actions: list });
    }
  }
  if (comingNext.length > 0) {
    groups.push({
      id: 'coming-next',
      title: `Coming in ${nextMonthName}`,
      icon: '📅',
      headingClass: 'text-stone-500 dark:text-stone-400',
      chipClass: 'bg-stone-50 dark:bg-stone-700/50 border-stone-200 dark:border-stone-700',
      actions: comingNext,
    });
  }
  return groups;
}
