import type { Plant } from '../types/plant';
import type { CompanionMap, CompanionEdge } from '../types/companion';
import type { GardenCell, GardenConfig, CellType } from '../types/planner';
import { scorePlant, getSlugRisk } from './garden-rating';

export type GardenLayoutStrategy = 'sun-optimized' | 'kitchen-garden' | 'maximum-yield' | 'highest-grade';

export interface PlacementReason {
  plantSlug: string;
  plantName: string;
  row: number;
  col: number;
  reasons: string[];
}

export interface GardenLayoutOption {
  id: string;
  name: string;
  description: string;
  strategy: GardenLayoutStrategy;
  placements: { row: number; col: number; plantSlug: string }[];
  reasoning: PlacementReason[];
  stats: {
    totalPlanted: number;
    uniquePlants: number;
    avgSunHours: number;
    companionPairs: number;
    conflictsAvoided: number;
  };
}

interface PlantableCell {
  row: number;
  col: number;
  type: CellType;
  sunHours: number;
}

// Get all cells that can receive plants
function getPlantableCells(cells: GardenCell[][]): PlantableCell[] {
  const result: PlantableCell[] = [];
  for (let row = 0; row < cells.length; row++) {
    for (let col = 0; col < cells[row].length; col++) {
      const cell = cells[row][col];
      if (cell.type === 'veg-patch' || cell.type === 'raised-bed' || cell.type === 'flower-bed' || cell.type === 'conservatory') {
        result.push({ row, col, type: cell.type, sunHours: cell.sunHours ?? (cell.type === 'conservatory' ? 3 : 6) });
      }
    }
  }
  return result;
}

// Plants suitable for a LOW-LIGHT conservatory (NW-facing, ~2-3h effective light)
// NO sun-lovers: no tomatoes, basil, citrus, peppers — they need 6h+ direct sun
// Only shade-tolerant herbs and foliage that thrive in filtered light
const CONSERVATORY_SLUGS = [
  'fern-hardy', 'mint', 'lemon-balm', 'parsley', 'coriander', 'chives',
  'bay-laurel',  // tolerates shade, architectural evergreen
];

function plantNeedsSun(plant: Plant): number {
  if (plant.sun === 'full-sun') return 6;
  if (plant.sun === 'partial-shade') return 3;
  return 1;
}

function spacingInCells(plant: Plant, cellSizeM: number): number {
  const spacingM = (plant.spacingCm || 30) / 100;
  return Math.max(1, Math.round(spacingM / cellSizeM));
}

function respectsSpacing(
  row: number, col: number, slug: string,
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

// Get adjacent placed plants (within 2 cells)
function getNeighbours(
  row: number, col: number,
  placements: { row: number; col: number; plantSlug: string }[],
  radius = 2
): string[] {
  return placements
    .filter((p) => Math.abs(p.row - row) <= radius && Math.abs(p.col - col) <= radius)
    .map((p) => p.plantSlug);
}

// Score a placement based on companion relationships
function companionScore(
  slug: string,
  neighbours: string[],
  companionMap: CompanionMap
): { score: number; friendReasons: string[]; foeReasons: string[] } {
  let score = 0;
  const friendReasons: string[] = [];
  const foeReasons: string[] = [];
  const plantRelations = companionMap.get(slug);
  if (!plantRelations) return { score, friendReasons, foeReasons };

  for (const n of neighbours) {
    const edge = plantRelations.get(n);
    if (!edge) continue;
    if (edge.relationship === 'friend') {
      score += 3;
      friendReasons.push(edge.reason);
    } else if (edge.relationship === 'foe') {
      score -= 5;
      foeReasons.push(edge.reason);
    }
  }
  return { score, friendReasons, foeReasons };
}

// Is a plant "tall" (would shade neighbours)?
function isTallPlant(plant: Plant): boolean {
  return plant.growthHabit === 'climbing' ||
    (plant.spacingCm ?? 0) >= 40 ||
    plant.slug.includes('tomato') ||
    plant.slug.includes('bean') ||
    plant.slug.includes('pea') ||
    plant.slug.includes('corn') ||
    plant.slug.includes('sunflower');
}

function sunLabel(hours: number): string {
  if (hours >= 8) return 'full sun';
  if (hours >= 6) return 'good sun';
  if (hours >= 3) return 'partial shade';
  return 'shade';
}

interface PlacementContext {
  placements: { row: number; col: number; plantSlug: string }[];
  reasoning: PlacementReason[];
  usedCells: Set<string>;
  companionPairs: number;
  conflictsAvoided: number;
}

function tryPlaceWithReasoning(
  slug: string,
  cell: PlantableCell,
  plant: Plant,
  config: GardenConfig,
  companionMap: CompanionMap,
  ctx: PlacementContext,
  extraReasons: string[] = []
): boolean {
  const key = `${cell.row}-${cell.col}`;
  if (ctx.usedCells.has(key)) return false;

  const spacing = spacingInCells(plant, config.cellSizeM);
  if (!respectsSpacing(cell.row, cell.col, slug, ctx.placements, spacing)) return false;

  const minSun = plantNeedsSun(plant);
  if (cell.sunHours < minSun - 1) return false;

  // Check companion score
  const neighbours = getNeighbours(cell.row, cell.col, ctx.placements);
  const { score, friendReasons, foeReasons } = companionScore(slug, neighbours, companionMap);

  // Reject placements with strong foe conflicts
  if (score < -3) {
    ctx.conflictsAvoided++;
    return false;
  }

  ctx.placements.push({ row: cell.row, col: cell.col, plantSlug: slug });
  ctx.usedCells.add(key);

  if (score > 0) ctx.companionPairs += friendReasons.length;

  // Build reasoning
  const reasons: string[] = [...extraReasons];
  reasons.push(`${sunLabel(cell.sunHours)} zone (${cell.sunHours}h) — needs ${minSun}h+`);
  for (const r of friendReasons) reasons.push(`Companion: ${r}`);
  for (const r of foeReasons) reasons.push(`Warning: ${r}`);

  ctx.reasoning.push({
    plantSlug: slug,
    plantName: plant.commonName,
    row: cell.row,
    col: cell.col,
    reasons,
  });

  return true;
}

/** Fill conservatory cells with shade-tolerant houseplants & herbs */
function fillConservatory(
  conservatoryCells: PlantableCell[],
  plants: Plant[],
  config: GardenConfig,
  companionMap: CompanionMap,
  ctx: PlacementContext
): void {
  // Dwarf tree focal point first, then herbs to fill
  for (const cell of conservatoryCells) {
    if (ctx.usedCells.has(`${cell.row}-${cell.col}`)) continue;
    for (const slug of CONSERVATORY_SLUGS) {
      const plant = plants.find((p) => p.slug === slug);
      if (!plant) continue;
      if (tryPlaceWithReasoning(slug, cell, plant, config, companionMap, ctx,
        ['Conservatory: shade-tolerant, frost-free zone — ideal for tender plants and herbs'])) break;
    }
  }
}

/** Fill empty veg/raised-bed cells with soil-improving green manures */
function fillSoilImprovers(
  emptyCells: PlantableCell[],
  plants: Plant[],
  config: GardenConfig,
  companionMap: CompanionMap,
  ctx: PlacementContext
): void {
  const soilSlugs = ['comfrey', 'crimson-clover', 'phacelia', 'borage'];
  for (const cell of emptyCells) {
    if (ctx.usedCells.has(`${cell.row}-${cell.col}`)) continue;
    for (const slug of soilSlugs) {
      const plant = plants.find((p) => p.slug === slug);
      if (!plant) continue;
      if (tryPlaceWithReasoning(slug, cell, plant, config, companionMap, ctx,
        ['Soil improver: fills bare soil, fixes nitrogen or mines minerals'])) break;
    }
  }
}

function emptyResult(id: string, name: string, strategy: GardenLayoutStrategy): GardenLayoutOption {
  return {
    id, name, description: 'Paint some veg patches first!', strategy,
    placements: [], reasoning: [],
    stats: { totalPlanted: 0, uniquePlants: 0, avgSunHours: 0, companionPairs: 0, conflictsAvoided: 0 },
  };
}

function computeStats(
  ctx: PlacementContext,
  cells: GardenCell[][]
): GardenLayoutOption['stats'] {
  const avgSun = ctx.placements.length > 0
    ? ctx.placements.reduce((s, p) => s + (cells[p.row]?.[p.col]?.sunHours ?? 0), 0) / ctx.placements.length
    : 0;
  return {
    totalPlanted: ctx.placements.length,
    uniquePlants: new Set(ctx.placements.map((p) => p.plantSlug)).size,
    avgSunHours: Math.round(avgSun * 10) / 10,
    companionPairs: ctx.companionPairs,
    conflictsAvoided: ctx.conflictsAvoided,
  };
}

/**
 * Strategy 1: Sun-Optimized with Companion Planting
 * - Sun-hungry plants in sunniest spots, shade-tolerant in shadier areas
 * - Companion plants placed adjacent to their friends
 * - Foes kept apart
 * - Tall plants toward the back (row 0 = house) so they don't shade shorter ones
 */
function sunOptimizedLayout(
  plants: Plant[],
  cells: GardenCell[][],
  config: GardenConfig,
  companionMap: CompanionMap
): GardenLayoutOption {
  const plantable = getPlantableCells(cells);
  if (!plantable.length) return emptyResult('sun-optimized', 'Sun-Optimized', 'sun-optimized');

  const ctx: PlacementContext = {
    placements: [], reasoning: [], usedCells: new Set(), companionPairs: 0, conflictsAvoided: 0,
  };

  // Sort cells: sunniest first, within same sun level prefer cells farther from house for tall plants
  const sortedCells = [...plantable].sort((a, b) => {
    const sunDiff = b.sunHours - a.sunHours;
    if (Math.abs(sunDiff) > 1) return sunDiff;
    return b.row - a.row; // farther from house (higher row)
  });

  const vegCells = sortedCells.filter((c) => c.type === 'veg-patch' || c.type === 'raised-bed');
  const flowerCells = sortedCells.filter((c) => c.type === 'flower-bed');

  // Phase 1: Place tall sun-hungry plants in sunniest spots far from house
  const tallSlugs = ['tomato-tumbling', 'zucchini', 'courgette', 'cucumber', 'pepper-chilli', 'bell-pepper', 'eggplant'];
  const tallFarCells = vegCells.filter((c) => c.sunHours >= 6).sort((a, b) => b.row - a.row);

  for (const slug of tallSlugs) {
    const plant = plants.find((p) => p.slug === slug || p.slug.includes(slug));
    if (!plant) continue;
    for (const cell of tallFarCells) {
      if (tryPlaceWithReasoning(plant.slug, cell, plant, config, companionMap, ctx,
        ['Tall plant placed far from house to avoid shading shorter crops'])) break;
    }
  }

  // Phase 2: Place companion plants adjacent to what's already placed
  const companionSlugs = ['basil-sweet', 'marigold', 'nasturtium', 'chives', 'parsley'];
  for (const slug of companionSlugs) {
    const plant = plants.find((p) => p.slug === slug || p.slug.includes(slug));
    if (!plant) continue;

    // Find cells adjacent to existing placements that would benefit from this companion
    for (const cell of vegCells) {
      const neighbours = getNeighbours(cell.row, cell.col, ctx.placements);
      const { score } = companionScore(plant.slug, neighbours, companionMap);
      if (score > 0) {
        tryPlaceWithReasoning(plant.slug, cell, plant, config, companionMap, ctx,
          ['Placed as companion to adjacent plants']);
      }
    }
  }

  // Phase 3: Fill remaining spots with appropriate crops
  const fillSlugs = [
    'dwarf-french-bean', 'bush-bean', 'pea', 'lettuce', 'radish', 'spring-onion',
    'perpetual-spinach', 'spinach', 'swiss-chard', 'kale', 'arugula', 'rocket',
    'carrot', 'beet', 'beetroot', 'thyme', 'oregano',
  ];

  for (const cell of vegCells) {
    if (ctx.usedCells.has(`${cell.row}-${cell.col}`)) continue;
    for (const slug of fillSlugs) {
      const plant = plants.find((p) => p.slug === slug || p.slug.includes(slug));
      if (!plant) continue;
      if (tryPlaceWithReasoning(plant.slug, cell, plant, config, companionMap, ctx)) break;
    }
  }

  // Phase 4: Flowers in flower beds (pest deterrents)
  const flowerSlugs = ['nasturtium', 'marigold', 'calendula', 'sunflower', 'dwarf-sweet-pea'];
  for (const cell of flowerCells) {
    for (const slug of flowerSlugs) {
      const plant = plants.find((p) => p.slug === slug || p.slug.includes(slug));
      if (!plant) continue;
      if (tryPlaceWithReasoning(plant.slug, cell, plant, config, companionMap, ctx,
        ['Flower: attracts pollinators and deters pests'])) break;
    }
  }

  // Phase 5: Conservatory plants
  const conservatoryCells = sortedCells.filter((c) => c.type === 'conservatory');
  fillConservatory(conservatoryCells, plants, config, companionMap, ctx);

  // Phase 6: Soil improvers in remaining empty cells
  const remainingCells = vegCells.filter((c) => !ctx.usedCells.has(`${c.row}-${c.col}`));
  fillSoilImprovers(remainingCells, plants, config, companionMap, ctx);

  return {
    id: 'sun-optimized', name: 'Sun-Optimized', strategy: 'sun-optimized',
    description: `Sun-hungry crops in your sunniest spots with proven companions adjacent. Tall plants toward the far end to avoid shading. Foes kept apart. ${ctx.companionPairs} companion pairings, ${ctx.conflictsAvoided} conflicts avoided.`,
    placements: ctx.placements, reasoning: ctx.reasoning,
    stats: computeStats(ctx, cells),
  };
}

/**
 * Strategy 2: Kitchen Garden with Companions
 * Herbs near house, salad middle, main crops far end.
 * Companion plants grouped together.
 */
function kitchenGardenLayout(
  plants: Plant[],
  cells: GardenCell[][],
  config: GardenConfig,
  companionMap: CompanionMap
): GardenLayoutOption {
  const plantable = getPlantableCells(cells);
  if (!plantable.length) return emptyResult('kitchen-garden', 'Kitchen Garden', 'kitchen-garden');

  const ctx: PlacementContext = {
    placements: [], reasoning: [], usedCells: new Set(), companionPairs: 0, conflictsAvoided: 0,
  };

  const maxRow = Math.max(...plantable.map((c) => c.row));
  const nearHouse = plantable.filter((c) => c.row <= maxRow * 0.3);
  const midGarden = plantable.filter((c) => c.row > maxRow * 0.3 && c.row <= maxRow * 0.7);
  const farGarden = plantable.filter((c) => c.row > maxRow * 0.7);

  // Near house: herbs (grab-and-go for cooking)
  const herbSlugs = ['basil-sweet', 'thyme', 'oregano', 'parsley', 'chives', 'mint', 'rosemary', 'cilantro', 'dill', 'sage'];
  for (const cell of nearHouse) {
    if (cell.type === 'flower-bed') {
      for (const slug of ['nasturtium', 'marigold', 'calendula']) {
        const p = plants.find((pl) => pl.slug === slug || pl.slug.includes(slug));
        if (p && tryPlaceWithReasoning(p.slug, cell, p, config, companionMap, ctx,
          ['Flower near house for colour and pest deterrence'])) break;
      }
      continue;
    }
    for (const slug of herbSlugs) {
      const p = plants.find((pl) => pl.slug === slug || pl.slug.includes(slug));
      if (p && tryPlaceWithReasoning(p.slug, cell, p, config, companionMap, ctx,
        ['Near house: grab-and-go herbs for cooking'])) break;
    }
  }

  // Mid garden: salad + quick crops
  const saladSlugs = ['lettuce', 'arugula', 'rocket', 'radish', 'spring-onion', 'perpetual-spinach', 'spinach', 'swiss-chard', 'beet', 'beetroot'];
  for (const cell of midGarden) {
    if (cell.type === 'flower-bed') {
      const p = plants.find((pl) => pl.slug === 'calendula' || pl.slug.includes('calendula'));
      if (p) tryPlaceWithReasoning(p.slug, cell, p, config, companionMap, ctx, ['Edible flowers in the mid-garden']);
      continue;
    }
    for (const slug of saladSlugs) {
      const p = plants.find((pl) => pl.slug === slug || pl.slug.includes(slug));
      if (p && tryPlaceWithReasoning(p.slug, cell, p, config, companionMap, ctx,
        ['Mid-garden: quick-harvest salad and greens'])) break;
    }
  }

  // Far garden: main crops
  const mainSlugs = ['tomato-tumbling', 'zucchini', 'courgette', 'dwarf-french-bean', 'bush-bean', 'pea', 'carrot', 'cucumber', 'kale', 'pepper-chilli', 'bell-pepper'];
  for (const cell of farGarden) {
    if (cell.type === 'flower-bed') {
      const p = plants.find((pl) => pl.slug === 'sunflower' || pl.slug.includes('sunflower'));
      if (p) tryPlaceWithReasoning(p.slug, cell, p, config, companionMap, ctx, ['Sunflowers at the garden boundary']);
      continue;
    }
    for (const slug of mainSlugs) {
      const p = plants.find((pl) => pl.slug === slug || pl.slug.includes(slug));
      if (p && tryPlaceWithReasoning(p.slug, cell, p, config, companionMap, ctx,
        ['Far end: space-hungry main crops'])) break;
    }
  }

  // Conservatory: herbs and tender plants
  const conservatoryCells2 = [...plantable].filter((c) => c.type === 'conservatory');
  fillConservatory(conservatoryCells2, plants, config, companionMap, ctx);

  // Soil improvers in any unfilled veg beds
  const remaining2 = plantable.filter((c) => (c.type === 'veg-patch' || c.type === 'raised-bed') && !ctx.usedCells.has(`${c.row}-${c.col}`));
  fillSoilImprovers(remaining2, plants, config, companionMap, ctx);

  return {
    id: 'kitchen-garden', name: 'Kitchen Garden', strategy: 'kitchen-garden',
    description: `Herbs near the house for quick cooking access, salad greens in the middle, main crops at the far end. Conservatory filled with tender herbs and dwarf trees. ${ctx.companionPairs} companion pairings.`,
    placements: ctx.placements, reasoning: ctx.reasoning,
    stats: computeStats(ctx, cells),
  };
}

/**
 * Strategy 3: Maximum Yield with Companion Protection
 * Every cell filled with high-yield crops, companion flowers interspersed.
 */
function maximumYieldLayout(
  plants: Plant[],
  cells: GardenCell[][],
  config: GardenConfig,
  companionMap: CompanionMap
): GardenLayoutOption {
  const plantable = getPlantableCells(cells);
  if (!plantable.length) return emptyResult('maximum-yield', 'Maximum Yield', 'maximum-yield');

  const ctx: PlacementContext = {
    placements: [], reasoning: [], usedCells: new Set(), companionPairs: 0, conflictsAvoided: 0,
  };

  const sorted = [...plantable].sort((a, b) => b.sunHours - a.sunHours);

  const yieldRanked = [
    'tomato-tumbling', 'zucchini', 'courgette', 'dwarf-french-bean', 'bush-bean',
    'beet', 'beetroot', 'lettuce', 'radish', 'perpetual-spinach', 'spinach', 'swiss-chard',
    'spring-onion', 'pea', 'carrot', 'kale', 'arugula', 'rocket', 'cucumber',
  ];

  const flowerCompanions = ['nasturtium', 'marigold', 'calendula'];

  for (const cell of sorted) {
    if (ctx.usedCells.has(`${cell.row}-${cell.col}`)) continue;

    if (cell.type === 'flower-bed') {
      for (const slug of flowerCompanions) {
        const p = plants.find((pl) => pl.slug === slug || pl.slug.includes(slug));
        if (p && tryPlaceWithReasoning(p.slug, cell, p, config, companionMap, ctx,
          ['Companion flower: pest deterrence for adjacent veg'])) break;
      }
      continue;
    }

    // Score each candidate for this cell (sun match + companion bonus)
    let bestSlug: string | null = null;
    let bestScore = -Infinity;
    let bestPlant: Plant | null = null;

    for (const slug of yieldRanked) {
      const plant = plants.find((p) => p.slug === slug || p.slug.includes(slug));
      if (!plant) continue;

      const minSun = plantNeedsSun(plant);
      if (cell.sunHours < minSun - 1) continue;

      const spacing = spacingInCells(plant, config.cellSizeM);
      if (!respectsSpacing(cell.row, cell.col, plant.slug, ctx.placements, spacing)) continue;

      const neighbours = getNeighbours(cell.row, cell.col, ctx.placements);
      const { score } = companionScore(plant.slug, neighbours, companionMap);
      // Combine yield rank (lower index = higher yield) with companion score
      const yieldBonus = (yieldRanked.length - yieldRanked.indexOf(slug)) * 0.5;
      const totalScore = score + yieldBonus;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestSlug = plant.slug;
        bestPlant = plant;
      }
    }

    if (bestSlug && bestPlant) {
      tryPlaceWithReasoning(bestSlug, cell, bestPlant, config, companionMap, ctx,
        ['Highest yield + best companion fit for this spot']);
    }
  }

  // Conservatory plants
  const conservatoryCells3 = sorted.filter((c) => c.type === 'conservatory');
  fillConservatory(conservatoryCells3, plants, config, companionMap, ctx);

  // Soil improvers in remaining cells
  const remaining3 = sorted.filter((c) => (c.type === 'veg-patch' || c.type === 'raised-bed') && !ctx.usedCells.has(`${c.row}-${c.col}`));
  fillSoilImprovers(remaining3, plants, config, companionMap, ctx);

  return {
    id: 'maximum-yield', name: 'Maximum Yield', strategy: 'maximum-yield',
    description: `Every cell filled with the highest-producing crop that also benefits from its neighbours. Soil improvers fill remaining gaps. ${ctx.companionPairs} companion pairings, ${ctx.conflictsAvoided} conflicts avoided.`,
    placements: ctx.placements, reasoning: ctx.reasoning,
    stats: computeStats(ctx, cells),
  };
}

/**
 * Highest Garden Grade — greedy in-ground layout that maximizes the overall
 * garden grade score. Slug-prone plants are PENALIZED in-ground (keep those
 * in GreenStalks where elevation provides natural slug defence).
 */
function highestGradeLayout(
  plants: Plant[],
  cells: GardenCell[][],
  config: GardenConfig,
  companionMap: CompanionMap
): GardenLayoutOption {
  const plantableCells = getPlantableCells(cells).sort((a, b) => b.sunHours - a.sunHours);
  const ctx: PlacementContext = {
    placements: [], reasoning: [], usedCells: new Set(),
    companionPairs: 0, conflictsAvoided: 0,
  };

  const allSlugs: string[] = [];
  const placed = new Set<string>();

  for (const cell of plantableCells) {
    const cellKey = `${cell.row}-${cell.col}`;
    if (ctx.usedCells.has(cellKey)) continue;

    // Filter candidates by sun requirement
    const sunOk = (p: Plant) => {
      const need = p.sun === 'full-sun' ? 6 : p.sun === 'partial-shade' ? 3 : 0;
      return cell.sunHours >= need;
    };

    let bestScore = -Infinity;
    let bestPlant: Plant | null = null;
    let bestReasons: string[] = [];

    // Get adjacent placed plants for companion grouping
    const neighbours = getNeighbours(cell.row, cell.col, ctx.placements);
    const uniqueNeighbours = [...new Set(neighbours)];

    for (const candidate of plants) {
      if (!sunOk(candidate)) continue;
      if (candidate.greenstalkSuitability === 'unsuitable' && cell.type !== 'raised-bed' && cell.type !== 'veg-patch') continue;

      // Score the plant
      const ps = scorePlant(candidate, allSlugs, companionMap, 'inground');

      // Diversity bonus
      const diversityBonus = placed.has(candidate.slug) ? 0 : 1;

      // Slug penalty for in-ground (slug-prone plants should stay in GreenStalks)
      const slugRisk = getSlugRisk(candidate.slug);
      const slugPenalty = slugRisk === 'high' ? -2 : slugRisk === 'medium' ? -0.5 : 0;

      // Companion grouping: bonus for friends nearby, penalty for foes
      const cs = uniqueNeighbours.length > 0
        ? companionScore(candidate.slug, uniqueNeighbours, companionMap)
        : { score: 0, friendReasons: [], foeReasons: [] };
      const companionGroupBonus = cs.score * 0.3;

      const totalScore = ps.overall + diversityBonus + slugPenalty + companionGroupBonus;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestPlant = candidate;
        bestReasons = [
          `Score: ${ps.overall.toFixed(1)}`,
          slugRisk === 'high' ? 'Slug risk: HIGH (penalized — better in GreenStalk)' :
          slugRisk === 'low' ? 'Slug resistant — great for in-ground' : '',
          `Sun: ${cell.sunHours}h (needs ${candidate.sun})`,
          ...cs.friendReasons.slice(0, 2),
        ].filter(Boolean);
      }
    }

    if (bestPlant) {
      ctx.placements.push({ row: cell.row, col: cell.col, plantSlug: bestPlant.slug });
      ctx.reasoning.push({
        plantSlug: bestPlant.slug,
        plantName: bestPlant.commonName,
        row: cell.row, col: cell.col,
        reasons: bestReasons,
      });
      ctx.usedCells.add(cellKey);
      allSlugs.push(bestPlant.slug);
      placed.add(bestPlant.slug);
    }
  }

  return {
    id: 'highest-grade',
    name: 'Highest Garden Grade',
    strategy: 'highest-grade',
    description:
      'Algorithmically optimized for the highest overall Garden Grade score. ' +
      'Slug-prone plants are penalized in-ground and steered to GreenStalks instead. ' +
      'Responds to your current priority weight sliders.',
    placements: ctx.placements,
    reasoning: ctx.reasoning,
    stats: computeStats(ctx, cells),
  };
}

export function generateGardenLayouts(
  plants: Plant[],
  cells: GardenCell[][],
  config: GardenConfig,
  companionMap?: CompanionMap
): GardenLayoutOption[] {
  const cm = companionMap ?? new Map();
  return [
    highestGradeLayout(plants, cells, config, cm),
    sunOptimizedLayout(plants, cells, config, cm),
    kitchenGardenLayout(plants, cells, config, cm),
    maximumYieldLayout(plants, cells, config, cm),
  ];
}
