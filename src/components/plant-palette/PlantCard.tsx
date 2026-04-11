import { useDraggable } from '@dnd-kit/core';
import type { Plant } from '../../types/plant';

interface PlantCardProps {
  plant: Plant;
  onSelect: (plant: Plant) => void;
  onInfoClick?: (plant: Plant) => void;
  isActive?: boolean;
}

const suitColors: Record<string, string> = {
  ideal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  marginal: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  unsuitable: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function PlantCard({ plant, onSelect, onInfoClick, isActive }: PlantCardProps) {
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
        flex items-center gap-2 px-3 py-2 rounded-xl border
        cursor-pointer transition-all select-none
        hover:scale-[1.02] transition-transform duration-150
        ${
          isActive
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-200 dark:ring-emerald-800 shadow-sm'
            : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 hover:border-stone-300 dark:hover:border-stone-500 hover:shadow-sm'
        }
        ${isDragging ? 'opacity-50 shadow-lg scale-95' : ''}
      `}
    >
      <span className="text-lg">{plant.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">
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
      {onInfoClick && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onInfoClick(plant);
          }}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 rounded transition-colors"
          title="View details"
        >
          i
        </button>
      )}
    </div>
  );
}
