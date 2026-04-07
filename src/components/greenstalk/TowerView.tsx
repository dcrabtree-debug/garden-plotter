import { useCallback } from 'react';
import { TierRow } from './TierRow';
import type { Tower } from '../../types/planner';
import type { Plant } from '../../types/plant';
import type { CompanionMap } from '../../types/companion';
import { usePlannerStore } from '../../state/planner-store';

interface TowerViewProps {
  tower: Tower;
  plantMap: Map<string, Plant>;
  companionMap: CompanionMap;
  draggedPlant: Plant | null;
  onPocketClick: (plant: Plant | null, towerId: string, tierNumber: number, pocketIndex: number) => void;
}

export function TowerView({
  tower,
  plantMap,
  companionMap,
  draggedPlant,
  onPocketClick,
}: TowerViewProps) {
  const clearTower = usePlannerStore((s) => s.clearTower);
  const renameTower = usePlannerStore((s) => s.renameTower);

  const allNeighbourSlugs = useCallback(
    (tierNumber: number, _pocketIndex: number): string[] => {
      const slugs: string[] = [];
      for (const tier of tower.tiers) {
        if (Math.abs(tier.tierNumber - tierNumber) <= 1) {
          for (const pocket of tier.pockets) {
            if (pocket.plantSlug) {
              slugs.push(pocket.plantSlug);
            }
          }
        }
      }
      return slugs;
    },
    [tower.tiers]
  );

  const plantedCount = tower.tiers.reduce(
    (acc, tier) =>
      acc + tier.pockets.filter((p) => p.plantSlug !== null).length,
    0
  );

  return (
    <div className="bg-white dark:bg-stone-800/80 rounded-2xl shadow-lg border border-stone-200 dark:border-stone-700/50 p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <input
            className="text-sm sm:text-lg font-semibold text-stone-800 dark:text-stone-100 bg-transparent border-none outline-none focus:underline decoration-stone-300 underline-offset-4 w-full"
            value={tower.name}
            onChange={(e) => renameTower(tower.id, e.target.value)}
          />
          <div className="text-xs text-stone-400 mt-0.5">
            {plantedCount}/30 pockets planted
          </div>
        </div>
        <button
          onClick={() => clearTower(tower.id)}
          className="text-xs text-stone-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {tower.tiers.map((tier) => (
          <TierRow
            key={tier.tierNumber}
            tier={tier}
            towerId={tower.id}
            plantMap={plantMap}
            companionMap={companionMap}
            allNeighbourSlugs={allNeighbourSlugs}
            draggedPlant={draggedPlant}
            onPocketClick={onPocketClick}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-stone-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 glow-emerald" /> Friends nearby
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 glow-red" /> Conflict
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full border border-stone-300" /> Neutral
        </span>
      </div>
    </div>
  );
}
