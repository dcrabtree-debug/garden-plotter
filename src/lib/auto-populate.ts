import type { Plant } from '../types/plant';
import type { CompanionMap } from '../types/companion';
import type { CrossSystemPairing } from './cross-system-scoring';
import { scorePlant, getSlugRisk } from './garden-rating';

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
 *   Tier 2: Tumbling Tom Red + Cherry Falls tomato
 *     → Tumbling Tom Red: RHS AGM winner, bred for containers, determinate
 *       trailing habit means fruit hangs BELOW the pocket — clean, no staking
 *     → Cherry Falls: 2023 Which? "Best Buy", cascading, prolific, sweet
 *     → Both produce 2-4kg per plant in containers (RHS trial data)
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
 *   Tier 2: Tumbling Tom Red + Flat Leaf (Italian) parsley
 *     → Second tomato plant for staggered harvesting
 *     → Italian Flat Leaf: RHS "superior flavour to curly", biennial
 *       Attracts hoverflies (aphid predators) — proven tomato companion
 *
 *   Tier 3 (kid height): Albion strawberry + Salad Bowl lettuce
 *     → Albion: UC Davis bred, disease-resistant, heavy cropper, day-neutral
 *       Fruits June-September — peak when Mara des Bois takes a rest
 *     → Salad Bowl: RHS "excellent cut-and-come-again", oak-leaf, bolt-resistant
 *       Kids can tear leaves daily for dinner salad
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
  const tower1 = fillTower([
    { tier: 1, plants: repeat(basil, 6) },                          // Genovese + Greek Dwarf basil
    { tier: 2, plants: alternate(tomato, tomato, 6) },               // Tumbling Tom Red + Cherry Falls
    { tier: 3, plants: alternate(strawberry, lettuce, 6) },          // Mara des Bois + Little Gem
    { tier: 4, plants: alternate(strawberry, rocket ?? lettuce, 6) },// Mara des Bois + Wild Rocket
    { tier: 5, plants: alternate(bean, nasturtium, 6) },             // Tendergreen + Empress of India
  ], 6);

  // Tower 2: "The Grazer" — herbs, salad, continuous picking
  const tower2 = fillTower([
    { tier: 1, plants: alternate(chives, thyme, 6) },                // Common Chives + Lemon Thyme
    { tier: 2, plants: alternate(tomato, parsley ?? basil, 6) },     // Tumbling Tom Red + Italian Flat Leaf
    { tier: 3, plants: alternate(strawberry, lettuce, 6) },          // Albion + Salad Bowl
    { tier: 4, plants: alternate(strawberry, spinach, 6) },          // Albion + Perpetual Spinach
    { tier: 5, plants: alternate(bean, marigold, 6) },               // Purple Teepee + Sparky Mix
  ], 6);

  const templates = [tower1, tower2];
  const towers = Array.from({ length: towerCount }, (_, i) => templates[i % templates.length]);

  return {
    id: 'expert-choice',
    name: 'RHS Expert\'s Choice',
    description:
      'Our top recommendation for 21 Esher Avenue. Every varietal hand-picked from RHS trials and Which? "Best Buy" results for Surrey conditions, late-May start, and kid-friendly picking.\n\n' +
      'Tower 1 "The Producer": Genovese basil (top, drought-tolerant) → Tumbling Tom Red + Cherry Falls tomato (tier 2, RHS AGM, cascade freely) → Mara des Bois strawberry + Little Gem lettuce (tier 3, kid height) → more Mara des Bois + Wild Rocket (tier 4, £12/kg shop value) → Tendergreen bean + Empress of India nasturtium (bottom, nitrogen-fixing + aphid trap).\n\n' +
      'Tower 2 "The Grazer": Common Chives + Lemon Thyme (top, pest barrier) → Tumbling Tom + Italian Flat Leaf parsley (tier 2, hoverfly attractor) → Albion strawberry + Salad Bowl lettuce (tier 3, disease-resistant) → Albion + Perpetual Spinach (tier 4, won\'t bolt) → Purple Teepee "magic" beans + Sparky Mix marigold (bottom, kids find purple pods, turn green when cooked).\n\n' +
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

  const templates = [tower1, tower2];
  const towers = Array.from({ length: towerCount }, (_, i) => templates[i % templates.length]);

  return {
    id: 'family-harvest',
    name: 'Kids\' Picking Towers',
    description: 'Tumbling Tom tomatoes on tier 2 so fruit hangs clean (no staking needed). Strawberries at kid-height for Max and Noelle. Nasturtiums at the bottom where trailing can\'t shade other tiers. Herbs at the top.',
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

  const templates = [tower1, tower2];
  const towers = Array.from({ length: towerCount }, (_, i) => templates[i % templates.length]);

  return {
    id: 'companion-optimal',
    name: 'Companion Powerhouse',
    description: 'Every pocket is a proven companion. Tumbling Tom on tier 2 with basil (fruit hangs clean, no staking). Chives + thyme deter pests at the top. Nasturtiums trail safely at the bottom. Beans fix nitrogen. Zero foes.',
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

  const templates = [tower1, tower2];
  const towers = Array.from({ length: towerCount }, (_, i) => templates[i % templates.length]);

  return {
    id: 'maximum-berries',
    name: 'Maximum Berries & Tomatoes',
    description: 'Maximum berry harvest: strawberries on 4 of 5 tiers. Tumbling Tom on tier 2 so fruit hangs clean. Chives and marigolds for minimal pest protection. No nasturtiums — more room for berries.',
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
  const tower1 = fillTower([
    { tier: 1, plants: alternate(lavender ?? thyme, dianthus ?? chamomile ?? thyme, 6) },
    { tier: 2, plants: alternate(tomato, scentedGeranium ?? basil, 6) },
    { tier: 3, plants: alternate(strawberry, lemonBalm ?? chives, 6) },
    { tier: 4, plants: alternate(strawberry, corsicanMint ?? lettuce, 6) },
    { tier: 5, plants: alternate(bean, nightStock ?? nasturtium, 6) },
  ], 6);

  // Tower 2: "Evening Scent Tower"
  const tower2 = fillTower([
    { tier: 1, plants: alternate(thyme, chamomile ?? dianthus ?? chives, 6) },
    { tier: 2, plants: alternate(tomato, basil, 6) },
    { tier: 3, plants: alternate(strawberry, chives, 6) },
    { tier: 4, plants: alternate(strawberry, lemonBalm ?? lettuce, 6) },
    { tier: 5, plants: alternate(nasturtium, nightStock ?? bean, 6) },
  ], 6);

  const templates = [tower1, tower2];
  const towers = Array.from({ length: towerCount }, (_, i) => templates[i % templates.length]);

  return {
    id: 'fragrant-edible',
    name: 'Fragrant Edible Garden',
    description: 'Strawberries + tomatoes as backbone with fragrant plants woven into every tier. Lavender and dianthus at the top for sun and scent. Scented geraniums with tomatoes on tier 2. Lemon balm and Corsican mint at kid-height. Night-scented stock at the base for evening fragrance. Every pocket is edible or a proven companion.',
    strategy: 'continuous-harvest',
    towers,
    tower1: towers[0],
    tower2: towers[1] ?? towers[0],
  };
}

/**
 * Highest Garden Grade — greedy algorithm that picks GreenStalk-suitable plants
 * maximizing the overall garden grade score. Slug-prone plants are steered HERE
 * (elevated GreenStalks = natural slug defence for lettuce, strawberries, basil, etc).
 *
 * Algorithm: score every candidate plant against the current composition,
 * pick the highest-scoring one for each pocket, tier by tier.
 */
function highestGradeLayout(
  plants: Plant[],
  companionMap: CompanionMap,
  towerCount: number
): LayoutOption {
  // Filter to GreenStalk-suitable plants
  const candidates = plants.filter(
    (p) => p.greenstalkSuitability === 'ideal' || p.greenstalkSuitability === 'good'
  );

  const towers: (string | null)[][][] = [];
  const placed = new Set<string>(); // track placed slugs for diversity
  const allSlugs: string[] = [];

  for (let t = 0; t < towerCount; t++) {
    const grid: (string | null)[][] = Array.from({ length: 5 }, () =>
      new Array(6).fill(null)
    );

    for (let tier = 0; tier < 5; tier++) {
      for (let pocket = 0; pocket < 6; pocket++) {
        let bestScore = -1;
        let bestSlug: string | null = null;

        for (const candidate of candidates) {
          // Prefer diversity — bonus for unplaced species
          const diversityBonus = placed.has(candidate.slug) ? 0 : 1;
          // Slug-prone plants get a bonus for being in GreenStalks (elevated = safe)
          const slugBonus = getSlugRisk(candidate.slug) === 'high' ? 0.5 : 0;
          // Tier suitability check
          const tierOk = candidate.idealTiers?.includes(tier + 1) ?? true;
          const tierBonus = tierOk ? 0.3 : 0;

          const ps = scorePlant(candidate, allSlugs, companionMap, 'greenstalk');
          const totalScore = ps.overall + diversityBonus + slugBonus + tierBonus;

          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestSlug = candidate.slug;
          }
        }

        if (bestSlug) {
          grid[tier][pocket] = bestSlug;
          allSlugs.push(bestSlug);
          placed.add(bestSlug);
        }
      }
    }
    towers.push(grid);
  }

  return {
    id: 'highest-grade',
    name: 'Highest Garden Grade',
    description:
      'Algorithmically optimized for the highest overall Garden Grade score. ' +
      'Slug-prone plants (lettuce, strawberries, basil) are steered to GreenStalks ' +
      'where elevation provides natural slug defence. Weights respond to your ' +
      'current priority sliders.',
    strategy: 'expert-choice' as LayoutStrategy,
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
    highestGradeLayout(plants, companionMap, towerCount),
    expertChoiceLayout(plants, towerCount),
    fragrantEdibleLayout(plants, towerCount),
    familyHarvestLayout(plants, towerCount),
    companionOptimalLayout(plants, towerCount),
    maximumBerriesLayout(plants, towerCount),
  ];
}
