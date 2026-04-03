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
 * Variety-aware tier placement for Tumbling Tom (trailing determinate) and
 * nasturtiums (vigorous trailing). Optimized for Max (5) and Noelle (3).
 *
 * Tier layout (top→bottom = tier 1→5):
 *   1 (top):    Herbs — drought-tolerant, tiny footprint, zero shading
 *   2:          Tumbling Tom + basil — fruit hangs clean, basil companion
 *   3 (middle): Strawberries + lettuce — kid-height picking, living mulch
 *   4:          Strawberries + spinach — more berries, spinach loves shade
 *   5 (bottom): Beans + nasturtium + marigold — trailing on ground only
 */
function familyHarvestLayout(plants: Plant[]): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');       // tomato companion (repels whitefly)
  const bean = f('french-bean');  // nitrogen fixer
  const lettuce = f('lettuce');   // strawberry companion (living mulch)
  const chives = f('chives');     // deters aphids
  const thyme = f('thyme');       // deters slugs
  const nasturtium = f('nasturtium'); // aphid trap crop (trails on ground at bottom)
  const marigold = f('marigold'); // deters whitefly + pollinators
  const spinach = f('perpetual-spinach'); // shade-tolerant

  // Tower 1: "Strawberry Snacker"
  const tower1 = fillTower([
    { tier: 1, plants: alternate(chives, thyme, 6) },        // herbs at top (drought-tolerant, no shading)
    { tier: 2, plants: alternate(tomato, basil, 6) },         // Tumbling Tom cascades freely, basil companion
    { tier: 3, plants: alternate(strawberry, lettuce, 6) },   // kid-height picking + living mulch
    { tier: 4, plants: alternate(strawberry, spinach, 6) },   // more berries, spinach loves shade from above
    { tier: 5, plants: alternate(bean, nasturtium, 6) },      // nasturtium trails on ground (can't shade), beans upright
  ], 6);

  // Tower 2: "Tomato Snacker"
  const tower2 = fillTower([
    { tier: 1, plants: alternate(thyme, chives, 6) },         // herbs at top
    { tier: 2, plants: alternate(tomato, basil, 6) },          // Tumbling Tom + basil
    { tier: 3, plants: alternate(strawberry, lettuce, 6) },    // kid-height picking
    { tier: 4, plants: alternate(strawberry, spinach, 6) },    // more berries + shade-tolerant green
    { tier: 5, plants: alternate(bean, marigold, 6) },         // beans + pest protection at base
  ], 6);

  return {
    id: 'family-harvest',
    name: 'Kids\' Picking Towers',
    description: 'Tumbling Tom tomatoes on tier 2 so fruit hangs clean (no staking needed). Strawberries at kid-height for Max and Noelle. Nasturtiums at the bottom where trailing can\'t shade other tiers. Herbs at the top.',
    strategy: 'family-harvest',
    tower1,
    tower2,
  };
}

/**
 * Strategy 2: Companion Powerhouse
 * Every pocket is a proven companion. Variety-aware placement:
 * Tumbling Tom on tier 2 (fruit hangs clean), nasturtiums at bottom
 * (trailing can't shade), herbs at top (drought-tolerant).
 *
 * Tier layout (top→bottom = tier 1→5):
 *   1 (top):    Chives + thyme — allium + herb pest barrier, drought-tolerant
 *   2:          Tumbling Tom + basil — tomatoes cascade, basil repels whitefly
 *   3 (middle): Strawberry + lettuce — kid-height picking, living mulch
 *   4:          Strawberry + spinach — shade-tolerant companion pair
 *   5 (bottom): Bean + nasturtium/marigold — nitrogen fixer + pest deterrents
 */
function companionOptimalLayout(plants: Plant[]): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');       // tomato: repels whitefly
  const chives = f('chives');     // both: deters aphids
  const marigold = f('marigold'); // both: deters whitefly + pollinators
  const nasturtium = f('nasturtium'); // tomato: aphid trap crop, trailing
  const lettuce = f('lettuce');   // strawberry: living mulch
  const bean = f('french-bean');  // tomato: nitrogen fixer
  const parsley = f('parsley');   // tomato: attracts hoverflies
  const thyme = f('thyme');       // strawberry: deters slugs
  const spinach = f('perpetual-spinach'); // strawberry: shade for roots
  const springOnion = f('spring-onion'); // tomato: allium scent deters pests

  // Tower 1: "Strawberry Companion Tower"
  const tower1 = fillTower([
    { tier: 1, plants: alternate(chives, thyme, 6) },          // allium + herb barrier at top
    { tier: 2, plants: alternate(tomato, basil, 6) },          // Tumbling Tom cascades + basil companion
    { tier: 3, plants: alternate(strawberry, lettuce, 6) },    // berries + living mulch
    { tier: 4, plants: alternate(strawberry, spinach, 6) },    // berries + shade-tolerant green
    { tier: 5, plants: alternate(bean, nasturtium, 6) },       // nitrogen fixer + trailing trap crop on ground
  ], 6);

  // Tower 2: "Tomato Companion Tower"
  const tower2 = fillTower([
    { tier: 1, plants: alternate(thyme, springOnion, 6) },     // allium + herb pest deterrent
    { tier: 2, plants: alternate(tomato, basil, 6) },          // Tumbling Tom + basil
    { tier: 3, plants: alternate(strawberry, parsley, 6) },    // berries + hoverfly attractor
    { tier: 4, plants: alternate(strawberry, lettuce, 6) },    // berries + living mulch
    { tier: 5, plants: alternate(bean, marigold, 6) },         // nitrogen fixer + pest deterrent at base
  ], 6);

  return {
    id: 'companion-optimal',
    name: 'Companion Powerhouse',
    description: 'Every pocket is a proven companion. Tumbling Tom on tier 2 with basil (fruit hangs clean, no staking). Chives + thyme deter pests at the top. Nasturtiums trail safely at the bottom. Beans fix nitrogen. Zero foes.',
    strategy: 'companion-optimal',
    tower1,
    tower2,
  };
}

/**
 * Strategy 3: Maximum Berries & Tomatoes
 * As many strawberry and tomato pockets as possible, minimal companions.
 * Tumbling Tom on tier 2 (cascades freely), strawberries fill tiers 3-4,
 * chives at top (drought-tolerant), marigolds at bottom (compact).
 *
 * Tier layout (top→bottom = tier 1→5):
 *   1 (top):    Strawberry + chives — berries + pest deterrent
 *   2:          Tumbling Tom + basil — tomatoes cascade, basil companion
 *   3 (middle): Strawberry (all 6) — kid-height picking zone
 *   4:          Strawberry (all 6) — maximum berries
 *   5 (bottom): Strawberry + marigold — berries + compact pest deterrent
 */
function maximumBerriesLayout(plants: Plant[]): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');       // essential tomato companion
  const chives = f('chives');     // dual companion, drought-tolerant for top
  const marigold = f('marigold'); // dual companion, compact pest deterrent

  // Tower 1: tomatoes tier 2, strawberries everywhere else
  const tower1 = fillTower([
    { tier: 1, plants: alternate(strawberry, chives, 6) },     // berries + pest deterrent at top
    { tier: 2, plants: alternate(tomato, basil, 6) },          // Tumbling Tom cascades + basil
    { tier: 3, plants: repeat(strawberry, 6) },                // kid-height picking
    { tier: 4, plants: repeat(strawberry, 6) },                // maximum berries
    { tier: 5, plants: alternate(strawberry, marigold, 6) },   // berries + compact pest protection at base
  ], 6);

  // Tower 2: same structure
  const tower2 = fillTower([
    { tier: 1, plants: alternate(strawberry, chives, 6) },     // berries + allium pest barrier
    { tier: 2, plants: alternate(tomato, basil, 6) },          // Tumbling Tom + basil
    { tier: 3, plants: repeat(strawberry, 6) },                // kid-height picking
    { tier: 4, plants: repeat(strawberry, 6) },                // maximum berries
    { tier: 5, plants: alternate(strawberry, marigold, 6) },   // berries + pest protection at base
  ], 6);

  return {
    id: 'maximum-berries',
    name: 'Maximum Berries & Tomatoes',
    description: 'Maximum berry harvest: strawberries on 4 of 5 tiers. Tumbling Tom on tier 2 so fruit hangs clean. Chives and marigolds for minimal pest protection. No nasturtiums — more room for berries.',
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
