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
import { generateLayouts, type LayoutOption } from '../lib/auto-populate';
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
  const [showAutoPopulate, setShowAutoPopulate] = useState(false);
  const [layouts, setLayouts] = useState<LayoutOption[]>([]);

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

  const handleAutoPopulate = useCallback(() => {
    const generated = generateLayouts(plants, companionMap);
    setLayouts(generated);
    setShowAutoPopulate(true);
  }, [plants, companionMap]);

  const applyLayout = useCallback(
    (layout: LayoutOption) => {
      // Clear both towers first
      for (const tower of towers) {
        for (const tier of tower.tiers) {
          for (let i = 0; i < tier.pockets.length; i++) {
            if (tier.pockets[i].plantSlug) {
              removePlant(tower.id, tier.tierNumber, i);
            }
          }
        }
      }

      // Apply tower 1
      const t1 = towers[0];
      if (t1) {
        for (let tier = 0; tier < layout.tower1.length; tier++) {
          for (let pocket = 0; pocket < layout.tower1[tier].length; pocket++) {
            const slug = layout.tower1[tier][pocket];
            if (slug) assignPlant(t1.id, tier + 1, pocket, slug);
          }
        }
      }

      // Apply tower 2
      const t2 = towers[1];
      if (t2) {
        for (let tier = 0; tier < layout.tower2.length; tier++) {
          for (let pocket = 0; pocket < layout.tower2[tier].length; pocket++) {
            const slug = layout.tower2[tier][pocket];
            if (slug) assignPlant(t2.id, tier + 1, pocket, slug);
          }
        }
      }

      setShowAutoPopulate(false);
    },
    [towers, assignPlant, removePlant]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        {/* Sidebar: Plant Palette */}
        <div className="w-64 border-r border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 flex-shrink-0 overflow-hidden flex flex-col">
          <PlantPalette
            plants={plants}
            onSelectPlant={handlePaletteSelect}
            activePlantSlug={plantToPlace?.slug ?? null}
          />
        </div>

        {/* Main: Tower views */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100">
                GreenStalk Planner
              </h1>
              <button
                onClick={handleAutoPopulate}
                className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
              >
                <span>✨</span> Auto-Populate
              </button>
            </div>
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

      {/* Auto-populate modal */}
      {showAutoPopulate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-stone-800">
                    Auto-Populate Towers
                  </h2>
                  <p className="text-sm text-stone-400 mt-0.5">
                    Choose a layout strategy. You can manually adjust after applying.
                  </p>
                </div>
                <button
                  onClick={() => setShowAutoPopulate(false)}
                  className="text-stone-400 hover:text-stone-600 text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {layouts.map((layout) => {
                // Count filled pockets
                const t1Count = layout.tower1.flat().filter(Boolean).length;
                const t2Count = layout.tower2.flat().filter(Boolean).length;
                const uniquePlants = new Set([
                  ...layout.tower1.flat().filter(Boolean),
                  ...layout.tower2.flat().filter(Boolean),
                ]);

                return (
                  <div
                    key={layout.id}
                    className="border border-stone-200 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-stone-800">
                          {layout.name === 'Family Harvest' ? '👨‍👩‍👧‍👦 ' : layout.name === 'Companion Optimal' ? '🤝 ' : '📅 '}
                          {layout.name}
                        </h3>
                        <p className="text-xs text-stone-500 mt-1">
                          {layout.description}
                        </p>
                        <div className="flex gap-3 mt-2 text-[10px] text-stone-400">
                          <span>{t1Count + t2Count}/60 pockets filled</span>
                          <span>{uniquePlants.size} unique plants</span>
                        </div>

                        {/* Preview: show tier contents */}
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {[
                            { label: 'Tower 1', grid: layout.tower1 },
                            { label: 'Tower 2', grid: layout.tower2 },
                          ].map(({ label, grid }) => (
                            <div key={label}>
                              <div className="text-[9px] font-semibold text-stone-400 mb-1">{label}</div>
                              {grid.map((tier, ti) => (
                                <div key={ti} className="flex gap-0.5 mb-0.5">
                                  {tier.map((slug, pi) => {
                                    const p = slug ? plantMap.get(slug) : null;
                                    return (
                                      <div
                                        key={pi}
                                        className={`w-5 h-5 rounded text-[10px] flex items-center justify-center ${
                                          p ? 'bg-stone-100' : 'bg-stone-50'
                                        }`}
                                        title={p?.commonName ?? 'empty'}
                                      >
                                        {p ? p.emoji : ''}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => applyLayout(layout)}
                        className="ml-4 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-stone-100 text-[10px] text-stone-400 text-center">
              Applying a layout will clear existing plants. You can manually adjust afterwards.
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
