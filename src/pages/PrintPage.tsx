/**
 * Print / PDF Export Page
 *
 * Renders a clean, print-optimized garden plan + shopping list.
 * Opened in a new view, user hits Cmd+P to save as PDF.
 *
 * Sections:
 *   1. Garden Overview — header, grid illustration, zone summary
 *   2. Plant Shopping List — grouped by where to buy, with quantities
 *   3. Planting Calendar — month-by-month action list
 *   4. GreenStalk Tower Layout — what's in each tier
 */

import { useMemo } from 'react';
import { useGardenStore } from '../state/garden-store';
import { usePlannerStore } from '../state/planner-store';
import { usePlantDb } from '../data/use-plant-db';
import { useCompanionDb } from '../data/use-companion-db';
import { useRegion } from '../data/use-region';
import { getMonthName, isInWindow } from '../lib/calendar-utils';
import type { Plant } from '../types/plant';
import type { CellType } from '../types/planner';

const CELL_COLORS: Record<CellType, string> = {
  empty: '#e8e0d0',
  lawn: '#7db88a',
  'veg-patch': '#8a7262',
  'flower-bed': '#e8879f',
  greenstalk: '#2a9d8f',
  conservatory: '#7ec8c0',
  patio: '#b8b0a4',
  path: '#cec4b8',
  tree: '#3a7d45',
  shed: '#6b4c3b',
  'raised-bed': '#9e8474',
  'water-feature': '#6aafe0',
  compost: '#5a4035',
};

interface PlantEntry {
  plant: Plant;
  locations: string[];
  quantity: number;
  inGreenStalk: boolean;
  inGround: boolean;
  tiers: number[];
}

export function PrintPage({ onClose }: { onClose: () => void }) {
  const garden = useGardenStore((s) => s.garden);
  const towers = usePlannerStore((s) => s.towers);
  const region = useRegion();
  const { plants, plantMap } = usePlantDb(region);
  const { companionMap: _companionMap } = useCompanionDb();

  const { config, cells } = garden;
  const cols = cells[0]?.length ?? 0;
  const rows = cells.length;
  const currentMonth = new Date().getMonth() + 1;

  // ── Aggregate all planted plants with locations ──
  const plantEntries = useMemo(() => {
    const map = new Map<string, PlantEntry>();

    const getOrCreate = (slug: string): PlantEntry | null => {
      if (map.has(slug)) return map.get(slug)!;
      const plant = plantMap.get(slug);
      if (!plant) return null;
      const entry: PlantEntry = { plant, locations: [], quantity: 0, inGreenStalk: false, inGround: false, tiers: [] };
      map.set(slug, entry);
      return entry;
    };

    // Garden grid plants
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];
        if (!cell.plantSlug) continue;
        const entry = getOrCreate(cell.plantSlug);
        if (!entry) continue;
        entry.quantity++;
        entry.inGround = true;
        const locLabel = `${cell.type.replace(/-/g, ' ')} (row ${r}, col ${c})`;
        if (!entry.locations.includes(cell.type.replace(/-/g, ' '))) {
          entry.locations.push(cell.type.replace(/-/g, ' '));
        }
      }
    }

    // GreenStalk tower plants
    for (const tower of towers) {
      for (const tier of tower.tiers) {
        for (const pocket of tier.pockets) {
          if (!pocket.plantSlug) continue;
          const entry = getOrCreate(pocket.plantSlug);
          if (!entry) continue;
          entry.quantity++;
          entry.inGreenStalk = true;
          if (!entry.tiers.includes(tier.tierNumber)) {
            entry.tiers.push(tier.tierNumber);
          }
          if (!entry.locations.includes('GreenStalk')) {
            entry.locations.push('GreenStalk');
          }
        }
      }
    }

    return [...map.values()].sort((a, b) => a.plant.commonName.localeCompare(b.plant.commonName));
  }, [cells, towers, plantMap, rows, cols]);

  // ── Monthly planting actions ──
  const monthlyActions = useMemo(() => {
    const actions: { month: number; plant: string; emoji: string; action: string }[] = [];
    const seen = new Set<string>();

    for (const entry of plantEntries) {
      const p = entry.plant;
      const pw = p.plantingWindow;

      const addAction = (action: string, window: [number, number] | null) => {
        if (!window) return;
        for (let m = 1; m <= 12; m++) {
          if (isInWindow(m, window)) {
            const key = `${m}-${p.slug}-${action}`;
            if (!seen.has(key)) {
              seen.add(key);
              actions.push({ month: m, plant: p.commonName, emoji: p.emoji, action });
            }
          }
        }
      };

      addAction('Sow indoors', pw.sowIndoors);
      addAction('Sow outdoors', pw.sowOutdoors);
      addAction('Transplant', pw.transplant);
      addAction('Harvest', pw.harvest);
    }

    return actions.sort((a, b) => a.month - b.month || a.plant.localeCompare(b.plant));
  }, [plantEntries]);

  // Grid cell size for the miniature map
  const mapCellSize = Math.min(18, Math.floor(500 / cols));

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto print:static print:overflow-visible">
      {/* Screen-only toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-700 text-sm flex items-center gap-1"
          >
            <span>&larr;</span> Back
          </button>
          <h2 className="text-sm font-semibold text-stone-700">Garden Plan Export</h2>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-700 transition-colors flex items-center gap-2"
        >
          <span>🖨</span> Print / Save PDF
        </button>
      </div>

      {/* ═══ PRINTABLE CONTENT ═══ */}
      <div className="max-w-[210mm] mx-auto px-8 py-6 print:px-0 print:py-0 print:max-w-none">

        {/* ─── Page 1: Header + Garden Map ─── */}
        <div className="print:break-after-page">
          <header className="mb-6 border-b-2 border-stone-800 pb-4">
            <h1 className="text-2xl font-serif font-bold text-stone-800">Garden Plan</h1>
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-sm text-stone-500">
                21 Esher Avenue, Walton-on-Thames, Surrey KT12 2SZ
              </div>
              <div className="text-xs text-stone-400">
                Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              {config.widthM}m × {config.depthM}m · Facing {config.facing} · RHS Zone H5
            </div>
          </header>

          {/* Garden grid miniature */}
          <section className="mb-6">
            <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-3">Garden Layout</h2>
            <div className="flex justify-center">
              <div
                className="border border-stone-300"
                style={{ lineHeight: 0 }}
              >
                {cells.map((row, ri) => (
                  <div key={ri} className="flex" style={{ height: mapCellSize }}>
                    {row.map((cell, ci) => {
                      const plant = cell.plantSlug ? plantMap.get(cell.plantSlug) : null;
                      return (
                        <div
                          key={ci}
                          style={{
                            width: mapCellSize,
                            height: mapCellSize,
                            backgroundColor: CELL_COLORS[cell.type],
                            fontSize: mapCellSize * 0.6,
                            lineHeight: `${mapCellSize}px`,
                          }}
                          className="border-r border-b border-stone-200/30 flex items-center justify-center"
                        >
                          {plant && <span style={{ fontSize: mapCellSize * 0.55 }}>{plant.emoji}</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Zone legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
              {(['lawn', 'patio', 'flower-bed', 'raised-bed', 'greenstalk', 'conservatory', 'tree', 'shed', 'path', 'compost'] as CellType[]).map((type) => (
                <div key={type} className="flex items-center gap-1 text-[9px] text-stone-500">
                  <span
                    className="w-3 h-3 rounded-sm border border-stone-200"
                    style={{ backgroundColor: CELL_COLORS[type] }}
                  />
                  {type.replace(/-/g, ' ')}
                </div>
              ))}
            </div>
          </section>

          {/* Quick stats */}
          <section className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Plants', value: plantEntries.length.toString() },
              { label: 'In Ground', value: plantEntries.filter((e) => e.inGround).length.toString() },
              { label: 'GreenStalk', value: plantEntries.filter((e) => e.inGreenStalk).length.toString() },
              { label: 'Towers', value: towers.length.toString() },
            ].map((stat) => (
              <div key={stat.label} className="bg-stone-50 rounded-lg p-3 text-center border border-stone-200">
                <div className="text-lg font-bold text-stone-800">{stat.value}</div>
                <div className="text-[10px] text-stone-400 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </section>
        </div>

        {/* ─── Page 2: Shopping List ─── */}
        <div className="print:break-after-page">
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-stone-200 pb-2">
            <span>🛒</span> Plant Shopping List
          </h2>
          <p className="text-xs text-stone-400 mb-3">
            Based on today's date ({new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}). Buy as column shows what form to buy in right now.
          </p>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-stone-300">
                <th className="text-left py-1.5 w-6 print:w-4"></th>
                <th className="text-left py-1.5 font-semibold text-stone-600">Plant</th>
                <th className="text-left py-1.5 font-semibold text-stone-600">Variety</th>
                <th className="text-center py-1.5 font-semibold text-stone-600 w-10">Qty</th>
                <th className="text-left py-1.5 font-semibold text-stone-600">Location</th>
                <th className="text-left py-1.5 font-semibold text-stone-600">Buy as</th>
                <th className="text-left py-1.5 font-semibold text-stone-600">Where</th>
                <th className="text-left py-1.5 font-semibold text-stone-600 w-24">Timing</th>
              </tr>
            </thead>
            <tbody>
              {plantEntries.map((entry, i) => {
                const p = entry.plant;
                const pw = p.plantingWindow;

                // Determine buy form based on current month vs planting windows
                const canSowIndoors = isInWindow(currentMonth, pw.sowIndoors);
                const canSowOutdoors = isInWindow(currentMonth, pw.sowOutdoors);
                const canTransplant = isInWindow(currentMonth, pw.transplant);
                // Past sowing window? Need plugs or plants instead
                const sowIndoorsPast = pw.sowIndoors && currentMonth > pw.sowIndoors[1] && pw.sowIndoors[1] >= pw.sowIndoors[0];
                const sowOutdoorsPast = pw.sowOutdoors && currentMonth > pw.sowOutdoors[1] && pw.sowOutdoors[1] >= pw.sowOutdoors[0];

                let buyAs: string;
                let buyIcon: string;
                if (canSowIndoors || canSowOutdoors) {
                  buyAs = 'Seed';
                  buyIcon = '🌰';
                } else if (canTransplant) {
                  buyAs = 'Plugs';
                  buyIcon = '🌿';
                } else if (sowIndoorsPast || sowOutdoorsPast) {
                  // Missed seed window — buy as plug or established plant
                  if (canTransplant) {
                    buyAs = 'Plugs';
                    buyIcon = '🌿';
                  } else {
                    buyAs = 'Plant';
                    buyIcon = '🪴';
                  }
                } else {
                  // Before any window opens or outside all windows
                  buyAs = 'Seed';
                  buyIcon = '🌰';
                }

                // Where to buy — local garden centres for plugs/plants, online for seed
                let whereToBuy: string;
                if (buyAs === 'Seed') {
                  whereToBuy = 'Online / Squires';
                } else if (buyAs === 'Plugs') {
                  whereToBuy = 'Squires / Wisley';
                } else {
                  whereToBuy = 'Squires / Wisley';
                }

                // Timing summary
                const timing: string[] = [];
                if (canSowIndoors) timing.push('Sow indoors now');
                else if (canSowOutdoors) timing.push('Sow outdoors now');
                else if (canTransplant) timing.push('Plant out now');
                else if (pw.sowIndoors) timing.push(`Sow from ${getMonthName(pw.sowIndoors[0])}`);
                else if (pw.sowOutdoors) timing.push(`Sow from ${getMonthName(pw.sowOutdoors[0])}`);
                else if (pw.transplant) timing.push(`Plant from ${getMonthName(pw.transplant[0])}`);

                const bestVariety = p.varieties.length > 0 ? p.varieties[0].name : '—';

                return (
                  <tr key={p.slug} className={`border-b border-stone-100 ${i % 2 === 0 ? '' : 'bg-stone-50'}`}>
                    <td className="py-1.5 text-center">
                      <span className="inline-block w-3 h-3 border border-stone-300 rounded-sm" />
                    </td>
                    <td className="py-1.5">
                      <span className="mr-1">{p.emoji}</span>
                      <span className="font-medium text-stone-700">{p.commonName}</span>
                    </td>
                    <td className="py-1.5 text-stone-500 italic text-[10px]">{bestVariety}</td>
                    <td className="py-1.5 text-center font-semibold text-stone-700">{entry.quantity}</td>
                    <td className="py-1.5 text-stone-500 text-[10px]">{entry.locations.join(', ')}</td>
                    <td className="py-1.5">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                        buyAs === 'Seed' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : buyAs === 'Plugs' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-violet-50 text-violet-700 border border-violet-200'
                      }`}>
                        {buyIcon} {buyAs}
                      </span>
                    </td>
                    <td className="py-1.5 text-stone-500 text-[10px]">{whereToBuy}</td>
                    <td className="py-1.5 text-stone-500 text-[9px]">{timing[0] ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Buy-as key */}
          <div className="mt-2 flex gap-4 text-[9px] text-stone-400">
            <span>🌰 Seed — sow yourself (cheapest)</span>
            <span>🌿 Plugs — young plants, transplant-ready</span>
            <span>🪴 Plant — established, ready to go in</span>
          </div>

          {/* Where-to-buy key */}
          <div className="mt-1 text-[9px] text-stone-400">
            <strong className="text-stone-500">Squires</strong> = Squires Garden Centre, Hersham Rd ·
            <strong className="text-stone-500 ml-1">Wisley</strong> = RHS Garden Wisley plant centre ·
            <strong className="text-stone-500 ml-1">Online</strong> = Thompson & Morgan, Suttons, Mr Fothergill's
          </div>

          {plantEntries.length === 0 && (
            <div className="text-center text-stone-400 py-8 text-sm">
              No plants placed yet. Add plants to your garden or GreenStalk towers first.
            </div>
          )}

          {/* Alternative Varieties — compact inline layout */}
          {plantEntries.some((e) => e.plant.varieties.length > 1) && (
            <div className="mt-4 bg-stone-50 rounded-lg p-3 border border-stone-200">
              <h3 className="text-[10px] font-bold text-stone-600 uppercase mb-1">Alternative Varieties</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {plantEntries
                  .filter((e) => e.plant.varieties.length > 1)
                  .map((entry) => (
                    <span key={entry.plant.slug} className="text-[9px] text-stone-500">
                      <span className="font-medium text-stone-600">{entry.plant.emoji} {entry.plant.commonName}:</span>{' '}
                      {entry.plant.varieties.slice(1).map((v) => v.name).join(', ')}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Page 3: GreenStalk Tower Layouts ─── */}
        {towers.length > 0 && (
          <div className="print:break-after-page">
            <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-stone-200 pb-2">
              <span>🌱</span> GreenStalk Tower Layouts
            </h2>

            <div className="grid grid-cols-1 gap-6" style={{ gridTemplateColumns: towers.length > 1 ? 'repeat(2, 1fr)' : '1fr' }}>
              {towers.map((tower) => (
                <div key={tower.id} className="border border-stone-200 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-stone-700 mb-2">{tower.name}</h3>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-1 font-semibold text-stone-500 w-12">Tier</th>
                        <th className="text-left py-1 font-semibold text-stone-500">Pockets (1-6)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tower.tiers.map((tier) => (
                        <tr key={tier.tierNumber} className="border-b border-stone-100">
                          <td className="py-1 font-medium text-stone-600">Tier {tier.tierNumber}</td>
                          <td className="py-1">
                            <div className="flex gap-1">
                              {tier.pockets.map((pocket, pi) => {
                                const plant = pocket.plantSlug ? plantMap.get(pocket.plantSlug) : null;
                                return (
                                  <span
                                    key={pi}
                                    className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] ${
                                      plant
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-stone-50 text-stone-300 border border-stone-100'
                                    }`}
                                  >
                                    {plant ? (
                                      <>
                                        <span>{plant.emoji}</span>
                                        <span className="truncate max-w-[50px]">{plant.commonName}</span>
                                      </>
                                    ) : (
                                      'empty'
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Page 4: Monthly Planting Calendar ─── */}
        <div className="print:break-after-page">
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-stone-200 pb-2">
            <span>📅</span> Planting Calendar
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
              const actions = monthlyActions.filter((a) => a.month === month);
              const isCurrent = month === currentMonth;
              return (
                <div
                  key={month}
                  className={`border rounded-lg p-2 ${
                    isCurrent
                      ? 'border-emerald-400 bg-emerald-50/30'
                      : 'border-stone-200'
                  }`}
                >
                  <h3 className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${
                    isCurrent ? 'text-emerald-700' : 'text-stone-500'
                  }`}>
                    {getMonthName(month)}
                    {isCurrent && <span className="ml-1 text-[8px] font-normal">(now)</span>}
                  </h3>
                  {actions.length > 0 ? (
                    <div className="space-y-0.5">
                      {actions.map((a, i) => (
                        <div key={i} className="text-[9px] text-stone-600 flex items-center gap-1">
                          <span>{a.emoji}</span>
                          <span className="font-medium">{a.action}</span>
                          <span className="text-stone-400">{a.plant}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[9px] text-stone-300 italic">No actions</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <footer className="mt-6 pt-3 border-t border-stone-200 text-center text-[9px] text-stone-400">
          Garden Plotter · 21 Esher Avenue · Generated {new Date().toISOString().slice(0, 10)}
        </footer>
      </div>
    </div>
  );
}
