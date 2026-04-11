import { useState, useMemo } from 'react';
import { PlantCard } from './PlantCard';
import type { Plant, PlantCategory } from '../../types/plant';

type SortMode = 'best-fit' | 'a-z' | 'season';

interface PlantPaletteProps {
  plants: Plant[];
  onSelectPlant: (plant: Plant) => void;
  onInfoClick?: (plant: Plant) => void;
  activePlantSlug?: string | null;
  context?: 'greenstalk' | 'garden';
}

const categories: { value: PlantCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vegetable', label: 'Veg' },
  { value: 'herb', label: 'Herbs' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'flower', label: 'Flowers' },
  { value: 'legume', label: 'Legumes' },
];

const SUIT_ORDER: Record<string, number> = { ideal: 0, good: 1, marginal: 2, unsuitable: 3 };

function isInSeason(plant: Plant): boolean {
  const m = new Date().getMonth() + 1;
  const pw = plant.plantingWindow;
  const check = (w: [number, number] | null) => {
    if (!w) return false;
    return w[0] <= w[1] ? m >= w[0] && m <= w[1] : m >= w[0] || m <= w[1];
  };
  return check(pw.sowIndoors) || check(pw.sowOutdoors) || check(pw.transplant);
}

export function PlantPalette({ plants, onSelectPlant, onInfoClick, activePlantSlug, context = 'greenstalk' }: PlantPaletteProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PlantCategory | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>(context === 'greenstalk' ? 'best-fit' : 'a-z');
  const [tierFilter, setTierFilter] = useState<number | null>(null);

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
    if (tierFilter !== null) {
      result = result.filter((p) => p.idealTiers?.includes(tierFilter));
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortMode === 'best-fit' && context === 'greenstalk') {
        const sa = SUIT_ORDER[a.greenstalkSuitability] ?? 3;
        const sb = SUIT_ORDER[b.greenstalkSuitability] ?? 3;
        if (sa !== sb) return sa - sb;
      }
      if (sortMode === 'season') {
        const aIn = isInSeason(a) ? 0 : 1;
        const bIn = isInSeason(b) ? 0 : 1;
        if (aIn !== bIn) return aIn - bIn;
      }
      return a.commonName.localeCompare(b.commonName);
    });

    return result;
  }, [plants, search, category, sortMode, context, tierFilter]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-stone-700/50">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-2">
          Plant Palette
        </h2>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search plants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-stone-200 dark:border-stone-600 rounded-full bg-stone-50 dark:bg-stone-700 dark:text-stone-100 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 focus:bg-white dark:focus:bg-stone-600 transition-colors shadow-inner"
          />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                category === cat.value
                  ? 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mt-1.5">
          {([
            ...(context === 'greenstalk' ? [{ value: 'best-fit' as SortMode, label: '⭐ Best fit' }] : []),
            { value: 'a-z' as SortMode, label: 'A–Z' },
            { value: 'season' as SortMode, label: '🌱 In season' },
          ]).map((s) => (
            <button
              key={s.value}
              onClick={() => setSortMode(s.value)}
              className={`text-[9px] px-1.5 py-0.5 rounded-full transition-colors ${
                sortMode === s.value
                  ? 'bg-stone-600 text-white dark:bg-stone-500'
                  : 'bg-stone-50 dark:bg-stone-800 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {/* GreenStalk tier filter */}
        {context === 'greenstalk' && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[9px] text-stone-400 shrink-0">Tier:</span>
            {[1, 2, 3, 4, 5].map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(tierFilter === t ? null : t)}
                className={`text-[9px] px-1.5 py-0.5 rounded-full transition-colors ${
                  tierFilter === t
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600'
                }`}
              >
                {t}
              </button>
            ))}
            {tierFilter !== null && (
              <button
                onClick={() => setTierFilter(null)}
                className="text-[9px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 ml-auto"
              >
                clear
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.map((plant) => (
          <PlantCard
            key={plant.slug}
            plant={plant}
            onSelect={onSelectPlant}
            onInfoClick={onInfoClick}
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
