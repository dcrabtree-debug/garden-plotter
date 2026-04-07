/**
 * 21 Esher Avenue — Pre-built Garden Template
 *
 * Based on analysis of 11 garden photographs + satellite imagery.
 *
 * Garden dimensions: ~10m wide × 12m deep
 * Grid: 0.5m cells = 20 columns × 24 rows
 *
 * Orientation (from aerial satellite — top of image = true north):
 *   Row 0 = house wall (SOUTH, street side — Esher Avenue)
 *   Row 23 = back of garden (NORTH — hedge/trees)
 *   Col 0 = left (WEST) — neighbour 19A side
 *   Col 19 = right (EAST) — fence border side, neighbour 23A
 *
 * Photo-verified features (aerial + estate agent + ground-level):
 * - Conservatory (SW corner, rows 0-2, cols 0-5) — west side of house
 * - Conservatory patio (rows 2-3, cols 4-8) — paving outside French doors
 * - West boundary (cols 0-1) — established hedge/shrubs (19A side)
 * - East fence border (cols 18-19) — closeboard + Cordylines + Euphorbia
 * - Main lawn (rows 3-18) — OFF LIMITS, rental
 * - Shed (rows 21-23, cols 3-5) — small wooden, NORTHWEST corner (photo-confirmed)
 * - Ornamental bed (rows 20-21, cols 6-8) — Aucuba, Acer, shrubs
 * - Raised bed (rows 20-21, cols 9-13) — black metal edging, shade plants (hostas, ferns)
 * - Old shed pavers (rows 20-22, cols 16-19) — EAST side, old shed removed, GreenStalks here
 * - Laurel hedge (rows 22-23) — 3-4m tall, full NORTH boundary
 * - Back gate + fruit (row 21-22, cols 14-15)
 * - Large deciduous tree (rows 14-19, col 19) — overhangs from east
 * - Gooseberry/currant near back gate
 */

import type { GardenCell, GardenConfig, CellType } from '../types/planner';

export const ESHER_CONFIG: GardenConfig = {
  widthM: 10,
  depthM: 12,
  cellSizeM: 0.5,
  facing: 'NE',
  houseWallHeightM: 7,
  fenceHeightM: 1.8,
  latitude: 51.3867,
  longitude: -0.4175,
};

interface CellOverride {
  row: number;
  col: number;
  type: CellType;
  plantSlug?: string;
  label?: string;
}

/**
 * Generate the pre-populated Esher Avenue garden grid.
 * Based on photo analysis + satellite imagery (April 2026).
 */
export function createEsherGarden(): { config: GardenConfig; cells: GardenCell[][] } {
  const cols = Math.round(ESHER_CONFIG.widthM / ESHER_CONFIG.cellSizeM); // 20
  const rows = Math.round(ESHER_CONFIG.depthM / ESHER_CONFIG.cellSizeM); // 24

  const cells: GardenCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: 'lawn' as CellType,
      plantSlug: null,
      sunHours: null,
    }))
  );

  const overrides: CellOverride[] = [];

  // ══════════════════════════════════════════════════════════════════════════
  // Layout rebuilt from David's manually-painted grid (April 7, 2026)
  // ══════════════════════════════════════════════════════════════════════════

  // ── House wall / patio (rows 0-1) ──
  for (let c = 0; c < cols; c++) {
    overrides.push({ row: 0, col: c, type: 'patio' });
  }
  // Row 1: patio behind house except conservatory
  for (let c = 6; c < cols; c++) {
    overrides.push({ row: 1, col: c, type: 'patio' });
  }

  // ── Conservatory (west side, rows 0-2, cols 1-5) ──
  for (let r = 0; r <= 2; r++) {
    for (let c = 1; c <= 5; c++) {
      overrides.push({ row: r, col: c, type: 'conservatory', label: 'Conservatory' });
    }
  }
  // Col 0 rows 0-2 = patio/wall beside conservatory
  overrides.push({ row: 0, col: 0, type: 'patio' });
  overrides.push({ row: 1, col: 0, type: 'patio' });
  overrides.push({ row: 2, col: 0, type: 'patio' });

  // Pre-populate conservatory — LOW LIGHT zone (~2-3h effective growing light)
  // NW-facing Victorian glass = filtered light, most UV blocked
  // Only shade-tolerant plants: fern, mint, lemon-balm, parsley, coriander, chives
  overrides.push({ row: 1, col: 1, type: 'conservatory', plantSlug: 'fern-hardy', label: 'Conservatory' });
  overrides.push({ row: 1, col: 3, type: 'conservatory', plantSlug: 'mint', label: 'Conservatory' });
  overrides.push({ row: 1, col: 5, type: 'conservatory', plantSlug: 'lemon-balm', label: 'Conservatory' });
  overrides.push({ row: 2, col: 1, type: 'conservatory', plantSlug: 'parsley', label: 'Conservatory' });
  overrides.push({ row: 2, col: 3, type: 'conservatory', plantSlug: 'coriander', label: 'Conservatory' });
  overrides.push({ row: 2, col: 5, type: 'conservatory', plantSlug: 'chives', label: 'Conservatory' });

  // ── Patio near conservatory doors (rows 2-3, cols 6-8) ──
  for (let r = 2; r <= 3; r++) {
    for (let c = 6; c <= 8; c++) {
      overrides.push({ row: r, col: c, type: 'patio', label: 'Conservatory patio' });
    }
  }
  // Row 2-3 patio extends across back of house
  for (let c = 9; c <= 17; c++) {
    overrides.push({ row: 2, col: c, type: 'patio' });
  }

  // ── West boundary (col 0, rows 3-22) — single-width flower bed ──
  for (let r = 3; r <= 22; r++) {
    overrides.push({ row: r, col: 0, type: 'flower-bed', label: 'West border' });
  }

  // ── East fence border (col 18 = flower-bed, col 19 = trees/veg) ──
  for (let r = 2; r <= 19; r++) {
    overrides.push({ row: r, col: 18, type: 'flower-bed', label: 'Fence border' });
    overrides.push({ row: r, col: 19, type: 'tree', label: 'Boundary trees' });
  }
  // Cordylines on east fence
  for (let r = 4; r <= 16; r += 3) {
    overrides.push({ row: r, col: 19, type: 'tree', label: 'Cordyline' });
  }

  // ── Bottom-right area (rows 20-22, cols 17-19) — flower beds + veg ──
  for (let r = 20; r <= 22; r++) {
    overrides.push({ row: r, col: 18, type: 'flower-bed' });
    overrides.push({ row: r, col: 19, type: 'flower-bed' });
  }
  overrides.push({ row: 20, col: 17, type: 'flower-bed' });

  // ── Raised bed area (rows 19-20, cols 5-8) ──
  for (let r = 19; r <= 20; r++) {
    for (let c = 5; c <= 8; c++) {
      overrides.push({ row: r, col: c, type: 'raised-bed', label: 'Raised bed' });
    }
  }
  // Additional raised/veg area at rows 21-22
  for (let c = 5; c <= 8; c++) {
    overrides.push({ row: 21, col: c, type: 'veg-patch', label: 'Back veg patch' });
  }

  // ── Flower beds in back-center (rows 19-20, cols 9-13) ──
  for (let r = 19; r <= 20; r++) {
    for (let c = 9; c <= 13; c++) {
      overrides.push({ row: r, col: c, type: 'flower-bed', label: 'Back flower bed' });
    }
  }

  // ── Shed (rows 19-21, cols 15-16) ──
  for (let r = 19; r <= 21; r++) {
    for (let c = 15; c <= 16; c++) {
      overrides.push({ row: r, col: c, type: 'shed', label: 'Shed' });
    }
  }
  // Patio/path in front of shed
  overrides.push({ row: 19, col: 14, type: 'patio', label: 'Shed path' });
  overrides.push({ row: 20, col: 14, type: 'patio', label: 'Shed path' });

  // ── GreenStalk positions (rows 21-22, cols 9-12) ──
  // 2 GreenStalks, each 2×2 cells (1m × 1m footprint)
  for (let r = 21; r <= 22; r++) {
    for (let c = 9; c <= 10; c++) {
      overrides.push({ row: r, col: c, type: 'greenstalk', label: 'GreenStalk 1' });
    }
  }
  for (let r = 21; r <= 22; r++) {
    for (let c = 11; c <= 12; c++) {
      overrides.push({ row: r, col: c, type: 'greenstalk', label: 'GreenStalk 2' });
    }
  }

  // ── Bottom row (row 23) — hedge/boundary ──
  for (let c = 0; c <= 4; c++) {
    overrides.push({ row: 23, col: c, type: 'flower-bed', label: 'Back border' });
  }
  for (let c = 5; c <= 8; c++) {
    overrides.push({ row: 23, col: c, type: 'veg-patch', label: 'Back veg' });
  }
  for (let c = 9; c <= 13; c++) {
    overrides.push({ row: 23, col: c, type: 'tree', label: 'Hedge' });
  }
  overrides.push({ row: 23, col: 14, type: 'path', label: 'Back gate' });
  for (let c = 15; c <= 19; c++) {
    overrides.push({ row: 23, col: c, type: 'tree', label: 'Hedge' });
  }

  // ── Row 22 — mixed back area ──
  for (let c = 0; c <= 4; c++) {
    overrides.push({ row: 22, col: c, type: 'flower-bed', label: 'Back border' });
  }
  for (let c = 5; c <= 8; c++) {
    overrides.push({ row: 22, col: c, type: 'veg-patch', label: 'Back veg' });
  }
  overrides.push({ row: 22, col: 13, type: 'flower-bed' });
  overrides.push({ row: 22, col: 14, type: 'patio', label: 'Path' });
  overrides.push({ row: 22, col: 15, type: 'flower-bed' });
  overrides.push({ row: 22, col: 16, type: 'flower-bed' });
  overrides.push({ row: 22, col: 17, type: 'flower-bed' });

  // ── Row 21 — back area continued ──
  for (let c = 0; c <= 4; c++) {
    overrides.push({ row: 21, col: c, type: 'flower-bed', label: 'Back border' });
  }
  overrides.push({ row: 21, col: 13, type: 'flower-bed' });
  overrides.push({ row: 21, col: 14, type: 'patio', label: 'Path' });
  overrides.push({ row: 21, col: 17, type: 'flower-bed' });

  // ── Existing plants — fruit bushes near back gate ──
  overrides.push({ row: 20, col: 17, type: 'flower-bed', plantSlug: 'gooseberry', label: 'Gooseberry' });
  overrides.push({ row: 20, col: 18, type: 'flower-bed', plantSlug: 'redcurrant', label: 'Redcurrant' });

  // Apply overrides (last-write-wins)
  for (const o of overrides) {
    if (o.row >= 0 && o.row < rows && o.col >= 0 && o.col < cols) {
      cells[o.row][o.col] = {
        type: o.type,
        plantSlug: o.plantSlug ?? null,
        sunHours: null,
      };
    }
  }

  return { config: ESHER_CONFIG, cells };
}

// ─── Auto-populate strategies ───────────────────────────────────────────────
// Plantable in-ground areas: raised bed (12 cells) + fence border gaps (3 slots).
// Back patio is PAVED — GreenStalks only. Lawn is OFF LIMITS (rental).

import type { CrossSystemPairing } from './cross-system-scoring';
import type { Plant } from '../types/plant';
import type { CompanionMap } from '../types/companion';
import { getFriends, getConflicts } from './companion-engine';

export interface PlacementDetail {
  plantSlug: string;
  plantName: string;
  row: number;
  col: number;
  zone: string;
  reasons: string[];
}

export interface RaisedBedOption {
  placements: { row: number; col: number; plantSlug: string }[];
  details: PlacementDetail[];
  rationale: string;
}

export interface EsherLayoutOption {
  id: string;
  name: string;
  description: string;
  emoji: string;
  placements: { row: number; col: number; plantSlug: string }[];
  reasoning: PlacementDetail[];
  raisedBedReplant: RaisedBedOption;
  bestPairing?: CrossSystemPairing;
  stats: {
    totalPlants: number;
    uniqueVarieties: number;
    companionPairs: number;
    estimatedYieldKg: number;
    estimatedValueGBP: number;
  };
}

function zoneLabel(row: number, col: number): string {
  if (row <= 2 && col >= 1 && col <= 5) return 'Conservatory (filtered light, frost-free)';
  if (row >= 19 && row <= 20 && col >= 5 && col <= 8) return 'Raised bed (partial shade, near hedge)';
  if (row >= 21 && row <= 22 && col >= 5 && col <= 8) return 'Back veg patch';
  if (col >= 18) return 'Right fence border';
  if (col === 0) return 'West border';
  return 'Garden';
}

/**
 * Generate layout options targeting ACTUAL plantable in-ground areas.
 * Fence border: 3 slots between Cordylines (col 18, rows 8/12/16).
 * Raised bed: 8 cells (rows 19-20, cols 5-8).
 * Back veg patches: rows 21-22, cols 5-8.
 */
export function generateEsherLayouts(): EsherLayoutOption[] {
  return [
    // ═══ TOP PICK: RHS Expert's Choice for Esher Avenue ═══════════════════════
    {
      id: 'expert-choice',
      name: "RHS Expert's Choice",
      emoji: '⭐',
      description:
        'Our top recommendation for 21 Esher Avenue IN-GROUND areas. Full-size varietals for open ground — NOT the dwarf/container varieties used on GreenStalks.\n\n' +
        'Fence border: Scarlet Emperor runner bean (RHS AGM, full-size climber to 2.5m — NOT suitable for GreenStalk) trained up the 6ft fence panels. Spencer Mix sweet pea for pollinators and cut flowers.\n\n' +
        'Raised bed "daily salad bar": Wild Rocket (perennial ground cover, not the annual salad type), Little Gem + Salad Bowl lettuce (full heads, not baby leaf), Perpetual Spinach (a leaf beet that grows 60cm tall — too big for pockets), White Lisbon spring onion, French Breakfast radish. All chosen specifically for the dappled shade cast by the 3-4m laurel hedge.\n\n' +
        'Conservatory (LOW LIGHT — ~2-3h effective): NW-facing Victorian glass filters out most UV. NO sun-loving crops here (no tomatoes, basil, or citrus long-term). Used as a seed-starting station Apr-May, then shade-tolerant herbs year-round: fern, mint, lemon balm, parsley, coriander (actually prefers shade — bolts in sun), chives.\n\n' +
        'Raised bed (SLUG RISK): Only 10cm/4" off ground — slugs walk right in from the damp hedge. Every other plant is an allium (spring onion, chives) whose scent deters slugs. Add copper tape around the bed edges and beer traps at corners.',
      placements: [
        // Fence border
        { row: 8, col: 18, plantSlug: 'runner-bean' },
        { row: 12, col: 18, plantSlug: 'runner-bean' },
        { row: 16, col: 18, plantSlug: 'dwarf-sweet-pea' },
        // Conservatory — LOW LIGHT, shade-tolerant herbs only
        { row: 1, col: 1, plantSlug: 'fern-hardy' },
        { row: 1, col: 3, plantSlug: 'mint' },
        { row: 1, col: 5, plantSlug: 'lemon-balm' },
        { row: 2, col: 1, plantSlug: 'parsley' },
        { row: 2, col: 3, plantSlug: 'coriander' },
        { row: 2, col: 5, plantSlug: 'chives' },
      ],
      reasoning: [
        { plantSlug: 'runner-bean', plantName: 'Runner Bean (Scarlet Emperor)', row: 8, col: 18, zone: zoneLabel(8, 18), reasons: [
          'Varietal: Scarlet Emperor — RHS AGM, the classic UK runner, reliably crops in cooler summers',
          'Climbs fence panel — vertical growing maximises limited planting space',
          'Nitrogen-fixing roots improve impoverished fence border soil over the season',
          'Red flowers attract pollinators to the whole garden',
        ]},
        { plantSlug: 'runner-bean', plantName: 'Runner Bean (Scarlet Emperor)', row: 12, col: 18, zone: zoneLabel(12, 18), reasons: [
          'Second plant staggers the harvest — pick for 10+ weeks July to October',
          'Between Cordylines gives a sheltered microclimate that extends the season',
          'Two plants produce 5-8kg of beans — saves £30-40 vs supermarket',
        ]},
        { plantSlug: 'dwarf-sweet-pea', plantName: 'Sweet Pea (Spencer Mix)', row: 16, col: 18, zone: zoneLabel(16, 18), reasons: [
          'Varietal: Spencer Mix — the quintessential cottage garden variety, heavily scented',
          'Pollinator magnet — attracts bees to the GreenStalks on the adjacent patio',
          'Cut flower supply for the house — the more you cut, the more they flower',
          'Near patio seating area — fragrance drifts to where you sit in the evening',
        ]},
        // Conservatory — LOW LIGHT zone, NW-facing, ~2-3h effective growing light
        // Glass filters UV. Only shade-tolerant herbs that DON'T need direct sun.
        // Used as seed starting station Apr-May, then permanent shade herbs.
        { plantSlug: 'fern-hardy', plantName: 'Hardy Fern', row: 1, col: 1, zone: 'Conservatory (low light)', reasons: [
          'Zero sun requirement — thrives in the darkest corner',
          'Architectural foliage adds greenery where nothing else grows',
          'Native UK plant, fully hardy, maintenance-free',
        ]},
        { plantSlug: 'mint', plantName: 'Mint (in pot)', row: 1, col: 3, zone: 'Conservatory (low light)', reasons: [
          'MUST stay in a pot — mint is invasive and will take over any bed',
          'One of the most shade-tolerant herbs — actively prefers filtered light',
          'Accessible for kitchen year-round, renter-safe: contained',
        ]},
        { plantSlug: 'lemon-balm', plantName: 'Lemon Balm', row: 1, col: 5, zone: 'Conservatory (low light)', reasons: [
          'RHS: "thrives in partial to full shade" — one of few herbs that prefers it',
          'Citrus-lemon scent for tea, cooking, and fragrance',
          'Grow in pot to contain spreading — same family as mint',
        ]},
        { plantSlug: 'parsley', plantName: 'Flat-leaf Parsley', row: 2, col: 1, zone: 'Conservatory (low light)', reasons: [
          'Tolerates shade well — grows in woodland edges in the wild',
          'Slow to germinate (2-3 weeks) but conservatory warmth helps',
          'Cut-and-come-again, high-value (£18/kg vs supermarket)',
        ]},
        { plantSlug: 'coriander', plantName: 'Coriander (Calypso)', row: 2, col: 3, zone: 'Conservatory (low light)', reasons: [
          'Varietal: Calypso — bolt-resistant, bred for leaf not seed',
          'Shade is actually IDEAL — coriander bolts immediately in full sun',
          'The conservatory is the best spot in the whole garden for coriander',
        ]},
        { plantSlug: 'chives', plantName: 'Chives', row: 2, col: 5, zone: 'Conservatory (low light)', reasons: [
          'Tolerates partial shade, evergreen through winter in conservatory',
          'Allium scent deters pests from other conservatory herbs',
          'Edible purple flowers in spring — ornamental and culinary',
        ]},
      ],
      raisedBedReplant: {
        rationale: 'Transform the shade bed into a "daily salad bar". SLUG STRATEGY: Bed is only 10cm/4" high — slugs from the damp hedge are the #1 threat. Every other position is an allium (spring onion) whose scent deters slugs. Add copper tape (£5 from garden centre) around the metal edging. Set beer traps at each corner. All crops shade-tolerant — the 3-4m laurel hedge gives only 3-4h direct sun, but lettuce and rocket actually PREFER this (they bolt in full sun).',
        placements: [
          { row: 19, col: 5, plantSlug: 'rocket' }, { row: 19, col: 6, plantSlug: 'lettuce' },
          { row: 19, col: 7, plantSlug: 'spring-onion' }, { row: 19, col: 8, plantSlug: 'radish' },
          { row: 20, col: 5, plantSlug: 'lettuce' }, { row: 20, col: 6, plantSlug: 'perpetual-spinach' },
          { row: 20, col: 7, plantSlug: 'spring-onion' }, { row: 20, col: 8, plantSlug: 'rocket' },
        ],
        details: [
          { plantSlug: 'rocket', plantName: 'Wild Rocket (Diplotaxis tenuifolia)', row: 19, col: 5, zone: zoneLabel(19, 5), reasons: ['Varietal: Wild Rocket — perennial, stronger flavour than salad rocket, cut-and-come-again for 2+ years', 'Thrives in partial shade (3-4h sun here) — BOLTS in full sun', 'First harvest 28 days from sowing, then every 2-3 weeks', '⚠️ SLUG TARGET: peppery leaves attract slugs — relies on neighbouring alliums + copper tape'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce (Little Gem)', row: 19, col: 6, zone: zoneLabel(19, 6), reasons: ['Varietal: Little Gem — RHS "reliable and compact", mini cos, sweet and crunchy', 'Bolt-resistant — partial shade here (3-4h) actually helps prevent bolting', '⚠️ SLUG TARGET: lettuce is slug favourite — flanked by spring onion allium barrier', 'Perfect size for Max and Noelle to pick whole heads'] },
          { plantSlug: 'spring-onion', plantName: 'Spring Onion (White Lisbon)', row: 19, col: 7, zone: zoneLabel(19, 7), reasons: ['Varietal: White Lisbon — the UK standard, RHS "reliable and fast"', 'Allium scent is a natural slug deterrent — critical near the damp hedge', 'Direct sow every 3 weeks for continuous supply May-October'] },
          { plantSlug: 'radish', plantName: 'Radish (French Breakfast)', row: 19, col: 8, zone: zoneLabel(19, 8), reasons: ['Varietal: French Breakfast — elongated red/white, milder than Cherry Belle', 'Fastest crop in the garden: 25 days seed to plate', 'Succession-sow every 2 weeks for continuous "treasure hunts" with Max'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce (Salad Bowl)', row: 20, col: 5, zone: zoneLabel(20, 5), reasons: ['Varietal: Salad Bowl — RHS "excellent cut-and-come-again", oak-leaf type', 'Different leaf shape from Little Gem gives salad variety'] },
          { plantSlug: 'perpetual-spinach', plantName: 'Perpetual Spinach (Leaf Beet)', row: 20, col: 6, zone: zoneLabel(20, 6), reasons: ['NOT true spinach — it\'s a leaf beet (Beta vulgaris)', 'BBC Gardeners\' World "most forgiving green"', 'SLUG-RESISTANT: tough waxy leaves that slugs avoid'] },
          { plantSlug: 'spring-onion', plantName: 'Spring Onion', row: 20, col: 7, zone: zoneLabel(20, 7), reasons: ['Second allium barrier — extends slug protection', 'Harvest in 8-10 weeks'] },
          { plantSlug: 'rocket', plantName: 'Wild Rocket', row: 20, col: 8, zone: zoneLabel(20, 8), reasons: ['Second rocket for larger harvests', 'Perennial — comes back next year without replanting'] },
        ],
      },
      stats: { totalPlants: 17, uniqueVarieties: 10, companionPairs: 8, estimatedYieldKg: 8, estimatedValueGBP: 70 },
    },

    // ═══ 2. Maximum Food from Limited Space ════════════════════════════════════
    {
      id: 'max-food',
      name: 'Maximum Food from Limited Space',
      emoji: '🥗',
      description: 'Replant the raised bed with shade-tolerant salad crops and quick-harvest veg. Climbing beans on the fence. Most food production is on GreenStalks — this maximises the in-ground supplement.',
      placements: [
        { row: 8, col: 18, plantSlug: 'runner-bean' },
        { row: 12, col: 18, plantSlug: 'runner-bean' },
        { row: 16, col: 18, plantSlug: 'dwarf-sweet-pea' },
      ],
      reasoning: [
        { plantSlug: 'runner-bean', plantName: 'Runner Bean', row: 8, col: 18, zone: zoneLabel(8, 18), reasons: ['Climbs fence panel — vertical growing maximises space', 'Nitrogen-fixing roots improve fence border soil', 'Replaces sweet pea slot with food production'] },
        { plantSlug: 'runner-bean', plantName: 'Runner Bean', row: 12, col: 18, zone: zoneLabel(12, 18), reasons: ['Second fence climber for staggered harvesting', 'Between Cordylines gives sheltered microclimate'] },
        { plantSlug: 'dwarf-sweet-pea', plantName: 'Sweet Pea', row: 16, col: 18, zone: zoneLabel(16, 18), reasons: ['Keep one sweet pea for pollinator attraction', 'Fragrance near back patio seating area'] },
      ],
      raisedBedReplant: {
        rationale: 'Shade-tolerant salad crops. The hedge provides dappled shade ideal for lettuce and rocket that would bolt in full sun.',
        placements: [
          { row: 19, col: 5, plantSlug: 'lettuce' }, { row: 19, col: 6, plantSlug: 'rocket' },
          { row: 19, col: 7, plantSlug: 'spring-onion' }, { row: 19, col: 8, plantSlug: 'radish' },
          { row: 20, col: 5, plantSlug: 'rocket' }, { row: 20, col: 6, plantSlug: 'lettuce' },
          { row: 20, col: 7, plantSlug: 'radish' }, { row: 20, col: 8, plantSlug: 'spinach' },
        ],
        details: [
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 19, col: 5, zone: zoneLabel(19, 5), reasons: ['Shade-tolerant — hedge dappled light prevents bolting', 'Cut-and-come-again for continuous harvest'] },
          { plantSlug: 'rocket', plantName: 'Rocket', row: 19, col: 6, zone: zoneLabel(19, 6), reasons: ['Thrives in partial shade, bolts in full sun', '28-day harvest, £12/kg shop value'] },
          { plantSlug: 'spring-onion', plantName: 'Spring Onion', row: 19, col: 7, zone: zoneLabel(19, 7), reasons: ['Allium scent deters slugs — key pest near hedge', 'Narrow profile interplants well'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 19, col: 8, zone: zoneLabel(19, 8), reasons: ['Fastest crop: 25 days to harvest', 'Succession-sow 3-4 times per season'] },
          { plantSlug: 'rocket', plantName: 'Rocket', row: 20, col: 5, zone: zoneLabel(20, 5), reasons: ['Second rocket for larger harvests', 'Perennial wild rocket comes back next year'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 20, col: 6, zone: zoneLabel(20, 6), reasons: ['Second lettuce for daily salad supply', 'Quick 30-day harvest cycle'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 20, col: 7, zone: zoneLabel(20, 7), reasons: ['Stagger sowing with row above', 'Breaks up raised bed soil'] },
          { plantSlug: 'spinach', plantName: 'Spinach', row: 20, col: 8, zone: zoneLabel(20, 8), reasons: ['Shade-loving crop — ideal near hedge', 'High nutritional value, continuous picking'] },
        ],
      },
      stats: { totalPlants: 11, uniqueVarieties: 7, companionPairs: 4, estimatedYieldKg: 6, estimatedValueGBP: 50 },
    },

    // ═══ 2. Kids' Discovery Garden ════════════════════════════════════════════
    {
      id: 'kid-friendly',
      name: "Kids' Discovery Garden",
      emoji: '👨‍👧‍👦',
      description: "Fill the raised bed with things Max and Noelle can pick: strawberries, radishes (treasure hunting!), lettuce they can tear. Sunflower race on the fence. Most kid-crops are on the GreenStalks at perfect picking height.",
      placements: [
        { row: 8, col: 18, plantSlug: 'sunflower' },
        { row: 12, col: 18, plantSlug: 'sunflower' },
        { row: 16, col: 18, plantSlug: 'nasturtium' },
      ],
      reasoning: [
        { plantSlug: 'sunflower', plantName: 'Sunflower', row: 8, col: 18, zone: zoneLabel(8, 18), reasons: ['Height race: "whose sunflower is tallest?"', 'Dramatic daily growth captures kids\' attention'] },
        { plantSlug: 'sunflower', plantName: 'Sunflower', row: 12, col: 18, zone: zoneLabel(12, 18), reasons: ['One for Max, one for Noelle', 'Seeds at season end = bird feeding activity'] },
        { plantSlug: 'nasturtium', plantName: 'Nasturtium', row: 16, col: 18, zone: zoneLabel(16, 18), reasons: ['Bright orange flowers kids can freely pick', 'Edible petals — fun "eating flowers" moment'] },
      ],
      raisedBedReplant: {
        rationale: 'Kid-friendly bed: strawberries for daily picking, radishes for treasure-hunting, peas for sweet snacking. All at raised-bed height — perfect for Noelle (age 3).',
        placements: [
          { row: 19, col: 5, plantSlug: 'strawberry-everbearing' }, { row: 19, col: 6, plantSlug: 'strawberry-everbearing' },
          { row: 19, col: 7, plantSlug: 'radish' }, { row: 19, col: 8, plantSlug: 'pea' },
          { row: 20, col: 5, plantSlug: 'radish' }, { row: 20, col: 6, plantSlug: 'strawberry-everbearing' },
          { row: 20, col: 7, plantSlug: 'strawberry-everbearing' }, { row: 20, col: 8, plantSlug: 'lettuce' },
        ],
        details: [
          { plantSlug: 'strawberry-everbearing', plantName: 'Strawberry', row: 19, col: 5, zone: zoneLabel(19, 5), reasons: ['#1 kid-favourite fruit', 'Everbearing = berries all summer long'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Strawberry', row: 19, col: 6, zone: zoneLabel(19, 6), reasons: ['Berry patch feel — multiple plants together', 'Kids can count daily harvest'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 19, col: 7, zone: zoneLabel(19, 7), reasons: ['Pull-up-and-eat treasure hunt', '25 days to harvest — instant gratification'] },
          { plantSlug: 'pea', plantName: 'Pea', row: 19, col: 8, zone: zoneLabel(19, 8), reasons: ['Sugar snap peas eaten straight from pod', 'Sweet taste — kids love them'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 20, col: 5, zone: zoneLabel(20, 5), reasons: ['Stagger sowing for continuous treasure hunts', 'Colourful varieties keep kids engaged'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Strawberry', row: 20, col: 6, zone: zoneLabel(20, 6), reasons: ['Three strawberry plants total', 'Continuous harvest June-September'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Strawberry', row: 20, col: 7, zone: zoneLabel(20, 7), reasons: ['Four strawberry plants across the bed', 'Raised bed height perfect for Noelle'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 20, col: 8, zone: zoneLabel(20, 8), reasons: ['Tear-and-eat leaves for dinner salad', 'Teaches "food grows back" lesson'] },
        ],
      },
      stats: { totalPlants: 11, uniqueVarieties: 5, companionPairs: 3, estimatedYieldKg: 4, estimatedValueGBP: 35 },
    },

    // ═══ 3. Fragrant Shade Garden ═════════════════════════════════════════════
    {
      id: 'fragrant-edible',
      name: 'Fragrant Shade Garden',
      emoji: '🌸',
      description: "Transform the raised bed into a scented herb garden. Shade-tolerant aromatics at nose height near the patio seating area. Evening fragrance from night-scented stock. Sweet peas on the fence for cutting.",
      placements: [
        { row: 8, col: 18, plantSlug: 'dwarf-sweet-pea' },
        { row: 12, col: 18, plantSlug: 'dwarf-sweet-pea' },
        { row: 16, col: 18, plantSlug: 'dwarf-sweet-pea' },
      ],
      reasoning: [
        { plantSlug: 'dwarf-sweet-pea', plantName: 'Sweet Pea', row: 8, col: 18, zone: zoneLabel(8, 18), reasons: ['Classic cottage garden scent', 'Climbs fence — vertical fragrance wall'] },
        { plantSlug: 'dwarf-sweet-pea', plantName: 'Sweet Pea', row: 12, col: 18, zone: zoneLabel(12, 18), reasons: ['Cut flower supply for the house', 'More cutting = more flowering'] },
        { plantSlug: 'dwarf-sweet-pea', plantName: 'Sweet Pea', row: 16, col: 18, zone: zoneLabel(16, 18), reasons: ['Near patio — fragrance drifts to seating area', 'Three positions create a scented fence line'] },
      ],
      raisedBedReplant: {
        rationale: 'Scented herb garden at raised-bed height — brush-past fragrance near the patio. Shade-tolerant aromatics that thrive under hedge canopy.',
        placements: [
          { row: 19, col: 5, plantSlug: 'chamomile' }, { row: 19, col: 6, plantSlug: 'lemon-balm' },
          { row: 19, col: 7, plantSlug: 'lavender' }, { row: 19, col: 8, plantSlug: 'thyme' },
          { row: 20, col: 5, plantSlug: 'night-scented-stock' }, { row: 20, col: 6, plantSlug: 'rosemary' },
          { row: 20, col: 7, plantSlug: 'scented-geranium' }, { row: 20, col: 8, plantSlug: 'night-scented-stock' },
        ],
        details: [
          { plantSlug: 'chamomile', plantName: 'Chamomile', row: 19, col: 5, zone: zoneLabel(19, 5), reasons: ['Apple scent at raised-bed height', 'Makes soothing herbal tea'] },
          { plantSlug: 'lemon-balm', plantName: 'Lemon Balm', row: 19, col: 6, zone: zoneLabel(19, 6), reasons: ['Citrus burst when leaves brushed', 'Raised bed contains spreading habit'] },
          { plantSlug: 'lavender', plantName: 'Lavender', row: 19, col: 7, zone: zoneLabel(19, 7), reasons: ['Classic calming fragrance', 'Bee magnet — pollinator attractor'] },
          { plantSlug: 'thyme', plantName: 'Thyme', row: 19, col: 8, zone: zoneLabel(19, 8), reasons: ['Aromatic culinary herb', 'Slug deterrent for raised bed'] },
          { plantSlug: 'night-scented-stock', plantName: 'Night-Scented Stock', row: 20, col: 5, zone: zoneLabel(20, 5), reasons: ['Releases sweet scent after sunset', 'Position near patio for evening enjoyment'] },
          { plantSlug: 'rosemary', plantName: 'Rosemary', row: 20, col: 6, zone: zoneLabel(20, 6), reasons: ['Strong aromatic oils, evergreen structure', 'Culinary herb and pest deterrent'] },
          { plantSlug: 'scented-geranium', plantName: 'Scented Geranium', row: 20, col: 7, zone: zoneLabel(20, 7), reasons: ['Rose-lemon scent on touch', 'Textured leaves release fragrance'] },
          { plantSlug: 'night-scented-stock', plantName: 'Night-Scented Stock', row: 20, col: 8, zone: zoneLabel(20, 8), reasons: ['Second stock for evening scent coverage', 'Spectacular fragrance at dusk'] },
        ],
      },
      stats: { totalPlants: 11, uniqueVarieties: 8, companionPairs: 5, estimatedYieldKg: 1, estimatedValueGBP: 20 },
    },

    // ═══ 4. Companion Protection Shield ═══════════════════════════════════════
    {
      id: 'companion-fortress',
      name: 'Companion Protection Shield',
      emoji: '🛡️',
      description: 'Fill the raised bed with companion herbs that radiate pest protection to both GreenStalks and the fence border. A defensive "control centre" of alliums, aromatics, and trap crops.',
      placements: [
        { row: 8, col: 18, plantSlug: 'nasturtium' },
        { row: 12, col: 18, plantSlug: 'runner-bean' },
        { row: 16, col: 18, plantSlug: 'nasturtium' },
      ],
      reasoning: [
        { plantSlug: 'nasturtium', plantName: 'Nasturtium', row: 8, col: 18, zone: zoneLabel(8, 18), reasons: ['Aphid trap crop — lures pests away from Cordylines', 'Sacrificial plant protecting fence border'] },
        { plantSlug: 'runner-bean', plantName: 'Runner Bean', row: 12, col: 18, zone: zoneLabel(12, 18), reasons: ['Nitrogen-fixer enriches fence border soil', 'Food crop among the companion plants'] },
        { plantSlug: 'nasturtium', plantName: 'Nasturtium', row: 16, col: 18, zone: zoneLabel(16, 18), reasons: ['Second trap crop near patio end', 'Draws aphids away from GreenStalks'] },
      ],
      raisedBedReplant: {
        rationale: 'A companion "control centre" — protective herbs and alliums that shield both GreenStalks and the fence border from pests. Radiating protection from the centre of the garden.',
        placements: [
          { row: 19, col: 5, plantSlug: 'chives' }, { row: 19, col: 6, plantSlug: 'basil-sweet' },
          { row: 19, col: 7, plantSlug: 'marigold' }, { row: 19, col: 8, plantSlug: 'nasturtium' },
          { row: 20, col: 5, plantSlug: 'rosemary' }, { row: 20, col: 6, plantSlug: 'oregano' },
          { row: 20, col: 7, plantSlug: 'calendula' }, { row: 20, col: 8, plantSlug: 'borage' },
        ],
        details: [
          { plantSlug: 'chives', plantName: 'Chives', row: 19, col: 5, zone: zoneLabel(19, 5), reasons: ['Allium barrier — deters aphids and grey mould', 'Scent radiates to nearby GreenStalks'] },
          { plantSlug: 'basil-sweet', plantName: 'Sweet Basil', row: 19, col: 6, zone: zoneLabel(19, 6), reasons: ['Whitefly deterrent — protects tomatoes on GreenStalks', 'Aromatic shield effect'] },
          { plantSlug: 'marigold', plantName: 'Marigold', row: 19, col: 7, zone: zoneLabel(19, 7), reasons: ['Root nematode deterrent', 'Attracts hoverflies (aphid predators)'] },
          { plantSlug: 'nasturtium', plantName: 'Nasturtium', row: 19, col: 8, zone: zoneLabel(19, 8), reasons: ['Aphid trap — draws pests away from crops', 'Edible flowers as bonus'] },
          { plantSlug: 'rosemary', plantName: 'Rosemary', row: 20, col: 5, zone: zoneLabel(20, 5), reasons: ['Strong scent disrupts pest navigation', 'Evergreen — year-round protection'] },
          { plantSlug: 'oregano', plantName: 'Oregano', row: 20, col: 6, zone: zoneLabel(20, 6), reasons: ['Carvacrol oils deter many insect pests', 'Mediterranean herb thrives in raised bed'] },
          { plantSlug: 'calendula', plantName: 'Calendula', row: 20, col: 7, zone: zoneLabel(20, 7), reasons: ['Attracts beneficial insects (ladybirds, hoverflies)', 'Sticky stems trap whitefly'] },
          { plantSlug: 'borage', plantName: 'Borage', row: 20, col: 8, zone: zoneLabel(20, 8), reasons: ['Major bee attractor for pollination', 'Deters tomato hornworm'] },
        ],
      },
      stats: { totalPlants: 11, uniqueVarieties: 8, companionPairs: 8, estimatedYieldKg: 2, estimatedValueGBP: 20 },
    },
  ];
}

// ─── Dynamic paired layout based on actual GreenStalk contents ──────────────

const FENCE_SLOTS = [
  { row: 8, col: 18 },
  { row: 12, col: 18 },
  { row: 16, col: 18 },
];

const BED_CELLS = [
  { row: 21, col: 7 }, { row: 21, col: 8 }, { row: 21, col: 9 },
  { row: 21, col: 10 }, { row: 21, col: 11 }, { row: 21, col: 12 },
  { row: 22, col: 7 }, { row: 22, col: 8 }, { row: 22, col: 9 },
  { row: 22, col: 10 }, { row: 22, col: 11 }, { row: 22, col: 12 },
];

/**
 * Generate a custom in-ground layout optimised to complement the user's
 * ACTUAL GreenStalk tower contents.
 *
 * Scoring per candidate plant:
 *   +5 for each friend relationship with a tower plant
 *   -8 for each foe relationship with a tower plant
 *   +3 if NOT already in the towers (diversity bonus)
 *   +2 if shade-tolerant (for raised bed near hedge)
 *   +2 if climbing habit (for fence border slots)
 */
export function generatePairedLayout(
  actualTowerSlugs: string[],
  plants: Plant[],
  companionMap: CompanionMap
): EsherLayoutOption {
  const towerSet = new Set(actualTowerSlugs);
  const uniqueTowerSlugs = [...towerSet];

  // Score every available plant
  function scoreForBed(plant: Plant): number {
    let score = 0;
    const friends = getFriends(plant.slug, uniqueTowerSlugs, companionMap);
    const foes = getConflicts(plant.slug, uniqueTowerSlugs, companionMap);
    score += friends.length * 5;
    score -= foes.length * 8;
    if (!towerSet.has(plant.slug)) score += 3; // diversity bonus
    if (plant.sun === 'partial-shade' || plant.sun === 'full-shade') score += 2; // shade tolerance
    // Penalise plants unsuitable for containers/raised beds
    if (plant.greenstalkSuitability === 'unsuitable' && plant.growthHabit === 'climbing') score -= 2;
    return score;
  }

  function scoreForFence(plant: Plant): number {
    let score = 0;
    const friends = getFriends(plant.slug, uniqueTowerSlugs, companionMap);
    const foes = getConflicts(plant.slug, uniqueTowerSlugs, companionMap);
    score += friends.length * 5;
    score -= foes.length * 8;
    if (!towerSet.has(plant.slug)) score += 3;
    if (plant.growthHabit === 'climbing') score += 4; // climbing bonus for fence
    return score;
  }

  // Get top plants for each zone
  const bedCandidates = [...plants]
    .map((p) => ({ plant: p, score: scoreForBed(p) }))
    .sort((a, b) => b.score - a.score);

  const fenceCandidates = [...plants]
    .map((p) => ({ plant: p, score: scoreForFence(p) }))
    .sort((a, b) => b.score - a.score);

  // Pick unique plants (no duplicates across zones)
  const used = new Set<string>();
  const fencePicks: { plant: Plant; score: number }[] = [];
  for (const c of fenceCandidates) {
    if (fencePicks.length >= FENCE_SLOTS.length) break;
    if (!used.has(c.plant.slug)) {
      fencePicks.push(c);
      used.add(c.plant.slug);
    }
  }

  const bedPicks: { plant: Plant; score: number }[] = [];
  for (const c of bedCandidates) {
    if (bedPicks.length >= BED_CELLS.length) break;
    if (!used.has(c.plant.slug) || bedPicks.length >= 6) {
      // Allow some repeats in the 12-cell bed (e.g., multiple lettuce)
      bedPicks.push(c);
      used.add(c.plant.slug);
    }
  }

  // Build placements
  const placements: { row: number; col: number; plantSlug: string }[] = [];
  const reasoning: PlacementDetail[] = [];

  // Fence placements
  for (let i = 0; i < FENCE_SLOTS.length && i < fencePicks.length; i++) {
    const slot = FENCE_SLOTS[i];
    const pick = fencePicks[i];
    const friends = getFriends(pick.plant.slug, uniqueTowerSlugs, companionMap);
    placements.push({ ...slot, plantSlug: pick.plant.slug });
    reasoning.push({
      plantSlug: pick.plant.slug,
      plantName: pick.plant.commonName,
      row: slot.row,
      col: slot.col,
      zone: zoneLabel(slot.row, slot.col),
      reasons: [
        friends.length > 0
          ? `Companion to your tower plants: ${friends.map((f) => f.reason).slice(0, 2).join('; ')}`
          : 'Adds diversity to complement your GreenStalk crops',
        pick.plant.growthHabit === 'climbing'
          ? 'Climbing habit — trains up the fence panel'
          : 'Fits between existing Cordylines in the border',
      ],
    });
  }

  // Raised bed placements
  const bedDetails: PlacementDetail[] = [];
  const bedPlants: { row: number; col: number; plantSlug: string }[] = [];
  for (let i = 0; i < BED_CELLS.length && i < bedPicks.length; i++) {
    const cell = BED_CELLS[i];
    const pick = bedPicks[i];
    const friends = getFriends(pick.plant.slug, uniqueTowerSlugs, companionMap);
    const foes = getConflicts(pick.plant.slug, uniqueTowerSlugs, companionMap);
    bedPlants.push({ ...cell, plantSlug: pick.plant.slug });
    bedDetails.push({
      plantSlug: pick.plant.slug,
      plantName: pick.plant.commonName,
      row: cell.row,
      col: cell.col,
      zone: zoneLabel(cell.row, cell.col),
      reasons: [
        friends.length > 0
          ? `Companions your towers: ${friends.map((f) => f.reason).slice(0, 2).join('; ')}`
          : `Adds ${pick.plant.category} variety your towers don't have`,
        towerSet.has(pick.plant.slug)
          ? 'Also in your GreenStalks — grows bigger in ground'
          : 'Not in your towers — maximises crop diversity',
        foes.length > 0
          ? `⚠️ Watch: ${foes[0].reason}`
          : pick.plant.sun !== 'full-sun'
            ? 'Shade-tolerant — ideal for hedge-side raised bed'
            : 'Tolerates the partial shade near the hedge',
      ],
    });
  }

  // Count companion pairs
  const allPlacedSlugs = [...placements.map((p) => p.plantSlug), ...bedPlants.map((p) => p.plantSlug)];
  let companionPairs = 0;
  for (const slug of allPlacedSlugs) {
    companionPairs += getFriends(slug, uniqueTowerSlugs, companionMap).length;
  }

  const towerNames = uniqueTowerSlugs
    .slice(0, 5)
    .map((s) => plants.find((p) => p.slug === s)?.commonName ?? s)
    .join(', ');
  const moreCount = uniqueTowerSlugs.length > 5 ? ` +${uniqueTowerSlugs.length - 5} more` : '';

  return {
    id: 'paired-with-towers',
    name: 'Paired with Your GreenStalks',
    emoji: '🤝',
    description: `Custom layout generated from your actual tower plants (${towerNames}${moreCount}). Every pick chosen to complement what's already growing.`,
    placements,
    reasoning,
    raisedBedReplant: {
      rationale: `Replant raised bed with crops that companion your GreenStalk plants — ${companionPairs} companion benefits across systems.`,
      placements: bedPlants,
      details: bedDetails,
    },
    stats: {
      totalPlants: placements.length + bedPlants.length,
      uniqueVarieties: new Set([...placements.map((p) => p.plantSlug), ...bedPlants.map((p) => p.plantSlug)]).size,
      companionPairs,
      estimatedYieldKg: 0, // Dynamic — can't pre-calculate
      estimatedValueGBP: 0,
    },
  };
}
