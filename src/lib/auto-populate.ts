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
 * Strategy 1: Kids' Picking Towers
 * Strawberries & tomatoes at easy picking height on BOTH towers,
 * with proven companion plants. Optimized for Max (5) and Noelle (3).
 */
function familyHarvestLayout(plants: Plant[]): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');       // tomato companion
  const bean = f('french-bean');  // tomato companion (nitrogen fixer)
  const lettuce = f('lettuce');   // strawberry companion
  const chives = f('chives');     // strawberry + tomato companion
  const thyme = f('thyme');       // strawberry companion (deters slugs)
  const parsley = f('parsley');   // tomato companion (attracts hoverflies)
  const nasturtium = f('nasturtium'); // tomato companion (trap crop)
  const marigold = f('marigold'); // strawberry + tomato companion

  // Tower 1: "Strawberry & Tomato Snacker"
  // Top 2 tiers: easy picking for kids
  const tower1 = fillTower([
    { tier: 1, plants: repeat(strawberry, 6) },
    { tier: 2, plants: alternate(tomato, basil, 6) },
    { tier: 3, plants: alternate(chives, lettuce, 6) },
    { tier: 4, plants: repeat(bean, 6) },
    { tier: 5, plants: alternate(nasturtium, marigold, 6) },
  ], 6);

  // Tower 2: "Berry & Tomato Companion Tower"
  const tower2 = fillTower([
    { tier: 1, plants: repeat(strawberry, 6) },
    { tier: 2, plants: alternate(tomato, basil, 6) },
    { tier: 3, plants: alternate(thyme, parsley, 6) },
    { tier: 4, plants: alternate(lettuce, chives, 6) },
    { tier: 5, plants: alternate(marigold, nasturtium, 6) },
  ], 6);

  return {
    id: 'family-harvest',
    name: 'Kids\' Picking Towers',
    description: 'Strawberries & tomatoes on both towers at easy picking height for Max and Noelle. Basil, chives, lettuce, and beans as proven companions. Marigolds and nasturtiums at the base to repel pests.',
    strategy: 'family-harvest',
    tower1,
    tower2,
  };
}

/**
 * Strategy 2: Companion Powerhouse
 * Strawberries & tomatoes on both towers, every remaining pocket
 * is a proven companion plant for one or both.
 */
function companionOptimalLayout(plants: Plant[]): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');       // tomato: repels whitefly
  const chives = f('chives');     // both: deters aphids
  const marigold = f('marigold'); // both: deters whitefly + pollinators
  const nasturtium = f('nasturtium'); // tomato: aphid trap crop
  const lettuce = f('lettuce');   // strawberry: living mulch
  const bean = f('french-bean');  // tomato: nitrogen fixer
  const parsley = f('parsley');   // tomato: attracts hoverflies
  const thyme = f('thyme');       // strawberry: deters slugs
  const spinach = f('perpetual-spinach'); // strawberry: shade for roots
  const springOnion = f('spring-onion'); // tomato: allium scent deters pests

  // Tower 1: "Strawberry Focus + Tomato Companions"
  // Strawberries tiers 1 & 3, tomato tier 2 — all companions
  const tower1 = fillTower([
    { tier: 1, plants: alternate(strawberry, chives, 6) },
    { tier: 2, plants: alternate(tomato, basil, 6) },
    { tier: 3, plants: alternate(strawberry, thyme, 6) },
    { tier: 4, plants: alternate(bean, parsley, 6) },
    { tier: 5, plants: alternate(nasturtium, marigold, 6) },
  ], 6);

  // Tower 2: "Tomato Focus + Strawberry Companions"
  // Tomatoes tiers 1 & 2, strawberry tier 3 — all companions
  const tower2 = fillTower([
    { tier: 1, plants: alternate(tomato, basil, 6) },
    { tier: 2, plants: alternate(strawberry, lettuce, 6) },
    { tier: 3, plants: alternate(springOnion, chives, 6) },
    { tier: 4, plants: alternate(spinach, lettuce, 6) },
    { tier: 5, plants: alternate(marigold, nasturtium, 6) },
  ], 6);

  return {
    id: 'companion-optimal',
    name: 'Companion Powerhouse',
    description: 'Every pocket is a proven companion. Chives + thyme protect strawberries from slugs and aphids. Basil + marigolds guard tomatoes from whitefly. Beans fix nitrogen for heavy-feeding tomatoes. Zero foes.',
    strategy: 'companion-optimal',
    tower1,
    tower2,
  };
}

/**
 * Strategy 3: Maximum Berries & Tomatoes
 * As many strawberry and tomato pockets as possible,
 * with just enough companion plants to keep them healthy.
 */
function maximumBerriesLayout(plants: Plant[]): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');       // essential tomato companion
  const chives = f('chives');     // dual companion
  const marigold = f('marigold'); // dual companion, pest deterrent
  const nasturtium = f('nasturtium'); // tomato companion, trailing

  // Tower 1: 18 strawberry + 6 tomato + 6 companions
  const tower1 = fillTower([
    { tier: 1, plants: repeat(strawberry, 6) },
    { tier: 2, plants: alternate(tomato, basil, 6) },
    { tier: 3, plants: repeat(strawberry, 6) },
    { tier: 4, plants: alternate(strawberry, chives, 6) },
    { tier: 5, plants: alternate(nasturtium, marigold, 6) },
  ], 6);

  // Tower 2: 12 strawberry + 6 tomato + 6 companions + 6 flowers
  const tower2 = fillTower([
    { tier: 1, plants: repeat(strawberry, 6) },
    { tier: 2, plants: alternate(tomato, basil, 6) },
    { tier: 3, plants: repeat(strawberry, 6) },
    { tier: 4, plants: alternate(chives, strawberry, 6) },
    { tier: 5, plants: alternate(marigold, nasturtium, 6) },
  ], 6);

  return {
    id: 'maximum-berries',
    name: 'Maximum Berries & Tomatoes',
    description: 'The most strawberry and tomato pockets possible: 30+ berries and 6 tomatoes per tower. Basil, chives, marigolds, and nasturtiums provide just enough companion protection.',
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
    maximumBerriesLayout(plants),
  ];
}
