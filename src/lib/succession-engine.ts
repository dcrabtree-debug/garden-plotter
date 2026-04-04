/**
 * Succession Planting Engine
 *
 * Calculates "after X finishes, plant Y in the same pocket/space"
 * for maximum harvest from limited GreenStalk pockets and garden beds.
 *
 * Rules:
 * - A pocket/cell is "done" when the harvest window ends for the current crop
 * - The next crop must have time to mature before first frost (late October for Surrey)
 * - Respect crop rotation: don't follow brassicas with brassicas, etc.
 * - Factor in companion compatibility for adjacent pockets
 */

import type { Plant } from '../types/plant';
import { isInWindow } from './calendar-utils';

// Surrey frost dates
const SURREY_LAST_FROST_DOY = 105; // ~April 15
const SURREY_FIRST_FROST_DOY = 288; // ~October 15
const SURREY_GROWING_DAYS = SURREY_FIRST_FROST_DOY - SURREY_LAST_FROST_DOY; // ~183 days

export interface SuccessionSlot {
  cropSlug: string;
  cropName: string;
  emoji: string;
  startMonth: number; // planting month
  harvestMonth: number; // harvest end month
  daysToHarvest: number;
}

export interface SuccessionPlan {
  /** First crop in the slot */
  first: SuccessionSlot;
  /** Second crop after the first finishes */
  second: SuccessionSlot | null;
  /** Third crop if there's still time */
  third: SuccessionSlot | null;
  /** Total harvests from this slot */
  totalHarvests: number;
  /** Combined days of productivity */
  productiveDays: number;
  /** Percentage of growing season utilized */
  utilizationPct: number;
  /** Why this sequence works */
  reasoning: string;
}

// Rotation groups — don't follow same group
type RotationGroup = 'legumes' | 'brassicas' | 'roots-onions' | 'potatoes' | 'solanaceae' | 'any';

function getRotationGroup(plant: Plant): RotationGroup {
  if (['tomato-tumbling', 'pepper-chilli', 'pepper-sweet', 'aubergine'].includes(plant.slug)) return 'solanaceae';
  if (plant.inGround?.rotation && plant.inGround.rotation !== 'any' && plant.inGround.rotation !== 'permanent') {
    return plant.inGround.rotation as RotationGroup;
  }
  return 'any';
}

function canFollow(first: Plant, second: Plant): boolean {
  const g1 = getRotationGroup(first);
  const g2 = getRotationGroup(second);
  if (g1 === 'any' || g2 === 'any') return true;
  return g1 !== g2; // different rotation groups can follow each other
}

/**
 * Fast-maturing crops suitable for succession planting.
 * Sorted by speed (fastest first).
 */
const FAST_CROPS = [
  'radish',           // 25 days
  'rocket',           // 28 days
  'lettuce',          // 30 days
  'spring-onion',     // 60 days
  'spinach',          // 45 days (perpetual-spinach)
  'perpetual-spinach',
  'dwarf-french-bean',// 50 days
  'beetroot',         // 55 days
  'coriander',        // 35 days
];

/**
 * Generate succession plans for a given first crop.
 * Returns the best 2-3 crop sequence for the pocket.
 */
export function generateSuccessionPlan(
  firstPlant: Plant,
  allPlants: Plant[],
  lateStartMonth: number = 5 // May (default for late start)
): SuccessionPlan {
  const fastPlants = FAST_CROPS
    .map((slug) => allPlants.find((p) => p.slug === slug || p.slug.includes(slug)))
    .filter(Boolean) as Plant[];

  // When does the first crop's harvest window end?
  const harvestEnd = firstPlant.plantingWindow.harvest?.[1] ?? 9;
  const daysFirst = firstPlant.daysToHarvest[0];

  const first: SuccessionSlot = {
    cropSlug: firstPlant.slug,
    cropName: firstPlant.commonName,
    emoji: firstPlant.emoji,
    startMonth: Math.max(lateStartMonth, firstPlant.plantingWindow.transplant?.[0] ?? firstPlant.plantingWindow.sowOutdoors?.[0] ?? 5),
    harvestMonth: harvestEnd,
    daysToHarvest: daysFirst,
  };

  // Find best second crop
  let second: SuccessionSlot | null = null;
  let thirdCrop: SuccessionSlot | null = null;

  // Available time after first crop: from harvestEnd to first frost (Oct)
  const monthsRemaining = 10 - harvestEnd; // months until October
  const daysRemaining = monthsRemaining * 30;

  if (daysRemaining > 25) {
    // Find fastest crop that's compatible
    for (const fp of fastPlants) {
      if (fp.slug === firstPlant.slug) continue; // don't repeat same crop
      if (!canFollow(firstPlant, fp)) continue;
      if (fp.daysToHarvest[0] <= daysRemaining) {
        second = {
          cropSlug: fp.slug,
          cropName: fp.commonName,
          emoji: fp.emoji,
          startMonth: harvestEnd + 1,
          harvestMonth: Math.min(10, harvestEnd + 1 + Math.ceil(fp.daysToHarvest[0] / 30)),
          daysToHarvest: fp.daysToHarvest[0],
        };

        // Can we fit a third?
        const daysAfterSecond = daysRemaining - fp.daysToHarvest[0];
        if (daysAfterSecond > 25) {
          for (const tp of fastPlants) {
            if (tp.slug === fp.slug || tp.slug === firstPlant.slug) continue;
            if (!canFollow(fp, tp)) continue;
            if (tp.daysToHarvest[0] <= daysAfterSecond) {
              thirdCrop = {
                cropSlug: tp.slug,
                cropName: tp.commonName,
                emoji: tp.emoji,
                startMonth: (second.harvestMonth ?? 8) + 1,
                harvestMonth: Math.min(10, (second.harvestMonth ?? 8) + 1 + Math.ceil(tp.daysToHarvest[0] / 30)),
                daysToHarvest: tp.daysToHarvest[0],
              };
              break;
            }
          }
        }
        break;
      }
    }
  }

  const productiveDays = daysFirst + (second?.daysToHarvest ?? 0) + (thirdCrop?.daysToHarvest ?? 0);
  const totalHarvests = 1 + (second ? 1 : 0) + (thirdCrop ? 1 : 0);
  const utilizationPct = Math.min(100, Math.round((productiveDays / SURREY_GROWING_DAYS) * 100));

  const parts = [first.cropName];
  if (second) parts.push(second.cropName);
  if (thirdCrop) parts.push(thirdCrop.cropName);
  const reasoning = `${parts.join(' → ')}: ${totalHarvests} harvests, ${utilizationPct}% of growing season utilized.${
    second ? ` After ${first.cropName} finishes in ${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][first.harvestMonth]}, follow with ${second.cropName} (${second.daysToHarvest} days to harvest).` : ' Single-season crop — pocket occupied all season.'
  }`;

  return {
    first,
    second,
    third: thirdCrop,
    totalHarvests,
    productiveDays,
    utilizationPct,
    reasoning,
  };
}

/**
 * Pre-computed succession plans for common GreenStalk crops.
 */
export function getRecommendedSuccessions(plants: Plant[]): SuccessionPlan[] {
  const primarySlugs = [
    'strawberry-everbearing', // long-season — no succession needed
    'tomato-tumbling',        // long-season
    'dwarf-french-bean',      // mid-season, then follow with lettuce
    'lettuce',                // fast, multiple successions
    'radish',                 // very fast, multiple successions
    'pea',                    // early season, follow with beans
    'broad-bean',             // very early, follow with lots
    'kale',                   // planted summer, harvests winter
    'beetroot',               // mid-season
    'spring-onion',           // mid-season
  ];

  return primarySlugs
    .map((slug) => {
      const plant = plants.find((p) => p.slug === slug);
      if (!plant) return null;
      return generateSuccessionPlan(plant, plants);
    })
    .filter(Boolean) as SuccessionPlan[];
}
