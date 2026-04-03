import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { TowerView } from '../components/greenstalk/TowerView';
import { PlantPalette } from '../components/plant-palette/PlantPalette';
import { PlantDetail } from '../components/plant-palette/PlantDetail';
import { usePlannerStore } from '../state/planner-store';
import { usePlantDb } from '../data/use-plant-db';
import { useCompanionDb } from '../data/use-companion-db';
import type { Plant } from '../types/plant';

export function PlannerPage() {
  const towers = usePlannerStore((s) => s.towers);
  const assignPlant = usePlannerStore((s) => s.assignPlant);
  const removePlant = usePlannerStore((s) => s.removePlant);
  const { plants, plantMap } = usePlantDb();
  const { companionMap } = useCompanionDb();

  const [draggedPlant, setDraggedPlant] = useState<Plant | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [plantToPlace, setPlantToPlace] = useState<Plant | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const plant = (event.active.data.current as { plant: Plant })?.plant;
      if (plant) setDraggedPlant(plant);
    },
    []
  );

  const parsePocketId = (pocketId: string) => {
    const match = pocketId.match(/^(tower-\d+)-tier-(\d+)-pocket-(\d+)$/);
    if (!match) return null;
    return {
      towerId: match[1],
      tierNumber: parseInt(match[2], 10),
      pocketIndex: parseInt(match[3], 10) - 1,
    };
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggedPlant(null);
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current as Record<string, unknown> | undefined;

      // Case 1: Dragging from palette to pocket
      const plant = activeData?.plant as Plant | undefined;
      if (plant) {
        const parsed = parsePocketId(over.id as string);
        if (!parsed) return;
        assignPlant(parsed.towerId, parsed.tierNumber, parsed.pocketIndex, plant.slug);
        return;
      }

      // Case 2: Dragging from one pocket to another (rearrange)
      if (activeData?.type === 'pocket') {
        const sourcePocketId = activeData.pocketId as string;
        const sourceSlug = activeData.plantSlug as string | null;
        if (!sourceSlug) return;

        const targetParsed = parsePocketId(over.id as string);
        if (!targetParsed) return;

        const sourceParsed = parsePocketId(sourcePocketId);
        if (!sourceParsed) return;

        // Get the target pocket's current plant (for swap)
        const targetTower = towers.find((t) => t.id === targetParsed.towerId);
        const targetTier = targetTower?.tiers.find((t) => t.tierNumber === targetParsed.tierNumber);
        const targetPocket = targetTier?.pockets[targetParsed.pocketIndex];
        const targetSlug = targetPocket?.plantSlug ?? null;

        // Remove from source
        removePlant(sourceParsed.towerId, sourceParsed.tierNumber, sourceParsed.pocketIndex);

        // Place source plant in target
        assignPlant(targetParsed.towerId, targetParsed.tierNumber, targetParsed.pocketIndex, sourceSlug);

        // If target had a plant, swap it to the source
        if (targetSlug) {
          assignPlant(sourceParsed.towerId, sourceParsed.tierNumber, sourceParsed.pocketIndex, targetSlug);
        }
      }
    },
    [assignPlant, removePlant, towers]
  );

  // Click-to-place: select plant from palette, then click empty pocket
  const handlePaletteSelect = useCallback(
    (plant: Plant) => {
      if (plantToPlace?.slug === plant.slug) {
        // Toggle off if already selected
        setPlantToPlace(null);
      } else {
        setPlantToPlace(plant);
      }
    },
    [plantToPlace]
  );

  const handlePocketClick = useCallback(
    (
      plant: Plant | null,
      towerId: string,
      tierNumber: number,
      pocketIndex: number
    ) => {
      if (plant) {
        // Pocket has a plant — show detail
        setSelectedPlant(plant);
      } else if (plantToPlace) {
        // Pocket is empty and we have a plant selected for placement
        assignPlant(towerId, tierNumber, pocketIndex, plantToPlace.slug);
      }
    },
    [plantToPlace, assignPlant]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        {/* Sidebar: Plant Palette */}
        <div className="w-64 border-r border-stone-200 bg-stone-50 flex-shrink-0 overflow-hidden flex flex-col">
          <PlantPalette
            plants={plants}
            onSelectPlant={handlePaletteSelect}
            activePlantSlug={plantToPlace?.slug ?? null}
          />
        </div>

        {/* Main: Tower views */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-stone-800">
              GreenStalk Planner
            </h1>
            <p className="text-sm text-stone-400">
              {plantToPlace ? (
                <>
                  Click a pocket to place{' '}
                  <span className="font-medium text-emerald-600">
                    {plantToPlace.emoji} {plantToPlace.commonName}
                  </span>
                  {' '}
                  <button
                    onClick={() => setPlantToPlace(null)}
                    className="text-stone-400 hover:text-stone-600 underline"
                  >
                    cancel
                  </button>
                </>
              ) : (
                'Select a plant from the palette, then click a pocket to place it'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {towers.map((tower) => (
              <TowerView
                key={tower.id}
                tower={tower}
                plantMap={plantMap}
                companionMap={companionMap}
                draggedPlant={draggedPlant ?? plantToPlace}
                onPocketClick={handlePocketClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedPlant && (
          <div className="bg-white rounded-lg shadow-xl border border-stone-200 px-3 py-2 flex items-center gap-2 pointer-events-none">
            <span className="text-lg">{draggedPlant.emoji}</span>
            <span className="text-sm font-medium text-stone-700">
              {draggedPlant.commonName}
            </span>
          </div>
        )}
      </DragOverlay>

      {/* Plant detail modal */}
      {selectedPlant && (
        <PlantDetail
          plant={selectedPlant}
          companionMap={companionMap}
          onClose={() => setSelectedPlant(null)}
        />
      )}
    </DndContext>
  );
}
