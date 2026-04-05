import { useState, useEffect, useMemo } from 'react';
import { usePlannerStore } from '../state/planner-store';
import { useGardenStore } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import { isInWindow, getMonthName } from '../lib/calendar-utils';
import type { Plant } from '../types/plant';

// ── Key dates ────────────────────────────────────────────────────────────────
const MOVE_IN = new Date('2026-04-15');
const GEAR_ARRIVES = new Date('2026-05-15');
const FIRST_FROST = new Date('2026-10-25');

type Phase = 'PRE_MOVE' | 'NO_GEAR' | 'EARLY_SEASON' | 'PEAK_SEASON' | 'LATE_SEASON' | 'DORMANT';

function getPhase(d: Date): Phase {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (d < MOVE_IN) return 'PRE_MOVE';
  if (d < GEAR_ARRIVES) return 'NO_GEAR';
  if (m <= 6) return 'EARLY_SEASON';
  if (m <= 8) return 'PEAK_SEASON';
  if (m <= 10) return 'LATE_SEASON';
  return 'DORMANT';
}

const PHASE_LABELS: Record<Phase, { label: string; emoji: string; color: string }> = {
  PRE_MOVE: { label: 'Pre-Move', emoji: '📦', color: 'amber' },
  NO_GEAR: { label: 'Conservatory Season', emoji: '🏠', color: 'sky' },
  EARLY_SEASON: { label: 'Setup & Planting', emoji: '🌱', color: 'emerald' },
  PEAK_SEASON: { label: 'Peak Growing', emoji: '☀️', color: 'orange' },
  LATE_SEASON: { label: 'Harvest & Wind Down', emoji: '🍂', color: 'amber' },
  DORMANT: { label: 'Planning Season', emoji: '❄️', color: 'blue' },
};

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function weatherEmoji(code: number): string {
  if (code <= 1) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface WeatherDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  rain: number;
  code: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function TodayPage() {
  const region = useRegion();
  const { plants, plantMap } = usePlantDb(region);
  const towers = usePlannerStore((s) => s.towers);
  const settings = usePlannerStore((s) => s.settings);
  const gardenCells = useGardenStore((s) => s.garden.cells);

  const [weather, setWeather] = useState<WeatherDay[] | null>(null);
  const [weatherError, setWeatherError] = useState(false);

  const today = new Date();
  const month = today.getMonth() + 1;
  const phase = getPhase(today);
  const phaseInfo = PHASE_LABELS[phase];

  // ── Fetch weather ──────────────────────────────────────────────────────
  useEffect(() => {
    const lat = settings.latitude || 51.3867;
    const lng = settings.longitude || -0.4175;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Europe/London&forecast_days=3`)
      .then((r) => r.json())
      .then((data) => {
        if (data.daily) {
          const days: WeatherDay[] = data.daily.time.map((t: string, i: number) => ({
            date: t,
            maxTemp: data.daily.temperature_2m_max[i],
            minTemp: data.daily.temperature_2m_min[i],
            rain: data.daily.precipitation_sum[i],
            code: data.daily.weathercode[i],
          }));
          setWeather(days);
        }
      })
      .catch(() => setWeatherError(true));
  }, [settings.latitude, settings.longitude]);

  // ── Collect planted plants ─────────────────────────────────────────────
  const greenstalkSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const t of towers) for (const tier of t.tiers) for (const p of tier.pockets) if (p.plantSlug) slugs.add(p.plantSlug);
    return slugs;
  }, [towers]);

  const gardenSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const row of gardenCells) for (const c of row) if (c.plantSlug) slugs.add(c.plantSlug);
    return slugs;
  }, [gardenCells]);

  const allPlantedSlugs = useMemo(() => new Set([...greenstalkSlugs, ...gardenSlugs]), [greenstalkSlugs, gardenSlugs]);
  const plantedPlants = useMemo(() => [...allPlantedSlugs].map((s) => plantMap.get(s)).filter(Boolean) as Plant[], [allPlantedSlugs, plantMap]);

  // ── Derived task lists ────────────────────────────────────────────────
  const sowIndoorsNow = useMemo(() => plants.filter((p) => isInWindow(month, p.plantingWindow.sowIndoors)), [plants, month]);
  const sowOutdoorsNow = useMemo(() => plants.filter((p) => isInWindow(month, p.plantingWindow.sowOutdoors)), [plants, month]);
  const transplantNow = useMemo(() => plantedPlants.filter((p) => isInWindow(month, p.plantingWindow.transplant)), [plantedPlants, month]);
  const harvestNow = useMemo(() => plantedPlants.filter((p) => isInWindow(month, p.plantingWindow.harvest)), [plantedPlants, month]);

  const needsFeeding = useMemo(() => plantedPlants.filter((p) => p.inGround?.feeding && !p.inGround.feeding.toLowerCase().includes('none')), [plantedPlants]);
  const pestWatch = useMemo(() => {
    const pests = new Map<string, string[]>();
    for (const p of plantedPlants) {
      for (const pest of p.inGround?.pests ?? []) {
        if (!pests.has(pest)) pests.set(pest, []);
        pests.get(pest)!.push(p.commonName);
      }
    }
    return pests;
  }, [plantedPlants]);

  // Shopping: plants in sowing window but not yet planted
  const buyAsPlugs = useMemo(() => plants.filter((p) =>
    !allPlantedSlugs.has(p.slug) &&
    p.greenstalkSuitability !== 'unsuitable' &&
    isInWindow(month, p.plantingWindow.transplant) &&
    !isInWindow(month, p.plantingWindow.sowIndoors) &&
    !isInWindow(month, p.plantingWindow.sowOutdoors)
  ).slice(0, 8), [plants, allPlantedSlugs, month]);

  const buySeeds = useMemo(() => plants.filter((p) =>
    !allPlantedSlugs.has(p.slug) &&
    (isInWindow(month, p.plantingWindow.sowIndoors) || isInWindow(month, p.plantingWindow.sowOutdoors))
  ).slice(0, 10), [plants, allPlantedSlugs, month]);

  // Weather-based advice
  const frostRisk = weather && weather.some((d) => d.minTemp < 3);
  const rainToday = weather && weather[0]?.rain > 1;
  const hotDay = weather && weather[0]?.maxTemp > 25;

  // Countdowns
  const daysToMove = daysBetween(today, MOVE_IN);
  const daysToGear = daysBetween(today, GEAR_ARRIVES);
  const daysToFrost = daysBetween(today, FIRST_FROST);
  const earliestHarvest = plantedPlants.length > 0
    ? Math.min(...plantedPlants.map((p) => p.daysToHarvest[0]))
    : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
                {phaseInfo.emoji} What To Do Right Now
              </h1>
              <p className="text-sm text-stone-400 mt-1">
                {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-${phaseInfo.color}-100 text-${phaseInfo.color}-800 dark:bg-${phaseInfo.color}-900/30 dark:text-${phaseInfo.color}-300`}>
              {phaseInfo.emoji} {phaseInfo.label}
            </div>
          </div>
        </div>

        {/* ── Countdowns ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {daysToMove > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{daysToMove}</div>
              <div className="text-[10px] font-medium text-amber-800 dark:text-amber-300">days to move-in</div>
            </div>
          )}
          {daysToGear > 0 && (
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800 p-3 text-center">
              <div className="text-2xl font-bold text-sky-600">{daysToGear}</div>
              <div className="text-[10px] font-medium text-sky-800 dark:text-sky-300">days to GreenStalks</div>
            </div>
          )}
          {daysToFrost > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{daysToFrost}</div>
              <div className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">days left in season</div>
            </div>
          )}
          <div className="bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-3 text-center">
            <div className="text-2xl font-bold text-stone-600 dark:text-stone-300">{allPlantedSlugs.size}</div>
            <div className="text-[10px] font-medium text-stone-500 dark:text-stone-400">plants selected</div>
          </div>
        </div>

        {/* ── Weather ────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
          <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-3">3-Day Forecast — Surrey</h2>
          {weather ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {weather.map((d, i) => {
                  const dt = new Date(d.date);
                  return (
                    <div key={d.date} className={`rounded-xl p-3 text-center ${i === 0 ? 'bg-stone-50 dark:bg-stone-700 ring-2 ring-emerald-500/30' : 'bg-stone-50 dark:bg-stone-700/50'}`}>
                      <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">{i === 0 ? 'Today' : DAY_NAMES[dt.getDay()]}</div>
                      <div className="text-2xl my-1">{weatherEmoji(d.code)}</div>
                      <div className="text-xs font-bold text-stone-800 dark:text-stone-200">{Math.round(d.maxTemp)}° / {Math.round(d.minTemp)}°</div>
                      {d.rain > 0 && <div className="text-[10px] text-sky-600">💧 {d.rain.toFixed(1)}mm</div>}
                    </div>
                  );
                })}
              </div>
              {/* Weather-based advice */}
              <div className="space-y-1.5">
                {frostRisk && (
                  <div className="text-xs px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium">
                    ❄️ <strong>Frost risk!</strong> Temps dropping below 3°C — cover tender seedlings or bring pots into the conservatory tonight.
                  </div>
                )}
                {rainToday ? (
                  <div className="text-xs px-3 py-2 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 rounded-lg">
                    🌧️ Rain today — skip watering. Good day for indoor seed starting, planning, or weeding (soil is soft).
                  </div>
                ) : (
                  <div className="text-xs px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg">
                    ☀️ No rain forecast — water GreenStalks and any new transplants this evening.
                  </div>
                )}
                {hotDay && (
                  <div className="text-xs px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg">
                    🌡️ Hot day (25°+) — water deeply in the evening, not midday. Lettuce and spinach may bolt.
                  </div>
                )}
              </div>
            </>
          ) : weatherError ? (
            <p className="text-xs text-stone-400">Unable to load weather data. Check your connection.</p>
          ) : (
            <p className="text-xs text-stone-400 animate-pulse">Loading forecast...</p>
          )}
        </div>

        {/* ── Urgent Actions ─────────────────────────────────────────── */}
        {(phase === 'PRE_MOVE' || phase === 'NO_GEAR') && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg">
            <h2 className="text-lg font-bold mb-2">
              {phase === 'PRE_MOVE' ? '📦 Before You Move In' : '🏠 While Waiting for GreenStalks'}
            </h2>
            {phase === 'PRE_MOVE' ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">You have {daysToMove} days. Use them!</p>
                <ul className="space-y-1 ml-4 list-disc text-white/90">
                  <li><strong>Buy seed trays + compost</strong> from any garden centre now</li>
                  <li><strong>Start tomato seeds indoors</strong> — they need 6-8 weeks head start</li>
                  <li><strong>Start basil, pepper, courgette seeds</strong> on a sunny windowsill</li>
                  <li><strong>Order strawberry plants</strong> (bare-root or potted, not seed)</li>
                  <li><strong>Buy sweet pea plugs</strong> — too late to start from seed</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">GreenStalks arrive in ~{daysToGear} days. Meanwhile:</p>
                <ul className="space-y-1 ml-4 list-disc text-white/90">
                  <li><strong>Start seeds in the conservatory:</strong> {sowIndoorsNow.slice(0, 5).map((p) => `${p.emoji} ${p.commonName}`).join(', ')}</li>
                  <li><strong>Assess the garden</strong> — take photos, measure sun patterns, identify best GreenStalk spots</li>
                  <li><strong>Direct sow outdoors:</strong> {sowOutdoorsNow.filter((p) => ['radish', 'lettuce', 'rocket', 'pea', 'spring-onion'].includes(p.slug)).map((p) => `${p.emoji} ${p.commonName}`).join(', ') || 'Lettuce, radish, peas in any pots you have'}</li>
                  <li><strong>Buy plug plants</strong> for anything too late to start from seed</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── This Week's Tasks ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">This Week — {getMonthName(month)}</h2>
          </div>
          <div className="divide-y divide-stone-50 dark:divide-stone-700">
            {/* Sow indoors */}
            {sowIndoorsNow.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-sky-700 dark:text-sky-400 mb-1.5">🏠 Sow Indoors / Conservatory</h3>
                <div className="flex flex-wrap gap-1.5">
                  {sowIndoorsNow.map((p) => (
                    <span key={p.slug} className={`text-[10px] px-2 py-1 rounded-full ${allPlantedSlugs.has(p.slug) ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold' : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'}`}>
                      {p.emoji} {p.commonName} {allPlantedSlugs.has(p.slug) ? '✓' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sow outdoors */}
            {sowOutdoorsNow.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">🌱 Direct Sow Outdoors</h3>
                <div className="flex flex-wrap gap-1.5">
                  {sowOutdoorsNow.map((p) => (
                    <span key={p.slug} className={`text-[10px] px-2 py-1 rounded-full ${allPlantedSlugs.has(p.slug) ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold' : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'}`}>
                      {p.emoji} {p.commonName} {allPlantedSlugs.has(p.slug) ? '✓' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Transplant */}
            {transplantNow.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5">🔄 Ready to Transplant</h3>
                <div className="flex flex-wrap gap-1.5">
                  {transplantNow.map((p) => (
                    <span key={p.slug} className="text-[10px] px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      {p.emoji} {p.commonName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Harvest */}
            {harvestNow.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1.5">🧺 Ready to Harvest</h3>
                <div className="flex flex-wrap gap-1.5">
                  {harvestNow.map((p) => (
                    <span key={p.slug} className="text-[10px] px-2 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-semibold">
                      {p.emoji} {p.commonName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Feeding */}
            {needsFeeding.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-1.5">🧪 Feed This Week</h3>
                <div className="space-y-1">
                  {needsFeeding.slice(0, 6).map((p) => (
                    <div key={p.slug} className="flex items-center gap-2 text-[10px] text-stone-600 dark:text-stone-400">
                      <span>{p.emoji}</span>
                      <span className="font-medium">{p.commonName}:</span>
                      <span className="text-stone-400">{p.inGround.feeding}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pest watch */}
            {pestWatch.size > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-1.5">🐛 Pest Watch</h3>
                <div className="flex flex-wrap gap-1.5">
                  {[...pestWatch.entries()].slice(0, 6).map(([pest, crops]) => (
                    <span key={pest} className="text-[10px] px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
                      {pest} — {crops.slice(0, 2).join(', ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {plantedPlants.length === 0 && (
              <div className="px-4 py-6 text-center text-stone-400 text-sm">
                <p>No plants selected yet. Add plants to your GreenStalk or Garden to see personalised tasks.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Shopping List ──────────────────────────────────────────── */}
        {(buySeeds.length > 0 || buyAsPlugs.length > 0) && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-3">🛒 Garden Centre Shopping List</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {buySeeds.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">Seeds to Buy (sow now)</h3>
                  <div className="space-y-1">
                    {buySeeds.map((p) => (
                      <div key={p.slug} className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                        <span>{p.emoji}</span> {p.commonName}
                        <span className="text-[9px] text-stone-400">— sow {isInWindow(month, p.plantingWindow.sowIndoors) ? 'indoors' : 'outdoors'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {buyAsPlugs.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">Buy as Plug Plants (too late for seed)</h3>
                  <div className="space-y-1">
                    {buyAsPlugs.map((p) => (
                      <div key={p.slug} className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                        <span>{p.emoji}</span> {p.commonName}
                        <span className="text-[9px] text-stone-400">— transplant {getMonthName(p.plantingWindow.transplant?.[0] ?? month)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Phase Guidance ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl p-5 text-white">
          <h2 className="text-lg font-bold mb-3">{phaseInfo.emoji} {phaseInfo.label} — What This Means</h2>
          {phase === 'PRE_MOVE' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p>You're <strong className="text-white">{daysToMove} days</strong> from moving into 21 Esher Avenue. Your GreenStalks are in the shipping container and won't arrive until mid-May — but that doesn't mean you can't start.</p>
              <p className="font-semibold text-emerald-400">Priority actions right now:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Buy seed trays, small pots, and multipurpose compost</strong> — you can start seeds anywhere with a sunny window</li>
                <li><strong className="text-white">Sow tomatoes and basil indoors NOW</strong> — they need 6-8 weeks to become strong transplants</li>
                <li><strong className="text-white">Sow courgettes, peppers, cucumbers</strong> — all need indoor head start</li>
                <li><strong className="text-white">Order strawberry plants online</strong> (bare-root or potted) for immediate planting when you arrive</li>
                <li><strong className="text-white">Buy sweet pea plug plants</strong> — it's too late to start them from seed (should have been February)</li>
              </ol>
              <p className="text-stone-400 text-xs mt-2">Mid-May is NOT too late. Most Surrey gardeners don't plant tender crops until after the May bank holiday. You'll have strong transplants ready by then.</p>
            </div>
          )}
          {phase === 'NO_GEAR' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p>You're in the house! GreenStalks arrive in <strong className="text-white">{daysToGear} days</strong>. The conservatory is your propagation HQ.</p>
              <p className="font-semibold text-emerald-400">This is your head-start window:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Start seeds in the conservatory</strong> — tomatoes, basil, courgettes, herbs in small pots on the windowsill</li>
                <li><strong className="text-white">Assess the garden</strong> — take photos from every angle, measure sun patterns morning vs afternoon</li>
                <li><strong className="text-white">Direct sow fast crops</strong> in any pots you have: lettuce, radish, rocket, spring onions</li>
                <li><strong className="text-white">Plan GreenStalk positions</strong> — the back patio gets the best south-east sun</li>
                <li><strong className="text-white">Buy plug plants</strong> from garden centres for anything that needed an earlier start</li>
              </ol>
              <p className="text-stone-400 text-xs mt-2">By the time GreenStalks arrive, you'll have 4-6 week old seedlings ready to transplant immediately. No time lost.</p>
            </div>
          )}
          {phase === 'EARLY_SEASON' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p><strong className="text-white">Your GreenStalks are here!</strong> This is the big planting push. Every week counts.</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Set up GreenStalks on the sunniest patio spot</strong> (check the Sun Map page)</li>
                <li><strong className="text-white">Transplant all indoor seedlings</strong> into GreenStalk pockets</li>
                <li><strong className="text-white">Direct sow beans, courgettes, herbs</strong> — still plenty of time</li>
                <li><strong className="text-white">Plant strawberry plants</strong> in top tiers (elevated = no slugs)</li>
                <li><strong className="text-white">Water daily</strong> — GreenStalks dry out faster than ground beds</li>
              </ol>
            </div>
          )}
          {phase === 'PEAK_SEASON' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p><strong className="text-white">Peak growing season.</strong> Your garden is producing. Focus on harvesting and maintenance.</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Harvest daily</strong> — regular picking encourages more production</li>
                <li><strong className="text-white">Water GreenStalks every evening</strong> — they dry fast in summer</li>
                <li><strong className="text-white">Feed fortnightly</strong> with liquid fertiliser (tomato feed for fruiting plants)</li>
                <li><strong className="text-white">Succession sow</strong> lettuce and radish every 2 weeks for continuous supply</li>
                <li><strong className="text-white">Watch for pests</strong> — check undersides of leaves for aphids daily</li>
              </ol>
            </div>
          )}
          {phase === 'LATE_SEASON' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p><strong className="text-white">Season winding down.</strong> {daysToFrost} days until likely first frost.</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Harvest everything before frost</strong> — green tomatoes can ripen on a windowsill</li>
                <li><strong className="text-white">Sow green manures</strong> (crimson clover, phacelia) on bare beds</li>
                <li><strong className="text-white">Move tender plants to conservatory</strong> — lemon, olive, frost-sensitive herbs</li>
                <li><strong className="text-white">Clean GreenStalks</strong> and store pockets for winter</li>
                <li><strong className="text-white">Save seeds</strong> from your best performers</li>
              </ol>
            </div>
          )}
          {phase === 'DORMANT' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p><strong className="text-white">Winter planning season.</strong> The garden is resting. You're not.</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Review this year</strong> — what worked, what didn't</li>
                <li><strong className="text-white">Order seeds</strong> for next season (January sales are best)</li>
                <li><strong className="text-white">Plan next year's layout</strong> — use the Garden Plotter to try new arrangements</li>
                <li><strong className="text-white">Check stored GreenStalks</strong> for damage</li>
                <li><strong className="text-white">Tend conservatory plants</strong> — water sparingly, ensure frost-free</li>
              </ol>
            </div>
          )}
        </div>

        <p className="text-[10px] text-stone-400 text-center pb-4">
          Tasks update automatically based on today's date, your selected plants, and live weather data from Open-Meteo.
        </p>
      </div>
    </div>
  );
}
