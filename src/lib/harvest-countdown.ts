/**
 * Harvest countdown — estimates days remaining for planted crops.
 *
 * Works with GreenStalk pockets (which track plantedDate).
 * In-ground cells don't yet have plantedDate, so they're excluded for now.
 */

import type { Tower } from '../types/planner';
import type { Plant } from '../types/plant';

// ── Types ────────────────────────────────────────────────────────────────────

export type HarvestStatus = 'growing' | 'soon' | 'ready' | 'overdue';

export interface HarvestEstimate {
  plantSlug: string;
  plantName: string;
  emoji: string;
  plantedDate: string;              // ISO date
  daysSincePlanting: number;
  daysToHarvestMin: number;
  daysToHarvestMax: number;
  /** Negative = past estimated window */
  daysRemainingMin: number;
  daysRemainingMax: number;
  status: HarvestStatus;
  /** Human-readable label: "~14 days", "Ready now!", etc. */
  label: string;
  /** Progress 0..1 based on midpoint of harvest range */
  progress: number;
  /** Tower/tier/pocket location label */
  location: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatus(daysRemainingMin: number, daysRemainingMax: number): HarvestStatus {
  if (daysRemainingMax <= 0) return 'overdue';
  if (daysRemainingMin <= 0) return 'ready';
  if (daysRemainingMin <= 14) return 'soon';
  return 'growing';
}

function getLabel(status: HarvestStatus, daysRemainingMin: number, daysRemainingMax: number): string {
  switch (status) {
    case 'overdue':
      return 'Harvest now!';
    case 'ready':
      return 'Ready to pick';
    case 'soon': {
      const avg = Math.round((daysRemainingMin + daysRemainingMax) / 2);
      return `~${avg}d to harvest`;
    }
    case 'growing': {
      const avg = Math.round((daysRemainingMin + daysRemainingMax) / 2);
      if (avg > 60) return `~${Math.round(avg / 7)}wk to harvest`;
      return `~${avg}d to harvest`;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function getHarvestEstimates(
  towers: Tower[],
  plantMap: Map<string, Plant>,
  today = new Date(),
): HarvestEstimate[] {
  const estimates: HarvestEstimate[] = [];

  for (const tower of towers) {
    for (const tier of tower.tiers) {
      for (let pi = 0; pi < tier.pockets.length; pi++) {
        const pocket = tier.pockets[pi];
        if (!pocket.plantSlug || !pocket.plantedDate) continue;

        const plant = plantMap.get(pocket.plantSlug);
        if (!plant) continue;

        const [harvestMin, harvestMax] = plant.daysToHarvest;
        if (harvestMin <= 0 && harvestMax <= 0) continue; // perennial / no harvest data

        const planted = new Date(pocket.plantedDate);
        const daysSince = daysBetween(planted, today);
        const remainMin = harvestMin - daysSince;
        const remainMax = harvestMax - daysSince;
        const status = getStatus(remainMin, remainMax);
        const label = getLabel(status, remainMin, remainMax);

        // Progress: 0 at planting, 1 at midpoint of harvest window
        const midpoint = (harvestMin + harvestMax) / 2;
        const progress = midpoint > 0 ? Math.min(1, daysSince / midpoint) : 1;

        // Also include companions
        const allSlugs = [pocket.plantSlug, ...(pocket.companionSlugs ?? [])];
        const names = allSlugs
          .map((s) => plantMap.get(s)?.commonName)
          .filter(Boolean)
          .join(' + ');
        const emojis = allSlugs
          .map((s) => plantMap.get(s)?.emoji)
          .filter(Boolean)
          .join('');

        estimates.push({
          plantSlug: pocket.plantSlug,
          plantName: names || plant.commonName,
          emoji: emojis || plant.emoji,
          plantedDate: pocket.plantedDate,
          daysSincePlanting: daysSince,
          daysToHarvestMin: harvestMin,
          daysToHarvestMax: harvestMax,
          daysRemainingMin: remainMin,
          daysRemainingMax: remainMax,
          status,
          label,
          progress,
          location: `${tower.name} › T${tier.tierNumber} P${pi + 1}`,
        });
      }
    }
  }

  // Sort: ready/overdue first, then soon, then by days remaining
  const statusOrder: Record<HarvestStatus, number> = { overdue: 0, ready: 1, soon: 2, growing: 3 };
  estimates.sort((a, b) => {
    const so = statusOrder[a.status] - statusOrder[b.status];
    if (so !== 0) return so;
    return a.daysRemainingMin - b.daysRemainingMin;
  });

  return estimates;
}
