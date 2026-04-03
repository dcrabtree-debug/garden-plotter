import type { Plant } from '../types/plant';
import type { CompanionMap } from '../types/companion';

export type LayoutStrategy = 'family-harvest' | 'companion-optimal' | 'continuous-harvest';

export interface LayoutOption {
  id: string;
  name: string;
  description: string;
  strategy: LayoutStrategy;
  // tower1[tier][pocket] and tower2[tier][pocket] — null = empty
  tower1: (string | null)[][];
  tower2: (string | null)[][];
}

// Score a tier placement based on plant's ideal tiers
function tierScore(plant: Plant, tier: number): number {
  if (plant.idealTiers.includes(tier)) return 3;
  const distance = Math.min(...plant.idealTiers.map((t) => Math.abs(t - tier)));
  if (distance === 1) return 1;
  return 0;
}

// Score companion friendliness for a set of slugs
function companionScore(slugs: string[], companionMap: CompanionMap): number {
  let score = 0;
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const edge = companionMap.get(slugs[i])?.get(slugs[j]);
      if (edge) {
        if (edge.relationship === 'friend') score += 2;
        if (edge.relationship === 'foe') score -= 5;
      }
    }
  }
  return score;
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

/**
 * Strategy 1: Family Harvest
 * Prioritizes kid-friendly picking: strawberries + tomatoes in easy-reach tiers,
 * herbs in mid-tiers, trailing flowers at bottom. Optimized for Max and Noelle.
 */
function familyHarvestLayout(plants: Plant[], companionMap: CompanionMap): LayoutOption {
  const byCategory = {
    fruit: plants.filter((p) => p.category === 'fruit' && p.greenstalkSuitability !== 'unsuitable'),
    veg: plants.filter((p) => (p.category === 'vegetable' || p.category === 'legume') && p.greenstalkSuitability !== 'unsuitable'),
    herbs: plants.filter((p) => p.category === 'herb' && p.greenstalkSuitability !== 'unsuitable'),
    flowers: plants.filter((p) => p.category === 'flower' && p.greenstalkSuitability !== 'unsuitable'),
  };

  // Tower 1: "Kids' Snack Tower"
  // Top: strawberries (safe from slugs, easy to reach for standing kids)
  // Upper: tomatoes + basil (companion pair, visual picking)
  // Middle: beans (easy to pick, productive)
  // Lower: lettuce/spinach (cut-and-come-again)
  // Bottom: nasturtiums (trap crop, edible flowers kids love)
  const strawberries = byCategory.fruit.filter((p) => p.slug.includes('strawberry'));
  const tomatoes = byCategory.veg.filter((p) => p.slug.includes('tomato'));
  const basil = byCategory.herbs.filter((p) => p.slug === 'basil');
  const beans = byCategory.veg.filter((p) => p.slug.includes('bean') && p.greenstalkSuitability !== 'unsuitable');
  const greens = byCategory.veg.filter((p) =>
    ['lettuce', 'perpetual-spinach', 'swiss-chard', 'rocket'].includes(p.slug)
  );
  const nasturtiums = byCategory.flowers.filter((p) => p.slug === 'nasturtium');

  const tower1 = fillTower([
    { tier: 1, plants: strawberries.length > 0 ? Array(6).fill(strawberries[0]) : [] },
    { tier: 2, plants: [...tomatoes.slice(0, 4), ...basil.slice(0, 2)] },
    { tier: 3, plants: beans.length > 0 ? Array(6).fill(beans[0]) : [] },
    { tier: 4, plants: greens.slice(0, 6) },
    { tier: 5, plants: nasturtiums.length > 0 ? Array(6).fill(nasturtiums[0]) : [] },
  ], 6);

  // Tower 2: "Kitchen Herb & Salad Tower"
  const spinach = byCategory.veg.filter((p) => ['perpetual-spinach', 'swiss-chard'].includes(p.slug));
  const coreHerbs = byCategory.herbs.filter((p) =>
    ['thyme', 'oregano', 'parsley', 'chives', 'mint'].includes(p.slug)
  );
  const radish = byCategory.veg.filter((p) => p.slug === 'radish');
  const springOnion = byCategory.veg.filter((p) => p.slug === 'spring-onion');
  const sweetPeas = byCategory.flowers.filter((p) => p.slug === 'dwarf-sweet-pea');

  const tower2 = fillTower([
    { tier: 1, plants: spinach.length >= 2 ? [spinach[0], spinach[0], spinach[0], spinach[1], spinach[1], spinach[1]] : spinach.length > 0 ? Array(6).fill(spinach[0]) : [] },
    { tier: 2, plants: coreHerbs.slice(0, 6) },
    { tier: 3, plants: [...radish.slice(0, 3).flatMap((p) => [p, p]), ...springOnion.slice(0, 3)] },
    { tier: 4, plants: coreHerbs.length > 5 ? coreHerbs.slice(5, 11) : coreHerbs.slice(0, 6) },
    { tier: 5, plants: sweetPeas.length > 0 ? Array(6).fill(sweetPeas[0]) : [] },
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
 * Maximizes companion planting benefits. Groups friends together,
 * separates foes across towers.
 */
function companionOptimalLayout(plants: Plant[], companionMap: CompanionMap): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');

  // Classic companion groups:
  // Group A: Tomato + Basil + Nasturtium (pest repellent trio)
  // Group B: Beans + Sweetcorn + Squash (three sisters - modified for vertical)
  // Group C: Lettuce + Radish + Chives (fast-crop salad)
  // Group D: Spinach + Strawberry + Thyme
  // Group E: Parsley + Tomato + Marigold

  const find = (slug: string) => suitable.find((p) => p.slug === slug);

  // Tower 1: Tomato family + companions
  const tower1 = fillTower([
    { tier: 1, plants: Array(6).fill(find('strawberry-everbearing')).filter(Boolean) as Plant[] },
    { tier: 2, plants: [find('tumbling-tom-tomato'), find('basil'), find('tumbling-tom-tomato'), find('basil'), find('tumbling-tom-tomato'), find('basil')].filter(Boolean) as Plant[] },
    { tier: 3, plants: [find('dwarf-french-bean'), find('dwarf-french-bean'), find('dwarf-french-bean'), find('dwarf-french-bean'), find('dwarf-french-bean'), find('dwarf-french-bean')].filter(Boolean) as Plant[] },
    { tier: 4, plants: [find('lettuce'), find('radish'), find('lettuce'), find('radish'), find('lettuce'), find('radish')].filter(Boolean) as Plant[] },
    { tier: 5, plants: [find('nasturtium'), find('marigold'), find('nasturtium'), find('marigold'), find('nasturtium'), find('nasturtium')].filter(Boolean) as Plant[] },
  ], 6);

  // Tower 2: Herb-heavy + leafy greens
  const tower2 = fillTower([
    { tier: 1, plants: [find('perpetual-spinach'), find('swiss-chard'), find('perpetual-spinach'), find('swiss-chard'), find('perpetual-spinach'), find('swiss-chard')].filter(Boolean) as Plant[] },
    { tier: 2, plants: [find('thyme'), find('oregano'), find('parsley'), find('chives'), find('thyme'), find('oregano')].filter(Boolean) as Plant[] },
    { tier: 3, plants: [find('spring-onion'), find('rocket'), find('spring-onion'), find('rocket'), find('spring-onion'), find('rocket')].filter(Boolean) as Plant[] },
    { tier: 4, plants: [find('mint'), find('chives'), find('mint'), find('chives'), find('mint'), find('chives')].filter(Boolean) as Plant[] },
    { tier: 5, plants: Array(6).fill(find('dwarf-sweet-pea')).filter(Boolean) as Plant[] },
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
 * Staggers planting so something is always ready to pick,
 * from April through October.
 */
function continuousHarvestLayout(plants: Plant[], companionMap: CompanionMap): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const find = (slug: string) => suitable.find((p) => p.slug === slug);

  // Tower 1: "Early-to-Mid Season" (April-July harvest)
  const tower1 = fillTower([
    { tier: 1, plants: Array(6).fill(find('strawberry-everbearing')).filter(Boolean) as Plant[] },
    { tier: 2, plants: [find('radish'), find('spring-onion'), find('radish'), find('spring-onion'), find('radish'), find('spring-onion')].filter(Boolean) as Plant[] },
    { tier: 3, plants: [find('lettuce'), find('rocket'), find('lettuce'), find('rocket'), find('lettuce'), find('rocket')].filter(Boolean) as Plant[] },
    { tier: 4, plants: [find('dwarf-french-bean'), find('dwarf-french-bean'), find('dwarf-french-bean'), find('basil'), find('basil'), find('basil')].filter(Boolean) as Plant[] },
    { tier: 5, plants: [find('nasturtium'), find('calendula'), find('nasturtium'), find('calendula'), find('nasturtium'), find('calendula')].filter(Boolean) as Plant[] },
  ], 6);

  // Tower 2: "Mid-to-Late Season" (July-October harvest)
  const tower2 = fillTower([
    { tier: 1, plants: [find('perpetual-spinach'), find('perpetual-spinach'), find('perpetual-spinach'), find('swiss-chard'), find('swiss-chard'), find('swiss-chard')].filter(Boolean) as Plant[] },
    { tier: 2, plants: [find('tumbling-tom-tomato'), find('basil'), find('tumbling-tom-tomato'), find('basil'), find('tumbling-tom-tomato'), find('basil')].filter(Boolean) as Plant[] },
    { tier: 3, plants: [find('thyme'), find('oregano'), find('parsley'), find('chives'), find('thyme'), find('oregano')].filter(Boolean) as Plant[] },
    { tier: 4, plants: [find('kale'), find('kale'), find('kale'), find('perpetual-spinach'), find('perpetual-spinach'), find('perpetual-spinach')].filter(Boolean) as Plant[] },
    { tier: 5, plants: Array(6).fill(find('dwarf-sweet-pea')).filter(Boolean) as Plant[] },
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
    familyHarvestLayout(plants, companionMap),
    companionOptimalLayout(plants, companionMap),
    continuousHarvestLayout(plants, companionMap),
  ];
}
