// ═══════════════════════════════════════════════════════════════════════════
// UK Expert Per-Plant Knowledge
// ═══════════════════════════════════════════════════════════════════════════
//
// Structured growing knowledge calibrated to Surrey, UK (Walton-on-Thames,
// RHS H5, USDA 8b equivalent, heavy London clay soil). Sources: Monty Don
// (BBC Gardeners' World / Longmeadow), RHS Plant Finder + AGM awards,
// Joy Larkcom (Grow Your Own Vegetables / Salads for Small Gardens),
// James Wong (Homegrown Revolution / Grow for Flavour), Alys Fowler
// (The Edible Garden).
//
// This is intentionally SEPARATE from the existing `expert-knowledge.ts`
// module (Dowding/Fukuoka/Hessayon) so each expert tradition can evolve
// independently.
// ═══════════════════════════════════════════════════════════════════════════

export type UKExpertId = 'monty' | 'rhs' | 'larkcom' | 'wong' | 'fowler' | 'flowerdew' | 'richards' | 'hafferty';

export interface UKExpertProfile {
  id: UKExpertId;
  name: string;
  title: string;
  keyWork: string;
  applicability: string;
}

export const UK_EXPERTS: UKExpertProfile[] = [
  {
    id: 'monty',
    name: 'Monty Don',
    title: "BBC Gardeners' World, Longmeadow",
    keyWork: '"Down to Earth", "My Garden World", weekly Gardeners\' World',
    applicability:
      'Longmeadow is in Herefordshire — similar UK climate to Surrey but slightly wetter. His monthly jobs list is the canonical UK timing guide. Variety picks are tested in a real domestic garden, not trial plots.',
  },
  {
    id: 'rhs',
    name: 'Royal Horticultural Society',
    title: 'RHS Plant Finder + AGM (Award of Garden Merit)',
    keyWork: 'rhs.org.uk/plants, Wisley trial grounds (20 min from Walton-on-Thames)',
    applicability:
      'Wisley is the nearest RHS garden to Surrey — their trial data IS Surrey data. AGM awards are given only to varieties that perform reliably in UK conditions. The gold standard for variety selection.',
  },
  {
    id: 'larkcom',
    name: 'Joy Larkcom',
    title: 'Salad Queen',
    keyWork: '"Grow Your Own Vegetables", "Salads for Small Gardens"',
    applicability:
      'The UK authority on succession sowing and cut-and-come-again salad. Her exact succession intervals (days between sowings) are the most precise published for UK climate. Works especially well for GreenStalk top-tier salad rotations.',
  },
  {
    id: 'wong',
    name: 'James Wong',
    title: 'Ethnobotanist, RHS ambassador',
    keyWork: '"Homegrown Revolution", "RHS Grow for Flavour"',
    applicability:
      'Focuses on underused crops and flavour-maximising varieties that thrive in UK cool summers. Great for expanding beyond the obvious and discovering varieties with genuinely better flavour chemistry, not just bigger yields.',
  },
  {
    id: 'fowler',
    name: 'Alys Fowler',
    title: 'Small-space edibles',
    keyWork: '"The Edible Garden", "The Thrifty Forager"',
    applicability:
      'Container- and small-space-focused. Writes for gardens like yours: limited ground, some vertical space, mix of ornamental and edible. Her feed recipes and guild plantings for tight spaces directly inform GreenStalk strategy.',
  },
  {
    id: 'flowerdew',
    name: 'Bob Flowerdew',
    title: 'Organic pest & companion guru',
    keyWork: '"Bob Flowerdew\'s Organic Bible", "Complete Book of Companion Planting"',
    applicability:
      'The UK organic gardening authority. His companion planting pairs, organic pest deterrents, and fertility-building rotations are directly applicable. Especially useful for your clay soil — he advocates for heavy mulching and minimal disturbance, aligned with Dowding.',
  },
  {
    id: 'richards',
    name: 'Huw Richards',
    title: 'Modern no-dig, YouTube educator',
    keyWork: 'YouTube (800k+ subscribers), "Grow Food for Free", "Veg in One Bed"',
    applicability:
      'Contemporary no-dig practitioner who documents everything on camera. His "Veg in One Bed" concept maps directly to your raised bed and GreenStalk setup. Practical, budget-focused, and tested in a Welsh climate similar to Surrey for rainfall.',
  },
  {
    id: 'hafferty',
    name: 'Stephanie Hafferty',
    title: 'Harvest-to-kitchen, no-dig seasonal cook',
    keyWork: '"The No-Dig Home & Garden", co-authored with Charles Dowding',
    applicability:
      'Bridges growing and cooking — plans planting around what you actually want to eat, when. Her seasonal meal-planning approach ensures you grow the right quantities at the right times, avoiding glut waste. Works with Dowding, so aligned with no-dig principles.',
  },
];

// ─── Per-plant knowledge ───────────────────────────────────────────────────

export type ClaySoilPerformance =
  | 'loves-clay'
  | 'tolerates-clay'
  | 'dislikes-clay'
  | 'avoid-clay';

export type PollinatorValue = 'very-high' | 'high' | 'moderate' | 'low' | 'none';
export type GreenstalkTier = 'top' | 'middle' | 'bottom' | 'any';

export interface UKExpertVariety {
  name: string;
  expert: UKExpertId | 'AGM';
  reason: string;
  /** Optional direct-buy URL. If omitted, the UI generates a T&M search fallback. */
  buyUrl?: string;
  /** Source shop for the URL (for the chip label). */
  supplier?: 'Thompson & Morgan' | 'Chiltern Seeds' | 'Sarah Raven' | 'RHS' | 'DT Brown' | 'Marshalls' | 'Crocus';
}

export interface UKExpertTip {
  expert: UKExpertId;
  category:
    | 'variety'
    | 'sowing'
    | 'soil'
    | 'watering'
    | 'feeding'
    | 'pruning'
    | 'pests'
    | 'harvest'
    | 'succession'
    | 'container'
    | 'flavour';
  tip: string;
}

export interface UKExpertPlantKnowledge {
  slug: string;
  ukVarieties: UKExpertVariety[];
  tips: UKExpertTip[];
  claySoil?: {
    performance: ClaySoilPerformance;
    amendment?: string;
  };
  surreyNote?: string;
  pollinatorValue?: PollinatorValue;
  pollinatorNote?: string;
  greenstalkTier?: {
    tier: GreenstalkTier;
    reason: string;
  };
  successionDays?: number; // Joy Larkcom interval
}

// ─── Data ──────────────────────────────────────────────────────────────────
// Import batch 2 (68 additional plants covering all 8 experts). Merged into
// the single exported record below.

import { UK_EXPERT_KNOWLEDGE_BATCH2 } from './expert-uk-knowledge-batch2';

const UK_EXPERT_KNOWLEDGE_BATCH1: Record<string, UKExpertPlantKnowledge> = {
  'tomato-tumbling': {
    slug: 'tomato-tumbling',
    ukVarieties: [
      { name: 'Tumbling Tom Red / Yellow', expert: 'rhs', reason: 'Compact cascading habit — the best cherry tomato for hanging baskets and GreenStalk-style towers.' },
      { name: 'Sungold F1', expert: 'wong', reason: "James Wong's flavour pick in 'Homegrown Revolution' — highest sugar cherry in UK taste trials." },
      { name: 'Sweet Aperitif', expert: 'AGM', reason: 'RHS AGM — up to 500 super-sweet cherry fruits per plant from a single truss.' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Bury stems deep when planting out (up to the first true leaves) to force extra roots. Then remove side-shoots on cordon varieties and strip lower leaves once fruit sets for airflow.' },
      { expert: 'wong', category: 'flavour', tip: 'Spray weekly with dissolved soluble aspirin (½ tablet per litre). His Grow for Flavour research shows this boosts sugar by up to 150% and vitamin C by 50%. Also reduce watering sharply once fruit sets for concentrated flavour.' },
      { expert: 'fowler', category: 'container', tip: 'Tumbling types thrive in hanging baskets — rich compost, water twice daily in heat, liquid seaweed feed once flowers appear.' },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Raised bed or pot with added compost + grit. Clay holds moisture well for tomatoes but warms slowly.' },
    surreyNote: "Don't plant out until after mid-May — Thames Valley late frosts bite hard. Blight pressure high in wet Surrey Augusts, so pick blight-tolerant varieties if growing outdoors.",
    pollinatorValue: 'moderate',
    pollinatorNote: 'Self-pollinating, but bumblebees buzz-pollinate for better fruit set.',
    greenstalkTier: { tier: 'top', reason: 'Tumbling types cascade beautifully from the top tier, which also gets best sun for ripening and the first water pass.' },
  },

  'basil-sweet': {
    slug: 'basil-sweet',
    ukVarieties: [
      { name: 'Sweet Genovese', expert: 'rhs', reason: 'Classic large-leaf pesto type — most reliable in a UK summer.' },
      { name: 'Greek / Minimum', expert: 'wong', reason: 'Tiny dense bush form. Slower to bolt than sweet basil and delivers the highest flavour density per leaf of any culinary basil.' },
      { name: 'Thai Sita', expert: 'rhs', reason: 'Aniseed/spice profile, bolt-resistant. RHS plant finder pick for Asian cookery.' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: "Basil isn't Mediterranean — it's tropical Asian. Give it heat AND moisture (not the dry treatment you give rosemary). Start at ~20°C on a warm windowsill and pair with tomatoes on the same watering schedule." },
      { expert: 'wong', category: 'flavour', tip: 'Reduce watering to trigger a stress response — his flavour research shows mildly stressed basil produces dramatically more essential oils. Grow Greek basil for maximum flavour density.' },
      { expert: 'fowler', category: 'container', tip: 'Pots of 15cm+ only — basil has a deep taproot and sulks in shallow containers. South-facing windowsill or sunny patio, never an exposed outdoor bed.' },
    ],
    claySoil: { performance: 'dislikes-clay', amendment: 'Grow in pots or raised bed with 30% horticultural grit — needs free-draining compost.' },
    surreyNote: 'Outdoor basil in Surrey is borderline — night temps below 12°C stall growth. Keep a backup indoors even in July/August.',
    pollinatorValue: 'high',
    pollinatorNote: 'If allowed to flower, honeybees love basil blossom. Plant a few extras to run to flower.',
    greenstalkTier: { tier: 'top', reason: 'Needs maximum sun and warmth; the top tier dries faster which basil prefers over soggy feet.' },
    successionDays: 21,
  },

  'strawberry-everbearing': {
    slug: 'strawberry-everbearing',
    ukVarieties: [
      { name: 'Flamenco', expert: 'AGM', reason: 'RHS AGM everbearing — sweet fruit July to October, good mildew and verticillium resistance.' },
      { name: 'Mara des Bois', expert: 'wong', reason: "James Wong's repeated flavour recommendation — combines the intensity of wild alpines with commercial fruit size." },
      { name: 'Finesse', expert: 'AGM', reason: 'RHS AGM — heart-shaped fruits July to September, disease-resistant.' },
    ],
    tips: [
      { expert: 'monty', category: 'feeding', tip: 'Strawberries are greedy — plant in soil enriched with generous compost, space 30cm+ apart, and never replant in soil that has grown strawberries within 3 years (virus risk). Water weekly with rainwater through bud formation.' },
      { expert: 'rhs', category: 'harvest', tip: 'Remove early flowers on new plants in the first year to build strength. Net against birds as fruit ripens.' },
      { expert: 'fowler', category: 'container', tip: 'Perfect container plant — 20cm pots or strawberry planters. Top-dress with fresh compost each spring. Move pots off cold ground in winter to prevent waterlogging.' },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Raised bed or pots are ideal on London clay — prefer well-drained.' },
    surreyNote: 'Slug and vine weevil pressure high in Surrey. Use straw mulch (classic technique) to keep fruit clean and check pots annually for vine weevil grubs.',
    pollinatorValue: 'very-high',
    pollinatorNote: 'Early spring flowers are vital for emerging bumblebees.',
    greenstalkTier: { tier: 'any', reason: 'The flagship GreenStalk crop — distribute across tiers for staggered ripening as tier microclimates vary.' },
  },

  'courgette': {
    slug: 'courgette',
    ukVarieties: [
      { name: 'Defender F1', expert: 'AGM', reason: 'RHS AGM — British-bred, resistant to cucumber mosaic virus, heavy cropper, ideal for smaller plots.' },
      { name: 'Parador F1', expert: 'AGM', reason: 'RHS AGM yellow-fruited type — superb flavour and texture.' },
      { name: 'Tromboncino', expert: 'monty', reason: "Monty grows this climbing type at Longmeadow ('growing like organ pipes'). Better flavour and slug-resistant vs bush types." },
    ],
    tips: [
      { expert: 'monty', category: 'watering', tip: 'Moisture is everything — keep soil constantly just-moist with a thick compost mulch. Cut courgettes at 10cm while small to trigger more fruit. Consider climbing Tromboncino or Black Forest to save ground space.' },
      { expert: 'larkcom', category: 'succession', tip: 'One plant per household is usually enough — but sow a SECOND plant in early June to replace the first when it succumbs to powdery mildew in August.' },
      { expert: 'wong', category: 'flavour', tip: "Grow yellow or striped varieties like 'Parador' or 'Tromboncino' — they have measurably higher carotenoid content than dark green types." },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Thrives on rich, moisture-retentive clay amended with compost.' },
    surreyNote: "Powdery mildew is inevitable by late August in Surrey — accept it and remove affected leaves. Slug pressure on seedlings is severe; use beer traps or wool pellets at planting.",
    pollinatorValue: 'very-high',
    pollinatorNote: 'Large open yellow flowers fed on by bees. Hand-pollinate in dull weather for fruit set.',
    greenstalkTier: { tier: 'bottom', reason: 'Far too large and thirsty for a vertical tower — grow in ground or a large pot nearby.' },
  },

  'runner-bean': {
    slug: 'runner-bean',
    ukVarieties: [
      { name: 'Wisley Magic', expert: 'AGM', reason: 'RHS AGM — developed at RHS Wisley just south of Walton-on-Thames. Literally the optimal Surrey variety. Long, straight, stringless pods.' },
      { name: 'Firestorm', expert: 'AGM', reason: 'RHS AGM — self-fertile, sets pods in hot/dry weather when others fail.' },
      { name: 'Scarlet Emperor', expert: 'monty', reason: 'Monty-era heritage classic — centuries of UK lineage, excellent flavour.' },
      { name: 'Moonlight', expert: 'AGM', reason: 'RHS AGM — self-pollinating white-flowered, reliable in poor weather.' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Build a hazel or bamboo wigwam. Sow indoors in April in toilet-roll tubes. Plant out late May when soil feels warm to the touch. Water generously at the root zone once flowers appear — dry soil drops flowers.' },
      { expert: 'rhs', category: 'harvest', tip: 'Mulch heavily to retain moisture, and pick every other day once cropping starts. Let a single pod mature and the plant stops producing.' },
      { expert: 'larkcom', category: 'harvest', tip: 'A single sowing yields until first frost — no succession needed. Pinch growing tips at the top of the support to redirect energy into pods.' },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Dig a trench with compost/newspaper beneath the row to retain water — deep clay holds the moisture runner beans need.' },
    surreyNote: "'Wisley Magic' was selected at RHS Wisley, 20 min from your house — literally bred for Thames Valley conditions. Sow after 10 May locally.",
    pollinatorValue: 'very-high',
    pollinatorNote: "Bumblebees particularly love the red flowers of 'Scarlet Emperor'.",
    greenstalkTier: { tier: 'bottom', reason: 'Far too tall for a tower — needs a full-height wigwam on the ground.' },
  },

  'dwarf-french-bean': {
    slug: 'dwarf-french-bean',
    ukVarieties: [
      { name: 'Safari', expert: 'AGM', reason: 'RHS AGM — reliable fine-pod cropper, slim tender pods.' },
      { name: 'Purple Teepee', expert: 'monty', reason: 'Monty pick — purple-podded dwarf, easy to spot at harvest. Pods turn green when cooked.' },
      { name: 'Borlotto Lingua di Fuoco Nano', expert: 'monty', reason: "Monty's dwarf borlotto — dual-purpose fresh or dried." },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: "Don't sow until the soil feels warm to your skin — French beans sulk below 10°C. Space 15cm apart in rows 30-45cm apart. Water generously once pods form." },
      { expert: 'larkcom', category: 'succession', tip: 'Sow small batches every 3-4 weeks from May to early July for continuous fresh pods through October.' },
      { expert: 'wong', category: 'flavour', tip: "Try yellow wax varieties like 'Sonesta' — his research shows yellow pods have higher sugar than green, and they're rarer in shops." },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Add grit on heavy clay and delay sowing until June — needs warmed, well-drained soil.' },
    surreyNote: 'Direct sow no earlier than late May in Surrey. Slug protection is critical at emergence.',
    pollinatorValue: 'moderate',
    pollinatorNote: 'Bees visit flowers but plants are self-fertile.',
    greenstalkTier: { tier: 'middle', reason: 'Compact habit suits the middle tier — avoid the top (tower too shallow for taproot).' },
    successionDays: 24,
  },

  'lettuce': {
    slug: 'lettuce',
    ukVarieties: [
      { name: 'Little Gem', expert: 'larkcom', reason: "Larkcom calls it 'probably the best flavoured of all lettuces'. Sow year-round, compact, holds well." },
      { name: 'Mottistone / Nymans / Pentared', expert: 'AGM', reason: 'RHS AGM lettuce trial winners — varied colours and forms that all perform in UK conditions.' },
      { name: 'Bijou', expert: 'AGM', reason: 'RHS AGM — red Batavian, slow to bolt even in heat.' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Sow thinly in modules rather than direct, then transplant out at 4-5 leaves. Reduces slug loss and gives neat spacing. Water in the morning, never the evening, to reduce fungal issues.' },
      { expert: 'larkcom', category: 'succession', tip: 'Sow a small batch every 2 weeks in spring and autumn, every week in warm summer weather. Each cut-and-come-again sowing yields 3-4 cuts before exhaustion.' },
      { expert: 'wong', category: 'flavour', tip: 'Red oakleaf types have 3-5× more antioxidants than green, and more complex flavour. Anthocyanin pigment is the reason.' },
      { expert: 'fowler', category: 'container', tip: 'The perfect container crop — shallow 15cm pots, cut-and-come-again. Pair with flowers for an aesthetic edible container.' },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Shallow roots fine on clay — pots or raised beds preferred for drainage.' },
    surreyNote: "Summer lettuce in Surrey bolts fast in July heat — use afternoon shade from taller crops or net with shade cloth. Heat-tolerant varieties like 'Jack Ice' or 'Sierra' help.",
    pollinatorValue: 'low',
    greenstalkTier: { tier: 'any', reason: 'Cut-and-come-again lettuce is ideal for GreenStalks. In summer use middle/bottom tiers for cooler shadier conditions to slow bolting.' },
    successionDays: 10,
  },

  'radish': {
    slug: 'radish',
    ukVarieties: [
      { name: 'Rudi', expert: 'AGM', reason: 'RHS AGM — fast-growing, excellent flavour, crisp globe roots.' },
      { name: 'French Breakfast 3', expert: 'rhs', reason: 'Classic long red-and-white — mild flavour, reliable.' },
      { name: 'Cherry Belle', expert: 'AGM', reason: 'RHS AGM — round, reliable, quick (25 days).' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: "Radishes are the impatient gardener's crop — sow a pinch every 2 weeks in moist soil, thin aggressively, and harvest young before they turn woody or split." },
      { expert: 'larkcom', category: 'succession', tip: 'The fastest succession crop in the garden — sow every 10-14 days from early spring into autumn. Try mooli and Spanish Black for winter radish succession.' },
      { expert: 'wong', category: 'flavour', tip: "Grow watermelon radish 'Mantanghong' or black Spanish — Wong champions heirloom winter radishes for unusual colours and flavours not found in shops." },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Short-rooted globe types fine on clay. Long-rooted mooli needs a deep raised bed.' },
    surreyNote: 'Flea beetle can pit leaves on outdoor radishes April-June in Surrey — fleece seedlings to protect.',
    pollinatorValue: 'moderate',
    pollinatorNote: 'Excellent for hoverflies if allowed to flower.',
    greenstalkTier: { tier: 'any', reason: 'Small footprint suits any tier — rotate through quickly for constant harvest.' },
    successionDays: 12,
  },

  'rocket': {
    slug: 'rocket',
    ukVarieties: [
      { name: 'Wild Rocket (Diplotaxis tenuifolia)', expert: 'rhs', reason: 'Perennial, stronger peppery flavour, slower to bolt than salad rocket.' },
      { name: 'Salad Rocket (Eruca sativa)', expert: 'larkcom', reason: "Annual, faster, milder — classic cut-and-come-again. Core Larkcom 'salad mesclun' ingredient." },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Sow wild rocket in September for autumn/winter crops under cloches — it is much better cool-season than summer, when it bolts and turns bitter.' },
      { expert: 'larkcom', category: 'succession', tip: 'Sow every 2-3 weeks spring and autumn as cut-and-come-again. Mixed with lettuce and mizuna for salad mesclun.' },
      { expert: 'wong', category: 'flavour', tip: 'Try sylvetta wild rocket for intensely peppery, restaurant-style leaves at a fraction of shop cost.' },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Fine on clay if not waterlogged.' },
    surreyNote: 'Flea beetle destroys summer rocket in Surrey — grow spring and autumn only, or use insect mesh May-August.',
    pollinatorValue: 'moderate',
    pollinatorNote: 'White flowers good for hoverflies if bolted plants are left in situ.',
    greenstalkTier: { tier: 'middle', reason: 'The cooler middle/lower tier slows bolting in summer.' },
    successionDays: 17,
  },

  'kale': {
    slug: 'kale',
    ukVarieties: [
      { name: 'Nero di Toscana (Cavolo Nero)', expert: 'AGM', reason: 'RHS AGM — bred for British climate, dark crinkled leaves. Wong notes highest glucosinolate content of any brassica.' },
      { name: 'Redbor', expert: 'AGM', reason: 'RHS AGM — purple curly kale, stunning in the garden as well as the kitchen.' },
      { name: 'Reflex', expert: 'AGM', reason: 'RHS AGM — the best curly green kale.' },
      { name: 'Red Russian', expert: 'larkcom', reason: "Larkcom favourite for salad-leaf use — one of the best baby-leaf kales." },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Sow kale in modules in May/June, plant out in July into firm ground that has NOT been recently dug — kale hates loose soil and will blow over. Earth up stems as they grow.' },
      { expert: 'rhs', category: 'harvest', tip: 'Kale improves in flavour after first frost (starch-to-sugar conversion). Wait until after a cold snap to harvest.' },
      { expert: 'larkcom', category: 'succession', tip: 'Sow as salad kale (baby leaves) every 3-4 weeks for cut-and-come-again. Red Russian and Pentland Brig particularly good young.' },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Brassicas thrive on clay. Lime if pH is below 6.5 to prevent clubroot.' },
    surreyNote: 'Cabbage whitefly is endemic in Surrey from July — use fine mesh or fleece from planting until October. Pigeons will strip plants in winter, net accordingly.',
    pollinatorValue: 'high',
    pollinatorNote: 'Overwintered plants allowed to flower in spring are early bee food.',
    greenstalkTier: { tier: 'middle', reason: 'Dwarf kale works in the middle tier; full-size types need ground.' },
    successionDays: 28,
  },

  'dwarf-sweet-pea': {
    slug: 'dwarf-sweet-pea',
    ukVarieties: [
      { name: 'Matucana', expert: 'AGM', reason: 'RHS AGM — powerful heritage fragrance, bi-colour maroon/violet.' },
      { name: 'Cupani', expert: 'AGM', reason: 'RHS AGM — closest to original 1699 wild Sicilian, strongest scent of any modern cultivar.' },
      { name: 'Cupid (dwarf)', expert: 'fowler', reason: "Fowler's container pick — true dwarf form for hanging baskets and window boxes." },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Sow in autumn (October) or January for strongest plants. Plant out mid-April in the south, 2-3 plants per support. Cut flowers long and remove seed pods immediately — pod formation stops flowering.' },
      { expert: 'rhs', category: 'soil', tip: 'Enrich soil with a deep manure trench before planting. Provide tall support (hazel or canes) and tie in regularly. Water generously at the base.' },
      { expert: 'fowler', category: 'container', tip: 'Use dwarf types like Cupid or Pink Cupid for hanging baskets and window boxes. Standard sweet peas need a tripod in a deep pot.' },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Rich moisture-retentive clay is ideal. Dig a deep compost trench before sowing.' },
    surreyNote: 'Plant out mid-to-late April after last frost. Slug protection essential at transplant.',
    pollinatorValue: 'high',
    pollinatorNote: 'Highly scented heritage varieties draw bumblebees — modern Spencer types are less scented and less pollinator-friendly.',
    greenstalkTier: { tier: 'bottom', reason: 'Climbing habit needs a full-height wigwam, not a tower.' },
  },

  'nasturtium': {
    slug: 'nasturtium',
    ukVarieties: [
      { name: 'Empress of India', expert: 'AGM', reason: 'RHS AGM — crimson flowers, dark foliage, compact habit.' },
      { name: 'Alaska Mixed', expert: 'AGM', reason: 'RHS AGM — variegated cream/green leaves, mixed flower colours.' },
      { name: 'Tom Thumb series', expert: 'rhs', reason: 'Dwarf form for containers and edging.' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Sow direct outdoors late April to May — nasturtiums hate root disturbance. Too-rich soil produces all leaves and no flowers, so sow in POOR soil for best blooms.' },
      { expert: 'rhs', category: 'pests', tip: 'Excellent sacrificial trap crop for cabbage whites and blackfly — plant near brassicas and beans to draw pests away. Leaves, flowers, and unripe seed pods (pickled as "capers") are all edible.' },
      { expert: 'fowler', category: 'container', tip: "Trailing types cascade from hanging baskets and window boxes. Fowler's ultimate 'pretty and edible' container plant — thrives on neglect." },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Too-rich clay produces leaves at the expense of flowers — keep poor for blooms.' },
    surreyNote: 'Blackfly colonies appear July-August in Surrey — use as an aphid trap away from beans. Hose off or leave for ladybirds.',
    pollinatorValue: 'very-high',
    pollinatorNote: 'Bumblebees and long-tongued bees love nasturtiums. Also a hoverfly magnet.',
    greenstalkTier: { tier: 'top', reason: 'Trailing habit cascades dramatically from the top tier.' },
  },

  'marigold': {
    slug: 'marigold',
    ukVarieties: [
      { name: 'Naughty Marietta', expert: 'AGM', reason: 'RHS AGM — single yellow with maroon blotch. Single form = pollinator-friendly.' },
      { name: 'Disco series', expert: 'AGM', reason: 'RHS AGM — single flowers, far better for bees than the double pompon types.' },
      { name: 'Cinnabar', expert: 'AGM', reason: 'RHS AGM — tall single French type.' },
    ],
    tips: [
      { expert: 'monty', category: 'pests', tip: 'Sow in modules April, plant out after last frost among tomatoes and beans as companion — deters whitefly and nematodes from brassicas. Deadhead regularly to keep flowering into October.' },
      { expert: 'rhs', category: 'pests', tip: 'French marigold (Tagetes patula) is the most useful companion plant — scent deters some insects, but requires CLOSE planting (within 30cm of the target crop) to be effective.' },
      { expert: 'fowler', category: 'container', tip: 'Perfect edge-of-pot companion for tomatoes — tuck around the base of container tomatoes to deter whitefly.' },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Undemanding — does not mind poor soil.' },
    surreyNote: 'Slug pressure on seedlings is high — plant out when plants are 10cm+ with protection.',
    pollinatorValue: 'high',
    pollinatorNote: 'CHOOSE SINGLE-FLOWER VARIETIES — double-flowered pompon types are useless for pollinators.',
    greenstalkTier: { tier: 'top', reason: 'Pairs with tomatoes in the top tier as a natural aphid deterrent.' },
  },

  'chives': {
    slug: 'chives',
    ukVarieties: [
      { name: 'Allium schoenoprasum (species)', expert: 'AGM', reason: 'RHS AGM — the classic, very hardy perennial.' },
      { name: 'Forescate', expert: 'AGM', reason: 'RHS AGM — deeper pink/mauve flowers, stronger ornamental value.' },
    ],
    tips: [
      { expert: 'monty', category: 'pruning', tip: 'Divide every 3 years — lift in early spring, split clumps into 3-4 pieces, replant. Cut hard back after flowering to trigger fresh tender leaves.' },
      { expert: 'larkcom', category: 'harvest', tip: 'Continuous harvest from April to October — cut individual stems from the OUTSIDE of the clump, not across the top, for continuous regrowth.' },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Thrives on moisture-retentive clay — just add compost annually.' },
    surreyNote: 'Reliably hardy through Surrey winters. One of the very first herbs to emerge in February.',
    pollinatorValue: 'very-high',
    pollinatorNote: 'Purple flowers in May/June are a honeybee and solitary-bee magnet.',
    greenstalkTier: { tier: 'any', reason: 'Compact root ball suits any tier. Pairs beautifully with strawberries (mutual companion benefits).' },
  },

  'mint': {
    slug: 'mint',
    ukVarieties: [
      { name: 'Tashkent (spearmint)', expert: 'AGM', reason: 'RHS AGM — strongest culinary mint, large leaves.' },
      { name: 'Moroccan spearmint', expert: 'rhs', reason: 'Classic tea mint — milder and aromatic.' },
      { name: 'Chocolate mint', expert: 'wong', reason: 'Genuine chocolate-mint flavour — Wong champions unusual mints for dessert use and flavour exploration.' },
    ],
    tips: [
      { expert: 'monty', category: 'container', tip: "NEVER plant mint in open ground — it is a thug. Always plant in a pot (sunk into the bed is fine, but keep it contained). Divide and refresh compost every spring for vigorous growth." },
      { expert: 'rhs', category: 'container', tip: 'Choose your species carefully — spearmint for cooking, peppermint for tea. Plant in containers to restrain running roots.' },
      { expert: 'fowler', category: 'container', tip: '25cm+ pot, refresh top inch of compost each spring. Repot every 2 years into fresh compost.' },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Would rampage on clay if unrestrained — ALWAYS containerise.' },
    surreyNote: 'Hardy through Surrey winters — dies back, then re-emerges vigorously in April.',
    pollinatorValue: 'high',
    pollinatorNote: 'Allow some stems to flower — bees and hoverflies love mint blossom.',
    greenstalkTier: { tier: 'middle', reason: 'Isolates running roots from neighbours — prevents it invading other pockets.' },
  },

  'thyme': {
    slug: 'thyme',
    ukVarieties: [
      { name: 'Silver Posie', expert: 'AGM', reason: 'RHS AGM — ornamental variegated culinary thyme, fully hardy.' },
      { name: 'Thymus vulgaris (common thyme)', expert: 'rhs', reason: 'The classic culinary species.' },
      { name: "Archer's Gold (lemon thyme)", expert: 'AGM', reason: 'RHS AGM — citrus flavour with golden foliage.' },
    ],
    tips: [
      { expert: 'monty', category: 'soil', tip: 'The key to Mediterranean herbs is drainage — mix horticultural grit 50/50 with peat-free compost in pot plantings. Full sun and poor soil = best flavour.' },
      { expert: 'rhs', category: 'pruning', tip: 'Hard-prune after flowering to maintain shape. Replace plants every 3-4 years as they become woody.' },
      { expert: 'wong', category: 'flavour', tip: 'Creeping thymes release more aromatic oils when walked on — plant them in pathways for sensory gardens.' },
    ],
    claySoil: { performance: 'dislikes-clay', amendment: 'Grow in pots or raised bed with 30% grit — needs sharp drainage or winter wet rots the crown.' },
    surreyNote: 'London clay will rot thyme in winter. Essential to plant in a raised bed or pot with extra drainage in Surrey.',
    pollinatorValue: 'very-high',
    pollinatorNote: 'June flowers are one of the best pollinator plants — honey from thyme-rich areas is premium.',
    greenstalkTier: { tier: 'top', reason: 'Drier conditions at the top tier suit thyme perfectly.' },
  },

  'rosemary': {
    slug: 'rosemary',
    ukVarieties: [
      { name: "Miss Jessopp's Upright", expert: 'AGM', reason: 'RHS AGM — upright habit, reliably hardy, classic culinary form.' },
      { name: 'Prostratus (prostrate)', expert: 'monty', reason: "Monty grows this at Longmeadow — 'likes to grow sideways'. Ideal trailing form for pot edges." },
      { name: 'Tuscan Blue', expert: 'rhs', reason: 'Deep blue flowers, strong upright growth.' },
    ],
    tips: [
      { expert: 'monty', category: 'pruning', tip: "Plant prostrate rosemary at the edge of your pot so it can trail over. Hard-prune after flowering to prevent legginess. Full sun and grit-amended compost are non-negotiable." },
      { expert: 'rhs', category: 'pests', tip: 'Rosemary beetle (Chrysolina americana) is endemic in Surrey since the 2000s — metallic stripy beetles strip foliage. Pick off by hand.' },
      { expert: 'fowler', category: 'container', tip: '30cm+ terracotta pot (breathes better than plastic) with 30% grit mix. Bring under cover in severe wet weather to prevent root rot.' },
    ],
    claySoil: { performance: 'dislikes-clay', amendment: 'Wet clay in winter kills rosemary — essential to plant in raised bed or pot with drainage.' },
    surreyNote: 'Rosemary beetle is endemic in Surrey — check plants weekly April-October and hand-pick the metallic stripy adults.',
    pollinatorValue: 'very-high',
    pollinatorNote: 'Very early flowers (March-April) are a critical food source for emerging bumblebees.',
    greenstalkTier: { tier: 'bottom', reason: 'Can outgrow the tower — a permanent shrub is better in ground or a large pot.' },
  },

  'parsley': {
    slug: 'parsley',
    ukVarieties: [
      { name: 'Champion Moss Curled', expert: 'AGM', reason: 'RHS AGM — tight curly classic.' },
      { name: 'Italian Giant (flat-leaf)', expert: 'rhs', reason: 'Better flavour for cooking than curly types.' },
      { name: 'Envy', expert: 'AGM', reason: 'RHS AGM — compact curled, slow to bolt.' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Parsley seed is notoriously slow to germinate (3+ weeks) — soak seeds in warm water overnight before sowing, and keep soil constantly moist through germination.' },
      { expert: 'larkcom', category: 'succession', tip: 'Two sowings per year — March for summer supply, July for autumn/winter/early spring. Parsley will overwinter in Surrey with slight protection.' },
      { expert: 'fowler', category: 'container', tip: 'Deep pots only — parsley has a long taproot. 25cm+ depth minimum. Grows well on a shaded doorstep in summer.' },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Needs moisture-retentive soil — clay is fine with compost addition.' },
    surreyNote: 'Carrot fly will attack parsley (same family) — use fleece in May/June. Usually overwinters outdoors in Surrey without protection.',
    pollinatorValue: 'high',
    pollinatorNote: 'Flat yellow-green umbels in year 2 are excellent for hoverflies and parasitic wasps (aphid predators).',
    greenstalkTier: { tier: 'middle', reason: 'Deep taproot prefers the middle-tier pocket depth.' },
    successionDays: 60,
  },

  'oregano': {
    slug: 'oregano',
    ukVarieties: [
      { name: "Origanum vulgare 'Aureum' (golden oregano)", expert: 'AGM', reason: 'RHS AGM — golden foliage, full-flavoured culinary type.' },
      { name: 'Greek oregano (O. vulgare hirtum)', expert: 'rhs', reason: 'Strongest flavour of any culinary type.' },
      { name: "'Kent Beauty'", expert: 'AGM', reason: 'RHS AGM — ornamental not culinary, but one of the best pollinator oreganos.' },
    ],
    tips: [
      { expert: 'monty', category: 'soil', tip: 'Mediterranean conditions needed — full sun, poor free-draining soil, no winter wet. Grow in a gritty pot alongside rosemary, sage, thyme.' },
      { expert: 'rhs', category: 'pruning', tip: 'Hardy perennial in most UK regions. Hard-prune after flowering to maintain shape.' },
    ],
    claySoil: { performance: 'dislikes-clay', amendment: 'Pot or raised bed with grit — needs sharp drainage.' },
    surreyNote: 'Hardy in Surrey but hates wet winter clay — plant in pot or elevated raised bed with added grit.',
    pollinatorValue: 'very-high',
    pollinatorNote: 'July/August flowers are magnets for bees, butterflies, and hoverflies. Arguably one of the best pollinator herbs of all.',
    greenstalkTier: { tier: 'top', reason: 'Drier top tier suits the Mediterranean habit.' },
  },

  'pea': {
    slug: 'pea',
    ukVarieties: [
      { name: 'Hurst Green Shaft', expert: 'AGM', reason: 'RHS AGM — classic podding pea, heavy cropper, exhibition-quality.' },
      { name: 'Kelvedon Wonder', expert: 'AGM', reason: 'RHS AGM — early dwarf, good for succession sowing.' },
      { name: 'Sugar Ann (sugar snap)', expert: 'AGM', reason: 'RHS AGM — whole-pod edible, no stringing needed.' },
      { name: 'Shiraz (purple-podded)', expert: 'wong', reason: "Wong's flavour pick — higher anthocyanin content and visual appeal over green pods." },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Soak pea seeds overnight before sowing to accelerate germination. Sow in a double row 15cm apart with hazel pea sticks for support. Protect from pigeons with netting from day one.' },
      { expert: 'rhs', category: 'sowing', tip: 'Soil must be 10°C+ for germination. Sow direct March-June. Watch for pea moth June-August.' },
      { expert: 'larkcom', category: 'succession', tip: 'Sow every 3 weeks from March to early July for continuous supply. Intercrop early peas with later sowings for bed efficiency.' },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Rich clay holds moisture peas need. Dig a compost trench beneath the row.' },
    surreyNote: 'Mouse damage to pea seeds is common in Surrey — start in guttering indoors then slide out when germinated.',
    pollinatorValue: 'moderate',
    pollinatorNote: 'Self-fertile, but bees visit flowers.',
    greenstalkTier: { tier: 'bottom', reason: 'Needs support height the tower does not provide.' },
    successionDays: 21,
  },

  'cucumber': {
    slug: 'cucumber',
    ukVarieties: [
      { name: 'Marketmore', expert: 'AGM', reason: 'RHS AGM — reliable outdoor ridge cucumber, mildew-resistant.' },
      { name: 'Burpless Tasty Green F1', expert: 'AGM', reason: 'RHS AGM — outdoor type, long smooth fruits.' },
      { name: 'La Diva F1', expert: 'AGM', reason: 'RHS AGM — all-female, no bitterness.' },
      { name: 'Cucamelon (Melothria scabra)', expert: 'wong', reason: "Wong strongly recommends in 'Homegrown Revolution' — marble-sized grape-flavoured 'mouse melons'. Exceptionally easy in UK, unique market-gap crop." },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Separate indoor (all-female greenhouse types) from outdoor ridge types — never mix, because pollinated greenhouse fruits become bitter. Pinch out main stem at roof height and train side shoots.' },
      { expert: 'rhs', category: 'watering', tip: 'Keep evenly watered to prevent bitterness. Remove male flowers from F1 all-female types. Outdoor varieties need a warm sheltered spot.' },
      { expert: 'fowler', category: 'container', tip: 'Trailing cucumbers work in 40cm pots on a balcony with a cane tripod — use compact varieties like Bush Champion.' },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Fine on enriched clay — needs consistent moisture.' },
    surreyNote: 'Outdoor cucumbers in Surrey are borderline — plant ONLY in a south-facing sheltered spot after 1 June. Greenhouse or polytunnel is more reliable.',
    pollinatorValue: 'high',
    pollinatorNote: 'Bees for open-pollinated varieties. F1 all-female types do not need pollinators.',
    greenstalkTier: { tier: 'middle', reason: 'Trailing/climbing but compact varieties work with tower support. Larger types are better in the ground.' },
  },

  'pepper-chilli': {
    slug: 'pepper-chilli',
    ukVarieties: [
      { name: 'Apache F1', expert: 'AGM', reason: 'RHS AGM — compact chilli for pots, medium heat, heavy cropper.' },
      { name: 'Hungarian Hot Wax', expert: 'AGM', reason: 'RHS AGM — reliable outdoor chilli in UK summers.' },
      { name: 'Trinidad Perfume', expert: 'wong', reason: "Wong's Grow for Flavour pick — complex non-heat flavour you cannot buy." },
      { name: 'Aji Limon (Lemon Drop)', expert: 'wong', reason: "Wong's flavour pick — lemony citrus note with heat." },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Chillies need a long growing season — sow indoors February/March, pot on regularly, and keep in greenhouse or sunny windowsill until June. Pinch out growing tip at 20cm for a bushy habit.' },
      { expert: 'rhs', category: 'feeding', tip: 'Best in greenhouse/polytunnel in UK. Outdoors only in warm sheltered sites once nights are reliably above 12°C. Feed weekly with tomato food once flowering.' },
      { expert: 'wong', category: 'flavour', tip: 'Double the firepower through careful water stress — drop watering sharply once fruit sets. The plant concentrates capsaicin in response.' },
      { expert: 'fowler', category: 'container', tip: 'Perfect container crops — 25cm pots. Bring indoors in September to ripen remaining fruits. Very ornamental.' },
    ],
    claySoil: { performance: 'avoid-clay', amendment: 'Grow in pots of free-draining compost instead.' },
    surreyNote: 'In Surrey, chillies reliably ripen only under glass or in a south-facing porch — outdoor attempts often fail to ripen by first frost.',
    pollinatorValue: 'moderate',
    pollinatorNote: 'Self-fertile — tap flowers or shake plants to aid pollination in greenhouse.',
    greenstalkTier: { tier: 'top', reason: 'Compact chilli varieties thrive in top tier with maximum heat and sun.' },
  },

  'perpetual-spinach': {
    slug: 'perpetual-spinach',
    ukVarieties: [
      { name: 'Perpetual Spinach / Spinach Beet (Beta vulgaris cicla)', expert: 'larkcom', reason: "Larkcom champion crop — not technically spinach, but reliable year-round leafy that doesn't bolt in summer heat." },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Sow in April and July for year-round leaves. Unlike true spinach, perpetual spinach does not bolt in summer heat — Surrey\'s most reliable leafy green.' },
      { expert: 'larkcom', category: 'succession', tip: 'Two sowings (April and July) cover 12 months. Cut outer leaves weekly and it keeps producing through winter into spring.' },
      { expert: 'fowler', category: 'container', tip: 'Perfect container leafy — 30cm deep pot, single plant yields for months.' },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Rich moisture-retentive clay is ideal.' },
    surreyNote: 'Overwinters reliably in Surrey — late summer sowing gives spring leaves when nothing else is ready (the "hungry gap").',
    pollinatorValue: 'low',
    greenstalkTier: { tier: 'middle', reason: 'Deep roots prefer the middle tier.' },
  },

  'swiss-chard': {
    slug: 'swiss-chard',
    ukVarieties: [
      { name: 'Lucullus (Leaf Beet)', expert: 'AGM', reason: 'RHS AGM — white-stemmed, prolific, classic culinary chard.' },
      { name: 'Bright Lights', expert: 'wong', reason: "Wong's pick — anthocyanin content in coloured stems delivers nutrition plain green chard lacks. Visual value too." },
      { name: 'Fordhook Giant', expert: 'AGM', reason: 'RHS AGM — dark glossy leaves, heavy cropper.' },
    ],
    tips: [
      { expert: 'monty', category: 'harvest', tip: 'Treat like perpetual spinach — harvest outer leaves, never strip whole plant. Spring and late-summer sowings give cover almost all year in Surrey.' },
      { expert: 'larkcom', category: 'succession', tip: 'Two sowings (April and July) supply year-round. Pinching off flowering stems extends productive life of spring sowing into autumn.' },
      { expert: 'fowler', category: 'container', tip: "'Bright Lights' is ornamental enough for flower borders and large decorative containers." },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Rich clay gives bigger leaves and longer productive life.' },
    surreyNote: 'Reliably overwinters in Surrey — very valuable for March "hungry gap" leaves when shops are bare of fresh greens.',
    pollinatorValue: 'low',
    greenstalkTier: { tier: 'middle', reason: 'Large leaf span needs middle-tier space.' },
  },

  'beetroot': {
    slug: 'beetroot',
    ukVarieties: [
      { name: 'Boltardy', expert: 'AGM', reason: 'RHS AGM — the UK beetroot standard, resists bolting, reliable.' },
      { name: 'Pablo F1', expert: 'AGM', reason: 'RHS AGM — smooth round, excellent baby-beet form, sweet.' },
      { name: 'Chioggia', expert: 'wong', reason: "Wong's flavour favourite — candy-striped pink/white flesh, unique talking point you never see in shops." },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Soak seeds overnight to speed germination. Sow in short rows every 3 weeks, thin seedlings to 10cm — each "seed" is actually a cluster so you get multiples per station.' },
      { expert: 'rhs', category: 'soil', tip: 'In heavy clay, warm soil with cloches for 2 weeks before spring sowing. Choose globe types for baby beets rather than long varieties.' },
      { expert: 'larkcom', category: 'succession', tip: 'Sow every 3-4 weeks from April to July. Baby beets ready in 8 weeks. Harvest leaves like chard as well as roots.' },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Does well on clay provided globe (not long) types are used.' },
    surreyNote: 'First sowing in April under fleece, last sowing early August for autumn harvest.',
    pollinatorValue: 'low',
    greenstalkTier: { tier: 'middle', reason: 'Round roots fit pocket depth — the top tier may be too shallow.' },
    successionDays: 21,
  },

  'carrot': {
    slug: 'carrot',
    ukVarieties: [
      { name: 'Nantes 2 / Early Nantes', expert: 'AGM', reason: 'RHS AGM — short-rooted, good for clay soils.' },
      { name: 'Amsterdam Forcing', expert: 'AGM', reason: 'RHS AGM — very early small carrot.' },
      { name: 'Resistafly F1', expert: 'rhs', reason: 'Strong carrot fly resistance — critical in Surrey.' },
      { name: 'Purple Haze F1', expert: 'wong', reason: "Wong's pick — anthocyanins give dramatically more antioxidants than orange types." },
    ],
    tips: [
      { expert: 'monty', category: 'variety', tip: "On heavy soils, grow short-rooted or round carrot varieties ('Parmex', 'Nantes') rather than long ones — long types fork and distort on clay. Sow thinly to avoid thinning, which releases scent and attracts carrot fly." },
      { expert: 'rhs', category: 'pests', tip: 'Heavy clay causes misshapen long roots — use short-rooted types or grow in raised bed. Fleece or 60cm+ barrier essential against carrot fly in Surrey.' },
      { expert: 'larkcom', category: 'succession', tip: 'Sow every 3-4 weeks from March to July. Mix early and maincrop types for continuous supply until first frost.' },
    ],
    claySoil: { performance: 'dislikes-clay', amendment: 'Grow in raised bed or large pot with fine loose compost/sand mix.' },
    surreyNote: 'Carrot fly is endemic in Surrey — use fine mesh or 60cm+ solid barrier around bed. Avoid thinning at dusk when flies are active.',
    pollinatorValue: 'low',
    greenstalkTier: { tier: 'middle', reason: 'Only round/short types work — needs deeper soil than the shallow top tier.' },
    successionDays: 28,
  },

  'broccoli-sprouting': {
    slug: 'broccoli-sprouting',
    ukVarieties: [
      { name: 'Early Purple Sprouting', expert: 'AGM', reason: 'RHS AGM — classic February-April harvest, the UK standard.' },
      { name: 'Rudolph', expert: 'AGM', reason: 'RHS AGM — earliest purple sprouting, December-February in mild years.' },
      { name: 'White Eye', expert: 'rhs', reason: 'White-sprouting variant for visual variety.' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Sow May, plant out July into firm well-trodden soil. Stake individual plants and earth up stems — PSB is top-heavy and winter winds topple it. Start harvesting the central shoot first, then side shoots for weeks.' },
      { expert: 'rhs', category: 'pests', tip: 'Needs firm soil, lime to pH 6.5+ (clubroot). Net against pigeons and cabbage whites from planting onwards. Hardy through winter, harvested late winter through spring.' },
      { expert: 'wong', category: 'flavour', tip: 'PSB has higher glucosinolates than calabrese — one of the most nutritionally dense brassicas available.' },
    ],
    claySoil: { performance: 'loves-clay', amendment: 'Brassicas thrive on lime-amended clay.' },
    surreyNote: 'Pigeon netting is non-negotiable in Surrey November-March. Occupies ground 10+ months for a 6-week harvest, but worth it for early-spring fresh greens.',
    pollinatorValue: 'high',
    pollinatorNote: 'If allowed to fully flower, yellow brassica blossom is a critical early pollen source.',
    greenstalkTier: { tier: 'bottom', reason: 'Too large and long-season for a vertical tower.' },
  },

  'spring-onion': {
    slug: 'spring-onion',
    ukVarieties: [
      { name: 'White Lisbon', expert: 'AGM', reason: 'RHS AGM — the UK standard spring onion, all-purpose.' },
      { name: 'Apache', expert: 'rhs', reason: 'Red-stemmed for colour and slight kick.' },
      { name: 'North Holland Blood Red', expert: 'rhs', reason: 'Reddish stem, stronger flavour.' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Sow thinly in drills every 3-4 weeks March to August. Do NOT thin — pick as you go, taking alternate plants to leave others more space.' },
      { expert: 'larkcom', category: 'succession', tip: 'Sow every 3 weeks from March to August for continuous supply. Autumn sowing of a winter-hardy type gives early spring pickings.' },
      { expert: 'fowler', category: 'container', tip: 'Perfect container crop — sow thickly in 15cm+ pots of compost, harvest whole bundles at once.' },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Shallow roots prefer well-worked soil.' },
    surreyNote: 'Onion fly can be an issue in Surrey — use fleece or grow in containers to avoid.',
    pollinatorValue: 'high',
    pollinatorNote: 'Allium flowers are top bee plants if allowed to bloom.',
    greenstalkTier: { tier: 'any', reason: 'Shallow roots and small footprint make them excellent tower crops — grow in any tier.' },
    successionDays: 21,
  },

  'coriander': {
    slug: 'coriander',
    ukVarieties: [
      { name: 'Calypso', expert: 'AGM', reason: 'RHS AGM — slowest-bolting variety, longest leaf harvest.' },
      { name: 'Santo', expert: 'AGM', reason: 'RHS AGM — classic bolt-resistant.' },
      { name: 'Leisure / Leafy Leisure', expert: 'rhs', reason: 'Bred specifically for leaves not seed.' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Coriander hates root disturbance and heat — sow direct in cool moist conditions, NEVER transplant, and provide afternoon shade in summer. It bolts fast in Surrey July heat.' },
      { expert: 'larkcom', category: 'succession', tip: 'Sow every 2-3 weeks for continuous leaf supply. September sowings give autumn/winter leaves under cloches.' },
      { expert: 'wong', category: 'variety', tip: 'Explore Vietnamese coriander (Persicaria odorata) as a non-bolting perennial alternative — his Homegrown Revolution pick.' },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Shallow roots fine on clay.' },
    surreyNote: 'Summer sowings bolt in days — best sown April-May and September in Surrey, or grown in shade.',
    pollinatorValue: 'very-high',
    pollinatorNote: 'Coriander flowers are exceptional for hoverflies and parasitic wasps (key aphid predators).',
    greenstalkTier: { tier: 'middle', reason: 'Cooler shadier middle tier slows bolting in summer.' },
    successionDays: 17,
  },

  'dill': {
    slug: 'dill',
    ukVarieties: [
      { name: 'Dukat', expert: 'AGM', reason: 'RHS AGM — slowest-bolting, most leaf per plant.' },
      { name: 'Mammoth', expert: 'rhs', reason: 'Tall variety for seed production.' },
      { name: 'Fernleaf', expert: 'rhs', reason: 'Dwarf compact form for containers.' },
    ],
    tips: [
      { expert: 'monty', category: 'sowing', tip: 'Sow direct April-August — dill hates being transplanted and bolts quickly in heat. Keep pinching for leaves or let flower for dill seed.' },
      { expert: 'larkcom', category: 'succession', tip: 'Sow every 3-4 weeks for leaf. Allow a few plants to flower to supply seed AND set more plants via self-seeding.' },
    ],
    claySoil: { performance: 'tolerates-clay', amendment: 'Fine on moisture-retentive clay.' },
    surreyNote: "Allow to self-seed in Surrey and you won't need to sow again. Dill flowers coincide with parasitic wasps that control aphids — a natural pest control bonus.",
    pollinatorValue: 'very-high',
    pollinatorNote: 'Yellow umbels are magnets for hoverflies, parasitic wasps, and bees.',
    greenstalkTier: { tier: 'middle', reason: 'Dwarf varieties only — full-height bolts over tier capacity.' },
    successionDays: 21,
  },
};

// Merge batch 1 (30 core crops) with batch 2 (68 remaining plants).
export const UK_EXPERT_KNOWLEDGE: Record<string, UKExpertPlantKnowledge> = {
  ...UK_EXPERT_KNOWLEDGE_BATCH1,
  ...UK_EXPERT_KNOWLEDGE_BATCH2,
};

export function getUKExpertKnowledge(slug: string): UKExpertPlantKnowledge | null {
  return UK_EXPERT_KNOWLEDGE[slug] ?? null;
}

export function getExpertProfile(id: UKExpertId): UKExpertProfile | undefined {
  return UK_EXPERTS.find((e) => e.id === id);
}

// ─── Styling hints for UI ──────────────────────────────────────────────────

export const EXPERT_COLORS: Record<UKExpertId | 'AGM', { bg: string; text: string; ring: string }> = {
  monty: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
  },
  rhs: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-200 dark:ring-violet-800',
  },
  larkcom: {
    bg: 'bg-lime-50 dark:bg-lime-900/20',
    text: 'text-lime-700 dark:text-lime-300',
    ring: 'ring-lime-200 dark:ring-lime-800',
  },
  wong: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-800',
  },
  fowler: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-700 dark:text-rose-300',
    ring: 'ring-rose-200 dark:ring-rose-800',
  },
  flowerdew: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    ring: 'ring-orange-200 dark:ring-orange-800',
  },
  richards: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    text: 'text-teal-700 dark:text-teal-300',
    ring: 'ring-teal-200 dark:ring-teal-800',
  },
  hafferty: {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    text: 'text-pink-700 dark:text-pink-300',
    ring: 'ring-pink-200 dark:ring-pink-800',
  },
  AGM: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    ring: 'ring-yellow-200 dark:ring-yellow-800',
  },
};

export const CLAY_PERFORMANCE_LABEL: Record<ClaySoilPerformance, { emoji: string; label: string; className: string }> = {
  'loves-clay': { emoji: '💚', label: 'Loves clay', className: 'text-emerald-600 dark:text-emerald-400' },
  'tolerates-clay': { emoji: '👍', label: 'Tolerates clay', className: 'text-lime-600 dark:text-lime-400' },
  'dislikes-clay': { emoji: '⚠️', label: 'Struggles in clay', className: 'text-amber-600 dark:text-amber-400' },
  'avoid-clay': { emoji: '🚫', label: 'Avoid unamended clay', className: 'text-red-600 dark:text-red-400' },
};

export const POLLINATOR_LABEL: Record<PollinatorValue, string> = {
  'very-high': '🐝🐝🐝 Bee magnet',
  'high': '🐝🐝 High pollinator value',
  'moderate': '🐝 Moderate pollinator value',
  'low': 'Low pollinator value',
  'none': 'Not pollinator-significant',
};
