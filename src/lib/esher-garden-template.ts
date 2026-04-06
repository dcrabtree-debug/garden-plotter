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

  // ── House wall (rows 0-1) ──
  for (let c = 0; c < cols; c++) {
    overrides.push({ row: 0, col: c, type: 'patio' });
    overrides.push({ row: 1, col: c, type: 'patio' });
  }

  // ── Conservatory (SW corner: rows 0-2, cols 0-5) ──
  // West side of house. Glass room, French doors to garden.
  for (let r = 0; r <= 2; r++) {
    for (let c = 0; c <= 5; c++) {
      overrides.push({ row: r, col: c, type: 'conservatory', label: 'Conservatory' });
    }
  }
  // Pre-populate conservatory with suitable plants
  overrides.push({ row: 1, col: 1, type: 'conservatory', plantSlug: 'dwarf-lemon', label: 'Conservatory' });
  overrides.push({ row: 1, col: 3, type: 'conservatory', plantSlug: 'dwarf-olive', label: 'Conservatory' });
  overrides.push({ row: 1, col: 5, type: 'conservatory', plantSlug: 'fern-hardy', label: 'Conservatory' });
  overrides.push({ row: 2, col: 1, type: 'conservatory', plantSlug: 'basil-sweet', label: 'Conservatory' });
  overrides.push({ row: 2, col: 3, type: 'conservatory', plantSlug: 'mint', label: 'Conservatory' });
  overrides.push({ row: 2, col: 5, type: 'conservatory', plantSlug: 'parsley', label: 'Conservatory' });

  // ── West boundary (col 0-1, rows 3-18) — established hedge/shrubs ──
  // 19A side. Dense mixed hedge, not closeboard fencing.
  for (let r = 3; r <= 18; r++) {
    overrides.push({ row: r, col: 0, type: 'flower-bed', label: 'Boundary hedge' });
    overrides.push({ row: r, col: 1, type: 'flower-bed', label: 'Shrub border' });
  }

  // ── East fence border (cols 18-19, rows 3-20) — Cordylines + Euphorbia ──
  for (let r = 3; r <= 20; r++) {
    overrides.push({ row: r, col: 19, type: 'flower-bed' });
    overrides.push({ row: r, col: 18, type: 'flower-bed' });
  }
  for (let r = 4; r <= 18; r += 3) {
    overrides.push({ row: r, col: 19, type: 'tree', label: 'Cordyline' });
  }
  for (let r = 6; r <= 18; r += 3) {
    overrides.push({ row: r, col: 18, type: 'flower-bed', label: 'Euphorbia' });
  }

  // ── Patio near conservatory doors (rows 2-3, cols 4-8) ──
  // Estate agent photo 5: paving slabs outside French doors
  for (let r = 2; r <= 3; r++) {
    for (let c = 4; c <= 8; c++) {
      overrides.push({ row: r, col: c, type: 'patio', label: 'Conservatory patio' });
    }
  }

  // ── Back area: NO large patio here — lawn extends to the back zone ──
  // Photos confirm: the lawn goes most of the way to the hedge.
  // Only hard surfaces in back are: old shed pavers (east) and shed pad (west).

  // ── Shed (rows 21-23, cols 3-5) — NORTHWEST corner ──
  // Photo-confirmed: wooden shed with felt roof, 4 windows, against the west hedge.
  // Visible in File_001 (back-left), Unknown-7 (close-up with hedge), Unknown-9 (close-up).
  for (let r = 21; r <= 23; r++) {
    for (let c = 3; c <= 5; c++) {
      overrides.push({ row: r, col: c, type: 'shed', label: 'Shed' });
    }
  }
  // Small concrete pad in front of shed
  overrides.push({ row: 20, col: 3, type: 'patio', label: 'Shed pad' });
  overrides.push({ row: 20, col: 4, type: 'patio', label: 'Shed pad' });
  overrides.push({ row: 20, col: 5, type: 'patio', label: 'Shed pad' });

  // ── Ornamental planting bed in front of hedge (rows 20-21, cols 6-8) ──
  // Photo Unknown-7: Aucuba (yellow-green), Acer (red), shrubs between shed and raised bed
  for (let r = 20; r <= 21; r++) {
    for (let c = 6; c <= 8; c++) {
      overrides.push({ row: r, col: c, type: 'flower-bed', label: 'Ornamental bed' });
    }
  }

  // ── Raised bed (rows 20-21, cols 9-13) — shade bed near hedge ──
  // Photo Unknown-8: black metal edging, hostas, ferns, shade plants.
  // Central-back area, in front of the laurel hedge. Gets dappled shade.
  for (let r = 20; r <= 21; r++) {
    for (let c = 9; c <= 13; c++) {
      overrides.push({ row: r, col: c, type: 'raised-bed' });
    }
  }

  // ── Old shed pavers — EAST side (rows 20-22, cols 16-19) ──
  // Photo Unknown-10: concrete pad where old shed was removed.
  // THIS is where the 2 GreenStalks go — ready-made hard surface.
  for (let r = 20; r <= 22; r++) {
    for (let c = 16; c <= 19; c++) {
      overrides.push({ row: r, col: c, type: 'patio', label: 'Old shed pavers' });
    }
  }

  // ── GreenStalk positions on old shed pavers (east side) ──
  // 2 GreenStalks only. Each is 2x2 cells (1m x 1m footprint).
  for (let r = 20; r <= 21; r++) {
    for (let c = 16; c <= 17; c++) {
      overrides.push({ row: r, col: c, type: 'greenstalk', label: 'GreenStalk 1' });
    }
  }
  for (let r = 20; r <= 21; r++) {
    for (let c = 18; c <= 19; c++) {
      overrides.push({ row: r, col: c, type: 'greenstalk', label: 'GreenStalk 2' });
    }
  }

  // ── Laurel/ivy hedge (rows 22-23) — NORTH boundary ──
  // Photo Unknown-7: very tall (3-4m), dense evergreen. Full width.
  for (let c = 0; c <= 19; c++) {
    overrides.push({ row: 23, col: c, type: 'tree', label: 'Laurel hedge' });
  }
  for (let c = 6; c <= 15; c++) {
    overrides.push({ row: 22, col: c, type: 'tree', label: 'Hedge canopy' });
  }

  // ── Back gate + fruit bushes (rows 21-22, cols 14-15) ──
  overrides.push({ row: 22, col: 14, type: 'path', label: 'Back gate' });
  overrides.push({ row: 22, col: 15, type: 'path', label: 'Back gate' });
  overrides.push({ row: 21, col: 14, type: 'flower-bed', plantSlug: 'gooseberry', label: 'Gooseberry' });
  overrides.push({ row: 21, col: 15, type: 'flower-bed', plantSlug: 'redcurrant', label: 'Redcurrant' });

  // ── Large deciduous tree overhanging from right (SE) side ──
  // Estate agent photos: massive tree canopy covers back-right quarter in afternoon
  for (let r = 14; r <= 19; r++) {
    overrides.push({ row: r, col: 19, type: 'tree', label: 'Overhanging tree' });
  }

  // ── Sweet peas on right fence ──
  overrides.push({ row: 8, col: 18, type: 'flower-bed', plantSlug: 'dwarf-sweet-pea' });
  overrides.push({ row: 12, col: 18, type: 'flower-bed', plantSlug: 'dwarf-sweet-pea' });
  overrides.push({ row: 16, col: 18, type: 'flower-bed', plantSlug: 'dwarf-sweet-pea' });

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
  if (row <= 2 && col <= 5) return 'Conservatory (filtered light, frost-free)';
  if (row >= 21 && row <= 22 && col >= 7 && col <= 12) return 'Raised bed (partial shade, near hedge)';
  if (col >= 18) return 'Right fence border';
  if (col === 0) return 'Left fence border';
  return 'Garden';
}

/**
 * Generate layout options targeting ACTUAL plantable in-ground areas.
 * Fence border: 3 slots between Cordylines (col 18, rows 8/12/16).
 * Raised bed replant: 12 cells (rows 21-22, cols 7-12) — shade-tolerant crops.
 */
export function generateEsherLayouts(): EsherLayoutOption[] {
  return [
    // ═══ TOP PICK: RHS Expert's Choice for Esher Avenue ═══════════════════════
    {
      id: 'expert-choice',
      name: "RHS Expert's Choice",
      emoji: '⭐',
      description:
        'Our top recommendation for 21 Esher Avenue in-ground areas. Specific varietals selected from RHS trials for Surrey clay, partial shade near the laurel hedge, and a late-May start. Runner beans (Scarlet Emperor — RHS AGM) on the fence for vertical growing + nitrogen fixing. Sweet pea (Spencer Mix) kept for pollinators and cut flowers.\n\n' +
        'Raised bed: shade-tolerant salad designed as a "cut-and-come-again salad bar" — Wild Rocket (perennial, peppery, £12/kg), Little Gem lettuce (bolt-resistant mini cos), Perpetual Spinach (BBC GW "most forgiving"), White Lisbon spring onion (slug deterrent via allium scent), French Breakfast radish (25 days, kids love the pull-and-eat treasure hunt). All chosen specifically for the dappled shade cast by the 3-4m laurel hedge.',
      placements: [
        // Fence border
        { row: 8, col: 18, plantSlug: 'runner-bean' },
        { row: 12, col: 18, plantSlug: 'runner-bean' },
        { row: 16, col: 18, plantSlug: 'dwarf-sweet-pea' },
        // Conservatory — seed starting + tender herbs + overwintering
        { row: 1, col: 1, plantSlug: 'basil-sweet' },
        { row: 1, col: 3, plantSlug: 'pepper-chilli' },
        { row: 1, col: 5, plantSlug: 'tomato-tumbling' },
        { row: 2, col: 1, plantSlug: 'parsley' },
        { row: 2, col: 3, plantSlug: 'coriander' },
        { row: 2, col: 5, plantSlug: 'mint' },
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
        { plantSlug: 'basil-sweet', plantName: 'Sweet Basil (Genovese)', row: 1, col: 1, zone: 'Conservatory', reasons: [
          'Conservatory gives the warmth basil demands — won\'t tolerate UK outdoor nights until June',
          'Start indoors April, move to GreenStalk tier 1 when nights stay above 10°C',
          'Companion to tomatoes on the same windowsill — both need warmth and light',
        ]},
        { plantSlug: 'pepper-chilli', plantName: 'Chilli Pepper', row: 1, col: 3, zone: 'Conservatory', reasons: [
          'Conservatory is the ONLY viable location — chillies need 20°C+ and long season',
          'Start Feb-Mar indoors, fruit from August. Overwinter in conservatory for year 2',
          'Kids love watching the colour change from green → red',
        ]},
        { plantSlug: 'tomato-tumbling', plantName: 'Tomato (seedlings)', row: 1, col: 5, zone: 'Conservatory', reasons: [
          'Start seedlings here, transplant to GreenStalk tier 2 when 15cm tall',
          'Conservatory gives the warmth for germination (18-25°C) that a windowsill can\'t guarantee',
          'Harden off for 7 days before moving outside',
        ]},
        { plantSlug: 'parsley', plantName: 'Flat-leaf Parsley', row: 2, col: 1, zone: 'Conservatory', reasons: [
          'Slow to germinate (2-3 weeks) — conservatory warmth speeds it up',
          'Move to GreenStalk tier 1 or raised bed once established',
          'Cut-and-come-again herb, high-value (£18/kg vs supermarket)',
        ]},
        { plantSlug: 'coriander', plantName: 'Coriander (Calypso)', row: 2, col: 3, zone: 'Conservatory', reasons: [
          'Varietal: Calypso — bolt-resistant, bred for leaf production not seed',
          'Conservatory shade prevents the bolting that kills coriander outdoors',
          'Succession sow every 3 weeks for continuous supply',
        ]},
        { plantSlug: 'mint', plantName: 'Mint (in pot)', row: 2, col: 5, zone: 'Conservatory', reasons: [
          'MUST stay in a pot — mint is invasive and will take over any bed',
          'Conservatory keeps it accessible for kitchen use year-round',
          'Renter-safe: contained, no risk to property',
        ]},
      ],
      raisedBedReplant: {
        rationale: 'Transform the shade bed into a "daily salad bar" — every variety chosen for the dappled shade under the 3-4m laurel hedge. These crops actually perform BETTER in shade (lettuce and rocket bolt in full sun). All are cut-and-come-again so you harvest daily without replanting.',
        placements: [
          { row: 21, col: 7, plantSlug: 'rocket' }, { row: 21, col: 8, plantSlug: 'lettuce' },
          { row: 21, col: 9, plantSlug: 'perpetual-spinach' }, { row: 21, col: 10, plantSlug: 'lettuce' },
          { row: 21, col: 11, plantSlug: 'spring-onion' }, { row: 21, col: 12, plantSlug: 'radish' },
          { row: 22, col: 7, plantSlug: 'lettuce' }, { row: 22, col: 8, plantSlug: 'rocket' },
          { row: 22, col: 9, plantSlug: 'radish' }, { row: 22, col: 10, plantSlug: 'spring-onion' },
          { row: 22, col: 11, plantSlug: 'perpetual-spinach' }, { row: 22, col: 12, plantSlug: 'rocket' },
        ],
        details: [
          { plantSlug: 'rocket', plantName: 'Wild Rocket (Diplotaxis tenuifolia)', row: 21, col: 7, zone: zoneLabel(21, 7), reasons: ['Varietal: Wild Rocket — perennial, stronger flavour than salad rocket, cut-and-come-again for 2+ years', 'Thrives in partial shade — BOLTS in full sun', 'First harvest 28 days from sowing, then every 2-3 weeks', '£12/kg in Waitrose — highest-value salad crop per m²'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce (Little Gem)', row: 21, col: 8, zone: zoneLabel(21, 8), reasons: ['Varietal: Little Gem — RHS "reliable and compact", mini cos, sweet and crunchy', 'Bolt-resistant — critical in shade where plants stress more', '50 days to harvest, or pick outer leaves from 30 days', 'Perfect size for Max and Noelle to pick whole heads'] },
          { plantSlug: 'perpetual-spinach', plantName: 'Perpetual Spinach (Leaf Beet)', row: 21, col: 9, zone: zoneLabel(21, 9), reasons: ['Varietal: Perpetual Spinach — NOT true spinach, it\'s a leaf beet (Beta vulgaris)', 'BBC Gardeners\' World "most forgiving green" — grows in any soil, any light', 'Won\'t bolt in summer like true spinach. Crops for 12-18 months from one sowing', 'Shade-tolerant, slug-resistant, and survives Surrey winters'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce (Salad Bowl)', row: 21, col: 10, zone: zoneLabel(21, 10), reasons: ['Varietal: Salad Bowl — RHS "excellent cut-and-come-again", oak-leaf type', 'Different leaf shape from Little Gem gives salad variety', 'Very slow to bolt — the most heat/shade-tolerant lettuce variety'] },
          { plantSlug: 'spring-onion', plantName: 'Spring Onion (White Lisbon)', row: 21, col: 11, zone: zoneLabel(21, 11), reasons: ['Varietal: White Lisbon — the UK standard, RHS "reliable and fast"', 'Allium scent is a natural slug deterrent — critical near the damp hedge', 'Direct sow every 3 weeks for continuous supply May-October', 'Narrow profile interplants perfectly between lettuce'] },
          { plantSlug: 'radish', plantName: 'Radish (French Breakfast)', row: 21, col: 12, zone: zoneLabel(21, 12), reasons: ['Varietal: French Breakfast — elongated red/white, milder than Cherry Belle', 'Fastest crop in the garden: 25 days seed to plate', 'Succession-sow every 2 weeks for continuous "treasure hunts" with Max', 'Roots break up compacted raised bed soil — natural cultivator'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce (Little Gem)', row: 22, col: 7, zone: zoneLabel(22, 7), reasons: ['Third lettuce for daily salad supply — 3 heads matures = one per week', 'Nearest hedge row — Little Gem tolerates the deepest shade'] },
          { plantSlug: 'rocket', plantName: 'Wild Rocket', row: 22, col: 8, zone: zoneLabel(22, 8), reasons: ['Second rocket position for larger harvests', 'Wild Rocket is perennial — comes back next year without replanting'] },
          { plantSlug: 'radish', plantName: 'Radish (Cherry Belle)', row: 22, col: 9, zone: zoneLabel(22, 9), reasons: ['Varietal: Cherry Belle — round, red, classic. Stagger sowing with French Breakfast above', 'Different shape gives kids variety in the treasure hunt'] },
          { plantSlug: 'spring-onion', plantName: 'Spring Onion (White Lisbon)', row: 22, col: 10, zone: zoneLabel(22, 10), reasons: ['Second allium barrier — extends slug protection across the bed', 'Harvest in 8-10 weeks, or use thinnings even earlier'] },
          { plantSlug: 'perpetual-spinach', plantName: 'Perpetual Spinach', row: 22, col: 11, zone: zoneLabel(22, 11), reasons: ['Second spinach for iron-rich greens — one for cooking, one for salads', 'Tolerates the shadiest position right next to the hedge'] },
          { plantSlug: 'rocket', plantName: 'Wild Rocket', row: 22, col: 12, zone: zoneLabel(22, 12), reasons: ['Third rocket — edge position for easy picking from the path side', 'Three rocket plants supply enough peppery leaves for daily salads all summer'] },
        ],
      },
      stats: { totalPlants: 21, uniqueVarieties: 12, companionPairs: 8, estimatedYieldKg: 12, estimatedValueGBP: 95 },
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
        rationale: 'Replace hostas with shade-tolerant salad crops. The hedge provides dappled shade ideal for lettuce and rocket that would bolt in full sun.',
        placements: [
          { row: 21, col: 7, plantSlug: 'lettuce' }, { row: 21, col: 8, plantSlug: 'rocket' },
          { row: 21, col: 9, plantSlug: 'spinach' }, { row: 21, col: 10, plantSlug: 'lettuce' },
          { row: 21, col: 11, plantSlug: 'spring-onion' }, { row: 21, col: 12, plantSlug: 'radish' },
          { row: 22, col: 7, plantSlug: 'rocket' }, { row: 22, col: 8, plantSlug: 'lettuce' },
          { row: 22, col: 9, plantSlug: 'radish' }, { row: 22, col: 10, plantSlug: 'spring-onion' },
          { row: 22, col: 11, plantSlug: 'spinach' }, { row: 22, col: 12, plantSlug: 'lettuce' },
        ],
        details: [
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 21, col: 7, zone: zoneLabel(21, 7), reasons: ['Shade-tolerant — hedge dappled light prevents bolting', 'Cut-and-come-again for continuous harvest'] },
          { plantSlug: 'rocket', plantName: 'Rocket', row: 21, col: 8, zone: zoneLabel(21, 8), reasons: ['Thrives in partial shade, bolts in full sun', '28-day harvest, £12/kg shop value'] },
          { plantSlug: 'spinach', plantName: 'Spinach', row: 21, col: 9, zone: zoneLabel(21, 9), reasons: ['Shade-loving crop — ideal for hedge-side bed', 'High nutritional value, continuous picking'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 21, col: 10, zone: zoneLabel(21, 10), reasons: ['Second lettuce variety for salad diversity', 'Quick 30-day harvest cycle'] },
          { plantSlug: 'spring-onion', plantName: 'Spring Onion', row: 21, col: 11, zone: zoneLabel(21, 11), reasons: ['Allium scent deters slugs — key pest near hedge', 'Narrow profile interplants well'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 21, col: 12, zone: zoneLabel(21, 12), reasons: ['Fastest crop: 25 days to harvest', 'Succession-sow 3-4 times per season'] },
          { plantSlug: 'rocket', plantName: 'Rocket', row: 22, col: 7, zone: zoneLabel(22, 7), reasons: ['Premium peppery salad, high shop value', 'Most shade-tolerant row, nearest hedge'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 22, col: 8, zone: zoneLabel(22, 8), reasons: ['Third lettuce for daily salad supply', 'Low maintenance cut-and-come-again'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 22, col: 9, zone: zoneLabel(22, 9), reasons: ['Stagger sowing with row above', 'Breaks up raised bed soil'] },
          { plantSlug: 'spring-onion', plantName: 'Spring Onion', row: 22, col: 10, zone: zoneLabel(22, 10), reasons: ['Second allium barrier against slugs/snails', 'Harvest in 8-10 weeks'] },
          { plantSlug: 'spinach', plantName: 'Spinach', row: 22, col: 11, zone: zoneLabel(22, 11), reasons: ['Second spinach for iron-rich greens', 'Tolerates coolest, shadiest position'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 22, col: 12, zone: zoneLabel(22, 12), reasons: ['Edge position — easy access from path side', 'Fourth lettuce ensures no salad shortage'] },
        ],
      },
      stats: { totalPlants: 15, uniqueVarieties: 7, companionPairs: 4, estimatedYieldKg: 8, estimatedValueGBP: 65 },
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
          { row: 21, col: 7, plantSlug: 'strawberry-everbearing' }, { row: 21, col: 8, plantSlug: 'strawberry-everbearing' },
          { row: 21, col: 9, plantSlug: 'radish' }, { row: 21, col: 10, plantSlug: 'strawberry-everbearing' },
          { row: 21, col: 11, plantSlug: 'lettuce' }, { row: 21, col: 12, plantSlug: 'strawberry-everbearing' },
          { row: 22, col: 7, plantSlug: 'radish' }, { row: 22, col: 8, plantSlug: 'pea' },
          { row: 22, col: 9, plantSlug: 'strawberry-everbearing' }, { row: 22, col: 10, plantSlug: 'radish' },
          { row: 22, col: 11, plantSlug: 'strawberry-everbearing' }, { row: 22, col: 12, plantSlug: 'pea' },
        ],
        details: [
          { plantSlug: 'strawberry-everbearing', plantName: 'Strawberry', row: 21, col: 7, zone: zoneLabel(21, 7), reasons: ['#1 kid-favourite fruit', 'Everbearing = berries all summer long'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Strawberry', row: 21, col: 8, zone: zoneLabel(21, 8), reasons: ['Berry patch feel — multiple plants together', 'Kids can count daily harvest'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 21, col: 9, zone: zoneLabel(21, 9), reasons: ['Pull-up-and-eat treasure hunt', '25 days to harvest — instant gratification'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Strawberry', row: 21, col: 10, zone: zoneLabel(21, 10), reasons: ['More berries = more picking opportunities', 'Tolerates partial shade from hedge'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 21, col: 11, zone: zoneLabel(21, 11), reasons: ['Tear-and-eat leaves for dinner salad', 'Teaches "food grows back" lesson'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Strawberry', row: 21, col: 12, zone: zoneLabel(21, 12), reasons: ['Edge position — easy access from path', 'Four strawberry plants in this row'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 22, col: 7, zone: zoneLabel(22, 7), reasons: ['Colourful varieties (red, pink, white)', 'Stagger sowing for continuous treasure hunts'] },
          { plantSlug: 'pea', plantName: 'Pea', row: 22, col: 8, zone: zoneLabel(22, 8), reasons: ['Sugar snap peas eaten straight from pod', 'Sweet taste — kids love them'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Strawberry', row: 22, col: 9, zone: zoneLabel(22, 9), reasons: ['Five strawberry plants total', 'Raised bed height perfect for Noelle'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 22, col: 10, zone: zoneLabel(22, 10), reasons: ['Third radish position for staggered sowing', 'Fast results keep kids engaged'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Strawberry', row: 22, col: 11, zone: zoneLabel(22, 11), reasons: ['Six strawberry plants across the bed', 'Continuous harvest June-September'] },
          { plantSlug: 'pea', plantName: 'Pea', row: 22, col: 12, zone: zoneLabel(22, 12), reasons: ['Pod-opening fun for small hands', 'Sweet snack straight from the garden'] },
        ],
      },
      stats: { totalPlants: 15, uniqueVarieties: 6, companionPairs: 3, estimatedYieldKg: 5, estimatedValueGBP: 40 },
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
          { row: 21, col: 7, plantSlug: 'chamomile' }, { row: 21, col: 8, plantSlug: 'lemon-balm' },
          { row: 21, col: 9, plantSlug: 'lavender' }, { row: 21, col: 10, plantSlug: 'corsican-mint' },
          { row: 21, col: 11, plantSlug: 'thyme' }, { row: 21, col: 12, plantSlug: 'dianthus' },
          { row: 22, col: 7, plantSlug: 'night-scented-stock' }, { row: 22, col: 8, plantSlug: 'chamomile' },
          { row: 22, col: 9, plantSlug: 'basil-sweet' }, { row: 22, col: 10, plantSlug: 'rosemary' },
          { row: 22, col: 11, plantSlug: 'scented-geranium' }, { row: 22, col: 12, plantSlug: 'night-scented-stock' },
        ],
        details: [
          { plantSlug: 'chamomile', plantName: 'Chamomile', row: 21, col: 7, zone: zoneLabel(21, 7), reasons: ['Apple scent at raised-bed height', 'Makes soothing herbal tea'] },
          { plantSlug: 'lemon-balm', plantName: 'Lemon Balm', row: 21, col: 8, zone: zoneLabel(21, 8), reasons: ['Citrus burst when leaves brushed', 'Raised bed contains spreading habit'] },
          { plantSlug: 'lavender', plantName: 'Lavender', row: 21, col: 9, zone: zoneLabel(21, 9), reasons: ['Classic calming fragrance', 'Bee magnet — pollinator attractor'] },
          { plantSlug: 'corsican-mint', plantName: 'Corsican Mint', row: 21, col: 10, zone: zoneLabel(21, 10), reasons: ['Intense peppermint aroma', 'Raised bed prevents invasive spread'] },
          { plantSlug: 'thyme', plantName: 'Thyme', row: 21, col: 11, zone: zoneLabel(21, 11), reasons: ['Aromatic culinary herb', 'Slug deterrent for raised bed'] },
          { plantSlug: 'dianthus', plantName: 'Dianthus', row: 21, col: 12, zone: zoneLabel(21, 12), reasons: ['Intense clove fragrance', 'Compact, colourful flowers'] },
          { plantSlug: 'night-scented-stock', plantName: 'Night-Scented Stock', row: 22, col: 7, zone: zoneLabel(22, 7), reasons: ['Releases sweet scent after sunset', 'Position near patio for evening enjoyment'] },
          { plantSlug: 'chamomile', plantName: 'Chamomile', row: 22, col: 8, zone: zoneLabel(22, 8), reasons: ['Second chamomile for tea production', 'Delicate apple-scented daisy flowers'] },
          { plantSlug: 'basil-sweet', plantName: 'Sweet Basil', row: 22, col: 9, zone: zoneLabel(22, 9), reasons: ['Sweet anise fragrance + culinary staple', 'Warm raised bed soil suits basil'] },
          { plantSlug: 'rosemary', plantName: 'Rosemary', row: 22, col: 10, zone: zoneLabel(22, 10), reasons: ['Strong aromatic oils, evergreen structure', 'Culinary herb and pest deterrent'] },
          { plantSlug: 'scented-geranium', plantName: 'Scented Geranium', row: 22, col: 11, zone: zoneLabel(22, 11), reasons: ['Rose-lemon scent on touch', 'Textured leaves release fragrance'] },
          { plantSlug: 'night-scented-stock', plantName: 'Night-Scented Stock', row: 22, col: 12, zone: zoneLabel(22, 12), reasons: ['Second stock for evening scent coverage', 'Spectacular fragrance at dusk'] },
        ],
      },
      stats: { totalPlants: 15, uniqueVarieties: 12, companionPairs: 5, estimatedYieldKg: 2, estimatedValueGBP: 30 },
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
          { row: 21, col: 7, plantSlug: 'chives' }, { row: 21, col: 8, plantSlug: 'basil-sweet' },
          { row: 21, col: 9, plantSlug: 'marigold' }, { row: 21, col: 10, plantSlug: 'chives' },
          { row: 21, col: 11, plantSlug: 'nasturtium' }, { row: 21, col: 12, plantSlug: 'thyme' },
          { row: 22, col: 7, plantSlug: 'rosemary' }, { row: 22, col: 8, plantSlug: 'sage' },
          { row: 22, col: 9, plantSlug: 'oregano' }, { row: 22, col: 10, plantSlug: 'calendula' },
          { row: 22, col: 11, plantSlug: 'parsley' }, { row: 22, col: 12, plantSlug: 'borage' },
        ],
        details: [
          { plantSlug: 'chives', plantName: 'Chives', row: 21, col: 7, zone: zoneLabel(21, 7), reasons: ['Allium barrier — deters aphids and grey mould', 'Scent radiates to nearby GreenStalks'] },
          { plantSlug: 'basil-sweet', plantName: 'Sweet Basil', row: 21, col: 8, zone: zoneLabel(21, 8), reasons: ['Whitefly deterrent — protects tomatoes on GreenStalks', 'Aromatic shield effect'] },
          { plantSlug: 'marigold', plantName: 'Marigold', row: 21, col: 9, zone: zoneLabel(21, 9), reasons: ['Root nematode deterrent', 'Attracts hoverflies (aphid predators)'] },
          { plantSlug: 'chives', plantName: 'Chives', row: 21, col: 10, zone: zoneLabel(21, 10), reasons: ['Second allium extends grey mould protection', 'Deters slugs near hedge'] },
          { plantSlug: 'nasturtium', plantName: 'Nasturtium', row: 21, col: 11, zone: zoneLabel(21, 11), reasons: ['Central aphid trap — draws pests away from crops', 'Edible flowers as bonus'] },
          { plantSlug: 'thyme', plantName: 'Thyme', row: 21, col: 12, zone: zoneLabel(21, 12), reasons: ['Slug deterrent — thyme oil repels gastropods', 'Low-growing ground cover'] },
          { plantSlug: 'rosemary', plantName: 'Rosemary', row: 22, col: 7, zone: zoneLabel(22, 7), reasons: ['Strong scent disrupts pest navigation', 'Evergreen — year-round protection'] },
          { plantSlug: 'sage', plantName: 'Sage', row: 22, col: 8, zone: zoneLabel(22, 8), reasons: ['Cabbage moth and beetle deterrent', 'Perennial protection builds over seasons'] },
          { plantSlug: 'oregano', plantName: 'Oregano', row: 22, col: 9, zone: zoneLabel(22, 9), reasons: ['Carvacrol oils deter many insect pests', 'Mediterranean herb thrives in raised bed'] },
          { plantSlug: 'calendula', plantName: 'Calendula', row: 22, col: 10, zone: zoneLabel(22, 10), reasons: ['Attracts beneficial insects (ladybirds, hoverflies)', 'Sticky stems trap whitefly'] },
          { plantSlug: 'parsley', plantName: 'Parsley', row: 22, col: 11, zone: zoneLabel(22, 11), reasons: ['Hoverfly attractor — larvae eat aphids', 'Biennial utility herb'] },
          { plantSlug: 'borage', plantName: 'Borage', row: 22, col: 12, zone: zoneLabel(22, 12), reasons: ['Major bee attractor for pollination', 'Deters tomato hornworm'] },
        ],
      },
      stats: { totalPlants: 15, uniqueVarieties: 12, companionPairs: 10, estimatedYieldKg: 3, estimatedValueGBP: 25 },
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
