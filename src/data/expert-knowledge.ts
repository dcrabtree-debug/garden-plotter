/**
 * Expert Knowledge Module — Charles Dowding, Masanobu Fukuoka, Dr. D.G. Hessayon
 *
 * This module provides structured gardening wisdom from three complementary experts,
 * integrated throughout the Garden Plotter app to inform care advice, planting decisions,
 * and methodology recommendations.
 *
 * Sources:
 * - Charles Dowding: No Dig, Gardening Myths and Misconceptions, Charles Dowding's Veg Journal
 * - Masanobu Fukuoka: The One-Straw Revolution, The Natural Way of Farming
 * - Dr. D.G. Hessayon: The Vegetable & Herb Expert, The Container Expert, The Fruit Expert
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ExpertId = 'dowding' | 'fukuoka' | 'hessayon';

export interface ExpertProfile {
  id: ExpertId;
  name: string;
  title: string;
  philosophy: string;
  keyBooks: string[];
  applicability: string; // how it applies to a Surrey garden
}

export interface MonthlyAdvice {
  month: number;
  tasks: string[];
  tips: string[];
  expert: ExpertId;
}

export interface CropAdvice {
  slug: string;
  advice: string;
  expert: ExpertId;
  method?: string; // e.g., "no-dig", "natural farming", "conventional"
}

export interface MethodPrinciple {
  id: string;
  title: string;
  description: string;
  howToApply: string;
  expert: ExpertId;
  relevance: 'core' | 'supplementary' | 'philosophical';
}

// ─── Expert Profiles ────────────────────────────────────────────────────────

export const EXPERTS: ExpertProfile[] = [
  {
    id: 'dowding',
    name: 'Charles Dowding',
    title: 'No-Dig Pioneer',
    philosophy: 'Build soil life by never disturbing it. Add compost on top, let worms do the work. Simpler, less weeding, healthier plants.',
    keyBooks: ['No Dig: Nurture Your Soil to Grow Better Veg', 'Gardening Myths and Misconceptions', "Charles Dowding's Veg Journal"],
    applicability: 'Directly applicable to Surrey clay soil. No-dig is especially valuable on heavy clay — digging clay creates compacted clods that dry rock-hard. Compost on top feeds worms who create drainage channels naturally.',
  },
  {
    id: 'fukuoka',
    name: 'Masanobu Fukuoka',
    title: 'Natural Farming Philosopher',
    philosophy: 'Do nothing that nature can do for itself. No plowing, no chemical fertiliser, no weeding by tillage. Work with natural processes, not against them.',
    keyBooks: ['The One-Straw Revolution', 'The Natural Way of Farming', 'Sowing Seeds in the Desert'],
    applicability: 'Philosophy guides approach: observe before intervening, use ground cover and mulch, grow diverse crops together. Seed balls and green manures directly applicable. Full "do-nothing" impractical at small scale, but principles reduce unnecessary work.',
  },
  {
    id: 'hessayon',
    name: 'Dr. D.G. Hessayon',
    title: 'The Garden Expert',
    philosophy: 'Clear, practical, visual guidance for every gardener. Identify problems accurately, then apply the simplest effective solution. His standardized crop entry format (seed facts, soil facts, sowing calendar, care, harvest, troubles) remains the gold standard for gardening reference.',
    keyBooks: ['The Vegetable & Herb Expert', 'The Container Expert', 'The Fruit Expert', 'The Flower Expert', 'The Lawn Expert', 'Pest & Weed Expert'],
    applicability: 'The reference standard for UK gardening (53 million copies sold). Crop rotation groups, variety recommendations, and visual pest diagnosis remain authoritative. His soil preparation advice (traditional digging) is replaced by Dowding\'s no-dig method. Chemical pest recommendations are outdated — use organic alternatives. His final advice was one word: "Mulch."',
  },
];

// ─── No-Dig Principles (Dowding) ────────────────────────────────────────────

export const NO_DIG_PRINCIPLES: MethodPrinciple[] = [
  {
    id: 'never-dig',
    title: 'Never dig or turn the soil',
    description: 'Digging disrupts the soil food web, brings weed seeds to the surface, destroys fungal networks, and on clay soil creates compacted lumps. Walking on beds also compacts soil.',
    howToApply: 'Create permanent beds you never walk on. Add compost on top and let earthworms incorporate it. For new beds on grass/weeds, lay cardboard then 15cm compost directly on top.',
    expert: 'dowding',
    relevance: 'core',
  },
  {
    id: 'compost-mulch',
    title: 'Annual compost mulch',
    description: 'Apply 3-5cm of well-rotted compost on all beds once a year, ideally in autumn or early spring. This feeds the soil biology, suppresses weeds, and improves structure over time.',
    howToApply: 'Spread compost on the surface in October-November after clearing spent crops. Or in February-March before planting. For GreenStalk pockets, refresh top 2cm of compost each spring.',
    expert: 'dowding',
    relevance: 'core',
  },
  {
    id: 'permanent-beds',
    title: 'Permanent bed layout',
    description: 'Mark out beds once and never change them. Paths between beds take the foot traffic. Beds stay soft because they are never walked on.',
    howToApply: 'Design garden with 1.2m wide beds (reachable from both sides) and 40-50cm paths. Mulch paths with woodchip or straw to suppress weeds.',
    expert: 'dowding',
    relevance: 'core',
  },
  {
    id: 'succession-sowing',
    title: 'Continuous succession sowing',
    description: 'Sow small batches every 2-4 weeks for a continuous harvest rather than one big sowing. Gaps in the ground invite weeds.',
    howToApply: 'Sow lettuce/radish/rocket every 2 weeks Mar-Sep. Sow beans every 3 weeks Apr-Jul. As one crop finishes, plant the next immediately — no bare soil.',
    expert: 'dowding',
    relevance: 'core',
  },
  {
    id: 'multi-sow-modules',
    title: 'Multi-sow in modules',
    description: 'Sow 3-5 seeds per module cell and plant out as a clump. Works for beetroot, spring onion, leek, radish, spinach. Saves space, time, and compost.',
    howToApply: 'Sow 4 beetroot seeds per module. When seedlings are 3-4cm tall, plant the whole clump 20cm apart. Roots push each other aside naturally.',
    expert: 'dowding',
    relevance: 'core',
  },
  {
    id: 'no-bare-soil',
    title: 'Never leave soil bare',
    description: 'Bare soil loses moisture, erodes, and colonises with weeds. Always have a crop, green manure, or mulch covering the surface.',
    howToApply: 'After harvesting, immediately plant the next crop or sow a green manure (crimson clover Sep-Oct, phacelia Apr-Aug). In winter, compost mulch covers bare beds.',
    expert: 'dowding',
    relevance: 'core',
  },
];

// ─── Natural Farming Principles (Fukuoka) ───────────────────────────────────

export const NATURAL_FARMING_PRINCIPLES: MethodPrinciple[] = [
  {
    id: 'observe-first',
    title: 'Observe before intervening',
    description: 'Watch your garden for a full season before making big changes. Nature has solutions to most problems if you give it time. Most pest "outbreaks" are controlled by predators within days.',
    howToApply: 'When you see aphids, wait 3-5 days before spraying — ladybirds and hoverflies often arrive. When weeds appear, ask if they are actually protecting the soil. Log observations before acting.',
    expert: 'fukuoka',
    relevance: 'core',
  },
  {
    id: 'ground-cover',
    title: 'Living ground cover',
    description: 'The ground should always be covered with living plants. Clover between vegetables fixes nitrogen and suppresses weeds. Ground cover mimics forest floor conditions that soil life needs.',
    howToApply: 'Undersow white clover in paths and between brassicas. Let self-seeding herbs (parsley, coriander) and flowers (calendula, nasturtium) fill gaps. Tolerate some "weeds" if they are not competing.',
    expert: 'fukuoka',
    relevance: 'supplementary',
  },
  {
    id: 'seed-balls',
    title: 'Seed balls for direct sowing',
    description: 'Encase seeds in a ball of clay and compost. Protects from birds and mice, ensures good soil contact, and can be scattered on unprepared ground.',
    howToApply: 'Mix seeds with clay powder and compost (5:3:1 ratio clay:compost:seed). Roll into marble-sized balls, dry for 24h. Scatter on prepared beds or rough ground in spring.',
    expert: 'fukuoka',
    relevance: 'supplementary',
  },
  {
    id: 'straw-mulch',
    title: 'Straw mulching',
    description: 'Cover soil between plants with 5-10cm of straw. Retains moisture, suppresses weeds, feeds soil as it decomposes, and creates habitat for beneficial insects.',
    howToApply: 'Spread barley or wheat straw (NOT hay — too many weed seeds) around established plants from May onwards. Top up as it decomposes. Leave in place over winter.',
    expert: 'fukuoka',
    relevance: 'core',
  },
  {
    id: 'diversity',
    title: 'Polyculture over monoculture',
    description: 'Growing diverse crops together confuses pests, attracts beneficial insects, and uses space more efficiently. Monoculture rows are a human convenience, not a natural pattern.',
    howToApply: 'Interplant: tomatoes with basil, carrots with spring onions, beans with sweetcorn. Scatter flowers (calendula, nasturtium, marigold) throughout vegetable beds.',
    expert: 'fukuoka',
    relevance: 'core',
  },
  {
    id: 'green-manure',
    title: 'Green manure as soil builder',
    description: 'Grow cover crops specifically to improve soil. Legumes fix nitrogen. Deep-rooted plants break up clay. All cover crops add organic matter when cut and left as mulch.',
    howToApply: 'Sow crimson clover or field beans in September on cleared beds. Cut in March, leave on surface as mulch (no-dig compatible). Phacelia is excellent for pollinators and breaks up clay.',
    expert: 'fukuoka',
    relevance: 'core',
  },
];

// ─── Hessayon Expert Data ───────────────────────────────────────────────────

/**
 * Hessayon's crop rotation — upgraded to 4-year system per modern RHS guidance.
 * Hessayon originally used 3-year (potatoes+roots combined). We separate them
 * per current best practice but credit Hessayon's family groupings.
 *
 * Soil treatment per group (Hessayon):
 * - Before Potatoes: Manure, no lime (potatoes prefer slightly acid soil)
 * - Before Brassicas: Lime to raise pH. Follow legumes for residual nitrogen.
 * - Before Legumes/Others: Compost mulch + general feed.
 * - Before Roots/Onions: NO fresh manure (causes forking). Well-rotted compost only.
 */
export const HESSAYON_ROTATION_GROUPS = [
  { group: 'Legumes', crops: ['pea', 'broad-bean', 'runner-bean', 'dwarf-french-bean'], followedBy: 'Brassicas', soilPrep: 'Compost mulch + general feed', notes: 'Fix nitrogen — brassicas benefit from the residual N. Include onions, lettuce, sweetcorn, courgette in this plot.' },
  { group: 'Brassicas', crops: ['kale', 'broccoli-sprouting', 'cabbage', 'kohlrabi', 'radish', 'turnip'], followedBy: 'Roots & Onions', soilPrep: 'Lime if pH < 6.5, follow legumes for N', notes: 'Heavy feeders. Club root prevention: lime and rotation are your main tools. Radish is technically a brassica.' },
  { group: 'Roots & Onions', crops: ['carrot', 'beetroot', 'parsnip', 'onion', 'garlic', 'shallot', 'leek'], followedBy: 'Potatoes', soilPrep: 'Well-rotted compost only, NO fresh manure', notes: 'Fresh manure causes forking in roots. Onion family grouped here in 4-year rotation.' },
  { group: 'Potatoes', crops: ['potato-early'], followedBy: 'Legumes', soilPrep: 'Manure or compost, no lime', notes: 'Heavy feeders. Potatoes prefer slightly acid soil. Good for breaking in new ground.' },
  { group: 'Permanent', crops: ['strawberry-everbearing', 'alpine-strawberry', 'raspberry', 'rhubarb', 'asparagus', 'gooseberry', 'redcurrant', 'blueberry'], followedBy: null, soilPrep: 'Annual compost mulch', notes: 'Stay in place 3-10 years. Not part of annual rotation. Replace strawberries every 3 years.' },
];

export const HESSAYON_CONTAINER_ADVICE = {
  compostMix: 'Multi-purpose compost with 25% perlite or vermiculite for drainage. John Innes No.2 for longer-term plants.',
  watering: 'Containers dry out faster than ground soil. Check daily in summer, twice daily in heatwaves. Water until it runs from drainage holes.',
  feeding: 'Slow-release granules at planting. Switch to weekly liquid feed (tomato feed for fruiting crops, balanced feed for leafy crops) once flowering starts.',
  bestCrops: ['tomato-tumbling', 'lettuce', 'radish', 'basil-sweet', 'chives', 'strawberry-everbearing', 'dwarf-french-bean', 'perpetual-spinach', 'rocket', 'nasturtium'],
  avoid: 'Avoid deep-rooted crops (parsnip, carrot) unless container is 30cm+ deep. Runner beans need very large containers.',
};

/** Hessayon lawn care — relevant since family is moving to a new house */
export const HESSAYON_LAWN_CALENDAR: { month: number; tasks: string[] }[] = [
  { month: 3, tasks: ['First mow when grass reaches 5cm (set blades high)', 'Apply spring lawn feed', 'Overseed bare patches'] },
  { month: 4, tasks: ['Regular mowing begins (weekly)', 'Apply weed treatment if needed', 'Start edging'] },
  { month: 5, tasks: ['Mow twice weekly in good growing weather', 'Water if dry spells last 7+ days'] },
  { month: 6, tasks: ['Continue regular mowing', 'Raise mowing height in drought', 'Apply summer feed'] },
  { month: 7, tasks: ['Mow less frequently in hot weather', 'Water deeply if lawn yellows', 'Leave clippings to mulch in drought'] },
  { month: 8, tasks: ['Resume regular mowing as weather cools', 'Overseed bare patches late August'] },
  { month: 9, tasks: ['Scarify to remove thatch', 'Aerate with hollow-tine fork (critical on clay)', 'Apply autumn feed (low nitrogen)'] },
  { month: 10, tasks: ['Last mow of season (raise blades)', 'Brush sharp sand into aeration holes on clay', 'Clear fallen leaves'] },
  { month: 11, tasks: ['Keep off frozen lawn', 'Clear leaves to prevent moss'] },
];

/** Hessayon's approach to common Surrey clay lawn problems */
export const HESSAYON_CLAY_LAWN_TIPS = [
  'Hollow-tine aerate every autumn — clay compacts easily and this is the #1 fix',
  'Brush sharp sand into aeration holes to improve long-term drainage',
  'Moss thrives in damp, shaded, compacted conditions — all common on clay. Iron sulfate kills moss, then scarify to remove',
  'Clay stays cold in spring — delay first mow until soil has warmed',
  'Avoid walking on waterlogged lawn — creates permanent compaction damage',
  'Apply autumn feed (high potassium, low nitrogen) to toughen grass for winter',
];

export const HESSAYON_BOOKS: { title: string; focus: string; keyAdvice: string }[] = [
  { title: 'The Vegetable & Herb Expert', focus: 'Core vegetable and herb growing (best-selling title)', keyAdvice: 'Crop rotation groups, visual pest/disease diagnosis, sowing calendars, variety recommendations. Use his data with Dowding\'s no-dig methods.' },
  { title: 'The Container Expert', focus: 'Container and patio gardening', keyAdvice: 'Compost mixes, watering frequency by season, feeding schedules — directly applicable to GreenStalk vertical planters.' },
  { title: 'The Fruit Expert', focus: 'Fruit trees, bushes, and soft fruit', keyAdvice: 'Strawberry establishment, variety selection, pruning timing for small gardens. Soft fruit pest visual ID.' },
  { title: 'The Lawn Expert', focus: 'Lawn establishment and monthly care', keyAdvice: 'New lawn guidance (critical for new house). Monthly task calendar. Clay soil specifics: aeration, moss, drainage.' },
  { title: 'Pest & Weed Expert', focus: 'Visual problem diagnosis', keyAdvice: 'Symptom-first approach: identify by what you see, then treat. Excellent visual reference. Use organic treatments instead of his chemical recommendations.' },
  { title: 'The Flower Expert', focus: 'Ornamental flowers and borders', keyAdvice: 'Companion planting flowers (calendula, marigold, nasturtium), seasonal colour, cut-and-come-again varieties.' },
];

// ─── Monthly Care Calendar (Dowding-influenced) ─────────────────────────────

export const EXPERT_MONTHLY_ADVICE: MonthlyAdvice[] = [
  // January
  { month: 1, expert: 'dowding', tasks: ['Order seeds for the year', 'Plan crop rotation', 'Spread compost on empty beds if not frozen'], tips: ['Clay soil benefits most from winter compost — freeze-thaw cycles break it into the surface', 'Clean and sharpen tools'] },
  // February
  { month: 2, expert: 'dowding', tasks: ['Sow broad beans in modules indoors', 'Chit early potatoes', 'Finish compost spreading on all beds'], tips: ['Start seeds in modules on a windowsill — no need for heated propagator for hardy crops', 'Prepare new beds: cardboard + 15cm compost on grass'] },
  // March
  { month: 3, expert: 'dowding', tasks: ['Sow peas, lettuce, spinach in modules', 'Direct sow radish and rocket under fleece', 'Plant onion sets and garlic (if not autumn-planted)', 'First succession sow of salad crops'], tips: ['Fleece on early outdoor sowings gains you 2-3 weeks', 'Multi-sow beetroot: 4 seeds per module, plant clumps 20cm apart'] },
  // April
  { month: 4, expert: 'dowding', tasks: ['Sow tomatoes, courgettes, beans indoors', 'Plant out broad beans sown in Feb', 'Continue lettuce succession every 2 weeks', 'Direct sow carrots (cover with fleece for carrot fly)'], tips: ['Last frost mid-April in Surrey — harden off seedlings from conservatory 7-10 days before planting out', 'Start potatoes in containers or no-dig beds'] },
  // May
  { month: 5, expert: 'dowding', tasks: ['Plant out tender crops after last frost (mid-May)', 'Sow runner beans and French beans direct', 'Plant courgette and squash outside', 'Succession sow salads, radish, rocket'], tips: ['Straw mulch around strawberries now to keep fruit clean', 'Pinch out tips of broad beans when first pods form (deters blackfly)'] },
  // June
  { month: 6, expert: 'dowding', tasks: ['Start liquid feeding fruiting crops weekly', 'Continue succession sowing lettuce and radish', 'Train and tie in tomatoes', 'Sow autumn/winter crops: kale, chard, perpetual spinach'], tips: ['Water deeply 2-3 times per week rather than lightly every day', "Comfrey tea (Bocking 14) is nature's best liquid feed — free and sustainable"] },
  // July
  { month: 7, expert: 'dowding', tasks: ['Harvest early potatoes, broad beans, peas', 'Immediately replant cleared spaces with autumn crops', 'Sow spring cabbage, winter lettuce', 'Continue weekly feeding of containers'], tips: ['Never leave bare soil after clearing — sow green manure or plant next crop same day', 'Watch for blight on tomatoes in humid weather'] },
  // August
  { month: 8, expert: 'dowding', tasks: ['Main harvest month — pick regularly to encourage more', 'Sow last batch of quick crops (radish, rocket, mizuna)', 'Plant out kale and chard for winter', 'Prepare autumn garlic bed with compost'], tips: ['Crops you sow now will feed you through autumn and into winter', 'Order green manure seed for September sowing'] },
  // September
  { month: 9, expert: 'dowding', tasks: ['Sow green manures on cleared beds (crimson clover, phacelia)', 'Plant autumn garlic sets', 'Plant overwintering onion sets', 'Clear spent crops and compost them'], tips: ['Green manure is the most important thing you do this month — never leave beds bare over winter', 'Protect late tomatoes with fleece at night'] },
  // October
  { month: 10, expert: 'dowding', tasks: ['Spread annual compost mulch (3-5cm on all beds)', 'Harvest last tender crops before frost', 'Cover GreenStalks with fleece or move under cover', 'Plant garlic cloves (if not done in September)'], tips: ['First frost mid-October in Surrey — harvest all tomatoes, courgettes, beans', 'Compost applied now has all winter to be incorporated by worms'] },
  // November
  { month: 11, expert: 'dowding', tasks: ['Continue composting and mulching', 'Protect any remaining crops with fleece/cloches', 'Plan next year: review what worked'], tips: ['Winter is when no-dig soil improves fastest — worm activity peaks under compost mulch', 'Dead leaves make excellent path mulch'] },
  // December
  { month: 12, expert: 'dowding', tasks: ['Rest! Review season notes', 'Order seed catalogues', 'Maintain tools and structures'], tips: ['This is the month to read gardening books and plan next year', 'Winter kale, leeks, and parsnips can be harvested as needed'] },
];

// ─── Crop-Specific Expert Advice ────────────────────────────────────────────

export const CROP_EXPERT_ADVICE: CropAdvice[] = [
  // Dowding no-dig specifics
  { slug: 'tomato-tumbling', advice: 'Sow indoors Feb-Mar, one seed per module. Plant out late May after hardening off. In containers, water daily and feed weekly with tomato feed once first truss sets.', expert: 'dowding', method: 'no-dig' },
  { slug: 'lettuce', advice: 'KEY: Do NOT sow every 2 weeks. For leaf-picking, sow every 6-8 weeks (4-5 times per year). One seed per module, plant at 22cm. Pick outer leaves only — each plant produces for months. Sept sowing under cover crops Nov to June.', expert: 'dowding', method: 'no-dig' },
  { slug: 'beetroot', advice: 'Multi-sow 4 seeds per module. Plant clumps 22cm apart from April. Roots push each other apart naturally. Harvest at golf-ball size for best flavour. Leaves are edible too.', expert: 'dowding', method: 'no-dig' },
  { slug: 'carrot', advice: 'Direct sow only — carrots hate transplanting. Sow thinly in drills from March under fleece (carrot fly barrier). Thin to 5cm apart when seedlings are 3cm tall. Sandy soil ideal; on clay, grow short-root varieties like Chantenay.', expert: 'dowding', method: 'no-dig' },
  { slug: 'potato-early', advice: 'Chit from February on a cool windowsill. Plant in April, 15cm deep, 30cm apart. Earth up with compost (no-dig style) as shoots grow. Harvest when flowers fade — about 10-12 weeks.', expert: 'dowding', method: 'no-dig' },
  { slug: 'runner-bean', advice: 'Sow in modules April, plant out May after frost risk. Needs strong support (2m canes). Pick pods young and often — unpicked pods signal the plant to stop producing.', expert: 'dowding', method: 'no-dig' },
  { slug: 'courgette', advice: 'Sow one seed per 9cm pot in April. Plant out late May, 90cm apart — they need space. Harvest at 15-20cm for best flavour and to keep plants producing. One plant is enough for a family.', expert: 'dowding', method: 'no-dig' },
  { slug: 'garlic', advice: 'Plant individual cloves Oct-Nov (autumn planting gives bigger bulbs in Surrey). Push cloves 5cm deep, 15cm apart, pointed end up. Harvest when lower leaves turn yellow in June-July.', expert: 'dowding', method: 'no-dig' },
  { slug: 'onion', advice: 'Plant sets (not seed) in March-April, 10cm apart in rows 25cm apart. Push sets into compost so tips just show. Harvest when tops fall over in July-August.', expert: 'dowding', method: 'no-dig' },
  { slug: 'kale', advice: 'Sow June-July for winter harvesting. Plant out 45cm apart. The most valuable winter vegetable — stands through hard frost when nothing else grows. Pick lower leaves first.', expert: 'dowding', method: 'no-dig' },
  { slug: 'pea', advice: 'Sow in guttering or modules Feb-Apr. Plant out when 8cm tall. Support with pea sticks or netting. Pick regularly to keep plants producing. Pea shoots from indoor sowings are a bonus crop.', expert: 'dowding', method: 'no-dig' },
  { slug: 'broad-bean', advice: 'Sow Oct-Nov for earliest crop (overwinters well in Surrey) or Feb-Mar for spring crop. Pinch out growing tips when first pods form to deter blackfly and redirect energy to pods.', expert: 'dowding', method: 'no-dig' },
  { slug: 'radish', advice: 'Direct sow every 2 weeks Mar-Sep. Ready in 4 weeks — the fastest reward in gardening. Sow between slower crops as a space-filler. Thin to 3cm apart.', expert: 'dowding', method: 'no-dig' },
  { slug: 'perpetual-spinach', advice: 'Sow Apr-Jul. Far better than true spinach for beginners — does not bolt in heat, cropping for 12+ months from one sowing. Pick outer leaves regularly.', expert: 'dowding', method: 'no-dig' },
  { slug: 'rocket', advice: 'Sow every 3 weeks Apr-Sep. Grows fast in cool weather, bolts in heat. Summer sowings do better in partial shade. Wild rocket is more heat-tolerant than salad rocket.', expert: 'dowding', method: 'no-dig' },
  { slug: 'strawberry-everbearing', advice: 'Plant in spring or autumn 30cm apart. Straw mulch under fruits from May. Remove runners unless you want new plants. Everbearing varieties crop June-October. Replace plants every 3 years.', expert: 'dowding', method: 'no-dig' },
  // Fukuoka-influenced advice
  { slug: 'crimson-clover', advice: 'Broadcast sow September on cleared beds. Fixes 80-150 kg N/ha. Stunning red flowers attract pollinators. Cut in March, leave as surface mulch — perfect no-dig green manure.', expert: 'fukuoka', method: 'natural farming' },
  { slug: 'phacelia', advice: 'Sow April-September as a gap-filler. Top pollinator plant. Deep roots break up Surrey clay. Killed by frost, so no need to cut — it composts in place.', expert: 'fukuoka', method: 'natural farming' },
  { slug: 'nasturtium', advice: 'Trap crop: attracts aphids AWAY from your vegetables. Edible flowers and leaves. Let it self-seed — it returns every year with zero effort. Ideal seed ball candidate.', expert: 'fukuoka', method: 'natural farming' },
  { slug: 'calendula', advice: 'Attracts hoverflies (aphid predators), repels some pests. Self-seeds freely. Edible petals. Grows in any soil. Scatter seed balls for naturalistic drifts.', expert: 'fukuoka', method: 'natural farming' },
  { slug: 'radish', advice: 'Fukuoka valued radish for soil-loosening action without tillage. Perfect seed ball crop — make clay/compost balls with 3-5 seeds, scatter on beds. Taproots open channels in clay.', expert: 'fukuoka', method: 'natural farming' },
  { slug: 'pea', advice: 'Key nitrogen-fixer. After harvest, chop stems and leave as mulch — roots stay in soil releasing nitrogen for the next crop. Good seed ball candidate (one per ball).', expert: 'fukuoka', method: 'natural farming' },
  { slug: 'broad-bean', advice: 'The best winter green manure for clay soil. Deep tap roots break compacted layers. Leave roots in ground after harvest — nitrogen nodules feed the following crop.', expert: 'fukuoka', method: 'natural farming' },
  { slug: 'kale', advice: 'Leave kale to flower in spring — feeds bees, then self-seeds for next year. Undersow white clover once plants are established in July. Excellent for seed balls (sow autumn).', expert: 'fukuoka', method: 'natural farming' },
  { slug: 'potato-early', advice: 'No-dig potatoes: lay seed potatoes on surface, cover with 15cm compost/leaf mold, add more as they grow. Straw mulch works specifically for potatoes — tubers form in the mulch layer.', expert: 'fukuoka', method: 'natural farming' },
  { slug: 'courgette', advice: 'Trailing habit acts as living mulch — large leaves suppress weeds naturally. Underplant with white clover. Thrives on clay moisture.', expert: 'fukuoka', method: 'natural farming' },
  // Hessayon practical advice (crop data from Vegetable & Herb Expert + Container Expert)
  { slug: 'basil-sweet', advice: 'Needs warmth above all — do not plant out until June in Surrey. Pinch out growing tips to promote bushy growth. Water at soil level, not on leaves (prevents grey mould). In containers, water daily but ensure excellent drainage.', expert: 'hessayon', method: 'container' },
  { slug: 'mint', advice: 'ALWAYS grow in a container — it spreads aggressively by underground runners. Any soil, any aspect. Cut back hard in autumn, it regrows from roots in spring. Several varieties worth growing: spearmint, peppermint, chocolate mint.', expert: 'hessayon', method: 'container' },
  { slug: 'parsley', advice: 'Slow to germinate (3-4 weeks). Soak seed overnight before sowing. Grows well in partial shade. Flat-leaf (Italian) has better flavour; curly-leaf is hardier. Biennial — runs to seed in year 2.', expert: 'hessayon' },
  { slug: 'thyme', advice: 'Mediterranean herb — needs full sun and sharp drainage. On Surrey clay, grow in containers or raised beds with added grit. Cut back by one-third after flowering to prevent legginess. Replace every 3-4 years.', expert: 'hessayon' },
  { slug: 'rosemary', advice: 'Drought-tolerant once established. Hates wet feet — on clay soil, plant on a mound or in a container. Prune after flowering to maintain shape. Can grow to 1.5m if left unpruned.', expert: 'hessayon' },
  { slug: 'carrot', advice: 'Hessayon key: carrot fly is the #1 pest. Symptom: rusty tunnels in roots, wilting foliage. Prevention: fleece barrier from sowing, 60cm-tall barrier around crop, or companion plant with spring onions (scent masks carrot smell).', expert: 'hessayon', method: 'pest diagnosis' },
  { slug: 'onion', advice: 'Sets preferred over seed for reliability. Plant March-April, 10cm apart, rows 25cm. Push into surface compost so tips just show. Harvest when tops fall over July-August. Cure in sun for 2 weeks before storing.', expert: 'hessayon' },
  { slug: 'runner-bean', advice: 'Hessayon method: double row on cane support, 15cm apart, rows 60cm. Sow May-Jun direct. Note: traditional advice was to dig a bean trench and fill with kitchen waste over winter — Dowding\'s no-dig approach is now preferred (plant into compost surface).', expert: 'hessayon' },
  { slug: 'tomato-tumbling', advice: 'Feed weekly with tomato fertiliser once first truss sets. Remove side-shoots on cordon types (not needed for Tumbling Tom bush types). Watch for blight in humid weather Jul-Sep — remove affected foliage immediately.', expert: 'hessayon', method: 'pest diagnosis' },
  { slug: 'lettuce', advice: 'Hessayon standard: row sow, thin to 25cm apart. Modern improvement: module-sow instead (Dowding method) to avoid thinning waste and slug damage to young seedlings. Succession sow Mar-Jul for continuous harvest.', expert: 'hessayon' },
];

// ─── Green Manure Data (Fukuoka + Dowding) ──────────────────────────────────

export interface GreenManure {
  name: string;
  latin: string;
  type: 'legume' | 'non-legume';
  sowWindow: [number, number]; // months
  cutMonth: number | null; // when to chop-and-drop (null = permanent)
  nFixKgHa: number; // nitrogen fixation kg/ha/year (0 for non-legumes)
  claySuitable: boolean;
  pollinatorValue: 'high' | 'moderate' | 'low';
  notes: string;
}

export const GREEN_MANURES: GreenManure[] = [
  { name: 'White Clover (Aber Ace)', latin: 'Trifolium repens', type: 'legume', sowWindow: [3, 9], cutMonth: null, nFixKgHa: 175, claySuitable: true, pollinatorValue: 'moderate', notes: 'Permanent living mulch for paths and under tall crops. Low mat form, persists 6-8 years.' },
  { name: 'Crimson Clover', latin: 'Trifolium incarnatum', type: 'legume', sowWindow: [4, 8], cutMonth: 4, nFixKgHa: 115, claySuitable: true, pollinatorValue: 'high', notes: 'Stunning red flowers. Annual — sow Sep for spring chop-and-drop. Excellent bee plant.' },
  { name: 'Winter Field Beans', latin: 'Vicia faba', type: 'legume', sowWindow: [10, 11], cutMonth: 3, nFixKgHa: 125, claySuitable: true, pollinatorValue: 'low', notes: 'Best green manure for heavy clay. Deep tap roots break compacted layers. Hardy to -10°C.' },
  { name: 'Winter Tares (Vetch)', latin: 'Vicia sativa', type: 'legume', sowWindow: [9, 11], cutMonth: 3, nFixKgHa: 90, claySuitable: true, pollinatorValue: 'moderate', notes: 'Scrambling habit. Hardy to -12°C. Good mixed with grazing rye.' },
  { name: 'Phacelia', latin: 'Phacelia tanacetifolia', type: 'non-legume', sowWindow: [4, 8], cutMonth: null, nFixKgHa: 0, claySuitable: true, pollinatorValue: 'high', notes: 'Top pollinator plant. Killed by frost — no need to cut. Deep roots improve clay structure.' },
  { name: 'Grazing Rye', latin: 'Secale cereale', type: 'non-legume', sowWindow: [9, 11], cutMonth: 3, nFixKgHa: 0, claySuitable: true, pollinatorValue: 'low', notes: 'Massive root system prevents nutrient leaching over winter. Cut and mulch in March.' },
  { name: 'Buckwheat', latin: 'Fagopyrum esculentum', type: 'non-legume', sowWindow: [4, 8], cutMonth: null, nFixKgHa: 0, claySuitable: false, pollinatorValue: 'high', notes: 'Fast biomass on poor soils. Frost-tender — dies naturally in autumn.' },
];

// ─── Seed Ball Suitability (Fukuoka method) ─────────────────────────────────

export type SeedBallRating = 'ideal' | 'good' | 'not-recommended';

export const SEED_BALL_CROPS: Record<string, { rating: SeedBallRating; notes: string }> = {
  'radish': { rating: 'ideal', notes: 'Perfect seed ball crop. Fast germinating, breaks up soil.' },
  'lettuce': { rating: 'ideal', notes: 'Small seeds do well in clay balls. Scatter for naturalistic patches.' },
  'rocket': { rating: 'ideal', notes: 'Fast-growing, ideal for seed ball scattering.' },
  'kale': { rating: 'ideal', notes: 'Robust seedlings. Sow in autumn seed balls for winter crop.' },
  'pea': { rating: 'good', notes: 'Large seeds — make bigger balls. Sow Feb-Apr.' },
  'broad-bean': { rating: 'good', notes: 'Very large seeds. One per ball. Direct sow Oct-Nov.' },
  'runner-bean': { rating: 'good', notes: 'One large seed per ball. Sow May.' },
  'dwarf-french-bean': { rating: 'good', notes: 'One seed per ball. Sow after last frost.' },
  'parsley': { rating: 'good', notes: 'Slow to germinate but works in seed balls. Be patient (3-4 weeks).' },
  'coriander': { rating: 'good', notes: 'Prefers cool weather. Scatter seed balls in early spring or autumn.' },
  'nasturtium': { rating: 'ideal', notes: 'Large seeds, vigorous growers. Scatter anywhere — they thrive on neglect.' },
  'calendula': { rating: 'ideal', notes: 'Self-seeds freely anyway. Seed balls spread them where you want.' },
  'spinach': { rating: 'good', notes: 'Works well. Sow in cool months for best results.' },
  'carrot': { rating: 'good', notes: 'Tiny seeds — place near surface of the ball. Use small balls.' },
  'beetroot': { rating: 'good', notes: 'Multi-germ seeds mean each ball produces several seedlings.' },
};

// ─── UK-Specific Mulch Guidance ─────────────────────────────────────────────

export const MULCH_GUIDANCE = {
  straw: {
    when: 'Use for: paths, under fruiting strawberries (briefly), around established fruit bushes',
    warning: 'CAUTION: Straw mulch creates ideal slug habitat in UK\'s damp climate. Charles Dowding does NOT recommend straw on UK vegetable beds. Use compost mulch instead.',
    alternative: 'Well-rotted compost dries on the surface and discourages slugs. This is the preferred mulch for UK vegetable beds.',
  },
  compost: {
    when: 'Use for: all vegetable beds, all year round. Apply 3-5cm annually in autumn.',
    notes: 'The Dowding standard. Suppresses weeds, feeds soil biology, dries on surface to deter slugs.',
  },
  leafMold: {
    when: 'Use for: paths, under hedges, around fruit trees. Free and abundant in autumn.',
    notes: 'Takes 1-2 years to make. Excellent soil conditioner. Does not deter slugs.',
  },
  woodchip: {
    when: 'Use for: paths only. Do NOT use on vegetable beds (nitrogen lock-up).',
    notes: 'Suppresses weeds on paths. Breaks down slowly. Free from tree surgeons.',
  },
};

// ─── Dowding Multisow Data (key innovation) ─────────────────────────────────

export interface MultisowCrop {
  slug: string;
  seedsPerModule: number;
  spacingCm: number;
  harvestMethod: string;
}

export const MULTISOW_CROPS: MultisowCrop[] = [
  { slug: 'onion', seedsPerModule: 6, spacingCm: 30, harvestMethod: 'Bulbs push apart as they grow — harvest individually' },
  { slug: 'spring-onion', seedsPerModule: 8, spacingCm: 22, harvestMethod: 'Pull individual stems from clump' },
  { slug: 'beetroot', seedsPerModule: 4, spacingCm: 30, harvestMethod: 'Twist out golf-ball size roots individually over weeks' },
  { slug: 'radish', seedsPerModule: 4, spacingCm: 15, harvestMethod: 'Pull individually; more seeds = smaller radishes' },
  { slug: 'pea', seedsPerModule: 3, spacingCm: 22, harvestMethod: 'Grow as clump; push peas deeper in module' },
  { slug: 'spinach', seedsPerModule: 3, spacingCm: 22, harvestMethod: 'Pick outer leaves from each plant in clump' },
];

// ─── Dowding Spacing Reference (from his dibber markings) ───────────────────

export const DOWDING_SPACINGS: Record<string, { spacingCm: number; notes: string }> = {
  'radish': { spacingCm: 15, notes: 'Multisown clumps' },
  'lettuce': { spacingCm: 22, notes: 'Individual transplants from modules' },
  'rocket': { spacingCm: 22, notes: 'Individual or small clumps' },
  'spinach': { spacingCm: 22, notes: 'Multisown or individual' },
  'perpetual-spinach': { spacingCm: 22, notes: 'Long-cropping, pick outer leaves' },
  'spring-onion': { spacingCm: 22, notes: 'Multisown clumps of 8 seeds' },
  'coriander': { spacingCm: 22, notes: 'Individual, bolts in heat' },
  'parsley': { spacingCm: 22, notes: 'Individual, slow germination' },
  'beetroot': { spacingCm: 30, notes: 'Multisown clumps of 4-5 seeds' },
  'onion': { spacingCm: 30, notes: 'Multisown clumps of 6 seeds' },
  'broad-bean': { spacingCm: 30, notes: 'Individual, direct or transplant' },
  'potato-early': { spacingCm: 40, notes: 'Direct plant, earth up with compost' },
  'kale': { spacingCm: 45, notes: 'Annual varieties: Red Russian, Cavolo Nero' },
  'runner-bean': { spacingCm: 45, notes: 'Needs climbing support' },
  'courgette': { spacingCm: 60, notes: 'Large plants, need space' },
  'tomato-tumbling': { spacingCm: 45, notes: 'Bush types closer than cordon' },
  'broccoli-sprouting': { spacingCm: 60, notes: 'Purple sprouting, large plants' },
  'garlic': { spacingCm: 15, notes: 'Direct plant, 3-4cm deep, pointy end up' },
  'carrot': { spacingCm: 5, notes: 'Direct sow only, thin as needed' },
};

// ─── No-Dig Constants ───────────────────────────────────────────────────────

export const NO_DIG_CONSTANTS = {
  newBedCompostDepthCm: 15,
  cardboardOverlapCm: 15,
  bedEdgeExtensionCm: 20,
  recommendedBedWidthM: 1.2,
  recommendedBedLengthM: 2.4,
  annualCompostDepthCm: 2.5,
  annualCompostLitresPerSqM: 30,
  compostApplicationMonth: 11,
  transplantAgeDays: 28,
  directSowOnly: ['carrot', 'parsnip', 'garlic', 'potato-early'],
};

// ─── Dowding Beginner Mistakes ──────────────────────────────────────────────

export const BEGINNER_MISTAKES: { mistake: string; correction: string; severity: 'critical' | 'moderate' | 'minor' }[] = [
  { mistake: 'Waiting for cardboard to decompose before planting', correction: 'Plant immediately into the compost on top. Roots penetrate cardboard as it softens (2-3 months).', severity: 'critical' },
  { mistake: 'Digging or forking "just this once"', correction: 'Never dig. Any disturbance brings dormant weed seeds to the surface and damages soil structure. Firm soil is better for plants.', severity: 'critical' },
  { mistake: 'Using straw/hay mulch on vegetable beds', correction: 'In UK damp climate, straw creates slug habitat. Use compost as mulch — it dries on the surface and deters slugs.', severity: 'critical' },
  { mistake: 'Using plastic-coated cardboard', correction: 'Use plain brown cardboard only. Plastic coating blocks water and root penetration. Remove all tape and staples.', severity: 'critical' },
  { mistake: 'Permanent wooden bed frames', correction: 'Decaying wood harbours slugs. Frames prevent full cardboard coverage. Frameless mounded beds work better.', severity: 'moderate' },
  { mistake: 'Sowing lettuce every 2 weeks', correction: 'For leaf-picking method, sow every 6-8 weeks (4-5 times/year). Each sowing lasts months with outer-leaf picking. Every-2-weeks only needed for hearted lettuce.', severity: 'minor' },
  { mistake: 'Starting too big', correction: 'Start with one bed (1.2m x 2.4m). Expand once comfortable. Overwhelm leads to abandoned beds.', severity: 'moderate' },
  { mistake: 'Leaving beds empty between crops', correction: 'Interplant next crop before current one finishes. Dowding key pairs: onions → kale, broad beans → leeks, potatoes → French beans.', severity: 'minor' },
];

// ─── Integration helpers ────────────────────────────────────────────────────

/** Get all expert advice for a specific crop slug */
export function getExpertAdviceForCrop(slug: string): CropAdvice[] {
  return CROP_EXPERT_ADVICE.filter((a) => a.slug === slug);
}

/** Get monthly advice for a specific month from all experts */
export function getMonthlyExpertAdvice(month: number): MonthlyAdvice[] {
  return EXPERT_MONTHLY_ADVICE.filter((a) => a.month === month);
}

/** Get all principles from all experts */
export function getAllPrinciples(): MethodPrinciple[] {
  return [...NO_DIG_PRINCIPLES, ...NATURAL_FARMING_PRINCIPLES];
}

/** Get the Hessayon rotation group for a crop */
export function getRotationGroup(slug: string): string | null {
  for (const group of HESSAYON_ROTATION_GROUPS) {
    if (group.crops.includes(slug)) return group.group;
  }
  return null;
}

/** Get the recommended next rotation group */
export function getNextRotation(currentGroup: string): string | null {
  const group = HESSAYON_ROTATION_GROUPS.find((g) => g.group === currentGroup);
  return group?.followedBy ?? null;
}
