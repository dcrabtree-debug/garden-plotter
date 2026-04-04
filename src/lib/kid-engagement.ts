/**
 * Kid Engagement Engine
 *
 * Growth stages, harvest countdown, and achievement badges
 * designed for Max (5) and Noelle (3).
 */

// ─── Growth stages ───────────────────────────────────────────────────────────

export type GrowthStage = 'seed' | 'sprout' | 'growing' | 'flowering' | 'fruiting' | 'ready';

export interface GrowthProgress {
  stage: GrowthStage;
  stageEmoji: string;
  stageName: string;
  progressPct: number;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  message: string;
}

const STAGE_CONFIG: Record<GrowthStage, { emoji: string; name: string; pctRange: [number, number] }> = {
  seed: { emoji: '🌰', name: 'Seed', pctRange: [0, 10] },
  sprout: { emoji: '🌱', name: 'Sprouting', pctRange: [10, 25] },
  growing: { emoji: '🌿', name: 'Growing', pctRange: [25, 50] },
  flowering: { emoji: '🌸', name: 'Flowering', pctRange: [50, 75] },
  fruiting: { emoji: '🍅', name: 'Fruiting', pctRange: [75, 95] },
  ready: { emoji: '🎉', name: 'Ready!', pctRange: [95, 100] },
};

const KID_MESSAGES: Record<GrowthStage, string[]> = {
  seed: [
    "We planted a seed! Can you check if anything's poking through the soil?",
    "The seed is sleeping underground. It's drinking water and getting ready!",
    "Shhh... the seed is waking up!",
  ],
  sprout: [
    "LOOK! A tiny green shoot! Your plant is saying hello! 👋",
    "It's alive! A little sprout is pushing through. Be gentle!",
    "Your plant is a baby right now. It needs water and sunshine!",
  ],
  growing: [
    "Your plant is getting bigger every day! Can you see new leaves?",
    "It's growing SO fast! Count how many leaves it has!",
    "Your plant is a teenager now — eating lots and growing tall!",
  ],
  flowering: [
    "FLOWERS! 🌸 Your plant is making flowers. That means fruit is coming!",
    "See the pretty flowers? Bees will visit them. That helps make fruit!",
    "Your plant is showing off its flowers. Fruit comes next!",
  ],
  fruiting: [
    "Can you see tiny fruit starting to grow? Don't pick them yet — they need to get bigger!",
    "The fruit is growing! It's not ready yet — it needs to change colour.",
    "Almost there! The fruit is getting bigger. A few more days!",
  ],
  ready: [
    "IT'S READY! 🎉 Go pick it! Gently twist and pull!",
    "HARVEST TIME! Your plant grew food just for you! Go pick it!",
    "You grew this! From a tiny seed to food you can eat! 🌟",
  ],
};

export function getGrowthProgress(
  plantedDateStr: string,
  daysToHarvest: [number, number],
  plantName: string
): GrowthProgress {
  const planted = new Date(plantedDateStr + 'T00:00:00');
  const today = new Date();
  const daysElapsed = Math.floor((today.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));
  const daysTotal = daysToHarvest[0]; // use earliest harvest
  const progressPct = Math.min(100, Math.max(0, Math.round((daysElapsed / daysTotal) * 100)));
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  // Determine stage
  let stage: GrowthStage;
  if (progressPct < 10) stage = 'seed';
  else if (progressPct < 25) stage = 'sprout';
  else if (progressPct < 50) stage = 'growing';
  else if (progressPct < 75) stage = 'flowering';
  else if (progressPct < 95) stage = 'fruiting';
  else stage = 'ready';

  const config = STAGE_CONFIG[stage];
  const messages = KID_MESSAGES[stage];
  const message = messages[Math.abs(plantName.length) % messages.length];

  return {
    stage,
    stageEmoji: config.emoji,
    stageName: config.name,
    progressPct,
    daysElapsed,
    daysTotal,
    daysRemaining,
    message,
  };
}

// ─── Achievement badges ──────────────────────────────────────────────────────

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlocked: boolean;
  progress?: number; // 0-1
  target?: number;
}

export function calculateBadges(
  totalHarvests: number,
  uniquePlantsHarvested: Set<string>,
  daysGardening: number,
  harvestedSlugs: Set<string>
): Badge[] {
  const saladIngredients = ['lettuce', 'rocket', 'radish', 'spring-onion', 'tomato-tumbling', 'cucumber'];
  const hasSaladSet = saladIngredients.filter((s) => harvestedSlugs.has(s)).length;

  return [
    {
      id: 'first-harvest',
      name: 'First Harvest',
      emoji: '🌟',
      description: 'Pick your very first fruit or vegetable!',
      unlocked: totalHarvests >= 1,
    },
    {
      id: 'berry-picker',
      name: 'Berry Picker',
      emoji: '🍓',
      description: 'Harvest 5 strawberries',
      unlocked: totalHarvests >= 5, // simplified
      progress: Math.min(1, totalHarvests / 5),
      target: 5,
    },
    {
      id: 'green-thumb',
      name: 'Green Thumb',
      emoji: '👍',
      description: 'Harvest 10 times',
      unlocked: totalHarvests >= 10,
      progress: Math.min(1, totalHarvests / 10),
      target: 10,
    },
    {
      id: 'super-grower',
      name: 'Super Grower',
      emoji: '🦸',
      description: 'Harvest 25 times',
      unlocked: totalHarvests >= 25,
      progress: Math.min(1, totalHarvests / 25),
      target: 25,
    },
    {
      id: 'plant-explorer',
      name: 'Plant Explorer',
      emoji: '🧭',
      description: 'Harvest 3 different types of plants',
      unlocked: uniquePlantsHarvested.size >= 3,
      progress: Math.min(1, uniquePlantsHarvested.size / 3),
      target: 3,
    },
    {
      id: 'variety-champion',
      name: 'Variety Champion',
      emoji: '🏆',
      description: 'Harvest 6 different types of plants',
      unlocked: uniquePlantsHarvested.size >= 6,
      progress: Math.min(1, uniquePlantsHarvested.size / 6),
      target: 6,
    },
    {
      id: 'salad-boss',
      name: 'Salad Boss',
      emoji: '🥗',
      description: 'Grow all the ingredients for a salad (lettuce, rocket, radish, spring onion, tomato, cucumber)',
      unlocked: hasSaladSet >= 4, // at least 4 of 6
      progress: Math.min(1, hasSaladSet / 4),
      target: 4,
    },
    {
      id: 'herb-master',
      name: 'Herb Master',
      emoji: '🌿',
      description: 'Harvest 3 different herbs',
      unlocked: ['basil-sweet', 'thyme', 'oregano', 'parsley', 'chives', 'mint', 'rosemary', 'sage', 'coriander', 'dill', 'lemon-balm', 'chamomile'].filter((s) => harvestedSlugs.has(s)).length >= 3,
    },
    {
      id: 'week-streak',
      name: 'Garden Week',
      emoji: '📅',
      description: 'Garden for 7 days in a row',
      unlocked: daysGardening >= 7,
      progress: Math.min(1, daysGardening / 7),
      target: 7,
    },
    {
      id: 'garden-hero',
      name: 'Garden Hero',
      emoji: '🌟',
      description: 'Harvest 50 times — you\'re a real gardener!',
      unlocked: totalHarvests >= 50,
      progress: Math.min(1, totalHarvests / 50),
      target: 50,
    },
  ];
}

// ─── Harvest countdown ───────────────────────────────────────────────────────

export interface HarvestCountdown {
  plantName: string;
  emoji: string;
  daysRemaining: number;
  message: string;
  urgency: 'now' | 'soon' | 'growing' | 'waiting';
}

export function getCountdownMessage(days: number, plantName: string): HarvestCountdown['message'] {
  if (days <= 0) return `${plantName} is READY! Go pick it! 🎉`;
  if (days <= 3) return `${plantName} in ${days} days! Almost there!`;
  if (days <= 7) return `${plantName} this week! 🤩`;
  if (days <= 14) return `${plantName} in about 2 weeks!`;
  if (days <= 30) return `${plantName} in about a month — be patient!`;
  return `${plantName} is growing — ${days} days to go`;
}
