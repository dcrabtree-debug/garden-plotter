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
import { SmartPlantPicker } from '../components/SmartPlantPicker';
import { usePlannerStore } from '../state/planner-store';
import { usePlantDb } from '../data/use-plant-db';
import { useCompanionDb } from '../data/use-companion-db';
import { useRegion } from '../data/use-region';
import { generateLayouts, extractTowerSlugs, type LayoutOption } from '../lib/auto-populate';
import { generateEsherLayouts } from '../lib/esher-garden-template';
import { findBestPairing } from '../lib/cross-system-scoring';
import { GardenGradePanel } from '../components/common/GardenGradePanel';
import type { Plant } from '../types/plant';

export function PlannerPage() {
  const towers = usePlannerStore((s) => s.towers);
  const locked = usePlannerStore((s) => s.locked);
  const assignPlant = usePlannerStore((s) => s.assignPlant);
  const assignDuo = usePlannerStore((s) => s.assignDuo);
  const removePlant = usePlannerStore((s) => s.removePlant);
  const addTower = usePlannerStore((s) => s.addTower);
  const removeTowerAction = usePlannerStore((s) => s.removeTower);
  const region = useRegion();
  const { plants, plantMap } = usePlantDb(region);
  const { companionMap } = useCompanionDb();

  const [draggedPlant, setDraggedPlant] = useState<Plant | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [plantToPlace, setPlantToPlace] = useState<Plant | null>(null);
  const [showAutoPopulate, setShowAutoPopulate] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [layouts, setLayouts] = useState<LayoutOption[]>([]);
  const [smartPicker, setSmartPicker] = useState<{
    towerId: string; tierNumber: number; pocketIndex: number; neighbourSlugs: string[];
  } | null>(null);

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
        // Pocket is empty and we have a plant selected from palette
        assignPlant(towerId, tierNumber, pocketIndex, plantToPlace.slug);
      } else {
        // Pocket is empty — open smart plant picker
        const tower = towers.find((t) => t.id === towerId);
        const neighbourSlugs: string[] = [];
        if (tower) {
          for (const tier of tower.tiers) {
            if (Math.abs(tier.tierNumber - tierNumber) <= 1) {
              for (const pocket of tier.pockets) {
                if (pocket.plantSlug) neighbourSlugs.push(pocket.plantSlug);
              }
            }
          }
        }
        setSmartPicker({ towerId, tierNumber, pocketIndex, neighbourSlugs });
      }
    },
    [plantToPlace, assignPlant, towers]
  );

  const handleAutoPopulate = useCallback(() => {
    const generated = generateLayouts(plants, companionMap, towers.length);
    // Compute cross-system pairings with in-ground layouts
    const esherLayouts = generateEsherLayouts();
    const esherForPairing = esherLayouts.map((e) => ({
      id: e.id,
      name: e.name,
      slugs: e.placements.map((p) => p.plantSlug),
    }));
    const enriched = generated.map((layout) => ({
      ...layout,
      bestPairing: findBestPairing(
        extractTowerSlugs(layout),
        layout.id,
        esherForPairing,
        'in-ground',
        companionMap
      ),
    }));
    setLayouts(enriched);
    setShowAutoPopulate(true);
  }, [plants, companionMap, towers.length]);

  const applyLayout = useCallback(
    (layout: LayoutOption) => {
      // Clear all towers first
      for (const tower of towers) {
        for (const tier of tower.tiers) {
          for (let i = 0; i < tier.pockets.length; i++) {
            if (tier.pockets[i].plantSlug) {
              removePlant(tower.id, tier.tierNumber, i);
            }
          }
        }
      }

      // Apply layout to each tower
      for (let t = 0; t < towers.length && t < layout.towers.length; t++) {
        const tower = towers[t];
        const grid = layout.towers[t];
        for (let tier = 0; tier < grid.length; tier++) {
          for (let pocket = 0; pocket < grid[tier].length; pocket++) {
            const slug = grid[tier][pocket];
            if (slug) assignPlant(tower.id, tier + 1, pocket, slug);
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
      <div className="flex h-full relative">
        {/* Mobile palette toggle */}
        <button
          onClick={() => setShowMobilePalette(!showMobilePalette)}
          className="sm:hidden fixed bottom-4 left-4 z-40 px-3 py-2 bg-stone-800 text-white text-xs rounded-full shadow-lg flex items-center gap-1.5"
        >
          <span>🌱</span> Plants
        </button>

        {/* Mobile overlay backdrop */}
        {showMobilePalette && (
          <div className="sm:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setShowMobilePalette(false)} />
        )}

        {/* Sidebar: Plant Palette */}
        <div className={`w-64 border-r border-stone-200 dark:border-stone-700/50 bg-stone-50 dark:bg-stone-900/50 dark:backdrop-blur-sm flex-shrink-0 overflow-hidden flex flex-col ${
          showMobilePalette
            ? 'fixed inset-y-0 left-0 z-40 shadow-2xl'
            : 'hidden sm:flex'
        }`}>
          <PlantPalette
            plants={plants}
            onSelectPlant={(p) => { handlePaletteSelect(p); setShowMobilePalette(false); }}
            activePlantSlug={plantToPlace?.slug ?? null}
          />
        </div>

        {/* Main: Tower views + RHS panel */}
        <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100">
                  GreenStalk Planner
                </h1>
                <button
                  onClick={() => usePlannerStore.getState().toggleLock()}
                  className={`px-2 py-1 text-xs rounded-lg border transition-all ${
                    locked
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                      : 'bg-stone-50 dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-400 hover:text-stone-600'
                  }`}
                  title={locked ? 'Unlock to edit' : 'Lock to prevent changes'}
                >
                  {locked ? '🔒 Locked' : '🔓'}
                </button>
              </div>
              <button
                onClick={handleAutoPopulate}
                disabled={locked}
                className={`shimmer relative overflow-hidden px-4 py-2 text-xs font-semibold rounded-full shadow-lg transition-all duration-200 flex items-center gap-1.5 ${
                  locked
                    ? 'bg-stone-300 dark:bg-stone-600 text-stone-500 dark:text-stone-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-500/20'
                }`}
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
              <div key={tower.id} className="relative group">
                <TowerView
                  tower={tower}
                  plantMap={plantMap}
                  companionMap={companionMap}
                  draggedPlant={draggedPlant ?? plantToPlace}
                  onPocketClick={handlePocketClick}
                />
                {towers.length > 1 && (
                  <button
                    onClick={() => {
                      const planted = tower.tiers.some(t => t.pockets.some(p => p.plantSlug));
                      if (planted && !window.confirm(`Remove "${tower.name}"? This tower has plants.`)) return;
                      removeTowerAction(tower.id);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                    title="Remove this GreenStalk"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {/* Add tower button */}
            <button
              onClick={addTower}
              className="border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-stone-400 dark:text-stone-500 hover:border-emerald-500 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors min-h-[200px]"
            >
              <span className="text-3xl">+</span>
              <span className="text-sm font-medium">Add GreenStalk</span>
            </button>
          </div>

          {/* Real-time Garden Grade — updates as you swap plants */}
          <div className="mt-6">
            <GardenGradePanel variant="inline" swapFilter="greenstalk" />
          </div>
        </div>

        {/* RHS Smart Picker — inline panel on desktop */}
        {smartPicker && (
          <div className="hidden lg:flex w-80 border-l border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 flex-shrink-0 flex-col">
            <SmartPlantPicker
              inline
              plants={plants}
              plantMap={plantMap}
              companionMap={companionMap}
              neighbourSlugs={smartPicker.neighbourSlugs}
              tierNumber={smartPicker.tierNumber}
              onSelect={(slug) => {
                assignPlant(smartPicker.towerId, smartPicker.tierNumber, smartPicker.pocketIndex, slug);
                setSmartPicker(null);
              }}
              onSelectDuo={(primary, companion) => {
                assignDuo(smartPicker.towerId, smartPicker.tierNumber, smartPicker.pocketIndex, primary, companion);
                setSmartPicker(null);
              }}
              onClose={() => setSmartPicker(null)}
            />
          </div>
        )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedPlant && (
          <div className="bg-white dark:bg-stone-700 rounded-lg shadow-xl border border-stone-200 dark:border-stone-600 px-3 py-2 flex items-center gap-2 pointer-events-none">
            <span className="text-lg">{draggedPlant.emoji}</span>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
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

      {/* Smart plant picker — mobile modal (hidden on lg: where inline panel is used) */}
      {smartPicker && (
        <div className="lg:hidden">
          <SmartPlantPicker
            plants={plants}
            plantMap={plantMap}
            companionMap={companionMap}
            neighbourSlugs={smartPicker.neighbourSlugs}
            tierNumber={smartPicker.tierNumber}
            onSelect={(slug) => {
              assignPlant(smartPicker.towerId, smartPicker.tierNumber, smartPicker.pocketIndex, slug);
              setSmartPicker(null);
            }}
            onSelectDuo={(primary, companion) => {
              assignDuo(smartPicker.towerId, smartPicker.tierNumber, smartPicker.pocketIndex, primary, companion);
              setSmartPicker(null);
            }}
            onClose={() => setSmartPicker(null)}
          />
        </div>
      )}

      {/* Auto-populate modal */}
      {showAutoPopulate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                    Auto-Populate Towers
                  </h2>
                  <p className="text-sm text-stone-400 mt-0.5">
                    Choose a layout strategy. You can manually adjust after applying.
                  </p>
                </div>
                <button
                  onClick={() => setShowAutoPopulate(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {layouts.map((layout) => {
                // Count filled pockets
                const totalCount = layout.towers.reduce((acc, t) => acc + t.flat().filter(Boolean).length, 0);
                const totalPockets = layout.towers.length * 30;
                const uniquePlants = new Set(layout.towers.flatMap(t => t.flat().filter(Boolean)));

                return (
                  <div
                    key={layout.id}
                    className={`border rounded-xl p-4 transition-colors ${
                      layout.id === 'expert-choice'
                        ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800'
                        : 'border-stone-200 dark:border-stone-600 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {layout.id === 'expert-choice' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            ⭐ TOP PICK
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">
                          {layout.id === 'expert-choice' ? '⭐ ' : layout.name === 'Family Harvest' ? '👨‍👩‍👧‍👦 ' : layout.name === 'Companion Optimal' ? '🤝 ' : '📅 '}
                          {layout.name}
                        </h3>
                        <p className="text-xs text-stone-500 mt-1 whitespace-pre-line">
                          {layout.description}
                        </p>
                        <div className="flex gap-3 mt-2 text-[10px] text-stone-400">
                          <span>{totalCount}/{totalPockets} pockets filled</span>
                          <span>{uniquePlants.size} unique plants</span>
                        </div>

                        {/* Best in-ground pairing badge */}
                        {layout.bestPairing && (
                          <div className="mt-2 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-[10px] text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/30">
                            <span className="font-semibold">Best in-ground pairing:</span>{' '}
                            {layout.bestPairing.layoutName}
                            <span className="text-indigo-400 ml-1">({layout.bestPairing.score.total}/100)</span>
                            <span className="block mt-0.5 text-indigo-500 dark:text-indigo-400">{layout.bestPairing.score.summary}</span>
                          </div>
                        )}

                        {/* Preview: show tier contents */}
                        <div className={`mt-3 grid gap-3 ${layout.towers.length <= 2 ? 'grid-cols-2' : layout.towers.length <= 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                          {layout.towers.map((grid, idx) => ({ label: `Tower ${idx + 1}`, grid })).map(({ label, grid }) => (
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
                                          p ? 'bg-stone-100 dark:bg-stone-600' : 'bg-stone-50 dark:bg-stone-700'
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

            <div className="p-4 border-t border-stone-100 dark:border-stone-700 text-[10px] text-stone-400 text-center">
              Applying a layout will clear existing plants. You can manually adjust afterwards.
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
