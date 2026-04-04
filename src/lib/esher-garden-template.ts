/**
 * 21 Esher Avenue — Pre-built Garden Template
 *
 * Based on analysis of 11 garden photographs + satellite imagery.
 *
 * Garden dimensions: ~10m wide × 12m deep
 * Grid: 0.5m cells = 20 columns × 24 rows
 *
 * Orientation (corrected per owner):
 *   Row 0 = house wall (NE, street side — faces NE)
 *   Row 23 = back of garden (SW)
 *   Col 0 = left (NW) — neighbour 19A side
 *   Col 19 = right (SE) — fence border side
 *
 * Photo-verified features:
 * - Conservatory (NW corner, rows 0-2, cols 0-5) — glass, faces SW
 * - Main lawn (rows 3-18) — OFF LIMITS, rental property
 * - Right fence border (cols 18-19) — Cordylines + Euphorbia in narrow bed
 * - Back patio (rows 19-21) — PAVED, GreenStalk positions only
 * - Raised bed (rows 21-22, cols 7-12) — black metal edging, near hedge,
 *     hostas + perennials (shade bed under laurel canopy)
 * - Shed (rows 21-23, cols 0-3) — wooden, glazed panels, N corner
 * - Laurel hedge (rows 22-23, cols 0-17) — 3-4m tall, SW boundary, shades PM
 * - Back gate (rows 21-22, cols 16-19) — white picket, right side
 * - Gooseberry/currant shrubs near back gate
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

  // ── Conservatory (NW corner: rows 0-2, cols 0-5) ──
  // Victorian-style glass, faces SW — filtered light, frost-free in winter
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

  // ── Left fence border (col 0, rows 3-18) ──
  for (let r = 3; r <= 18; r++) {
    overrides.push({ row: r, col: 0, type: 'flower-bed' });
  }

  // ── Right fence border (cols 18-19, rows 3-20) — Cordylines + Euphorbia ──
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

  // ── Back patio (rows 19-21, cols 4-17) — PAVED, GreenStalks here ──
  for (let r = 19; r <= 21; r++) {
    for (let c = 4; c <= 17; c++) {
      overrides.push({ row: r, col: c, type: 'patio', label: 'Back patio' });
    }
  }

  // ── GreenStalk positions on patio ──
  for (let r = 19; r <= 20; r++) {
    for (let c = 5; c <= 6; c++) {
      overrides.push({ row: r, col: c, type: 'greenstalk', label: 'GreenStalk 1' });
    }
  }
  for (let r = 19; r <= 20; r++) {
    for (let c = 14; c <= 15; c++) {
      overrides.push({ row: r, col: c, type: 'greenstalk', label: 'GreenStalk 2' });
    }
  }

  // ── Raised bed (rows 21-22, cols 7-12) — shade bed near hedge ──
  for (let r = 21; r <= 22; r++) {
    for (let c = 7; c <= 12; c++) {
      overrides.push({ row: r, col: c, type: 'raised-bed' });
    }
  }

  // ── Shed (rows 21-23, cols 0-3) — N corner ──
  for (let r = 21; r <= 23; r++) {
    for (let c = 0; c <= 3; c++) {
      overrides.push({ row: r, col: c, type: 'shed', label: 'Shed' });
    }
  }

  // ── Laurel hedge (rows 22-23) — SW boundary ──
  for (let c = 0; c <= 19; c++) {
    overrides.push({ row: 23, col: c, type: 'tree', label: 'Laurel hedge' });
  }
  for (let c = 4; c <= 17; c++) {
    overrides.push({ row: 22, col: c, type: 'tree', label: 'Hedge canopy' });
  }

  // ── Back gate (rows 21-22, cols 16-19) ──
  for (let r = 21; r <= 22; r++) {
    for (let c = 16; c <= 19; c++) {
      overrides.push({ row: r, col: c, type: 'path', label: 'Back gate' });
    }
  }
  overrides.push({ row: 21, col: 17, type: 'flower-bed', plantSlug: 'gooseberry', label: 'Gooseberry' });
  overrides.push({ row: 21, col: 18, type: 'flower-bed', plantSlug: 'redcurrant', label: 'Redcurrant' });

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
    // ═══ 1. Maximum Food from Limited Space ════════════════════════════════════
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
