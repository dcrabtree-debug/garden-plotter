import { useMemo, useState, useCallback } from 'react';
import { usePlannerStore } from '../../state/planner-store';
import { useGardenStore } from '../../state/garden-store';
import { usePlantDb } from '../../data/use-plant-db';
import { useCompanionDb } from '../../data/use-companion-db';
import { useRegion } from '../../data/use-region';
import {
  gradeGarden,
  setGradeWeights,
  getGradeWeights,
  DEFAULT_WEIGHTS,
  type GardenGrade,
  type GradeWeights,
} from '../../lib/garden-rating';
import { generateLayouts } from '../../lib/auto-populate';
import { createEsherGarden, generateEsherLayouts } from '../../lib/esher-garden-template';

// ─── Weight presets ────────────────────────────────────────────────────────
interface WeightPreset {
  id: string;
  label: string;
  emoji: string;
  weights: GradeWeights;
  description: string;
  /** If true, selecting this preset also auto-populates both systems */
  autoPopulate?: boolean;
}

const PRESETS: WeightPreset[] = [
  {
    id: 'rhs-expert',
    label: 'RHS Expert',
    emoji: '⭐',
    weights: { kidFriendly: 0.20, fragrance: 0.20, companion: 0.20, resilience: 0.20, value: 0.20 },
    description: 'Balanced RHS-recommended layout. Auto-populates every spot with expert-chosen varietals.',
    autoPopulate: true,
  },
  {
    id: 'kid-discovery',
    label: 'Kid Discovery',
    emoji: '🧒',
    weights: { kidFriendly: 0.50, fragrance: 0.10, companion: 0.10, resilience: 0.15, value: 0.15 },
    description: 'Maximize fast-harvest, fun-to-pick plants for Max & Noelle.',
  },
  {
    id: 'fragrance',
    label: 'Fragrance',
    emoji: '🌸',
    weights: { kidFriendly: 0.15, fragrance: 0.40, companion: 0.10, resilience: 0.15, value: 0.20 },
    description: 'Aromatic herbs and scented flowers for evening garden fragrance.',
  },
  {
    id: 'max-value',
    label: 'Max Value',
    emoji: '💰',
    weights: { kidFriendly: 0.10, fragrance: 0.10, companion: 0.15, resilience: 0.25, value: 0.40 },
    description: 'Highest £/kg crops that save the most vs supermarket.',
  },
];

const AXIS_CONFIG = [
  { key: 'kidFriendly' as const, label: '🧒 Kids', short: '🧒' },
  { key: 'fragrance' as const, label: '🌸 Scent', short: '🌸' },
  { key: 'companion' as const, label: '🤝 Companion', short: '🤝' },
  { key: 'resilience' as const, label: '💪 Hardy', short: '💪' },
  { key: 'value' as const, label: '💰 Value', short: '💰' },
];

/**
 * Real-time Garden Grade panel with weight presets and adjustable sliders.
 *
 * `swapFilter` limits which swap suggestions appear:
 *   - 'greenstalk' → only GreenStalk swaps (for PlannerPage)
 *   - 'inground'   → only in-ground swaps (for GardenPage)
 *   - 'all'        → show everything (for TodayPage)
 */
export function GardenGradePanel({
  variant = 'inline',
  swapFilter = 'all',
}: {
  variant?: 'sidebar' | 'inline';
  swapFilter?: 'greenstalk' | 'inground' | 'all';
}) {
  const towers = usePlannerStore((s) => s.towers);
  const gardenCells = useGardenStore((s) => s.garden.cells);
  const region = useRegion();
  const { plants, plantMap } = usePlantDb(region);
  const { companionMap } = useCompanionDb();

  const [weights, setWeights] = useState<GradeWeights>(getGradeWeights);
  const [showWeights, setShowWeights] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const updateWeight = useCallback((key: keyof GradeWeights, raw: number) => {
    const next = { ...weights, [key]: raw };
    setWeights(next);
    setGradeWeights(next);
    setActivePreset('custom');
  }, [weights]);

  const applyPreset = useCallback((preset: WeightPreset) => {
    setWeights({ ...preset.weights });
    setGradeWeights({ ...preset.weights });
    setActivePreset(preset.id);

    if (preset.autoPopulate) {
      // ── RHS Expert: auto-populate both GreenStalks + in-ground ──
      const store = usePlannerStore.getState();
      const gStore = useGardenStore.getState();

      // 1. GreenStalk: apply expert-choice layout
      const layouts = generateLayouts(plants, companionMap, store.towers.length);
      const expert = layouts.find((l) => l.id === 'expert-choice');
      if (expert) {
        for (let t = 0; t < store.towers.length && t < expert.towers.length; t++) {
          const tower = store.towers[t];
          // Clear tower first
          for (const tier of tower.tiers) {
            for (let p = 0; p < tier.pockets.length; p++) {
              if (tier.pockets[p].plantSlug) store.removePlant(tower.id, tier.tierNumber, p);
            }
          }
          // Apply expert layout
          const grid = expert.towers[t];
          for (let tier = 0; tier < grid.length; tier++) {
            for (let pocket = 0; pocket < grid[tier].length; pocket++) {
              const slug = grid[tier][pocket];
              if (slug) store.assignPlant(tower.id, tier + 1, pocket, slug);
            }
          }
        }
      }

      // 2. In-ground: load Esher template + apply RHS Expert placements
      const { config, cells } = createEsherGarden();
      gStore.loadTemplate(config, cells);
      const esherLayouts = generateEsherLayouts();
      const esherExpert = esherLayouts.find((l) => l.id === 'expert-choice');
      if (esherExpert) {
        for (const p of esherExpert.placements) {
          gStore.plantInCell(p.row, p.col, p.plantSlug);
        }
        // Also apply raised bed replant
        for (const p of esherExpert.raisedBedReplant.placements) {
          gStore.plantInCell(p.row, p.col, p.plantSlug);
        }
      }
    }
  }, [plants, companionMap]);

  const resetWeights = useCallback(() => {
    setWeights({ ...DEFAULT_WEIGHTS });
    setGradeWeights({ ...DEFAULT_WEIGHTS });
    setActivePreset(null);
  }, []);

  const greenstalkSlugs = useMemo(() => {
    const slugs: string[] = [];
    for (const t of towers) for (const tier of t.tiers) for (const p of tier.pockets) if (p.plantSlug) slugs.push(p.plantSlug);
    return slugs;
  }, [towers]);

  const gardenSlugs = useMemo(() => {
    const slugs: string[] = [];
    for (const row of gardenCells) for (const c of row) if (c.plantSlug) slugs.push(c.plantSlug);
    return slugs;
  }, [gardenCells]);

  const grade: GardenGrade = useMemo(() => {
    return gradeGarden(greenstalkSlugs, gardenSlugs, plants, plantMap, companionMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greenstalkSlugs, gardenSlugs, plants, plantMap, companionMap, weights]);

  if (grade.totalPlants === 0) {
    // Show presets even with no plants so RHS Expert can populate
    const isSidebar = variant === 'sidebar';
    return (
      <div className={isSidebar
        ? 'bg-white dark:bg-stone-700 rounded-lg border border-stone-200 dark:border-stone-600 overflow-hidden'
        : 'bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden'
      }>
        <div className={`px-3 py-2 border-b border-stone-100 dark:border-stone-700 ${isSidebar ? '' : 'px-4 py-3'}`}>
          <h2 className={`font-bold text-stone-800 dark:text-stone-100 ${isSidebar ? 'text-[11px]' : 'text-sm'}`}>
            📊 Garden Grade
          </h2>
        </div>
        <div className={isSidebar ? 'px-3 py-2.5' : 'px-4 py-4'}>
          <div className="text-center text-stone-400 text-xs mb-3">
            <div className="text-lg mb-1">🌱</div>
            No plants yet. Pick a preset to get started:
          </div>
          <div className={`flex flex-wrap gap-1.5 ${isSidebar ? '' : 'justify-center'}`}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`px-2 py-1 rounded-lg border text-[10px] font-semibold transition-colors ${
                  p.autoPopulate
                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                    : 'bg-stone-50 dark:bg-stone-600 border-stone-200 dark:border-stone-500 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-500'
                }`}
                title={p.description}
              >
                {p.emoji} {p.label}
                {p.autoPopulate && <span className="ml-1 opacity-75">+ Fill</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isSidebar = variant === 'sidebar';
  const gradeColor = grade.score >= 75 ? 'emerald' : grade.score >= 55 ? 'amber' : 'rose';

  const handleSwap = (currentSlug: string, suggestedSlug: string, location: 'greenstalk' | 'inground') => {
    if (location === 'greenstalk') {
      const store = usePlannerStore.getState();
      for (const tower of store.towers) {
        for (const tier of tower.tiers) {
          for (let p = 0; p < tier.pockets.length; p++) {
            if (tier.pockets[p].plantSlug === currentSlug) {
              store.assignPlant(tower.id, tier.tierNumber, p, suggestedSlug);
              return;
            }
          }
        }
      }
    } else {
      const gStore = useGardenStore.getState();
      const cells = gStore.garden.cells;
      for (let r = 0; r < cells.length; r++) {
        for (let c = 0; c < cells[r].length; c++) {
          if (cells[r][c].plantSlug === currentSlug) {
            gStore.plantInCell(r, c, suggestedSlug);
            return;
          }
        }
      }
    }
  };

  const wSum = weights.kidFriendly + weights.value + weights.companion + weights.resilience + weights.fragrance;
  const pct = (v: number) => wSum > 0 ? Math.round((v / wSum) * 100) : 0;

  return (
    <div className={isSidebar
      ? 'bg-white dark:bg-stone-700 rounded-lg border border-stone-200 dark:border-stone-600 overflow-hidden'
      : 'bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden'
    }>
      {/* Header */}
      <div className={`px-3 py-2 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between ${isSidebar ? '' : 'px-4 py-3'}`}>
        <div className="flex items-center gap-2">
          <h2 className={`font-bold text-stone-800 dark:text-stone-100 ${isSidebar ? 'text-[11px]' : 'text-sm'}`}>
            📊 Garden Grade
          </h2>
          <button
            onClick={() => setShowWeights(!showWeights)}
            className={`px-1.5 py-0.5 rounded border transition-colors ${
              showWeights
                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                : 'bg-stone-50 dark:bg-stone-600 border-stone-200 dark:border-stone-500 text-stone-400 hover:text-stone-600'
            } ${isSidebar ? 'text-[8px]' : 'text-[9px]'}`}
            title="Adjust scoring weights"
          >
            ⚖️ Weights
          </button>
        </div>
        <span className={`text-stone-400 ${isSidebar ? 'text-[9px]' : 'text-[10px]'}`}>
          {grade.uniqueSpecies} species · {grade.totalPlants} plants
        </span>
      </div>

      <div className={isSidebar ? 'px-3 py-2.5' : 'px-4 py-4'}>
        {/* Weight presets + sliders (collapsible) */}
        {showWeights && (
          <div className={`border border-indigo-200 dark:border-indigo-800 rounded-lg p-2.5 mb-3 bg-indigo-50/50 dark:bg-indigo-900/10 ${isSidebar ? 'text-[9px]' : 'text-[10px]'}`}>
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className={`px-2 py-1 rounded-lg border transition-colors font-semibold ${
                    activePreset === p.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : p.autoPopulate
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                        : 'bg-white dark:bg-stone-600 border-stone-200 dark:border-stone-500 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-500'
                  } ${isSidebar ? 'text-[8px]' : 'text-[9px]'}`}
                  title={p.description}
                >
                  {p.emoji} {p.label}
                  {p.autoPopulate && activePreset !== p.id && <span className="opacity-60 ml-0.5">+ Fill</span>}
                </button>
              ))}
              <button
                onClick={resetWeights}
                className={`px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-500 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 ${isSidebar ? 'text-[8px]' : 'text-[9px]'}`}
              >
                ↺ Reset
              </button>
            </div>

            {/* Sliders */}
            <div className="space-y-1.5">
              {AXIS_CONFIG.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`truncate text-stone-600 dark:text-stone-300 ${isSidebar ? 'w-14' : 'w-20'}`}>{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(weights[key] * 100)}
                    onChange={(e) => updateWeight(key, parseInt(e.target.value) / 100)}
                    className="flex-1 h-1.5 accent-indigo-600"
                  />
                  <span className="w-8 text-right font-mono text-stone-500 dark:text-stone-400">
                    {pct(weights[key])}%
                  </span>
                </div>
              ))}
            </div>
            <div className={`mt-1.5 text-indigo-500 dark:text-indigo-400 ${isSidebar ? 'text-[7px]' : 'text-[8px]'}`}>
              Pick a preset or drag sliders. Grade + suggestions update instantly.
            </div>
          </div>
        )}

        {/* Grade badge + score bar */}
        <div className={`flex items-center gap-3 ${isSidebar ? 'mb-2.5' : 'mb-4'}`}>
          <div className={`font-black rounded-xl flex items-center justify-center ${
            isSidebar ? 'text-2xl w-11 h-11' : 'text-4xl w-16 h-16 rounded-2xl'
          } ${
            gradeColor === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
            gradeColor === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
            'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
          }`}>
            {grade.letter}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`flex-1 bg-stone-200 dark:bg-stone-600 rounded-full overflow-hidden ${isSidebar ? 'h-1.5' : 'h-2.5'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    gradeColor === 'emerald' ? 'bg-emerald-500' : gradeColor === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${grade.score}%` }}
                />
              </div>
              <span className={`font-bold text-stone-600 dark:text-stone-300 ${isSidebar ? 'text-[10px]' : 'text-xs'}`}>
                {grade.score}/100
              </span>
            </div>
            <div className={`flex gap-2 text-stone-400 ${isSidebar ? 'text-[8px]' : 'text-[10px]'}`}>
              <span>+{grade.crossSystemBonus} synergy</span>
              <span>+{grade.diversityBonus} diversity</span>
            </div>
          </div>
        </div>

        {/* 5-axis breakdown */}
        <div className={`grid grid-cols-5 gap-1 ${isSidebar ? 'mb-2.5' : 'mb-4'}`}>
          {AXIS_CONFIG.map(({ key, short }) => {
            const value = grade.axisAverages[key];
            return (
              <div key={key} className="text-center">
                <div className={`text-stone-400 ${isSidebar ? 'text-[8px]' : 'text-[10px]'}`}>{short}</div>
                <div className={`font-bold ${
                  isSidebar ? 'text-[10px]' : 'text-sm'
                } ${
                  value >= 7 ? 'text-emerald-600 dark:text-emerald-400' :
                  value >= 4 ? 'text-amber-600 dark:text-amber-400' :
                  'text-rose-600 dark:text-rose-400'
                }`}>
                  {value.toFixed(1)}
                </div>
                <div className={`w-full bg-stone-200 dark:bg-stone-600 rounded-full ${isSidebar ? 'h-0.5 mt-0.5' : 'h-1 mt-0.5'}`}>
                  <div
                    className={`h-full rounded-full ${
                      value >= 7 ? 'bg-emerald-500' : value >= 4 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${value * 10}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Strengths/weaknesses */}
        <div className={`flex gap-1.5 flex-wrap ${isSidebar ? 'mb-2' : 'mb-3'}`}>
          <span className={`px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded ${isSidebar ? 'text-[8px]' : 'text-[10px]'}`}>
            Best: {grade.topStrength.axis} ({grade.topStrength.score.toFixed(1)})
          </span>
          <span className={`px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded ${isSidebar ? 'text-[8px]' : 'text-[10px]'}`}>
            Weak: {grade.topWeakness.axis} ({grade.topWeakness.score.toFixed(1)})
          </span>
        </div>

        {/* Top plant scores */}
        <div className={isSidebar ? 'mb-2' : 'mb-3'}>
          <div className={`font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider ${isSidebar ? 'text-[8px] mb-1' : 'text-[10px] mb-1.5'}`}>
            Top Plants
          </div>
          <div className="space-y-0.5">
            {grade.plantScores.slice(0, isSidebar ? 5 : 8).map((ps, i) => (
              <div key={ps.slug} className={`flex items-center gap-1.5 ${isSidebar ? 'text-[9px]' : 'text-[10px]'}`}>
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                  i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-stone-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-stone-100 dark:bg-stone-600 text-stone-400'
                }`}>{i + 1}</span>
                <span>{ps.emoji}</span>
                <span className="font-medium text-stone-700 dark:text-stone-300 flex-1 truncate">{ps.commonName}</span>
                <span className={`text-[8px] ${isSidebar ? 'hidden' : ''}`}>
                  {ps.location === 'both' ? '🌱+🏡' : ps.location === 'greenstalk' ? '🌱' : '🏡'}
                </span>
                <span className={`font-bold ${
                  ps.overall >= 7 ? 'text-emerald-600 dark:text-emerald-400' : ps.overall >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                }`}>{ps.overall.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade suggestions with one-click swap */}
        {(() => {
          const filteredUpgrades = swapFilter === 'all'
            ? grade.upgrades
            : grade.upgrades.filter((u) => u.location === swapFilter);
          return filteredUpgrades.length > 0 && (
          <div>
            <div className={`font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider ${isSidebar ? 'text-[8px] mb-1' : 'text-[10px] mb-1.5'}`}>
              💡 Swap to Improve
            </div>
            <div className="space-y-1">
              {filteredUpgrades.map((u) => (
                <div
                  key={`${u.currentSlug}-${u.suggestedSlug}`}
                  className={`bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-between gap-1.5 ${isSidebar ? 'px-2 py-1 text-[9px]' : 'px-2.5 py-1.5 text-[10px]'}`}
                >
                  <div className="min-w-0">
                    <div className="text-indigo-700 dark:text-indigo-300 truncate">
                      <strong>{u.currentName}</strong> → {u.suggestedEmoji} <strong>{u.suggestedName}</strong>
                    </div>
                    <div className="text-indigo-500 dark:text-indigo-400 truncate">
                      +{u.scoreDelta} ({u.reason})
                    </div>
                  </div>
                  <button
                    onClick={() => handleSwap(u.currentSlug, u.suggestedSlug, u.location)}
                    className={`shrink-0 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors ${isSidebar ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-1 text-[9px]'}`}
                  >
                    Swap ↻
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
        })()}
      </div>
    </div>
  );
}
