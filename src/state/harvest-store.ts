import { create } from 'zustand';
import type { Harvester, HarvestEntry, HarvestMilestone } from '../types/harvest';
import { DEFAULT_HARVESTERS, DEFAULT_MILESTONES } from '../types/harvest';

const STORAGE_KEY = 'garden-plotter-harvest';

interface HarvestState {
  harvesters: Harvester[];
  entries: HarvestEntry[];
  milestones: HarvestMilestone[];
}

function loadState(): HarvestState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { harvesters: DEFAULT_HARVESTERS, entries: [], milestones: DEFAULT_MILESTONES };
    return JSON.parse(raw);
  } catch {
    return { harvesters: DEFAULT_HARVESTERS, entries: [], milestones: DEFAULT_MILESTONES };
  }
}

function saveState(state: HarvestState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

interface HarvestStore {
  harvesters: Harvester[];
  entries: HarvestEntry[];
  milestones: HarvestMilestone[];

  addHarvest: (harvesterId: string, plantSlug: string, count?: number) => void;
  removeLastHarvest: (harvesterId: string, plantSlug: string) => void;

  getCountForHarvester: (harvesterId: string, plantSlug?: string) => number;
  getTodayCountForHarvester: (harvesterId: string, plantSlug?: string) => number;
  getEarnedMilestones: (harvesterId: string) => HarvestMilestone[];
  getNewMilestones: (harvesterId: string, plantSlug: string, prevCount: number, newCount: number) => HarvestMilestone[];

  addHarvester: (name: string, emoji: string, color: string) => void;
  removeHarvester: (id: string) => void;
  clearAllEntries: () => void;
}

export const useHarvestStore = create<HarvestStore>((set, get) => {
  const initial = loadState();

  return {
    ...initial,

    addHarvest: (harvesterId, plantSlug, count = 1) => {
      set((state) => {
        const entry: HarvestEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          harvesterId,
          plantSlug,
          count,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
        };
        const entries = [...state.entries, entry];
        const newState = { harvesters: state.harvesters, entries, milestones: state.milestones };
        saveState(newState);
        return { entries };
      });
    },

    removeLastHarvest: (harvesterId, plantSlug) => {
      set((state) => {
        const idx = [...state.entries]
          .reverse()
          .findIndex((e) => e.harvesterId === harvesterId && e.plantSlug === plantSlug);
        if (idx === -1) return state;
        const realIdx = state.entries.length - 1 - idx;
        const entries = state.entries.filter((_, i) => i !== realIdx);
        const newState = { harvesters: state.harvesters, entries, milestones: state.milestones };
        saveState(newState);
        return { entries };
      });
    },

    getCountForHarvester: (harvesterId, plantSlug) => {
      const entries = get().entries.filter(
        (e) => e.harvesterId === harvesterId && (!plantSlug || e.plantSlug === plantSlug)
      );
      return entries.reduce((sum, e) => sum + e.count, 0);
    },

    getTodayCountForHarvester: (harvesterId, plantSlug) => {
      const today = new Date().toISOString().split('T')[0];
      const entries = get().entries.filter(
        (e) =>
          e.harvesterId === harvesterId &&
          e.date === today &&
          (!plantSlug || e.plantSlug === plantSlug)
      );
      return entries.reduce((sum, e) => sum + e.count, 0);
    },

    getEarnedMilestones: (harvesterId) => {
      const state = get();
      return state.milestones.filter((m) => {
        const count = state.entries
          .filter(
            (e) =>
              e.harvesterId === harvesterId &&
              (!m.plantSlug || e.plantSlug === m.plantSlug)
          )
          .reduce((sum, e) => sum + e.count, 0);
        return count >= m.target;
      });
    },

    getNewMilestones: (harvesterId, plantSlug, prevCount, newCount) => {
      const state = get();
      return state.milestones.filter((m) => {
        if (m.plantSlug && m.plantSlug !== plantSlug) {
          // Check total count for "any plant" milestones
          if (m.plantSlug !== null) return false;
        }
        const relevantCount = m.plantSlug
          ? newCount
          : state.entries
              .filter((e) => e.harvesterId === harvesterId)
              .reduce((sum, e) => sum + e.count, 0);
        const prevRelevantCount = m.plantSlug
          ? prevCount
          : relevantCount - (newCount - prevCount);
        return prevRelevantCount < m.target && relevantCount >= m.target;
      });
    },

    addHarvester: (name, emoji, color) => {
      set((state) => {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        const harvester: Harvester = { id, name, emoji, color };
        const harvesters = [...state.harvesters, harvester];
        const newState = { harvesters, entries: state.entries, milestones: state.milestones };
        saveState(newState);
        return { harvesters };
      });
    },

    removeHarvester: (id) => {
      set((state) => {
        const harvesters = state.harvesters.filter((h) => h.id !== id);
        const newState = { harvesters, entries: state.entries, milestones: state.milestones };
        saveState(newState);
        return { harvesters };
      });
    },

    clearAllEntries: () => {
      set((state) => {
        const newState = { harvesters: state.harvesters, entries: [], milestones: state.milestones };
        saveState(newState);
        return { entries: [] };
      });
    },
  };
});
