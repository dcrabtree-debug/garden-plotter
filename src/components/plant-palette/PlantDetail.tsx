import { useState, useEffect } from 'react';
import type { Plant } from '../../types/plant';
import type { CompanionEdge, CompanionMap } from '../../types/companion';
import { getMonthName, isInWindow } from '../../lib/calendar-utils';
import { getExpertAdviceForCrop, EXPERTS } from '../../data/expert-knowledge';
import {
  getUKExpertKnowledge,
  getExpertProfile,
  EXPERT_COLORS,
  CLAY_PERFORMANCE_LABEL,
  POLLINATOR_LABEL,
  UK_EXPERTS,
  type UKExpertId,
} from '../../data/expert-uk-knowledge';
import { lookupVarietyBuyUrl } from '../../data/variety-buy-urls';

// ── Expert filter persistence ──────────────────────────────────────────────
const EXPERT_FILTER_KEY = 'garden-plotter-expert-filter';
const ALL_EXPERTS: UKExpertId[] = ['monty', 'rhs', 'larkcom', 'wong', 'fowler', 'flowerdew', 'richards', 'hafferty'];

function loadExpertFilter(): Set<UKExpertId> {
  try {
    const raw = localStorage.getItem(EXPERT_FILTER_KEY);
    if (!raw) return new Set(ALL_EXPERTS);
    const arr = JSON.parse(raw) as UKExpertId[];
    return new Set(arr);
  } catch {
    return new Set(ALL_EXPERTS);
  }
}

function saveExpertFilter(enabled: Set<UKExpertId>) {
  try {
    localStorage.setItem(EXPERT_FILTER_KEY, JSON.stringify(Array.from(enabled)));
  } catch {
    // localStorage full
  }
}

interface PlantDetailProps {
  plant: Plant;
  companionMap: CompanionMap;
  onClose: () => void;
}

function WindowBar({
  label,
  color,
  window,
}: {
  label: string;
  color: string;
  window: [number, number] | null;
}) {
  if (!window) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-stone-500">{label}</span>
      <div className="flex gap-px flex-1">
        {Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const active = isInWindow(month, window);
          return (
            <div
              key={month}
              className={`flex-1 h-4 rounded-sm text-[8px] flex items-center justify-center ${
                active ? color : 'bg-stone-100 dark:bg-stone-700'
              }`}
              title={getMonthName(month)}
            >
              {getMonthName(month)[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlantDetail({ plant, companionMap, onClose }: PlantDetailProps) {
  const [enabledExperts, setEnabledExperts] = useState<Set<UKExpertId>>(loadExpertFilter);

  useEffect(() => {
    saveExpertFilter(enabledExperts);
  }, [enabledExperts]);

  const toggleExpert = (id: UKExpertId) => {
    setEnabledExperts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setEnabledExperts((prev) =>
      prev.size === ALL_EXPERTS.length ? new Set<UKExpertId>() : new Set(ALL_EXPERTS)
    );
  };

  const edges = companionMap.get(plant.slug);
  const friends: CompanionEdge[] = [];
  const foes: CompanionEdge[] = [];
  if (edges) {
    for (const edge of edges.values()) {
      if (edge.relationship === 'friend') friends.push(edge);
      else if (edge.relationship === 'foe') foes.push(edge);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl w-full max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{plant.emoji}</span>
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
                  {plant.commonName}
                </h2>
              </div>
              <p className="text-xs text-stone-400 italic mt-0.5">
                {plant.botanicalName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 text-lg"
            >
              x
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-stone-50 dark:bg-stone-700 rounded-lg p-2 text-center">
              <div className="text-[10px] text-stone-400">Sun</div>
              <div className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {plant.sun.replace('-', ' ')}
              </div>
            </div>
            <div className="bg-stone-50 dark:bg-stone-700 rounded-lg p-2 text-center">
              <div className="text-[10px] text-stone-400">Water</div>
              <div className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {plant.water}
              </div>
            </div>
            <div className="bg-stone-50 dark:bg-stone-700 rounded-lg p-2 text-center">
              <div className="text-[10px] text-stone-400">Harvest</div>
              <div className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {plant.daysToHarvest[0]}-{plant.daysToHarvest[1]}d
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2">
              Planting Calendar (Surrey)
            </h3>
            <div className="space-y-1">
              <WindowBar
                label="Sow indoors"
                color="bg-sky-200 text-sky-800"
                window={plant.plantingWindow.sowIndoors}
              />
              <WindowBar
                label="Sow outdoors"
                color="bg-emerald-200 text-emerald-800"
                window={plant.plantingWindow.sowOutdoors}
              />
              <WindowBar
                label="Transplant"
                color="bg-amber-200 text-amber-800"
                window={plant.plantingWindow.transplant}
              />
              <WindowBar
                label="Harvest"
                color="bg-rose-200 text-rose-800"
                window={plant.plantingWindow.harvest}
              />
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
              GreenStalk Notes
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400">{plant.greenstalkNotes}</p>
            <div className="flex gap-1 mt-1.5">
              {plant.idealTiers.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full"
                >
                  Tier {t}
                </span>
              ))}
            </div>
          </div>

          {/* Soil & In-Ground Data (Hessayon) */}
          {(plant as any).soil && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                Soil Requirements
              </h3>
              <div className="text-sm text-stone-600 dark:text-stone-400 space-y-0.5">
                <div><span className="text-xs text-stone-400">pH:</span> {(plant as any).soil.phRange[0]} - {(plant as any).soil.phRange[1]}</div>
                <div><span className="text-xs text-stone-400">Type:</span> {(plant as any).soil.type}</div>
                {plant.soilTemp && (
                  <div><span className="text-xs text-stone-400">Soil temp:</span> {plant.soilTemp.min}–{plant.soilTemp.max}°C</div>
                )}
                {(plant as any).soil.notes && <div className="text-xs text-stone-500">{(plant as any).soil.notes}</div>}
              </div>
            </div>
          )}

          {(plant as any).inGround && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                In-Ground Growing
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
                <div><span className="text-stone-400">Row spacing:</span> {(plant as any).inGround.rowSpacingCm}cm</div>
                <div><span className="text-stone-400">Plant spacing:</span> {(plant as any).inGround.plantSpacingCm}cm</div>
                <div><span className="text-stone-400">Sow depth:</span> {(plant as any).inGround.sowDepthCm}cm</div>
                <div><span className="text-stone-400">Yield:</span> {(plant as any).inGround.expectedYieldPerM2}</div>
                <div><span className="text-stone-400">Rotation:</span> {(plant as any).inGround.rotation}</div>
                <div><span className="text-stone-400">Bed type:</span> {(plant as any).inGround.bedType}</div>
              </div>
              {(plant as any).inGround.feeding && (
                <div className="mt-1.5 text-xs text-stone-500">
                  <span className="font-medium">Feeding:</span> {(plant as any).inGround.feeding}
                </div>
              )}
              {(plant as any).inGround.pests?.length > 0 && (
                <div className="mt-1 text-xs text-stone-500">
                  <span className="font-medium text-amber-600">Pests:</span> {(plant as any).inGround.pests.join(', ')}
                </div>
              )}
              {(plant as any).inGround.diseases?.length > 0 && (
                <div className="mt-0.5 text-xs text-stone-500">
                  <span className="font-medium text-red-600">Diseases:</span> {(plant as any).inGround.diseases.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Safety Information */}
          {(plant.childSafe !== undefined || plant.petSafe !== undefined || plant.toxicWarning || plant.kidActivity) && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2">
                Safety & Family Info
              </h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  {plant.childSafe === true && (
                    <span className="text-[10px] px-2 py-1 bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 rounded-lg font-medium">
                      👶 Child Safe
                    </span>
                  )}
                  {plant.childSafe === false && (
                    <span className="text-[10px] px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg font-medium">
                      ⚠️ Not Child Safe
                    </span>
                  )}
                  {plant.petSafe === true && (
                    <span className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg font-medium">
                      🐾 Pet Safe
                    </span>
                  )}
                  {plant.petSafe === false && (
                    <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg font-medium">
                      🐾 Toxic to Pets
                    </span>
                  )}
                </div>
                {plant.toxicWarning && (
                  <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200/50 dark:border-red-800/30">
                    <span className="font-semibold">Warning:</span> {plant.toxicWarning}
                  </div>
                )}
                {plant.kidActivity && (
                  <div className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/20 p-2 rounded-lg border border-sky-200/50 dark:border-sky-800/30">
                    <span className="font-semibold">Kid activity:</span> {plant.kidActivity}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Surrey Soil Tip */}
          {plant.soilTipSurrey && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                Surrey Clay Soil Tip
              </h3>
              <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                {plant.soilTipSurrey}
              </div>
            </div>
          )}

          {plant.varieties.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                Recommended Varieties
              </h3>
              <div className="space-y-1">
                {plant.varieties.map((v) => (
                  <div key={v.name} className="text-sm text-stone-600 dark:text-stone-400">
                    <span className="font-medium">{v.name}</span> — {v.notes}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(friends.length > 0 || foes.length > 0) && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                Companion Planting
              </h3>
              {friends.length > 0 && (
                <div className="mb-2">
                  <span className="text-[10px] text-emerald-600 font-medium">
                    Friends:
                  </span>
                  {friends.map((f) => (
                    <div
                      key={f.plantB}
                      className="text-xs text-stone-500 ml-2"
                    >
                      {f.plantB.replace(/-/g, ' ')} — {f.reason}
                    </div>
                  ))}
                </div>
              )}
              {foes.length > 0 && (
                <div>
                  <span className="text-[10px] text-red-600 font-medium">
                    Foes:
                  </span>
                  {foes.map((f) => (
                    <div
                      key={f.plantB}
                      className="text-xs text-stone-500 ml-2"
                    >
                      {f.plantB.replace(/-/g, ' ')} — {f.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* UK Expert Knowledge — 8 UK experts, per-plant, filter-aware */}
          {(() => {
            const uk = getUKExpertKnowledge(plant.slug);
            if (!uk) return null;

            // Filter varieties by enabled experts (AGM always shows if enabled set includes 'rhs' OR any expert)
            const visibleVarieties = (uk.ukVarieties ?? []).filter((v) => {
              if (v.expert === 'AGM') return enabledExperts.size > 0;
              return enabledExperts.has(v.expert);
            });
            const visibleTips = (uk.tips ?? []).filter((t) => enabledExperts.has(t.expert));

            const hasClay = !!uk.claySoil;
            const hasSurrey = !!uk.surreyNote;
            const hasPoll = !!uk.pollinatorValue;
            const hasGS = !!uk.greenstalkTier;
            const hasSucc = !!uk.successionDays;
            const hasAny = visibleVarieties.length > 0 || visibleTips.length > 0 || hasClay || hasSurrey || hasPoll || hasGS || hasSucc;
            if (!hasAny && (uk.ukVarieties?.length ?? 0) === 0 && (uk.tips?.length ?? 0) === 0) return null;

            return (
              <div className="mb-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-800/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
                    🇬🇧 UK Expert Knowledge
                  </h3>
                  <button
                    onClick={toggleAll}
                    className="text-[9px] text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline"
                  >
                    {enabledExperts.size === ALL_EXPERTS.length ? 'Hide all' : 'Show all'}
                  </button>
                </div>

                {/* Expert filter chips */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {UK_EXPERTS.map((e) => {
                    const active = enabledExperts.has(e.id);
                    const colors = EXPERT_COLORS[e.id];
                    return (
                      <button
                        key={e.id}
                        onClick={() => toggleExpert(e.id)}
                        title={e.title}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
                          active
                            ? `${colors.bg} ${colors.text} ring-1 ${colors.ring}`
                            : 'bg-stone-100 dark:bg-stone-700/40 text-stone-400 dark:text-stone-500 line-through'
                        }`}
                      >
                        {e.name.replace('Royal Horticultural Society', 'RHS')}
                      </button>
                    );
                  })}
                </div>

                {/* Recommended UK varieties */}
                {visibleVarieties.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">
                      Varieties for Surrey / UK
                    </div>
                    <div className="space-y-1.5">
                      {visibleVarieties.map((v, i) => {
                        const colors = EXPERT_COLORS[v.expert];
                        const buyInfo = v.buyUrl
                          ? { url: v.buyUrl, supplier: v.supplier ?? 'Thompson & Morgan' }
                          : lookupVarietyBuyUrl(v.name, plant.commonName);
                        return (
                          <div key={`${v.name}-${i}`} className="text-xs text-stone-600 dark:text-stone-300">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold">{v.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                                {v.expert === 'AGM' ? '🏆 RHS AGM' : getExpertProfile(v.expert)?.name ?? v.expert}
                              </span>
                              <a
                                href={buyInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/40 transition-colors"
                              >
                                🛒 Buy at {buyInfo.supplier.split(' ')[0]} →
                              </a>
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-stone-400 ml-0.5">{v.reason}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expert-attributed tips */}
                {visibleTips.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">
                      Expert Tips
                    </div>
                    {visibleTips.map((t, i) => {
                      const colors = EXPERT_COLORS[t.expert];
                      const profile = getExpertProfile(t.expert);
                      return (
                        <div
                          key={`${t.expert}-${i}`}
                          className={`text-xs rounded-lg px-2.5 py-2 ring-1 ${colors.bg} ${colors.ring}`}
                        >
                          <div className={`text-[10px] font-bold mb-0.5 ${colors.text} flex items-center gap-1`}>
                            <span>{profile?.name ?? t.expert}</span>
                            <span className="font-normal text-stone-400 dark:text-stone-500">· {t.category}</span>
                          </div>
                          <div className="text-stone-700 dark:text-stone-200 leading-snug">{t.tip}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty-filter hint */}
                {enabledExperts.size === 0 && (
                  <div className="text-[11px] text-stone-400 italic text-center py-2">
                    All experts hidden. Tap a chip above to show their guidance.
                  </div>
                )}

                {/* Inline fact strip: clay · succession · GreenStalk tier · pollinators */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {hasClay && (
                    <span className={`text-[10px] px-2 py-1 rounded-full bg-stone-100 dark:bg-stone-700/50 ${CLAY_PERFORMANCE_LABEL[uk.claySoil!.performance].className}`} title={uk.claySoil!.amendment}>
                      {CLAY_PERFORMANCE_LABEL[uk.claySoil!.performance].emoji}{' '}
                      {CLAY_PERFORMANCE_LABEL[uk.claySoil!.performance].label}
                    </span>
                  )}
                  {hasSucc && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300" title="Joy Larkcom succession interval">
                      🔁 Sow every {uk.successionDays} days
                    </span>
                  )}
                  {hasGS && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300" title={uk.greenstalkTier!.reason}>
                      🗼 GreenStalk: {uk.greenstalkTier!.tier} tier
                    </span>
                  )}
                  {hasPoll && uk.pollinatorValue !== 'none' && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" title={uk.pollinatorNote}>
                      {POLLINATOR_LABEL[uk.pollinatorValue!]}
                    </span>
                  )}
                </div>

                {/* Surrey-specific practical note */}
                {hasSurrey && (
                  <div className="mt-2 text-[11px] text-stone-600 dark:text-stone-300 italic border-l-2 border-stone-300 dark:border-stone-600 pl-2">
                    <span className="not-italic text-[9px] font-bold uppercase tracking-wider text-stone-500 mr-1">Surrey:</span>
                    {uk.surreyNote}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Expert Growing Advice */}
          {(() => {
            const expertAdvice = getExpertAdviceForCrop(plant.slug);
            if (expertAdvice.length === 0) return null;
            return (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2">
                  Expert Growing Tips
                </h3>
                <div className="space-y-2">
                  {expertAdvice.map((advice) => {
                    const expert = EXPERTS.find((e) => e.id === advice.expert);
                    return (
                      <div
                        key={`${advice.expert}-${advice.slug}`}
                        className="text-xs text-stone-600 dark:text-stone-400 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-2.5 border border-amber-200/50 dark:border-amber-800/30"
                      >
                        <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-1">
                          {expert?.name ?? advice.expert}
                          {advice.method && <span className="font-normal text-stone-400 ml-1">({advice.method})</span>}
                        </div>
                        {advice.advice}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {plant.notes && (
            <div className="text-sm text-stone-500 border-t border-stone-100 dark:border-stone-700 pt-3">
              {plant.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
