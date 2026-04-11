import { create } from 'zustand';
import type {
  Garden,
  GardenConfig,
  GardenCell,
  CellType,
  GardenFacing,
} from '../types/planner';
import type { Plant } from '../types/plant';
import { createEsherGarden, ESHER_CONFIG } from '../lib/esher-garden-template';

const STORAGE_KEY = 'garden-plotter-garden';
const ROTATION_STORAGE_KEY = 'garden-plotter-rotation-history';
const LAYOUT_SNAPSHOT_KEY = 'garden-plotter-saved-layout';

/** Rotation groups that actually need tracking (permanent/any are exempt) */
const TRACKED_ROTATION_GROUPS = ['legumes', 'brassicas', 'roots-onions', 'potatoes'];

/** Map of rotation group to human-friendly name */
const ROTATION_GROUP_LABELS: Record<string, string> = {
  legumes: 'Legumes',
  brassicas: 'Brassicas',
  'roots-onions': 'Roots & onions',
  potatoes: 'Potatoes',
};

const ROTATION_DISEASE_RISK: Record<string, string> = {
  legumes: 'soil nitrogen depletion',
  brassicas: 'clubroot',
  'roots-onions': 'root fly / white rot',
  potatoes: 'blight / eelworm',
};

/** Keyed by "YYYY-season", value is 2D grid of rotation group names (or null) */
export type RotationHistory = Record<string, (string | null)[][]>;

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function getCurrentSeasonKey(): string {
  const year = new Date().getFullYear();
  return `${year}-${getCurrentSeason()}`;
}

function getSeasonLabel(key: string): string {
  const [year, season] = key.split('-');
  return `${season.charAt(0).toUpperCase() + season.slice(1)} ${year}`;
}

function loadRotationHistory(): RotationHistory {
  try {
    const raw = localStorage.getItem(ROTATION_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveRotationHistoryToStorage(history: RotationHistory) {
  try {
    localStorage.setItem(ROTATION_STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

/** Get ordered season keys going backwards from the given key */
function getPreviousSeasonKeys(currentKey: string, count: number): string[] {
  const seasonOrder = ['winter', 'spring', 'summer', 'autumn'];
  const [yearStr, season] = currentKey.split('-');
  let year = parseInt(yearStr, 10);
  let seasonIdx = seasonOrder.indexOf(season);
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    seasonIdx--;
    if (seasonIdx < 0) {
      seasonIdx = 3;
      year--;
    }
    keys.push(`${year}-${seasonOrder[seasonIdx]}`);
  }
  return keys;
}

/** Check spacing violations for a given cell position */
export function getSpacingWarnings(
  row: number,
  col: number,
  cells: GardenCell[][],
  config: GardenConfig,
  plantMap: Map<string, Plant>,
): string | null {
  const cell = cells[row]?.[col];
  if (!cell?.plantSlug) return null;
  const plant = plantMap.get(cell.plantSlug);
  if (!plant) return null;

  const spacingCm = plant.spacingCm ?? plant.inGround?.plantSpacingCm;
  if (!spacingCm || spacingCm <= 0) return null;

  const cellSizeCm = config.cellSizeM * 100;
  const requiredCells = Math.ceil(spacingCm / cellSizeCm);

  const totalRows = cells.length;
  const totalCols = cells[0]?.length ?? 0;

  for (let dr = -requiredCells; dr <= requiredCells; dr++) {
    for (let dc = -requiredCells; dc <= requiredCells; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= totalRows || nc < 0 || nc >= totalCols) continue;
      const neighbor = cells[nr]?.[nc];
      if (neighbor?.plantSlug === cell.plantSlug) {
        return `Too close! ${plant.commonName} needs ${spacingCm}cm spacing`;
      }
    }
  }
  return null;
}

/** Check rotation warnings for a given cell position */
export function getRotationWarnings(
  row: number,
  col: number,
  plantSlug: string,
  plantMap: Map<string, Plant>,
  rotationHistory: RotationHistory,
): string | null {
  const plant = plantMap.get(plantSlug);
  if (!plant) return null;

  const rotation = plant.inGround?.rotation;
  if (!rotation || !TRACKED_ROTATION_GROUPS.includes(rotation)) return null;

  const currentKey = getCurrentSeasonKey();
  const previousKeys = getPreviousSeasonKeys(currentKey, 2);

  for (const key of previousKeys) {
    const grid = rotationHistory[key];
    if (!grid) continue;
    const prevGroup = grid[row]?.[col];
    if (prevGroup === rotation) {
      const label = ROTATION_GROUP_LABELS[rotation] ?? rotation;
      const risk = ROTATION_DISEASE_RISK[rotation] ?? 'disease buildup';
      const seasonLabel = getSeasonLabel(key);
      return `${label} were here in ${seasonLabel} — risk of ${risk}`;
    }
  }
  return null;
}

export { getCurrentSeasonKey, getSeasonLabel };

const DEFAULT_CONFIG: GardenConfig = {
  widthM: 10,
  depthM: 12,
  cellSizeM: 0.5,
  facing: 'S' as GardenFacing,
  houseWallHeightM: 5,
  fenceHeightM: 1.8,
  latitude: 51.3867,
  longitude: -0.4175,
};

function createEmptyGrid(config: GardenConfig): GardenCell[][] {
  const cols = Math.round(config.widthM / config.cellSizeM);
  const rows = Math.round(config.depthM / config.cellSizeM);
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: 'lawn' as CellType,
      plantSlug: null,
      sunHours: null,
    }))
  );
}

function createDefaultGarden(): Garden {
  const { config, cells } = createEsherGarden();
  return {
    id: 'garden-1',
    name: '21 Esher Avenue',
    config,
    cells,
  };
}

function loadGarden(): Garden {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultGarden();
    return JSON.parse(raw);
  } catch {
    return createDefaultGarden();
  }
}

function saveGarden(garden: Garden) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(garden));
  } catch {}
}

interface GardenStore {
  garden: Garden;
  activeTool: CellType;
  selectedMonth: number;
  selectedHour: number;
  showSunOverlay: boolean;
  showShadowOverlay: boolean;
  showCompanionOverlay: boolean;
  showSpacingWarnings: boolean;
  showRotationWarnings: boolean;
  rotationHistory: RotationHistory;
  sunHoursVersion: number; // bumped on template load to force sun-hours recalc
  locked: boolean;         // locks plant placement
  layoutLocked: boolean;   // locks cell types (paint operations)

  toggleLock: () => void;
  toggleLayoutLock: () => void;
  setTool: (tool: CellType) => void;
  paintCell: (row: number, col: number) => void;
  paintCellAs: (row: number, col: number, type: CellType) => void;
  paintArea: (row: number, col: number, size: number) => void;
  plantInCell: (row: number, col: number, slug: string) => void;
  removePlantFromCell: (row: number, col: number) => void;
  clearAllPlants: () => void;
  saveLayout: () => void;
  restoreLayout: () => void;
  updateConfig: (config: Partial<GardenConfig>) => void;
  renameGarden: (name: string) => void;
  setSunHours: (grid: number[][]) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedHour: (hour: number) => void;
  toggleSunOverlay: () => void;
  toggleShadowOverlay: () => void;
  toggleCompanionOverlay: () => void;
  toggleSpacingWarnings: () => void;
  toggleRotationWarnings: () => void;
  saveSeasonSnapshot: (plantMap: Map<string, Plant>) => string;
  loadTemplate: (config: GardenConfig, cells: GardenCell[][]) => void;
  resetGarden: () => void;
  clearPaint: () => void;
}

export const useGardenStore = create<GardenStore>((set, get) => {
  const initial = loadGarden();

  return {
    garden: initial,
    activeTool: 'veg-patch',
    locked: false,
    layoutLocked: false,
    selectedMonth: new Date().getMonth() + 1,
    selectedHour: 12,
    showSunOverlay: false,
    showShadowOverlay: false,
    showCompanionOverlay: false,
    showSpacingWarnings: true,
    showRotationWarnings: true,
    rotationHistory: loadRotationHistory(),
    sunHoursVersion: 0,

    toggleLock: () => set((state) => ({ locked: !state.locked })),
    toggleLayoutLock: () => set((state) => ({ layoutLocked: !state.layoutLocked })),

    setTool: (tool) => set({ activeTool: tool }),

    paintCell: (row, col) => {
      if (get().layoutLocked) return;
      set((state) => {
        const garden = { ...state.garden };
        const cells = garden.cells.map((r) => r.map((c) => ({ ...c })));
        if (row >= 0 && row < cells.length && col >= 0 && col < cells[0].length) {
          if (state.activeTool === 'empty') {
            cells[row][col] = { type: 'lawn', plantSlug: null, sunHours: cells[row][col].sunHours };
          } else {
            cells[row][col] = { ...cells[row][col], type: state.activeTool, plantSlug: null };
          }
        }
        garden.cells = cells;
        saveGarden(garden);
        return { garden };
      });
    },

    paintCellAs: (row, col, type) => {
      if (get().layoutLocked) return;
      set((state) => {
        const garden = { ...state.garden };
        const cells = garden.cells.map((r) => r.map((c) => ({ ...c })));
        if (row >= 0 && row < cells.length && col >= 0 && col < cells[0].length) {
          cells[row][col] = { ...cells[row][col], type, plantSlug: null };
        }
        garden.cells = cells;
        saveGarden(garden);
        return { garden };
      });
    },

    paintArea: (row, col, size) => {
      if (get().layoutLocked) return;
      set((state) => {
        const garden = { ...state.garden };
        const cells = garden.cells.map((r) => r.map((c) => ({ ...c })));
        for (let r = row; r < row + size && r < cells.length; r++) {
          for (let c = col; c < col + size && c < cells[0].length; c++) {
            if (r >= 0 && c >= 0) {
              cells[r][c] = { ...cells[r][c], type: state.activeTool, plantSlug: null };
            }
          }
        }
        garden.cells = cells;
        saveGarden(garden);
        return { garden };
      });
    },

    plantInCell: (row, col, slug) => {
      if (get().locked) return;
      set((state) => {
        const garden = { ...state.garden };
        const cells = garden.cells.map((r) => r.map((c) => ({ ...c })));
        if (row >= 0 && row < cells.length && col >= 0 && col < cells[0].length) {
          cells[row][col] = { ...cells[row][col], plantSlug: slug };
        }
        garden.cells = cells;
        saveGarden(garden);
        return { garden };
      });
    },

    removePlantFromCell: (row, col) => {
      set((state) => {
        const garden = { ...state.garden };
        const cells = garden.cells.map((r) => r.map((c) => ({ ...c })));
        if (row >= 0 && row < cells.length && col >= 0 && col < cells[0].length) {
          cells[row][col] = { ...cells[row][col], plantSlug: null };
        }
        garden.cells = cells;
        saveGarden(garden);
        return { garden };
      });
    },

    clearAllPlants: () => {
      set((state) => {
        const garden = { ...state.garden };
        const cells = garden.cells.map((r) =>
          r.map((c) => ({ ...c, plantSlug: null }))
        );
        garden.cells = cells;
        saveGarden(garden);
        return { garden };
      });
    },

    saveLayout: () => {
      const { garden } = get();
      // Snapshot cell types + sunHours only (no plants)
      const snapshot = garden.cells.map((r) =>
        r.map((c) => ({ type: c.type, sunHours: c.sunHours }))
      );
      try {
        localStorage.setItem(LAYOUT_SNAPSHOT_KEY, JSON.stringify({
          config: garden.config,
          cells: snapshot,
          savedAt: new Date().toISOString(),
        }));
      } catch {}
    },

    restoreLayout: () => {
      try {
        const raw = localStorage.getItem(LAYOUT_SNAPSHOT_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        set((state) => {
          const garden = { ...state.garden, config: saved.config };
          // Merge saved cell types with current plants
          const cells = garden.cells.map((r, ri) =>
            r.map((c, ci) => ({
              type: saved.cells[ri]?.[ci]?.type ?? c.type,
              sunHours: saved.cells[ri]?.[ci]?.sunHours ?? c.sunHours,
              plantSlug: c.plantSlug, // keep existing plants
            }))
          );
          garden.cells = cells;
          saveGarden(garden);
          return { garden };
        });
      } catch {}
    },

    updateConfig: (partial) => {
      set((state) => {
        const config = { ...state.garden.config, ...partial };
        const needsResize =
          partial.widthM !== undefined ||
          partial.depthM !== undefined ||
          partial.cellSizeM !== undefined;
        const cells = needsResize ? createEmptyGrid(config) : state.garden.cells;
        const garden = { ...state.garden, config, cells };
        saveGarden(garden);
        return { garden };
      });
    },

    renameGarden: (name) => {
      set((state) => {
        const garden = { ...state.garden, name };
        saveGarden(garden);
        return { garden };
      });
    },

    setSunHours: (grid) => {
      set((state) => {
        const garden = { ...state.garden };
        const cells = garden.cells.map((r, ri) =>
          r.map((c, ci) => ({
            ...c,
            sunHours: grid[ri]?.[ci] ?? null,
          }))
        );
        garden.cells = cells;
        saveGarden(garden);
        return { garden };
      });
    },

    setSelectedMonth: (month) => set({ selectedMonth: month }),
    setSelectedHour: (hour) => set({ selectedHour: hour }),
    toggleSunOverlay: () => set((s) => ({ showSunOverlay: !s.showSunOverlay })),
    toggleShadowOverlay: () => set((s) => ({ showShadowOverlay: !s.showShadowOverlay })),
    toggleCompanionOverlay: () => set((s) => ({ showCompanionOverlay: !s.showCompanionOverlay })),
    toggleSpacingWarnings: () => set((s) => ({ showSpacingWarnings: !s.showSpacingWarnings })),
    toggleRotationWarnings: () => set((s) => ({ showRotationWarnings: !s.showRotationWarnings })),

    saveSeasonSnapshot: (plantMap: Map<string, Plant>) => {
      const state = get();
      const key = getCurrentSeasonKey();
      const grid: (string | null)[][] = state.garden.cells.map((row) =>
        row.map((cell) => {
          if (!cell.plantSlug) return null;
          const plant = plantMap.get(cell.plantSlug);
          return plant?.inGround?.rotation ?? null;
        })
      );
      const history = { ...state.rotationHistory, [key]: grid };
      saveRotationHistoryToStorage(history);
      set({ rotationHistory: history });
      return getSeasonLabel(key);
    },

    loadTemplate: (config, cells) => {
      if (get().layoutLocked) return; // don't overwrite a locked layout
      const garden: Garden = {
        id: 'garden-1',
        name: '21 Esher Avenue',
        config,
        cells,
      };
      saveGarden(garden);
      set((s) => ({ garden, sunHoursVersion: s.sunHoursVersion + 1 }));
    },

    resetGarden: () => {
      const fresh = createDefaultGarden();
      saveGarden(fresh);
      set({ garden: fresh });
    },

    clearPaint: () => {
      set((state) => {
        const garden = {
          ...state.garden,
          cells: createEmptyGrid(state.garden.config),
        };
        saveGarden(garden);
        return { garden };
      });
    },
  };
});
