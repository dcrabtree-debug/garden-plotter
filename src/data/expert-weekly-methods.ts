// ═══════════════════════════════════════════════════════════════════════════
// Expert Weekly Methods — Date-aware, fortnightly guidance from Dowding,
// Fukuoka, and Hessayon, calibrated for Surrey UK (Walton-on-Thames, H5/8b).
//
// Data structure: 26 fortnightly "windows" covering the full year. Each has
// rich content from all three experts plus a featured crop for the period.
//
// Sources:
//   • Charles Dowding — No Dig, Vegetable Journal, online courses
//   • Masanobu Fukuoka — The One-Straw Revolution (UK adaptations)
//   • Dr. D.G. Hessayon — The Vegetable & Herb Expert, Container Expert
// ═══════════════════════════════════════════════════════════════════════════

export interface WeeklyExpertWindow {
  id: string;
  startWeek: number;         // ISO week-of-year, 1-53
  endWeek: number;
  dateLabel: string;         // e.g. "Late March"
  stage: string;             // phenological stage
  title: string;             // short editorial title
  headline: string;          // one-sentence summary of what this window is about

  dowding: {
    tasks: string[];                          // 3-5 concrete practical actions
    technique: { title: string; detail: string };  // featured no-dig skill of the fortnight
    keyTip: string;                           // pull-quote wisdom
  };

  fukuoka: {
    reflection: string;   // philosophical framing
    practice: string;     // one "do-nothing" or natural-farming action
  };

  hessayon: {
    focus: string;        // what to look at / diagnose
    reference: string;    // book + specific chapter / topic
  };

  featuredCrop?: {
    emoji: string;
    name: string;
    action: string;
  };
}

// ── Helper: ISO week-of-year ────────────────────────────────────────────────
export function getWeekOfYear(date: Date = new Date()): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

// ── 26 fortnightly windows ──────────────────────────────────────────────────
export const WEEKLY_EXPERT_METHODS: WeeklyExpertWindow[] = [
  // ── WINTER ────────────────────────────────────────────────────────────────
  {
    id: 'w01-02',
    startWeek: 1,
    endWeek: 2,
    dateLabel: 'Early January',
    stage: 'Deep dormancy',
    title: 'Planning & Paper Gardening',
    headline: "The most productive gardening you can do this fortnight happens indoors with a seed catalogue and a pencil.",
    dowding: {
      tasks: [
        'Order seeds — aim to arrive before end of January',
        'Draft crop rotation plan for the 4 bed groups',
        'Review last year\'s harvest log: what worked, what failed',
        'Spread compost on any frost-free day (worms will incorporate it)',
      ],
      technique: {
        title: 'The January Seed Order',
        detail: 'Dowding\'s rule: under-order rather than over-order. For a family of 4 you need 1 packet each of 20-25 crops, not 50. Focus on long-cropping varieties (perpetual spinach, everbearing strawberry, sprouting broccoli) over novelty.',
      },
      keyTip: 'Buy from specialist UK seed houses (Real Seeds, Vital Seeds, Tamar Organics) — the extra £5 returns in germination reliability.',
    },
    fukuoka: {
      reflection: 'Fukuoka: "The ultimate goal of farming is not the growing of crops, but the cultivation and perfection of human beings." Winter is when the gardener grows.',
      practice: 'Spend 20 minutes observing the garden without doing anything. Note where snow lingers, where water pools, where the wind bites. These are your microclimates — design around them.',
    },
    hessayon: {
      focus: 'Winter tool audit. Sharpen spades, oil hinges, clean pots with dilute bleach. Boring but Hessayon was adamant: bad tools cause bad gardening.',
      reference: 'The Vegetable & Herb Expert — opening chapter on tools and equipment.',
    },
    featuredCrop: {
      emoji: '📖',
      name: 'The Plan',
      action: 'Sketch your 4-group rotation on paper before touching a single seed.',
    },
  },
  {
    id: 'w03-04',
    startWeek: 3,
    endWeek: 4,
    dateLabel: 'Late January',
    stage: 'Lengthening days',
    title: 'First Stirrings',
    headline: 'Day length is increasing but soil is still cold. Prepare indoor sowing kit; do not be tempted to sow yet.',
    dowding: {
      tasks: [
        'Chit early seed potatoes on a cool, light windowsill (egg boxes work well)',
        'Sterilise module trays and seed compost for February sowing',
        'Build or buy a heated propagator if starting tomatoes/peppers from seed',
        'Continue compost spreading on empty beds',
      ],
      technique: {
        title: 'Potato Chitting',
        detail: 'Stand seed potatoes rose-end up (the end with most eyes) in egg boxes or trays. Cool room ~10°C, bright light. In 4-6 weeks you\'ll have sturdy 2cm shoots. Chitted potatoes crop 2-3 weeks earlier and yield better than unchitted.',
      },
      keyTip: 'Dowding\'s test: if a sparrow can bathe in your soil without sinking, it\'s ready to work. Otherwise, wait.',
    },
    fukuoka: {
      reflection: 'Fukuoka argued that every intervention creates a new problem the gardener must then solve. Before doing anything this month, ask: "What happens if I do nothing?"',
      practice: 'Make a first batch of seed balls for spring scattering: 1 part seed (radish, clover, calendula) + 3 parts dry clay + 5 parts sifted compost. Roll into pea-sized balls, dry on a tray.',
    },
    hessayon: {
      focus: 'Check stored onions, garlic, potatoes for rot. Remove any affected individuals immediately — one soft onion spoils the basket.',
      reference: 'The Vegetable & Herb Expert — storage chapter, page on rot prevention.',
    },
    featuredCrop: {
      emoji: '🥔',
      name: 'Early Potatoes',
      action: 'Start chitting now — they go in the ground in April.',
    },
  },

  // ── LATE WINTER / EARLY SPRING ────────────────────────────────────────────
  {
    id: 'w05-06',
    startWeek: 5,
    endWeek: 6,
    dateLabel: 'Early February',
    stage: 'Pre-spring',
    title: 'First Sowings Indoors',
    headline: 'Broad beans and onions from seed can go in now. Everything else should wait.',
    dowding: {
      tasks: [
        'Sow broad beans in deep modules (one seed per cell, indoors)',
        'Sow onion seed (Bedfordshire Champion, Ailsa Craig) under cover',
        'Start sweet peas in root trainers',
        'Prepare new no-dig beds: cardboard + 15cm compost directly on grass',
      ],
      technique: {
        title: 'The No-Dig New Bed',
        detail: 'Lay overlapping cardboard (plain brown only — no tape, no plastic) straight onto grass or weeds. Wet it thoroughly. Cover with 15cm (6") of well-rotted compost. Plant into it the same day. Worms do the digging for you; the cardboard rots by June.',
      },
      keyTip: 'Never walk on a no-dig bed. Use paths. Firm soil is fine — compacted soil is not.',
    },
    fukuoka: {
      reflection: '"The more people do, the more society develops, the more problems arise." — Fukuoka. Resist the urge to tidy everything. Seed-heads and standing stems feed overwintering insects.',
      practice: 'Scatter winter hardy seed balls (field beans, crimson clover) onto any still-bare ground. The frost will press them in.',
    },
    hessayon: {
      focus: 'Inspect fruit trees and bushes for overwintering pests (scale, woolly aphid) while leafless. Prune apple and pear if not already done.',
      reference: 'The Fruit Expert — winter pruning section.',
    },
    featuredCrop: {
      emoji: '🫘',
      name: 'Broad Beans',
      action: 'Sow "Aquadulce Claudia" in deep modules now; plant out in April.',
    },
  },
  {
    id: 'w07-08',
    startWeek: 7,
    endWeek: 8,
    dateLabel: 'Late February',
    stage: 'Pre-spring',
    title: 'Module Sowing Season Begins',
    headline: 'The windowsill fills up. This is when Dowding\'s multisow method earns its reputation.',
    dowding: {
      tasks: [
        'Multisow onion seed (6 per module) — the clump method',
        'Sow lettuce, spinach, coriander in modules indoors',
        'Sow peas in guttering (fill a length of gutter with compost, sow, slide out into a trench later)',
        'Finish all winter bed prep — spring is coming fast',
      ],
      technique: {
        title: 'Multisow — Dowding\'s Signature Technique',
        detail: 'Place 4-6 seeds per module. Do NOT thin. Plant the whole clump at one spacing: onions 30cm, beetroot 30cm, spring onions 22cm, radish 15cm. Crops push each other apart as they grow. Yield from one tray matches traditional single-sow from three trays.',
      },
      keyTip: 'Dowding: "The soil wants to be busy. Your job is to keep something growing in it, not to tidy it up."',
    },
    fukuoka: {
      reflection: 'Natural farming asks: can this work without me? Multisown clumps are a small step toward that — plants self-organise, the gardener just plants the clump.',
      practice: 'Walk the whole garden once with no tool in your hand. Just look. Fukuoka called this "the most important work in farming".',
    },
    hessayon: {
      focus: 'First feed of container perennials (herbs in pots, bay tree, strawberries). Half-strength liquid feed as growth begins.',
      reference: 'The Container Expert — feeding schedule for permanent plantings.',
    },
    featuredCrop: {
      emoji: '🧅',
      name: 'Onions (from seed)',
      action: 'Multisow 6 seeds per module. Plant the whole clump at 30cm spacing in April.',
    },
  },
  {
    id: 'w09-10',
    startWeek: 9,
    endWeek: 10,
    dateLabel: 'Early March',
    stage: 'Spring emergence',
    title: 'First Outdoor Sowings',
    headline: 'Under fleece, direct sowing can begin. The season has officially started.',
    dowding: {
      tasks: [
        'Direct sow radish, rocket, parsnip, and first carrots under fleece',
        'Plant garlic if not done in autumn (cloves pointy-end up, 15cm apart)',
        'Plant shallot sets and first early potatoes at the end of this window',
        'Continue indoor sowings of leeks, lettuce, chard',
      ],
      technique: {
        title: 'The Fleece Advantage',
        detail: 'Horticultural fleece (30gsm) adds 2-3°C and a full 2-3 weeks to your growing season at either end. Lay it loose over freshly sown beds — seedlings push it up as they grow. Weight edges with bricks. Remove on warm days above 15°C.',
      },
      keyTip: 'Dowding: "Fleece is the cheapest polytunnel you\'ll ever own."',
    },
    fukuoka: {
      reflection: 'Fukuoka sowed rice by scattering seed balls onto the previous crop — no tillage, no preparation. Ask what your equivalent is for this garden.',
      practice: 'Scatter calendula, nasturtium, and phacelia seed balls on any open bed. They become self-sowing companions for years to come.',
    },
    hessayon: {
      focus: 'Slug and snail patrol begins. Daily check of hostas, young lettuces, and seedlings. Beer traps work; copper rings on pots work better.',
      reference: 'Pest & Weed Expert — molluscs section (ignore the chemical recommendations, use organic only).',
    },
    featuredCrop: {
      emoji: '🥕',
      name: 'Early Carrots',
      action: 'Sow "Amsterdam Forcing" or "Nantes" thinly in drills; cover with fleece against carrot fly.',
    },
  },

  // ── SPRING ────────────────────────────────────────────────────────────────
  {
    id: 'w11-12',
    startWeek: 11,
    endWeek: 12,
    dateLabel: 'Mid-March',
    stage: 'Spring surge',
    title: 'Succession Begins',
    headline: 'Multiple sowings every fortnight from here to September. Build the habit now.',
    dowding: {
      tasks: [
        'Sow beetroot in modules (multisow 4 seeds per cell)',
        'Sow first batch of salad rocket, mizuna, lettuce — then AGAIN in 3 weeks',
        'Plant early potatoes if soil has warmed',
        'Sow tomatoes and peppers indoors on a heated propagator',
      ],
      technique: {
        title: 'Succession Sowing — The Dowding Rhythm',
        detail: 'For LETTUCE (leaf-picking method): sow every 6-8 weeks, NOT every 2. Each sowing crops for 2 months. For RADISH and ROCKET: every 3 weeks. For PEAS and BEANS: every 4 weeks through May. Write sowing dates in a calendar now — you will forget otherwise.',
      },
      keyTip: 'Dowding correction for beginners: "Most people sow lettuce far too often and radish not often enough."',
    },
    fukuoka: {
      reflection: 'Fukuoka intercropped grain with white clover — the clover fixed nitrogen, suppressed weeds, and stayed for years. The crop changed above it; the soil never bare.',
      practice: 'Undersow paths and gaps with white clover (Aber Ace). Once established, it self-regenerates for 6+ years and feeds neighbouring crops via root contact.',
    },
    hessayon: {
      focus: 'Check for aphids on new growth. Hessayon\'s symptom-ID approach: curled leaves + sticky residue = aphids. Blast with water first; squash second; spray only as last resort.',
      reference: 'The Vegetable & Herb Expert — pest ID chart.',
    },
    featuredCrop: {
      emoji: '🥬',
      name: 'Lettuce',
      action: 'Sow one batch now for 2 months of leaves. Do not sow again until late April.',
    },
  },
  {
    id: 'w13-14',
    startWeek: 13,
    endWeek: 14,
    dateLabel: 'Late March',
    stage: 'Spring surge',
    title: 'Hardening Off Begins',
    headline: 'The crossover point. Windowsill seedlings need to meet the outdoors gradually.',
    dowding: {
      tasks: [
        'Start hardening off broad beans and early brassicas (7-10 days)',
        'Direct sow peas outside under fleece',
        'Plant out autumn-sown broad beans',
        'Sow courgettes, cucumbers, squash indoors (one per 9cm pot)',
      ],
      technique: {
        title: 'Hardening Off — The 10-Day Protocol',
        detail: 'Day 1-2: outside 2 hours, sheltered shade. Day 3-4: 4 hours, morning sun. Day 5-6: all day, bring in at night. Day 7-8: all day and night, still sheltered. Day 9-10: plant out. Skipping this step is the #1 cause of spring seedling failure.',
      },
      keyTip: 'Dowding: "A seedling moved straight from windowsill to open ground will lose a week catching up, or die."',
    },
    fukuoka: {
      reflection: 'Nature has no transplant shock because nature rarely transplants. The closest you can get is minimal root disturbance and a gradual move outside.',
      practice: 'When planting out, water the seedling BEFORE removing from the module, not after. Roots stay intact, soil ball holds together.',
    },
    hessayon: {
      focus: 'Stake tall crops early (broad beans, peas). Hessayon\'s rule: put the support in when you plant, not when the wind knocks the crop down.',
      reference: 'The Vegetable & Herb Expert — supports and structures section.',
    },
    featuredCrop: {
      emoji: '🥒',
      name: 'Courgettes',
      action: 'Sow seeds on edge (not flat) to prevent rot. One seed per 9cm pot. Plant out late May.',
    },
  },
  {
    id: 'w15-16',
    startWeek: 15,
    endWeek: 16,
    dateLabel: 'Early April',
    stage: 'Last frost window',
    title: 'Spring Push',
    headline: 'Maximum planting activity. Everything hardy goes out; everything tender stays in.',
    dowding: {
      tasks: [
        'Plant out broad beans, peas, onion sets, lettuce, spinach, chard',
        'Direct sow parsnips, carrots, beetroot under fleece',
        'Sow runner beans and French beans indoors',
        'Start weekly liquid feed on overwintered crops',
      ],
      technique: {
        title: 'Interplanting for Double Use',
        detail: 'Dowding\'s key pairs: plant lettuce between brassicas (lettuce harvests before brassicas need the space); radish between slow carrots (marks the rows, harvests first); spring onions under tomatoes. One square metre yields 2-3 crops per year instead of 1.',
      },
      keyTip: 'Dowding: "Think of the bed as a theatre with multiple acts — not a one-act play."',
    },
    fukuoka: {
      reflection: 'The goal of natural farming is not zero work. It is work that compounds instead of repeating. Every action this spring should make next year easier.',
      practice: 'Before sowing, scatter a thin layer of homemade compost over the bed as a fresh top-dressing. Worms pull it down within a week.',
    },
    hessayon: {
      focus: 'Apple and pear blossom beginning — watch for frost warnings. Cover young trees with fleece on nights below 3°C.',
      reference: 'The Fruit Expert — frost protection for blossom.',
    },
    featuredCrop: {
      emoji: '🫛',
      name: 'Peas',
      action: 'Plant out modules at 22cm. Support with twiggy sticks or netting immediately.',
    },
  },
  {
    id: 'w17-18',
    startWeek: 17,
    endWeek: 18,
    dateLabel: 'Late April',
    stage: 'Last frost',
    title: 'The Last Frost Line',
    headline: 'Surrey\'s average last frost is mid-April — but stay alert through early May.',
    dowding: {
      tasks: [
        'Continue hardening off tomatoes, courgettes, squash',
        'Plant out maincrop potatoes',
        'Multisow beetroot and spring onions and plant straight out',
        'Second succession of lettuce and rocket',
      ],
      technique: {
        title: 'The Compost Top-Up',
        detail: 'Mid-season compost dressing: 1-2cm of well-rotted compost scattered around existing plants. Feeds the soil directly without disturbing roots. Apply between spring and summer crops. No need to fork it in — worms do it.',
      },
      keyTip: 'Dowding: "Compost is the answer to almost every question a vegetable gardener can ask."',
    },
    fukuoka: {
      reflection: 'Fukuoka: "To the extent that people separate themselves from nature, they spin further and further from the centre." Bare hands in warm soil this month — feel temperature, moisture, life.',
      practice: 'Identify 3 "weeds" you\'ve been fighting. Research whether any is edible or useful (nettles = soup + fertiliser tea; dandelion = salad; chickweed = bird feed). Stop fighting at least one.',
    },
    hessayon: {
      focus: 'Lawn care peaks — first proper cut when grass is 8cm. Do not cut below 4cm. Apply spring feed only after first mow.',
      reference: 'The Lawn Expert — April chapter, spring feeding.',
    },
    featuredCrop: {
      emoji: '🍅',
      name: 'Tomatoes',
      action: 'Keep indoors until 3rd week of May. Pot on to 1L pots if roots are showing.',
    },
  },

  // ── LATE SPRING / EARLY SUMMER ────────────────────────────────────────────
  {
    id: 'w19-20',
    startWeek: 19,
    endWeek: 20,
    dateLabel: 'Early May',
    stage: 'Tender planting',
    title: 'Tender Crops Go Out',
    headline: 'The biggest planting fortnight of the year. Tomatoes, beans, courgettes, squash — all out now.',
    dowding: {
      tasks: [
        'Plant out tomatoes (allow 50cm between cordons, 90cm bush)',
        'Plant out courgettes, squash, pumpkins (90cm apart)',
        'Direct sow runner beans and French beans',
        'Strawberries: mulch with compost (Dowding method) — not straw in damp UK',
      ],
      technique: {
        title: 'Planting Tomatoes Deep',
        detail: 'Tomatoes root from the stem. Plant them 5-10cm deeper than they sat in the pot, burying the lowest leaves. New roots form along the buried stem, building a bigger root system. Only works for tomatoes — do not try this with other crops.',
      },
      keyTip: 'Dowding: "Plant when the soil warms, not when the calendar says. 10cm soil temperature above 10°C is the test."',
    },
    fukuoka: {
      reflection: 'Every tool you buy creates new work. Before buying anything this month, ask: what existing tool could do this job?',
      practice: 'Let one area of garden grow wild for the summer. Observe what appears. The "weeds" that thrive tell you what your soil needs.',
    },
    hessayon: {
      focus: 'Container plants begin daily watering. Hessayon\'s container rule: water when the top 2cm is dry, not on a schedule.',
      reference: 'The Container Expert — watering frequency chart.',
    },
    featuredCrop: {
      emoji: '🍓',
      name: 'Strawberries',
      action: 'Mulch under fruiting plants with compost. Net against birds as soon as flowers set.',
    },
  },
  {
    id: 'w21-22',
    startWeek: 21,
    endWeek: 22,
    dateLabel: 'Late May',
    stage: 'Full spring',
    title: 'Full Planting',
    headline: 'By the end of this fortnight, every bed should be holding a crop.',
    dowding: {
      tasks: [
        'Plant sweetcorn in a block (not a row — wind pollination)',
        'Sow a green manure (phacelia) in any still-empty beds',
        'First side-shoot removal on cordon tomatoes',
        'Pinch out tips of broad beans once first pods form (deters blackfly)',
      ],
      technique: {
        title: 'Block Planting Sweetcorn',
        detail: 'Sweetcorn is wind-pollinated. Plant 9+ plants in a square grid (e.g., 3×3 or 4×4), 35cm apart — never in a single row. A row of 12 plants often fails; a block of 9 succeeds. Plant the day you take them off the windowsill.',
      },
      keyTip: 'Dowding: "Never leave bare soil. It\'s an invitation to weeds and a loss of sunlight."',
    },
    fukuoka: {
      reflection: 'Observation over intervention. This fortnight, spend time watching what is happening in the beds — what\'s flowering, what\'s being visited, what\'s struggling. Do not fix anything for 5 days.',
      practice: 'Scatter phacelia seed on any gaps. It flowers in 6 weeks, feeds bees, dies in winter, improves soil.',
    },
    hessayon: {
      focus: 'Blackfly on broad beans — Hessayon\'s classic pinch-out remedy works. Remove top 5cm of growth once pods set.',
      reference: 'The Vegetable & Herb Expert — broad bean chapter.',
    },
    featuredCrop: {
      emoji: '🌽',
      name: 'Sweetcorn',
      action: 'Plant in a 3×3 or 4×4 block for reliable pollination.',
    },
  },
  {
    id: 'w23-24',
    startWeek: 23,
    endWeek: 24,
    dateLabel: 'Early June',
    stage: 'Early summer',
    title: 'Liquid Feed & Train',
    headline: 'Fruiting crops enter the feeding phase. Training and tying-in start in earnest.',
    dowding: {
      tasks: [
        'Start weekly comfrey tea or tomato feed for all fruiting crops',
        'Tie in tomato cordons and remove side-shoots weekly',
        'Sow autumn/winter kale, sprouting broccoli, perpetual spinach',
        'Net strawberries before blackbirds find them',
      ],
      technique: {
        title: 'Making Comfrey Tea — Free Fertiliser',
        detail: 'Stuff a bucket half-full of comfrey leaves (Bocking 14 variety). Top up with water. Cover (it STINKS). Wait 2-4 weeks. Dilute 1:10 with water. Use weekly on tomatoes, courgettes, squash, peppers. Richer in potassium than shop tomato feed. Free forever once you grow one comfrey plant.',
      },
      keyTip: 'Dowding: "If you only grow one fertiliser plant, grow comfrey."',
    },
    fukuoka: {
      reflection: '"The more you do, the more you must do." Every rescue intervention creates dependency. Plants grown hard are stronger than plants grown coddled.',
      practice: 'Skip one weekly feed on half your beds. Compare growth. Usually indistinguishable — the soil was already feeding them.',
    },
    hessayon: {
      focus: 'Container plants need feeding. Hessayon\'s schedule: weekly half-strength balanced feed once flowers/fruit set.',
      reference: 'The Container Expert — feeding fruiting crops section.',
    },
    featuredCrop: {
      emoji: '🌿',
      name: 'Comfrey',
      action: 'If you don\'t have a plant, buy one (Bocking 14) from an online herb nursery. Invest 10 minutes now for 20 years of free feed.',
    },
  },
  {
    id: 'w25-26',
    startWeek: 25,
    endWeek: 26,
    dateLabel: 'Mid-June',
    stage: 'Summer solstice',
    title: 'Midsummer Peak',
    headline: 'Longest days. Maximum growth. The garden reaches full complexity.',
    dowding: {
      tasks: [
        'Water deeply 2-3 times weekly — not lightly daily',
        'Continue succession sowing salad crops',
        'First garlic scapes appear — snap them off to direct energy to bulbs',
        'Earth up maincrop potatoes with compost',
      ],
      technique: {
        title: 'Deep Watering vs Sprinkling',
        detail: 'A 10-minute sprinkle wets the top 2cm — roots chase it upward and suffer when it dries. A 30-minute deep soak wets 15cm+ — roots grow down and stay cooler. Water 2-3 times weekly deep, never daily shallow. Morning is best.',
      },
      keyTip: 'Dowding: "Water the soil, not the plant. Water the root zone, not the leaves."',
    },
    fukuoka: {
      reflection: 'Summer solstice — the year turns. From here, day length shortens by a few minutes daily. Plants respond before we notice. Sow autumn crops NOW, not when it feels cool.',
      practice: 'Sit in the garden at dusk for 30 minutes. Fukuoka insisted this daily pause — watching, not doing — was the most important gardening work.',
    },
    hessayon: {
      focus: 'Blight watch begins on tomatoes and potatoes. Hessayon: remove any yellowing lower leaves immediately; improve airflow by removing side-shoots.',
      reference: 'The Vegetable & Herb Expert — blight identification photos.',
    },
    featuredCrop: {
      emoji: '🧄',
      name: 'Garlic',
      action: 'Snap off the scapes (flower stems) — eat them stir-fried; bulbs grow bigger for it.',
    },
  },

  // ── SUMMER ────────────────────────────────────────────────────────────────
  {
    id: 'w27-28',
    startWeek: 27,
    endWeek: 28,
    dateLabel: 'Early July',
    stage: 'Mid-summer',
    title: 'First Big Harvest',
    headline: 'Early potatoes, broad beans, peas, lettuce — harvest and IMMEDIATELY replant.',
    dowding: {
      tasks: [
        'Harvest garlic as lower leaves yellow',
        'Harvest early potatoes, broad beans, first peas',
        'Replant cleared spaces the same day with leeks, kale, chard',
        'Continue weekly feeding fruiting crops',
      ],
      technique: {
        title: 'Same-Day Replant',
        detail: 'The no-dig rule: when you pull a crop, plant the next one in the same hour if possible. The soil is warm, moist, and weed-free from the previous crop. Waiting even a week loses growing time AND invites weeds. Keep module-grown seedlings ready to drop in.',
      },
      keyTip: 'Dowding: "The harvest of one crop is the sowing date of the next. Never wait."',
    },
    fukuoka: {
      reflection: 'The mistake is thinking of harvest as the end. It\'s just a pause. Nature never takes a crop without planting the next one.',
      practice: 'When you pull garlic, drop a handful of French bean seeds into the same hole — no-dig, no spacing calculation. See what happens.',
    },
    hessayon: {
      focus: 'Water butts. Hessayon: by July a water butt should be your first irrigation source. Mains water is cold and limescale-heavy; rainwater is neutral and free.',
      reference: 'The Vegetable & Herb Expert — watering and irrigation.',
    },
    featuredCrop: {
      emoji: '🧅',
      name: 'Garlic',
      action: 'Lift, shake off soil, hang in an airy shed to dry for 2 weeks before storing.',
    },
  },
  {
    id: 'w29-30',
    startWeek: 29,
    endWeek: 30,
    dateLabel: 'Late July',
    stage: 'High summer',
    title: 'Preserve & Sow Winter',
    headline: 'Gluts begin. What you sow now feeds you from October to March.',
    dowding: {
      tasks: [
        'Sow spring cabbage, winter lettuce, last batch of beetroot and carrots',
        'Freeze, pickle, or share courgette and bean gluts — do not let them go to waste',
        'Pinch out tomato growing tips (cordons should have 4-5 trusses set)',
        'Order green manure seed for September sowing',
      ],
      technique: {
        title: 'Winter Sowing Window',
        detail: 'The crops you sow this fortnight are the ones you\'ll eat at Christmas: spring cabbage, winter lettuce, chard, perpetual spinach, kale. Miss this window and you\'ll buy imported salad all winter. The sowing is easy; the discipline to do it in the heat of July is the hard part.',
      },
      keyTip: 'Dowding: "July-sown brassicas are next winter\'s insurance policy."',
    },
    fukuoka: {
      reflection: 'Abundance is a test. Can you let a crop go without guilt? Can you share it? Can you compost excess without regret?',
      practice: 'Leave 3-5 courgettes to grow to full marrow size. Save the seeds. Free seed for next year.',
    },
    hessayon: {
      focus: 'Blight arriving. Hessayon: first signs are brown patches with yellow halos on tomato leaves. Remove immediately; do not compost affected foliage.',
      reference: 'The Vegetable & Herb Expert — disease diagnosis photos.',
    },
    featuredCrop: {
      emoji: '🥬',
      name: 'Spring Cabbage',
      action: 'Sow now for transplanting in September. Crops mid-March when little else is fresh.',
    },
  },
  {
    id: 'w31-32',
    startWeek: 31,
    endWeek: 32,
    dateLabel: 'Early August',
    stage: 'High summer',
    title: 'Peak Harvest, Peak Vigilance',
    headline: 'Daily picking, daily watering, daily pest watch. This is the busiest fortnight of the year.',
    dowding: {
      tasks: [
        'Pick runner beans, French beans, courgettes DAILY — missed pods slow production',
        'Harvest main tomato crop as it ripens',
        'Water deep, water often — clay beds dry fast in heat',
        'Plant out July-sown brassicas, chard, winter lettuce',
      ],
      technique: {
        title: 'The Daily Pick',
        detail: 'Runner beans, French beans, courgettes, and cucumbers all follow the same rule: plants stop producing when mature seed is on the plant. A single forgotten courgette becomes a marrow and shuts down the plant. 10 minutes daily picking doubles the total harvest.',
      },
      keyTip: 'Dowding: "The plants that give the most are the ones you visit the most."',
    },
    fukuoka: {
      reflection: 'Every bite of food this fortnight carries sun, rain, soil, and your attention. Eat something from the garden every day — raw if possible — and notice the difference from shop-bought.',
      practice: 'Stop watering one "thirsty" crop for 4 days. See if it really needs daily water or if you\'ve been training it to be dependent.',
    },
    hessayon: {
      focus: 'Tomato leaf curl — Hessayon distinguishes physiological (heat stress, harmless) from viral (discard plant). If new growth is normal, it\'s heat stress — provide shade at midday.',
      reference: 'The Vegetable & Herb Expert — tomato problems photo guide.',
    },
    featuredCrop: {
      emoji: '🫘',
      name: 'Runner Beans',
      action: 'Pick pods at 15-20cm, every day. Overgrown pods are stringy and stop the plant.',
    },
  },
  {
    id: 'w33-34',
    startWeek: 33,
    endWeek: 34,
    dateLabel: 'Mid-August',
    stage: 'Late summer',
    title: 'Last Summer Sowings',
    headline: 'The final round of quick crops before autumn. Everything sown after this fortnight is for spring.',
    dowding: {
      tasks: [
        'Last sowings of radish, rocket, mizuna, mustard, spinach',
        'Sow Japanese onions and overwintering varieties',
        'Plant out last lettuce for autumn cropping',
        'Harvest main garlic crop if not already done',
      ],
      technique: {
        title: 'Autumn Salad Under Cover',
        detail: 'Japanese mizuna, claytonia (winter purslane), lamb\'s lettuce, land cress — these cool-weather salads sown NOW will crop from October to April under a simple cloche or fleece tunnel. One tray of modules = winter salad.',
      },
      keyTip: 'Dowding: "The best salad of the year is December\'s, grown from an August sowing."',
    },
    fukuoka: {
      reflection: 'Late summer is Fukuoka\'s season of "watching the rice head". The work is done — observation, patience, trust in the soil you\'ve been building.',
      practice: 'Collect seed from bolted lettuce, coriander, rocket, calendula. Free seed AND guaranteed local adaptation — those plants survived your exact conditions.',
    },
    hessayon: {
      focus: 'Fruit pest watch. Codling moth on apples; wasps on plums. Hessayon: hang pheromone traps now to reduce next year\'s population.',
      reference: 'The Fruit Expert — pest calendar.',
    },
    featuredCrop: {
      emoji: '🥗',
      name: 'Winter Salad Mix',
      action: 'Sow mizuna, mibuna, rocket, winter purslane now for cropping Oct-April.',
    },
  },
  {
    id: 'w35-36',
    startWeek: 35,
    endWeek: 36,
    dateLabel: 'Early September',
    stage: 'Autumn turn',
    title: 'Green Manure Window',
    headline: 'Every bed cleared this fortnight should be sown with a green manure by the end of it.',
    dowding: {
      tasks: [
        'Broadcast sow crimson clover, field beans, or phacelia on cleared beds',
        'Plant out spring cabbage transplants 45cm apart',
        'Harvest, cure, and store winter squash and pumpkins',
        'Plant overwintering onion sets',
      ],
      technique: {
        title: 'Broadcasting Green Manure',
        detail: 'Scatter seed by hand at the recommended rate (check packet — typically 2-5g/m²). Rake lightly into compost surface. Do not cover heavily. Water if dry. Germinates in 7-14 days. Left in place all winter, cut-and-drop in March. This is Fukuoka-meets-Dowding in action.',
      },
      keyTip: 'Dowding: "Bare soil in winter is a wasted soil-building opportunity. Green manure is the cheapest investment you\'ll make."',
    },
    fukuoka: {
      reflection: 'This is the fortnight that most closely matches Fukuoka\'s one-straw vision: scatter seed, let it grow, cut it, leave it. No digging, no tilling, no fuss. It simply works.',
      practice: 'For the first time, trust a bed entirely to a green manure. No backup crop, no second-guessing. Observe what it does.',
    },
    hessayon: {
      focus: 'Lawn repair season. Hessayon: early September is the BEST time to sow new lawn or patch bald areas. Soil is warm, rain is reliable, competition from weeds is low.',
      reference: 'The Lawn Expert — autumn lawn renovation.',
    },
    featuredCrop: {
      emoji: '🌾',
      name: 'Crimson Clover',
      action: 'Sow on any cleared bed now. Crimson flowers in May; chop and drop before they go to seed.',
    },
  },

  // ── AUTUMN ────────────────────────────────────────────────────────────────
  {
    id: 'w37-38',
    startWeek: 37,
    endWeek: 38,
    dateLabel: 'Mid-September',
    stage: 'Early autumn',
    title: 'Autumn Sowings & Overwintering',
    headline: 'The last sowings of the year go in. After this, the garden winds down.',
    dowding: {
      tasks: [
        'Sow broad beans (Aquadulce Claudia) direct for overwintering',
        'Plant garlic cloves (earlier is better — Sep/Oct beats Nov)',
        'Lift and store maincrop potatoes on a dry day',
        'Continue clearing and green-manuring empty beds',
      ],
      technique: {
        title: 'Autumn-Sown Broad Beans',
        detail: 'Broad beans sown now crop 3-4 weeks earlier than spring-sown, and are largely immune to blackfly (which prefers younger growth). Sow direct at 20cm spacing, 5cm deep, in a sheltered bed. Hardy to -10°C in Surrey. Harvest in May.',
      },
      keyTip: 'Dowding: "Autumn-sown broad beans are a free meal in May."',
    },
    fukuoka: {
      reflection: 'Autumn arrives whether we are ready or not. The gardener\'s job is not to resist the season but to move with it.',
      practice: 'Save seeds from ONE standout plant — the earliest cropper, the latest to bolt, the tastiest tomato. Selection over generations builds a garden variety unique to your soil.',
    },
    hessayon: {
      focus: 'Tidy strawberry beds. Hessayon: remove old foliage, weeds, and runners; mulch with compost. Fruiting starts with autumn care.',
      reference: 'The Fruit Expert — strawberry maintenance.',
    },
    featuredCrop: {
      emoji: '🫘',
      name: 'Autumn Broad Beans',
      action: 'Sow direct now for a May harvest. Choose hardy varieties like Aquadulce Claudia.',
    },
  },
  {
    id: 'w39-40',
    startWeek: 39,
    endWeek: 40,
    dateLabel: 'Late September',
    stage: 'Early autumn',
    title: 'Bed Clearing Season',
    headline: 'Half the garden is still producing; the other half is ready to be cleared and composted.',
    dowding: {
      tasks: [
        'Clear spent tomato, bean, courgette plants to the compost heap',
        'Harvest and cure winter squash (need 2 weeks in sun to harden skin)',
        'Cover empty beds with compost mulch or green manure — never bare',
        'Continue picking autumn beans, chard, and salads',
      ],
      technique: {
        title: 'Curing Winter Squash',
        detail: 'Cut with 5cm stem attached. Lay in full sun for 10-14 days (indoors by window if wet) until skin is hard enough that fingernail will not mark it. Store at 12-15°C in a dry, airy place. Properly cured Crown Prince or Butternut keeps until April.',
      },
      keyTip: 'Dowding: "Curing is the difference between squash that rots in November and squash that feeds you in March."',
    },
    fukuoka: {
      reflection: 'The compost heap is the most important structure in the garden. It is where the cycle visibly completes.',
      practice: 'Turn the compost heap once this fortnight. Notice how much of last year\'s kitchen waste is now crumbly black soil.',
    },
    hessayon: {
      focus: 'Apple harvest. Hessayon test for ripeness: lift, twist gently, and if it comes away in your hand it\'s ready. Store sound fruit only — one rotten apple spoils the box.',
      reference: 'The Fruit Expert — apple storage chapter.',
    },
    featuredCrop: {
      emoji: '🎃',
      name: 'Winter Squash',
      action: 'Cut, cure in sun for 2 weeks, then store. One plant = 3-6 squashes = months of meals.',
    },
  },
  {
    id: 'w41-42',
    startWeek: 41,
    endWeek: 42,
    dateLabel: 'Mid-October',
    stage: 'Mid autumn',
    title: 'Compost Mulch Month',
    headline: 'The single most important soil-building action of the year: annual compost on all beds.',
    dowding: {
      tasks: [
        'Spread 2.5-5cm of well-rotted compost on every empty or finishing bed',
        'Harvest last tender crops before mid-October frost',
        'Protect GreenStalks and tender containers under cover or with fleece',
        'Plant garlic cloves if not already done',
      ],
      technique: {
        title: 'The Annual Compost Mulch',
        detail: 'Dowding\'s no-dig method rests on one action: 2.5cm of compost on every bed, every autumn. Worms incorporate it over winter. By spring, the bed is ready for the next crop with no digging, no rotavation, no further input. Budget ~30 litres per square metre annually.',
      },
      keyTip: 'Dowding: "If you do one thing a year for your garden, make it the October compost mulch."',
    },
    fukuoka: {
      reflection: 'Autumn mulch is the gardener\'s thank you to the soil — a gift given at the end of the season, repaid in the next.',
      practice: 'Add fallen deciduous leaves to a separate wire bin. In 18 months you\'ll have leaf mold — the best seed-starting compost money can\'t buy.',
    },
    hessayon: {
      focus: 'Lawn final feed (high-K autumn formula, low N). Hessayon: this toughens grass against winter frost and disease.',
      reference: 'The Lawn Expert — autumn feeding chapter.',
    },
    featuredCrop: {
      emoji: '🪱',
      name: 'The Soil Itself',
      action: 'Feed the soil, not the plants. Compost mulch now pays you back all next year.',
    },
  },
  {
    id: 'w43-44',
    startWeek: 43,
    endWeek: 44,
    dateLabel: 'Late October',
    stage: 'First frost',
    title: 'First Frost & Retreat',
    headline: 'Expect the first hard frost around October 20-25 in Surrey. The garden shifts to winter mode.',
    dowding: {
      tasks: [
        'Lift dahlia tubers if grown; store in barely-damp compost',
        'Cover winter salads with fleece or cloches',
        'Wheel fresh compost to any unmulched beds',
        'Harvest parsnips from now on (frost sweetens them)',
      ],
      technique: {
        title: 'Cloche-Growing Through Winter',
        detail: 'A simple polytunnel cloche (hoops + plastic) over a bed of winter salad adds ~3°C and keeps rain off. Dowding crops lettuce, spinach, rocket, and land cress all winter from October sowings. Harvest outer leaves; plants regrow under the cloche.',
      },
      keyTip: 'Dowding: "Under a cloche, your season never really ends."',
    },
    fukuoka: {
      reflection: 'First frost is the year\'s verdict. What survives teaches you next year\'s varieties.',
      practice: 'Walk the garden after the first frost and note which plants died overnight and which still look fresh. Buy more of what survived.',
    },
    hessayon: {
      focus: 'Bring tender container plants under cover (bay, rosemary in pots, cordyline). Hessayon: frost damage is cumulative — prevention is free, cure is expensive.',
      reference: 'The Container Expert — winter protection chart.',
    },
    featuredCrop: {
      emoji: '🥬',
      name: 'Parsnips',
      action: 'Start lifting after first frost. Sweetness peaks in November-December.',
    },
  },

  // ── EARLY WINTER ──────────────────────────────────────────────────────────
  {
    id: 'w45-46',
    startWeek: 45,
    endWeek: 46,
    dateLabel: 'Early November',
    stage: 'Early winter',
    title: 'Winter Protection',
    headline: 'The growing work is nearly done. Protecting and observing now.',
    dowding: {
      tasks: [
        'Apply remaining compost mulch to any exposed beds',
        'Final check on fleece and cloche covers before hard weather',
        'Plant bare-root fruit trees and bushes (now through March)',
        'Harvest stored crops: onions, garlic, winter squash for the kitchen',
      ],
      technique: {
        title: 'Bare-Root Planting Window',
        detail: 'November to March is the bare-root fruit planting window: cheaper than potted plants, better root development, easier to transport. Soak roots for an hour before planting. Plant to the original soil line. Mulch with compost, water weekly if dry.',
      },
      keyTip: 'Dowding: "A November-planted tree catches up with a March-planted one by its first summer."',
    },
    fukuoka: {
      reflection: 'November asks the gardener to trust. The work is done. The soil is covered. The worms are working. Your job now is to stop working.',
      practice: 'Do nothing in the garden for 48 hours. Read a gardening book instead. Let the compost do its work.',
    },
    hessayon: {
      focus: 'Clean and store seed trays, labels, and module trays for next year. Hessayon: dirty trays carry damping-off disease into next year\'s seedlings.',
      reference: 'The Vegetable & Herb Expert — hygiene and tool care.',
    },
    featuredCrop: {
      emoji: '🌳',
      name: 'Bare-Root Fruit',
      action: 'Order bare-root fruit trees now for November-March planting.',
    },
  },
  {
    id: 'w47-48',
    startWeek: 47,
    endWeek: 48,
    dateLabel: 'Late November',
    stage: 'Late autumn',
    title: 'Winter Workshop',
    headline: 'Inside jobs take over. Tools, planning, learning.',
    dowding: {
      tasks: [
        'Clean, sharpen, and oil all tools before storage',
        'Build or repair cold frames, compost bins, and supports',
        'Continue picking hardy salads under cloches',
        'Plant any remaining garlic (still OK through early December)',
      ],
      technique: {
        title: 'Tool Maintenance Routine',
        detail: 'Strip rust with steel wool. Wipe with linseed oil. Sharpen spade and hoe edges with a flat file (45° angle). Clean wooden handles with sandpaper, oil with linseed. A sharp spade halves digging effort — irrelevant for no-dig gardeners but still useful for planting holes.',
      },
      keyTip: 'Dowding: "Well-maintained tools last 30 years. Unmaintained tools last 3."',
    },
    fukuoka: {
      reflection: 'Fukuoka spent winters reading philosophy, writing, and making bamboo tools. The slow seasons are when the farmer thinks.',
      practice: 'Read 20 pages of one gardening book you\'ve been meaning to finish. Write one note in your journal about what the garden taught you this year.',
    },
    hessayon: {
      focus: 'Review fruit tree supports, ties, and stakes — before winter winds. Hessayon: one loose tie can girdle and kill a young tree overnight.',
      reference: 'The Fruit Expert — tree care basics.',
    },
    featuredCrop: {
      emoji: '🛠️',
      name: 'The Toolkit',
      action: 'Spend an afternoon on tool maintenance. Future-you will thank present-you.',
    },
  },
  {
    id: 'w49-50',
    startWeek: 49,
    endWeek: 50,
    dateLabel: 'Mid-December',
    stage: 'Deep winter',
    title: 'Deep Rest',
    headline: 'The garden is asleep. So is the gardener, mostly. Minor harvests continue.',
    dowding: {
      tasks: [
        'Harvest parsnips, leeks, kale, and Brussels sprouts as needed',
        'Pick winter salad from under cloches',
        'Check compost heap is covered and not soaking',
        'Buy or sharpen secateurs for January pruning',
      ],
      technique: {
        title: 'Harvesting Hardy Brassicas',
        detail: 'Brussels sprouts taste best after 2+ frosts — pick from the bottom of the stalk upward. Kale: pick outer leaves only, plants crop for 4+ months. Leeks: lift with a fork rather than pulling, otherwise stems snap in wet soil.',
      },
      keyTip: 'Dowding: "December kale, January leek, February sprout — the garden still feeds you if you let it."',
    },
    fukuoka: {
      reflection: 'Fukuoka: "The true culture of farming does not lie in the perfection of techniques, but in the perfection of the spirit." Winter is the spirit\'s season.',
      practice: 'Walk the frosted garden at sunrise once this fortnight. No phone, no agenda. Just look.',
    },
    hessayon: {
      focus: 'Bird care. Hessayon was keen on the gardener-bird partnership: keep feeders filled through December; birds return the favour in April by eating aphids.',
      reference: 'The Flower Expert — wildlife gardening section.',
    },
    featuredCrop: {
      emoji: '🥬',
      name: 'Winter Kale',
      action: 'Keep picking outer leaves — plant produces through to April.',
    },
  },
  {
    id: 'w51-52',
    startWeek: 51,
    endWeek: 53,
    dateLabel: 'Year\'s End',
    stage: 'Dormancy',
    title: 'Looking Back, Looking Forward',
    headline: 'The year closes. Next year\'s planning begins — softly, on paper.',
    dowding: {
      tasks: [
        'Review the year\'s harvest log: what worked, what failed, what you\'ll change',
        'Draft next year\'s seed list based on what you actually ate',
        'Collect fallen leaves for leaf mold bins',
        'Rest. The soil is working; you do not need to.',
      ],
      technique: {
        title: 'The Harvest Review',
        detail: 'Dowding keeps a notebook listing every sowing date, harvest weight, and variety. At year end he asks: which crops gave the most kg per m²? Which tasted best? Which failed? Next year\'s plan writes itself from the answers. You don\'t need a spreadsheet — a paper notebook works.',
      },
      keyTip: 'Dowding: "The garden you plant next year is a direct conversation with the garden you grew this year."',
    },
    fukuoka: {
      reflection: 'Fukuoka\'s closing thought: "I am not saying this is the best way; I am saying this is one way." Take from the masters what works for YOUR garden, this patch of Surrey clay, this family, this life.',
      practice: 'Write one sentence for each of the three experts: what did Dowding teach you this year, what did Fukuoka teach you, what did Hessayon teach you? Keep the note.',
    },
    hessayon: {
      focus: 'Order next year\'s reference copies. Hessayon\'s books are cheap second-hand and timeless — even the 1980s editions are still 90% relevant.',
      reference: 'The full Hessayon Expert series — particularly Vegetable & Herb, Container, and Lawn for a new garden.',
    },
    featuredCrop: {
      emoji: '📓',
      name: 'Your Notes',
      action: 'Review the year. Write the seed list. The best gardening of winter is gardening with a pen.',
    },
  },
];

// ── Picker: current window for a given date ────────────────────────────────
export function getCurrentWeeklyMethods(date: Date = new Date()): WeeklyExpertWindow {
  const week = getWeekOfYear(date);
  const found = WEEKLY_EXPERT_METHODS.find(
    (w) => week >= w.startWeek && week <= w.endWeek
  );
  if (found) return found;
  // Fallback for week 53 edge cases
  return WEEKLY_EXPERT_METHODS[WEEKLY_EXPERT_METHODS.length - 1];
}

// ── Next window (preview) ───────────────────────────────────────────────────
export function getNextWeeklyMethods(date: Date = new Date()): WeeklyExpertWindow {
  const current = getCurrentWeeklyMethods(date);
  const idx = WEEKLY_EXPERT_METHODS.indexOf(current);
  return WEEKLY_EXPERT_METHODS[(idx + 1) % WEEKLY_EXPERT_METHODS.length];
}
