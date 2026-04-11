/**
 * Isometric Garden View — 2.5D perspective rendering
 *
 * Professional landscape-designer-style isometric SVG renderer with:
 * - 4-way rotation (NE/SE/SW/NW viewing angles)
 * - Depth fog / atmospheric perspective
 * - Directional shadows based on viewing angle
 * - SVG texture patterns for ground surfaces
 * - Ambient occlusion on structure edges
 * - Seasonal plant state awareness
 * - Hover tooltips on plants and structures
 * - Zoom controls
 *
 * Uses painter's algorithm with rotation-aware coordinate transforms.
 */

import { useState, useMemo, useCallback, type JSX } from 'react';
import type { GardenCell, GardenConfig, CellType } from '../types/planner';
import type { Plant, GrowthHabit, PlantCategory } from '../types/plant';
import { isInWindow } from '../lib/calendar-utils';

// ── Isometric projection constants ──
const TILE_W = 36;
const TILE_H = TILE_W / 2;
const Z_SCALE = 16;

// ── Rotation types ──
type IsoFacing = 'NE' | 'SE' | 'SW' | 'NW';

const ROTATION_LABELS: Record<IsoFacing, string> = {
  NE: 'Front-left',
  SE: 'Front-right',
  SW: 'Back-right',
  NW: 'Back-left',
};

const ROTATION_ORDER: IsoFacing[] = ['NE', 'SE', 'SW', 'NW'];

// ── Cell type colors ──
const CELL_PALETTE: Record<CellType, { top: string; left: string; right: string; height: number }> = {
  empty:          { top: '#e8e0d0', left: '#d4cdc0', right: '#c8c0b0', height: 0 },
  lawn:           { top: '#7db88a', left: '#6a9e76', right: '#5a8a66', height: 0 },
  'veg-patch':    { top: '#8a7262', left: '#7a6252', right: '#6a5242', height: 0.05 },
  'flower-bed':   { top: '#c48090', left: '#b07080', right: '#a06070', height: 0.05 },
  greenstalk:     { top: '#2a9d8f', left: '#22877a', right: '#1a7066', height: 0 },
  conservatory:   { top: '#a8dcd4', left: '#7ec8c0', right: '#60b0a8', height: 2.8 },
  patio:          { top: '#b8b0a4', left: '#a8a094', right: '#989084', height: 0 },
  path:           { top: '#cec4b8', left: '#beb4a8', right: '#aea498', height: 0 },
  tree:           { top: '#3a7d45', left: '#2a6d35', right: '#1a5d25', height: 0 },
  shed:           { top: '#8b6c5b', left: '#6b4c3b', right: '#5b3c2b', height: 2.2 },
  'raised-bed':   { top: '#9e8474', left: '#8e7464', right: '#7e6454', height: 0.4 },
  'water-feature':{ top: '#6aafe0', left: '#5a9fd0', right: '#4a8fc0', height: 0.1 },
  compost:        { top: '#5a4035', left: '#4a3025', right: '#3a2015', height: 0.6 },
};

// ── Texture pattern IDs by cell type ──
const TEXTURED_TYPES: Partial<Record<CellType, string>> = {
  lawn: 'tex-grass',
  'veg-patch': 'tex-soil',
  patio: 'tex-stone',
  path: 'tex-gravel',
  'raised-bed': 'tex-soil',
  'flower-bed': 'tex-soil',
};

// ── Plant height estimation ──
const HABIT_HEIGHT: Record<GrowthHabit, number> = {
  rosette: 0.3, trailing: 0.2, spreading: 0.4,
  bushy: 0.7, upright: 1.2, climbing: 1.8,
};

const CATEGORY_HEIGHT_MULT: Record<PlantCategory, number> = {
  vegetable: 1.0, herb: 0.7, fruit: 1.4, flower: 0.9, legume: 1.3, fern: 0.6,
};

function estimatePlantHeight(plant: Plant): number {
  const base = HABIT_HEIGHT[plant.growthHabit] ?? 0.5;
  const mult = CATEGORY_HEIGHT_MULT[plant.category] ?? 1.0;
  const spacingFactor = Math.min(plant.spacingCm / 60, 2.0);
  return base * mult * (0.5 + spacingFactor * 0.5);
}

// ── Seasonal awareness ──
function getPlantSeasonalState(plant: Plant, month: number): 'active' | 'dormant' | 'harvest' {
  const pw = plant.plantingWindow;
  if (pw.harvest && isInWindow(month, pw.harvest)) return 'harvest';
  const sowStart = pw.sowIndoors?.[0] ?? pw.sowOutdoors?.[0] ?? pw.transplant?.[0];
  const harvestEnd = pw.harvest?.[1];
  if (sowStart && harvestEnd) {
    if (sowStart <= harvestEnd) {
      if (month >= sowStart && month <= harvestEnd) return 'active';
    } else {
      if (month >= sowStart || month <= harvestEnd) return 'active';
    }
  }
  return 'dormant';
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

// ── Coordinate rotation ──
function rotateCoord(
  col: number, row: number,
  facing: IsoFacing,
  cols: number, rows: number
): { col: number; row: number } {
  switch (facing) {
    case 'NE': return { col, row };
    case 'SE': return { col: rows - 1 - row, row: col };
    case 'SW': return { col: cols - 1 - col, row: rows - 1 - row };
    case 'NW': return { col: row, row: cols - 1 - col };
  }
}

function getRotatedDims(facing: IsoFacing, cols: number, rows: number): { rCols: number; rRows: number } {
  return (facing === 'SE' || facing === 'NW')
    ? { rCols: rows, rRows: cols }
    : { rCols: cols, rRows: rows };
}

// ── Isometric projection (applied AFTER rotation) ──
function toIso(col: number, row: number, z: number = 0): { x: number; y: number } {
  return {
    x: (col - row) * TILE_W / 2,
    y: (col + row) * TILE_H / 2 - z * Z_SCALE,
  };
}

// ── Depth fog: elements further from viewer are slightly faded ──
function depthFog(sortKey: number, maxSortKey: number): number {
  const depth = sortKey / maxSortKey;
  return 1.0 - depth * 0.15; // 15% fade at the back
}

// ── Shadow offset based on facing ──
function shadowOffset(facing: IsoFacing, heightM: number): { dx: number; dy: number } {
  const dist = heightM * Z_SCALE * 0.4;
  switch (facing) {
    case 'NE': return { dx: 3, dy: dist * 0.3 };
    case 'SE': return { dx: -3, dy: dist * 0.3 };
    case 'SW': return { dx: -3, dy: -dist * 0.2 };
    case 'NW': return { dx: 3, dy: -dist * 0.2 };
  }
}

// ── SVG polygon helpers ──
function tileTopPoints(col: number, row: number, z: number): string {
  const n = toIso(col, row, z);
  const e = toIso(col + 1, row, z);
  const s = toIso(col + 1, row + 1, z);
  const w = toIso(col, row + 1, z);
  return `${n.x},${n.y} ${e.x},${e.y} ${s.x},${s.y} ${w.x},${w.y}`;
}

function tileLeftPoints(col: number, row: number, zBot: number, zTop: number): string {
  const tf = toIso(col, row + 1, zTop);
  const tb = toIso(col, row, zTop);
  const bb = toIso(col, row, zBot);
  const bf = toIso(col, row + 1, zBot);
  return `${tf.x},${tf.y} ${tb.x},${tb.y} ${bb.x},${bb.y} ${bf.x},${bf.y}`;
}

function tileRightPoints(col: number, row: number, zBot: number, zTop: number): string {
  const tf = toIso(col + 1, row + 1, zTop);
  const tr = toIso(col + 1, row, zTop);
  const br = toIso(col + 1, row, zBot);
  const bf = toIso(col + 1, row + 1, zBot);
  return `${tf.x},${tf.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bf.x},${bf.y}`;
}

// ── Render elements ──
interface RenderElement {
  key: string;
  sortKey: number;
  zOrder: number;
  render: () => JSX.Element;
}

function renderTile(
  rCol: number, rRow: number, cellType: CellType,
  maxSort: number, _facing: IsoFacing
): RenderElement {
  const palette = CELL_PALETTE[cellType];
  const z = palette.height;
  const sk = rRow + rCol;
  const fog = depthFog(sk, maxSort);
  const texId = TEXTURED_TYPES[cellType];

  return {
    key: `t-${rRow}-${rCol}`,
    sortKey: sk,
    zOrder: 0,
    render: () => (
      <g key={`t-${rRow}-${rCol}`} opacity={fog}>
        <polygon points={tileTopPoints(rCol, rRow, 0)} fill={palette.top} stroke="#00000008" strokeWidth={0.5} />
        {texId && (
          <polygon points={tileTopPoints(rCol, rRow, 0)} fill={`url(#${texId})`} />
        )}
        {z > 0.1 && (
          <>
            <polygon points={tileLeftPoints(rCol, rRow, 0, z)} fill={palette.left} stroke="#00000015" strokeWidth={0.5} />
            <polygon points={tileRightPoints(rCol, rRow, 0, z)} fill={palette.right} stroke="#00000015" strokeWidth={0.5} />
            <polygon points={tileTopPoints(rCol, rRow, z)} fill={palette.top} stroke="#00000008" strokeWidth={0.5} />
            {texId && <polygon points={tileTopPoints(rCol, rRow, z)} fill={`url(#${texId})`} />}
            {/* Ambient occlusion — dark line at base of walls */}
            <polygon points={tileTopPoints(rCol, rRow, 0)} fill="#000" opacity={0.04} />
          </>
        )}
      </g>
    ),
  };
}

function renderTreeElement(
  rCol: number, rRow: number,
  maxSort: number, facing: IsoFacing, month: number
): RenderElement {
  const center = toIso(rCol + 0.5, rRow + 0.5, 0);
  const trunkTop = toIso(rCol + 0.5, rRow + 0.5, 1.5);
  const canopyMid = toIso(rCol + 0.5, rRow + 0.5, 2.5);
  const canopyTop = toIso(rCol + 0.5, rRow + 0.5, 3.5);
  const shadow = shadowOffset(facing, 3.5);
  const fog = depthFog(rRow + rCol, maxSort);

  // Seasonal: leaf density varies by month
  const isWinter = month >= 11 || month <= 2;
  const leafOpacity = isWinter ? 0.35 : 0.75;
  const leafColor1 = isWinter ? '#5a6a50' : '#2d6a35';
  const leafColor2 = isWinter ? '#6a7a60' : '#3a8045';
  const leafColor3 = isWinter ? '#7a8a70' : '#4a9055';

  return {
    key: `tree-${rRow}-${rCol}`,
    sortKey: rRow + rCol,
    zOrder: 2,
    render: () => (
      <g key={`tree-${rRow}-${rCol}`} opacity={fog}>
        <polygon points={tileTopPoints(rCol, rRow, 0)} fill="#3a7d45" stroke="#00000008" strokeWidth={0.5} />
        <polygon points={tileTopPoints(rCol, rRow, 0)} fill="url(#tex-grass)" />
        {/* Shadow */}
        <ellipse
          cx={center.x + shadow.dx * 1.5} cy={center.y + shadow.dy * 0.8 + 3}
          rx={TILE_W * 0.55} ry={TILE_H * 0.4}
          fill="#000" opacity={0.1}
          filter="url(#shadow-blur)"
        />
        {/* Trunk */}
        <line x1={center.x} y1={center.y} x2={trunkTop.x} y2={trunkTop.y}
          stroke="#5a3a20" strokeWidth={3} strokeLinecap="round" />
        {/* Canopy layers */}
        <ellipse cx={center.x} cy={canopyMid.y + 4} rx={TILE_W * 0.65} ry={TILE_H * 0.75}
          fill={leafColor1} opacity={leafOpacity} />
        <ellipse cx={canopyMid.x} cy={canopyMid.y} rx={TILE_W * 0.55} ry={TILE_H * 0.6}
          fill={leafColor2} opacity={leafOpacity + 0.05} />
        <ellipse cx={canopyTop.x} cy={canopyTop.y + 6} rx={TILE_W * 0.35} ry={TILE_H * 0.4}
          fill={leafColor3} opacity={leafOpacity + 0.05} />
        {/* Highlights */}
        <ellipse cx={canopyMid.x - 3} cy={canopyMid.y - 3} rx={TILE_W * 0.2} ry={TILE_H * 0.2}
          fill="#fff" opacity={0.08} />
      </g>
    ),
  };
}

function renderPlantElement(
  rCol: number, rRow: number, plant: Plant,
  maxSort: number, facing: IsoFacing, month: number
): RenderElement {
  const heightM = estimatePlantHeight(plant);
  const colors = PLANT_COLORS[plant.category] ?? PLANT_COLORS.vegetable;
  const center = toIso(rCol + 0.5, rRow + 0.5, 0);
  const top = toIso(rCol + 0.5, rRow + 0.5, heightM);
  const spreadPx = Math.min((plant.spacingCm / 100 / 0.5) * TILE_W * 0.4, TILE_W * 0.7);
  const shadow = shadowOffset(facing, heightM);
  const fog = depthFog(rRow + rCol, maxSort);
  const seasonal = getPlantSeasonalState(plant, month);

  // Seasonal adjustments
  const seasonOpacity = seasonal === 'dormant' ? 0.3 : seasonal === 'harvest' ? 1.0 : 0.85;
  const seasonScale = seasonal === 'dormant' ? 0.6 : 1.0;
  const harvestGlow = seasonal === 'harvest';

  return {
    key: `p-${rRow}-${rCol}`,
    sortKey: rRow + rCol,
    zOrder: 1,
    render: () => {
      const habit = plant.growthHabit;
      const adjSpread = spreadPx * seasonScale;

      return (
        <g key={`p-${rRow}-${rCol}`} opacity={fog * seasonOpacity}>
          {/* Directional shadow */}
          <ellipse
            cx={center.x + shadow.dx} cy={center.y + shadow.dy + 2}
            rx={adjSpread * 0.5} ry={adjSpread * 0.25}
            fill="#000" opacity={0.08}
            filter="url(#shadow-blur)"
          />

          {/* Harvest glow ring */}
          {harvestGlow && (
            <ellipse
              cx={center.x} cy={center.y}
              rx={adjSpread * 0.7} ry={adjSpread * 0.35}
              fill="none" stroke="#f59e0b" strokeWidth={1.5}
              opacity={0.5} strokeDasharray="3 2"
            />
          )}

          {habit === 'upright' || habit === 'climbing' ? (
            <>
              <line x1={center.x} y1={center.y} x2={top.x} y2={top.y}
                stroke={colors.stroke} strokeWidth={2} strokeLinecap="round" />
              {[0.3, 0.5, 0.7, 0.9].map((frac) => {
                const p = toIso(rCol + 0.5, rRow + 0.5, heightM * frac * seasonScale);
                const sz = adjSpread * (0.25 + frac * 0.35);
                return (
                  <ellipse key={frac} cx={p.x} cy={p.y} rx={sz} ry={sz * 0.45}
                    fill={colors.fill} opacity={0.55 + frac * 0.25}
                    stroke={colors.stroke} strokeWidth={0.4} />
                );
              })}
            </>
          ) : habit === 'rosette' ? (
            <>
              <ellipse cx={center.x} cy={center.y - heightM * Z_SCALE * 0.3 * seasonScale}
                rx={adjSpread * 0.55} ry={adjSpread * 0.3}
                fill={colors.fill} opacity={0.8} stroke={colors.stroke} strokeWidth={0.4} />
              <ellipse cx={center.x + 1} cy={center.y - heightM * Z_SCALE * 0.5 * seasonScale}
                rx={adjSpread * 0.3} ry={adjSpread * 0.17}
                fill="#fff" opacity={0.1} />
            </>
          ) : habit === 'trailing' ? (
            <>
              <ellipse cx={center.x} cy={center.y - heightM * Z_SCALE * 0.3 * seasonScale}
                rx={adjSpread * 0.6} ry={adjSpread * 0.35}
                fill={colors.fill} opacity={0.7} stroke={colors.stroke} strokeWidth={0.4} />
              {[-1, 0, 1].map((d) => (
                <path key={d}
                  d={`M ${center.x + d * adjSpread * 0.2} ${center.y - heightM * Z_SCALE * 0.2 * seasonScale}
                      Q ${center.x + d * adjSpread * 0.5} ${center.y + 2}
                        ${center.x + d * adjSpread * 0.6} ${center.y + 4}`}
                  fill="none" stroke={colors.fill} strokeWidth={2} opacity={0.5} strokeLinecap="round" />
              ))}
            </>
          ) : (
            <>
              <ellipse cx={center.x} cy={center.y} rx={adjSpread * 0.5} ry={adjSpread * 0.28}
                fill={colors.fill} opacity={0.45} stroke={colors.stroke} strokeWidth={0.3} />
              <ellipse cx={center.x} cy={center.y - heightM * Z_SCALE * 0.4 * seasonScale}
                rx={adjSpread * 0.55} ry={adjSpread * 0.3}
                fill={colors.fill} opacity={0.65} stroke={colors.stroke} strokeWidth={0.4} />
              <ellipse cx={center.x} cy={center.y - heightM * Z_SCALE * 0.7 * seasonScale}
                rx={adjSpread * 0.4} ry={adjSpread * 0.22}
                fill={colors.fill} opacity={0.8} />
              {/* Highlight */}
              <ellipse cx={center.x - 2} cy={center.y - heightM * Z_SCALE * 0.6 * seasonScale}
                rx={adjSpread * 0.15} ry={adjSpread * 0.08}
                fill="#fff" opacity={0.12} />
            </>
          )}

          {/* Plant emoji label */}
          <text x={top.x} y={top.y - 4} textAnchor="middle" fontSize={7}
            fontFamily="system-ui, sans-serif" fontWeight={600} fill={colors.stroke}>
            {plant.emoji}
          </text>
        </g>
      );
    },
  };
}

function renderGreenStalkElement(
  rCol: number, rRow: number,
  maxSort: number, facing: IsoFacing
): RenderElement {
  const center = toIso(rCol + 0.5, rRow + 0.5, 0);
  const towerH = 1.4;
  const tiers = 5;
  const fog = depthFog(rRow + rCol, maxSort);
  const shadow = shadowOffset(facing, towerH);

  return {
    key: `gs-${rRow}-${rCol}`,
    sortKey: rRow + rCol,
    zOrder: 2,
    render: () => (
      <g key={`gs-${rRow}-${rCol}`} opacity={fog}>
        <polygon points={tileTopPoints(rCol, rRow, 0)} fill={CELL_PALETTE.greenstalk.top} stroke="#00000008" strokeWidth={0.5} />
        {/* Shadow */}
        <ellipse cx={center.x + shadow.dx} cy={center.y + shadow.dy + 2}
          rx={TILE_W * 0.25} ry={TILE_H * 0.2}
          fill="#000" opacity={0.08} filter="url(#shadow-blur)" />
        {/* Center pole */}
        <line x1={center.x} y1={center.y}
          x2={toIso(rCol + 0.5, rRow + 0.5, towerH).x}
          y2={toIso(rCol + 0.5, rRow + 0.5, towerH).y}
          stroke="#1a7066" strokeWidth={2} />
        {/* Tiers */}
        {Array.from({ length: tiers }, (_, i) => {
          const tierZ = (i / tiers) * towerH;
          const p = toIso(rCol + 0.5, rRow + 0.5, tierZ);
          return (
            <g key={i}>
              <ellipse cx={p.x} cy={p.y} rx={TILE_W * 0.28} ry={TILE_H * 0.28}
                fill="#2a9d8f" stroke="#1a8070" strokeWidth={1} opacity={0.8} />
              {[0, 120, 240].map((angle) => {
                const rad = (angle * Math.PI) / 180;
                return (
                  <circle key={angle}
                    cx={p.x + Math.cos(rad) * TILE_W * 0.18}
                    cy={p.y + Math.sin(rad) * TILE_H * 0.18}
                    r={2.5} fill="#4ade80" opacity={0.7} />
                );
              })}
            </g>
          );
        })}
        {/* Top cap */}
        <circle cx={toIso(rCol + 0.5, rRow + 0.5, towerH).x}
          cy={toIso(rCol + 0.5, rRow + 0.5, towerH).y}
          r={4} fill="#2a9d8f" stroke="#1a7066" strokeWidth={1} />
      </g>
    ),
  };
}

function renderFence(
  col1: number, row1: number, col2: number, row2: number,
  heightM: number, side: 'left' | 'right' | 'back'
): RenderElement {
  const b1 = toIso(col1, row1, 0);
  const b2 = toIso(col2, row2, 0);
  const t1 = toIso(col1, row1, heightM);
  const t2 = toIso(col2, row2, heightM);
  const fillColor = side === 'left' ? '#b89070' : side === 'right' ? '#a88060' : '#c0a080';

  return {
    key: `f-${side}-${col1}-${row1}`,
    sortKey: row1 + col1 + (side === 'back' ? -0.5 : side === 'left' ? -0.3 : 0.3),
    zOrder: side === 'back' ? -1 : 3,
    render: () => (
      <g key={`f-${side}-${col1}-${row1}`}>
        <polygon
          points={`${b1.x},${b1.y} ${b2.x},${b2.y} ${t2.x},${t2.y} ${t1.x},${t1.y}`}
          fill={fillColor} stroke="#8a604030" strokeWidth={0.5} opacity={0.55}
        />
        {/* Fence slats */}
        <line x1={t1.x} y1={t1.y} x2={b1.x} y2={b1.y} stroke="#8a6040" strokeWidth={1} opacity={0.5} />
        <line x1={t2.x} y1={t2.y} x2={b2.x} y2={b2.y} stroke="#8a6040" strokeWidth={1} opacity={0.5} />
        {/* Horizontal rail */}
        {(() => {
          const m1 = toIso(col1, row1, heightM * 0.6);
          const m2 = toIso(col2, row2, heightM * 0.6);
          return <line x1={m1.x} y1={m1.y} x2={m2.x} y2={m2.y} stroke="#8a604060" strokeWidth={0.8} />;
        })()}
      </g>
    ),
  };
}

function renderHouse(rCols: number, heightM: number): RenderElement {
  const h = Math.min(heightM, 4);
  const bl = toIso(0, 0, 0);
  const br = toIso(rCols, 0, 0);
  const tl = toIso(0, 0, h);
  const tr = toIso(rCols, 0, h);

  return {
    key: 'house',
    sortKey: -1,
    zOrder: -2,
    render: () => (
      <g key="house">
        {/* Wall */}
        <polygon points={`${bl.x},${bl.y} ${br.x},${br.y} ${tr.x},${tr.y} ${tl.x},${tl.y}`}
          fill="#d4c8b8" stroke="#b8a89830" strokeWidth={1} />
        {/* Brick texture */}
        <polygon points={`${bl.x},${bl.y} ${br.x},${br.y} ${tr.x},${tr.y} ${tl.x},${tl.y}`}
          fill="url(#tex-brick)" opacity={0.15} />
        {/* Windows */}
        {Array.from({ length: Math.floor(rCols / 3) }, (_, i) => {
          const wc = i * 3 + 1.5;
          const wb = toIso(wc, 0, h * 0.35);
          const wt = toIso(wc, 0, h * 0.65);
          const wbr = toIso(wc + 1, 0, h * 0.35);
          const wtr = toIso(wc + 1, 0, h * 0.65);
          return (
            <g key={i}>
              <polygon points={`${wb.x},${wb.y} ${wbr.x},${wbr.y} ${wtr.x},${wtr.y} ${wt.x},${wt.y}`}
                fill="#a8d0e8" stroke="#8ab0c860" strokeWidth={0.5} opacity={0.7} />
              {/* Window frame */}
              <line x1={(wb.x + wbr.x) / 2} y1={(wb.y + wbr.y) / 2}
                x2={(wt.x + wtr.x) / 2} y2={(wt.y + wtr.y) / 2}
                stroke="#8ab0c860" strokeWidth={0.5} />
            </g>
          );
        })}
        {/* Roof line */}
        <line x1={tl.x} y1={tl.y - 2} x2={tr.x} y2={tr.y - 2} stroke="#7a6a5a" strokeWidth={3} />
        <line x1={tl.x} y1={tl.y} x2={tr.x} y2={tr.y} stroke="#9a8a7a" strokeWidth={1.5} />
      </g>
    ),
  };
}

// ── Water reflection effect ──
function renderWater(rCol: number, rRow: number, maxSort: number): RenderElement {
  const center = toIso(rCol + 0.5, rRow + 0.5, 0.05);
  const fog = depthFog(rRow + rCol, maxSort);

  return {
    key: `water-${rRow}-${rCol}`,
    sortKey: rRow + rCol,
    zOrder: 0.5,
    render: () => (
      <g key={`water-${rRow}-${rCol}`} opacity={fog}>
        {/* Water surface shimmer */}
        <ellipse cx={center.x - 2} cy={center.y - 1} rx={4} ry={2}
          fill="#fff" opacity={0.2} />
        <ellipse cx={center.x + 3} cy={center.y + 1} rx={3} ry={1.5}
          fill="#fff" opacity={0.15} />
      </g>
    ),
  };
}

// ── SVG texture pattern definitions ──
function TexturePatterns() {
  return (
    <defs>
      {/* Shadow blur filter */}
      <filter id="shadow-blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
      </filter>

      {/* Grass texture */}
      <pattern id="tex-grass" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse"
        patternTransform="rotate(30)">
        <line x1="0" y1="0" x2="4" y2="8" stroke="#5a9a5a" strokeWidth={0.4} opacity={0.2} />
        <line x1="4" y1="0" x2="8" y2="8" stroke="#4a8a4a" strokeWidth={0.3} opacity={0.15} />
      </pattern>

      {/* Soil/mulch texture */}
      <pattern id="tex-soil" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.8" fill="#5a4030" opacity={0.2} />
        <circle cx="5" cy="4" r="0.6" fill="#4a3020" opacity={0.15} />
        <circle cx="1" cy="5" r="0.5" fill="#6a5040" opacity={0.1} />
      </pattern>

      {/* Stone/patio texture */}
      <pattern id="tex-stone" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="10" height="10" fill="none" stroke="#00000008" strokeWidth={0.5} />
        <line x1="5" y1="0" x2="5" y2="10" stroke="#00000006" strokeWidth={0.5} />
        <line x1="0" y1="5" x2="10" y2="5" stroke="#00000006" strokeWidth={0.5} />
      </pattern>

      {/* Gravel texture */}
      <pattern id="tex-gravel" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="0.7" fill="#a09080" opacity={0.2} />
        <circle cx="3.5" cy="3" r="0.5" fill="#908070" opacity={0.15} />
        <circle cx="2" cy="4" r="0.6" fill="#b0a090" opacity={0.1} />
      </pattern>

      {/* Brick texture for house wall */}
      <pattern id="tex-brick" x="0" y="0" width="12" height="6" patternUnits="userSpaceOnUse"
        patternTransform="skewY(-26.5)">
        <rect x="0" y="0" width="12" height="6" fill="none" stroke="#8a6a5060" strokeWidth={0.3} />
        <line x1="6" y1="0" x2="6" y2="3" stroke="#8a6a5060" strokeWidth={0.3} />
        <line x1="0" y1="3" x2="12" y2="3" stroke="#8a6a5060" strokeWidth={0.3} />
      </pattern>

      {/* Sky gradient */}
      <linearGradient id="iso-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#bfdbfe" stopOpacity={0.4} />
        <stop offset="60%" stopColor="#e0f2fe" stopOpacity={0.2} />
        <stop offset="100%" stopColor="#fef3c7" stopOpacity={0.1} />
      </linearGradient>
    </defs>
  );
}

// ── Main component ──

interface Props {
  cells: GardenCell[][];
  config: GardenConfig;
  plantMap: Map<string, Plant>;
}

export function IsometricGarden({ cells, config, plantMap }: Props) {
  const [facing, setFacing] = useState<IsoFacing>('NE');
  const [zoom, setZoom] = useState(1.0);
  const [hoveredPlant, setHoveredPlant] = useState<{ plant: Plant; x: number; y: number } | null>(null);

  const srcRows = cells.length;
  const srcCols = cells[0]?.length ?? 0;
  const currentMonth = new Date().getMonth() + 1;

  const rotateLeft = useCallback(() => {
    const idx = ROTATION_ORDER.indexOf(facing);
    setFacing(ROTATION_ORDER[(idx + 3) % 4]);
  }, [facing]);

  const rotateRight = useCallback(() => {
    const idx = ROTATION_ORDER.indexOf(facing);
    setFacing(ROTATION_ORDER[(idx + 1) % 4]);
  }, [facing]);

  const { elements, rCols, rRows } = useMemo(() => {
    const { rCols, rRows } = getRotatedDims(facing, srcCols, srcRows);
    const maxSort = rCols + rRows;
    const els: RenderElement[] = [];

    // House wall
    els.push(renderHouse(rCols, config.houseWallHeightM));

    // Back fence
    for (let c = 0; c < rCols; c++) {
      els.push(renderFence(c, rRows, c + 1, rRows, config.fenceHeightM, 'back'));
    }

    // Grid cells
    for (let r = 0; r < srcRows; r++) {
      for (let c = 0; c < srcCols; c++) {
        const cell = cells[r][c];
        const { col: rCol, row: rRow } = rotateCoord(c, r, facing, srcCols, srcRows);

        if (cell.type === 'tree') {
          els.push(renderTile(rCol, rRow, 'lawn', maxSort, facing));
          els.push(renderTreeElement(rCol, rRow, maxSort, facing, currentMonth));
        } else if (cell.type === 'greenstalk') {
          els.push(renderGreenStalkElement(rCol, rRow, maxSort, facing));
        } else if (cell.type === 'water-feature') {
          els.push(renderTile(rCol, rRow, cell.type, maxSort, facing));
          els.push(renderWater(rCol, rRow, maxSort));
        } else {
          els.push(renderTile(rCol, rRow, cell.type, maxSort, facing));
        }

        if (cell.plantSlug) {
          const plant = plantMap.get(cell.plantSlug);
          if (plant) {
            els.push(renderPlantElement(rCol, rRow, plant, maxSort, facing, currentMonth));
          }
        }
      }
    }

    // Side fences
    for (let r = 0; r < rRows; r++) {
      els.push(renderFence(0, r, 0, r + 1, config.fenceHeightM, 'left'));
      els.push(renderFence(rCols, r, rCols, r + 1, config.fenceHeightM, 'right'));
    }

    // Painter's algorithm sort
    els.sort((a, b) => a.sortKey !== b.sortKey ? a.sortKey - b.sortKey : a.zOrder - b.zOrder);

    return { elements: els, rCols, rRows };
  }, [cells, config, plantMap, facing, srcRows, srcCols, currentMonth]);

  // Viewport
  const wallH = Math.min(config.houseWallHeightM, 4);
  const tl = toIso(0, 0, wallH);
  const tr = toIso(rCols, 0, 0);
  const bl = toIso(0, rRows, 0);
  const br = toIso(rCols, rRows, 0);

  const pad = 30;
  const minX = Math.min(tl.x, bl.x) - pad;
  const maxX = Math.max(tr.x, br.x) + pad;
  const minY = Math.min(tl.y, tr.y) - pad - 20;
  const maxY = Math.max(bl.y, br.y) + pad;
  const svgW = maxX - minX;
  const svgH = maxY - minY;

  return (
    <div className="relative">
      {/* Controls */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          {/* Rotation */}
          <button onClick={rotateLeft}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 text-xs transition-colors"
            title="Rotate left">
            ↺
          </button>
          <span className="text-[9px] text-stone-400 min-w-[60px] text-center">
            {ROTATION_LABELS[facing]}
          </span>
          <button onClick={rotateRight}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 text-xs transition-colors"
            title="Rotate right">
            ↻
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom */}
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 text-xs transition-colors">
            −
          </button>
          <span className="text-[9px] text-stone-400 min-w-[30px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 text-xs transition-colors">
            +
          </button>
        </div>

        {/* Season indicator */}
        <div className="text-[9px] text-stone-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{
            backgroundColor: currentMonth >= 3 && currentMonth <= 5 ? '#86efac'
              : currentMonth >= 6 && currentMonth <= 8 ? '#4ade80'
              : currentMonth >= 9 && currentMonth <= 10 ? '#fcd34d'
              : '#93c5fd'
          }} />
          {['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentMonth]}
        </div>
      </div>

      {/* SVG canvas */}
      <div className="overflow-auto bg-gradient-to-b from-sky-50 via-sky-50/50 to-amber-50/30 dark:from-stone-900 dark:via-stone-850 dark:to-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-3"
        style={{ maxHeight: '600px' }}>
        <svg
          width={svgW * zoom}
          height={svgH * zoom}
          viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto"
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          <TexturePatterns />

          {/* Sky background gradient */}
          <rect x={minX} y={minY} width={svgW} height={svgH} fill="url(#iso-sky)" />

          {/* All elements in painter's-algorithm order */}
          {elements.map((el) => el.render())}

          {/* Compass */}
          <g transform={`translate(${maxX - 35}, ${maxY - 25})`}>
            <circle cx={0} cy={0} r={14} fill="white" fillOpacity={0.85} stroke="#aaa" strokeWidth={0.5} />
            <text x={0} y={-3} textAnchor="middle" fontSize={7} fontWeight={700} fill="#444">
              {config.facing}
            </text>
            <text x={0} y={5} textAnchor="middle" fontSize={4.5} fill="#999">facing</text>
            {/* Cardinal dot */}
            <circle cx={0} cy={-10} r={1.5} fill="#ef4444" />
          </g>

          {/* Scale bar */}
          <g transform={`translate(${minX + 15}, ${maxY - 8})`}>
            <line x1={0} y1={0} x2={TILE_W * 2} y2={0} stroke="#888" strokeWidth={1} />
            <line x1={0} y1={-3} x2={0} y2={3} stroke="#888" strokeWidth={1} />
            <line x1={TILE_W * 2} y1={-3} x2={TILE_W * 2} y2={3} stroke="#888" strokeWidth={1} />
            <text x={TILE_W} y={-5} textAnchor="middle" fontSize={7} fill="#888">1m</text>
          </g>
        </svg>
      </div>

      {/* Hover tooltip */}
      {hoveredPlant && (
        <div
          className="absolute z-10 bg-white dark:bg-stone-800 shadow-lg rounded-lg px-3 py-2 text-xs pointer-events-none border border-stone-200 dark:border-stone-700"
          style={{ left: hoveredPlant.x, top: hoveredPlant.y - 40 }}
        >
          <span className="mr-1">{hoveredPlant.plant.emoji}</span>
          <span className="font-medium text-stone-700 dark:text-stone-200">{hoveredPlant.plant.commonName}</span>
          <span className="text-stone-400 ml-2">{hoveredPlant.plant.sun.replace('-', ' ')}</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 px-1">
        <div className="flex items-center gap-1 text-[8px] text-stone-400">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Harvest ready
        </div>
        <div className="flex items-center gap-1 text-[8px] text-stone-400">
          <span className="w-2 h-2 rounded-full bg-stone-300" /> Dormant
        </div>
        {(Object.entries(PLANT_COLORS) as [PlantCategory, { fill: string }][]).map(([cat, { fill }]) => (
          <div key={cat} className="flex items-center gap-1 text-[8px] text-stone-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fill }} />
            <span style={{ textTransform: 'capitalize' }}>{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
