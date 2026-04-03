import { create } from 'zustand';
import type {
  Garden,
  GardenConfig,
  GardenCell,
  CellType,
  GardenFacing,
} from '../types/planner';

const STORAGE_KEY = 'garden-plotter-garden';

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
  return {
    id: 'garden-1',
    name: '21 Esher Avenue',
    config: DEFAULT_CONFIG,
    cells: createEmptyGrid(DEFAULT_CONFIG),
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
  showSunOverlay: boolean;
  showShadowOverlay: boolean;

  setTool: (tool: CellType) => void;
  paintCell: (row: number, col: number) => void;
  paintArea: (row: number, col: number, size: number) => void;
  plantInCell: (row: number, col: number, slug: string) => void;
  removePlantFromCell: (row: number, col: number) => void;
  updateConfig: (config: Partial<GardenConfig>) => void;
  renameGarden: (name: string) => void;
  setSunHours: (grid: number[][]) => void;
  setSelectedMonth: (month: number) => void;
  toggleSunOverlay: () => void;
  toggleShadowOverlay: () => void;
  resetGarden: () => void;
  clearPaint: () => void;
}

export const useGardenStore = create<GardenStore>((set, get) => {
  const initial = loadGarden();

  return {
    garden: initial,
    activeTool: 'veg-patch',
    selectedMonth: new Date().getMonth() + 1,
    showSunOverlay: false,
    showShadowOverlay: false,

    setTool: (tool) => set({ activeTool: tool }),

    paintCell: (row, col) => {
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

    paintArea: (row, col, size) => {
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
    toggleSunOverlay: () => set((s) => ({ showSunOverlay: !s.showSunOverlay })),
    toggleShadowOverlay: () => set((s) => ({ showShadowOverlay: !s.showShadowOverlay })),

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
