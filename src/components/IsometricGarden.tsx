/**
 * Isometric Garden View — 2.5D perspective rendering
 *
 * Renders the garden grid as an isometric (cabinet projection) SVG with:
 * - Ground tiles colored by cell type
 * - Structures (shed, conservatory) as 3D boxes
 * - Trees as cones with trunks
 * - Plants as scaled organic shapes at approximate mature heights
 * - Fences around the perimeter
 * - House wall along row 0
 *
 * Uses painter's algorithm (back-to-front sort by row+col) for correct
 * occlusion without a z-buffer.
 */

import { useMemo, type JSX } from 'react';
import type { GardenCell, GardenConfig, CellType } from '../types/planner';
import type { Plant, GrowthHabit, PlantCategory } from '../types/plant';

// ── Isometric projection constants ──
const TILE_W = 36;           // Horizontal tile width
const TILE_H = TILE_W / 2;   // Vertical tile height (2:1 ratio)
const Z_SCALE = 16;          // Pixels per meter of height

// ── Cell type colors (top face, left face, right face) ──
const CELL_PALETTE: Record<CellType, { top: string; left: string; right: string; height: number }> = {
  empty:          { top: '#e8e0d0', left: '#d4cdc0', right: '#c8c0b0', height: 0 },
  lawn:           { top: '#7db88a', left: '#6a9e76', right: '#5a8a66', height: 0 },
  'veg-patch':    { top: '#8a7262', left: '#7a6252', right: '#6a5242', height: 0.05 },
  'flower-bed':   { top: '#c48090', left: '#b07080', right: '#a06070', height: 0.05 },
  greenstalk:     { top: '#2a9d8f', left: '#22877a', right: '#1a7066', height: 0 },
  conservatory:   { top: '#a8dcd4', left: '#7ec8c0', right: '#60b0a8', height: 2.8 },
  patio:          { top: '#b8b0a4', left: '#a8a094', right: '#989084', height: 0 },
  path:           { top: '#cec4b8', left: '#beb4a8', right: '#aea498', height: 0 },
  tree:           { top: '#3a7d45', left: '#2a6d35', right: '#1a5d25', height: 0 }, // handled specially
  shed:           { top: '#8b6c5b', left: '#6b4c3b', right: '#5b3c2b', height: 2.2 },
  'raised-bed':   { top: '#9e8474', left: '#8e7464', right: '#7e6454', height: 0.4 },
  'water-feature':{ top: '#6aafe0', left: '#5a9fd0', right: '#4a8fc0', height: 0.1 },
  compost:        { top: '#5a4035', left: '#4a3025', right: '#3a2015', height: 0.6 },
};

// ── Plant height estimation (no explicit height field in Plant type) ──
const HABIT_HEIGHT: Record<GrowthHabit, number> = {
  rosette:    0.3,
  trailing:   0.2,
  spreading:  0.4,
  bushy:      0.7,
  upright:    1.2,
  climbing:   1.8,
};

const CATEGORY_HEIGHT_MULT: Record<PlantCategory, number> = {
  vegetable: 1.0,
  herb:      0.7,
  fruit:     1.4,
  flower:    0.9,
  legume:    1.3,
  fern:      0.6,
};

function estimatePlantHeight(plant: Plant): number {
  const base = HABIT_HEIGHT[plant.growthHabit] ?? 0.5;
  const mult = CATEGORY_HEIGHT_MULT[plant.category] ?? 1.0;
  // Also use spacing as a proxy: wider spacing = bigger plant
  const spacingFactor = Math.min(plant.spacingCm / 60, 2.0);
  return base * mult * (0.5 + spacingFactor * 0.5);
}

// ── Plant category colors ──
const PLANT_COLORS: Record<PlantCategory, { fill: string; stroke: string }> = {
  vegetable: { fill: '#6aa84f', stroke: '#38761d' },
  herb:      { fill: '#8fbc8f', stroke: '#5a8a5a' },
  fruit:     { fill: '#cc4125', stroke: '#990000' },
  flower:    { fill: '#d5a6bd', stroke: '#a64d79' },
  legume:    { fill: '#b6d7a8', stroke: '#6aa84f' },
  fern:      { fill: '#45818e', stroke: '#134f5c' },
};

// ── Isometric projection ──
function toIso(col: number, row: number, z: number = 0): { x: number; y: number } {
  return {
    x: (col - row) * TILE_W / 2,
    y: (col + row) * TILE_H / 2 - z * Z_SCALE,
  };
}

// ── SVG polygon helpers ──
function tileTopFace(col: number, row: number, z: number): string {
  const n = toIso(col, row, z);
  const e = toIso(col + 1, row, z);
  const s = toIso(col + 1, row + 1, z);
  const w = toIso(col, row + 1, z);
  return `${n.x},${n.y} ${e.x},${e.y} ${s.x},${s.y} ${w.x},${w.y}`;
}

function tileLeftFace(col: number, row: number, zBottom: number, zTop: number): string {
  const topFront = toIso(col, row + 1, zTop);
  const topBack = toIso(col, row, zTop);
  const botBack = toIso(col, row, zBottom);
  const botFront = toIso(col, row + 1, zBottom);
  return `${topFront.x},${topFront.y} ${topBack.x},${topBack.y} ${botBack.x},${botBack.y} ${botFront.x},${botFront.y}`;
}

function tileRightFace(col: number, row: number, zBottom: number, zTop: number): string {
  const topFront = toIso(col + 1, row + 1, zTop);
  const topRight = toIso(col + 1, row, zTop);
  const botRight = toIso(col + 1, row, zBottom);
  const botFront = toIso(col + 1, row + 1, zBottom);
  return `${topFront.x},${topFront.y} ${topRight.x},${topRight.y} ${botRight.x},${botRight.y} ${botFront.x},${botFront.y}`;
}

// ── Render elements ──

interface RenderElement {
  key: string;
  sortKey: number; // row + col (painter's algorithm)
  zOrder: number;
  render: () => JSX.Element;
}

function renderGroundTile(col: number, row: number, cellType: CellType): RenderElement {
  const palette = CELL_PALETTE[cellType];
  const z = palette.height;

  return {
    key: `tile-${row}-${col}`,
    sortKey: row + col,
    zOrder: 0,
    render: () => (
      <g key={`tile-${row}-${col}`}>
        {/* Ground-level tile always rendered */}
        <polygon points={tileTopFace(col, row, 0)} fill={palette.top} stroke="#00000010" strokeWidth={0.5} />

        {/* If elevated (raised bed, structures), render box */}
        {z > 0.1 && (
          <>
            <polygon points={tileLeftFace(col, row, 0, z)} fill={palette.left} stroke="#00000010" strokeWidth={0.5} />
            <polygon points={tileRightFace(col, row, 0, z)} fill={palette.right} stroke="#00000010" strokeWidth={0.5} />
            <polygon points={tileTopFace(col, row, z)} fill={palette.top} stroke="#00000010" strokeWidth={0.5} />
          </>
        )}
      </g>
    ),
  };
}

function renderTree(col: number, row: number): RenderElement {
  const baseZ = 0;
  const trunkH = 1.5;
  const canopyH = 3.5;
  const center = toIso(col + 0.5, row + 0.5, 0);
  const canopyCenter = toIso(col + 0.5, row + 0.5, trunkH);
  const canopyTop = toIso(col + 0.5, row + 0.5, canopyH);

  return {
    key: `tree-${row}-${col}`,
    sortKey: row + col,
    zOrder: 2,
    render: () => (
      <g key={`tree-${row}-${col}`}>
        {/* Ground */}
        <polygon points={tileTopFace(col, row, 0)} fill="#3a7d45" stroke="#00000010" strokeWidth={0.5} />
        {/* Trunk */}
        <line
          x1={center.x} y1={center.y}
          x2={canopyCenter.x} y2={canopyCenter.y}
          stroke="#5a3a20" strokeWidth={3} strokeLinecap="round"
        />
        {/* Canopy — layered ellipses for fullness */}
        <ellipse
          cx={canopyCenter.x} cy={canopyCenter.y}
          rx={TILE_W * 0.6} ry={TILE_H * 0.7}
          fill="#2d6a35" opacity={0.7}
        />
        <ellipse
          cx={canopyCenter.x} cy={canopyCenter.y - 6}
          rx={TILE_W * 0.5} ry={TILE_H * 0.55}
          fill="#3a8045" opacity={0.8}
        />
        <ellipse
          cx={canopyTop.x} cy={canopyTop.y + 4}
          rx={TILE_W * 0.3} ry={TILE_H * 0.35}
          fill="#4a9055" opacity={0.7}
        />
        {/* Shadow on ground */}
        <ellipse
          cx={center.x + 4} cy={center.y + 2}
          rx={TILE_W * 0.4} ry={TILE_H * 0.3}
          fill="#000" opacity={0.08}
        />
      </g>
    ),
  };
}

function renderPlant(col: number, row: number, plant: Plant): RenderElement {
  const heightM = estimatePlantHeight(plant);
  const colors = PLANT_COLORS[plant.category] ?? PLANT_COLORS.vegetable;
  const center = toIso(col + 0.5, row + 0.5, 0);
  const top = toIso(col + 0.5, row + 0.5, heightM);
  const spreadPx = Math.min((plant.spacingCm / 100 / 0.5) * TILE_W * 0.4, TILE_W * 0.7);

  return {
    key: `plant-${row}-${col}`,
    sortKey: row + col,
    zOrder: 1,
    render: () => {
      const habit = plant.growthHabit;

      return (
        <g key={`plant-${row}-${col}`}>
          {/* Shadow on ground */}
          <ellipse
            cx={center.x + 2} cy={center.y + 1}
            rx={spreadPx * 0.5} ry={spreadPx * 0.25}
            fill="#000" opacity={0.06}
          />

          {habit === 'upright' || habit === 'climbing' ? (
            <>
              {/* Vertical stem */}
              <line
                x1={center.x} y1={center.y}
                x2={top.x} y2={top.y}
                stroke={colors.stroke} strokeWidth={2} strokeLinecap="round"
              />
              {/* Foliage clusters along stem */}
              {[0.3, 0.5, 0.7, 0.9].map((frac) => {
                const p = toIso(col + 0.5, row + 0.5, heightM * frac);
                const sz = spreadPx * (0.3 + frac * 0.3);
                return (
                  <ellipse
                    key={frac}
                    cx={p.x} cy={p.y}
                    rx={sz} ry={sz * 0.5}
                    fill={colors.fill}
                    opacity={0.6 + frac * 0.2}
                    stroke={colors.stroke}
                    strokeWidth={0.5}
                  />
                );
              })}
            </>
          ) : habit === 'rosette' ? (
            <>
              {/* Low rosette — flat ellipse on ground */}
              <ellipse
                cx={center.x} cy={center.y - heightM * Z_SCALE * 0.3}
                rx={spreadPx * 0.55} ry={spreadPx * 0.3}
                fill={colors.fill} opacity={0.8}
                stroke={colors.stroke} strokeWidth={0.5}
              />
              <ellipse
                cx={center.x} cy={center.y - heightM * Z_SCALE * 0.5}
                rx={spreadPx * 0.35} ry={spreadPx * 0.2}
                fill={colors.fill} opacity={0.6}
                filter="brightness(1.15)"
              />
            </>
          ) : habit === 'trailing' ? (
            <>
              {/* Low mound with trailing edges */}
              <ellipse
                cx={center.x} cy={center.y - heightM * Z_SCALE * 0.3}
                rx={spreadPx * 0.6} ry={spreadPx * 0.35}
                fill={colors.fill} opacity={0.7}
                stroke={colors.stroke} strokeWidth={0.5}
              />
              {/* Trailing tendrils */}
              {[-1, 0, 1].map((d) => (
                <path
                  key={d}
                  d={`M ${center.x + d * spreadPx * 0.2} ${center.y - heightM * Z_SCALE * 0.2}
                      Q ${center.x + d * spreadPx * 0.5} ${center.y + 2}
                        ${center.x + d * spreadPx * 0.6} ${center.y + 4}`}
                  fill="none" stroke={colors.fill} strokeWidth={2} opacity={0.5}
                  strokeLinecap="round"
                />
              ))}
            </>
          ) : (
            <>
              {/* Bushy / spreading — stacked ellipses */}
              <ellipse
                cx={center.x} cy={center.y}
                rx={spreadPx * 0.5} ry={spreadPx * 0.28}
                fill={colors.fill} opacity={0.5}
                stroke={colors.stroke} strokeWidth={0.3}
              />
              <ellipse
                cx={center.x} cy={center.y - heightM * Z_SCALE * 0.4}
                rx={spreadPx * 0.55} ry={spreadPx * 0.3}
                fill={colors.fill} opacity={0.7}
                stroke={colors.stroke} strokeWidth={0.5}
              />
              <ellipse
                cx={center.x} cy={center.y - heightM * Z_SCALE * 0.7}
                rx={spreadPx * 0.4} ry={spreadPx * 0.22}
                fill={colors.fill} opacity={0.8}
              />
            </>
          )}

          {/* Plant label */}
          <text
            x={top.x}
            y={top.y - 4}
            textAnchor="middle"
            fontSize={7}
            fontFamily="system-ui, sans-serif"
            fontWeight={600}
            fill={colors.stroke}
          >
            {plant.emoji}
          </text>
        </g>
      );
    },
  };
}

function renderFenceSegment(
  col1: number, row1: number,
  col2: number, row2: number,
  heightM: number,
  side: 'left' | 'right' | 'back'
): RenderElement {
  const bottom1 = toIso(col1, row1, 0);
  const bottom2 = toIso(col2, row2, 0);
  const top1 = toIso(col1, row1, heightM);
  const top2 = toIso(col2, row2, heightM);

  return {
    key: `fence-${side}-${col1}-${row1}`,
    sortKey: row1 + col1 + (side === 'back' ? 0 : side === 'left' ? -0.5 : 0.5),
    zOrder: side === 'back' ? -1 : 3,
    render: () => (
      <g key={`fence-${side}-${col1}-${row1}`}>
        <polygon
          points={`${bottom1.x},${bottom1.y} ${bottom2.x},${bottom2.y} ${top2.x},${top2.y} ${top1.x},${top1.y}`}
          fill={side === 'left' ? '#b89070' : '#a88060'}
          stroke="#8a6040"
          strokeWidth={0.5}
          opacity={0.6}
        />
        {/* Fence posts */}
        <line x1={top1.x} y1={top1.y} x2={bottom1.x} y2={bottom1.y} stroke="#8a6040" strokeWidth={1.5} />
        <line x1={top2.x} y1={top2.y} x2={bottom2.x} y2={bottom2.y} stroke="#8a6040" strokeWidth={1.5} />
      </g>
    ),
  };
}

function renderHouseWall(cols: number, heightM: number): RenderElement {
  // House wall runs along row 0 (south side)
  const bl = toIso(0, 0, 0);
  const br = toIso(cols, 0, 0);
  const tl = toIso(0, 0, heightM);
  const tr = toIso(cols, 0, heightM);

  return {
    key: 'house-wall',
    sortKey: -1, // Always behind everything
    zOrder: -2,
    render: () => (
      <g key="house-wall">
        <polygon
          points={`${bl.x},${bl.y} ${br.x},${br.y} ${tr.x},${tr.y} ${tl.x},${tl.y}`}
          fill="#d4c8b8"
          stroke="#b8a898"
          strokeWidth={1}
        />
        {/* Windows */}
        {Array.from({ length: Math.floor(cols / 3) }, (_, i) => {
          const wCol = i * 3 + 1.5;
          const wBot = toIso(wCol, 0, heightM * 0.4);
          const wTop = toIso(wCol, 0, heightM * 0.7);
          const wBotR = toIso(wCol + 1, 0, heightM * 0.4);
          const wTopR = toIso(wCol + 1, 0, heightM * 0.7);
          return (
            <polygon
              key={i}
              points={`${wBot.x},${wBot.y} ${wBotR.x},${wBotR.y} ${wTopR.x},${wTopR.y} ${wTop.x},${wTop.y}`}
              fill="#a8d0e8"
              stroke="#8ab0c8"
              strokeWidth={0.5}
              opacity={0.7}
            />
          );
        })}
        {/* Roof line */}
        <line x1={tl.x} y1={tl.y} x2={tr.x} y2={tr.y} stroke="#9a8a7a" strokeWidth={2} />
      </g>
    ),
  };
}

// ── GreenStalk tower rendering ──
function renderGreenStalk(col: number, row: number): RenderElement {
  const center = toIso(col + 0.5, row + 0.5, 0);
  const towerH = 1.4; // ~1.4m tall
  const tiers = 5;

  return {
    key: `gs-${row}-${col}`,
    sortKey: row + col,
    zOrder: 2,
    render: () => (
      <g key={`gs-${row}-${col}`}>
        {/* Ground tile */}
        <polygon points={tileTopFace(col, row, 0)} fill={CELL_PALETTE.greenstalk.top} stroke="#00000010" strokeWidth={0.5} />

        {/* Tower structure */}
        {Array.from({ length: tiers }, (_, i) => {
          const tierZ = (i / tiers) * towerH;
          const p = toIso(col + 0.5, row + 0.5, tierZ);
          return (
            <g key={i}>
              {/* Tier ring */}
              <ellipse
                cx={p.x} cy={p.y}
                rx={TILE_W * 0.28} ry={TILE_H * 0.28}
                fill="#2a9d8f"
                stroke="#1a8070"
                strokeWidth={1}
                opacity={0.8}
              />
              {/* Pocket dots */}
              {[0, 60, 120, 180, 240, 300].map((angle) => {
                const rad = (angle * Math.PI) / 180;
                return (
                  <circle
                    key={angle}
                    cx={p.x + Math.cos(rad) * TILE_W * 0.2}
                    cy={p.y + Math.sin(rad) * TILE_H * 0.2}
                    r={2}
                    fill="#4ade80"
                    opacity={0.6}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Center pole */}
        <line
          x1={center.x} y1={center.y}
          x2={toIso(col + 0.5, row + 0.5, towerH).x}
          y2={toIso(col + 0.5, row + 0.5, towerH).y}
          stroke="#1a7066" strokeWidth={2}
        />

        {/* Top cap */}
        <circle
          cx={toIso(col + 0.5, row + 0.5, towerH).x}
          cy={toIso(col + 0.5, row + 0.5, towerH).y}
          r={4}
          fill="#2a9d8f"
          stroke="#1a7066"
          strokeWidth={1}
        />
      </g>
    ),
  };
}

// ── Main component ──

interface Props {
  cells: GardenCell[][];
  config: GardenConfig;
  plantMap: Map<string, Plant>;
}

export function IsometricGarden({ cells, config, plantMap }: Props) {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;

  const elements = useMemo(() => {
    const els: RenderElement[] = [];

    // House wall (behind everything)
    els.push(renderHouseWall(cols, Math.min(config.houseWallHeightM, 4)));

    // Back fence (row = rows, behind the back row)
    for (let c = 0; c < cols; c++) {
      els.push(renderFenceSegment(c, rows, c + 1, rows, config.fenceHeightM, 'back'));
    }

    // Ground tiles, structures, plants
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];

        if (cell.type === 'tree') {
          els.push(renderGroundTile(c, r, 'lawn')); // grass under tree
          els.push(renderTree(c, r));
        } else if (cell.type === 'greenstalk') {
          els.push(renderGreenStalk(c, r));
        } else {
          els.push(renderGroundTile(c, r, cell.type));
        }

        // Plants
        if (cell.plantSlug) {
          const plant = plantMap.get(cell.plantSlug);
          if (plant) {
            els.push(renderPlant(c, r, plant));
          }
        }
      }
    }

    // Left fence (col 0)
    for (let r = 0; r < rows; r++) {
      els.push(renderFenceSegment(0, r, 0, r + 1, config.fenceHeightM, 'left'));
    }

    // Right fence (col = cols)
    for (let r = 0; r < rows; r++) {
      els.push(renderFenceSegment(cols, r, cols, r + 1, config.fenceHeightM, 'right'));
    }

    // Sort by painter's algorithm: back-to-front, then by z-order
    els.sort((a, b) => {
      if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
      return a.zOrder - b.zOrder;
    });

    return els;
  }, [cells, config, plantMap, rows, cols]);

  // Calculate SVG viewport
  const topLeft = toIso(0, 0, Math.min(config.houseWallHeightM, 4));
  const topRight = toIso(cols, 0, 0);
  const bottomLeft = toIso(0, rows, 0);
  const bottomRight = toIso(cols, rows, 0);

  const minX = Math.min(topLeft.x, bottomLeft.x) - 20;
  const maxX = Math.max(topRight.x, bottomRight.x) + 20;
  const minY = Math.min(topLeft.y, topRight.y) - 40;
  const maxY = Math.max(bottomLeft.y, bottomRight.y) + 20;

  const svgWidth = maxX - minX;
  const svgHeight = maxY - minY;

  return (
    <div className="w-full overflow-auto bg-gradient-to-b from-sky-100 to-sky-50 dark:from-stone-900 dark:to-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`${minX} ${minY} ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="mx-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Sky gradient background */}
        <defs>
          <linearGradient id="iso-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f0f9ff" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Render all elements in sorted order */}
        {elements.map((el) => el.render())}

        {/* Compass indicator */}
        <g transform={`translate(${maxX - 40}, ${maxY - 30})`}>
          <circle cx={0} cy={0} r={12} fill="white" fillOpacity={0.8} stroke="#888" strokeWidth={0.5} />
          <text x={0} y={-2} textAnchor="middle" fontSize={8} fontWeight={700} fill="#444">{config.facing}</text>
          <text x={0} y={7} textAnchor="middle" fontSize={5} fill="#888">facing</text>
        </g>

        {/* Scale bar */}
        <g transform={`translate(${minX + 20}, ${maxY - 10})`}>
          <line x1={0} y1={0} x2={TILE_W * 2} y2={0} stroke="#666" strokeWidth={1} />
          <line x1={0} y1={-3} x2={0} y2={3} stroke="#666" strokeWidth={1} />
          <line x1={TILE_W * 2} y1={-3} x2={TILE_W * 2} y2={3} stroke="#666" strokeWidth={1} />
          <text x={TILE_W} y={-4} textAnchor="middle" fontSize={7} fill="#666">1m</text>
        </g>
      </svg>
    </div>
  );
}
