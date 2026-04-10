import { useState } from 'react';
import { usePlantDb } from '../data/use-plant-db';
import { useCompanionDb } from '../data/use-companion-db';
import { useRegion } from '../data/use-region';
import { usePlannerStore } from '../state/planner-store';
import { PlantDetail } from '../components/plant-palette/PlantDetail';
import type { Plant, PlantCategory } from '../types/plant';
import { isInWindow, getMonthName } from '../lib/calendar-utils';

const categories: { value: PlantCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Plants' },
  { value: 'vegetable', label: 'Vegetables' },
  { value: 'herb', label: 'Herbs' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'flower', label: 'Flowers' },
  { value: 'fern', label: 'Ferns' },
  { value: 'legume', label: 'Legumes' },
];

/** Safety badge shown next to plant names */
function SafetyBadges({ plant, compact }: { plant: Plant; compact?: boolean }) {
  const size = compact ? 'text-[8px] px-1 py-0' : 'text-[9px] px-1.5 py-0.5';
  return (
    <>
      {plant.childSafe === true && (
        <span className={`${size} bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 rounded-full font-medium`} title="Child-safe">
          {compact ? '👶' : '👶 Child Safe'}
        </span>
      )}
      {plant.childSafe === false && (
        <span className={`${size} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full font-medium`} title={plant.toxicWarning || 'Not child-safe'}>
          {compact ? '⚠️' : '⚠️ Caution'}
        </span>
      )}
      {plant.petSafe === false && (
        <span className={`${size} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full font-medium`} title="Toxic to pets">
          {compact ? '🐾' : '🐾 Pet Warning'}
        </span>
      )}
    </>
  );
}

function PlantRow({
  plant,
  onClick,
  childFriendlyMode,
}: {
  plant: Plant;
  onClick: () => void;
  childFriendlyMode: boolean;
}) {
  const currentMonth = new Date().getMonth() + 1;
  const canSowNow =
    isInWindow(currentMonth, plant.plantingWindow.sowIndoors) ||
    isInWindow(currentMonth, plant.plantingWindow.sowOutdoors);
  const canHarvestNow = isInWindow(currentMonth, plant.plantingWindow.harvest);

  return (
    <tr
      onClick={onClick}
      className={`hover:bg-stone-50 dark:hover:bg-stone-700 cursor-pointer transition-colors border-t border-stone-100 dark:border-stone-700 ${
        childFriendlyMode && plant.childSafe === false ? 'opacity-50' : ''
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{plant.emoji}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {plant.commonName}
              </span>
              {childFriendlyMode && <SafetyBadges plant={plant} compact />}
            </div>
            <div className="text-[10px] text-stone-400 italic">
              {plant.botanicalName}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400 capitalize">
        {plant.category}
      </td>
      <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400 capitalize">
        {plant.sun.replace('-', ' ')}
      </td>
      <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400 capitalize">
        {plant.water}
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            plant.greenstalkSuitability === 'ideal'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : plant.greenstalkSuitability === 'good'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
          }`}
        >
          {plant.greenstalkSuitability}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {canSowNow && (
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full">
              Sow now
            </span>
          )}
          {canHarvestNow && (
            <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 rounded-full">
              Harvest
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function KnowledgeBasePage() {
  const region = useRegion();
  const { plants, searchPlants } = usePlantDb(region);
  const { companionMap } = useCompanionDb();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PlantCategory | 'all'>('all');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const childFriendlyMode = usePlannerStore((s) => s.settings.childFriendlyMode ?? false);

  const filtered = (() => {
    let result = search ? searchPlants(search) : plants;
    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }
    if (childFriendlyMode) {
      // Sort safe plants first, unsafe plants last (but still show them with warnings)
      result = [...result].sort((a, b) => {
        const aUnsafe = a.childSafe === false ? 1 : 0;
        const bUnsafe = b.childSafe === false ? 1 : 0;
        return aUnsafe - bUnsafe;
      });
    }
    return result;
  })();

  const currentMonth = new Date().getMonth() + 1;
  const childSafeCount = plants.filter((p) => p.childSafe === true).length;

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6">
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-1">
        Plant Knowledge Base
      </h1>
      <p className="text-sm text-stone-400 mb-4">
        {plants.length} plants in database — {region === 'us' ? 'Manhattan Beach, CA' : 'Surrey, UK'} growing conditions —{' '}
        {getMonthName(currentMonth)} {new Date().getFullYear()}
        {childFriendlyMode && (
          <span className="ml-2 text-sky-600 dark:text-sky-400 font-medium">
            — 👶 Child-Friendly Mode ({childSafeCount} safe plants)
          </span>
        )}
      </p>

      {/* Child-friendly mode banner */}
      {childFriendlyMode && (
        <div className="mb-4 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200/60 dark:border-sky-800/40 text-sm text-sky-800 dark:text-sky-200">
          <span className="font-semibold">Child-Friendly Mode active.</span>{' '}
          Plants with toxic warnings are dimmed and marked. Look for the 👶 badge for confirmed safe plants.
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4">
        <input
          type="text"
          placeholder="Search plants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 dark:text-stone-100 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 w-full sm:w-64"
        />
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                category === cat.value
                  ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        {filtered.map((plant) => {
          const canSowNow =
            isInWindow(currentMonth, plant.plantingWindow.sowIndoors) ||
            isInWindow(currentMonth, plant.plantingWindow.sowOutdoors);
          const canHarvestNow = isInWindow(currentMonth, plant.plantingWindow.harvest);
          const dimmed = childFriendlyMode && plant.childSafe === false;
          return (
            <button
              key={plant.slug}
              onClick={() => setSelectedPlant(plant)}
              className={`w-full text-left bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-3 flex items-center gap-3 active:bg-stone-50 dark:active:bg-stone-700 transition-colors ${dimmed ? 'opacity-50' : ''}`}
            >
              <span className="text-2xl">{plant.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">
                  {plant.commonName}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 rounded capitalize">{plant.category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 rounded capitalize">{plant.sun.replace('-', ' ')}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    plant.greenstalkSuitability === 'ideal'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : plant.greenstalkSuitability === 'good'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}>{plant.greenstalkSuitability}</span>
                  {childFriendlyMode && <SafetyBadges plant={plant} compact />}
                  {canSowNow && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded">Sow now</span>}
                  {canHarvestNow && <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 rounded">Harvest</span>}
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-stone-400 py-12">
            No plants match your search
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 dark:bg-stone-700 text-left">
              <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                Plant
              </th>
              <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                Type
              </th>
              <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                Sun
              </th>
              <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                Water
              </th>
              <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                GreenStalk
              </th>
              <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                Now
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((plant) => (
              <PlantRow
                key={plant.slug}
                plant={plant}
                onClick={() => setSelectedPlant(plant)}
                childFriendlyMode={childFriendlyMode}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-sm text-stone-400 py-12">
            No plants match your search
          </div>
        )}
      </div>

      {selectedPlant && (
        <PlantDetail
          plant={selectedPlant}
          companionMap={companionMap}
          onClose={() => setSelectedPlant(null)}
        />
      )}
    </div>
    </div>
  );
}
