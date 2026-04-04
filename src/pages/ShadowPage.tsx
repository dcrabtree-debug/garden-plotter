import { useState, useMemo } from 'react';
import {
  analyzeEsherAvenue,
  analyzeZone,
  type ShadowObstacle,
  type ZoneSunAnalysis,
} from '../lib/shadow-engine';
import { useRegion } from '../data/use-region';

// ─── Sun hours bar chart ──────────────────────────────────────────────────────

function SunHoursChart({ analysis }: { analysis: ZoneSunAnalysis }) {
  const maxHours = 16; // max possible daylight
  return (
    <div className="space-y-1.5">
      {analysis.monthlyResults.map((r) => {
        const pct = (r.directSunHours / maxHours) * 100;
        const isBest = r.month === analysis.bestMonth.month;
        const isWorst = r.month === analysis.worstMonth.month;
        return (
          <div key={r.month} className="flex items-center gap-2">
            <span className="w-8 text-[10px] font-medium text-stone-500 dark:text-stone-400 text-right">
              {r.monthName}
            </span>
            <div className="flex-1 h-5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  r.directSunHours >= 6
                    ? 'bg-amber-400 dark:bg-amber-500'
                    : r.directSunHours >= 3
                      ? 'bg-amber-300 dark:bg-amber-600'
                      : 'bg-stone-300 dark:bg-stone-600'
                }`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className={`w-10 text-[11px] font-semibold text-right ${
              isBest ? 'text-amber-600 dark:text-amber-400' :
              isWorst ? 'text-stone-400' :
              'text-stone-600 dark:text-stone-300'
            }`}>
              {r.directSunHours}h
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shadow timeline (hour-by-hour for a specific month) ──────────────────────

function ShadowTimeline({ analysis, month }: { analysis: ZoneSunAnalysis; month: number }) {
  const result = analysis.monthlyResults.find((r) => r.month === month);
  if (!result) return null;

  // Group by full hours
  const hourSlots = new Map<number, { inShadow: boolean; elevation: number; azimuth: number }>();
  for (const sp of result.shadowProfile) {
    const h = Math.floor(sp.hour);
    if (!hourSlots.has(h) || sp.hour === h) {
      hourSlots.set(h, { inShadow: sp.inShadow, elevation: sp.sunElevation, azimuth: sp.sunAzimuth });
    }
  }

  const hours = Array.from(hourSlots.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="flex gap-0.5 items-end">
      {hours.map(([h, data]) => (
        <div key={h} className="flex flex-col items-center">
          <div
            className={`w-5 rounded-t transition-colors ${
              data.inShadow
                ? 'bg-stone-400 dark:bg-stone-600'
                : 'bg-amber-400 dark:bg-amber-500'
            }`}
            style={{ height: `${Math.max(data.elevation * 0.8, 4)}px` }}
            title={`${h}:00 — ${data.inShadow ? 'SHADOW' : 'SUN'} (elevation: ${data.elevation}°, azimuth: ${data.azimuth}°)`}
          />
          <span className="text-[7px] text-stone-400 mt-0.5">{h}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Zone card ────────────────────────────────────────────────────────────────

function ZoneCard({ analysis, selectedMonth, onSelectMonth }: {
  analysis: ZoneSunAnalysis;
  selectedMonth: number;
  onSelectMonth: (m: number) => void;
}) {
  const suitabilityColors = {
    'full-sun': 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10',
    'partial-shade': 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10',
    'full-shade': 'border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800',
  };

  const suitabilityEmoji = {
    'full-sun': '☀️',
    'partial-shade': '⛅',
    'full-shade': '🌥️',
  };

  return (
    <div className={`rounded-2xl border-2 p-5 ${suitabilityColors[analysis.suitability]}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <span className="text-xl">{suitabilityEmoji[analysis.suitability]}</span>
            {analysis.zoneName}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              analysis.suitability === 'full-sun'
                ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                : analysis.suitability === 'partial-shade'
                  ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-300'
            }`}>
              {analysis.avgGrowingSunHours}h avg (Apr–Sep)
            </span>
            <span className="text-[10px] text-stone-400">
              Best: {analysis.bestMonth.hours}h ({['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][analysis.bestMonth.month]}) ·
              Worst: {analysis.worstMonth.hours}h ({['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][analysis.worstMonth.month]})
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-stone-600 dark:text-stone-400 mb-4">{analysis.recommendation}</p>

      {/* Monthly sun hours chart */}
      <div className="mb-4">
        <h4 className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Direct Sun Hours by Month
        </h4>
        <SunHoursChart analysis={analysis} />
      </div>

      {/* Hour-by-hour shadow timeline for selected month */}
      <div>
        <h4 className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Shadow Timeline — {['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][selectedMonth]}
          <span className="font-normal ml-2 text-stone-400">
            (amber = sun, grey = shadow)
          </span>
        </h4>
        <ShadowTimeline analysis={analysis} month={selectedMonth} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ShadowPage() {
  const region = useRegion();
  const isUS = region === 'us';
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Pre-computed analysis for Esher Avenue
  const zones = useMemo(() => analyzeEsherAvenue(), []);

  if (isUS) {
    return (
      <div className="h-full flex items-center justify-center text-stone-400">
        <div className="text-center">
          <p className="text-lg mb-1">Shadow Modeler</p>
          <p className="text-sm">Currently configured for 21 Esher Ave, Surrey.</p>
          <p className="text-sm">SoCal shadow modeling coming soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
            Shadow Modeler
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Actual sun hours per zone at 21 Esher Ave, calculated from hedge heights, fence positions, and solar angles for latitude 51.4°N
          </p>

          <div className="flex items-center gap-3 mt-4">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Timeline Month</label>
            <div className="flex gap-1">
              {[3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`w-8 h-8 rounded-full text-[10px] font-medium transition-all ${
                    m === selectedMonth
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Zone analyses */}
        <ZoneCard analysis={zones.terrace} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
        <ZoneCard analysis={zones.conservatory} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
        <ZoneCard analysis={zones.fenceBorder} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />

        {/* Key insight */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-4">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <span>💡</span> Key Insight: The Laurel Hedge Effect
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            The 3.5m laurel hedge on the north-west side blocks afternoon sun on the terrace from roughly 3-4pm onwards in summer.
            This means your GreenStalks get strong morning and midday sun but lose the last few hours of the day.
            At {zones.terrace.avgGrowingSunHours}h average, the terrace is classified as "{zones.terrace.suitability}" —
            {zones.terrace.suitability === 'full-sun'
              ? ' still excellent for all crops including tomatoes and strawberries.'
              : zones.terrace.suitability === 'partial-shade'
                ? ' good for most crops but consider whether tomatoes and peppers will get enough sun. Position them on the south-east side of the GreenStalk for maximum morning exposure.'
                : ' challenging for sun-hungry crops.'}
          </p>
        </div>

        {/* Obstacle summary */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3">Obstacles Used in Calculation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { name: 'Laurel/Ivy Hedge', height: '3.5m', bearing: 'NW (315°)', dist: '3m from terrace' },
              { name: 'House (2-storey)', height: '7m', bearing: 'SE (135°)', dist: '8m from terrace' },
              { name: 'Right Fence', height: '1.8m', bearing: 'E (90°)', dist: '0.5m from border' },
              { name: 'Cordyline Trees', height: '2.5m', bearing: 'E (90°)', dist: '0.3m from border' },
            ].map((obs, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-700/50 text-[10px]">
                <div className="font-medium text-stone-700 dark:text-stone-200">{obs.name}</div>
                <div className="text-stone-400">{obs.height} · {obs.bearing} · {obs.dist}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-stone-400 text-center pb-4">
          Sun angles calculated for latitude 51.4°N (Esher, Surrey). BST offset applied Apr–Sep.
          Obstacle heights estimated from handoff photos. Refine after move-in.
        </p>
      </div>
    </div>
  );
}
