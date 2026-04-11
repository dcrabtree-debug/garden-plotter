/**
 * Plan-View Illustration — Landscape-designer-style SVG overlay
 *
 * Renders placed plants as botanical top-down illustrations sized to their
 * mature spread (spacingCm), styled by growthHabit and colored by category.
 * Overlays directly on the garden grid canvas.
 */

import { useMemo } from 'react';
import type { GardenCell } from '../types/planner';
import type { Plant, GrowthHabit, PlantCategory } from '../types/plant';

// ── Category color palette — muted, landscape-plan aesthetic ──
const CATEGORY_FILL: Record<PlantCategory, { base: string; accent: string; stroke: string }> = {
  vegetable: { base: '#6aa84f', accent: '#93c47d', stroke: '#38761d' },
  herb:      { base: '#8fbc8f', accent: '#b5d5b5', stroke: '#5a8a5a' },
  fruit:     { base: '#cc4125', accent: '#e06666', stroke: '#990000' },
  flower:    { base: '#d5a6bd', accent: '#ead1dc', stroke: '#a64d79' },
  legume:    { base: '#b6d7a8', accent: '#d9ead3', stroke: '#6aa84f' },
  fern:      { base: '#45818e', accent: '#76a5af', stroke: '#134f5c' },
};

interface Props {
  cells: GardenCell[][];
  plantMap: Map<string, Plant>;
  cellSize: number;
  cellSizeM: number;
}

interface PlantPlacement {
  row: number;
  col: number;
  plant: Plant;
  // Center position in px
  cx: number;
  cy: number;
  // Radius in px (half the mature spread, clamped to min 1 cell)
  radiusPx: number;
}

/**
 * Compute the SVG radius for a plant's mature spread.
 * spacingCm is the recommended spacing — we treat it as the diameter of
 * the mature canopy/footprint. Minimum rendered size = 0.6× one cell.
 */
function plantRadius(spacingCm: number, cellSize: number, cellSizeM: number): number {
  const spreadM = spacingCm / 100;
  const spreadPx = (spreadM / cellSizeM) * cellSize;
  const radiusPx = spreadPx / 2;
  // Floor: at least 60% of a cell so tiny herbs are still visible
  return Math.max(radiusPx, cellSize * 0.3);
}

/**
 * Generate SVG elements for a given growth habit.
 * Each returns a <g> positioned at (0,0) — caller translates to (cx, cy).
 */
function HabitShape({ habit, r, colors, uid }: {
  habit: GrowthHabit;
  r: number;
  colors: { base: string; accent: string; stroke: string };
  uid: string;
}) {
  const id = `pv-${uid}`;

  switch (habit) {
    case 'bushy':
      // Irregular clump — overlapping circles
      return (
        <g>
          <circle cx={-r * 0.15} cy={-r * 0.1} r={r * 0.7} fill={colors.base} opacity={0.7} />
          <circle cx={r * 0.2} cy={r * 0.05} r={r * 0.65} fill={colors.accent} opacity={0.6} />
          <circle cx={-r * 0.05} cy={r * 0.15} r={r * 0.6} fill={colors.base} opacity={0.5} />
          <circle cx={0} cy={0} r={r * 0.5} fill={colors.accent} opacity={0.7} />
          <circle cx={0} cy={0} r={r} fill="none" stroke={colors.stroke} strokeWidth={1} opacity={0.4} strokeDasharray="3 2" />
        </g>
      );

    case 'upright':
      // Compact rosette with strong center — star-like
      return (
        <g>
          <circle cx={0} cy={0} r={r * 0.55} fill={colors.base} opacity={0.8} />
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <ellipse
                key={angle}
                cx={Math.cos(rad) * r * 0.45}
                cy={Math.sin(rad) * r * 0.45}
                rx={r * 0.3}
                ry={r * 0.18}
                transform={`rotate(${angle}, ${Math.cos(rad) * r * 0.45}, ${Math.sin(rad) * r * 0.45})`}
                fill={colors.accent}
                opacity={0.6}
              />
            );
          })}
          <circle cx={0} cy={0} r={r * 0.2} fill={colors.stroke} opacity={0.5} />
        </g>
      );

    case 'trailing':
      // Cascading tendrils radiating outward
      return (
        <g>
          <circle cx={0} cy={0} r={r * 0.35} fill={colors.base} opacity={0.8} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            // Deterministic variation based on angle index
            const len = r * (0.6 + [0.25, 0.1, 0.3, 0.05, 0.2, 0.15, 0.28, 0.08][i]);
            return (
              <line
                key={angle}
                x1={Math.cos(rad) * r * 0.25}
                y1={Math.sin(rad) * r * 0.25}
                x2={Math.cos(rad) * len}
                y2={Math.sin(rad) * len}
                stroke={colors.base}
                strokeWidth={r * 0.12}
                strokeLinecap="round"
                opacity={0.6}
              />
            );
          })}
          <circle cx={0} cy={0} r={r} fill="none" stroke={colors.stroke} strokeWidth={0.8} opacity={0.3} strokeDasharray="2 3" />
        </g>
      );

    case 'climbing':
      // Tall vertical shape — elongated ellipse with tendrils
      return (
        <g>
          <ellipse cx={0} cy={0} rx={r * 0.4} ry={r * 0.8} fill={colors.base} opacity={0.7} />
          <ellipse cx={0} cy={0} rx={r * 0.25} ry={r * 0.6} fill={colors.accent} opacity={0.6} />
          {[-1, 1].map((dir) => (
            <path
              key={dir}
              d={`M ${dir * r * 0.3} ${-r * 0.4} Q ${dir * r * 0.7} ${-r * 0.1} ${dir * r * 0.4} ${r * 0.3}`}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={1}
              opacity={0.5}
            />
          ))}
        </g>
      );

    case 'rosette':
      // Radiating leaves from center — like lettuce/succulent
      return (
        <g>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const leafLen = r * (i % 2 === 0 ? 0.85 : 0.6);
            return (
              <ellipse
                key={angle}
                cx={Math.cos(rad) * leafLen * 0.45}
                cy={Math.sin(rad) * leafLen * 0.45}
                rx={leafLen * 0.5}
                ry={r * 0.15}
                transform={`rotate(${angle}, ${Math.cos(rad) * leafLen * 0.45}, ${Math.sin(rad) * leafLen * 0.45})`}
                fill={i % 2 === 0 ? colors.base : colors.accent}
                opacity={0.65}
                stroke={colors.stroke}
                strokeWidth={0.5}
              />
            );
          })}
          <circle cx={0} cy={0} r={r * 0.15} fill={colors.accent} opacity={0.9} />
        </g>
      );

    case 'spreading':
    default:
      // Ground cover — organic blob with soft edges
      return (
        <g>
          <defs>
            <radialGradient id={id}>
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.8} />
              <stop offset="70%" stopColor={colors.base} stopOpacity={0.6} />
              <stop offset="100%" stopColor={colors.base} stopOpacity={0.15} />
            </radialGradient>
          </defs>
          <circle cx={0} cy={0} r={r} fill={`url(#${id})`} />
          <circle cx={r * 0.15} cy={-r * 0.1} r={r * 0.45} fill={colors.accent} opacity={0.4} />
          <circle cx={-r * 0.2} cy={r * 0.15} r={r * 0.35} fill={colors.base} opacity={0.3} />
          <circle cx={0} cy={0} r={r} fill="none" stroke={colors.stroke} strokeWidth={0.8} opacity={0.3} strokeDasharray="4 2" />
        </g>
      );
  }
}

export function PlanViewIllustration({ cells, plantMap, cellSize, cellSizeM }: Props) {
  const placements = useMemo(() => {
    const result: PlantPlacement[] = [];
    const rows = cells.length;
    const cols = cells[0]?.length ?? 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];
        if (!cell.plantSlug) continue;
        const plant = plantMap.get(cell.plantSlug);
        if (!plant) continue;

        result.push({
          row: r,
          col: c,
          plant,
          cx: (c + 0.5) * cellSize,
          cy: (r + 0.5) * cellSize,
          radiusPx: plantRadius(plant.spacingCm, cellSize, cellSizeM),
        });
      }
    }
    return result;
  }, [cells, plantMap, cellSize, cellSizeM]);

  const totalRows = cells.length;
  const totalCols = cells[0]?.length ?? 0;

  if (placements.length === 0) return null;

  return (
    <svg
      width={totalCols * cellSize}
      height={totalRows * cellSize}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Render plants sorted by size (largest first) so small plants sit on top */}
      {[...placements]
        .sort((a, b) => b.radiusPx - a.radiusPx)
        .map((p, i) => {
          const colors = CATEGORY_FILL[p.plant.category] ?? CATEGORY_FILL.vegetable;
          const showLabel = cellSize >= 18;

          return (
            <g key={`${p.row}-${p.col}-${i}`} transform={`translate(${p.cx}, ${p.cy})`}>
              {/* Botanical shape */}
              <HabitShape
                habit={p.plant.growthHabit}
                r={p.radiusPx}
                colors={colors}
                uid={`${p.row}-${p.col}`}
              />

              {/* Plant label — only when zoomed enough */}
              {showLabel && (
                <>
                  {/* Background pill */}
                  <rect
                    x={-p.plant.commonName.length * 2.2}
                    y={p.radiusPx + 2}
                    width={p.plant.commonName.length * 4.4}
                    height={10}
                    rx={3}
                    fill="white"
                    fillOpacity={0.85}
                    stroke={colors.stroke}
                    strokeWidth={0.5}
                  />
                  <text
                    x={0}
                    y={p.radiusPx + 10}
                    textAnchor="middle"
                    fontSize={8}
                    fontFamily="system-ui, sans-serif"
                    fontWeight={600}
                    fill={colors.stroke}
                  >
                    {p.plant.commonName}
                  </text>
                </>
              )}
            </g>
          );
        })}

      {/* Legend — bottom-right corner */}
      <g transform={`translate(${totalCols * cellSize - 110}, ${totalRows * cellSize - 80})`}>
        <rect x={0} y={0} width={105} height={75} rx={6} fill="white" fillOpacity={0.9} stroke="#888" strokeWidth={0.5} />
        <text x={8} y={13} fontSize={8} fontWeight={700} fill="#333">Plant Categories</text>
        {(Object.keys(CATEGORY_FILL) as PlantCategory[]).map((cat, i) => (
          <g key={cat} transform={`translate(8, ${20 + i * 9})`}>
            <circle cx={4} cy={-2} r={3} fill={CATEGORY_FILL[cat].base} stroke={CATEGORY_FILL[cat].stroke} strokeWidth={0.5} />
            <text x={12} y={1} fontSize={7} fill="#555" style={{ textTransform: 'capitalize' }}>{cat}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
