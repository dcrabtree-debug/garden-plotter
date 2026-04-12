/**
 * Microclimate Zone Overlay
 *
 * Maps garden grid cells to microclimate zones based on:
 * - Position relative to house wall (radiant heat)
 * - Position relative to fences (wind shelter, frost pockets)
 * - Cell type (conservatory = frost-free, shed = sheltered)
 * - Sun hours from the solar engine
 *
 * Renders as a semi-transparent overlay on the garden grid with
 * zone labels and a legend.
 */

import type { GardenCell, GardenConfig, CellType } from '../types/planner';

export interface MicroclimateCell {
  zone: MicroclimateZoneType;
  shelter: 'full' | 'moderate' | 'exposed';
  frostRisk: 'none' | 'low' | 'moderate' | 'high';
  heatIsland: boolean;
}

type MicroclimateZoneType =
  | 'warm-wall'      // Within 2m of south-facing house wall — radiant heat
  | 'sheltered'      // Protected by structures on 2+ sides
  | 'frost-pocket'   // Low-lying area where cold air pools
  | 'exposed'        // Open to wind, no shelter
  | 'conservatory'   // Indoor, frost-free
  | 'wind-corridor'  // Between structures creating wind tunnel
  | 'dappled-shade'  // Under tree canopy, some light
  | 'structure'      // Shed, path, etc. — not plantable
  | 'neutral';       // Normal conditions

const ZONE_COLORS: Record<MicroclimateZoneType, string> = {
  'warm-wall':     '#ef444480',  // Red-orange
  'sheltered':     '#22c55e60',  // Green
  'frost-pocket':  '#3b82f680',  // Blue
  'exposed':       '#a855f760',  // Purple
  'conservatory':  '#f59e0b60',  // Amber
  'wind-corridor': '#06b6d460',  // Cyan
  'dappled-shade': '#84cc1660',  // Lime
  'structure':     '#00000020',  // Dark overlay
  'neutral':       '#00000000',  // Transparent
};

const ZONE_LABELS: Record<MicroclimateZoneType, string> = {
  'warm-wall':     'Warm Wall',
  'sheltered':     'Sheltered',
  'frost-pocket':  'Frost Pocket',
  'exposed':       'Exposed',
  'conservatory':  'Conservatory',
  'wind-corridor': 'Wind Corridor',
  'dappled-shade': 'Dappled Shade',
  'structure':     'Structure',
  'neutral':       'Neutral',
};

const ZONE_ADVICE: Record<MicroclimateZoneType, string> = {
  'warm-wall':     'Ideal for tender plants, early crops, and fruit trees trained against the wall.',
  'sheltered':     'Good for most plants. Protected from prevailing wind.',
  'frost-pocket':  'Cold air pools here. Avoid tender plants. Good for late-season cold-hardy crops.',
  'exposed':       'Full wind exposure. Use wind-tolerant plants or add screening.',
  'conservatory':  'Frost-free year-round. Perfect for seed starting and overwintering.',
  'wind-corridor': 'Wind accelerates between structures. Choose sturdy, low-growing plants.',
  'dappled-shade': 'Filtered light through tree canopy. Good for shade-tolerant edibles.',
  'structure':     'Not plantable.',
  'neutral':       'Standard conditions for this location.',
};

const NON_PLANTABLE: CellType[] = ['path', 'shed', 'compost', 'lawn', 'patio'];

export function calculateMicroclimate(
  cells: GardenCell[][],
  config: GardenConfig
): MicroclimateCell[][] {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;

  const result: MicroclimateCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      zone: 'neutral' as MicroclimateZoneType,
      shelter: 'moderate' as const,
      frostRisk: 'low' as const,
      heatIsland: false,
    }))
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      const mc = result[r][c];

      // ── Non-plantable structures ──
      if (cell.type === 'shed' || cell.type === 'compost' || cell.type === 'path') {
        mc.zone = 'structure';
        mc.shelter = 'full';
        mc.frostRisk = 'none';
        continue;
      }

      // ── Conservatory ──
      if (cell.type === 'conservatory') {
        mc.zone = 'conservatory';
        mc.shelter = 'full';
        mc.frostRisk = 'none';
        continue;
      }

      // ── Lawn (not plantable for renters) ──
      if (cell.type === 'lawn') {
        mc.zone = 'neutral';
        mc.shelter = 'moderate';
        mc.frostRisk = 'low';
        continue;
      }

      // ── Warm wall effect: within 4 rows of house wall (row 0) ──
      // House wall radiates stored heat, extending growing season
      if (r <= 3 && cell.type !== 'patio') {
        mc.zone = 'warm-wall';
        mc.shelter = 'moderate';
        mc.frostRisk = 'low';
        mc.heatIsland = true;
        continue;
      }

      // ── Patio near house — warm wall heat island ──
      if (cell.type === 'patio' && r <= 3) {
        mc.zone = 'warm-wall';
        mc.shelter = 'moderate';
        mc.frostRisk = 'low';
        mc.heatIsland = true;
        continue;
      }

      // ── Tree canopy — dappled shade ──
      if (cell.type === 'tree') {
        mc.zone = 'dappled-shade';
        mc.shelter = 'moderate';
        mc.frostRisk = 'moderate';
        continue;
      }

      // ── Check for shelter from structures ──
      let shelterSides = 0;
      // Check north (higher row = further from house)
      if (r > 0 && ['shed', 'tree', 'conservatory'].includes(cells[r - 1]?.[c]?.type ?? '')) shelterSides++;
      if (r < rows - 1 && ['shed', 'tree', 'conservatory'].includes(cells[r + 1]?.[c]?.type ?? '')) shelterSides++;
      if (c > 0 && ['shed', 'tree', 'conservatory'].includes(cells[r]?.[c - 1]?.type ?? '')) shelterSides++;
      if (c < cols - 1 && ['shed', 'tree', 'conservatory'].includes(cells[r]?.[c + 1]?.type ?? '')) shelterSides++;

      // Also check fence proximity
      const nearWestFence = c <= 1;
      const nearEastFence = c >= cols - 2;
      if (nearWestFence) shelterSides++;
      if (nearEastFence) shelterSides++;

      // ── Frost pocket: bottom rows, sheltered but cold air pools ──
      // In gardens, cold air flows downhill. The back (north) end,
      // especially where hedges/fences trap cold air, creates frost pockets.
      if (r >= rows - 4 && shelterSides >= 2) {
        mc.zone = 'frost-pocket';
        mc.shelter = 'moderate';
        mc.frostRisk = 'high';
        continue;
      }

      // ── Wind corridor: narrow gap between structures ──
      const leftBlock = c > 0 && ['shed', 'tree'].includes(cells[r]?.[c - 1]?.type ?? '');
      const rightBlock = c < cols - 1 && ['shed', 'tree'].includes(cells[r]?.[c + 1]?.type ?? '');
      if (leftBlock && rightBlock) {
        mc.zone = 'wind-corridor';
        mc.shelter = 'exposed';
        mc.frostRisk = 'moderate';
        continue;
      }

      // ── Sheltered: near structures on 2+ sides ──
      if (shelterSides >= 2) {
        mc.zone = 'sheltered';
        mc.shelter = 'full';
        mc.frostRisk = 'low';
        continue;
      }

      // ── Exposed: middle of open garden ──
      if (shelterSides === 0 && r >= 4 && r <= rows - 5) {
        mc.zone = 'exposed';
        mc.shelter = 'exposed';
        mc.frostRisk = 'moderate';
        continue;
      }

      // ── Default: neutral ──
      mc.zone = 'neutral';
      mc.shelter = 'moderate';
      mc.frostRisk = 'low';
    }
  }

  return result;
}

// ── React component for the overlay ──

interface OverlayProps {
  microclimateGrid: MicroclimateCell[][];
  cellSize: number;
  hoveredZone: MicroclimateZoneType | null;
  onHoverZone: (zone: MicroclimateZoneType | null) => void;
}

export function MicroclimateOverlayGrid({ microclimateGrid, cellSize, hoveredZone, onHoverZone }: OverlayProps) {
  const rows = microclimateGrid.length;
  const cols = microclimateGrid[0]?.length ?? 0;

  return (
    <>
      {/* Semi-transparent color overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: cols * cellSize,
          height: rows * cellSize,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        {microclimateGrid.map((row, ri) => (
          <div key={ri} className="flex" style={{ height: cellSize }}>
            {row.map((mc, ci) => (
              <div
                key={ci}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: ZONE_COLORS[mc.zone],
                  opacity: hoveredZone === null || hoveredZone === mc.zone ? 1 : 0.2,
                  transition: 'opacity 0.2s',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Zone labels — placed at the centroid of each zone for readability */}
      {(() => {
        // Collect all cells per zone to compute centroids
        const zoneCells = new Map<MicroclimateZoneType, { rows: number[]; cols: number[] }>();

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const zone = microclimateGrid[r][c].zone;
            if (zone === 'neutral' || zone === 'structure') continue;
            if (!zoneCells.has(zone)) zoneCells.set(zone, { rows: [], cols: [] });
            const entry = zoneCells.get(zone)!;
            entry.rows.push(r);
            entry.cols.push(c);
          }
        }

        return [...zoneCells.entries()].map(([zone, { rows: zRows, cols: zCols }]) => {
          const avgRow = zRows.reduce((a, b) => a + b, 0) / zRows.length;
          const avgCol = zCols.reduce((a, b) => a + b, 0) / zCols.length;

          return (
            <div
              key={zone}
              style={{
                position: 'absolute',
                left: avgCol * cellSize + cellSize / 2,
                top: avgRow * cellSize + cellSize / 2,
                transform: 'translate(-50%, -50%)',
                zIndex: 6,
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              onMouseEnter={() => onHoverZone(zone)}
              onMouseLeave={() => onHoverZone(null)}
            >
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-sm"
                style={{
                  backgroundColor: ZONE_COLORS[zone].replace(/\d{2}$/, 'dd'),
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                {ZONE_LABELS[zone]}
              </span>
              {hoveredZone === zone && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 mt-1 bg-stone-900/90 text-white text-[8px] px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
                  style={{ zIndex: 10 }}
                >
                  {ZONE_ADVICE[zone]}
                </div>
              )}
            </div>
          );
        });
      })()}
    </>
  );
}

// ── Floating legend overlay — positioned over the map ──

export function MicroclimateLegend({
  hoveredZone,
  onHoverZone,
}: {
  hoveredZone: MicroclimateZoneType | null;
  onHoverZone: (zone: MicroclimateZoneType | null) => void;
}) {
  const displayZones: MicroclimateZoneType[] = [
    'warm-wall', 'sheltered', 'frost-pocket', 'exposed',
    'conservatory', 'wind-corridor', 'dappled-shade',
  ];

  return (
    <div className="absolute top-2 right-2 z-20 bg-white/95 dark:bg-stone-800/95 backdrop-blur-sm rounded-xl border border-stone-200 dark:border-stone-700 shadow-lg p-3 max-w-[200px]">
      <h3 className="text-[11px] font-bold text-stone-700 dark:text-stone-200 mb-1.5">
        Microclimate Zones
      </h3>
      <div className="space-y-1">
        {displayZones.map((zone) => (
          <div
            key={zone}
            className={`flex items-start gap-1.5 cursor-pointer rounded-lg px-1.5 py-1 transition-colors ${
              hoveredZone === zone ? 'bg-stone-100 dark:bg-stone-700' : ''
            }`}
            onMouseEnter={() => onHoverZone(zone)}
            onMouseLeave={() => onHoverZone(null)}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm mt-0.5 shrink-0"
              style={{ backgroundColor: ZONE_COLORS[zone].replace(/\d{2}$/, 'ff') }}
            />
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-stone-700 dark:text-stone-200 leading-tight">
                {ZONE_LABELS[zone]}
              </div>
              {hoveredZone === zone && (
                <div className="text-[8px] text-stone-400 leading-snug mt-0.5">
                  {ZONE_ADVICE[zone]}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-1.5 border-t border-stone-200 dark:border-stone-700 text-[8px] text-stone-400 leading-snug">
        Hover a zone for planting advice. Grey = neutral conditions.
      </div>
    </div>
  );
}
