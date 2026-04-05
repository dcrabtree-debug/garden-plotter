import { useState, useRef, useCallback, useEffect, useMemo, type WheelEvent as ReactWheelEvent } from 'react';
import { useGardenStore, getSpacingWarnings, getRotationWarnings, getCurrentSeasonKey, getSeasonLabel } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { PlantDetail } from '../components/plant-palette/PlantDetail';
import { useCompanionDb } from '../data/use-companion-db';
import { useRegion } from '../data/use-region';
import { generateGardenLayouts, type GardenLayoutOption, type PlacementReason } from '../lib/garden-auto-populate';
import { createEsherGarden, generateEsherLayouts, type EsherLayoutOption } from '../lib/esher-garden-template';
import { usePlannerStore } from '../state/planner-store';
import { generateLayouts as generateGSLayouts, extractTowerSlugs } from '../lib/auto-populate';
import { findBestPairing } from '../lib/cross-system-scoring';
import { checkPair, getFriends, getConflicts } from '../lib/companion-engine';
import type { CellType, GardenFacing, GardenCell } from '../types/planner';
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
  sunHoursColor,
} from '../lib/solar-engine';
import { getMonthName } from '../lib/calendar-utils';

const CELL_TOOLS: { type: CellType; label: string; color: string; emoji: string }[] = [
  { type: 'lawn', label: 'Lawn', color: '#6fa37e', emoji: '\ud83c\udf3f' },
  { type: 'veg-patch', label: 'Veg Patch', color: '#5d4037', emoji: '\ud83e\udd6c' },
  { type: 'flower-bed', label: 'Flower Bed', color: '#e91e63', emoji: '\ud83c\udf3a' },
  { type: 'raised-bed', label: 'Raised Bed', color: '#795548', emoji: '\ud83e\udea8' },
  { type: 'greenstalk', label: 'GreenStalk', color: '#10b981', emoji: '\ud83c\udf31' },
  { type: 'conservatory', label: 'Conservatory', color: '#80cbc4', emoji: '\ud83c\udfe1' },
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
  greenstalk: '#10b981',
  conservatory: '#80cbc4',
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

// ─── Planted Plants Sidebar ───────────────────────────────────────────────

interface PlantedPlantsSidebarProps {
  cells: GardenCell[][];
  plants: Plant[];
  companionMap: import('../types/companion').CompanionMap;
}

function getLocationName(row: number, col: number, cells: GardenCell[][]): string {
  const cell = cells[row]?.[col];
  if (!cell) return 'Unknown';
  if (row >= 21 && row <= 22 && col >= 7 && col <= 12 && cell.type === 'raised-bed') return 'Raised Bed';
  if (col >= 18) return 'Right Fence Border';
  if (col === 0) return 'Left Fence Border';
  if (row >= 21 && col >= 16) return 'Back Gate Area';
  if (cell.type === 'veg-patch') return 'GreenStalk Zone';
  if (cell.type === 'patio') return 'Back Patio';
  if (cell.type === 'flower-bed') return 'Flower Bed';
  return 'Garden';
}

function PlantedPlantsSidebar({ cells, plants, companionMap }: PlantedPlantsSidebarProps) {
  const plantMap = useMemo(() => {
    const m = new Map<string, Plant>();
    for (const p of plants) m.set(p.slug, p);
    return m;
  }, [plants]);

  // Collect all planted cells grouped by location
  const grouped = useMemo(() => {
    const locations = new Map<string, { slug: string; row: number; col: number; plant: Plant }[]>();

    for (let r = 0; r < cells.length; r++) {
      for (let c = 0; c < cells[r].length; c++) {
        const cell = cells[r][c];
        if (!cell.plantSlug) continue;
        const plant = plantMap.get(cell.plantSlug);
        if (!plant) continue;
        const loc = getLocationName(r, c, cells);
        if (!locations.has(loc)) locations.set(loc, []);
        locations.get(loc)!.push({ slug: cell.plantSlug, row: r, col: c, plant });
      }
    }

    return locations;
  }, [cells, plantMap]);

  // For each plant, find companions among other planted plants
  const allPlantedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const group of grouped.values()) {
      for (const item of group) slugs.add(item.slug);
    }
    return [...slugs];
  }, [grouped]);

  const totalPlants = useMemo(() => {
    let n = 0;
    for (const g of grouped.values()) n += g.length;
    return n;
  }, [grouped]);

  if (totalPlants === 0) {
    return (
      <div className="text-center text-stone-400 text-xs mt-8">
        <div className="text-2xl mb-2">🌱</div>
        No plants placed yet.
        <br />Use "Load My Garden" or paint beds and place plants.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
        <span>🌿</span> Planted ({totalPlants})
      </h2>

      {[...grouped.entries()].map(([location, items]) => {
        // Deduplicate: show count per species
        const speciesCounts = new Map<string, { plant: Plant; count: number }>();
        for (const item of items) {
          const existing = speciesCounts.get(item.slug);
          if (existing) existing.count++;
          else speciesCounts.set(item.slug, { plant: item.plant, count: 1 });
        }

        return (
          <div key={location} className="bg-white dark:bg-stone-750 rounded-lg border border-stone-200 dark:border-stone-600 p-2">
            <h3 className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
              {location}
            </h3>
            <div className="space-y-1">
              {[...speciesCounts.entries()].map(([slug, { plant, count }]) => {
                const friends = getFriends(slug, allPlantedSlugs, companionMap);
                const foes = getConflicts(slug, allPlantedSlugs, companionMap);

                return (
                  <div key={slug} className="flex items-start gap-1.5 text-[10px]">
                    <span className="text-sm shrink-0">{plant.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-stone-700 dark:text-stone-300 truncate">
                        {plant.commonName}
                        {count > 1 && <span className="text-stone-400 ml-1">×{count}</span>}
                      </div>
                      {friends.length > 0 && (
                        <div className="text-emerald-600 dark:text-emerald-400 truncate">
                          💚 {friends.map((f) => {
                            const name = plantMap.get(f.plantB)?.commonName ?? f.plantB;
                            return name;
                          }).join(', ')}
                        </div>
                      )}
                      {foes.length > 0 && (
                        <div className="text-red-500 dark:text-red-400 truncate">
                          ⚠️ {foes.map((f) => {
                            const name = plantMap.get(f.plantB)?.commonName ?? f.plantB;
                            return name;
                          }).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
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
  const towers = usePlannerStore((s) => s.towers);
  const [isPainting, setIsPainting] = useState(false);
  const [plantToPlace, setPlantToPlace] = useState<Plant | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showPlantPanel, setShowPlantPanel] = useState(false);
  const [showAutoPopulate, setShowAutoPopulate] = useState(false);
  const [showEsherLayouts, setShowEsherLayouts] = useState(false);
  const [esherLayouts, setEsherLayouts] = useState<EsherLayoutOption[]>([]);
  const [raisedBedMode, setRaisedBedMode] = useState<Record<string, 'keep' | 'replant'>>({});
  const [mobilePanel, setMobilePanel] = useState<'tools' | 'plants' | null>(null);
  const [showSaveSeasonConfirm, setShowSaveSeasonConfirm] = useState(false);
  const [gardenLayouts, setGardenLayouts] = useState<GardenLayoutOption[]>([]);
  const [gardenPlan, setGardenPlan] = useState<PlacementReason[] | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showGreenStalks, setShowGreenStalks] = useState(true);
  const [showBloom, setShowBloom] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
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
        if (cell && (cell.type === 'veg-patch' || cell.type === 'raised-bed' || cell.type === 'flower-bed' || cell.type === 'conservatory')) {
          useGardenStore.getState().plantInCell(row, col, plantToPlace.slug);
        }
      } else {
        paintCell(row, col);
      }
    },
    [plantToPlace, cells, paintCell]
  );

  const baseCellSize = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const maxWidth = isMobile ? Math.min(window.innerWidth - 32, 400) : 800;
    return Math.min(Math.floor(maxWidth / cols), isMobile ? 18 : 28);
  }, [cols]);
  const cellSize = Math.round(baseCellSize * zoom);

  const handleWheel = useCallback((e: ReactWheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.min(3, Math.max(0.5, z - e.deltaY * 0.002)));
    }
  }, []);

  // GreenStalk positions: detect cells with type 'greenstalk', grouped into towers
  const greenStalkCells = useMemo(() => {
    const positions: { row: number; col: number; towerIndex: number }[] = [];
    const visited = new Set<string>();
    let towerIdx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r},${c}`;
        if (visited.has(key)) continue;
        if (cells[r]?.[c]?.type !== 'greenstalk') continue;
        // Flood-fill to find the connected cluster
        const cluster: { row: number; col: number }[] = [];
        const queue = [{ row: r, col: c }];
        while (queue.length > 0) {
          const { row: cr, col: cc } = queue.shift()!;
          const k = `${cr},${cc}`;
          if (visited.has(k)) continue;
          if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
          if (cells[cr]?.[cc]?.type !== 'greenstalk') continue;
          visited.add(k);
          cluster.push({ row: cr, col: cc });
          queue.push({ row: cr - 1, col: cc }, { row: cr + 1, col: cc }, { row: cr, col: cc - 1 }, { row: cr, col: cc + 1 });
        }
        for (const pos of cluster) positions.push({ ...pos, towerIndex: towerIdx });
        towerIdx++;
      }
    }
    return positions;
  }, [cells, rows, cols]);

  // Bloom visualization data
  const bloomGrid = useMemo(() => {
    if (!showBloom) return null;
    const currentMonth = selectedMonth;
    const grid: { inBloom: boolean; color: string }[][] = Array.from(
      { length: rows },
      () => Array.from({ length: cols }, () => ({ inBloom: false, color: '' }))
    );
    const bloomColors: Record<string, string> = {
      'vegetable': '#4caf50',
      'herb': '#66bb6a',
      'fruit': '#e91e63',
      'flower': '#e040fb',
      'legume': '#8bc34a',
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const slug = cells[r][c].plantSlug;
        if (!slug) continue;
        const plant = plantMap.get(slug);
        if (!plant) continue;
        const hw = plant.plantingWindow.harvest;
        if (hw) {
          // Approximate bloom as 1-2 months before harvest
          const bloomStart = hw[0] >= 2 ? hw[0] - 1 : hw[0];
          const bloomEnd = hw[1];
          const inRange = bloomStart <= bloomEnd
            ? currentMonth >= bloomStart && currentMonth <= bloomEnd
            : currentMonth >= bloomStart || currentMonth <= bloomEnd;
          if (inRange) {
            grid[r][c] = { inBloom: true, color: bloomColors[plant.category] ?? '#e040fb' };
          }
        }
      }
    }
    return grid;
  }, [showBloom, selectedMonth, cells, rows, cols, plantMap]);

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
    <div className="flex h-full overflow-hidden relative">
      {/* Mobile sidebar toggles */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40 flex justify-between pointer-events-none">
        <button
          onClick={() => setMobilePanel(mobilePanel === 'tools' ? null : 'tools')}
          className="pointer-events-auto px-3 py-2 bg-stone-800 text-white text-xs rounded-full shadow-lg flex items-center gap-1.5"
        >
          <span>🛠</span> Tools
        </button>
        <button
          onClick={() => setMobilePanel(mobilePanel === 'plants' ? null : 'plants')}
          className="pointer-events-auto px-3 py-2 bg-stone-800 text-white text-xs rounded-full shadow-lg flex items-center gap-1.5"
        >
          <span>🌿</span> Plants
        </button>
      </div>

      {/* Mobile overlay backdrop */}
      {mobilePanel && (
        <div className="sm:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setMobilePanel(null)} />
      )}

      {/* Left sidebar: tools + config */}
      <div className={`w-64 border-r border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 flex-shrink-0 overflow-y-auto p-3 space-y-4 ${
        mobilePanel === 'tools'
          ? 'fixed inset-y-0 left-0 z-40 shadow-2xl'
          : 'hidden sm:block'
      }`}>
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
            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showGreenStalks}
                onChange={() => setShowGreenStalks(!showGreenStalks)}
                className="rounded border-stone-300 accent-emerald-500"
              />
              GreenStalk towers
            </label>
            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showBloom}
                onChange={() => setShowBloom(!showBloom)}
                className="rounded border-stone-300 accent-pink-500"
              />
              Bloom visualization
            </label>
          </div>

          {/* Zoom control */}
          <div>
            <h3 className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Zoom</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="w-7 h-7 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-sm font-bold hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors flex items-center justify-center"
              >−</button>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="w-7 h-7 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-sm font-bold hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors flex items-center justify-center"
              >+</button>
              <span className="text-[10px] text-stone-400 w-8 text-right">{Math.round(zoom * 100)}%</span>
            </div>
            <p className="text-[9px] text-stone-400 mt-1">Ctrl/Cmd + scroll to zoom</p>
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

        {/* GreenStalk Placement Advisor */}
        {showGreenStalks && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 mb-2">🌱 GreenStalk Placement</h3>
            <div className="space-y-1.5 text-xs text-emerald-800 dark:text-emerald-400">
              {greenStalkCells.length > 0 ? (
                <>
                  <div>{new Set(greenStalkCells.map(g => g.towerIndex)).size} tower(s) placed on map</div>
                  {(() => {
                    // Calculate avg sun at each tower position
                    const towerSun = new Map<number, number[]>();
                    for (const g of greenStalkCells) {
                      if (!towerSun.has(g.towerIndex)) towerSun.set(g.towerIndex, []);
                      const h = cells[g.row]?.[g.col]?.sunHours;
                      if (h !== null && h !== undefined) towerSun.get(g.towerIndex)!.push(h);
                    }
                    return [...towerSun.entries()].map(([idx, hours]) => {
                      const avg = hours.length > 0 ? hours.reduce((s, h) => s + h, 0) / hours.length : 0;
                      const tower = towers[idx];
                      return (
                        <div key={idx} className={`text-[10px] px-2 py-1 rounded ${avg >= 6 ? 'bg-emerald-100 dark:bg-emerald-900/30' : avg >= 3 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                          <span className="font-semibold">{tower?.name ?? `Tower ${idx + 1}`}:</span> {avg.toFixed(1)}h sun/day
                          {avg >= 6 ? ' ☀️ Ideal!' : avg >= 3 ? ' 🌤 OK for leafy crops' : ' ⚠️ Too shady — move to sunnier spot'}
                        </div>
                      );
                    });
                  })()}
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-500 mt-1">
                    Tip: GreenStalks need 6+ hours sun for tomatoes & peppers. Place on the sunniest patio area.
                  </div>
                </>
              ) : (
                <div className="text-[10px]">
                  Load the Esher Avenue template to see GreenStalk positions, or paint veg-patch cells where you want to place them.
                </div>
              )}
            </div>
          </div>
        )}

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
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="mb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-stone-800 dark:text-stone-100">In-Ground Garden Plotter</h1>
            <div className="flex flex-wrap items-center gap-2">
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
          className="inline-block border border-stone-300 rounded-lg overflow-hidden select-none relative"
          style={{ lineHeight: 0 }}
          onMouseLeave={() => { setIsPainting(false); setHoveredCell(null); }}
          onWheel={handleWheel}
        >
          {cells.map((row, ri) => (
            <div key={ri} className="flex" style={{ height: cellSize }}>
              {row.map((cell, ci) => {
                const bg = CELL_COLORS[cell.type];
                const hasPlant = cell.plantSlug !== null;
                const plant = hasPlant ? plantMap.get(cell.plantSlug!) : null;

                // Overlay colors — continuous gradient heatmap
                let sunOverlayColor: string | null = null;
                if (showSunOverlay && cell.sunHours !== null) {
                  sunOverlayColor = sunHoursColor(cell.sunHours);
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
                      ${plantToPlace && (cell.type === 'veg-patch' || cell.type === 'raised-bed' || cell.type === 'flower-bed' || cell.type === 'conservatory') ? 'hover:ring-1 ring-inset ring-emerald-400' : ''}
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
                      if (hasPlant) setHoveredCell({ row: ri, col: ci });
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
                          opacity: 0.65,
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
                    {/* Bloom glow overlay */}
                    {bloomGrid?.[ri]?.[ci]?.inBloom && (
                      <div
                        style={{
                          position: 'absolute', inset: 0,
                          backgroundColor: bloomGrid[ri][ci].color,
                          opacity: 0.4,
                          borderRadius: '50%',
                          transform: 'scale(1.1)',
                          filter: 'blur(2px)',
                          pointerEvents: 'none',
                          zIndex: 1,
                        }}
                      />
                    )}
                    {/* GreenStalk tower marker */}
                    {showGreenStalks && greenStalkCells.some((g) => g.row === ri && g.col === ci) && (
                      <div
                        style={{
                          position: 'absolute', inset: 0,
                          border: '2px solid #10b981',
                          borderRadius: 4,
                          pointerEvents: 'none',
                          zIndex: 4,
                          boxShadow: '0 0 6px rgba(16,185,129,0.5)',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* GreenStalk tower labels (positioned above grid) */}
          {showGreenStalks && (() => {
            // Group by towerIndex and render label at cluster center
            const towerGroups = new Map<number, typeof greenStalkCells>();
            for (const g of greenStalkCells) {
              if (!towerGroups.has(g.towerIndex)) towerGroups.set(g.towerIndex, []);
              towerGroups.get(g.towerIndex)!.push(g);
            }
            return [...towerGroups.entries()].map(([idx, positions]) => {
              const avgRow = positions.reduce((s, p) => s + p.row, 0) / positions.length;
              const avgCol = positions.reduce((s, p) => s + p.col, 0) / positions.length;
              const tower = towers[idx];
              const plantCount = tower ? tower.tiers.reduce((s, t) => s + t.pockets.filter(p => p.plantSlug).length, 0) : 0;
              return (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: avgCol * cellSize - 20,
                    top: (avgRow - 0.8) * cellSize,
                    pointerEvents: 'none',
                    zIndex: 5,
                  }}
                  className="flex flex-col items-center"
                >
                  <div className="bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                    🌱 {tower?.name ?? `GreenStalk ${idx + 1}`}
                  </div>
                  {plantCount > 0 && (
                    <div className="text-[7px] text-emerald-600 font-semibold mt-0.5">
                      {plantCount}/30 planted
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* Rich tooltip on hover */}
        {hoveredCell && (() => {
          const hCell = cells[hoveredCell.row]?.[hoveredCell.col];
          if (!hCell?.plantSlug) return null;
          const hPlant = plantMap.get(hCell.plantSlug);
          if (!hPlant) return null;
          const sunH = hCell.sunHours;
          const sunOk = sunH !== null && (
            (hPlant.sun === 'full-sun' && sunH >= 6) ||
            (hPlant.sun === 'partial-shade' && sunH >= 3) ||
            (hPlant.sun === 'full-shade')
          );
          const sunWarning = sunH !== null && !sunOk;

          // Companion info
          const allSlugs: string[] = [];
          for (let r = Math.max(0, hoveredCell.row - 2); r <= Math.min(rows - 1, hoveredCell.row + 2); r++) {
            for (let c = Math.max(0, hoveredCell.col - 2); c <= Math.min(cols - 1, hoveredCell.col + 2); c++) {
              if (r === hoveredCell.row && c === hoveredCell.col) continue;
              const s = cells[r][c].plantSlug;
              if (s && s !== hCell.plantSlug) allSlugs.push(s);
            }
          }
          const uniqueNeighbours = [...new Set(allSlugs)];
          const friends = companionMap.get(hPlant.slug);
          const friendNames: string[] = [];
          const foeNames: string[] = [];
          if (friends) {
            for (const s of uniqueNeighbours) {
              const edge = friends.get(s);
              if (edge?.relationship === 'friend') friendNames.push(plantMap.get(s)?.commonName ?? s);
              if (edge?.relationship === 'foe') foeNames.push(plantMap.get(s)?.commonName ?? s);
            }
          }

          // Position tooltip near the hovered cell
          const tipLeft = (hoveredCell.col + 1) * cellSize + 8;
          const tipTop = hoveredCell.row * cellSize;
          const currentMonth = new Date().getMonth() + 1;

          return (
            <div
              style={{
                position: 'absolute',
                left: Math.min(tipLeft, cols * cellSize - 200),
                top: Math.max(0, tipTop - 20),
                zIndex: 20,
                pointerEvents: 'none',
              }}
              className="bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 p-3 w-56"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{hPlant.emoji}</span>
                <div>
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-100">{hPlant.commonName}</div>
                  <div className="text-[9px] text-stone-400 italic">{hPlant.botanicalName}</div>
                </div>
              </div>

              {/* Sun suitability */}
              <div className={`text-[10px] px-2 py-1 rounded mb-1.5 ${
                sunWarning
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
              }`}>
                {sunH !== null ? `${sunH}h sun` : 'Sun unknown'} — needs {hPlant.sun.replace('-', ' ')}
                {sunWarning && ' ⚠️ Not enough sun here!'}
                {sunOk && ' ✓ Good spot'}
              </div>

              {/* Key care tips */}
              <div className="space-y-0.5 text-[10px] text-stone-600 dark:text-stone-400 mb-1.5">
                <div>💧 Water: {hPlant.water} · ⏱ Harvest: {hPlant.daysToHarvest[0]}-{hPlant.daysToHarvest[1]} days</div>
                {hPlant.inGround.feeding && <div>🌿 {hPlant.inGround.feeding}</div>}
                {hPlant.inGround.pests.length > 0 && (
                  <div>🐛 Watch for: {hPlant.inGround.pests.slice(0, 2).join(', ')}</div>
                )}
              </div>

              {/* Companion relationships */}
              {friendNames.length > 0 && (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  💚 Friends nearby: {friendNames.join(', ')}
                </div>
              )}
              {foeNames.length > 0 && (
                <div className="text-[10px] text-red-500 dark:text-red-400">
                  ⚠️ Foes nearby: {foeNames.join(', ')}
                </div>
              )}

              {/* Placement reasoning */}
              <div className="text-[9px] text-stone-400 mt-1.5 border-t border-stone-100 dark:border-stone-700 pt-1.5">
                {hPlant.sun === 'full-sun' && sunH !== null && sunH >= 6
                  ? '☀️ Placed here for maximum sun exposure — ideal for this sun-loving crop.'
                  : hPlant.sun === 'partial-shade'
                    ? '🌤 This crop thrives in partial shade — good match for this spot.'
                    : hPlant.sun === 'full-shade'
                      ? '🌿 Shade-tolerant plant — makes good use of this shaded area.'
                      : sunWarning
                        ? '⚠️ Consider moving to a sunnier spot for better yields.'
                        : '📍 Placed based on available space and growing conditions.'}
              </div>
            </div>
          );
        })()}

        {/* Scale indicator */}
        <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-400">
          <span>1 cell = {config.cellSizeM}m · Zoom {Math.round(zoom * 100)}%</span>
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
          {showGreenStalks && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-emerald-500 rounded-sm shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
              GreenStalk
            </span>
          )}
          {showBloom && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-400" />
              In bloom
            </span>
          )}
        </div>

        {/* Sun heatmap gradient legend */}
        {showSunOverlay && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-stone-500">
            <span>0h</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden flex">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: sunHoursColor(i * 0.5) }} />
              ))}
            </div>
            <span>10h+</span>
            <span className="ml-2 text-stone-400">Sun hours per day</span>
          </div>
        )}

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

      {/* Right sidebar: Planted plants grouped by location & companions */}
      <div className={`w-64 border-l border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 flex-shrink-0 overflow-y-auto p-3 ${
        mobilePanel === 'plants'
          ? 'fixed inset-y-0 right-0 z-40 shadow-2xl'
          : 'hidden sm:block'
      }`}>
        <PlantedPlantsSidebar cells={cells} plants={plants} companionMap={companionMap} />
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
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-stone-100 dark:border-stone-700">
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
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-stone-100 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-stone-800 dark:text-stone-100">
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
                  className={`border rounded-xl p-4 transition-colors ${
                    layout.id === 'expert-choice'
                      ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800'
                      : 'border-stone-200 dark:border-stone-600 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {layout.id === 'expert-choice' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                          ⭐ TOP PICK
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                        {layout.emoji} {layout.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 whitespace-pre-line">
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
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-md w-full">
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
