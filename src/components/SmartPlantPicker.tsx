import { useMemo, useState } from 'react';
import type { Plant } from '../types/plant';
import type { CompanionMap } from '../types/companion';
import { getFriends, getConflicts } from '../lib/companion-engine';
import { getTierSuitability, getTierLabel } from '../lib/tier-rules';
import { isInWindow, getCurrentMonth } from '../lib/calendar-utils';
import { getShareableCompanions, type DuoPairing } from '../lib/pocket-sharing';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SmartPickerProps {
  plants: Plant[];
  plantMap: Map<string, Plant>;
  companionMap: CompanionMap;
  neighbourSlugs: string[];
  onSelect: (slug: string) => void;
  onSelectDuo?: (primarySlug: string, companionSlug: string) => void;
  onClose: () => void;
  // GreenStalk context (optional)
  tierNumber?: number;
  // In-ground context (optional)
  sunHours?: number | null;
  cellType?: string;
  // Layout mode
  inline?: boolean;
}

interface ScoredPlant {
  plant: Plant;
  score: number;
  reasons: { text: string; type: 'great' | 'good' | 'warn' | 'info' }[];
  topVarietal: string | null;
  varietalNote: string | null;
  duos: DuoPairing[];
}

// ─── Scoring Engine ──────────────────────────────────────────────────────────

function scorePlant(
  plant: Plant,
  neighbourSlugs: string[],
  companionMap: CompanionMap,
  plantMap: Map<string, Plant>,
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

  // ── Duo companions ──
  const duos = getShareableCompanions(plant.slug, companionMap, plantMap);

  return { plant, score, reasons, topVarietal, varietalNote, duos };
}

// ─── Duo Card ────────────────────────────────────────────────────────────────

function DuoCard({
  scored,
  plantMap,
  onSelectDuo,
  rank,
}: {
  scored: ScoredPlant;
  plantMap: Map<string, Plant>;
  onSelectDuo: (primary: string, companion: string) => void;
  rank: number;
}) {
  const duo = scored.duos[0];
  if (!duo) return null;
  const companion = plantMap.get(duo.companionSlug);
  if (!companion) return null;

  return (
    <button
      onClick={() => onSelectDuo(scored.plant.slug, duo.companionSlug)}
      className={`w-full text-left rounded-xl p-3 transition-all active:scale-[0.98] ${
        rank === 0
          ? 'bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-300 dark:border-violet-700'
          : 'bg-stone-50 dark:bg-stone-700/50 border border-stone-200 dark:border-stone-600'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center -space-x-1">
          <span className="text-2xl">{scored.plant.emoji}</span>
          <span className="text-lg">{companion.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-stone-800 dark:text-stone-100">
              {scored.plant.commonName} + {companion.commonName}
            </span>
            {rank === 0 && (
              <span className="text-[9px] px-1.5 py-0.5 bg-violet-600 text-white rounded-full font-bold">
                BEST DUO
              </span>
            )}
          </div>
          <div className="text-[11px] text-violet-700 dark:text-violet-400 mt-0.5">
            {duo.reason}
          </div>
          <div className="flex gap-3 mt-1.5 text-[9px] text-stone-400">
            <span>{scored.plant.daysToHarvest[0]}-{scored.plant.daysToHarvest[1]}d harvest</span>
            <span>Shares pocket</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SmartPlantPicker({
  plants,
  plantMap,
  companionMap,
  neighbourSlugs,
  onSelect,
  onSelectDuo,
  onClose,
  tierNumber,
  sunHours,
  cellType,
  inline = false,
}: SmartPickerProps) {
  const [filter, setFilter] = useState<'all' | 'vegetable' | 'herb' | 'fruit' | 'flower'>('all');
  const [tab, setTab] = useState<'single' | 'duo'>('single');
  const isGreenStalk = tierNumber !== undefined;
  const currentMonth = getCurrentMonth();

  const scored = useMemo(() => {
    const eligible = plants.filter(p => {
      if (isGreenStalk && p.greenstalkSuitability === 'unsuitable') return false;
      if (filter !== 'all' && p.category !== filter) return false;
      return true;
    });

    return eligible
      .map(p => scorePlant(p, neighbourSlugs, companionMap, plantMap, tierNumber, sunHours, currentMonth, isGreenStalk))
      .sort((a, b) => b.score - a.score);
  }, [plants, plantMap, neighbourSlugs, companionMap, tierNumber, sunHours, currentMonth, isGreenStalk, filter]);

  const duoPlants = useMemo(
    () => scored.filter((sp) => sp.duos.length > 0),
    [scored],
  );

  const topPicks = scored.slice(0, 3);
  const others = scored.slice(3);

  const contextLabel = isGreenStalk
    ? `${getTierLabel(tierNumber!)} Tier (Tier ${tierNumber})`
    : sunHours !== null && sunHours !== undefined
      ? `${sunHours}h sun · ${cellType ?? 'garden'}`
      : cellType ?? 'garden';

  const content = (
    <div className={`${inline ? 'h-full' : 'bg-white dark:bg-stone-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh]'} flex flex-col`}>
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

        {/* Single / Duo toggle */}
        {onSelectDuo && duoPlants.length > 0 && (
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setTab('single')}
              className={`text-[10px] px-3 py-1 rounded-full font-medium transition-colors ${
                tab === 'single'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-500'
              }`}
            >
              Single Plant
            </button>
            <button
              onClick={() => setTab('duo')}
              className={`text-[10px] px-3 py-1 rounded-full font-medium transition-colors ${
                tab === 'duo'
                  ? 'bg-violet-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-500'
              }`}
            >
              Duo ({duoPlants.length})
            </button>
          </div>
        )}

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
        {tab === 'duo' && onSelectDuo ? (
          /* ── Duo Tab ── */
          <div className="p-3">
            <h3 className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-2">
              Share this pocket — proven companion duos
            </h3>
            {duoPlants.length > 0 ? (
              <div className="space-y-2">
                {duoPlants.slice(0, 10).map((sp, i) => (
                  <DuoCard key={sp.plant.slug} scored={sp} plantMap={plantMap} onSelectDuo={onSelectDuo} rank={i} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-stone-400 text-sm">
                No duo pairings match this filter
              </div>
            )}
          </div>
        ) : (
          /* ── Single Tab ── */
          <>
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

                          {/* Duo hint */}
                          {sp.duos.length > 0 && onSelectDuo && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDuo(sp.plant.slug, sp.duos[0].companionSlug);
                              }}
                              className="mt-1 text-[10px] text-violet-600 dark:text-violet-400 hover:underline"
                            >
                              + Tuck {sp.duos[0].companionName} in this pocket
                            </button>
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
                        {sp.duos.length > 0 && (
                          <span className="text-violet-400 text-[9px] shrink-0">duo</span>
                        )}
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
          </>
        )}
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}
