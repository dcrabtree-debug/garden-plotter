import { Pocket } from './Pocket';
import { getTierLabel, getTierAdvice } from '../../lib/tier-rules';
import { getTierSuitability } from '../../lib/tier-rules';
import { getCompanionStatus } from '../../lib/companion-engine';
import type { Tier } from '../../types/planner';
import type { Plant } from '../../types/plant';
import type { CompanionMap } from '../../types/companion';
import { usePlannerStore } from '../../state/planner-store';

interface TierRowProps {
  tier: Tier;
  towerId: string;
  plantMap: Map<string, Plant>;
  companionMap: CompanionMap;
  allNeighbourSlugs: (tierNumber: number, pocketIndex: number) => string[];
  draggedPlant: Plant | null;
  onPocketClick: (plant: Plant | null, towerId: string, tierNumber: number, pocketIndex: number) => void;
}

export function TierRow({
  tier,
  towerId,
  plantMap,
  companionMap,
  allNeighbourSlugs,
  draggedPlant,
  onPocketClick,
}: TierRowProps) {
  const removePlant = usePlannerStore((s) => s.removePlant);

  // Gradient: top tiers warmer/lighter, bottom tiers cooler
  const tierGradient = (() => {
    const total = 6;
    const warmth = 1 - (tier.tierNumber - 1) / (total - 1); // 1.0 at top, 0.0 at bottom
    if (warmth > 0.6) return 'bg-amber-500/[0.03] dark:bg-amber-400/[0.04]';
    if (warmth > 0.3) return 'bg-stone-500/[0.02] dark:bg-stone-400/[0.02]';
    return 'bg-sky-500/[0.03] dark:bg-sky-400/[0.03]';
  })();

  return (
    <div className={`flex items-center gap-1.5 sm:gap-3 rounded-lg px-1 sm:px-2 py-1 ${tierGradient}`}>
      <div className="w-10 sm:w-16 text-right shrink-0">
        <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-stone-500">
          {getTierLabel(tier.tierNumber)}
        </div>
        <div className="text-[9px] sm:text-[10px] text-stone-400 hidden sm:block" title={getTierAdvice(tier.tierNumber)}>
          Tier {tier.tierNumber}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 sm:gap-1.5">
        {tier.pockets.map((pocket, i) => {
          const plant = pocket.plantSlug
            ? plantMap.get(pocket.plantSlug) ?? null
            : null;
          const neighbours = allNeighbourSlugs(tier.tierNumber, i);
          const status = plant
            ? getCompanionStatus(plant.slug, neighbours, companionMap)
            : 'clear';
          const suitability = draggedPlant
            ? getTierSuitability(draggedPlant, tier.tierNumber)
            : undefined;

          return (
            <Pocket
              key={pocket.id}
              id={pocket.id}
              plant={plant}
              companionStatus={status}
              tierSuitability={!plant ? suitability : undefined}
              onRemove={() => removePlant(towerId, tier.tierNumber, i)}
              onClick={() => onPocketClick(plant, towerId, tier.tierNumber, i)}
            />
          );
        })}
      </div>
    </div>
  );
}
