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
  // Swap mode — when set, shows current plant info + swap suggestions
  currentPlantSlug?: string | null;
  // Called when user removes the current plant (clear pocket/cell)
  onRemove?: () => void;
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
  currentPlantSlug,
  onRemove,
}: SmartPickerProps) {
  const [filter, setFilter] = useState<'all' | 'vegetable' | 'herb' | 'fruit' | 'flower'>('all');
  const [tab, setTab] = useState<'single' | 'duo'>('single');
  const [showFullDetail, setShowFullDetail] = useState(false);
  const isGreenStalk = tierNumber !== undefined;
  const currentMonth = getCurrentMonth();
  const currentPlant = currentPlantSlug ? plantMap.get(currentPlantSlug) ?? null : null;

  // Companion data for current plant (swap mode)
  const currentPlantCompanions = useMemo(() => {
    if (!currentPlant) return { friends: [] as { slug: string; reason: string }[], foes: [] as { slug: string; reason: string }[] };
    const edges = companionMap.get(currentPlant.slug);
    const friends: { slug: string; reason: string }[] = [];
    const foes: { slug: string; reason: string }[] = [];
    if (edges) {
      for (const edge of edges.values()) {
        const other = edge.plantA === currentPlant.slug ? edge.plantB : edge.plantA;
        if (edge.relationship === 'friend') friends.push({ slug: other, reason: edge.reason });
        else if (edge.relationship === 'foe') foes.push({ slug: other, reason: edge.reason });
      }
    }
    return { friends, foes };
  }, [currentPlant, companionMap]);

  const scored = useMemo(() => {
    const eligible = plants.filter(p => {
      if (isGreenStalk && p.greenstalkSuitability === 'unsuitable') return false;
      if (filter !== 'all' && p.category !== filter) return false;
      // In swap mode, exclude the current plant from suggestions
      if (currentPlantSlug && p.slug === currentPlantSlug) return false;
      return true;
    });

    return eligible
      .map(p => scorePlant(p, neighbourSlugs, companionMap, plantMap, tierNumber, sunHours, currentMonth, isGreenStalk))
      .sort((a, b) => b.score - a.score);
  }, [plants, plantMap, neighbourSlugs, companionMap, tierNumber, sunHours, currentMonth, isGreenStalk, filter, currentPlantSlug]);

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
              {currentPlant ? currentPlant.commonName : 'What should I plant here?'}
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">{contextLabel}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl p-1">x</button>
        </div>

        {/* ── Current plant info (swap mode) ── */}
        {currentPlant && (
          <div className="mb-3">
            {/* Plant identity + quick stats */}
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl">{currentPlant.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-stone-400 italic">{currentPlant.botanicalName}</p>
                <div className="flex gap-2 mt-1 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">{currentPlant.sun.replace('-', ' ')}</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300">{currentPlant.water} water</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300">{currentPlant.daysToHarvest[0]}-{currentPlant.daysToHarvest[1]}d</span>
                </div>
              </div>
            </div>

            {/* Expandable detail */}
            <button
              onClick={() => setShowFullDetail(!showFullDetail)}
              className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline mb-1"
            >
              {showFullDetail ? 'Hide details ▴' : 'Show planting calendar, companions, growing info ▾'}
            </button>

            {showFullDetail && (
              <div className="mt-2 space-y-2.5 text-xs border-t border-stone-100 dark:border-stone-700 pt-2.5">
                {/* Planting calendar */}
                <div>
                  <span className="text-[10px] font-semibold text-stone-500">Planting Calendar</span>
                  <div className="mt-1 space-y-0.5">
                    {(['sowIndoors', 'sowOutdoors', 'transplant', 'harvest'] as const).map(key => {
                      const w = currentPlant.plantingWindow[key];
                      if (!w) return null;
                      const labels: Record<string, { label: string; color: string }> = {
                        sowIndoors: { label: 'Sow indoors', color: 'bg-sky-200 text-sky-800' },
                        sowOutdoors: { label: 'Sow outdoors', color: 'bg-emerald-200 text-emerald-800' },
                        transplant: { label: 'Transplant', color: 'bg-amber-200 text-amber-800' },
                        harvest: { label: 'Harvest', color: 'bg-rose-200 text-rose-800' },
                      };
                      const cfg = labels[key];
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-[4.5rem] text-[9px] text-stone-400 shrink-0">{cfg.label}</span>
                          <div className="flex gap-px flex-1">
                            {Array.from({ length: 12 }, (_, i) => {
                              const m = i + 1;
                              const active = isInWindow(m, w);
                              return (
                                <div key={m} className={`flex-1 h-3 rounded-sm text-[7px] flex items-center justify-center ${active ? cfg.color : 'bg-stone-100 dark:bg-stone-700'}`}>
                                  {['J','F','M','A','M','J','J','A','S','O','N','D'][i]}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* GreenStalk info */}
                {isGreenStalk && (
                  <div>
                    <span className="text-[10px] font-semibold text-stone-500">GreenStalk</span>
                    <p className="text-[10px] text-stone-500 mt-0.5">{currentPlant.greenstalkNotes}</p>
                    <div className="flex gap-1 mt-1">
                      {currentPlant.idealTiers.map(t => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full">Tier {t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* In-ground data */}
                {!isGreenStalk && currentPlant.inGround && (
                  <div>
                    <span className="text-[10px] font-semibold text-stone-500">In-Ground</span>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-[10px] text-stone-500">
                      <div>Spacing: {currentPlant.inGround.plantSpacingCm}cm</div>
                      <div>Depth: {currentPlant.inGround.sowDepthCm}cm</div>
                      <div>Yield: {currentPlant.inGround.expectedYieldPerM2}</div>
                      <div>Rotation: {currentPlant.inGround.rotation}</div>
                    </div>
                    {currentPlant.inGround.feeding && (
                      <p className="text-[10px] text-stone-400 mt-0.5">Feeding: {currentPlant.inGround.feeding}</p>
                    )}
                  </div>
                )}

                {/* Companions */}
                {(currentPlantCompanions.friends.length > 0 || currentPlantCompanions.foes.length > 0) && (
                  <div>
                    <span className="text-[10px] font-semibold text-stone-500">Companions</span>
                    {currentPlantCompanions.friends.length > 0 && (
                      <div className="mt-0.5">
                        {currentPlantCompanions.friends.slice(0, 5).map(f => (
                          <div key={f.slug} className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            ✓ {f.slug.replace(/-/g, ' ')} — {f.reason}
                          </div>
                        ))}
                      </div>
                    )}
                    {currentPlantCompanions.foes.length > 0 && (
                      <div className="mt-0.5">
                        {currentPlantCompanions.foes.slice(0, 3).map(f => (
                          <div key={f.slug} className="text-[10px] text-red-500 dark:text-red-400">
                            ⚠ {f.slug.replace(/-/g, ' ')} — {f.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Varieties */}
                {currentPlant.varieties.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold text-stone-500">Varieties</span>
                    {currentPlant.varieties.slice(0, 3).map(v => (
                      <div key={v.name} className="text-[10px] text-stone-500 mt-0.5">
                        <span className="font-medium">{v.name}</span> — {v.notes}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setShowFullDetail(false)}
                  className="w-full text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline pt-1 border-t border-stone-100 dark:border-stone-700"
                >
                  Hide details ▴
                </button>
              </div>
            )}

            {/* Remove plant button */}
            {onRemove && (
              <button
                onClick={onRemove}
                className="mt-2 w-full text-[10px] py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Remove {currentPlant.commonName} from this spot
              </button>
            )}

            {/* Swap suggestions divider */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-px bg-stone-200 dark:bg-stone-600" />
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Swap suggestions</span>
              <div className="flex-1 h-px bg-stone-200 dark:bg-stone-600" />
            </div>
          </div>
        )}

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
                  {currentPlant ? 'Best swaps for this spot' : 'Top picks for this spot'}
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
                        {sp.duos.length > 0 && onSelectDuo && (
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
