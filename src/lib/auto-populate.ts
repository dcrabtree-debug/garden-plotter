import type { Plant } from '../types/plant';
import type { CompanionMap } from '../types/companion';

export type LayoutStrategy = 'family-harvest' | 'companion-optimal' | 'continuous-harvest';

export interface LayoutOption {
  id: string;
  name: string;
  description: string;
  strategy: LayoutStrategy;
  tower1: (string | null)[][];
  tower2: (string | null)[][];
}

// Helper: fill a tower grid
function fillTower(
  tierAssignments: { tier: number; plants: Plant[] }[],
  pocketsPerTier: number
): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: 5 }, () =>
    new Array(pocketsPerTier).fill(null)
  );
  for (const { tier, plants } of tierAssignments) {
    for (let i = 0; i < Math.min(plants.length, pocketsPerTier); i++) {
      grid[tier - 1][i] = plants[i].slug;
    }
  }
  return grid;
}

// Find plant by slug, with fuzzy matching (checks includes both ways)
function findPlant(plants: Plant[], slug: string): Plant | undefined {
  return (
    plants.find((p) => p.slug === slug) ??
    plants.find((p) => p.slug.includes(slug) || slug.includes(p.slug))
  );
}

// Repeat a plant to fill N slots
function repeat(plant: Plant | undefined, count: number): Plant[] {
  if (!plant) return [];
  return Array(count).fill(plant);
}

// Alternate two plants to fill N slots
function alternate(a: Plant | undefined, b: Plant | undefined, count: number): Plant[] {
  const result: Plant[] = [];
  for (let i = 0; i < count; i++) {
    const p = i % 2 === 0 ? a : b;
    if (p) result.push(p);
  }
  return result;
}

/**
 * Strategy 1: Family Harvest
 * Kid-friendly: strawberries & tomatoes at easy picking height,
 * herbs mid, trailing flowers bottom. For Max (5) and Noelle (3).
 */
function familyHarvestLayout(plants: Plant[]): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');
  const bean = f('french-bean');
  const lettuce = f('lettuce');
  const spinach = f('perpetual-spinach');
  const chard = f('swiss-chard');
  const nasturtium = f('nasturtium');
  const thyme = f('thyme');
  const oregano = f('oregano');
  const parsley = f('parsley');
  const chives = f('chives');
  const mint = f('mint');
  const radish = f('radish');
  const springOnion = f('spring-onion');
  const sweetPea = f('dwarf-sweet-pea');

  // Tower 1: "Kids' Snack Tower"
  const tower1 = fillTower([
    { tier: 1, plants: repeat(strawberry, 6) },
    { tier: 2, plants: alternate(tomato, basil, 6) },
    { tier: 3, plants: repeat(bean, 6) },
    { tier: 4, plants: [lettuce, lettuce, lettuce, spinach, spinach, spinach].filter(Boolean) as Plant[] },
    { tier: 5, plants: repeat(nasturtium, 6) },
  ], 6);

  // Tower 2: "Kitchen Herb & Salad Tower"
  const tower2 = fillTower([
    { tier: 1, plants: alternate(spinach, chard, 6) },
    { tier: 2, plants: [thyme, oregano, parsley, chives, thyme, oregano].filter(Boolean) as Plant[] },
    { tier: 3, plants: alternate(radish, springOnion, 6) },
    { tier: 4, plants: [mint, chives, parsley, mint, chives, parsley].filter(Boolean) as Plant[] },
    { tier: 5, plants: repeat(sweetPea, 6) },
  ], 6);

  return {
    id: 'family-harvest',
    name: 'Family Harvest',
    description: 'Kid-friendly picking: strawberries & tomatoes at the top, herbs in the middle, trailing flowers at the bottom. Optimized for Max and Noelle.',
    strategy: 'family-harvest',
    tower1,
    tower2,
  };
}

/**
 * Strategy 2: Companion Optimal
 * Maximizes companion planting synergies.
 */
function companionOptimalLayout(plants: Plant[]): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');
  const bean = f('french-bean');
  const lettuce = f('lettuce');
  const radish = f('radish');
  const nasturtium = f('nasturtium');
  const marigold = f('marigold');
  const spinach = f('perpetual-spinach');
  const chard = f('swiss-chard');
  const thyme = f('thyme');
  const oregano = f('oregano');
  const parsley = f('parsley');
  const chives = f('chives');
  const mint = f('mint');
  const springOnion = f('spring-onion');
  const rocket = f('rocket');
  const sweetPea = f('dwarf-sweet-pea');

  // Tower 1: Tomato family + companions
  const tower1 = fillTower([
    { tier: 1, plants: repeat(strawberry, 6) },
    { tier: 2, plants: alternate(tomato, basil, 6) },
    { tier: 3, plants: repeat(bean, 6) },
    { tier: 4, plants: alternate(lettuce, radish, 6) },
    { tier: 5, plants: alternate(nasturtium, marigold, 6) },
  ], 6);

  // Tower 2: Herb-heavy + leafy greens
  const tower2 = fillTower([
    { tier: 1, plants: alternate(spinach, chard, 6) },
    { tier: 2, plants: [thyme, oregano, parsley, chives, thyme, oregano].filter(Boolean) as Plant[] },
    { tier: 3, plants: alternate(springOnion, rocket, 6) },
    { tier: 4, plants: alternate(mint, chives, 6) },
    { tier: 5, plants: repeat(sweetPea, 6) },
  ], 6);

  return {
    id: 'companion-optimal',
    name: 'Companion Optimal',
    description: 'Maximizes companion planting synergies. Tomato-basil pairs, pest-repellent flowers, and herb combinations that boost growth.',
    strategy: 'companion-optimal',
    tower1,
    tower2,
  };
}

/**
 * Strategy 3: Continuous Harvest
 * Something to pick every month April-October.
 */
function continuousHarvestLayout(plants: Plant[]): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const radish = f('radish');
  const springOnion = f('spring-onion');
  const lettuce = f('lettuce');
  const rocket = f('rocket');
  const bean = f('french-bean');
  const basil = f('basil');
  const nasturtium = f('nasturtium');
  const calendula = f('calendula') ?? f('marigold');
  const spinach = f('perpetual-spinach');
  const chard = f('swiss-chard');
  const tomato = f('tomato');
  const thyme = f('thyme');
  const oregano = f('oregano');
  const parsley = f('parsley');
  const chives = f('chives');
  const kale = f('kale');
  const sweetPea = f('dwarf-sweet-pea');

  // Tower 1: "Early-to-Mid Season"
  const tower1 = fillTower([
    { tier: 1, plants: repeat(strawberry, 6) },
    { tier: 2, plants: alternate(radish, springOnion, 6) },
    { tier: 3, plants: alternate(lettuce, rocket, 6) },
    { tier: 4, plants: alternate(bean, basil, 6) },
    { tier: 5, plants: alternate(nasturtium, calendula, 6) },
  ], 6);

  // Tower 2: "Mid-to-Late Season"
  const tower2 = fillTower([
    { tier: 1, plants: alternate(spinach, chard, 6) },
    { tier: 2, plants: alternate(tomato, basil, 6) },
    { tier: 3, plants: [thyme, oregano, parsley, chives, thyme, oregano].filter(Boolean) as Plant[] },
    { tier: 4, plants: alternate(kale, spinach, 6) },
    { tier: 5, plants: repeat(sweetPea, 6) },
  ], 6);

  return {
    id: 'continuous-harvest',
    name: 'Continuous Harvest',
    description: 'Something to pick every month from April to October. Quick crops early (radish, lettuce), then long-season staples (tomatoes, spinach, chard).',
    strategy: 'continuous-harvest',
    tower1,
    tower2,
  };
}

export function generateLayouts(
  plants: Plant[],
  companionMap: CompanionMap
): LayoutOption[] {
  return [
    familyHarvestLayout(plants),
    companionOptimalLayout(plants),
    continuousHarvestLayout(plants),
  ];
}
