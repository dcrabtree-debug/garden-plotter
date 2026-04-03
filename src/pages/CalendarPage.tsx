import { useMemo } from 'react';
import { usePlannerStore } from '../state/planner-store';
import { usePlantDb } from '../data/use-plant-db';
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
  const { plantMap } = usePlantDb();
  const currentMonth = getCurrentMonth();

  const plantedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const tower of towers) {
      for (const tier of tower.tiers) {
        for (const pocket of tier.pockets) {
          if (pocket.plantSlug) slugs.add(pocket.plantSlug);
        }
      }
    }
    return Array.from(slugs);
  }, [towers]);

  const plantedPlants = plantedSlugs
    .map((slug) => plantMap.get(slug))
    .filter(Boolean)
    .sort((a, b) => a!.commonName.localeCompare(b!.commonName));

  if (plantedPlants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-stone-400">
        <div className="text-center">
          <p className="text-lg mb-1">No plants in your towers yet</p>
          <p className="text-sm">
            Add plants to your GreenStalks to see the seasonal calendar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-stone-800 mb-1">
        Seasonal Calendar
      </h1>
      <p className="text-sm text-stone-400 mb-6">
        Surrey, UK growing season — showing your planted crops
      </p>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Month headers */}
        <div className="flex items-center border-b border-stone-100 px-4 py-2">
          <div className="w-40" />
          <div className="flex flex-1 gap-px">
            {MONTHS.map((m) => (
              <div
                key={m}
                className={`flex-1 text-center text-[10px] font-medium ${
                  m === currentMonth
                    ? 'text-emerald-600'
                    : m < SURREY_LAST_FROST_MONTH || m > SURREY_FIRST_FROST_MONTH
                      ? 'text-blue-400'
                      : 'text-stone-400'
                }`}
              >
                {getMonthName(m)}
              </div>
            ))}
          </div>
        </div>

        {/* Frost overlay row */}
        <div className="flex items-center border-b border-stone-50 px-4 py-1">
          <div className="w-40 text-[10px] text-stone-400">Frost risk</div>
          <div className="flex flex-1 gap-px">
            {MONTHS.map((m) => (
              <div
                key={m}
                className={`flex-1 h-2 rounded-sm ${
                  m < SURREY_LAST_FROST_MONTH || m > SURREY_FIRST_FROST_MONTH
                    ? 'bg-blue-100'
                    : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current month indicator */}
        <div className="flex items-center px-4 py-0.5">
          <div className="w-40" />
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
              className="flex items-center border-t border-stone-50 px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              <div className="w-40 flex items-center gap-2">
                <span className="text-sm">{plant.emoji}</span>
                <span className="text-xs font-medium text-stone-700 truncate">
                  {plant.commonName}
                </span>
              </div>
              <div className="flex-1 space-y-0.5">
                <CalendarBar window={w.sowIndoors} color="bg-sky-200" />
                <CalendarBar window={w.sowOutdoors} color="bg-emerald-200" />
                <CalendarBar window={w.transplant} color="bg-amber-200" />
                <CalendarBar window={w.harvest} color="bg-rose-200" />
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-stone-100 text-[10px] text-stone-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-sky-200" /> Sow indoors
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-emerald-200" /> Sow outdoors
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-amber-200" /> Transplant
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-rose-200" /> Harvest
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-blue-100" /> Frost risk
          </span>
        </div>
      </div>
    </div>
  );
}
