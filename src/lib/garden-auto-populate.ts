import type { Plant } from '../types/plant';
import type { GardenCell, GardenConfig, CellType } from '../types/planner';

export type GardenLayoutStrategy = 'sun-optimized' | 'kitchen-garden' | 'maximum-yield';

export interface GardenLayoutOption {
  id: string;
  name: string;
  description: string;
  strategy: GardenLayoutStrategy;
  /** Only places plants in cells that are already painted as veg-patch, raised-bed, or flower-bed */
  placements: { row: number; col: number; plantSlug: string }[];
  stats: {
    totalPlanted: number;
    uniquePlants: number;
    avgSunHours: number;
  };
}

interface PlantableCell {
  row: number;
  col: number;
  type: CellType;
  sunHours: number;
}

// Get all cells that can receive plants (veg patches, raised beds, flower beds)
function getPlantableCells(cells: GardenCell[][]): PlantableCell[] {
  const result: PlantableCell[] = [];
  for (let row = 0; row < cells.length; row++) {
    for (let col = 0; col < cells[row].length; col++) {
      const cell = cells[row][col];
      if (cell.type === 'veg-patch' || cell.type === 'raised-bed' || cell.type === 'flower-bed') {
        result.push({
          row,
          col,
          type: cell.type,
          sunHours: cell.sunHours ?? 6, // assume full sun if not calculated
        });
      }
    }
  }
  return result;
}

// Classify sun requirement
function plantNeedsSun(plant: Plant): number {
  if (plant.sun === 'full-sun') return 6;
  if (plant.sun === 'partial-shade') return 3;
  return 1;
}

// Sort plants by sun requirement (highest first)
function sortBySunNeed(plants: Plant[]): Plant[] {
  return [...plants].sort((a, b) => plantNeedsSun(b) - plantNeedsSun(a));
}

// Calculate spacing: how many cells apart plants should be
function spacingInCells(plant: Plant, cellSizeM: number): number {
  const spacingM = (plant.spacingCm || 30) / 100;
  return Math.max(1, Math.round(spacingM / cellSizeM));
}

// Check if a cell is far enough from other placements of the same plant
function respectsSpacing(
  row: number,
  col: number,
  slug: string,
  placements: { row: number; col: number; plantSlug: string }[],
  minDist: number
): boolean {
  for (const p of placements) {
    if (p.plantSlug === slug) {
      const dist = Math.max(Math.abs(p.row - row), Math.abs(p.col - col));
      if (dist < minDist) return false;
    }
  }
  return true;
}

/**
 * Strategy 1: Sun-Optimized
 * Places sun-hungry plants in the sunniest spots, shade-tolerant in shadier areas.
 * Reads the actual sun hours grid from the solar engine.
 */
function sunOptimizedLayout(
  plants: Plant[],
  cells: GardenCell[][],
  config: GardenConfig
): GardenLayoutOption {
  const plantable = getPlantableCells(cells);
  if (plantable.length === 0) {
    return { id: 'sun-optimized', name: 'Sun-Optimized', description: 'Paint some veg patches first!', strategy: 'sun-optimized', placements: [], stats: { totalPlanted: 0, uniquePlants: 0, avgSunHours: 0 } };
  }

  // Sort cells by sun hours (sunniest first)
  const sortedCells = [...plantable].sort((a, b) => b.sunHours - a.sunHours);

  // Categorize plants by sun need
  const fullSun = plants.filter((p) => p.sun === 'full-sun' && p.greenstalkSuitability !== undefined);
  const partialShade = plants.filter((p) => p.sun === 'partial-shade');
  const shade = plants.filter((p) => p.sun === 'full-shade');

  // Priority order for veg patches: productive veg first
  const vegPriority = [
    'tomato-tumbling', 'courgette', 'pepper-sweet', 'pepper-chilli', 'cucumber',
    'dwarf-french-bean', 'runner-bean', 'broad-bean', 'pea',
    'beetroot', 'carrot', 'potato-early', 'onion-sets',
    'lettuce', 'radish', 'spring-onion', 'rocket',
  ];

  // Flowers for flower beds
  const flowerPriority = [
    'nasturtium', 'marigold', 'calendula', 'sunflower', 'lavender',
    'borage', 'cornflower', 'sweet-william', 'dwarf-sweet-pea',
  ];

  const placements: { row: number; col: number; plantSlug: string }[] = [];
  const usedCells = new Set<string>();
  const plantCounts = new Map<string, number>();

  function tryPlace(slug: string, cell: PlantableCell): boolean {
    const key = `${cell.row}-${cell.col}`;
    if (usedCells.has(key)) return false;

    const plant = plants.find((p) => p.slug === slug);
    if (!plant) return false;

    const spacing = spacingInCells(plant, config.cellSizeM);
    if (!respectsSpacing(cell.row, cell.col, slug, placements, spacing)) return false;

    // Check sun compatibility
    const minSun = plantNeedsSun(plant);
    if (cell.sunHours < minSun - 1) return false; // allow 1h grace

    placements.push({ row: cell.row, col: cell.col, plantSlug: slug });
    usedCells.add(key);
    plantCounts.set(slug, (plantCounts.get(slug) ?? 0) + 1);
    return true;
  }

  // Place sun-hungry veg in sunniest veg-patch/raised-bed cells
  const vegCells = sortedCells.filter((c) => c.type === 'veg-patch' || c.type === 'raised-bed');
  const flowerCells = sortedCells.filter((c) => c.type === 'flower-bed');

  // Assign veg to veg cells
  let vegIdx = 0;
  for (const cell of vegCells) {
    // Cycle through priority list, respecting spacing
    let placed = false;
    for (let attempt = 0; attempt < vegPriority.length; attempt++) {
      const slug = vegPriority[(vegIdx + attempt) % vegPriority.length];
      if (tryPlace(slug, cell)) {
        vegIdx = (vegIdx + attempt + 1) % vegPriority.length;
        placed = true;
        break;
      }
    }
    // Fallback: shade-tolerant plants for shady cells
    if (!placed && cell.sunHours < 4) {
      for (const slug of ['perpetual-spinach', 'swiss-chard', 'rocket', 'lettuce', 'kale']) {
        if (tryPlace(slug, cell)) break;
      }
    }
  }

  // Assign flowers to flower beds
  let flowerIdx = 0;
  for (const cell of flowerCells) {
    for (let attempt = 0; attempt < flowerPriority.length; attempt++) {
      const slug = flowerPriority[(flowerIdx + attempt) % flowerPriority.length];
      if (tryPlace(slug, cell)) {
        flowerIdx = (flowerIdx + attempt + 1) % flowerPriority.length;
        break;
      }
    }
  }

  const avgSun = placements.length > 0
    ? placements.reduce((sum, p) => sum + (cells[p.row]?.[p.col]?.sunHours ?? 0), 0) / placements.length
    : 0;

  return {
    id: 'sun-optimized',
    name: 'Sun-Optimized',
    description: `Places sun-hungry crops (tomatoes, peppers, courgettes) in your sunniest spots and shade-tolerant greens (spinach, chard) in shadier areas. Uses your ${config.facing}-facing garden's actual sun data.`,
    strategy: 'sun-optimized',
    placements,
    stats: {
      totalPlanted: placements.length,
      uniquePlants: new Set(placements.map((p) => p.plantSlug)).size,
      avgSunHours: Math.round(avgSun * 10) / 10,
    },
  };
}

/**
 * Strategy 2: Kitchen Garden
 * Prioritizes daily cooking staples: herbs near the house (back rows),
 * salad greens in partial shade, main crops in full sun.
 */
function kitchenGardenLayout(
  plants: Plant[],
  cells: GardenCell[][],
  config: GardenConfig
): GardenLayoutOption {
  const plantable = getPlantableCells(cells);
  if (plantable.length === 0) {
    return { id: 'kitchen-garden', name: 'Kitchen Garden', description: 'Paint some veg patches first!', strategy: 'kitchen-garden', placements: [], stats: { totalPlanted: 0, uniquePlants: 0, avgSunHours: 0 } };
  }

  // Split by distance from house (row 0 = closest to house)
  const maxRow = Math.max(...plantable.map((c) => c.row));
  const nearHouse = plantable.filter((c) => c.row <= maxRow * 0.3);
  const midGarden = plantable.filter((c) => c.row > maxRow * 0.3 && c.row <= maxRow * 0.7);
  const farGarden = plantable.filter((c) => c.row > maxRow * 0.7);

  // Near house: herbs (grab and go for cooking)
  const herbSlugs = ['basil-sweet', 'thyme', 'oregano', 'parsley', 'chives', 'mint', 'rosemary', 'sage', 'coriander', 'dill'];
  // Mid garden: salad + quick crops
  const saladSlugs = ['lettuce', 'rocket', 'radish', 'spring-onion', 'perpetual-spinach', 'swiss-chard', 'beetroot'];
  // Far garden: main crops
  const mainSlugs = ['tomato-tumbling', 'courgette', 'dwarf-french-bean', 'runner-bean', 'pea', 'carrot', 'potato-early', 'onion-sets', 'kale', 'broccoli-sprouting'];

  const placements: { row: number; col: number; plantSlug: string }[] = [];
  const usedCells = new Set<string>();

  function place(slug: string, cell: PlantableCell): boolean {
    const key = `${cell.row}-${cell.col}`;
    if (usedCells.has(key)) return false;
    const plant = plants.find((p) => p.slug === slug || p.slug.includes(slug) || slug.includes(p.slug));
    if (!plant) return false;
    const spacing = spacingInCells(plant, config.cellSizeM);
    if (!respectsSpacing(cell.row, cell.col, plant.slug, placements, spacing)) return false;
    placements.push({ row: cell.row, col: cell.col, plantSlug: plant.slug });
    usedCells.add(key);
    return true;
  }

  // Place herbs near house
  let idx = 0;
  for (const cell of nearHouse) {
    if (cell.type === 'flower-bed') {
      place('lavender', cell) || place('nasturtium', cell) || place('marigold', cell);
    } else {
      for (let a = 0; a < herbSlugs.length; a++) {
        if (place(herbSlugs[(idx + a) % herbSlugs.length], cell)) { idx = (idx + a + 1) % herbSlugs.length; break; }
      }
    }
  }

  idx = 0;
  for (const cell of midGarden) {
    if (cell.type === 'flower-bed') {
      place('calendula', cell) || place('borage', cell) || place('cornflower', cell);
    } else {
      for (let a = 0; a < saladSlugs.length; a++) {
        if (place(saladSlugs[(idx + a) % saladSlugs.length], cell)) { idx = (idx + a + 1) % saladSlugs.length; break; }
      }
    }
  }

  idx = 0;
  for (const cell of farGarden) {
    if (cell.type === 'flower-bed') {
      place('sunflower', cell) || place('sweet-william', cell);
    } else {
      for (let a = 0; a < mainSlugs.length; a++) {
        if (place(mainSlugs[(idx + a) % mainSlugs.length], cell)) { idx = (idx + a + 1) % mainSlugs.length; break; }
      }
    }
  }

  const avgSun = placements.length > 0
    ? placements.reduce((sum, p) => sum + (cells[p.row]?.[p.col]?.sunHours ?? 0), 0) / placements.length
    : 0;

  return {
    id: 'kitchen-garden',
    name: 'Kitchen Garden',
    description: 'Herbs near the house for quick access while cooking, salad greens in the middle, main crops at the far end. Designed for daily use.',
    strategy: 'kitchen-garden',
    placements,
    stats: {
      totalPlanted: placements.length,
      uniquePlants: new Set(placements.map((p) => p.plantSlug)).size,
      avgSunHours: Math.round(avgSun * 10) / 10,
    },
  };
}

/**
 * Strategy 3: Maximum Yield
 * Fills every available cell with the highest-yielding crops,
 * using succession planting logic.
 */
function maximumYieldLayout(
  plants: Plant[],
  cells: GardenCell[][],
  config: GardenConfig
): GardenLayoutOption {
  const plantable = getPlantableCells(cells);
  if (plantable.length === 0) {
    return { id: 'maximum-yield', name: 'Maximum Yield', description: 'Paint some veg patches first!', strategy: 'maximum-yield', placements: [], stats: { totalPlanted: 0, uniquePlants: 0, avgSunHours: 0 } };
  }

  // High-yield crops ranked by productivity per square metre
  const yieldRanked = [
    'tomato-tumbling', 'courgette', 'dwarf-french-bean', 'runner-bean',
    'beetroot', 'lettuce', 'radish', 'perpetual-spinach', 'swiss-chard',
    'spring-onion', 'pea', 'potato-early', 'carrot', 'kale',
    'onion-sets', 'rocket', 'cucumber', 'broad-bean',
  ];

  const flowerCompanions = ['nasturtium', 'marigold', 'calendula', 'borage'];

  const placements: { row: number; col: number; plantSlug: string }[] = [];
  const usedCells = new Set<string>();

  // Sort by sun (sunniest first) to maximize yield
  const sorted = [...plantable].sort((a, b) => b.sunHours - a.sunHours);

  let vegIdx = 0;
  let flowerIdx = 0;

  for (const cell of sorted) {
    const key = `${cell.row}-${cell.col}`;
    if (usedCells.has(key)) continue;

    if (cell.type === 'flower-bed') {
      for (let a = 0; a < flowerCompanions.length; a++) {
        const slug = flowerCompanions[(flowerIdx + a) % flowerCompanions.length];
        const plant = plants.find((p) => p.slug === slug || p.slug.includes(slug));
        if (plant) {
          placements.push({ row: cell.row, col: cell.col, plantSlug: plant.slug });
          usedCells.add(key);
          flowerIdx = (flowerIdx + a + 1) % flowerCompanions.length;
          break;
        }
      }
      continue;
    }

    // Veg cells: place highest yield that fits sun and spacing
    for (let a = 0; a < yieldRanked.length; a++) {
      const slug = yieldRanked[(vegIdx + a) % yieldRanked.length];
      const plant = plants.find((p) => p.slug === slug || p.slug.includes(slug));
      if (!plant) continue;

      const minSun = plantNeedsSun(plant);
      if (cell.sunHours < minSun - 1) continue;

      const spacing = spacingInCells(plant, config.cellSizeM);
      if (!respectsSpacing(cell.row, cell.col, plant.slug, placements, spacing)) continue;

      placements.push({ row: cell.row, col: cell.col, plantSlug: plant.slug });
      usedCells.add(key);
      vegIdx = (vegIdx + a + 1) % yieldRanked.length;
      break;
    }
  }

  const avgSun = placements.length > 0
    ? placements.reduce((sum, p) => sum + (cells[p.row]?.[p.col]?.sunHours ?? 0), 0) / placements.length
    : 0;

  return {
    id: 'maximum-yield',
    name: 'Maximum Yield',
    description: 'Fills every cell with the highest-producing crops. Tomatoes, courgettes, and beans in full sun; leafy greens in shade. Every square metre earning its keep.',
    strategy: 'maximum-yield',
    placements,
    stats: {
      totalPlanted: placements.length,
      uniquePlants: new Set(placements.map((p) => p.plantSlug)).size,
      avgSunHours: Math.round(avgSun * 10) / 10,
    },
  };
}

export function generateGardenLayouts(
  plants: Plant[],
  cells: GardenCell[][],
  config: GardenConfig
): GardenLayoutOption[] {
  return [
    sunOptimizedLayout(plants, cells, config),
    kitchenGardenLayout(plants, cells, config),
    maximumYieldLayout(plants, cells, config),
  ];
}
