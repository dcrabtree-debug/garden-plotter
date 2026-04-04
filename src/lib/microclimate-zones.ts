/**
 * Microclimate Zone Mapper
 *
 * Defines named zones for 21 Esher Avenue (and extensible to any garden).
 * Each zone has a sun/shelter/frost/soil profile that filters plant recommendations.
 * Integrates with shadow-engine for actual sun hours data.
 */

import type { Plant } from '../types/plant';

export interface MicroclimateZone {
  id: string;
  name: string;
  emoji: string;
  description: string;
  sunHoursEstimate: number; // avg growing season hours
  shelterLevel: 'full' | 'moderate' | 'exposed';
  frostProtection: boolean;
  soilType: 'container' | 'clay-improved' | 'raised-bed' | 'indoor';
  containerOnly: boolean; // renter constraint
  suitablePlantSlugs?: string[]; // optional override
}

export interface ZonePlantRecommendation {
  plant: Plant;
  fit: 'ideal' | 'good' | 'marginal';
  reason: string;
}

// ─── Pre-configured zones for 21 Esher Avenue ────────────────────────────────

export const ESHER_ZONES: MicroclimateZone[] = [
  {
    id: 'south-terrace',
    name: 'South Terrace',
    emoji: '☀️',
    description: 'Main planting zone. Paved area facing south-east. Gets strong morning and midday sun but loses afternoon light to the laurel hedge. Where both GreenStalks go.',
    sunHoursEstimate: 6,
    shelterLevel: 'moderate',
    frostProtection: false,
    soilType: 'container',
    containerOnly: true,
  },
  {
    id: 'conservatory',
    name: 'Conservatory',
    emoji: '🏠',
    description: 'Victorian glass conservatory. North-west facing — limited direct sun. Frost-free in winter. Ideal for seed starting, overwintering tender plants, and shade-tolerant herbs.',
    sunHoursEstimate: 3,
    shelterLevel: 'full',
    frostProtection: true,
    soilType: 'indoor',
    containerOnly: true,
  },
  {
    id: 'fence-border',
    name: 'Right Fence Border',
    emoji: '🌿',
    description: 'Narrow bed along the right fence. Established Cordylines and Euphorbia create variable shade. Space for climbers (sweet peas) trained up fence panels between existing plants.',
    sunHoursEstimate: 4,
    shelterLevel: 'moderate',
    frostProtection: false,
    soilType: 'clay-improved',
    containerOnly: false, // can plant in the existing bed
  },
  {
    id: 'shed-area',
    name: 'Shed Propagation',
    emoji: '🏚️',
    description: 'Wooden shed with glazed front panels. Low light but frost-protected. Best for early seed propagation trays and storing dormant plants overwinter.',
    sunHoursEstimate: 2,
    shelterLevel: 'full',
    frostProtection: true,
    soilType: 'indoor',
    containerOnly: true,
  },
  {
    id: 'raised-bed',
    name: 'Existing Raised Bed',
    emoji: '🌱',
    description: 'Metal-edged raised bed on the terrace. Already contains strawberry plants and perennials. Can add companion herbs and flowers around existing plants.',
    sunHoursEstimate: 6,
    shelterLevel: 'moderate',
    frostProtection: false,
    soilType: 'raised-bed',
    containerOnly: false,
  },
];

// ─── Plant recommendation engine ─────────────────────────────────────────────

export function recommendPlantsForZone(
  zone: MicroclimateZone,
  plants: Plant[]
): ZonePlantRecommendation[] {
  const results: ZonePlantRecommendation[] = [];

  for (const plant of plants) {
    // Skip unsuitable GreenStalk plants for container-only zones
    if (zone.containerOnly && zone.soilType === 'container' && plant.greenstalkSuitability === 'unsuitable') {
      continue;
    }

    // Sun requirement check
    const needsSun = plant.sun === 'full-sun' ? 6 : plant.sun === 'partial-shade' ? 3 : 1;
    const sunOk = zone.sunHoursEstimate >= needsSun;
    const sunMarginal = zone.sunHoursEstimate >= needsSun - 2 && !sunOk;

    if (!sunOk && !sunMarginal) continue;

    // Frost protection for tender plants
    const isTender = plant.hardiness === 'H1' || plant.hardiness === 'H2';
    const tenderOk = !isTender || zone.frostProtection;

    // Indoor zones: only herbs, seedlings, and tender plants
    if (zone.soilType === 'indoor') {
      if (plant.category !== 'herb' && !isTender) continue;
    }

    // Determine fit
    let fit: 'ideal' | 'good' | 'marginal';
    let reason: string;

    if (sunOk && tenderOk) {
      if (zone.soilType === 'container' && plant.greenstalkSuitability === 'ideal') {
        fit = 'ideal';
        reason = `Perfect for ${zone.name}: ideal GreenStalk crop with ${zone.sunHoursEstimate}h sun`;
      } else if (zone.soilType === 'container' && plant.greenstalkSuitability === 'good') {
        fit = 'good';
        reason = `Good fit for ${zone.name}: works well in containers`;
      } else if (zone.soilType === 'raised-bed' || zone.soilType === 'clay-improved') {
        fit = plant.inGround?.bedType === 'raised' || plant.inGround?.bedType === 'either' ? 'ideal' : 'good';
        reason = `Suitable for ${zone.name}: ${zone.soilType === 'raised-bed' ? 'raised bed' : 'in-ground'} growing`;
      } else {
        fit = 'good';
        reason = `Works in ${zone.name}`;
      }
    } else if (sunMarginal) {
      fit = 'marginal';
      reason = `Borderline sun (needs ${needsSun}h, zone gets ${zone.sunHoursEstimate}h) — may produce less`;
    } else {
      fit = 'marginal';
      reason = isTender ? `Tender plant — needs frost protection in winter` : `Limited fit for this zone`;
    }

    results.push({ plant, fit, reason });
  }

  // Sort: ideal first, then good, then marginal
  const fitOrder = { ideal: 0, good: 1, marginal: 2 };
  results.sort((a, b) => fitOrder[a.fit] - fitOrder[b.fit] || a.plant.commonName.localeCompare(b.plant.commonName));

  return results;
}
