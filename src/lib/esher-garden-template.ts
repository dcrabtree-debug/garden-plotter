/**
 * 21 Esher Avenue — Pre-built Garden Template
 *
 * Maps the actual garden layout from the handoff document onto the
 * in-ground garden grid. Based on estimated dimensions from photos
 * and the property description.
 *
 * Garden dimensions: ~10m wide × 12m deep
 * Grid: 0.5m cells = 20 columns × 24 rows
 *
 * Orientation: House is at the TOP (south-east end)
 * Row 0 = closest to house / conservatory
 * Row 23 = back of garden (NW, laurel hedge)
 * Col 0 = left side (looking from house)
 * Col 19 = right side (fence border)
 *
 * Key features placed:
 * - House wall (row 0) — not paintable, just conceptual boundary
 * - Conservatory (rows 0-2, cols 12-19)
 * - Patio/stepping stones (rows 2-6, scattered)
 * - Main lawn (rows 4-18, cols 2-17) — OFF LIMITS
 * - Right fence border (col 19, rows 3-20) — existing Cordylines + Euphorbia
 * - Terrace area (rows 18-22, cols 0-10) — PRIMARY PLANTING ZONE
 * - Existing raised bed (rows 19-20, cols 4-8)
 * - Shed (rows 21-23, cols 16-19)
 * - Back hedge (row 23, full width) — 3.5m laurel/ivy
 * - Back gate area (rows 21-23, cols 10-15)
 * - Path through terrace (rows 18-22, col 3)
 */

import type { GardenCell, GardenConfig, CellType } from '../types/planner';

export const ESHER_CONFIG: GardenConfig = {
  widthM: 10,
  depthM: 12,
  cellSizeM: 0.5,
  facing: 'SE',
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
 */
export function createEsherGarden(): { config: GardenConfig; cells: GardenCell[][] } {
  const cols = Math.round(ESHER_CONFIG.widthM / ESHER_CONFIG.cellSizeM); // 20
  const rows = Math.round(ESHER_CONFIG.depthM / ESHER_CONFIG.cellSizeM); // 24

  // Start with all lawn
  const cells: GardenCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: 'lawn' as CellType,
      plantSlug: null,
      sunHours: null,
    }))
  );

  const overrides: CellOverride[] = [];

  // ── House wall area (rows 0-1) — patio closest to house ──
  for (let c = 0; c < cols; c++) {
    overrides.push({ row: 0, col: c, type: 'patio' });
    overrides.push({ row: 1, col: c, type: 'patio' });
  }

  // ── Conservatory (rows 0-2, cols 14-19) ──
  for (let r = 0; r <= 2; r++) {
    for (let c = 14; c < cols; c++) {
      overrides.push({ row: r, col: c, type: 'patio', label: 'conservatory' });
    }
  }

  // ── Right fence border (col 18-19, rows 3-20) — existing plants ──
  for (let r = 3; r <= 20; r++) {
    overrides.push({ row: r, col: 19, type: 'flower-bed' });
    overrides.push({ row: r, col: 18, type: 'flower-bed' });
  }
  // Cordylines at regular intervals along right fence
  for (let r = 4; r <= 18; r += 3) {
    overrides.push({ row: r, col: 19, type: 'tree' });
  }

  // ── Main lawn (rows 3-17, cols 2-17) — OFF LIMITS ──
  // Already lawn by default, just making it explicit

  // ── Left border path (col 0-1, rows 2-17) ──
  for (let r = 2; r <= 17; r++) {
    overrides.push({ row: r, col: 0, type: 'path' });
  }

  // ── TERRACE AREA (rows 18-22, cols 0-12) — PRIMARY PLANTING ZONE ──
  // Paved terrace base
  for (let r = 18; r <= 22; r++) {
    for (let c = 0; c <= 12; c++) {
      overrides.push({ row: r, col: c, type: 'patio' });
    }
  }

  // Path through terrace (col 3, rows 18-22)
  for (let r = 18; r <= 22; r++) {
    overrides.push({ row: r, col: 3, type: 'path' });
  }

  // ── Existing raised bed (rows 19-20, cols 5-9) — has strawberries ──
  for (let r = 19; r <= 20; r++) {
    for (let c = 5; c <= 9; c++) {
      overrides.push({ row: r, col: c, type: 'raised-bed' });
    }
  }
  // Pre-populate with strawberries and perennials
  overrides.push({ row: 19, col: 5, type: 'raised-bed', plantSlug: 'strawberry-everbearing' });
  overrides.push({ row: 19, col: 6, type: 'raised-bed', plantSlug: 'strawberry-everbearing' });
  overrides.push({ row: 19, col: 7, type: 'raised-bed', plantSlug: 'strawberry-everbearing' });
  overrides.push({ row: 19, col: 8, type: 'raised-bed', plantSlug: 'lavender' });
  overrides.push({ row: 19, col: 9, type: 'raised-bed', plantSlug: 'lavender' });
  overrides.push({ row: 20, col: 5, type: 'raised-bed', plantSlug: 'strawberry-everbearing' });
  overrides.push({ row: 20, col: 6, type: 'raised-bed', plantSlug: 'strawberry-everbearing' });
  overrides.push({ row: 20, col: 7, type: 'raised-bed', plantSlug: 'chives' });
  overrides.push({ row: 20, col: 8, type: 'raised-bed', plantSlug: 'thyme' });
  overrides.push({ row: 20, col: 9, type: 'raised-bed', plantSlug: 'rosemary' });

  // ── GreenStalk positions on terrace (marked as veg-patch placeholder) ──
  // GreenStalk 1: rows 18-19, cols 1-2
  for (let r = 18; r <= 19; r++) {
    for (let c = 1; c <= 2; c++) {
      overrides.push({ row: r, col: c, type: 'veg-patch', label: 'GreenStalk 1' });
    }
  }
  // GreenStalk 2: rows 18-19, cols 10-11
  for (let r = 18; r <= 19; r++) {
    for (let c = 10; c <= 11; c++) {
      overrides.push({ row: r, col: c, type: 'veg-patch', label: 'GreenStalk 2' });
    }
  }

  // ── Additional planting spots on terrace ──
  // Herb pots near conservatory door (row 2, cols 12-13)
  overrides.push({ row: 2, col: 12, type: 'veg-patch', plantSlug: 'mint' });
  overrides.push({ row: 2, col: 13, type: 'veg-patch', plantSlug: 'parsley' });

  // Nasturtium / sweet pea spots near terrace steps
  overrides.push({ row: 21, col: 1, type: 'flower-bed', plantSlug: 'nasturtium' });
  overrides.push({ row: 21, col: 2, type: 'flower-bed', plantSlug: 'nasturtium' });
  overrides.push({ row: 22, col: 1, type: 'flower-bed' });
  overrides.push({ row: 22, col: 2, type: 'flower-bed' });

  // ── Shed (rows 21-23, cols 16-19) ──
  for (let r = 21; r <= 23; r++) {
    for (let c = 16; c < cols; c++) {
      overrides.push({ row: r, col: c, type: 'shed' });
    }
  }

  // ── Back gate / trellis area (rows 21-23, cols 10-15) ──
  for (let r = 21; r <= 23; r++) {
    for (let c = 10; c <= 15; c++) {
      overrides.push({ row: r, col: c, type: 'path' });
    }
  }
  // Gooseberry/currant bushes near back fence
  overrides.push({ row: 22, col: 13, type: 'flower-bed', plantSlug: 'gooseberry' });
  overrides.push({ row: 22, col: 14, type: 'flower-bed', plantSlug: 'redcurrant' });

  // ── Laurel hedge (row 23, cols 0-15) ──
  for (let c = 0; c <= 15; c++) {
    overrides.push({ row: 23, col: c, type: 'tree', label: 'Laurel hedge' });
  }

  // ── Sweet peas on right fence ──
  overrides.push({ row: 8, col: 18, type: 'flower-bed', plantSlug: 'dwarf-sweet-pea' });
  overrides.push({ row: 12, col: 18, type: 'flower-bed', plantSlug: 'dwarf-sweet-pea' });
  overrides.push({ row: 16, col: 18, type: 'flower-bed', plantSlug: 'dwarf-sweet-pea' });

  // Apply overrides
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

// ─── Auto-populate strategies for the terrace planting zone ──────────────────

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

// Zone labels for human-readable reasoning
function zone(row: number): string {
  if (row === 18) return 'Front terrace (sunniest row)';
  if (row >= 19 && row <= 20) return 'Raised bed';
  if (row === 21) return 'Mid terrace';
  if (row === 22) return 'Back terrace (near hedge shade)';
  return 'Terrace';
}

/**
 * Generate ranked layout options for the Esher Avenue terrace.
 * Each layout includes per-placement reasoning and a raised bed replant variant.
 */
export function generateEsherLayouts(): EsherLayoutOption[] {
  return [
    // ═══ 1. Maximum Food Production ═══════════════════════════════════════════
    {
      id: 'max-food',
      name: 'Maximum Food Production',
      emoji: '🥗',
      description: 'Every available spot grows edible crops. Herbs near the conservatory for quick kitchen access. Tomatoes and beans in the sunniest terrace spots. Companion flowers at the edges.',
      placements: [
        { row: 18, col: 4, plantSlug: 'tomato-tumbling' },
        { row: 18, col: 5, plantSlug: 'basil-sweet' },
        { row: 18, col: 6, plantSlug: 'tomato-tumbling' },
        { row: 18, col: 7, plantSlug: 'pepper-chilli' },
        { row: 18, col: 8, plantSlug: 'basil-sweet' },
        { row: 18, col: 9, plantSlug: 'pepper-chilli' },
        { row: 21, col: 4, plantSlug: 'dwarf-french-bean' },
        { row: 21, col: 5, plantSlug: 'lettuce' },
        { row: 21, col: 6, plantSlug: 'radish' },
        { row: 21, col: 7, plantSlug: 'dwarf-french-bean' },
        { row: 21, col: 8, plantSlug: 'spring-onion' },
        { row: 21, col: 9, plantSlug: 'lettuce' },
        { row: 22, col: 4, plantSlug: 'courgette' },
        { row: 22, col: 5, plantSlug: 'courgette' },
        { row: 22, col: 6, plantSlug: 'runner-bean' },
        { row: 22, col: 7, plantSlug: 'runner-bean' },
        { row: 22, col: 8, plantSlug: 'marigold' },
        { row: 22, col: 9, plantSlug: 'calendula' },
      ],
      reasoning: [
        { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 18, col: 4, zone: zone(18), reasons: ['Sunniest terrace row — full sun, 6+ hours', 'Adjacent to basil (col 5) which repels whitefly', 'Near path for easy picking'] },
        { plantSlug: 'basil-sweet', plantName: 'Sweet Basil', row: 18, col: 5, zone: zone(18), reasons: ['Between two tomatoes — maximum whitefly deterrence', 'Full sun position needed for basil oil production'] },
        { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 18, col: 6, zone: zone(18), reasons: ['Second tomato in the sun row', 'Flanked by basil and pepper — strong companion group'] },
        { plantSlug: 'pepper-chilli', plantName: 'Chilli Pepper', row: 18, col: 7, zone: zone(18), reasons: ['Needs full sun and warmth from south-facing terrace', 'Same Solanaceae family as tomato — similar care regime'] },
        { plantSlug: 'basil-sweet', plantName: 'Sweet Basil', row: 18, col: 8, zone: zone(18), reasons: ['Second basil between peppers for pest protection', 'Aromatic oils deter aphids from neighbouring plants'] },
        { plantSlug: 'pepper-chilli', plantName: 'Chilli Pepper', row: 18, col: 9, zone: zone(18), reasons: ['End position gets good air circulation', 'Adjacent to raised bed — benefits from herb aromas'] },
        { plantSlug: 'dwarf-french-bean', plantName: 'Dwarf French Bean', row: 21, col: 4, zone: zone(21), reasons: ['Nitrogen-fixing legume enriches soil for neighbours', 'Compact bush habit suits tight terrace spacing'] },
        { plantSlug: 'lettuce', plantName: 'Lettuce', row: 21, col: 5, zone: zone(21), reasons: ['Partial shade from bean foliage prevents bolting', 'Quick 30-day harvest — succession-sow every 2 weeks'] },
        { plantSlug: 'radish', plantName: 'Radish', row: 21, col: 6, zone: zone(21), reasons: ['Fastest crop: 25 days to harvest', 'Breaks up soil for neighbouring plants'] },
        { plantSlug: 'dwarf-french-bean', plantName: 'Dwarf French Bean', row: 21, col: 7, zone: zone(21), reasons: ['Second bean for staggered harvesting', 'Fixes nitrogen for surrounding lettuce and onions'] },
        { plantSlug: 'spring-onion', plantName: 'Spring Onion', row: 21, col: 8, zone: zone(21), reasons: ['Allium scent deters carrot fly and aphids', 'Narrow profile fits between larger plants'] },
        { plantSlug: 'lettuce', plantName: 'Lettuce', row: 21, col: 9, zone: zone(21), reasons: ['Second lettuce for continuous salad supply', 'Light feeder won\'t compete with adjacent raised bed'] },
        { plantSlug: 'courgette', plantName: 'Courgette', row: 22, col: 4, zone: zone(22), reasons: ['Large leaves shade out weeds on back terrace', 'High-yield crop: 5-8 kg per plant in good conditions'] },
        { plantSlug: 'courgette', plantName: 'Courgette', row: 22, col: 5, zone: zone(22), reasons: ['Two courgettes for reliable daily harvest through summer', 'Tolerates partial afternoon shade from hedge'] },
        { plantSlug: 'runner-bean', plantName: 'Runner Bean', row: 22, col: 6, zone: zone(22), reasons: ['Climbs Titan cage — vertical growing maximises space', 'Heavy cropper: pick regularly for continuous production'] },
        { plantSlug: 'runner-bean', plantName: 'Runner Bean', row: 22, col: 7, zone: zone(22), reasons: ['Second runner for staggered picking', 'Nitrogen-fixing roots improve soil for next season'] },
        { plantSlug: 'marigold', plantName: 'Marigold', row: 22, col: 8, zone: zone(22), reasons: ['Edge position: deters whitefly from entire terrace', 'Attracts hoverflies whose larvae eat aphids'] },
        { plantSlug: 'calendula', plantName: 'Calendula', row: 22, col: 9, zone: zone(22), reasons: ['Companion flower: attracts pollinators for beans', 'Edible petals — salad garnish from your own garden'] },
      ],
      raisedBedReplant: {
        rationale: 'Replace perennials with high-turnover salad crops for maximum food output. Quick-harvest greens that can be succession-sown all season.',
        placements: [
          { row: 19, col: 5, plantSlug: 'lettuce' },
          { row: 19, col: 6, plantSlug: 'radish' },
          { row: 19, col: 7, plantSlug: 'spring-onion' },
          { row: 19, col: 8, plantSlug: 'lettuce' },
          { row: 19, col: 9, plantSlug: 'spinach' },
          { row: 20, col: 5, plantSlug: 'radish' },
          { row: 20, col: 6, plantSlug: 'rocket' },
          { row: 20, col: 7, plantSlug: 'spring-onion' },
          { row: 20, col: 8, plantSlug: 'lettuce' },
          { row: 20, col: 9, plantSlug: 'rocket' },
        ],
        details: [
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 19, col: 5, zone: zone(19), reasons: ['Quick harvest salad green', 'Succession-sow every 2 weeks for continuous supply'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 19, col: 6, zone: zone(19), reasons: ['25-day harvest — fastest crop in the garden', 'Breaks up raised bed soil for neighbours'] },
          { plantSlug: 'spring-onion', plantName: 'Spring Onion', row: 19, col: 7, zone: zone(19), reasons: ['Allium scent protects lettuce from aphids', 'Narrow profile — fits between salad rows'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 19, col: 8, zone: zone(19), reasons: ['Second lettuce variety for variety', 'Partial shade from raised bed edges prevents bolting'] },
          { plantSlug: 'spinach', plantName: 'Spinach', row: 19, col: 9, zone: zone(19), reasons: ['Iron-rich leafy green, high nutritional value', 'Tolerates partial shade well'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 20, col: 5, zone: zone(20), reasons: ['Second radish row for staggered harvesting', 'Opens up soil for root companions'] },
          { plantSlug: 'rocket', plantName: 'Rocket', row: 20, col: 6, zone: zone(20), reasons: ['£12/kg shop value — high value per square metre', '28-day harvest time, can sow 4 times per season'] },
          { plantSlug: 'spring-onion', plantName: 'Spring Onion', row: 20, col: 7, zone: zone(20), reasons: ['Allium pest barrier between salad rows', 'Interplants well without competing for light'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 20, col: 8, zone: zone(20), reasons: ['Third lettuce — ensures daily salad supply', 'Low-maintenance cut-and-come-again variety'] },
          { plantSlug: 'rocket', plantName: 'Rocket', row: 20, col: 9, zone: zone(20), reasons: ['Second rocket position — premium peppery salad', 'Fast-growing, high value crop'] },
        ],
      },
      stats: { totalPlants: 18, uniqueVarieties: 12, companionPairs: 8, estimatedYieldKg: 25, estimatedValueGBP: 120 },
    },

    // ═══ 2. Kids' Picking Garden ══════════════════════════════════════════════
    {
      id: 'kid-friendly',
      name: "Kids' Picking Garden",
      emoji: '👨‍👧‍👦',
      description: "Everything Max and Noelle can pick and eat. Cherry tomatoes at kid height, strawberries everywhere, snap beans, radishes (fast gratification), and sunflowers for fun. Bright colours and quick results.",
      placements: [
        { row: 18, col: 4, plantSlug: 'tomato-tumbling' },
        { row: 18, col: 5, plantSlug: 'tomato-tumbling' },
        { row: 18, col: 6, plantSlug: 'strawberry-everbearing' },
        { row: 18, col: 7, plantSlug: 'strawberry-everbearing' },
        { row: 18, col: 8, plantSlug: 'tomato-tumbling' },
        { row: 18, col: 9, plantSlug: 'tomato-tumbling' },
        { row: 21, col: 4, plantSlug: 'radish' },
        { row: 21, col: 5, plantSlug: 'lettuce' },
        { row: 21, col: 6, plantSlug: 'dwarf-french-bean' },
        { row: 21, col: 7, plantSlug: 'pea' },
        { row: 21, col: 8, plantSlug: 'radish' },
        { row: 21, col: 9, plantSlug: 'spring-onion' },
        { row: 22, col: 4, plantSlug: 'sunflower' },
        { row: 22, col: 5, plantSlug: 'nasturtium' },
        { row: 22, col: 6, plantSlug: 'nasturtium' },
        { row: 22, col: 7, plantSlug: 'sunflower' },
        { row: 22, col: 8, plantSlug: 'calendula' },
        { row: 22, col: 9, plantSlug: 'marigold' },
      ],
      reasoning: [
        { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 18, col: 4, zone: zone(18), reasons: ['Cherry tomatoes at kid-reachable height', 'Red fruit is exciting for children to spot and pick'] },
        { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 18, col: 5, zone: zone(18), reasons: ['Multiple tomato plants = more picking opportunities', 'Kids can race to find ripe ones'] },
        { plantSlug: 'strawberry-everbearing', plantName: 'Everbearing Strawberry', row: 18, col: 6, zone: zone(18), reasons: ['Strawberries are the #1 kid-favourite fruit', 'Everbearing = continuous harvest all summer long'] },
        { plantSlug: 'strawberry-everbearing', plantName: 'Everbearing Strawberry', row: 18, col: 7, zone: zone(18), reasons: ['Second strawberry doubles picking chances', 'Adjacent to tomatoes — similar watering needs'] },
        { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 18, col: 8, zone: zone(18), reasons: ['Four tomato plants total — enough for both kids', 'Sunniest position for maximum fruit production'] },
        { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 18, col: 9, zone: zone(18), reasons: ['End position near raised bed', 'Tumbling habit cascades over edge — fun for kids to reach under'] },
        { plantSlug: 'radish', plantName: 'Radish', row: 21, col: 4, zone: zone(21), reasons: ['25 days seed-to-harvest: instant gratification', 'Kids can pull them up like treasure hunting'] },
        { plantSlug: 'lettuce', plantName: 'Lettuce', row: 21, col: 5, zone: zone(21), reasons: ['Cut-and-come-again: kids pick leaves daily', 'Teaches "food grows back" lesson'] },
        { plantSlug: 'dwarf-french-bean', plantName: 'Dwarf French Bean', row: 21, col: 6, zone: zone(21), reasons: ['Snap beans are satisfying to pick — audible snap', 'Bush habit at kid height, no staking needed'] },
        { plantSlug: 'pea', plantName: 'Pea', row: 21, col: 7, zone: zone(21), reasons: ['Sugar snap peas eaten straight off the plant', 'Sweet taste makes them kid-friendly snack'] },
        { plantSlug: 'radish', plantName: 'Radish', row: 21, col: 8, zone: zone(21), reasons: ['Second radish row for staggered sowing', 'Colourful varieties (red, pink, white) excite kids'] },
        { plantSlug: 'spring-onion', plantName: 'Spring Onion', row: 21, col: 9, zone: zone(21), reasons: ['Easy to pull up — satisfying harvest action', 'Pest deterrent protects neighbours'] },
        { plantSlug: 'sunflower', plantName: 'Sunflower', row: 22, col: 4, zone: zone(22), reasons: ['Height competition: "whose sunflower is tallest?"', 'Dramatic growth visible day-to-day — captures attention'] },
        { plantSlug: 'nasturtium', plantName: 'Nasturtium', row: 22, col: 5, zone: zone(22), reasons: ['Bright orange flowers kids can pick freely', 'Edible petals — fun "eating flowers" moment'] },
        { plantSlug: 'nasturtium', plantName: 'Nasturtium', row: 22, col: 6, zone: zone(22), reasons: ['Aphid trap crop: protects beans and tomatoes', 'Trailing habit creates ground-level colour'] },
        { plantSlug: 'sunflower', plantName: 'Sunflower', row: 22, col: 7, zone: zone(22), reasons: ['Second sunflower — one for Max, one for Noelle', 'Seeds at end of season = bird feeding activity'] },
        { plantSlug: 'calendula', plantName: 'Calendula', row: 22, col: 8, zone: zone(22), reasons: ['Orange/yellow "sunshine flowers" kids love', 'Attracts bees — teaches pollination'] },
        { plantSlug: 'marigold', plantName: 'Marigold', row: 22, col: 9, zone: zone(22), reasons: ['Strong scent deters pests from entire row', 'Bright colour creates visual boundary'] },
      ],
      raisedBedReplant: {
        rationale: 'Fill the raised bed with more kid-favourites. Extra strawberries for picking, radishes for treasure-hunting, and cherry tomatoes at perfect kid height.',
        placements: [
          { row: 19, col: 5, plantSlug: 'strawberry-everbearing' },
          { row: 19, col: 6, plantSlug: 'strawberry-everbearing' },
          { row: 19, col: 7, plantSlug: 'tomato-tumbling' },
          { row: 19, col: 8, plantSlug: 'strawberry-everbearing' },
          { row: 19, col: 9, plantSlug: 'strawberry-everbearing' },
          { row: 20, col: 5, plantSlug: 'radish' },
          { row: 20, col: 6, plantSlug: 'lettuce' },
          { row: 20, col: 7, plantSlug: 'radish' },
          { row: 20, col: 8, plantSlug: 'pea' },
          { row: 20, col: 9, plantSlug: 'strawberry-everbearing' },
        ],
        details: [
          { plantSlug: 'strawberry-everbearing', plantName: 'Everbearing Strawberry', row: 19, col: 5, zone: zone(19), reasons: ['Berry bonanza — more strawberries for little hands', 'Raised bed height perfect for Noelle (age 3)'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Everbearing Strawberry', row: 19, col: 6, zone: zone(19), reasons: ['Adjacent strawberries create "berry patch" feel', 'Continuous harvest June–September'] },
          { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 19, col: 7, zone: zone(19), reasons: ['Cherry tomato in raised bed = perfect kid picking height', 'Cascades over edge of raised bed'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Everbearing Strawberry', row: 19, col: 8, zone: zone(19), reasons: ['More berries = more daily picking excitement', 'Kids can count their daily harvest'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Everbearing Strawberry', row: 19, col: 9, zone: zone(19), reasons: ['End of row — easy access from path side', 'Five strawberries in this row alone'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 20, col: 5, zone: zone(20), reasons: ['Pull-up-and-eat treasure hunt', '25 days to harvest — almost instant results'] },
          { plantSlug: 'lettuce', plantName: 'Lettuce', row: 20, col: 6, zone: zone(20), reasons: ['Pick leaves daily for dinner salad', 'Teaches that food keeps growing back'] },
          { plantSlug: 'radish', plantName: 'Radish', row: 20, col: 7, zone: zone(20), reasons: ['Stagger sowing with row above for continuous harvest', 'Colourful roots excite kids'] },
          { plantSlug: 'pea', plantName: 'Pea', row: 20, col: 8, zone: zone(20), reasons: ['Sweet peas eaten straight from the pod', 'Pod-opening is a fun activity for small hands'] },
          { plantSlug: 'strawberry-everbearing', plantName: 'Everbearing Strawberry', row: 20, col: 9, zone: zone(20), reasons: ['Corner position — reachable from two sides', 'Six strawberry plants total in raised bed'] },
        ],
      },
      stats: { totalPlants: 18, uniqueVarieties: 10, companionPairs: 6, estimatedYieldKg: 18, estimatedValueGBP: 85 },
    },

    // ═══ 3. Fragrant Edible Garden ════════════════════════════════════════════
    {
      id: 'fragrant-edible',
      name: 'Fragrant Edible Garden',
      emoji: '🌸',
      description: "David's ideal: food crops interwoven with fragrant plants for sensory richness. Night-scented stock for evening fragrance, dianthus for clove scent, lemon balm for citrus, plus all the core edibles.",
      placements: [
        { row: 18, col: 4, plantSlug: 'tomato-tumbling' },
        { row: 18, col: 5, plantSlug: 'scented-geranium' },
        { row: 18, col: 6, plantSlug: 'tomato-tumbling' },
        { row: 18, col: 7, plantSlug: 'dianthus' },
        { row: 18, col: 8, plantSlug: 'pepper-chilli' },
        { row: 18, col: 9, plantSlug: 'lemon-balm' },
        { row: 21, col: 4, plantSlug: 'dwarf-french-bean' },
        { row: 21, col: 5, plantSlug: 'night-scented-stock' },
        { row: 21, col: 6, plantSlug: 'lettuce' },
        { row: 21, col: 7, plantSlug: 'chamomile' },
        { row: 21, col: 8, plantSlug: 'strawberry-everbearing' },
        { row: 21, col: 9, plantSlug: 'corsican-mint' },
        { row: 22, col: 4, plantSlug: 'nicotiana' },
        { row: 22, col: 5, plantSlug: 'nasturtium' },
        { row: 22, col: 6, plantSlug: 'courgette' },
        { row: 22, col: 7, plantSlug: 'borage' },
        { row: 22, col: 8, plantSlug: 'calendula' },
        { row: 22, col: 9, plantSlug: 'sweet-william' },
      ],
      reasoning: [
        { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 18, col: 4, zone: zone(18), reasons: ['Core food crop in sunniest position', 'Warm tomato-leaf scent adds to fragrant atmosphere'] },
        { plantSlug: 'scented-geranium', plantName: 'Scented Geranium', row: 18, col: 5, zone: zone(18), reasons: ['Rose-lemon scent released when leaves are brushed', 'Aromatic oils deter whitefly from adjacent tomatoes'] },
        { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 18, col: 6, zone: zone(18), reasons: ['Second tomato flanked by two fragrant companions', 'Reliable cherry tomato production'] },
        { plantSlug: 'dianthus', plantName: 'Dianthus', row: 18, col: 7, zone: zone(18), reasons: ['Intense clove fragrance in full sun', 'Compact habit — doesn\'t overshadow neighbours'] },
        { plantSlug: 'pepper-chilli', plantName: 'Chilli Pepper', row: 18, col: 8, zone: zone(18), reasons: ['Heat-loving crop in warmest position', 'Spicy leaves have their own subtle fragrance'] },
        { plantSlug: 'lemon-balm', plantName: 'Lemon Balm', row: 18, col: 9, zone: zone(18), reasons: ['Citrus scent when brushed — terrace edge position for walk-by fragrance', 'Makes excellent herbal tea — edible and fragrant'] },
        { plantSlug: 'dwarf-french-bean', plantName: 'Dwarf French Bean', row: 21, col: 4, zone: zone(21), reasons: ['Nitrogen-fixer enriches soil for fragrant herbs', 'Productive food crop anchoring the mid-terrace'] },
        { plantSlug: 'night-scented-stock', plantName: 'Night-Scented Stock', row: 21, col: 5, zone: zone(21), reasons: ['Releases intense sweet scent after sunset', 'Position near seating area for evening enjoyment'] },
        { plantSlug: 'lettuce', plantName: 'Lettuce', row: 21, col: 6, zone: zone(21), reasons: ['Quick-harvest salad crop between fragrant plants', 'Partial shade from neighbours prevents bolting'] },
        { plantSlug: 'chamomile', plantName: 'Chamomile', row: 21, col: 7, zone: zone(21), reasons: ['Apple-scented when walked on or brushed', 'Makes soothing tea — dual purpose'] },
        { plantSlug: 'strawberry-everbearing', plantName: 'Everbearing Strawberry', row: 21, col: 8, zone: zone(21), reasons: ['Sweet berry fragrance when ripe', 'Kid-favourite fruit near path for easy picking'] },
        { plantSlug: 'corsican-mint', plantName: 'Corsican Mint', row: 21, col: 9, zone: zone(21), reasons: ['Intense peppermint scent released underfoot', 'Low-growing carpet won\'t compete with neighbours — contained in pot'] },
        { plantSlug: 'nicotiana', plantName: 'Nicotiana', row: 22, col: 4, zone: zone(22), reasons: ['Evening fragrance powerhouse — jasmine-like scent', 'Tall enough to create a fragrant backdrop'] },
        { plantSlug: 'nasturtium', plantName: 'Nasturtium', row: 22, col: 5, zone: zone(22), reasons: ['Peppery scent + edible flowers for salads', 'Aphid trap crop protects beans and tomatoes'] },
        { plantSlug: 'courgette', plantName: 'Courgette', row: 22, col: 6, zone: zone(22), reasons: ['High-yield food crop for daily harvest', 'Large flowers are fragrant and attract pollinators'] },
        { plantSlug: 'borage', plantName: 'Borage', row: 22, col: 7, zone: zone(22), reasons: ['Cucumber-scented flowers attract masses of bees', 'Edible blue flowers for drinks and salads'] },
        { plantSlug: 'calendula', plantName: 'Calendula', row: 22, col: 8, zone: zone(22), reasons: ['Resinous herbal scent and golden colour', 'Attracts pollinators for beans and courgettes'] },
        { plantSlug: 'sweet-william', plantName: 'Sweet William', row: 22, col: 9, zone: zone(22), reasons: ['Clove-like fragrance, traditional cottage garden scent', 'End-of-row visual anchor with rich colour'] },
      ],
      raisedBedReplant: {
        rationale: 'Transform the raised bed into a scented herb garden. Aromatic plants at walk-by height release fragrance when brushed.',
        placements: [
          { row: 19, col: 5, plantSlug: 'chamomile' },
          { row: 19, col: 6, plantSlug: 'lemon-balm' },
          { row: 19, col: 7, plantSlug: 'scented-geranium' },
          { row: 19, col: 8, plantSlug: 'corsican-mint' },
          { row: 19, col: 9, plantSlug: 'dianthus' },
          { row: 20, col: 5, plantSlug: 'lavender' },
          { row: 20, col: 6, plantSlug: 'thyme' },
          { row: 20, col: 7, plantSlug: 'basil-sweet' },
          { row: 20, col: 8, plantSlug: 'chamomile' },
          { row: 20, col: 9, plantSlug: 'night-scented-stock' },
        ],
        details: [
          { plantSlug: 'chamomile', plantName: 'Chamomile', row: 19, col: 5, zone: zone(19), reasons: ['Apple scent at raised-bed height — nose-level', 'Dual purpose: fragrance + herbal tea'] },
          { plantSlug: 'lemon-balm', plantName: 'Lemon Balm', row: 19, col: 6, zone: zone(19), reasons: ['Citrus burst when leaves are brushed', 'Contained in raised bed prevents spreading'] },
          { plantSlug: 'scented-geranium', plantName: 'Scented Geranium', row: 19, col: 7, zone: zone(19), reasons: ['Rose-lemon fragrance — centrepiece of the scented bed', 'Textured leaves release scent on touch'] },
          { plantSlug: 'corsican-mint', plantName: 'Corsican Mint', row: 19, col: 8, zone: zone(19), reasons: ['Intense peppermint aroma', 'Raised bed contains its spreading habit'] },
          { plantSlug: 'dianthus', plantName: 'Dianthus', row: 19, col: 9, zone: zone(19), reasons: ['Clove fragrance from edge position', 'Compact flowers at path height'] },
          { plantSlug: 'lavender', plantName: 'Lavender', row: 20, col: 5, zone: zone(20), reasons: ['Classic calming fragrance', 'Bee magnet and pollinator attractor'] },
          { plantSlug: 'thyme', plantName: 'Thyme', row: 20, col: 6, zone: zone(20), reasons: ['Aromatic culinary herb', 'Low-growing, won\'t shade neighbours'] },
          { plantSlug: 'basil-sweet', plantName: 'Sweet Basil', row: 20, col: 7, zone: zone(20), reasons: ['Sweet anise fragrance and culinary staple', 'Warm raised bed soil suits basil well'] },
          { plantSlug: 'chamomile', plantName: 'Chamomile', row: 20, col: 8, zone: zone(20), reasons: ['Second chamomile for tea production', 'Delicate apple-scented daisy flowers'] },
          { plantSlug: 'night-scented-stock', plantName: 'Night-Scented Stock', row: 20, col: 9, zone: zone(20), reasons: ['Evening fragrance from raised bed near seating', 'Modest by day, spectacular scent at dusk'] },
        ],
      },
      stats: { totalPlants: 18, uniqueVarieties: 16, companionPairs: 7, estimatedYieldKg: 15, estimatedValueGBP: 95 },
    },

    // ═══ 4. Companion Planting Fortress ═══════════════════════════════════════
    {
      id: 'companion-fortress',
      name: 'Companion Planting Fortress',
      emoji: '🛡️',
      description: 'Every plant chosen to protect its neighbours. Basil with tomatoes (deters whitefly), marigolds with beans (deters beetles), nasturtiums as aphid trap crops, chives with strawberries (deters grey mould). Zero foe conflicts.',
      placements: [
        { row: 18, col: 4, plantSlug: 'tomato-tumbling' },
        { row: 18, col: 5, plantSlug: 'basil-sweet' },
        { row: 18, col: 6, plantSlug: 'tomato-tumbling' },
        { row: 18, col: 7, plantSlug: 'basil-sweet' },
        { row: 18, col: 8, plantSlug: 'chives' },
        { row: 18, col: 9, plantSlug: 'strawberry-everbearing' },
        { row: 21, col: 4, plantSlug: 'dwarf-french-bean' },
        { row: 21, col: 5, plantSlug: 'marigold' },
        { row: 21, col: 6, plantSlug: 'dwarf-french-bean' },
        { row: 21, col: 7, plantSlug: 'nasturtium' },
        { row: 21, col: 8, plantSlug: 'lettuce' },
        { row: 21, col: 9, plantSlug: 'spring-onion' },
        { row: 22, col: 4, plantSlug: 'carrot' },
        { row: 22, col: 5, plantSlug: 'rosemary' },
        { row: 22, col: 6, plantSlug: 'kale' },
        { row: 22, col: 7, plantSlug: 'sage' },
        { row: 22, col: 8, plantSlug: 'calendula' },
        { row: 22, col: 9, plantSlug: 'borage' },
      ],
      reasoning: [
        { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 18, col: 4, zone: zone(18), reasons: ['Protected by adjacent basil — whitefly deterrent', 'Sunniest row for maximum fruit production'] },
        { plantSlug: 'basil-sweet', plantName: 'Sweet Basil', row: 18, col: 5, zone: zone(18), reasons: ['Classic tomato companion — repels whitefly and aphids', 'Aromatic oils create protective scent barrier'] },
        { plantSlug: 'tomato-tumbling', plantName: 'Tumbling Tom Tomato', row: 18, col: 6, zone: zone(18), reasons: ['Flanked by basil on both sides — maximum protection', 'RHS-recommended pairing for organic pest control'] },
        { plantSlug: 'basil-sweet', plantName: 'Sweet Basil', row: 18, col: 7, zone: zone(18), reasons: ['Bridge plant between tomatoes and alliums', 'Deters aphids from chives/strawberry section'] },
        { plantSlug: 'chives', plantName: 'Chives', row: 18, col: 8, zone: zone(18), reasons: ['Allium scent deters grey mould on adjacent strawberries', 'Also repels carrot fly from row 22 below'] },
        { plantSlug: 'strawberry-everbearing', plantName: 'Everbearing Strawberry', row: 18, col: 9, zone: zone(18), reasons: ['Protected by chives (grey mould deterrent)', 'End position gets good air circulation reducing disease'] },
        { plantSlug: 'dwarf-french-bean', plantName: 'Dwarf French Bean', row: 21, col: 4, zone: zone(21), reasons: ['Nitrogen-fixer enriches soil for all neighbours', 'Protected by adjacent marigold against beetles'] },
        { plantSlug: 'marigold', plantName: 'Marigold', row: 21, col: 5, zone: zone(21), reasons: ['Root secretions deter nematodes and beetles from beans', 'Attracts hoverflies whose larvae eat aphids'] },
        { plantSlug: 'dwarf-french-bean', plantName: 'Dwarf French Bean', row: 21, col: 6, zone: zone(21), reasons: ['Second bean between two companion flowers', 'Nasturtium and marigold create pest-free zone'] },
        { plantSlug: 'nasturtium', plantName: 'Nasturtium', row: 21, col: 7, zone: zone(21), reasons: ['Sacrificial aphid trap — lures pests away from food crops', 'Also deters whitefly from nearby tomato row'] },
        { plantSlug: 'lettuce', plantName: 'Lettuce', row: 21, col: 8, zone: zone(21), reasons: ['Living mulch: shades soil, conserves moisture', 'Protected by spring onion\'s allium barrier'] },
        { plantSlug: 'spring-onion', plantName: 'Spring Onion', row: 21, col: 9, zone: zone(21), reasons: ['Allium scent deters carrot fly (row 22) and aphids', 'Thin profile interplants without competing for light'] },
        { plantSlug: 'carrot', plantName: 'Carrot', row: 22, col: 4, zone: zone(22), reasons: ['Protected by rosemary scent from carrot fly', 'Spring onion above also deters carrot fly'] },
        { plantSlug: 'rosemary', plantName: 'Rosemary', row: 22, col: 5, zone: zone(22), reasons: ['Strong aromatic oils repel carrot fly and cabbage moth', 'Perennial — establishes and strengthens over time'] },
        { plantSlug: 'kale', plantName: 'Kale', row: 22, col: 6, zone: zone(22), reasons: ['Brassica protected by sage and rosemary scent barriers', 'Hardy crop tolerates partial shade from hedge'] },
        { plantSlug: 'sage', plantName: 'Sage', row: 22, col: 7, zone: zone(22), reasons: ['Deters cabbage moth from adjacent kale', 'Aromatic perennial herb strengthens companion barrier'] },
        { plantSlug: 'calendula', plantName: 'Calendula', row: 22, col: 8, zone: zone(22), reasons: ['Attracts beneficial insects (hoverflies, ladybirds)', 'Sticky stems trap whitefly — natural pest control'] },
        { plantSlug: 'borage', plantName: 'Borage', row: 22, col: 9, zone: zone(22), reasons: ['Major bee attractor — ensures pollination across terrace', 'Deters tomato hornworm and cabbage worms'] },
      ],
      raisedBedReplant: {
        rationale: 'Fill raised bed with protective herbs and alliums that shield adjacent terrace crops. A companion "control centre" radiating pest protection.',
        placements: [
          { row: 19, col: 5, plantSlug: 'chives' },
          { row: 19, col: 6, plantSlug: 'basil-sweet' },
          { row: 19, col: 7, plantSlug: 'marigold' },
          { row: 19, col: 8, plantSlug: 'chives' },
          { row: 19, col: 9, plantSlug: 'thyme' },
          { row: 20, col: 5, plantSlug: 'rosemary' },
          { row: 20, col: 6, plantSlug: 'oregano' },
          { row: 20, col: 7, plantSlug: 'nasturtium' },
          { row: 20, col: 8, plantSlug: 'sage' },
          { row: 20, col: 9, plantSlug: 'parsley' },
        ],
        details: [
          { plantSlug: 'chives', plantName: 'Chives', row: 19, col: 5, zone: zone(19), reasons: ['Allium barrier protects strawberries from grey mould', 'Scent radiates to terrace row above'] },
          { plantSlug: 'basil-sweet', plantName: 'Sweet Basil', row: 19, col: 6, zone: zone(19), reasons: ['Central basil extends whitefly protection from row 18', 'Aromatic shield for entire raised bed'] },
          { plantSlug: 'marigold', plantName: 'Marigold', row: 19, col: 7, zone: zone(19), reasons: ['Root nematode deterrent in raised bed soil', 'Attracts hoverflies to protect surrounding crops'] },
          { plantSlug: 'chives', plantName: 'Chives', row: 19, col: 8, zone: zone(19), reasons: ['Second allium extends grey mould protection zone', 'Deters aphids from neighbouring plants'] },
          { plantSlug: 'thyme', plantName: 'Thyme', row: 19, col: 9, zone: zone(19), reasons: ['Slug deterrent — thyme oil repels gastropods', 'Low-growing ground cover reduces pest habitat'] },
          { plantSlug: 'rosemary', plantName: 'Rosemary', row: 20, col: 5, zone: zone(20), reasons: ['Carrot fly barrier for row 22 carrots', 'Strong scent disrupts pest navigation'] },
          { plantSlug: 'oregano', plantName: 'Oregano', row: 20, col: 6, zone: zone(20), reasons: ['General pest repellent — carvacrol oils deter many insects', 'Mediterranean herb thrives in raised bed drainage'] },
          { plantSlug: 'nasturtium', plantName: 'Nasturtium', row: 20, col: 7, zone: zone(20), reasons: ['Central aphid trap draws pests away from food crops', 'Bright flowers also attract pollinators'] },
          { plantSlug: 'sage', plantName: 'Sage', row: 20, col: 8, zone: zone(20), reasons: ['Cabbage moth deterrent for row 22 kale', 'Perennial — protection builds over seasons'] },
          { plantSlug: 'parsley', plantName: 'Parsley', row: 20, col: 9, zone: zone(20), reasons: ['Attracts hoverflies whose larvae eat aphids', 'Biennial herb with year-round utility'] },
        ],
      },
      stats: { totalPlants: 18, uniqueVarieties: 14, companionPairs: 12, estimatedYieldKg: 20, estimatedValueGBP: 110 },
    },
  ];
}
