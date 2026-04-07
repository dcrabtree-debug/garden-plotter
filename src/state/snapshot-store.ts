/**
 * Snapshot Store — weekly garden photo journal with growth tracking.
 *
 * Captures a point-in-time snapshot of all towers: growth stages,
 * harvest progress, and photo references. Supports week-over-week
 * comparison with pocket-by-pocket diffs.
 */

import { create } from 'zustand';
import type { Tower } from '../types/planner';
import type { Plant } from '../types/plant';
import { getGrowthProgress, type GrowthStage } from '../lib/kid-engagement';
import { type HarvestStatus } from '../lib/harvest-countdown';
import { getCachedWeather } from '../lib/weather-service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PocketSnapshot {
  pocketId: string;
  plantSlug: string | null;
  companionSlugs: string[];
  plantedDate: string | null;
  growthStage: GrowthStage | null;
  growthPct: number;
  harvestStatus: HarvestStatus | null;
}

export interface TierSnapshot {
  tierNumber: number;
  photoId: string | null;
  pockets: PocketSnapshot[];
}

export interface TowerSnapshot {
  towerId: string;
  towerName: string;
  tiers: TierSnapshot[];
  overviewPhotoId: string | null;
}

export interface WeatherSnapshot {
  minTemp: number;
  maxTemp: number;
  precipMm: number;
}

export interface SnapshotSession {
  id: string;
  capturedAt: string; // ISO
  towers: TowerSnapshot[];
  weather: WeatherSnapshot | null;
  totalPlanted: number;
  totalReady: number;
}

// ── Diff types ───────────────────────────────────────────────────────────────

export type PocketChangeType = 'stage-advance' | 'new-planting' | 'removed' | 'swapped' | 'unchanged';

export interface PocketDiff {
  pocketId: string;
  plantSlug: string | null;
  changeType: PocketChangeType;
  oldStage: GrowthStage | null;
  newStage: GrowthStage | null;
  oldPct: number;
  newPct: number;
  plantName: string;
  emoji: string;
}

export interface SnapshotDiff {
  olderDate: string;
  newerDate: string;
  changes: PocketDiff[];
  stageAdvances: number;
  newPlantings: number;
  removals: number;
  swaps: number;
}

// ── Capture helper ───────────────────────────────────────────────────────────

function getHarvestStatusFromPct(pct: number): HarvestStatus {
  if (pct >= 100) return 'overdue';
  if (pct >= 95) return 'ready';
  if (pct >= 80) return 'soon';
  return 'growing';
}

export function captureCurrentState(
  towers: Tower[],
  plantMap: Map<string, Plant>,
): { towerSnapshots: TowerSnapshot[]; totalPlanted: number; totalReady: number } {
  let totalPlanted = 0;
  let totalReady = 0;

  const towerSnapshots: TowerSnapshot[] = towers.map((tower) => ({
    towerId: tower.id,
    towerName: tower.name,
    overviewPhotoId: null,
    tiers: tower.tiers.map((tier) => ({
      tierNumber: tier.tierNumber,
      photoId: null,
      pockets: tier.pockets.map((pocket) => {
        if (!pocket.plantSlug) {
          return {
            pocketId: pocket.id,
            plantSlug: null,
            companionSlugs: [],
            plantedDate: null,
            growthStage: null,
            growthPct: 0,
            harvestStatus: null,
          };
        }

        totalPlanted++;
        const plant = plantMap.get(pocket.plantSlug);
        let growthStage: GrowthStage | null = null;
        let growthPct = 0;
        let harvestStatus: HarvestStatus | null = null;

        if (plant && pocket.plantedDate) {
          const progress = getGrowthProgress(pocket.plantedDate, plant.daysToHarvest, plant.commonName);
          growthStage = progress.stage;
          growthPct = progress.progressPct;
          harvestStatus = getHarvestStatusFromPct(growthPct);
          if (harvestStatus === 'ready' || harvestStatus === 'overdue') totalReady++;
        }

        return {
          pocketId: pocket.id,
          plantSlug: pocket.plantSlug,
          companionSlugs: pocket.companionSlugs ?? [],
          plantedDate: pocket.plantedDate,
          growthStage,
          growthPct,
          harvestStatus,
        };
      }),
    })),
  }));

  return { towerSnapshots, totalPlanted, totalReady };
}

// ── Diff engine ──────────────────────────────────────────────────────────────

export function computeSnapshotDiff(
  older: SnapshotSession,
  newer: SnapshotSession,
  plantMap: Map<string, Plant>,
): SnapshotDiff {
  const changes: PocketDiff[] = [];

  // Build pocket lookup from older session
  const olderPockets = new Map<string, PocketSnapshot>();
  for (const tower of older.towers) {
    for (const tier of tower.tiers) {
      for (const pocket of tier.pockets) {
        olderPockets.set(pocket.pocketId, pocket);
      }
    }
  }

  // Compare each pocket in newer session
  for (const tower of newer.towers) {
    for (const tier of tower.tiers) {
      for (const pocket of tier.pockets) {
        const oldPocket = olderPockets.get(pocket.pocketId);
        const plant = pocket.plantSlug ? plantMap.get(pocket.plantSlug) : null;
        const plantName = plant?.commonName ?? pocket.plantSlug ?? '';
        const emoji = plant?.emoji ?? '';

        if (!oldPocket || !oldPocket.plantSlug) {
          if (pocket.plantSlug) {
            changes.push({
              pocketId: pocket.pocketId,
              plantSlug: pocket.plantSlug,
              changeType: 'new-planting',
              oldStage: null,
              newStage: pocket.growthStage,
              oldPct: 0,
              newPct: pocket.growthPct,
              plantName,
              emoji,
            });
          }
          continue;
        }

        if (!pocket.plantSlug && oldPocket.plantSlug) {
          const oldPlant = plantMap.get(oldPocket.plantSlug);
          changes.push({
            pocketId: pocket.pocketId,
            plantSlug: oldPocket.plantSlug,
            changeType: 'removed',
            oldStage: oldPocket.growthStage,
            newStage: null,
            oldPct: oldPocket.growthPct,
            newPct: 0,
            plantName: oldPlant?.commonName ?? oldPocket.plantSlug,
            emoji: oldPlant?.emoji ?? '',
          });
          continue;
        }

        if (pocket.plantSlug !== oldPocket.plantSlug) {
          changes.push({
            pocketId: pocket.pocketId,
            plantSlug: pocket.plantSlug,
            changeType: 'swapped',
            oldStage: oldPocket.growthStage,
            newStage: pocket.growthStage,
            oldPct: oldPocket.growthPct,
            newPct: pocket.growthPct,
            plantName,
            emoji,
          });
          continue;
        }

        // Same plant — check stage advancement
        if (pocket.growthStage !== oldPocket.growthStage) {
          changes.push({
            pocketId: pocket.pocketId,
            plantSlug: pocket.plantSlug,
            changeType: 'stage-advance',
            oldStage: oldPocket.growthStage,
            newStage: pocket.growthStage,
            oldPct: oldPocket.growthPct,
            newPct: pocket.growthPct,
            plantName,
            emoji,
          });
        }
      }
    }
  }

  return {
    olderDate: older.capturedAt,
    newerDate: newer.capturedAt,
    changes,
    stageAdvances: changes.filter((c) => c.changeType === 'stage-advance').length,
    newPlantings: changes.filter((c) => c.changeType === 'new-planting').length,
    removals: changes.filter((c) => c.changeType === 'removed').length,
    swaps: changes.filter((c) => c.changeType === 'swapped').length,
  };
}

// ── Store ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'garden-plotter-snapshots';
const MAX_AGE_DAYS = 90;

function loadSnapshots(): SnapshotSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const sessions: SnapshotSession[] = JSON.parse(raw);
    // Auto-purge old snapshots
    const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    return sessions.filter((s) => new Date(s.capturedAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveSnapshots(sessions: SnapshotSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {}
}

interface SnapshotStore {
  snapshots: SnapshotSession[];
  addSnapshot: (session: SnapshotSession) => void;
  removeSnapshot: (id: string) => void;
  getLatest: () => SnapshotSession | null;
  getPrevious: () => SnapshotSession | null;
}

export const useSnapshotStore = create<SnapshotStore>((set, get) => ({
  snapshots: loadSnapshots(),

  addSnapshot: (session) => {
    set((state) => {
      const snapshots = [session, ...state.snapshots];
      saveSnapshots(snapshots);
      return { snapshots };
    });
  },

  removeSnapshot: (id) => {
    set((state) => {
      const snapshots = state.snapshots.filter((s) => s.id !== id);
      saveSnapshots(snapshots);
      return { snapshots };
    });
  },

  getLatest: () => {
    const { snapshots } = get();
    return snapshots[0] ?? null;
  },

  getPrevious: () => {
    const { snapshots } = get();
    return snapshots[1] ?? null;
  },
}));

// ── Utility ──────────────────────────────────────────────────────────────────

export function createSnapshotSession(
  towers: Tower[],
  plantMap: Map<string, Plant>,
): SnapshotSession {
  const { towerSnapshots, totalPlanted, totalReady } = captureCurrentState(towers, plantMap);

  // Grab today's weather from cache
  const forecast = getCachedWeather();
  const todayWeather = forecast?.days[0] ?? null;

  return {
    id: `snapshot-${Date.now()}`,
    capturedAt: new Date().toISOString(),
    towers: towerSnapshots,
    weather: todayWeather
      ? { minTemp: todayWeather.minTemp, maxTemp: todayWeather.maxTemp, precipMm: todayWeather.precipMm }
      : null,
    totalPlanted,
    totalReady,
  };
}
