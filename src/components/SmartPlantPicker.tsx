import { useMemo, useState } from 'react';
import type { Plant } from '../types/plant';
import type { CompanionMap } from '../types/companion';
import { getFriends, getConflicts } from '../lib/companion-engine';
import { getTierSuitability, getTierLabel } from '../lib/tier-rules';
import { isInWindow, getCurrentMonth } from '../lib/calendar-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SmartPickerProps {
  plants: Plant[];
  companionMap: CompanionMap;
  neighbourSlugs: string[];      // slugs of plants in adjacent pockets/cells
  onSelect: (slug: string) => void;
  onClose: () => void;
  // GreenStalk context (optional)
  tierNumber?: number;
  // In-ground context (optional)
  sunHours?: number | null;
  cellType?: string;
}

interface ScoredPlant {
  plant: Plant;
  score: number;
  reasons: { text: string; type: 'great' | 'good' | 'warn' | 'info' }[];
  topVarietal: string | null;
  varietalNote: string | null;
}

// ─── Scoring Engine ──────────────────────────────────────────────────────────

function scorePlant(
  plant: Plant,
  neighbourSlugs: string[],
  companionMap: CompanionMap,
  tierNumber: number | undefined,
  sunHours: number | null | undefined,
  currentMonth: number,
  isGreenStalk: boolean,
): ScoredPlant {
  let score = 0;
  const reasons: ScoredPlant['reasons'] = [];

  // ── GreenStalk suitability ──
  if (isGreenStalk) {
    if (plant.greenstalkSuitability === 'ideal') {
      score += 20;
      reasons.push({ text: 'Ideal for GreenStalk', type: 'great' });
    } else if (plant.greenstalkSuitability === 'good') {
      score += 10;
      reasons.push({ text: 'Good for GreenStalk', type: 'good' });
    } else if (plant.greenstalkSuitability === 'marginal') {
      score -= 5;
      reasons.push({ text: 'Marginal in GreenStalk — may struggle', type: 'warn' });
    } else {
      score -= 30;
      reasons.push({ text: 'Not suited for GreenStalk — too large', type: 'warn' });
    }

    // Tier suitability
    if (tierNumber) {
      const tierFit = getTierSuitability(plant, tierNumber);
      if (tierFit === 'ideal') {
        score += 15;
        reasons.push({ text: `Ideal for ${getTierLabel(tierNumber)} tier`, type: 'great' });
      } else if (tierFit === 'ok') {
        score += 5;
        reasons.push({ text: `OK for ${getTierLabel(tierNumber)} tier`, type: 'good' });
      } else {
        score -= 10;
        reasons.push({ text: `Better on a different tier`, type: 'warn' });
      }
    }
  }

  // ── Sun match (in-ground) ──
  if (sunHours !== null && sunHours !== undefined) {
    const needsSun = plant.sun === 'full-sun' ? 6 : plant.sun === 'partial-shade' ? 3 : 1;
    if (sunHours >= needsSun) {
      score += 10;
      if (sunHours >= needsSun + 2) {
        reasons.push({ text: `${sunHours}h sun — excellent for this plant`, type: 'great' });
      } else {
        reasons.push({ text: `${sunHours}h sun — meets requirements`, type: 'good' });
      }
    } else {
      score -= 15;
      reasons.push({ text: `Needs ${needsSun}h+ sun but spot gets ${sunHours}h`, type: 'warn' });
    }
  }

  // ── Companion scoring ──
  if (neighbourSlugs.length > 0) {
    const friends = getFriends(plant.slug, neighbourSlugs, companionMap);
    const foes = getConflicts(plant.slug, neighbourSlugs, companionMap);

    for (const f of friends) {
      score += 8;
      reasons.push({ text: `Companion: ${f.reason}`, type: 'great' });
    }
    for (const f of foes) {
      score -= 15;
      reasons.push({ text: `Conflict: ${f.reason}`, type: 'warn' });
    }
  }

  // ── Season timing ──
  const canSowNow = isInWindow(currentMonth, plant.plantingWindow.sowIndoors) ||
    isInWindow(currentMonth, plant.plantingWindow.sowOutdoors);
  const canTransplant = isInWindow(currentMonth, plant.plantingWindow.transplant);

  if (canSowNow || canTransplant) {
    score += 5;
    reasons.push({ text: canSowNow ? 'Can sow now' : 'Ready to transplant now', type: 'good' });
  } else {
    score -= 3;
    reasons.push({ text: 'Not in sowing window this month', type: 'info' });
  }

  // ── Fast harvest bonus for compressed season ──
  if (plant.daysToHarvest[0] <= 45) {
    score += 5;
    reasons.push({ text: `Quick harvest: ${plant.daysToHarvest[0]} days`, type: 'good' });
  }

  // ── Kid-friendly bonus ──
  if (['strawberry-everbearing', 'radish', 'lettuce', 'tomato-tumbling', 'pea'].includes(plant.slug)) {
    score += 3;
    reasons.push({ text: 'Kid-friendly picking', type: 'info' });
  }

  // ── Best varietal ──
  const containerVarieties = plant.varieties.filter(v => v.containerFriendly || !isGreenStalk);
  const topVarietal = containerVarieties[0]?.name ?? null;
  const varietalNote = containerVarieties[0]?.notes ?? null;

  return { plant, score, reasons, topVarietal, varietalNote };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SmartPlantPicker({
  plants,
  companionMap,
  neighbourSlugs,
  onSelect,
  onClose,
  tierNumber,
  sunHours,
  cellType,
}: SmartPickerProps) {
  const [filter, setFilter] = useState<'all' | 'vegetable' | 'herb' | 'fruit' | 'flower'>('all');
  const isGreenStalk = tierNumber !== undefined;
  const currentMonth = getCurrentMonth();

  const scored = useMemo(() => {
    const eligible = plants.filter(p => {
      if (isGreenStalk && p.greenstalkSuitability === 'unsuitable') return false;
      if (filter !== 'all' && p.category !== filter) return false;
      return true;
    });

    return eligible
      .map(p => scorePlant(p, neighbourSlugs, companionMap, tierNumber, sunHours, currentMonth, isGreenStalk))
      .sort((a, b) => b.score - a.score);
  }, [plants, neighbourSlugs, companionMap, tierNumber, sunHours, currentMonth, isGreenStalk, filter]);

  const topPicks = scored.slice(0, 3);
  const others = scored.slice(3);

  const contextLabel = isGreenStalk
    ? `${getTierLabel(tierNumber!)} Tier (Tier ${tierNumber})`
    : sunHours !== null && sunHours !== undefined
      ? `${sunHours}h sun · ${cellType ?? 'garden'}`
      : cellType ?? 'garden';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-stone-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                What should I plant here?
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">{contextLabel}</p>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl p-1">x</button>
          </div>

          {/* Category filter */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {(['all', 'vegetable', 'herb', 'fruit', 'flower'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  filter === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                }`}
              >
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable results */}
        <div className="flex-1 overflow-y-auto">
          {/* Top Picks */}
          {topPicks.length > 0 && (
            <div className="p-3">
              <h3 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">
                Top picks for this spot
              </h3>
              <div className="space-y-2">
                {topPicks.map((sp, i) => (
                  <button
                    key={sp.plant.slug}
                    onClick={() => onSelect(sp.plant.slug)}
                    className={`w-full text-left rounded-xl p-3 transition-all active:scale-[0.98] ${
                      i === 0
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700'
                        : 'bg-stone-50 dark:bg-stone-700/50 border border-stone-200 dark:border-stone-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{sp.plant.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-stone-800 dark:text-stone-100">
                            {sp.plant.commonName}
                          </span>
                          {i === 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-600 text-white rounded-full font-bold">
                              BEST FIT
                            </span>
                          )}
                        </div>

                        {/* Recommended varietal */}
                        {sp.topVarietal && (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                            Varietal: {sp.topVarietal}
                            {sp.varietalNote && (
                              <span className="text-stone-400 font-normal"> — {sp.varietalNote}</span>
                            )}
                          </div>
                        )}

                        {/* Reasons */}
                        <div className="mt-1.5 space-y-0.5">
                          {sp.reasons.slice(0, 4).map((r, ri) => (
                            <div key={ri} className={`text-[10px] flex items-start gap-1 ${
                              r.type === 'great' ? 'text-emerald-600 dark:text-emerald-400' :
                              r.type === 'good' ? 'text-stone-600 dark:text-stone-400' :
                              r.type === 'warn' ? 'text-amber-600 dark:text-amber-400' :
                              'text-stone-400'
                            }`}>
                              <span className="shrink-0 mt-px">
                                {r.type === 'great' ? '✓' : r.type === 'good' ? '•' : r.type === 'warn' ? '⚠' : '·'}
                              </span>
                              {r.text}
                            </div>
                          ))}
                        </div>

                        {/* Quick stats */}
                        <div className="flex gap-3 mt-1.5 text-[9px] text-stone-400">
                          <span>{sp.plant.daysToHarvest[0]}-{sp.plant.daysToHarvest[1]}d harvest</span>
                          <span>{sp.plant.sun.replace('-', ' ')}</span>
                          <span>{sp.plant.water} water</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Other options */}
          {others.length > 0 && (
            <div className="px-3 pb-3">
              <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-2">
                Other options ({others.length})
              </h3>
              <div className="space-y-1">
                {others.map((sp) => {
                  const hasWarn = sp.reasons.some(r => r.type === 'warn');
                  return (
                    <button
                      key={sp.plant.slug}
                      onClick={() => onSelect(sp.plant.slug)}
                      className={`w-full text-left rounded-lg p-2 flex items-center gap-2.5 transition-colors active:scale-[0.99] ${
                        hasWarn
                          ? 'bg-stone-50/50 dark:bg-stone-800 opacity-60 hover:opacity-80'
                          : 'bg-stone-50 dark:bg-stone-700/30 hover:bg-stone-100 dark:hover:bg-stone-700/50'
                      }`}
                    >
                      <span className="text-lg">{sp.plant.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-stone-700 dark:text-stone-200 truncate">
                          {sp.plant.commonName}
                          {sp.topVarietal && (
                            <span className="text-stone-400 font-normal ml-1">({sp.topVarietal})</span>
                          )}
                        </div>
                        <div className="text-[9px] text-stone-400 truncate">
                          {sp.reasons.slice(0, 2).map(r => r.text).join(' · ')}
                        </div>
                      </div>
                      {hasWarn && <span className="text-amber-400 text-xs shrink-0">⚠</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {scored.length === 0 && (
            <div className="p-8 text-center text-stone-400 text-sm">
              No plants match this filter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
