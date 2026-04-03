import { useState } from 'react';
import { usePlantDb } from '../data/use-plant-db';
import { useCompanionDb } from '../data/use-companion-db';
import { PlantDetail } from '../components/plant-palette/PlantDetail';
import type { Plant, PlantCategory } from '../types/plant';
import { isInWindow, getMonthName } from '../lib/calendar-utils';

const categories: { value: PlantCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Plants' },
  { value: 'vegetable', label: 'Vegetables' },
  { value: 'herb', label: 'Herbs' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'flower', label: 'Flowers' },
  { value: 'legume', label: 'Legumes' },
];

function PlantRow({
  plant,
  onClick,
}: {
  plant: Plant;
  onClick: () => void;
}) {
  const currentMonth = new Date().getMonth() + 1;
  const canSowNow =
    isInWindow(currentMonth, plant.plantingWindow.sowIndoors) ||
    isInWindow(currentMonth, plant.plantingWindow.sowOutdoors);
  const canHarvestNow = isInWindow(currentMonth, plant.plantingWindow.harvest);

  return (
    <tr
      onClick={onClick}
      className="hover:bg-stone-50 dark:hover:bg-stone-700 cursor-pointer transition-colors border-t border-stone-100 dark:border-stone-700"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{plant.emoji}</span>
          <div>
            <div className="text-sm font-medium text-stone-700 dark:text-stone-200">
              {plant.commonName}
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
              ? 'bg-emerald-100 text-emerald-700'
              : plant.greenstalkSuitability === 'good'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
          }`}
        >
          {plant.greenstalkSuitability}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {canSowNow && (
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
              Sow now
            </span>
          )}
          {canHarvestNow && (
            <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full">
              Harvest
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function KnowledgeBasePage() {
  const { plants, searchPlants } = usePlantDb();
  const { companionMap } = useCompanionDb();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PlantCategory | 'all'>('all');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  const filtered = (() => {
    let result = search ? searchPlants(search) : plants;
    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }
    return result;
  })();

  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-1">
        Plant Knowledge Base
      </h1>
      <p className="text-sm text-stone-400 mb-4">
        {plants.length} plants in database — Surrey, UK growing conditions —{' '}
        {getMonthName(currentMonth)} {new Date().getFullYear()}
      </p>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search plants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 dark:text-stone-100 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 w-64"
        />
        <div className="flex gap-1">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
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

      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
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
  );
}
