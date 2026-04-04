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

export interface EsherLayoutOption {
  id: string;
  name: string;
  description: string;
  emoji: string;
  placements: { row: number; col: number; plantSlug: string }[];
  stats: {
    totalPlants: number;
    uniqueVarieties: number;
    companionPairs: number;
    estimatedYieldKg: number;
    estimatedValueGBP: number;
  };
}

/**
 * Generate ranked layout options for the Esher Avenue terrace.
 * These only affect the plantable areas (veg-patch, raised-bed, flower-bed)
 * — not the lawn, paths, or structures.
 */
export function generateEsherLayouts(): EsherLayoutOption[] {
  return [
    {
      id: 'max-food',
      name: 'Maximum Food Production',
      emoji: '🥗',
      description: 'Every available spot grows edible crops. Herbs near the conservatory for quick kitchen access. Tomatoes and beans in the sunniest terrace spots. Strawberries fill the raised bed. Companion flowers at the edges.',
      placements: [
        // Terrace veg patches (sunny spots either side of path)
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
      stats: { totalPlants: 18, uniqueVarieties: 12, companionPairs: 8, estimatedYieldKg: 25, estimatedValueGBP: 120 },
    },
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
      stats: { totalPlants: 18, uniqueVarieties: 10, companionPairs: 6, estimatedYieldKg: 18, estimatedValueGBP: 85 },
    },
    {
      id: 'fragrant-edible',
      name: 'Fragrant Edible Garden',
      emoji: '🌸',
      description: "David's ideal: food crops interwoven with fragrant plants for sensory richness. Night-scented stock for evening fragrance, dianthus for clove scent, lemon balm for citrus, plus all the core edibles. Every spot is either food or fragrance.",
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
      stats: { totalPlants: 18, uniqueVarieties: 16, companionPairs: 7, estimatedYieldKg: 15, estimatedValueGBP: 95 },
    },
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
      stats: { totalPlants: 18, uniqueVarieties: 14, companionPairs: 12, estimatedYieldKg: 20, estimatedValueGBP: 110 },
    },
  ];
}
