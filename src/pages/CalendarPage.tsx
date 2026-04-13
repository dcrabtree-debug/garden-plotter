import { useMemo } from 'react';
import { usePlannerStore } from '../state/planner-store';
import { useGardenStore } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import {
  getMonthName,
  isInWindow,
  getCurrentMonth,
  SURREY_LAST_FROST_MONTH,
  SURREY_FIRST_FROST_MONTH,
} from '../lib/calendar-utils';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function CalendarBar({
  window,
  color,
}: {
  window: [number, number] | null;
  color: string;
}) {
  if (!window) return null;
  return (
    <div className="flex gap-px">
      {MONTHS.map((m) => (
        <div
          key={m}
          className={`flex-1 h-3 rounded-sm ${isInWindow(m, window) ? color : 'bg-transparent'}`}
        />
      ))}
    </div>
  );
}

export function CalendarPage() {
  const towers = usePlannerStore((s) => s.towers);
  const garden = useGardenStore((s) => s.garden);
  const region = useRegion();
  const { plantMap } = usePlantDb(region);
  const currentMonth = getCurrentMonth();

  // Collect slugs from both GreenStalk towers AND in-ground garden cells
  const { plantedSlugs, plantSources } = useMemo(() => {
    const slugs = new Set<string>();
    const sources = new Map<string, { greenstalk: boolean; inGround: boolean }>();

    const ensureSource = (slug: string) => {
      if (!sources.has(slug)) sources.set(slug, { greenstalk: false, inGround: false });
      return sources.get(slug)!;
    };

    // GreenStalk tower plants
    for (const tower of towers) {
      for (const tier of tower.tiers) {
        for (const pocket of tier.pockets) {
          if (pocket.plantSlug) {
            slugs.add(pocket.plantSlug);
            ensureSource(pocket.plantSlug).greenstalk = true;
          }
        }
      }
    }

    // In-ground garden plants
    for (const row of garden.cells) {
      for (const cell of row) {
        if (cell.plantSlug) {
          slugs.add(cell.plantSlug);
          ensureSource(cell.plantSlug).inGround = true;
        }
      }
    }

    return { plantedSlugs: Array.from(slugs), plantSources: sources };
  }, [towers, garden.cells]);

  const plantedPlants = plantedSlugs
    .map((slug) => plantMap.get(slug))
    .filter(Boolean)
    .sort((a, b) => a!.commonName.localeCompare(b!.commonName));

  // Grouped actions for this month
  interface CalendarAction {
    emoji: string;
    name: string;
    timing: 'last-chance' | 'all-month' | 'just-started';
  }

  interface ActionGroup {
    id: string;
    title: string;
    icon: string;
    headingClass: string;
    chipClass: string;
    actions: CalendarAction[];
  }

  const actionGroups = useMemo(() => {
    const sowIndoors: CalendarAction[] = [];
    const sowOutdoors: CalendarAction[] = [];
    const transplant: CalendarAction[] = [];
    const harvest: CalendarAction[] = [];
    const comingNext: CalendarAction[] = [];
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

    const getTiming = (w: [number, number] | null): 'last-chance' | 'all-month' | 'just-started' => {
      if (!w) return 'all-month';
      if (currentMonth === w[1]) return 'last-chance';
      if (currentMonth === w[0]) return 'just-started';
      return 'all-month';
    };

    for (const plant of plantedPlants) {
      if (!plant) continue;
      const pw = plant.plantingWindow;
      const base = { emoji: plant.emoji, name: plant.commonName };

      if (isInWindow(currentMonth, pw.sowIndoors)) sowIndoors.push({ ...base, timing: getTiming(pw.sowIndoors) });
      if (isInWindow(currentMonth, pw.sowOutdoors)) sowOutdoors.push({ ...base, timing: getTiming(pw.sowOutdoors) });
      if (isInWindow(currentMonth, pw.transplant)) transplant.push({ ...base, timing: getTiming(pw.transplant) });
      if (isInWindow(currentMonth, pw.harvest)) harvest.push({ ...base, timing: getTiming(pw.harvest) });

      if (!isInWindow(currentMonth, pw.sowIndoors) && isInWindow(nextMonth, pw.sowIndoors)) comingNext.push({ ...base, timing: 'all-month' });
      if (!isInWindow(currentMonth, pw.transplant) && isInWindow(nextMonth, pw.transplant)) comingNext.push({ ...base, timing: 'all-month' });
    }

    const sortByUrgency = (a: CalendarAction, b: CalendarAction) => {
      const order = { 'last-chance': 0, 'just-started': 1, 'all-month': 2 };
      return order[a.timing] - order[b.timing];
    };

    sowIndoors.sort(sortByUrgency);
    sowOutdoors.sort(sortByUrgency);
    transplant.sort(sortByUrgency);
    harvest.sort(sortByUrgency);

    const groups: ActionGroup[] = [];
    if (sowIndoors.length > 0) groups.push({ id: 'sow-indoors', title: 'Sow Indoors', icon: '🏠', headingClass: 'text-sky-700 dark:text-sky-300', chipClass: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800', actions: sowIndoors });
    if (sowOutdoors.length > 0) groups.push({ id: 'sow-outdoors', title: 'Direct Sow Outdoors', icon: '🌤️', headingClass: 'text-emerald-700 dark:text-emerald-300', chipClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', actions: sowOutdoors });
    if (transplant.length > 0) groups.push({ id: 'transplant', title: 'Transplant Out', icon: '🪴', headingClass: 'text-amber-700 dark:text-amber-300', chipClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', actions: transplant });
    if (harvest.length > 0) groups.push({ id: 'harvest', title: 'Ready to Harvest', icon: '🍎', headingClass: 'text-rose-700 dark:text-rose-300', chipClass: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800', actions: harvest });
    if (comingNext.length > 0) groups.push({ id: 'coming-next', title: `Coming in ${getMonthName(nextMonth)}`, icon: '📅', headingClass: 'text-stone-500 dark:text-stone-400', chipClass: 'bg-stone-50 dark:bg-stone-700/50 border-stone-200 dark:border-stone-700', actions: comingNext });

    return groups;
  }, [plantedPlants, currentMonth]);

  if (plantedPlants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-stone-400 dark:text-stone-500">
        <div className="text-center">
          <p className="text-lg mb-1">No plants placed yet</p>
          <p className="text-sm">
            Add plants to your GreenStalks or garden map to see the seasonal calendar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-1">
        Seasonal Calendar
      </h1>
      <p className="text-sm text-stone-400 mb-4">
        Surrey, UK growing season — {plantedPlants.length} crops from GreenStalk towers + garden map
      </p>

      {/* This month action panel — grouped by action type */}
      {actionGroups.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4 mb-4">
          <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-3">
            📋 {getMonthName(currentMonth)} — What to do now
          </h2>
          <div className="space-y-3">
            {actionGroups.map((group) => (
              <div key={group.id}>
                <h3 className={`text-xs font-semibold ${group.headingClass} mb-1.5`}>
                  {group.icon} {group.title}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {group.actions.map((a, i) => (
                    <span
                      key={`${group.id}-${i}`}
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${
                        a.timing === 'last-chance'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold'
                          : `${group.chipClass} text-stone-700 dark:text-stone-200`
                      }`}
                    >
                      <span>{a.emoji}</span>
                      <span>{a.name}</span>
                      {a.timing === 'last-chance' && (
                        <span className="text-[8px] ml-0.5 text-red-500">last chance</span>
                      )}
                      {a.timing === 'just-started' && (
                        <span className="text-[8px] ml-0.5 text-emerald-500 font-medium">new</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden overflow-x-auto">
        <div className="min-w-[480px]">
        {/* Month headers */}
        <div className="flex items-center border-b border-stone-100 dark:border-stone-700 px-2 sm:px-4 py-2">
          <div className="w-24 sm:w-40 shrink-0" />
          <div className="flex flex-1 gap-px">
            {MONTHS.map((m) => (
              <div
                key={m}
                className={`flex-1 text-center text-[8px] sm:text-[10px] font-medium ${
                  m === currentMonth
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : m < SURREY_LAST_FROST_MONTH || m > SURREY_FIRST_FROST_MONTH
                      ? 'text-blue-400 dark:text-blue-300'
                      : 'text-stone-400 dark:text-stone-500'
                }`}
              >
                {getMonthName(m).slice(0, 3)}
              </div>
            ))}
          </div>
        </div>

        {/* Frost overlay row */}
        <div className="flex items-center border-b border-stone-50 dark:border-stone-700 px-2 sm:px-4 py-1">
          <div className="w-24 sm:w-40 shrink-0 text-[10px] text-stone-400 dark:text-stone-500">Frost risk</div>
          <div className="flex flex-1 gap-px">
            {MONTHS.map((m) => (
              <div
                key={m}
                className={`flex-1 h-2 rounded-sm ${
                  m < SURREY_LAST_FROST_MONTH || m > SURREY_FIRST_FROST_MONTH
                    ? 'bg-blue-100 dark:bg-blue-900/40'
                    : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current month indicator */}
        <div className="flex items-center px-2 sm:px-4 py-0.5">
          <div className="w-24 sm:w-40 shrink-0" />
          <div className="flex flex-1 gap-px">
            {MONTHS.map((m) => (
              <div key={m} className="flex-1 flex justify-center">
                {m === currentMonth && (
                  <div className="w-0.5 h-3 bg-emerald-500 rounded" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Plant rows */}
        {plantedPlants.map((plant) => {
          if (!plant) return null;
          const w = plant.plantingWindow;
          return (
            <div
              key={plant.slug}
              className="flex items-center border-t border-stone-50 dark:border-stone-700 px-2 sm:px-4 py-2 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
            >
              <div className="w-28 sm:w-48 shrink-0 flex items-center gap-1 sm:gap-2">
                <span className="text-sm">{plant.emoji}</span>
                <div className="min-w-0">
                  <span className="text-xs font-medium text-stone-700 dark:text-stone-200 truncate block">
                    {plant.commonName}
                  </span>
                  <div className="flex gap-1">
                    {plantSources.get(plant.slug)?.greenstalk && (
                      <span className="text-[7px] text-emerald-600 dark:text-emerald-400">GS</span>
                    )}
                    {plantSources.get(plant.slug)?.inGround && (
                      <span className="text-[7px] text-amber-600 dark:text-amber-400">Garden</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-0.5">
                <CalendarBar window={w.sowIndoors} color="bg-sky-200 dark:bg-sky-800" />
                <CalendarBar window={w.sowOutdoors} color="bg-emerald-200 dark:bg-emerald-800" />
                <CalendarBar window={w.transplant} color="bg-amber-200 dark:bg-amber-800" />
                <CalendarBar window={w.harvest} color="bg-rose-200 dark:bg-rose-800" />
              </div>
            </div>
          );
        })}

        </div>{/* end min-w wrapper */}
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-2 sm:px-4 py-3 border-t border-stone-100 dark:border-stone-700 text-[10px] text-stone-400 dark:text-stone-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-sky-200 dark:bg-sky-800" /> Sow indoors
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-emerald-200 dark:bg-emerald-800" /> Sow outdoors
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-amber-200 dark:bg-amber-800" /> Transplant
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-rose-200 dark:bg-rose-800" /> Harvest
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-blue-100 dark:bg-blue-900/40" /> Frost risk
          </span>
        </div>
      </div>
    </div>
  );
}
