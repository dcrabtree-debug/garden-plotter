/**
 * Renter Mode — Reversibility Filter
 *
 * Tags plants and methods with reversibility assessments.
 * When Renter Mode is ON, flags or warns about anything
 * that could cause tenancy issues.
 */

import type { Plant } from '../types/plant';

export type ReversibilityRisk = 'safe' | 'caution' | 'risky';

export interface RenterAssessment {
  risk: ReversibilityRisk;
  issues: string[];
  recommendation: string;
}

// Plants that spread aggressively or stain
const INVASIVE_SLUGS = new Set([
  'mint',
  'lemon-balm',
  'corsican-mint',
  'borage',       // self-seeds prolifically
  'nasturtium',   // self-seeds
]);

const STAINING_SLUGS = new Set([
  'blackberry',
  'blackcurrant',
  'blueberry',
  'beetroot',
]);

// Plants that need permanent structures
const NEEDS_STRUCTURE_SLUGS = new Set([
  'runner-bean',   // needs tall canes or trellis
  'pea',           // needs netting/sticks
  'cucumber',      // needs trellis
  'blackberry',    // needs wire training system
  'raspberry',     // needs post-and-wire
  'apple-dwarf',   // permanent tree
  'pear',          // permanent tree
  'plum',          // permanent tree
  'fig',           // needs wall training
  'asparagus',     // 20+ year permanent bed
  'rhubarb',       // permanent crown
]);

// Plants unsuitable for containers (need ground planting)
const GROUND_ONLY_SLUGS = new Set([
  'potato-early',
  'potato-maincrop',
  'sweetcorn',
  'squash',
  'parsnip',
  'asparagus',
  'rhubarb',
  'apple-dwarf',
  'pear',
  'plum',
  'fig',
  'blackberry',
  'raspberry',
  'gooseberry',
  'blackcurrant',
  'redcurrant',
  'blueberry',
]);

export function assessRenterRisk(plant: Plant): RenterAssessment {
  const issues: string[] = [];

  // Check invasiveness
  if (INVASIVE_SLUGS.has(plant.slug)) {
    issues.push(`${plant.commonName} spreads aggressively — ONLY grow in containers, never in ground near existing beds`);
  }

  // Check staining
  if (STAINING_SLUGS.has(plant.slug)) {
    issues.push(`${plant.commonName} juice stains paving and decking — use drip trays under containers`);
  }

  // Check structure needs
  if (NEEDS_STRUCTURE_SLUGS.has(plant.slug)) {
    issues.push(`Needs permanent support structure — may require fence fixings (check with landlord)`);
  }

  // Check ground-only
  if (GROUND_ONLY_SLUGS.has(plant.slug)) {
    issues.push(`Requires in-ground planting — not suitable for container/reversible growing`);
  }

  // Trees are always risky for renters
  if (plant.slug.includes('apple') || plant.slug.includes('pear') || plant.slug.includes('plum') || plant.slug.includes('fig')) {
    issues.push(`Fruit tree — permanent planting, cannot be removed easily`);
  }

  // Determine overall risk
  let risk: ReversibilityRisk;
  let recommendation: string;

  if (issues.length === 0) {
    risk = 'safe';
    recommendation = 'Fully reversible — safe for rented properties. Grow in GreenStalk or containers.';
  } else if (issues.some(i => i.includes('permanent') || i.includes('in-ground planting') || i.includes('Fruit tree'))) {
    risk = 'risky';
    recommendation = 'Not recommended for renters without landlord permission. Consider container alternatives.';
  } else {
    risk = 'caution';
    recommendation = 'Can be grown with precautions. Keep in containers, use drip trays, avoid planting in ground.';
  }

  return { risk, issues, recommendation };
}

/**
 * Get renter-safe alternatives for risky plants.
 */
export function getRenterAlternatives(plant: Plant, allPlants: Plant[]): Plant[] {
  if (!GROUND_ONLY_SLUGS.has(plant.slug) && !NEEDS_STRUCTURE_SLUGS.has(plant.slug)) {
    return [];
  }

  // Find similar plants that ARE container-friendly
  return allPlants.filter((p) => {
    if (p.slug === plant.slug) return false;
    if (p.greenstalkSuitability === 'unsuitable') return false;
    if (p.category !== plant.category) return false;
    // Must be renter-safe
    const assessment = assessRenterRisk(p);
    return assessment.risk === 'safe';
  }).slice(0, 3);
}
