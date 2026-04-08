import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { CompanionStatus } from '../../lib/companion-engine';
import type { Plant } from '../../types/plant';
import type { TierSuitability } from '../../lib/tier-rules';

interface PocketProps {
  id: string;
  plant: Plant | null;
  companionPlants: Plant[];
  companionStatus: CompanionStatus;
  tierSuitability?: TierSuitability;
  /** 5-axis overall score (0-10) from garden-rating */
  score?: number;
  /** In-ground companion slugs that are friends with this pocket's plant */
  inGroundFriends?: string[];
  onRemove: () => void;
  onClick: () => void;
}

const statusColors: Record<CompanionStatus, string> = {
  clear: 'border-stone-300 dark:border-stone-600',
  friends: 'border-emerald-400',
  conflict: 'border-red-400',
};

const statusBg: Record<CompanionStatus, string> = {
  clear: 'bg-stone-50 dark:bg-stone-700 shadow-sm',
  friends: 'bg-emerald-50 dark:bg-emerald-900/30 shadow-sm',
  conflict: 'bg-red-50 dark:bg-red-900/30 shadow-sm',
};

const statusGlow: Record<CompanionStatus, string> = {
  clear: '',
  friends: 'glow-emerald',
  conflict: 'glow-red',
};

export function Pocket({
  id,
  plant,
  companionPlants,
  companionStatus,
  tierSuitability,
  score,
  inGroundFriends,
  onRemove,
  onClick,
}: PocketProps) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id });

  // Make occupied pockets draggable so plants can be rearranged
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `pocket-drag-${id}`,
    data: {
      type: 'pocket',
      pocketId: id,
      plantSlug: plant?.slug ?? null,
    },
    disabled: !plant, // only draggable when occupied
  });

  const suitabilityRing =
    tierSuitability === 'ideal'
      ? 'ring-2 ring-emerald-300'
      : tierSuitability === 'poor'
        ? 'ring-2 ring-amber-300'
        : '';

  // Combine refs: droppable + draggable on the same element
  const setRefs = (el: HTMLElement | null) => {
    setDropRef(el);
    setDragRef(el);
  };

  // GreenStalk pockets hold ONE plant — no duo sharing (pocket too small)

  return (
    <div
      ref={setRefs}
      onClick={onClick}
      {...(plant ? { ...attributes, ...listeners } : {})}
      className={`
        group relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl border-2 flex flex-col items-center justify-center
        cursor-pointer transition-all duration-150 select-none
        ${plant ? statusColors[companionStatus] : 'border-dashed border-stone-600/50'}
        ${plant ? statusBg[companionStatus] : 'bg-white dark:bg-stone-700'}
        ${plant ? `hover:scale-105 hover:shadow-md ${statusGlow[companionStatus]}` : ''}
        ${isOver ? 'scale-110 shadow-lg border-blue-400 bg-blue-50 dark:bg-blue-900/30' : ''}
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${!plant && !isOver ? 'hover:border-emerald-500/50 hover:bg-emerald-500/5' : ''}
        ${!plant && tierSuitability ? 'hover:scale-105' : ''}
        ${suitabilityRing}
      `}
    >
      {plant ? (
        <>
          <span className="text-base sm:text-xl leading-none">{plant.emoji}</span>
          <span className="text-[7px] sm:text-[9px] leading-tight text-stone-600 dark:text-stone-300 text-center mt-0.5 px-0.5 truncate w-full">
            {plant.commonName.split(' ')[0]}
          </span>
          {/* Water need indicator */}
          <span
            className={`absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full ${
              plant.water === 'high' ? 'bg-blue-500' :
              plant.water === 'moderate' ? 'bg-blue-300' : 'bg-blue-100 dark:bg-blue-800'
            }`}
            title={`Water: ${plant.water}`}
          />
          {/* Score badge (5-axis) */}
          {score != null && (
            <span
              className={`absolute -bottom-1 -left-1 w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center shadow-sm ${
                score >= 7 ? 'bg-emerald-600' : score >= 5 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              title={`Score: ${score.toFixed(1)}/10 (Kid · Value · Companion · Resilience · Fragrance)`}
            >
              {Math.round(score)}
            </span>
          )}
          {/* In-ground companion indicator */}
          {inGroundFriends && inGroundFriends.length > 0 && (
            <span
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-violet-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm"
              title={`In-ground companions: ${inGroundFriends.join(', ')}`}
            >
              🌍
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity z-10"
            title="Remove plant"
          >
            x
          </button>
        </>
      ) : (
        <span className="text-stone-300 dark:text-stone-500 text-sm sm:text-lg">+</span>
      )}
    </div>
  );
}
