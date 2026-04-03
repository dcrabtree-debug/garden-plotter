import { useDraggable } from '@dnd-kit/core';
import type { Plant } from '../../types/plant';

interface PlantCardProps {
  plant: Plant;
  onSelect: (plant: Plant) => void;
  isActive?: boolean;
}

const suitColors: Record<string, string> = {
  ideal: 'bg-emerald-100 text-emerald-700',
  good: 'bg-blue-100 text-blue-700',
  marginal: 'bg-amber-100 text-amber-700',
  unsuitable: 'bg-red-100 text-red-700',
};

export function PlantCard({ plant, onSelect, isActive }: PlantCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${plant.slug}`,
    data: { plant },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(plant);
      }}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border
        cursor-pointer transition-all select-none
        ${
          isActive
            ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm'
            : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
        }
        ${isDragging ? 'opacity-50 shadow-lg scale-95' : ''}
      `}
    >
      <span className="text-lg">{plant.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-700 truncate">
          {plant.commonName}
        </div>
        <div className="text-[10px] text-stone-400 truncate">
          {plant.botanicalName}
        </div>
      </div>
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${suitColors[plant.greenstalkSuitability]}`}
      >
        {plant.greenstalkSuitability}
      </span>
    </div>
  );
}
