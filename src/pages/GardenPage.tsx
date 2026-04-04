import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useGardenStore, getSpacingWarnings, getRotationWarnings, getCurrentSeasonKey, getSeasonLabel } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { PlantDetail } from '../components/plant-palette/PlantDetail';
import { useCompanionDb } from '../data/use-companion-db';
import { useRegion } from '../data/use-region';
import { generateGardenLayouts, type GardenLayoutOption, type PlacementReason } from '../lib/garden-auto-populate';
import { createEsherGarden, generateEsherLayouts, type EsherLayoutOption } from '../lib/esher-garden-template';
import { generateLayouts as generateGSLayouts, extractTowerSlugs } from '../lib/auto-populate';
import { findBestPairing } from '../lib/cross-system-scoring';
import { checkPair } from '../lib/companion-engine';
import type { CellType, GardenFacing } from '../types/planner';
import type { Plant } from '../types/plant';
import {
  calculateSunHoursGrid,
  sunPosition,
  shadowProjection,
  sunriseSet,
  facingAngle,
  midMonthDay,
  toLocalHour,
  formatTime,
  classifySunZone,
  SUN_ZONE_COLORS,
} from '../lib/solar-engine';
import { getMonthName } from '../lib/calendar-utils';

const CELL_TOOLS: { type: CellType; label: string; color: string; emoji: string }[] = [
  { type: 'lawn', label: 'Lawn', color: '#6fa37e', emoji: '\ud83c\udf3f' },
  { type: 'veg-patch', label: 'Veg Patch', color: '#5d4037', emoji: '\ud83e\udd6c' },
  { type: 'flower-bed', label: 'Flower Bed', color: '#e91e63', emoji: '\ud83c\udf3a' },
  { type: 'raised-bed', label: 'Raised Bed', color: '#795548', emoji: '\ud83e\udea8' },
  { type: 'patio', label: 'Patio', color: '#9e9e9e', emoji: '\ud83e\uddf1' },
  { type: 'path', label: 'Path', color: '#bcaaa4', emoji: '\ud83d\udeb6' },
  { type: 'tree', label: 'Tree', color: '#2e7d32', emoji: '\ud83c\udf33' },
  { type: 'shed', label: 'Shed', color: '#4e342e', emoji: '\ud83c\udfe0' },
  { type: 'compost', label: 'Compost', color: '#3e2723', emoji: '\u267b\ufe0f' },
  { type: 'water-feature', label: 'Water', color: '#1976d2', emoji: '\ud83d\udca7' },
  { type: 'empty', label: 'Eraser', color: '#e0e0e0', emoji: '\ud83e\uddf9' },
];

const CELL_COLORS: Record<CellType, string> = {
  empty: '#e8e0d0',
  lawn: '#6fa37e',
  'veg-patch': '#8d6e63',
  'flower-bed': '#f48fb1',
  patio: '#bdbdbd',
  path: '#d7ccc8',
  tree: '#2e7d32',
  shed: '#5d4037',
  'raised-bed': '#a1887f',
  'water-feature': '#64b5f6',
  compost: '#4e342e',
};

const FACING_OPTIONS: GardenFacing[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function SoilCard() {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-2">Soil Profile</h3>
      <div className="space-y-1.5 text-xs text-amber-800 dark:text-amber-400">
        <div><span className="font-medium">Type:</span> Thames terrace gravel & alluvium over London Clay</div>
        <div><span className="font-medium">pH:</span> 6.5 - 7.2 (slightly acidic to neutral)</div>
        <div><span className="font-medium">Drainage:</span> Good upper layer, waterlogging risk on clay subsoil</div>
        <div><span className="font-medium">Topsoil:</span> ~300-500mm over gravel substrate</div>
        <div><span className="font-medium">Advice:</span> Add organic matter annually. Double-dig heavy clay areas. Raised beds recommended for root veg.</div>
      </div>
    </div>
  );
}

function SolarPanel({ month }: { month: number }) {
  const info = sunriseSet(month, midMonthDay(month));
  const localRise = toLocalHour(info.sunrise, month);
  const localSet = toLocalHour(info.sunset, month);

  return (
    <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800 p-4">
      <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-300 mb-2">
        Solar Data — {getMonthName(month)}
      </h3>
      <div className="grid grid-cols-2 gap-2 text-xs text-sky-800 dark:text-sky-400">
        <div><span className="font-medium">Sunrise:</span> {formatTime(localRise)}</div>
        <div><span className="font-medium">Sunset:</span> {formatTime(localSet)}</div>
        <div><span className="font-medium">Daylight:</span> {info.daylight.toFixed(1)}h</div>
        <div><span className="font-medium">Max elev:</span> {info.maxElevation.toFixed(1)}</div>
      </div>
    </div>
  );
}

function ZoneGuide() {
  return (
    <div className="bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
      <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-2">Planting Zones</h3>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ background: SUN_ZONE_COLORS['full-sun'] }} />
          <span className="text-stone-700 dark:text-stone-300"><span className="font-medium">Full sun (6h+):</span> Tomatoes, peppers, courgettes, beans, fruit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ background: SUN_ZONE_COLORS['partial-sun'] }} />
          <span className="text-stone-700 dark:text-stone-300"><span className="font-medium">Partial (3-6h):</span> Lettuce, peas, beetroot, herbs, soft fruit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ background: SUN_ZONE_COLORS['light-shade'] }} />
          <span className="text-stone-700 dark:text-stone-300"><span className="font-medium">Light shade (1-3h):</span> Spinach, chard, rocket, rhubarb</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ background: SUN_ZONE_COLORS['deep-shade'] }} />
          <span className="text-stone-700 dark:text-stone-300"><span className="font-medium">Deep shade (&lt;1h):</span> Ferns, hostas, wild garlic</span>
        </div>
      </div>
    </div>
  );
}

export function GardenPage() {
  const {
    garden, activeTool, selectedMonth, selectedHour,
    showSunOverlay, showShadowOverlay, showCompanionOverlay,
    showSpacingWarnings, showRotationWarnings, rotationHistory,
    setTool, paintCell, updateConfig, renameGarden,
    setSunHours, setSelectedMonth, setSelectedHour,
    toggleSunOverlay, toggleShadowOverlay, toggleCompanionOverlay,
    toggleSpacingWarnings, toggleRotationWarnings, saveSeasonSnapshot,
    loadTemplate, resetGarden, clearPaint,
  } = useGardenStore();

  const region = useRegion();
  const { plants, plantMap } = usePlantDb(region);
  const { companionMap } = useCompanionDb();
  const [isPainting, setIsPainting] = useState(false);
  const [plantToPlace, setPlantToPlace] = useState<Plant | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showPlantPanel, setShowPlantPanel] = useState(false);
  const [showAutoPopulate, setShowAutoPopulate] = useState(false);
  const [showEsherLayouts, setShowEsherLayouts] = useState(false);
  const [esherLayouts, setEsherLayouts] = useState<EsherLayoutOption[]>([]);
  const [raisedBedMode, setRaisedBedMode] = useState<Record<string, 'keep' | 'replant'>>({});
  const [showSaveSeasonConfirm, setShowSaveSeasonConfirm] = useState(false);
  const [gardenLayouts, setGardenLayouts] = useState<GardenLayoutOption[]>([]);
  const [gardenPlan, setGardenPlan] = useState<PlacementReason[] | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const { config, cells } = garden;
  const cols = cells[0]?.length ?? 0;
  const rows = cells.length;

  // Recalculate sun hours when month or config changes
  useEffect(() => {
    const grid = calculateSunHoursGrid(
      cols, rows, config.cellSizeM,
      config.facing, config.houseWallHeightM, config.fenceHeightM,
      selectedMonth, midMonthDay(selectedMonth),
      config.latitude, config.longitude
    );
    setSunHours(grid);
  }, [selectedMonth, config, cols, rows, setSunHours]);

  const handleCellInteraction = useCallback(
    (row: number, col: number) => {
      if (plantToPlace) {
        const cell = cells[row]?.[col];
        if (cell && (cell.type === 'veg-patch' || cell.type === 'raised-bed' || cell.type === 'flower-bed')) {
          useGardenStore.getState().plantInCell(row, col, plantToPlace.slug);
        }
      } else {
        paintCell(row, col);
      }
    },
    [plantToPlace, cells, paintCell]
  );

  const cellSize = useMemo(() => {
    const maxWidth = 800;
    return Math.min(Math.floor(maxWidth / cols), 28);
  }, [cols]);

  // Real-time shadow grid for the selected hour
  const shadowGrid = useMemo(() => {
    if (!showShadowOverlay) return null;
    const day = midMonthDay(selectedMonth);
    const pos = sunPosition(selectedMonth, day, selectedHour, config.latitude, config.longitude);
    if (pos.elevation <= 0) {
      // Sun below horizon — everything in shadow
      return Array.from({ length: rows }, () => new Array(cols).fill(true));
    }
    const gardenAngle = facingAngle(config.facing);
    const houseShadow = shadowProjection(config.houseWallHeightM, pos.elevation, pos.azimuth);
    const fenceShadow = shadowProjection(config.fenceHeightM, pos.elevation, pos.azimuth);
    const gardenWidthM = cols * config.cellSizeM;

    const grid: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = (col + 0.5) * config.cellSizeM;
        const cy = (row + 0.5) * config.cellSizeM;
        let inShadow = false;

        if (houseShadow) {
          const relAz = ((pos.azimuth - gardenAngle + 360) % 360);
          const reachY = houseShadow.length * Math.cos((relAz - 180) * (Math.PI / 180));
          if (reachY > 0 && cy < reachY) inShadow = true;
        }
        if (fenceShadow && !inShadow) {
          const relAz = ((pos.azimuth - gardenAngle + 360) % 360);
          const leftReach = fenceShadow.length * Math.sin((relAz - 90) * (Math.PI / 180));
          if (leftReach > 0 && cx < leftReach) inShadow = true;
          const rightReach = fenceShadow.length * Math.sin((relAz + 90) * (Math.PI / 180));
          if (rightReach > 0 && (gardenWidthM - cx) < rightReach) inShadow = true;
        }
        grid[row][col] = inShadow;
      }
    }
    return grid;
  }, [showShadowOverlay, selectedMonth, selectedHour, config, rows, cols]);

  // Sun position for the arrow indicator
  const currentSunPos = useMemo(() => {
    if (!showShadowOverlay) return null;
    return sunPosition(selectedMonth, midMonthDay(selectedMonth), selectedHour, config.latitude, config.longitude);
  }, [showShadowOverlay, selectedMonth, selectedHour, config.latitude, config.longitude]);

  // Companion planting indicators per cell
  // Two modes: placement mode (highlighting friends/foes of plantToPlace)
  // and static mode (checking neighbours of already-placed plants)
  const companionGrid = useMemo(() => {
    if (!showCompanionOverlay) return null;

    const grid: { hasFriend: boolean; hasFoe: boolean }[][] = Array.from(
      { length: rows },
      () => Array.from({ length: cols }, () => ({ hasFriend: false, hasFoe: false }))
    );

    const RANGE = 2; // Check within 2 cells

    if (plantToPlace) {
      // Placement mode: for each cell that already has a plant,
      // check if it's a friend or foe of the plant being placed
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const slug = cells[r][c].plantSlug;
          if (!slug) continue;
          const edge = checkPair(plantToPlace.slug, slug, companionMap);
          if (!edge) continue;
          if (edge.relationship === 'friend') {
            grid[r][c].hasFriend = true;
          } else if (edge.relationship === 'foe') {
            grid[r][c].hasFoe = true;
          }
        }
      }
    } else {
      // Static mode: for each planted cell, check neighbours within RANGE
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const slug = cells[r][c].plantSlug;
          if (!slug) continue;
          for (let dr = -RANGE; dr <= RANGE; dr++) {
            for (let dc = -RANGE; dc <= RANGE; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
              const neighbourSlug = cells[nr][nc].plantSlug;
              if (!neighbourSlug || neighbourSlug === slug) continue;
              const edge = checkPair(slug, neighbourSlug, companionMap);
              if (!edge) continue;
              if (edge.relationship === 'friend') {
                grid[r][c].hasFriend = true;
              } else if (edge.relationship === 'foe') {
                grid[r][c].hasFoe = true;
              }
            }
          }
        }
      }
    }

    return grid;
  }, [showCompanionOverlay, plantToPlace, cells, rows, cols, companionMap]);

  // Veg-suitable plants for the plant panel — sorted alphabetically
  const inGroundPlants = useMemo(
    () => [...plants].sort((a, b) => a.commonName.localeCompare(b.commonName)),
    [plants]
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar: tools + config */}
      <div className="w-64 border-r border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 flex-shrink-0 overflow-y-auto p-3 space-y-4">
        {/* Garden name */}
        <div>
          <input
            className="text-sm font-semibold text-stone-800 dark:text-stone-100 bg-transparent border-none outline-none w-full focus:underline decoration-stone-300"
            value={garden.name}
            onChange={(e) => renameGarden(e.target.value)}
          />
          <div className="text-[10px] text-stone-400">
            {config.widthM}m x {config.depthM}m | Facing {config.facing} | {cols}x{rows} grid
          </div>
        </div>

        {/* Paint tools */}
        <div>
          <h3 className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Paint Tools</h3>
          <div className="grid grid-cols-2 gap-1">
            {CELL_TOOLS.map((tool) => (
              <button
                key={tool.type}
                onClick={() => { setTool(tool.type); setPlantToPlace(null); }}
                className={`text-[10px] px-2 py-1.5 rounded-lg text-left flex items-center gap-1.5 transition-colors ${
                  activeTool === tool.type && !plantToPlace
                    ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                    : 'bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-600'
                }`}
              >
                <span>{tool.emoji}</span>
                {tool.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plant placement */}
        <div>
          <h3 className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Place Plants</h3>
          <button
            onClick={() => setShowPlantPanel(!showPlantPanel)}
            className="text-xs w-full px-2 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          >
            {plantToPlace
              ? `Placing: ${plantToPlace.emoji} ${plantToPlace.commonName}`
              : 'Select a plant to place...'}
          </button>
          {plantToPlace && (
            <button
              onClick={() => setPlantToPlace(null)}
              className="text-[10px] text-stone-400 hover:text-stone-600 mt-1"
            >
              Cancel placement
            </button>
          )}
          {showPlantPanel && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1 bg-white dark:bg-stone-700 rounded-lg border border-stone-200 dark:border-stone-600 p-1.5">
              {inGroundPlants.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => { setPlantToPlace(p); setShowPlantPanel(false); }}
                  className={`w-full text-left text-[11px] px-2 py-1 rounded flex items-center gap-1.5 hover:bg-emerald-50 ${
                    plantToPlace?.slug === p.slug ? 'bg-emerald-100' : ''
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span className="truncate">{p.commonName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Garden config */}
        <div>
          <h3 className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Garden Config</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-stone-500">
                Width (m)
                <input
                  type="number"
                  value={config.widthM}
                  onChange={(e) => updateConfig({ widthM: Number(e.target.value) || 1 })}
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-stone-200 dark:border-stone-600 rounded bg-white dark:bg-stone-700 dark:text-stone-200"
                  min={2} max={50} step={0.5}
                />
              </label>
              <label className="text-[10px] text-stone-500">
                Depth (m)
                <input
                  type="number"
                  value={config.depthM}
                  onChange={(e) => updateConfig({ depthM: Number(e.target.value) || 1 })}
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-stone-200 dark:border-stone-600 rounded bg-white dark:bg-stone-700 dark:text-stone-200"
                  min={2} max={50} step={0.5}
                />
              </label>
            </div>
            <label className="text-[10px] text-stone-500 block">
              Facing
              <select
                value={config.facing}
                onChange={(e) => updateConfig({ facing: e.target.value as GardenFacing })}
                className="w-full mt-0.5 px-2 py-1 text-xs border border-stone-200 dark:border-stone-600 rounded bg-white dark:bg-stone-700 dark:text-stone-200"
              >
                {FACING_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-stone-500">
                Wall height (m)
                <input
                  type="number"
                  value={config.houseWallHeightM}
                  onChange={(e) => updateConfig({ houseWallHeightM: Number(e.target.value) || 1 })}
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-stone-200 dark:border-stone-600 rounded bg-white dark:bg-stone-700 dark:text-stone-200"
                  min={1} max={15} step={0.5}
                />
              </label>
              <label className="text-[10px] text-stone-500">
                Fence height (m)
                <input
                  type="number"
                  value={config.fenceHeightM}
                  onChange={(e) => updateConfig({ fenceHeightM: Number(e.target.value) || 0.5 })}
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-stone-200 dark:border-stone-600 rounded bg-white dark:bg-stone-700 dark:text-stone-200"
                  min={0.5} max={3} step={0.1}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Overlays */}
        <div>
          <h3 className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Overlays</h3>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showSunOverlay}
                onChange={toggleSunOverlay}
                className="rounded border-stone-300"
              />
              Sun hours heatmap
            </label>
            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showShadowOverlay}
                onChange={toggleShadowOverlay}
                className="rounded border-stone-300"
              />
              Real-time shadow
            </label>
            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompanionOverlay}
                onChange={toggleCompanionOverlay}
                className="rounded border-stone-300"
              />
              Companion planting
            </label>
            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showSpacingWarnings}
                onChange={toggleSpacingWarnings}
                className="rounded border-stone-300 accent-orange-500"
              />
              Spacing warnings
            </label>
            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showRotationWarnings}
                onChange={toggleRotationWarnings}
                className="rounded border-stone-300 accent-violet-500"
              />
              Crop rotation warnings
            </label>
          </div>
          <label className="text-[10px] text-stone-500 block mt-2">
            Month
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full mt-0.5 px-2 py-1 text-xs border border-stone-200 dark:border-stone-600 rounded bg-white dark:bg-stone-700 dark:text-stone-200"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{getMonthName(m)}</option>
              ))}
            </select>
          </label>
          {showShadowOverlay && (
            <label className="text-[10px] text-stone-500 block mt-2">
              Time of day
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="range"
                  min={5}
                  max={21}
                  step={0.5}
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-xs font-medium text-stone-700 dark:text-stone-300 min-w-[40px] text-right">
                  {formatTime(selectedHour)}
                </span>
              </div>
              {currentSunPos && (
                <div className="text-[9px] text-stone-400 mt-1">
                  {currentSunPos.elevation > 0
                    ? `Sun: ${currentSunPos.elevation.toFixed(1)}° elev, ${currentSunPos.azimuth.toFixed(0)}° az`
                    : 'Sun below horizon'}
                </div>
              )}
            </label>
          )}
        </div>

        {/* Solar + Soil panels */}
        <SolarPanel month={selectedMonth} />
        <SoilCard />
        <ZoneGuide />

        {/* Actions */}
        <div className="space-y-1.5">
          <button
            onClick={clearPaint}
            className="text-[10px] w-full px-2 py-1.5 text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-100"
          >
            Clear all paint
          </button>
          <button
            onClick={() => { if (confirm('Reset entire garden?')) resetGarden(); }}
            className="text-[10px] w-full px-2 py-1.5 text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
          >
            Reset garden
          </button>
        </div>
      </div>

      {/* Main: Garden grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100">In-Ground Garden Plotter</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSaveSeasonConfirm(true)}
                className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5"
              >
                <span>&#128197;</span> Save Season
              </button>
              <button
                onClick={() => {
                  const { config: esherConfig, cells: esherCells } = createEsherGarden();
                  loadTemplate(esherConfig, esherCells);
                  const layouts = generateEsherLayouts();
                  // Compute cross-system pairings with GreenStalk
                  const gsLayouts = generateGSLayouts(plants, companionMap, 2);
                  const gsForPairing = gsLayouts.map((g) => ({ id: g.id, name: g.name, slugs: extractTowerSlugs(g) }));
                  const enriched = layouts.map((layout) => ({
                    ...layout,
                    bestPairing: findBestPairing(
                      layout.placements.map((p) => p.plantSlug),
                      layout.id,
                      gsForPairing,
                      'greenstalk',
                      companionMap
                    ),
                  }));
                  setEsherLayouts(enriched);
                  setShowEsherLayouts(true);
                }}
                className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5"
              >
                <span>🏡</span> Load My Garden
              </button>
              <button
                onClick={() => {
                  const layouts = generateGardenLayouts(plants, cells, config, companionMap);
                  setGardenLayouts(layouts);
                  setShowAutoPopulate(true);
                }}
                className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
              >
              <span>✨</span> Auto-Populate
            </button>
            </div>
          </div>
          <p className="text-sm text-stone-400">
            {plantToPlace
              ? `Click on veg patches or flower beds to place ${plantToPlace.emoji} ${plantToPlace.commonName}`
              : `Paint your garden layout, then place plants. ${config.widthM}m x ${config.depthM}m`}
          </p>
        </div>

        {/* Direction indicator */}
        <div className="mb-2 flex items-center gap-2 text-xs text-stone-400">
          <span className="font-medium">House wall</span>
          <span className="flex-1 border-t border-dashed border-stone-300" />
          <span>Facing {config.facing}</span>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          className="inline-block border border-stone-300 rounded-lg overflow-hidden select-none"
          style={{ lineHeight: 0 }}
          onMouseLeave={() => setIsPainting(false)}
        >
          {cells.map((row, ri) => (
            <div key={ri} className="flex" style={{ height: cellSize }}>
              {row.map((cell, ci) => {
                const bg = CELL_COLORS[cell.type];
                const hasPlant = cell.plantSlug !== null;
                const plant = hasPlant ? plantMap.get(cell.plantSlug!) : null;

                // Overlay colors (transparent, layered on top)
                let sunOverlayColor: string | null = null;
                if (showSunOverlay && cell.sunHours !== null) {
                  const zone = classifySunZone(cell.sunHours);
                  sunOverlayColor = SUN_ZONE_COLORS[zone];
                }

                const isInShadow = showShadowOverlay && shadowGrid?.[ri]?.[ci];

                // Spacing and rotation warnings
                const spacingWarning = showSpacingWarnings
                  ? getSpacingWarnings(ri, ci, cells, config, plantMap)
                  : null;
                const rotationWarning = showRotationWarnings && cell.plantSlug != null
                  ? getRotationWarnings(ri, ci, cell.plantSlug, plantMap, rotationHistory)
                  : null;

                return (
                  <div
                    key={ci}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: bg,
                      fontSize: cellSize * 0.55,
                      lineHeight: `${cellSize}px`,
                      position: 'relative',
                      ...(spacingWarning ? { boxShadow: 'inset 0 0 0 2px #f97316' } : {}),
                      ...(rotationWarning && !spacingWarning ? { boxShadow: 'inset 0 0 0 2px #8b5cf6' } : {}),
                      ...(rotationWarning && spacingWarning ? { boxShadow: 'inset 0 0 0 2px #f97316, inset 0 0 0 4px #8b5cf6' } : {}),
                    }}
                    className={`
                      border-r border-b border-stone-200/30 cursor-crosshair
                      flex items-center justify-center
                      hover:brightness-110 transition-colors duration-75
                      ${plantToPlace && (cell.type === 'veg-patch' || cell.type === 'raised-bed' || cell.type === 'flower-bed') ? 'hover:ring-1 ring-inset ring-emerald-400' : ''}
                    `}
                    title={(() => {
                      const base = plant
                        ? `${plant.commonName}${cell.sunHours !== null ? ` | ${cell.sunHours}h sun` : ''}${isInShadow ? ' | In shadow' : ''}`
                        : `${cell.type}${cell.sunHours !== null ? ` | ${cell.sunHours}h sun` : ''}${isInShadow ? ' | In shadow' : ''}`;
                      const cd = companionGrid?.[ri]?.[ci];
                      const tags: string[] = [];
                      if (cd?.hasFriend) tags.push('Friend nearby');
                      if (cd?.hasFoe) tags.push('Foe nearby');
                      if (spacingWarning) tags.push(spacingWarning);
                      if (rotationWarning) tags.push(rotationWarning);
                      const extra = tags.length > 0 ? ` | ${tags.join(', ')}` : '';
                      return base + extra;
                    })()}
                    onMouseDown={() => {
                      setIsPainting(true);
                      handleCellInteraction(ri, ci);
                    }}
                    onMouseEnter={() => {
                      if (isPainting && !plantToPlace) handleCellInteraction(ri, ci);
                    }}
                    onMouseUp={() => setIsPainting(false)}
                    onClick={() => {
                      if (hasPlant && plant) setSelectedPlant(plant);
                    }}
                  >
                    {/* Semi-transparent sun hours overlay */}
                    {sunOverlayColor && (
                      <div
                        style={{
                          position: 'absolute', inset: 0,
                          backgroundColor: sunOverlayColor,
                          opacity: 0.45,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    {/* Real-time shadow overlay */}
                    {isInShadow && (
                      <div
                        style={{
                          position: 'absolute', inset: 0,
                          backgroundColor: '#1a1a2e',
                          opacity: 0.35,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    {/* Companion planting indicator dots */}
                    {(() => {
                      const ci_data = companionGrid?.[ri]?.[ci];
                      if (!ci_data) return null;
                      const { hasFriend, hasFoe } = ci_data;
                      if (!hasFriend && !hasFoe) return null;
                      if (hasFriend && hasFoe) {
                        // Both: two small dots stacked vertically in top-right
                        return (
                          <>
                            <span
                              style={{
                                position: 'absolute', top: 1, right: 1,
                                width: 6, height: 6, borderRadius: '50%',
                                backgroundColor: '#34d399',
                                zIndex: 2, pointerEvents: 'none',
                                boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                              }}
                            />
                            <span
                              style={{
                                position: 'absolute', top: 9, right: 1,
                                width: 6, height: 6, borderRadius: '50%',
                                backgroundColor: '#f87171',
                                zIndex: 2, pointerEvents: 'none',
                                boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                              }}
                            />
                          </>
                        );
                      }
                      return (
                        <span
                          style={{
                            position: 'absolute', top: 1, right: 1,
                            width: 7, height: 7, borderRadius: '50%',
                            backgroundColor: hasFriend ? '#34d399' : '#f87171',
                            zIndex: 2, pointerEvents: 'none',
                            boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                          }}
                        />
                      );
                    })()}
                    {/* Spacing warning indicator — orange triangle, bottom-left */}
                    {spacingWarning && (
                      <span
                        style={{
                          position: 'absolute', bottom: 0, left: 0,
                          width: 0, height: 0,
                          borderLeft: '8px solid #f97316',
                          borderTop: '8px solid transparent',
                          zIndex: 3, pointerEvents: 'none',
                        }}
                      />
                    )}
                    {/* Rotation warning indicator — violet triangle, bottom-right */}
                    {rotationWarning && (
                      <span
                        style={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: 0, height: 0,
                          borderRight: '8px solid #8b5cf6',
                          borderTop: '8px solid transparent',
                          zIndex: 3, pointerEvents: 'none',
                        }}
                      />
                    )}
                    {/* Plant emoji (always visible on top) */}
                    {plant && <span style={{ pointerEvents: 'none', position: 'relative', zIndex: 1 }}>{plant.emoji}</span>}
                    {/* Sun hours label */}
                    {showSunOverlay && !plant && cell.sunHours !== null && cellSize >= 20 && (
                      <span className="text-[8px] font-bold opacity-70" style={{ pointerEvents: 'none', position: 'relative', zIndex: 1 }}>
                        {cell.sunHours}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Scale indicator */}
        <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-400">
          <span>1 cell = {config.cellSizeM}m</span>
          <span className="flex-1 border-t border-stone-200" />
          <span>Garden end (away from house)</span>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-stone-500">
          {CELL_TOOLS.filter((t) => t.type !== 'empty').map((tool) => (
            <span key={tool.type} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded border border-stone-200"
                style={{ backgroundColor: CELL_COLORS[tool.type] }}
              />
              {tool.label}
            </span>
          ))}
          {showCompanionOverlay && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#34d399' }} />
                Friend nearby
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f87171' }} />
                Foe nearby
              </span>
            </>
          )}
          {showSpacingWarnings && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-orange-500 rounded-sm" />
              Spacing warning
            </span>
          )}
          {showRotationWarnings && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-violet-500 rounded-sm" />
              Rotation warning
            </span>
          )}
        </div>

        {/* Garden Plan reasoning panel */}
        {gardenPlan && gardenPlan.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowPlan(!showPlan)}
              className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
            >
              <span>{showPlan ? '▼' : '▶'}</span>
              Garden Plan — Why plants are placed here ({gardenPlan.length} decisions)
            </button>
            {showPlan && (
              <div className="mt-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-100 dark:divide-stone-700 max-h-96 overflow-y-auto">
                {gardenPlan.map((item, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                    <span className="text-base mt-0.5">
                      {plantMap.get(item.plantSlug)?.emoji ?? '🌱'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                        {item.plantName}
                        <span className="font-normal text-stone-400 ml-2">
                          row {item.row + 1}, col {item.col + 1}
                        </span>
                      </div>
                      <ul className="mt-0.5 space-y-0.5">
                        {item.reasons.map((reason, ri) => (
                          <li key={ri} className={`text-[10px] ${
                            reason.startsWith('Companion:')
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : reason.startsWith('Warning:')
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-stone-500 dark:text-stone-400'
                          }`}>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plant detail modal */}
      {selectedPlant && (
        <PlantDetail
          plant={selectedPlant}
          companionMap={companionMap}
          onClose={() => setSelectedPlant(null)}
        />
      )}

      {/* Auto-populate modal */}
      {showAutoPopulate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                    Auto-Populate Garden
                  </h2>
                  <p className="text-sm text-stone-400 mt-0.5">
                    Uses your sun data, wall height, facing direction, and painted zones.
                    Only fills cells you've painted as veg patches, raised beds, or flower beds.
                  </p>
                </div>
                <button
                  onClick={() => setShowAutoPopulate(false)}
                  className="text-stone-400 hover:text-stone-600 text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {gardenLayouts.map((layout) => (
                <div
                  key={layout.id}
                  className="border border-stone-200 dark:border-stone-600 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                        {layout.name === 'Sun-Optimized' ? '☀️ ' : layout.name === 'Kitchen Garden' ? '🍳 ' : '📈 '}
                        {layout.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        {layout.description}
                      </p>
                      <div className="flex gap-3 mt-2 text-[10px] text-stone-400 flex-wrap">
                        <span>{layout.stats.totalPlanted} cells planted</span>
                        <span>{layout.stats.uniquePlants} unique plants</span>
                        <span>Avg {layout.stats.avgSunHours}h sun</span>
                        {layout.stats.companionPairs > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400">{layout.stats.companionPairs} companion pairings</span>
                        )}
                        {layout.stats.conflictsAvoided > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">{layout.stats.conflictsAvoided} conflicts avoided</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        // Clear existing plants
                        const store = useGardenStore.getState();
                        const currentCells = store.garden.cells;
                        for (let r = 0; r < currentCells.length; r++) {
                          for (let c = 0; c < currentCells[r].length; c++) {
                            if (currentCells[r][c].plantSlug) {
                              store.removePlantFromCell(r, c);
                            }
                          }
                        }
                        // Apply new placements
                        for (const p of layout.placements) {
                          store.plantInCell(p.row, p.col, p.plantSlug);
                        }
                        setGardenPlan(layout.reasoning);
                        setShowPlan(true);
                        setShowAutoPopulate(false);
                      }}
                      className="ml-4 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-stone-100 dark:border-stone-700 text-[10px] text-stone-400 text-center">
              Paint veg patches, raised beds, and flower beds first. Auto-populate only fills painted zones.
            </div>
          </div>
        </div>
      )}

      {/* Esher Avenue layout picker */}
      {showEsherLayouts && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                    🏡 21 Esher Avenue — Garden Loaded!
                  </h2>
                  <p className="text-sm text-stone-400 mt-0.5">
                    Your garden map has been pre-populated with the real layout: lawn, terrace, raised bed, shed, conservatory, fencing, and existing plants (strawberries, lavender, herbs, gooseberry, redcurrant, sweet peas). Choose a planting strategy for the available spaces:
                  </p>
                </div>
                <button
                  onClick={() => setShowEsherLayouts(false)}
                  className="text-stone-400 hover:text-stone-600 text-xl"
                >×</button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {esherLayouts.map((layout) => {
                const bedMode = raisedBedMode[layout.id] ?? 'keep';
                return (
                <div
                  key={layout.id}
                  className="border border-stone-200 dark:border-stone-600 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                        {layout.emoji} {layout.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        {layout.description}
                      </p>
                      <div className="flex gap-3 mt-2 text-[10px] text-stone-400 flex-wrap">
                        <span>{layout.stats.totalPlants} plants</span>
                        <span>{layout.stats.uniqueVarieties} varieties</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{layout.stats.companionPairs} companion pairs</span>
                        <span className="text-amber-600 dark:text-amber-400">~{layout.stats.estimatedYieldKg}kg yield</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">~£{layout.stats.estimatedValueGBP} value</span>
                      </div>

                      {/* Best GreenStalk pairing badge */}
                      {layout.bestPairing && (
                        <div className="mt-2 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-[10px] text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/30">
                          <span className="font-semibold">Best GreenStalk pairing:</span>{' '}
                          {layout.bestPairing.layoutName}
                          <span className="text-indigo-400 ml-1">({layout.bestPairing.score.total}/100)</span>
                          <span className="block mt-0.5 text-indigo-500 dark:text-indigo-400">{layout.bestPairing.score.summary}</span>
                        </div>
                      )}

                      {/* Raised bed toggle */}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => setRaisedBedMode((prev) => ({ ...prev, [layout.id]: bedMode === 'keep' ? 'replant' : 'keep' }))}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            bedMode === 'replant'
                              ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                              : 'bg-stone-50 dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400'
                          }`}
                        >
                          {bedMode === 'replant' ? '🔀 Replant raised bed' : '🌱 Keep existing raised bed'}
                        </button>
                        {bedMode === 'replant' && (
                          <span className="text-[9px] text-amber-600 dark:text-amber-400">{layout.raisedBedReplant.rationale}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const store = useGardenStore.getState();
                        for (const p of layout.placements) {
                          store.plantInCell(p.row, p.col, p.plantSlug);
                        }
                        if (bedMode === 'replant') {
                          for (const p of layout.raisedBedReplant.placements) {
                            store.plantInCell(p.row, p.col, p.plantSlug);
                          }
                        }
                        setShowEsherLayouts(false);
                      }}
                      className="ml-4 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Expandable placement reasoning */}
                  <details className="mt-3">
                    <summary className="text-[10px] text-stone-400 cursor-pointer hover:text-emerald-600 select-none">
                      Show placement reasoning ({layout.reasoning.length} decisions{bedMode === 'replant' ? ` + ${layout.raisedBedReplant.details.length} raised bed` : ''})
                    </summary>
                    <div className="mt-2 max-h-52 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-700/50 text-[10px]">
                      {(bedMode === 'replant'
                        ? [...layout.reasoning, ...layout.raisedBedReplant.details]
                        : layout.reasoning
                      ).map((item, i) => {
                        const plant = plants.find((p) => p.slug === item.plantSlug);
                        return (
                          <div key={i} className="py-1.5 flex items-start gap-2">
                            <span className="text-sm">{plant?.emoji ?? '🌱'}</span>
                            <div>
                              <div className="font-semibold text-stone-600 dark:text-stone-300">
                                {item.plantName} — {item.zone}
                              </div>
                              {item.reasons.map((r, ri) => (
                                <div key={ri} className="text-stone-400 dark:text-stone-500 leading-relaxed">{r}</div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-stone-100 dark:border-stone-700 flex justify-between items-center">
              <span className="text-[10px] text-stone-400">
                Existing plants preserved unless "Replant raised bed" is toggled.
              </span>
              <button
                onClick={() => setShowEsherLayouts(false)}
                className="px-3 py-1.5 text-xs text-stone-400 border border-stone-200 dark:border-stone-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
              >
                Skip — I'll place plants manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Season confirmation modal */}
      {showSaveSeasonConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <span>&#128197;</span> Save Season Snapshot
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">
                Save the current garden layout as <span className="font-semibold text-violet-600 dark:text-violet-400">
                  {getSeasonLabel(getCurrentSeasonKey())}
                </span>? This records which crop rotation groups are planted where, helping track rotation across seasons.
              </p>
              {Object.keys(rotationHistory).length > 0 && (
                <div className="mt-3 p-2 bg-stone-50 dark:bg-stone-700 rounded-lg">
                  <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">
                    Saved seasons
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(rotationHistory).sort().map((key) => (
                      <span
                        key={key}
                        className="text-[10px] px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full"
                      >
                        {getSeasonLabel(key)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6">
              <button
                onClick={() => setShowSaveSeasonConfirm(false)}
                className="px-4 py-2 text-xs text-stone-500 border border-stone-200 dark:border-stone-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveSeasonSnapshot(plantMap);
                  setShowSaveSeasonConfirm(false);
                }}
                className="px-4 py-2 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-semibold"
              >
                Save {getSeasonLabel(getCurrentSeasonKey())}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
