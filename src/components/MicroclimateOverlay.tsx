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

      {/* Zone boundary labels — rendered where zones transition */}
      {(() => {
        const labels: { zone: MicroclimateZoneType; row: number; col: number }[] = [];
        const seen = new Set<MicroclimateZoneType>();

        // Find first cell of each zone to place label
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const zone = microclimateGrid[r][c].zone;
            if (zone === 'neutral' || zone === 'structure') continue;
            if (seen.has(zone)) continue;
            seen.add(zone);
            labels.push({ zone, row: r, col: c });
          }
        }

        return labels.map(({ zone, row, col }) => (
          <div
            key={zone}
            style={{
              position: 'absolute',
              left: col * cellSize,
              top: row * cellSize - 10,
              zIndex: 6,
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
            onMouseEnter={() => onHoverZone(zone)}
            onMouseLeave={() => onHoverZone(null)}
          >
            <span
              className="text-[7px] font-bold px-1 py-0.5 rounded whitespace-nowrap"
              style={{
                backgroundColor: ZONE_COLORS[zone].replace(/\d{2}$/, 'cc'),
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {ZONE_LABELS[zone]}
            </span>
          </div>
        ));
      })()}
    </>
  );
}

// ── Legend component ──

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
    <div className="bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
      <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-2">
        Microclimate Zones
      </h3>
      <div className="space-y-2">
        {displayZones.map((zone) => (
          <div
            key={zone}
            className={`flex items-start gap-2 cursor-pointer rounded-lg p-1.5 transition-colors ${
              hoveredZone === zone ? 'bg-stone-100 dark:bg-stone-700' : ''
            }`}
            onMouseEnter={() => onHoverZone(zone)}
            onMouseLeave={() => onHoverZone(null)}
          >
            <span
              className="w-3 h-3 rounded-sm mt-0.5 border border-stone-200 shrink-0"
              style={{ backgroundColor: ZONE_COLORS[zone].replace(/\d{2}$/, 'ff') }}
            />
            <div>
              <div className="text-xs font-medium text-stone-700 dark:text-stone-200">
                {ZONE_LABELS[zone]}
              </div>
              <div className="text-[9px] text-stone-400 leading-snug">
                {ZONE_ADVICE[zone]}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
