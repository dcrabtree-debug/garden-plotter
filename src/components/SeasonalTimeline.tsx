/**
 * Seasonal Timeline Scrubber
 *
 * A slider showing the garden's state month-by-month:
 * which plants are actively growing, which are being sown/transplanted,
 * and which are ready to harvest. Renders as a horizontal bar with
 * color-coded plant activity indicators.
 */

import { useState, useMemo } from 'react';
import { getMonthName, isInWindow } from '../lib/calendar-utils';
import type { Plant } from '../types/plant';
import type { GardenCell } from '../types/planner';

interface Props {
  cells: GardenCell[][];
  plantMap: Map<string, Plant>;
  towerPlants: { slug: string; tierNumber: number }[];
}

type Activity = 'sow-indoors' | 'sow-outdoors' | 'transplant' | 'growing' | 'harvest' | 'dormant';

const ACTIVITY_COLORS: Record<Activity, string> = {
  'sow-indoors': '#93c5fd',    // sky blue
  'sow-outdoors': '#86efac',   // emerald light
  'transplant': '#fcd34d',     // amber
  'growing': '#4ade80',        // green
  'harvest': '#f87171',        // rose
  'dormant': '#d1d5db',        // gray
};

const ACTIVITY_LABELS: Record<Activity, string> = {
  'sow-indoors': 'Sow indoors',
  'sow-outdoors': 'Sow outdoors',
  'transplant': 'Transplant',
  'growing': 'Growing',
  'harvest': 'Harvest',
  'dormant': 'Dormant',
};

function getPlantActivity(plant: Plant, month: number): Activity {
  const pw = plant.plantingWindow;

  if (pw.harvest && isInWindow(month, pw.harvest)) return 'harvest';
  if (pw.transplant && isInWindow(month, pw.transplant)) return 'transplant';
  if (pw.sowOutdoors && isInWindow(month, pw.sowOutdoors)) return 'sow-outdoors';
  if (pw.sowIndoors && isInWindow(month, pw.sowIndoors)) return 'sow-indoors';

  // Check if the plant is actively growing (between sow and harvest)
  const sowStart = pw.sowIndoors?.[0] ?? pw.sowOutdoors?.[0] ?? pw.transplant?.[0];
  const harvestEnd = pw.harvest?.[1];
  if (sowStart && harvestEnd) {
    if (sowStart <= harvestEnd) {
      if (month >= sowStart && month <= harvestEnd) return 'growing';
    } else {
      if (month >= sowStart || month <= harvestEnd) return 'growing';
    }
  }

  return 'dormant';
}

export function SeasonalTimeline({ cells, plantMap, towerPlants }: Props) {
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Collect unique planted plants
  const plantedPlants = useMemo(() => {
    const slugs = new Set<string>();

    // Garden grid
    for (const row of cells) {
      for (const cell of row) {
        if (cell.plantSlug) slugs.add(cell.plantSlug);
      }
    }

    // GreenStalk towers
    for (const tp of towerPlants) {
      slugs.add(tp.slug);
    }

    return [...slugs]
      .map((s) => plantMap.get(s))
      .filter((p): p is Plant => p !== undefined)
      .sort((a, b) => a.commonName.localeCompare(b.commonName));
  }, [cells, towerPlants, plantMap]);

  // Activity summary for selected month
  const activitySummary = useMemo(() => {
    const summary: Record<Activity, Plant[]> = {
      'sow-indoors': [],
      'sow-outdoors': [],
      'transplant': [],
      'growing': [],
      'harvest': [],
      'dormant': [],
    };

    for (const plant of plantedPlants) {
      const activity = getPlantActivity(plant, selectedMonth);
      summary[activity].push(plant);
    }

    return summary;
  }, [plantedPlants, selectedMonth]);

  // Activity counts per month (for the bar chart)
  const monthCounts = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      let active = 0;
      let harvestable = 0;
      for (const plant of plantedPlants) {
        const activity = getPlantActivity(plant, m);
        if (activity !== 'dormant') active++;
        if (activity === 'harvest') harvestable++;
      }
      return { month: m, active, harvestable, total: plantedPlants.length };
    });
  }, [plantedPlants]);

  const maxActive = Math.max(1, ...monthCounts.map((m) => m.active));

  if (plantedPlants.length === 0) {
    return (
      <div className="bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center text-xs text-stone-400">
        Add plants to your garden or GreenStalk towers to see the seasonal timeline.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-2">
          <span>📆</span> Seasonal Timeline
        </h3>
        <p className="text-[10px] text-stone-400 mt-0.5">
          Scrub through the year to see what's happening in your garden each month
        </p>
      </div>

      {/* Month bar chart + slider */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-end gap-0.5 h-16 mb-1">
          {monthCounts.map(({ month, active, harvestable }) => {
            const height = (active / maxActive) * 100;
            const harvestHeight = (harvestable / maxActive) * 100;
            const isSelected = month === selectedMonth;
            const isCurrent = month === currentMonth;

            return (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`flex-1 flex flex-col justify-end rounded-t transition-all relative ${
                  isSelected ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                }`}
                style={{ height: '100%' }}
                title={`${getMonthName(month)}: ${active} active plants`}
              >
                {/* Harvest portion (red) on top of active (green) */}
                <div
                  className="w-full rounded-t transition-all duration-300"
                  style={{
                    height: `${height}%`,
                    minHeight: active > 0 ? 4 : 0,
                    background: `linear-gradient(to top, #4ade80 ${100 - (harvestHeight / Math.max(height, 1)) * 100}%, #f87171 100%)`,
                    opacity: isSelected ? 1 : 0.6,
                  }}
                />
                {isCurrent && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Month labels */}
        <div className="flex gap-0.5">
          {monthCounts.map(({ month }) => (
            <div
              key={month}
              className={`flex-1 text-center text-[7px] py-0.5 cursor-pointer transition-colors ${
                month === selectedMonth
                  ? 'font-bold text-stone-800 dark:text-stone-100'
                  : month === currentMonth
                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                  : 'text-stone-400'
              }`}
              onClick={() => setSelectedMonth(month)}
            >
              {getMonthName(month).slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Slider */}
        <input
          type="range"
          min={1}
          max={12}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="w-full mt-1 accent-emerald-600"
        />
      </div>

      {/* Selected month detail */}
      <div className="px-4 pb-3">
        <h4 className="text-xs font-bold text-stone-700 dark:text-stone-200 mb-2">
          {getMonthName(selectedMonth)} — {monthCounts[selectedMonth - 1].active} active plants
        </h4>

        <div className="space-y-2">
          {(Object.entries(activitySummary) as [Activity, Plant[]][])
            .filter(([, plants]) => plants.length > 0)
            .filter(([activity]) => activity !== 'dormant')
            .map(([activity, plants]) => (
              <div key={activity}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: ACTIVITY_COLORS[activity] }}
                  />
                  <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wide">
                    {ACTIVITY_LABELS[activity]}
                  </span>
                  <span className="text-[9px] text-stone-400">({plants.length})</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-4">
                  {plants.map((p) => (
                    <span
                      key={p.slug}
                      className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: `${ACTIVITY_COLORS[activity]}20`,
                        borderColor: `${ACTIVITY_COLORS[activity]}60`,
                        color: activity === 'dormant' ? '#9ca3af' : '#374151',
                      }}
                    >
                      <span>{p.emoji}</span>
                      <span>{p.commonName}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}

          {/* Dormant count (collapsed) */}
          {activitySummary.dormant.length > 0 && (
            <div className="text-[9px] text-stone-400 mt-1">
              {activitySummary.dormant.length} plant{activitySummary.dormant.length !== 1 ? 's' : ''} dormant:{' '}
              {activitySummary.dormant.map((p) => p.commonName).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-stone-50 dark:bg-stone-900/30 border-t border-stone-100 dark:border-stone-700 flex flex-wrap gap-x-3 gap-y-1">
        {(Object.entries(ACTIVITY_LABELS) as [Activity, string][])
          .filter(([a]) => a !== 'dormant')
          .map(([activity, label]) => (
            <div key={activity} className="flex items-center gap-1 text-[8px] text-stone-400">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ACTIVITY_COLORS[activity] }}
              />
              {label}
            </div>
          ))}
      </div>
    </div>
  );
}
