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

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-right">
        <div className="text-xs font-medium text-stone-600">
          {getTierLabel(tier.tierNumber)}
        </div>
        <div className="text-[10px] text-stone-400" title={getTierAdvice(tier.tierNumber)}>
          Tier {tier.tierNumber}
        </div>
      </div>
      <div className="flex gap-1.5">
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
