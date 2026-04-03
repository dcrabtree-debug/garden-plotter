import { useState, useMemo } from 'react';
import { PlantCard } from './PlantCard';
import type { Plant, PlantCategory } from '../../types/plant';

interface PlantPaletteProps {
  plants: Plant[];
  onSelectPlant: (plant: Plant) => void;
  activePlantSlug?: string | null;
}

const categories: { value: PlantCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vegetable', label: 'Veg' },
  { value: 'herb', label: 'Herbs' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'flower', label: 'Flowers' },
  { value: 'legume', label: 'Legumes' },
];

export function PlantPalette({ plants, onSelectPlant, activePlantSlug }: PlantPaletteProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PlantCategory | 'all'>('all');

  const filtered = useMemo(() => {
    let result = plants;
    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.commonName.toLowerCase().includes(q) ||
          p.botanicalName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [plants, search, category]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-stone-200 dark:border-stone-700">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-2">
          Plant Palette
        </h2>
        <input
          type="text"
          placeholder="Search plants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm border border-stone-200 dark:border-stone-600 rounded-lg bg-stone-50 dark:bg-stone-700 dark:text-stone-100 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 focus:bg-white dark:focus:bg-stone-600 transition-colors"
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
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
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.map((plant) => (
          <PlantCard
            key={plant.slug}
            plant={plant}
            onSelect={onSelectPlant}
            isActive={activePlantSlug === plant.slug}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-stone-400 py-8">
            No plants match your search
          </div>
        )}
      </div>
      <div className="p-2 border-t border-stone-200 dark:border-stone-700 text-[10px] text-stone-400 text-center">
        Click a plant to select, then click a pocket to place
      </div>
    </div>
  );
}
