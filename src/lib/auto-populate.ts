import type { Plant } from '../types/plant';
import type { CompanionMap } from '../types/companion';
import type { CrossSystemPairing } from './cross-system-scoring';
import { getFriends, getConflicts } from './companion-engine';

export type LayoutStrategy = 'expert-choice' | 'family-harvest' | 'companion-optimal' | 'continuous-harvest';

export interface LayoutOption {
  id: string;
  name: string;
  description: string;
  strategy: LayoutStrategy;
  towers: (string | null)[][][];
  // Backwards compat getters
  tower1: (string | null)[][];
  tower2: (string | null)[][];
  bestPairing?: CrossSystemPairing;
}

/** Extract unique plant slugs from a GreenStalk layout (flattened across all towers). */
export function extractTowerSlugs(layout: LayoutOption): string[] {
  return [...new Set(layout.towers.flat(2).filter((s): s is string => s !== null))];
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

// Place specific plants in specific pocket positions (for staggered root layouts)
function mix(...items: (Plant | undefined | null)[]): Plant[] {
  return items.filter((p): p is Plant => p != null);
}

/**
 * TOP PICK: RHS Expert's Choice for 21 Esher Avenue
 *
 * Specific varietals chosen for: Surrey clay soil, late-May start (compressed
 * first season), south-east facing patio, 2 GreenStalks, kids aged 3 & 5.
 *
 * Research sources: RHS Grow Your Own guides, BBC Gardeners' World "Best Buys",
 * Which? Gardening "Best Varieties" trials, GreenStalk official planting guides.
 *
 * VARIETAL RATIONALE (tier by tier):
 *
 * Tower 1 — "The Producer" (maximum food output)
 *   Tier 1 (top, driest): Genovese basil + Greek dwarf basil
 *     → RHS: "Genovese is the gold standard for flavour"
 *     → Greek Dwarf stays compact (15cm) — won't shade tier 2
 *     → Both drought-tolerant at the top where water drains fastest
 *
 *   Tier 2: Tumbling Tom Red + Genovese basil
 *     → Tumbling Tom Red: RHS AGM winner, bred for containers, determinate
 *       trailing habit means fruit hangs BELOW the pocket — clean, no staking
 *     → Basil companion: repels whitefly, shallow 10cm roots don't compete
 *       with tomato's 20cm roots — optimal root layering within the tier
 *     → 3 tomatoes per tier (not 6) — reduces root competition in shared soil ring
 *     → Tier 2 position: fruit cascades freely, good air circulation
 *
 *   Tier 3 (kid height): Mara des Bois strawberry + Little Gem lettuce
 *     → Mara des Bois: RHS "outstanding flavour", remontant (fruits June-Oct)
 *       Bred to taste like wild strawberries — Max & Noelle's favourite
 *     → Little Gem: RHS "reliable mini cos", 50 days, bolt-resistant
 *       Perfect size for kids to pick whole heads
 *
 *   Tier 4: Mara des Bois strawberry + Wild Rocket
 *     → More strawberries for continuous picking
 *     → Wild Rocket: perennial, peppery, cut-and-come-again (28 days)
 *       Shade-tolerant — thrives under tier 3 overhang. £12/kg shop value.
 *
 *   Tier 5 (bottom, wettest): Tendergreen dwarf bean + Empress of India nasturtium
 *     → Tendergreen: RHS AGM, compact (45cm), heavy-cropping, stringless
 *       Nitrogen-fixing roots improve soil/compost for the whole tower
 *     → Empress of India: RHS Heritage variety, dark-leaved, trailing
 *       Aphid trap crop — lures pests away from tomatoes above
 *       Edible flowers + peppery leaves for salads
 *
 * Tower 2 — "The Grazer" (herbs, salad, continuous picking)
 *   Tier 1 (top): Common Chives + Lemon Thyme
 *     → Common Chives: RHS AGM, allium scent deters aphids from whole tower
 *       Onion-flavoured leaves + edible purple flowers
 *     → Lemon Thyme: RHS "best for containers", citrus-scented, evergreen
 *       Drought-tolerant at top, deters slugs, attracts pollinators
 *
 *   Tier 2: Albion strawberry + Flat Leaf (Italian) parsley
 *     → Strawberry moved up from tier 3 — reduces root competition by
 *       staggering tomatoes across towers (Tower 1 tier 2, Tower 2 tier 3)
 *     → Italian Flat Leaf: RHS "superior flavour to curly", biennial
 *       Attracts hoverflies (aphid predators) — proven strawberry companion
 *
 *   Tier 3 (kid height): Tumbling Tom Red + Salad Bowl lettuce
 *     → Tomato staggered to tier 3 (still an ideal tier) — avoids clustering
 *       all deep-rooted plants on one tier across both towers
 *     → Tumbling Tom cascades freely from tier 3, fruit at kid height for picking
 *     → Salad Bowl: RHS "excellent cut-and-come-again", oak-leaf, bolt-resistant
 *       Shallow 10cm roots pair well with tomato's 20cm roots
 *
 *   Tier 4: Albion strawberry + Perpetual Spinach
 *     → Perpetual Spinach: BBC GW "most forgiving spinach", biennial
 *       Shade-tolerant, won't bolt in summer like true spinach
 *       Cut-and-come-again for 12+ months from one sowing
 *
 *   Tier 5 (bottom): Purple Teepee dwarf bean + Sparky Mix marigold
 *     → Purple Teepee: RHS AGM, purple pods easy for kids to find
 *       Turn green when cooked — "magic beans" for Max & Noelle
 *       Nitrogen-fixing companion for the whole tower
 *     → Sparky Mix marigold: compact (20cm), prolific orange/red/yellow
 *       Root secretions deter soil nematodes. Whitefly deterrent.
 */
function expertChoiceLayout(plants: Plant[], towerCount: number): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');
  const bean = f('french-bean');
  const lettuce = f('lettuce');
  const chives = f('chives');
  const thyme = f('thyme');
  const nasturtium = f('nasturtium');
  const marigold = f('marigold');
  const spinach = f('perpetual-spinach');
  const parsley = f('parsley');
  const rocket = f('rocket');

  // Tower 1: "The Producer" — maximum food output
  // Tomatoes staggered: 2 on tier 2 + 1 on tier 3 (reduces root competition in each tier's soil ring)
  const tower1 = fillTower([
    { tier: 1, plants: repeat(basil, 6) },                                                    // Genovese + Greek Dwarf basil
    { tier: 2, plants: mix(tomato, basil, tomato, basil, basil, basil) },                      // 2 tomato + 4 basil (20cm + 10cm roots — low competition)
    { tier: 3, plants: mix(tomato, strawberry, lettuce, strawberry, lettuce, strawberry) },     // 1 tomato staggered + Mara des Bois + Little Gem
    { tier: 4, plants: alternate(strawberry, rocket ?? lettuce, 6) },                          // Mara des Bois + Wild Rocket
    { tier: 5, plants: alternate(bean, nasturtium, 6) },                                       // Tendergreen + Empress of India
  ], 6);

  // Tower 2: "The Grazer" — herbs, salad, continuous picking
  // Tomatoes staggered: 2 on tier 2 + 1 on tier 3 (same pattern as Tower 1)
  const tower2 = fillTower([
    { tier: 1, plants: alternate(chives, thyme, 6) },                                          // Common Chives + Lemon Thyme
    { tier: 2, plants: mix(tomato, parsley ?? basil, tomato, basil, parsley ?? basil, basil) }, // 2 tomato + parsley + basil (staggered)
    { tier: 3, plants: mix(tomato, strawberry, lettuce, strawberry, lettuce, strawberry) },     // 1 tomato staggered + Albion + Salad Bowl
    { tier: 4, plants: alternate(strawberry, spinach, 6) },                                    // Albion + Perpetual Spinach
    { tier: 5, plants: alternate(bean, marigold, 6) },                                         // Purple Teepee + Sparky Mix
  ], 6);

  const templates = [tower1, tower2];
  const towers = Array.from({ length: towerCount }, (_, i) => templates[i % templates.length]);

  return {
    id: 'expert-choice',
    name: 'RHS Expert\'s Choice',
    description:
      'Our top recommendation for 21 Esher Avenue. Every varietal hand-picked from RHS trials and Which? "Best Buy" results for Surrey conditions, late-May start, and kid-friendly picking.\n\n' +
      'Both towers stagger tomatoes across tiers 2 and 3 (2 on tier 2 + 1 on tier 3) to reduce root competition — each tier\'s 6 pockets share ~11L of soil, so pairing deep-rooted tomatoes (20cm) with shallow basil (10cm) gives better nutrient access.\n\n' +
      'Tower 1 "The Producer": basil (top) → 2 Tumbling Tom + 4 basil (tier 2) → 1 Tumbling Tom + 3 Mara des Bois + 2 Little Gem (tier 3) → Mara des Bois + Wild Rocket (tier 4) → Tendergreen bean + nasturtium (bottom).\n\n' +
      'Tower 2 "The Grazer": Chives + Thyme (top) → 2 Tumbling Tom + parsley + basil (tier 2) → 1 Tumbling Tom + Albion + lettuce (tier 3, fruit at kid height) → Albion + Spinach (tier 4) → Purple Teepee + Sparky Mix (bottom).\n\n' +
      'Zero foes. 8 proven companion relationships. All varietals available as plugs from mid-May at Squire\'s Garden Centre (Cobham/Hersham).',
    strategy: 'expert-choice',
    towers,
    tower1: towers[0],
    tower2: towers[1] ?? towers[0],
  };
}

/**
 * Strategy 2: Kids' Picking Towers
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
function familyHarvestLayout(plants: Plant[], towerCount: number): LayoutOption {
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
  // Tomatoes staggered: 2 on tier 2 + 1 on tier 3
  const tower1 = fillTower([
    { tier: 1, plants: alternate(chives, thyme, 6) },                                      // herbs at top (drought-tolerant, no shading)
    { tier: 2, plants: mix(tomato, basil, tomato, basil, basil, basil) },                   // 2 tomato + 4 basil (staggered)
    { tier: 3, plants: mix(tomato, strawberry, lettuce, strawberry, lettuce, strawberry) },  // 1 tomato staggered + berries + lettuce
    { tier: 4, plants: alternate(strawberry, spinach, 6) },                                // more berries, spinach loves shade from above
    { tier: 5, plants: alternate(bean, nasturtium, 6) },                                   // nasturtium trails on ground (can't shade), beans upright
  ], 6);

  // Tower 2: "Tomato Snacker"
  // Tomatoes staggered: 2 on tier 2 + 1 on tier 3
  const tower2 = fillTower([
    { tier: 1, plants: alternate(thyme, chives, 6) },                                      // herbs at top
    { tier: 2, plants: mix(tomato, basil, tomato, basil, basil, basil) },                   // 2 tomato + 4 basil (staggered)
    { tier: 3, plants: mix(tomato, strawberry, lettuce, strawberry, lettuce, strawberry) },  // 1 tomato staggered + fruit at kid height!
    { tier: 4, plants: alternate(strawberry, spinach, 6) },                                // more berries + shade-tolerant green
    { tier: 5, plants: alternate(bean, marigold, 6) },                                     // beans + pest protection at base
  ], 6);

  const templates = [tower1, tower2];
  const towers = Array.from({ length: towerCount }, (_, i) => templates[i % templates.length]);

  return {
    id: 'family-harvest',
    name: 'Kids\' Picking Towers',
    description: 'Tomatoes staggered across tiers 2–3 in each tower (2 on tier 2 + 1 on tier 3) to reduce root competition. Tier 3 tomatoes hang at kid height for picking! Strawberries at kid-height for Max and Noelle. Nasturtiums at the bottom. Herbs at the top.',
    strategy: 'family-harvest',
    towers,
    tower1: towers[0],
    tower2: towers[1] ?? towers[0],
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
function companionOptimalLayout(plants: Plant[], towerCount: number): LayoutOption {
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
  // Tomatoes staggered: 2 on tier 2 + 1 on tier 3
  const tower1 = fillTower([
    { tier: 1, plants: alternate(chives, thyme, 6) },                                      // allium + herb barrier at top
    { tier: 2, plants: mix(tomato, basil, tomato, basil, basil, basil) },                   // 2 tomato + 4 basil (staggered, shallow companion)
    { tier: 3, plants: mix(tomato, strawberry, lettuce, strawberry, lettuce, strawberry) },  // 1 tomato staggered + berries + living mulch
    { tier: 4, plants: alternate(strawberry, spinach, 6) },                                // berries + shade-tolerant green
    { tier: 5, plants: alternate(bean, nasturtium, 6) },                                   // nitrogen fixer + trailing trap crop on ground
  ], 6);

  // Tower 2: "Tomato Companion Tower"
  // Tomatoes staggered: 2 on tier 2 + 1 on tier 3
  const tower2 = fillTower([
    { tier: 1, plants: alternate(thyme, springOnion, 6) },                                 // allium + herb pest deterrent
    { tier: 2, plants: mix(tomato, basil, tomato, parsley, basil, parsley) },               // 2 tomato + 2 basil + 2 parsley (staggered)
    { tier: 3, plants: mix(tomato, strawberry, lettuce, strawberry, lettuce, strawberry) },  // 1 tomato staggered + berries + hoverfly attractor
    { tier: 4, plants: alternate(strawberry, lettuce, 6) },                                // berries + living mulch
    { tier: 5, plants: alternate(bean, marigold, 6) },                                     // nitrogen fixer + pest deterrent at base
  ], 6);

  const templates = [tower1, tower2];
  const towers = Array.from({ length: towerCount }, (_, i) => templates[i % templates.length]);

  return {
    id: 'companion-optimal',
    name: 'Companion Powerhouse',
    description: 'Every pocket is a proven companion. Tomatoes staggered across tiers 2–3 (2 + 1 split) to reduce root competition — paired with shallow-rooted basil and parsley. Chives + thyme deter pests at the top. Nasturtiums trail safely at the bottom. Beans fix nitrogen. Zero foes.',
    strategy: 'companion-optimal',
    towers,
    tower1: towers[0],
    tower2: towers[1] ?? towers[0],
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
function maximumBerriesLayout(plants: Plant[], towerCount: number): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');       // essential tomato companion
  const chives = f('chives');     // dual companion, drought-tolerant for top
  const marigold = f('marigold'); // dual companion, compact pest deterrent

  // Tower 1: tomatoes staggered across tiers 2-3, strawberries everywhere else
  const tower1 = fillTower([
    { tier: 1, plants: alternate(strawberry, chives, 6) },                                 // berries + pest deterrent at top
    { tier: 2, plants: mix(tomato, basil, tomato, basil, strawberry, strawberry) },         // 2 tomato + 2 basil + 2 strawberry (staggered)
    { tier: 3, plants: mix(tomato, strawberry, strawberry, strawberry, strawberry, strawberry) }, // 1 tomato staggered + 5 strawberry
    { tier: 4, plants: repeat(strawberry, 6) },                                            // maximum berries
    { tier: 5, plants: alternate(strawberry, marigold, 6) },                               // berries + compact pest protection at base
  ], 6);

  // Tower 2: same staggered structure
  const tower2 = fillTower([
    { tier: 1, plants: alternate(strawberry, chives, 6) },                                 // berries + allium pest barrier
    { tier: 2, plants: mix(tomato, basil, tomato, basil, strawberry, strawberry) },         // 2 tomato + 2 basil + 2 strawberry (staggered)
    { tier: 3, plants: mix(tomato, strawberry, strawberry, strawberry, strawberry, strawberry) }, // 1 tomato staggered + 5 strawberry
    { tier: 4, plants: repeat(strawberry, 6) },                                            // maximum berries
    { tier: 5, plants: alternate(strawberry, marigold, 6) },                               // berries + pest protection at base
  ], 6);

  const templates = [tower1, tower2];
  const towers = Array.from({ length: towerCount }, (_, i) => templates[i % templates.length]);

  return {
    id: 'maximum-berries',
    name: 'Maximum Berries & Tomatoes',
    description: 'Maximum berry harvest with tomatoes staggered (2 tier 2 + 1 tier 3) to reduce root competition. Strawberries fill remaining pockets across 4 tiers. Chives and marigolds for minimal pest protection.',
    strategy: 'continuous-harvest',
    towers,
    tower1: towers[0],
    tower2: towers[1] ?? towers[0],
  };
}

/**
 * Strategy 4: Fragrant Edible Garden
 * David's ideal: strawberries + tomatoes as the backbone, companion herbs
 * for pest protection, fragrant plants woven into every tier for sensory
 * richness. Every pocket is edible OR a proven companion.
 *
 * Tier layout (top→bottom = tier 1→5):
 *   1 (top):    Fragrant herbs — lavender, thyme, dianthus, chamomile (drought-tolerant, fragrant)
 *   2:          Tumbling Tom + basil + scented geranium — fruit hangs clean, max fragrance
 *   3 (middle): Strawberry + lemon balm + chives — kid-height picking, fragrant companions
 *   4:          Strawberry + corsican mint + lettuce — shade-tolerant, walk-by fragrance
 *   5 (bottom): Bean + nasturtium + night-scented stock — trailing + evening fragrance
 */
function fragrantEdibleLayout(plants: Plant[], towerCount: number): LayoutOption {
  const suitable = plants.filter((p) => p.greenstalkSuitability !== 'unsuitable');
  const f = (slug: string) => findPlant(suitable, slug);

  const strawberry = f('strawberry');
  const tomato = f('tomato');
  const basil = f('basil');
  const bean = f('french-bean');
  const lettuce = f('lettuce');
  const chives = f('chives');
  const thyme = f('thyme');
  const nasturtium = f('nasturtium');
  const lemonBalm = f('lemon-balm');
  const corsicanMint = f('corsican-mint');
  const dianthus = f('dianthus');
  const scentedGeranium = f('scented-geranium');
  const nightStock = f('night-scented-stock');
  const chamomile = f('chamomile');
  const lavender = f('lavender');

  // Tower 1: "Fragrant Snacker"
  // Tomatoes staggered: 2 on tier 2 + 1 on tier 3
  const tower1 = fillTower([
    { tier: 1, plants: alternate(lavender ?? thyme, dianthus ?? chamomile ?? thyme, 6) },
    { tier: 2, plants: mix(tomato, scentedGeranium ?? basil, tomato, scentedGeranium ?? basil, basil, basil) }, // 2 tomato staggered + scented geranium
    { tier: 3, plants: mix(tomato, strawberry, lemonBalm ?? chives, strawberry, lemonBalm ?? chives, strawberry) }, // 1 tomato staggered + berries + fragrance
    { tier: 4, plants: alternate(strawberry, corsicanMint ?? lettuce, 6) },
    { tier: 5, plants: alternate(bean, nightStock ?? nasturtium, 6) },
  ], 6);

  // Tower 2: "Evening Scent Tower"
  // Tomatoes staggered: 2 on tier 2 + 1 on tier 3
  const tower2 = fillTower([
    { tier: 1, plants: alternate(thyme, chamomile ?? dianthus ?? chives, 6) },
    { tier: 2, plants: mix(tomato, basil, tomato, basil, chives, basil) },                                     // 2 tomato staggered + basil + chives
    { tier: 3, plants: mix(tomato, strawberry, lemonBalm ?? chives, strawberry, lemonBalm ?? chives, strawberry) }, // 1 tomato staggered + berries
    { tier: 4, plants: alternate(strawberry, lemonBalm ?? lettuce, 6) },
    { tier: 5, plants: alternate(nasturtium, nightStock ?? bean, 6) },
  ], 6);

  const templates = [tower1, tower2];
  const towers = Array.from({ length: towerCount }, (_, i) => templates[i % templates.length]);

  return {
    id: 'fragrant-edible',
    name: 'Fragrant Edible Garden',
    description: 'Strawberries + tomatoes as backbone with fragrant plants woven into every tier. Tomatoes staggered across tiers 2–3 (2 + 1 split) paired with scented geraniums and basil. Lavender and dianthus at the top for sun. Lemon balm and Corsican mint at kid-height. Night-scented stock for evening fragrance. Every pocket is edible or a proven companion.',
    strategy: 'continuous-harvest',
    towers,
    tower1: towers[0],
    tower2: towers[1] ?? towers[0],
  };
}

export function generateLayouts(
  plants: Plant[],
  companionMap: CompanionMap,
  towerCount: number = 2
): LayoutOption[] {
  return [
    expertChoiceLayout(plants, towerCount),
    fragrantEdibleLayout(plants, towerCount),
    familyHarvestLayout(plants, towerCount),
    companionOptimalLayout(plants, towerCount),
    maximumBerriesLayout(plants, towerCount),
  ];
}
