import { useDroppable } from '@dnd-kit/core';
import type { CompanionStatus } from '../../lib/companion-engine';
import type { Plant } from '../../types/plant';
import type { TierSuitability } from '../../lib/tier-rules';

interface PocketProps {
  id: string;
  plant: Plant | null;
  companionStatus: CompanionStatus;
  tierSuitability?: TierSuitability;
  isDragOver?: boolean;
  onRemove: () => void;
  onClick: () => void;
}

const statusColors: Record<CompanionStatus, string> = {
  clear: 'border-stone-300',
  friends: 'border-emerald-400',
  conflict: 'border-red-400',
};

const statusBg: Record<CompanionStatus, string> = {
  clear: 'bg-stone-50',
  friends: 'bg-emerald-50',
  conflict: 'bg-red-50',
};

export function Pocket({
  id,
  plant,
  companionStatus,
  tierSuitability,
  onRemove,
  onClick,
}: PocketProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const suitabilityRing =
    tierSuitability === 'ideal'
      ? 'ring-2 ring-emerald-300'
      : tierSuitability === 'poor'
        ? 'ring-2 ring-amber-300'
        : '';

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`
        relative w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center
        cursor-pointer transition-all duration-150 select-none
        ${plant ? statusColors[companionStatus] : 'border-dashed border-stone-300'}
        ${plant ? statusBg[companionStatus] : 'bg-white'}
        ${isOver ? 'scale-110 shadow-lg border-blue-400 bg-blue-50' : ''}
        ${!plant && !isOver ? 'hover:border-stone-400 hover:bg-stone-50' : ''}
        ${!plant && tierSuitability ? 'hover:scale-105' : ''}
        ${suitabilityRing}
      `}
    >
      {plant ? (
        <>
          <span className="text-xl leading-none">{plant.emoji}</span>
          <span className="text-[9px] leading-tight text-stone-600 text-center mt-0.5 px-0.5 truncate w-full">
            {plant.commonName.split(' ')[0]}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-stone-400 text-white text-[10px] leading-none flex items-center justify-center opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
            title="Remove plant"
          >
            x
          </button>
        </>
      ) : (
        <span className="text-stone-300 text-lg">+</span>
      )}
    </div>
  );
}
