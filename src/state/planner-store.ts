import { create } from 'zustand';
import type { Tower, Tier, Pocket, Settings, SaveState } from '../types/planner';

const STORAGE_KEY = 'garden-plotter-state';
const CURRENT_VERSION = 1;

function createPocket(towerId: string, tier: number, pocket: number): Pocket {
  return {
    id: `${towerId}-tier-${tier}-pocket-${pocket}`,
    plantSlug: null,
    plantedDate: null,
  };
}

function createTier(towerId: string, tierNumber: number): Tier {
  return {
    tierNumber,
    pockets: Array.from({ length: 6 }, (_, i) =>
      createPocket(towerId, tierNumber, i + 1)
    ),
  };
}

function createTower(id: string, name: string): Tower {
  return {
    id,
    name,
    tiers: Array.from({ length: 5 }, (_, i) => createTier(id, i + 1)),
  };
}

const defaultSettings: Settings = {
  lastFrostDate: '04-15',
  firstFrostDate: '10-25',
  location: 'Walton-on-Thames, Surrey, UK',
  latitude: 51.3867,
  longitude: -0.4175,
};

function createDefaultState(): SaveState {
  return {
    version: CURRENT_VERSION,
    towers: [
      createTower('tower-1', 'High-Yield Grazer'),
      createTower('tower-2', 'Cut-and-Come-Again'),
    ],
    raisedBeds: [],
    gardens: [],
    settings: defaultSettings,
  };
}

function loadState(): SaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    if (parsed.version === CURRENT_VERSION) return parsed;
    return createDefaultState();
  } catch {
    return createDefaultState();
  }
}

function makeSaveState(towers: Tower[], settings: Settings): SaveState {
  return {
    version: CURRENT_VERSION,
    towers,
    raisedBeds: [],
    gardens: [],
    settings,
  };
}

function saveState(state: SaveState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

interface PlannerStore {
  towers: Tower[];
  raisedBeds: never[];
  settings: Settings;

  assignPlant: (
    towerId: string,
    tierNumber: number,
    pocketIndex: number,
    slug: string
  ) => void;
  removePlant: (
    towerId: string,
    tierNumber: number,
    pocketIndex: number
  ) => void;
  renameTower: (towerId: string, name: string) => void;
  clearTower: (towerId: string) => void;
  addTower: () => void;
  removeTower: (towerId: string) => void;
  updateSettings: (settings: Settings) => void;
  importState: (payload: SaveState) => void;
  exportState: () => SaveState;
  resetAll: () => void;
}

export const usePlannerStore = create<PlannerStore>((set, get) => {
  const initial = loadState();

  return {
    towers: initial.towers,
    raisedBeds: [],
    settings: initial.settings,

    assignPlant: (towerId, tierNumber, pocketIndex, slug) => {
      set((state) => {
        const towers = state.towers.map((tower) => {
          if (tower.id !== towerId) return tower;
          return {
            ...tower,
            tiers: tower.tiers.map((tier) => {
              if (tier.tierNumber !== tierNumber) return tier;
              return {
                ...tier,
                pockets: tier.pockets.map((pocket, i) => {
                  if (i !== pocketIndex) return pocket;
                  return {
                    ...pocket,
                    plantSlug: slug,
                    plantedDate: new Date().toISOString().split('T')[0],
                  };
                }),
              };
            }),
          };
        });
        const newState = { ...state, towers };
        saveState(makeSaveState(newState.towers, newState.settings));
        return newState;
      });
    },

    removePlant: (towerId, tierNumber, pocketIndex) => {
      set((state) => {
        const towers = state.towers.map((tower) => {
          if (tower.id !== towerId) return tower;
          return {
            ...tower,
            tiers: tower.tiers.map((tier) => {
              if (tier.tierNumber !== tierNumber) return tier;
              return {
                ...tier,
                pockets: tier.pockets.map((pocket, i) => {
                  if (i !== pocketIndex) return pocket;
                  return { ...pocket, plantSlug: null, plantedDate: null };
                }),
              };
            }),
          };
        });
        const newState = { ...state, towers };
        saveState(makeSaveState(newState.towers, newState.settings));
        return newState;
      });
    },

    renameTower: (towerId, name) => {
      set((state) => {
        const towers = state.towers.map((t) =>
          t.id === towerId ? { ...t, name } : t
        );
        const newState = { ...state, towers };
        saveState(makeSaveState(newState.towers, newState.settings));
        return newState;
      });
    },

    clearTower: (towerId) => {
      set((state) => {
        const towers = state.towers.map((tower) => {
          if (tower.id !== towerId) return tower;
          return createTower(tower.id, tower.name);
        });
        const newState = { ...state, towers };
        saveState(makeSaveState(newState.towers, newState.settings));
        return newState;
      });
    },

    addTower: () => {
      set((state) => {
        const id = `tower-${state.towers.length + 1}`;
        const towers = [...state.towers, createTower(id, `Tower ${state.towers.length + 1}`)];
        const newState = { ...state, towers };
        saveState(makeSaveState(newState.towers, newState.settings));
        return newState;
      });
    },

    removeTower: (towerId) => {
      set((state) => {
        const towers = state.towers.filter((t) => t.id !== towerId);
        const newState = { ...state, towers };
        saveState(makeSaveState(newState.towers, newState.settings));
        return newState;
      });
    },

    updateSettings: (settings) => {
      set((state) => {
        const newState = { ...state, settings };
        saveState(makeSaveState(newState.towers, newState.settings));
        return newState;
      });
    },

    importState: (payload) => {
      set({
        towers: payload.towers,
        settings: payload.settings,
      });
      saveState(payload);
    },

    exportState: () => makeSaveState(get().towers, get().settings),

    resetAll: () => {
      const fresh = createDefaultState();
      set({
        towers: fresh.towers,
        settings: fresh.settings,
      });
      saveState(fresh);
    },
  };
});
