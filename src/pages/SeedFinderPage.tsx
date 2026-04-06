import { useState, useMemo } from 'react';
import { usePlantDb } from '../data/use-plant-db';
import { useSeedLinks, type SeedContext, type SeedLink, type SeedProduct, type SeedVariety } from '../data/use-seed-links';
import { useRegion } from '../data/use-region';
import { usePlannerStore } from '../state/planner-store';
import { useGardenStore } from '../state/garden-store';
import { getMonthName, isInWindow } from '../lib/calendar-utils';
import type { Plant } from '../types/plant';

type BuyTiming = 'buy-now' | 'buy-soon' | 'not-yet';

// ─── Supplies & equipment (non-plant items) ────────────────────────────────
type SupplyPhase = 'pre' | 'setup' | 'growing' | 'late';

const PHASE_LABELS_SHORT: Record<SupplyPhase, string> = {
  pre: 'pre-move', setup: 'setup', growing: 'growing', late: 'late season',
};

function getPhaseSimple(d: Date): SupplyPhase {
  const m = d.getMonth() + 1;
  if (d < new Date('2026-04-15')) return 'pre';
  if (d < new Date('2026-06-01')) return 'setup';
  if (m <= 9) return 'growing';
  return 'late';
}

interface Supply {
  id: string;
  emoji: string;
  name: string;
  reason: string;
  specific?: string;
  price?: string;
  url?: string;
  phases: SupplyPhase[];
}

const SUPPLIES: Supply[] = [
  // PRE-MOVE + SETUP
  { id: 'compost', emoji: '🪴', name: 'Peat-free multipurpose compost (100L+)', reason: 'Mix 3:1 with perlite for GreenStalk pockets. Need at least 100L for 2 towers.', specific: 'Westland Peat Free — best budget option at Homebase/B&Q', price: '~£12-15', url: 'https://www.thompson-morgan.com/p/peat-free-multipurpose-compost/t67890', phases: ['pre', 'setup'] },
  { id: 'perlite', emoji: '⬜', name: 'Perlite (20L bag)', reason: 'Essential for drainage in GreenStalk pockets. Without it, roots rot.', specific: 'Any brand fine — Westland or Miracle-Gro both work', price: '~£6-8', url: 'https://www.amazon.co.uk/dp/B07FZ6SZK8', phases: ['pre', 'setup'] },
  { id: 'seed-trays', emoji: '🫙', name: 'Seed trays + 9cm pots', reason: 'Start seeds in conservatory before GreenStalks arrive.', specific: 'Get modular trays (24-cell) + at least 20 x 9cm pots', price: '~£8-12', url: 'https://www.thompson-morgan.com/c/seed-trays-and-pots', phases: ['pre'] },
  { id: 'slow-release', emoji: '🧪', name: 'Slow-release fertiliser (NPK 14-14-14)', reason: 'Mix into compost when filling GreenStalks. Feeds for 3-4 months.', specific: 'Osmocote Exact Standard — the industry standard for containers', price: '~£8-10', url: 'https://www.amazon.co.uk/dp/B00BARLRH4', phases: ['setup'] },
  { id: 'liquid-feed', emoji: '🍅', name: 'Tomorite tomato feed (1L concentrate)', reason: 'Weekly liquid feed for all fruiting plants once they start flowering.', specific: 'Tomorite is the UK standard — high potash for fruit production', price: '~£5-7', url: 'https://www.thompson-morgan.com/p/tomorite-concentrated-tomato-food/t69481', phases: ['setup', 'growing'] },
  { id: 'fleece', emoji: '🛡️', name: 'Horticultural fleece (2m x 10m)', reason: 'Frost protection for tender seedlings April-May. Also deters carrot fly.', specific: '17gsm weight — light enough to lay directly on plants', price: '~£5-8', url: 'https://www.amazon.co.uk/dp/B005LI4R3A', phases: ['pre', 'setup'] },
  { id: 'netting', emoji: '🕸️', name: 'Butterfly netting / Enviromesh', reason: 'Keeps cabbage white butterflies off brassicas, carrot fly off carrots.', specific: 'Enviromesh is best (ultra-fine) but standard butterfly netting works', price: '~£8-15', url: 'https://www.amazon.co.uk/dp/B00BARLRJ2', phases: ['setup', 'growing'] },
  // GROWING SEASON
  { id: 'beer-traps', emoji: '🍺', name: 'Slug beer traps (or cheap lager)', reason: 'Sink jars into soil near lettuce/strawberries. Slugs fall in overnight.', specific: 'Any cheap lager works. Replace every 2-3 days. Or buy dedicated slug traps.', price: '~£3-5', phases: ['growing'] },
  { id: 'neem-oil', emoji: '🧴', name: 'Neem oil spray (organic)', reason: 'All-purpose organic pest spray for aphids, whitefly, and mites.', specific: 'Neudorff Bug Free or similar neem-based spray — RHS approved', price: '~£6-9', url: 'https://www.amazon.co.uk/dp/B00GXJJ3Q0', phases: ['growing'] },
  { id: 'twine', emoji: '🧵', name: 'Garden twine (soft jute)', reason: 'Tie in tomatoes, train beans up cages, secure sweet peas to fence.', specific: 'Soft jute won\'t cut stems — avoid plastic-coated wire', price: '~£3-4', phases: ['setup', 'growing'] },
  { id: 'watering-can', emoji: '🚿', name: 'Watering can with fine rose (9L)', reason: 'GreenStalks need daily watering. A fine rose avoids washing out seeds.', specific: 'Haws or similar long-reach can — fill the top reservoir, not individual pockets', price: '~£12-20', phases: ['setup'] },
  // LATE SEASON
  { id: 'green-manure', emoji: '🌿', name: 'Green manure seeds (crimson clover or phacelia)', reason: 'Sow on bare beds after harvest to fix nitrogen and protect soil over winter.', specific: 'Crimson clover for nitrogen; phacelia for pollinators + soil structure', price: '~£4-6', phases: ['late'] },
];

// ─── Essentials: the must-have crops by context ──────────────────────────────
// Curated from RHS beginner guidance + GreenStalk best practice.
// "Essential" = high yield, easy to grow, proven in Surrey/SoCal, worth the space.

interface EssentialDef {
  slug: string;
  reason: string;
}

const ESSENTIALS_GREENSTALK_UK: EssentialDef[] = [
  { slug: 'strawberry-everbearing', reason: 'Highest ROI fruit for vertical planters — crops June–October' },
  { slug: 'tomato-tumbling', reason: 'Purpose-bred for containers — heavy yields in small pockets' },
  { slug: 'basil-sweet', reason: 'Companion-plants with tomatoes, high-value herb you use constantly' },
  { slug: 'lettuce', reason: 'Cut-and-come-again salad — harvest leaves for months from one sowing' },
  { slug: 'chives', reason: 'Perennial, pest-deterrent, zero maintenance — comes back every year' },
  { slug: 'dwarf-french-bean', reason: 'Nitrogen-fixer, heavy cropper, kids love picking beans' },
  { slug: 'radish', reason: 'Ready in 4 weeks — fastest crop for impatient gardeners and kids' },
  { slug: 'thyme', reason: 'Perennial herb, drought-tolerant, thrives in top tiers' },
  { slug: 'perpetual-spinach', reason: 'Harvest for 12+ months from one sowing — the best value leafy green' },
  { slug: 'nasturtium', reason: 'Edible trap crop — protects everything else from aphids' },
];

const ESSENTIALS_INGROUND_UK: EssentialDef[] = [
  { slug: 'potato-early', reason: 'Nothing beats fresh new potatoes — the taste difference is enormous' },
  { slug: 'runner-bean', reason: 'Massive yields from a small area — freezes well too' },
  { slug: 'courgette', reason: 'One plant produces 20+ fruits — borderline unstoppable' },
  { slug: 'tomato-tumbling', reason: 'Fresh tomatoes from the garden are incomparable to shop-bought' },
  { slug: 'garlic', reason: 'Plant in autumn, ignore all winter, harvest in July — easiest crop there is' },
  { slug: 'lettuce', reason: 'Cut-and-come-again — succession sow every 2 weeks for continuous salad' },
  { slug: 'beetroot', reason: 'Reliable, stores well, beautiful in the garden — leaves edible too' },
  { slug: 'broad-bean', reason: 'Hardy, nitrogen-fixing, sow in autumn for earliest spring crop' },
  { slug: 'kale', reason: 'Stands through winter when nothing else grows — invaluable Nov–Mar' },
  { slug: 'pea', reason: 'Kids eat them straight off the plant — the best garden snack' },
  { slug: 'carrot', reason: 'Fresh carrots are a different vegetable to shop-bought — worth the effort' },
  { slug: 'raspberry', reason: 'Perennial fruit, minimal care, massive yields for years' },
];

const ESSENTIALS_GREENSTALK_US: EssentialDef[] = [
  { slug: 'strawberry-everbearing', reason: 'Year-round cropping in SoCal — the #1 GreenStalk fruit' },
  { slug: 'tomato-tumbling', reason: 'Purpose-bred for containers — heavy yields in small pockets' },
  { slug: 'basil-sweet', reason: 'Companion-plants with tomatoes, thrives in SoCal heat' },
  { slug: 'lettuce', reason: 'Cut-and-come-again — grow in cooler months for best results' },
  { slug: 'pepper-chilli', reason: 'Loves SoCal heat — perfect for containers' },
  { slug: 'dwarf-french-bean', reason: 'Fast nitrogen-fixer, heavy cropper, kids love picking beans' },
  { slug: 'radish', reason: 'Ready in 4 weeks — fastest crop for impatient gardeners' },
  { slug: 'chives', reason: 'Perennial, pest-deterrent, zero maintenance' },
  { slug: 'mint', reason: 'Contained in a pocket = the best way to grow this invasive herb' },
  { slug: 'nasturtium', reason: 'Edible trap crop — protects everything else from aphids' },
];

const ESSENTIALS_INGROUND_US: EssentialDef[] = [
  { slug: 'tomato-tumbling', reason: 'The single most rewarding crop to grow in Southern California' },
  { slug: 'pepper-chilli', reason: 'Thrives in SoCal heat — grows like a weed here' },
  { slug: 'zucchini', reason: 'One plant produces 20+ fruits — borderline unstoppable' },
  { slug: 'lettuce', reason: 'Cool-season star — succession sow Oct–Mar for year-round salad' },
  { slug: 'basil-sweet', reason: 'Summer herb that loves heat — grows faster than you can eat it' },
  { slug: 'cucumber', reason: 'Prolific in warm climates — perfect for SoCal gardens' },
  { slug: 'bush-bean', reason: 'Fast, heavy cropper, nitrogen-fixer — the perfect beginner crop' },
  { slug: 'strawberry-everbearing', reason: 'Nearly year-round fruit in the SoCal climate' },
  { slug: 'radish', reason: 'Ready in 4 weeks — the fastest gratification crop' },
  { slug: 'pepper-sweet', reason: 'Sweet peppers thrive in SoCal warmth — easy and prolific' },
];

function getTimingForMonth(plant: Plant, month: number): { timing: BuyTiming; reason: string } {
  const pw = plant.plantingWindow;

  // If we should sow indoors this month or next
  if (pw.sowIndoors) {
    if (isInWindow(month, pw.sowIndoors)) {
      return { timing: 'buy-now', reason: `Sow indoors now (${getMonthName(pw.sowIndoors[0])}-${getMonthName(pw.sowIndoors[1])})` };
    }
    const nextMonth = month === 12 ? 1 : month + 1;
    if (isInWindow(nextMonth, pw.sowIndoors)) {
      return { timing: 'buy-soon', reason: `Sow indoors next month (${getMonthName(pw.sowIndoors[0])})` };
    }
  }

  // If we should sow outdoors this month or next
  if (pw.sowOutdoors) {
    if (isInWindow(month, pw.sowOutdoors)) {
      return { timing: 'buy-now', reason: `Sow outdoors now (${getMonthName(pw.sowOutdoors[0])}-${getMonthName(pw.sowOutdoors[1])})` };
    }
    const nextMonth = month === 12 ? 1 : month + 1;
    if (isInWindow(nextMonth, pw.sowOutdoors)) {
      return { timing: 'buy-soon', reason: `Sow outdoors next month (${getMonthName(pw.sowOutdoors[0])})` };
    }
  }

  // If we should transplant this month
  if (pw.transplant && isInWindow(month, pw.transplant)) {
    return { timing: 'buy-now', reason: `Transplant now — buy young plants (${getMonthName(pw.transplant[0])}-${getMonthName(pw.transplant[1])})` };
  }

  return { timing: 'not-yet', reason: 'Not in season yet' };
}



const SELLER_INFO_UK: Record<string, { name: string; badge: string; note: string }> = {
  'Thompson & Morgan': {
    name: 'Thompson & Morgan',
    badge: 'RHS Gold Medal',
    note: 'One of the UK\'s most respected seed companies',
  },
  'Suttons Seeds': {
    name: 'Suttons Seeds',
    badge: 'Royal Warrant',
    note: 'Holds a Royal Warrant, RHS Partner Garden',
  },
  'RHS Shop': {
    name: 'RHS Shop',
    badge: 'RHS Official',
    note: 'The Royal Horticultural Society\'s own seed range',
  },
  'Mr Fothergill\'s': {
    name: 'Mr Fothergill\'s',
    badge: 'Est. 1978',
    note: 'Long-established, RHS show exhibitor',
  },
  'Kings Seeds': {
    name: 'Kings Seeds',
    badge: 'Organic Range',
    note: 'Organic seeds, RHS approved',
  },
};

const SELLER_INFO_US: Record<string, { name: string; badge: string; note: string }> = {
  'Burpee': {
    name: 'Burpee',
    badge: 'Est. 1876, AHS',
    note: 'America\'s oldest and most trusted seed company',
  },
  'Johnny\'s Selected Seeds': {
    name: 'Johnny\'s Selected Seeds',
    badge: 'USDA Organic',
    note: 'Employee-owned, USDA Organic certified',
  },
  'Baker Creek Heirloom': {
    name: 'Baker Creek Heirloom',
    badge: 'Non-GMO Pledge',
    note: 'Largest heirloom seed company in the US',
  },
  'Park Seed': {
    name: 'Park Seed',
    badge: 'Est. 1868, AHS',
    note: 'One of America\'s oldest garden seed suppliers',
  },
  'Territorial Seed Company': {
    name: 'Territorial Seed Company',
    badge: 'West Coast Specialist',
    note: 'Specializes in varieties suited to western climates',
  },
};

function VarietySection({ variety, sellerInfo, isFirst }: {
  variety: SeedVariety;
  sellerInfo: Record<string, { name: string; badge: string; note: string }>;
  isFirst: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleLinks = showAll ? variety.links : variety.links.slice(0, 3);

  return (
    <div className={`${!isFirst ? 'mt-3 pt-3 border-t border-stone-200/50 dark:border-stone-700/50' : 'mt-3'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg font-semibold text-stone-700 dark:text-stone-200">{variety.name}</span>
        {isFirst && (
          <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">RECOMMENDED</span>
        )}
      </div>
      {variety.why && (
        <p className="text-[10px] text-stone-400 mb-1.5 italic">{variety.why}</p>
      )}
      <div className="space-y-1">
        {visibleLinks.map((link, i) => {
          const sellerMeta = sellerInfo[link.seller];
          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:shadow-sm transition-all group ${
                link.recommended
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}
            >
              <span className="text-sm">{link.logo}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-stone-700 dark:text-stone-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate flex items-center gap-1">
                  {link.seller}
                  {link.recommended && (
                    <span className="text-[7px] px-1 py-0.5 bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded font-semibold">TOP</span>
                  )}
                </div>
                {sellerMeta && (
                  <div className="text-[9px] text-stone-400">{sellerMeta.badge}</div>
                )}
              </div>
              <div className="text-[11px] font-semibold text-emerald-400">{link.price}</div>
              <span className="text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all text-xs">&rarr;</span>
            </a>
          );
        })}
        {variety.links.length > 3 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="rounded-full text-sm text-emerald-400 hover:text-emerald-300 transition-colors ml-1"
          >
            +{variety.links.length - 3} more sellers
          </button>
        )}
      </div>
    </div>
  );
}

function SeedCard({
  plant,
  timing,
  reason,
  seedProduct,
  sellerInfo,
  essentialReason,
}: {
  plant: Plant;
  timing: BuyTiming;
  reason: string;
  seedProduct: SeedProduct | null;
  sellerInfo: Record<string, { name: string; badge: string; note: string }>;
  essentialReason?: string;
}) {
  const [showVarieties, setShowVarieties] = useState(false);
  const varieties = seedProduct?.varieties ?? [];
  const hasMultiple = varieties.length > 1;

  return (
    <div
      className={`rounded-2xl shadow-lg p-4 transition-all ${
        timing === 'buy-now'
          ? 'bg-gradient-to-br from-emerald-900/30 to-emerald-950/30 border border-emerald-700/50'
          : timing === 'buy-soon'
            ? 'border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
            : 'border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-4xl">{plant.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg text-stone-800 dark:text-stone-100 truncate">
              {plant.commonName}
            </h3>
            {timing === 'buy-now' && (
              <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500 text-white rounded-full font-bold uppercase tracking-wider shrink-0 animate-pulse">
                BUY NOW
              </span>
            )}
            {timing === 'buy-soon' && (
              <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full font-semibold shrink-0">
                BUY SOON
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">{reason}</p>
          {essentialReason && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
              <span>⭐</span> {essentialReason}
            </p>
          )}
          {hasMultiple && (
            <p className="text-[10px] text-stone-400 mt-0.5">
              {varieties.length} varieties available
            </p>
          )}
        </div>
      </div>

      {/* Show first variety by default */}
      {varieties.length > 0 && (
        <VarietySection variety={varieties[0]} sellerInfo={sellerInfo} isFirst={true} />
      )}

      {/* Additional varieties */}
      {hasMultiple && !showVarieties && (
        <button
          onClick={() => setShowVarieties(true)}
          className="mt-2 rounded-full text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
        >
          Show {varieties.length - 1} more {varieties.length - 1 === 1 ? 'variety' : 'varieties'}
        </button>
      )}
      {showVarieties && varieties.slice(1).map((v: SeedVariety, i: number) => (
        <VarietySection key={i} variety={v} sellerInfo={sellerInfo} isFirst={false} />
      ))}

      {!seedProduct && timing !== 'not-yet' && (
        <div className="mt-2 text-[10px] text-stone-400">
          Links being compiled — check back soon
        </div>
      )}
    </div>
  );
}

export function SeedFinderPage() {
  const region = useRegion();
  const { plants } = usePlantDb(region);
  const isUS = region === 'us';
  const [seedContext, setSeedContext] = useState<SeedContext>('greenstalk');
  const seedLinks = useSeedLinks(region, seedContext);
  const sellerInfo = isUS ? SELLER_INFO_US : SELLER_INFO_UK;
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<'shopping-list' | 'essentials' | 'all' | 'buy-now' | 'buy-soon'>('shopping-list');

  // Pick the right essentials list
  const essentialsDefs = useMemo(() => {
    if (isUS) return seedContext === 'greenstalk' ? ESSENTIALS_GREENSTALK_US : ESSENTIALS_INGROUND_US;
    return seedContext === 'greenstalk' ? ESSENTIALS_GREENSTALK_UK : ESSENTIALS_INGROUND_UK;
  }, [isUS, seedContext]);

  const essentialSlugs = useMemo(() => new Set(essentialsDefs.map(e => e.slug)), [essentialsDefs]);
  const essentialReasonMap = useMemo(() => new Map(essentialsDefs.map(e => [e.slug, e.reason])), [essentialsDefs]);

  // ─── Shopping list: read from both GreenStalk + In-Ground stores ───────────
  const towers = usePlannerStore((s) => s.towers);
  const garden = useGardenStore((s) => s.garden);

  // Seed links for both contexts (needed for shopping list which spans both)
  const gsLinks = useSeedLinks(region, 'greenstalk');
  const igLinks = useSeedLinks(region, 'inground');

  const shoppingList = useMemo(() => {
    // Count plants needed per slug, separated by source
    const gsCounts = new Map<string, number>();
    const igCounts = new Map<string, number>();

    for (const tower of towers) {
      for (const tier of tower.tiers) {
        for (const pocket of tier.pockets) {
          if (pocket.plantSlug) {
            gsCounts.set(pocket.plantSlug, (gsCounts.get(pocket.plantSlug) ?? 0) + 1);
          }
        }
      }
    }

    for (const row of garden.cells) {
      for (const cell of row) {
        if (cell.plantSlug) {
          igCounts.set(cell.plantSlug, (igCounts.get(cell.plantSlug) ?? 0) + 1);
        }
      }
    }

    // Merge into a unified list
    const allSlugs = new Set([...gsCounts.keys(), ...igCounts.keys()]);
    const items: {
      slug: string;
      plant: Plant | undefined;
      gsQty: number;
      igQty: number;
      totalQty: number;
      source: string;
      seedProduct: SeedProduct | null;
      bestPrice: number;
      bestSeller: string;
      bestUrl: string;
      buyAs: string;
    }[] = [];

    for (const slug of allSlugs) {
      const plant = plants.find((p) => p.slug === slug);
      const gsQty = gsCounts.get(slug) ?? 0;
      const igQty = igCounts.get(slug) ?? 0;
      const totalQty = gsQty + igQty;

      const source = gsQty > 0 && igQty > 0 ? 'Both' : gsQty > 0 ? 'GreenStalk' : 'In-Ground';

      // Find seed product from either context
      const sp = gsLinks.find((s) => s.plantSlug === slug)
        ?? igLinks.find((s) => s.plantSlug === slug)
        ?? null;

      // Find cheapest recommended seller
      let bestPrice = 0;
      let bestSeller = '';
      let bestUrl = '';
      if (sp) {
        for (const v of sp.varieties) {
          for (const link of v.links) {
            const priceNum = parseFloat(link.price.replace(/[£$,]/g, ''));
            if (priceNum > 0 && (bestPrice === 0 || priceNum < bestPrice)) {
              bestPrice = priceNum;
              bestSeller = link.seller;
              bestUrl = link.url;
            }
          }
        }
      }

      // Recommend: seeds, plugs, or potted plant based on timing and plant type
      let buyAs = '🌱 Seeds';
      if (plant) {
        const pw = plant.plantingWindow;
        const m = currentMonth;
        const isPerennial = plant.category === 'fruit' || ['strawberry-everbearing', 'gooseberry', 'redcurrant', 'raspberry', 'blueberry'].includes(plant.slug);
        const isHerb = plant.category === 'herb';
        const needsLongSeason = plant.daysToHarvest[0] > 90;
        const tooLateForSeed = pw.sowIndoors && !isInWindow(m, pw.sowIndoors) && !isInWindow(m, pw.sowOutdoors ?? [0, 0]);
        const canTransplant = pw.transplant && isInWindow(m, pw.transplant);

        if (isPerennial) {
          buyAs = '🪴 Potted plant';
        } else if (tooLateForSeed && canTransplant) {
          buyAs = '🌿 Plug plants';
        } else if (tooLateForSeed && needsLongSeason) {
          buyAs = '🌿 Plug plants';
        } else if (isHerb && m >= 5) {
          buyAs = '🪴 Potted herb';
        } else if (plant.slug === 'dwarf-sweet-pea' && m >= 3) {
          buyAs = '🌿 Plug plants';
        }
      }

      items.push({ slug, plant, gsQty, igQty, totalQty, source, seedProduct: sp, bestPrice, bestSeller, bestUrl, buyAs });
    }

    // Sort: plants with pricing first, then by total quantity desc
    items.sort((a, b) => {
      if (a.bestPrice > 0 && b.bestPrice === 0) return -1;
      if (b.bestPrice > 0 && a.bestPrice === 0) return 1;
      return b.totalQty - a.totalQty;
    });

    const totalBudget = items.reduce((sum, item) => sum + item.bestPrice, 0);
    const itemsWithPrices = items.filter((i) => i.bestPrice > 0).length;

    return { items, totalBudget, itemsWithPrices, totalItems: items.length };
  }, [towers, garden.cells, plants, gsLinks, igLinks, currentMonth]);

  const plantsWithTiming = useMemo(() => {
    return plants
      .map((plant) => {
        const { timing, reason } = getTimingForMonth(plant, selectedMonth);
        const seedProduct = seedLinks.find((s) => s.plantSlug === plant.slug) ?? null;
        return { plant, timing, reason, seedProduct };
      })
      .sort((a, b) => {
        // Primary: buy timing (buy now → buy soon → not yet)
        const order: Record<BuyTiming, number> = { 'buy-now': 0, 'buy-soon': 1, 'not-yet': 2 };
        const timingDiff = order[a.timing] - order[b.timing];
        if (timingDiff !== 0) return timingDiff;
        // Secondary: plants with seed data first (actionable)
        const aHas = a.seedProduct ? 0 : 1;
        const bHas = b.seedProduct ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        // Tertiary: alphabetical
        return a.plant.commonName.localeCompare(b.plant.commonName);
      });
  }, [plants, selectedMonth, seedLinks]);

  const shoppingListSlugs = useMemo(() => new Set(shoppingList.items.map((i) => i.slug)), [shoppingList.items]);

  const filtered = useMemo(() => {
    if (filter === 'shopping-list') return plantsWithTiming.filter((p) => shoppingListSlugs.has(p.plant.slug));
    if (filter === 'essentials') return plantsWithTiming.filter((p) => essentialSlugs.has(p.plant.slug));
    if (filter === 'all') return plantsWithTiming;
    return plantsWithTiming.filter((p) => p.timing === filter);
  }, [plantsWithTiming, filter, essentialSlugs, shoppingListSlugs]);

  const buyNowCount = plantsWithTiming.filter((p) => p.timing === 'buy-now').length;
  const buySoonCount = plantsWithTiming.filter((p) => p.timing === 'buy-soon').length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-stone-800 dark:text-stone-100">Shopping</h1>
          <p className="text-sm text-stone-400 mt-1">
            Everything you need to buy, with specific products, reasoning, and the best price.
          </p>
        </div>

        {/* GreenStalk / In-Ground tabs */}
        <div className="bg-stone-800/50 rounded-full p-1 inline-flex mb-5">
          <button
            onClick={() => setSeedContext('greenstalk')}
            className={`text-xs px-4 py-2 rounded-full font-medium transition-colors ${
              seedContext === 'greenstalk'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            <span className="mr-1.5">🌱</span>GreenStalk Varieties
          </button>
          <button
            onClick={() => setSeedContext('inground')}
            className={`text-xs px-4 py-2 rounded-full font-medium transition-colors ${
              seedContext === 'inground'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            <span className="mr-1.5">🏡</span>In-Ground Varieties
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div>
            <label className="text-[10px] text-stone-500 uppercase tracking-wide block mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 dark:text-stone-200"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)} {m === currentMonth ? '(now)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter('shopping-list')}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold ${
                filter === 'shopping-list' ? 'bg-violet-600 text-white shadow-sm' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
              }`}
            >
              🛒 My List ({shoppingList.totalItems})
            </button>
            <button
              onClick={() => setFilter('essentials')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                filter === 'essentials' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              }`}
            >
              ⭐ Essentials ({essentialsDefs.length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-lg ${
                filter === 'all' ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
              }`}
            >
              All ({plantsWithTiming.length})
            </button>
            <button
              onClick={() => setFilter('buy-now')}
              className={`text-xs px-3 py-1.5 rounded-lg ${
                filter === 'buy-now' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              Buy Now ({buyNowCount})
            </button>
            <button
              onClick={() => setFilter('buy-soon')}
              className={`text-xs px-3 py-1.5 rounded-lg ${
                filter === 'buy-soon' ? 'bg-amber-700 text-white' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              }`}
            >
              Buy Soon ({buySoonCount})
            </button>
          </div>
        </div>

        {/* Trusted sellers banner */}
        <div className="bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200/60 dark:border-stone-700/60 p-4 mb-5">
          <h3 className="text-[10px] text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="text-emerald-500">🌿</span>Trusted Sellers
          </h3>
          <div className="flex gap-4 flex-wrap text-xs text-stone-600 dark:text-stone-400">
            {Object.values(sellerInfo).map((s) => (
              <span key={s.name} className="flex items-center gap-1">
                <span className="font-medium">{s.name}</span>
                <span className="text-[9px] text-stone-400">({s.badge})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Shopping list summary */}
        {filter === 'shopping-list' && shoppingList.items.length > 0 && (
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-2xl border border-violet-200 dark:border-violet-800/40 p-4 sm:p-5 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                  🛒 My Shopping List
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Everything in your GreenStalk towers + in-ground garden plan
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="bg-white dark:bg-stone-800 rounded-lg px-3 py-1.5 border border-violet-200 dark:border-violet-700">
                  <div className="text-[10px] text-stone-400 uppercase">Items</div>
                  <div className="font-bold text-stone-800 dark:text-stone-200">{shoppingList.totalItems}</div>
                </div>
                <div className="bg-white dark:bg-stone-800 rounded-lg px-3 py-1.5 border border-violet-200 dark:border-violet-700">
                  <div className="text-[10px] text-stone-400 uppercase">Est. Budget</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    {isUS ? '$' : '£'}{shoppingList.totalBudget.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Compact table */}
            <div className="bg-white dark:bg-stone-800 rounded-xl border border-violet-100 dark:border-stone-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-violet-50 dark:bg-violet-900/30 text-[10px] uppercase tracking-wider text-stone-500">
                    <th className="text-left px-3 py-2">Plant</th>
                    <th className="text-center px-2 py-2 hidden sm:table-cell">GS</th>
                    <th className="text-center px-2 py-2 hidden sm:table-cell">Ground</th>
                    <th className="text-center px-2 py-2">Qty</th>
                    <th className="text-left px-2 py-2 hidden sm:table-cell">Buy As</th>
                    <th className="text-left px-2 py-2">Source</th>
                    <th className="text-right px-3 py-2">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700/50">
                  {shoppingList.items.map((item) => (
                    <tr key={item.slug} className="hover:bg-violet-50/50 dark:hover:bg-violet-900/10">
                      <td className="px-3 py-1.5 font-medium text-stone-700 dark:text-stone-300">
                        <span className="mr-1">{item.plant?.emoji ?? '🌱'}</span>
                        <span className="truncate">{item.plant?.commonName ?? item.slug}</span>
                      </td>
                      <td className="text-center px-2 py-1.5 text-stone-400 hidden sm:table-cell">
                        {item.gsQty > 0 ? item.gsQty : '–'}
                      </td>
                      <td className="text-center px-2 py-1.5 text-stone-400 hidden sm:table-cell">
                        {item.igQty > 0 ? item.igQty : '–'}
                      </td>
                      <td className="text-center px-2 py-1.5 font-semibold text-stone-600 dark:text-stone-300">
                        {item.totalQty}
                      </td>
                      <td className="px-2 py-1.5 text-[10px] text-stone-500 dark:text-stone-400 hidden sm:table-cell">
                        {item.buyAs}
                      </td>
                      <td className="px-2 py-1.5">
                        {item.bestSeller ? (
                          <a href={item.bestUrl} target="_blank" rel="noopener noreferrer"
                            className="text-violet-600 dark:text-violet-400 hover:underline truncate block max-w-[120px]">
                            {item.bestSeller}
                          </a>
                        ) : (
                          <span className="text-stone-300 dark:text-stone-600">–</span>
                        )}
                      </td>
                      <td className="text-right px-3 py-1.5 font-medium text-stone-600 dark:text-stone-300">
                        {item.bestPrice > 0 ? `${isUS ? '$' : '£'}${item.bestPrice.toFixed(2)}` : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-violet-50 dark:bg-violet-900/30 font-bold text-stone-700 dark:text-stone-200">
                    <td colSpan={3} className="px-3 py-2 hidden sm:table-cell">
                      Total ({shoppingList.itemsWithPrices}/{shoppingList.totalItems} priced)
                    </td>
                    <td colSpan={1} className="px-3 py-2 sm:hidden">
                      Total
                    </td>
                    <td className="sm:hidden" />
                    <td />
                    <td className="text-right px-3 py-2 text-emerald-600 dark:text-emerald-400">
                      {isUS ? '$' : '£'}{shoppingList.totalBudget.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {shoppingList.totalItems === 0 && (
              <p className="text-center text-stone-400 text-sm py-4">
                No plants in your plan yet. Use the GreenStalk Planner or Garden page to place plants.
              </p>
            )}
          </div>
        )}

        {filter === 'shopping-list' && shoppingList.items.length === 0 && (
          <div className="text-center py-12 text-stone-400">
            <div className="text-4xl mb-3">🛒</div>
            <p>No plants in your plan yet.</p>
            <p className="text-xs mt-1">Place plants on the GreenStalk or Garden page, then come back here for your shopping list.</p>
          </div>
        )}

        {/* ── Supplies & Equipment ─────────────────────────────────── */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">
              🧰 Supplies & Equipment
            </h2>
            <p className="text-[10px] text-stone-400 mt-0.5">Non-plant items you need — date-sensitive for your {PHASE_LABELS_SHORT[getPhaseSimple(new Date())]} phase</p>
          </div>
          <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
            {SUPPLIES.filter(s => s.phases.includes(getPhaseSimple(new Date()))).map((supply) => (
              <div key={supply.id} className="px-4 py-3 flex items-start gap-3">
                <span className="text-lg shrink-0">{supply.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-100">{supply.name}</div>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">{supply.reason}</p>
                  {supply.specific && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">{supply.specific}</p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {supply.price && (
                    <span className="text-[10px] font-bold text-stone-600 dark:text-stone-300">{supply.price}</span>
                  )}
                  {supply.url && (
                    <a href={supply.url} target="_blank" rel="noopener noreferrer"
                      className="text-[9px] px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-semibold">
                      Buy →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plant cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(({ plant, timing, reason, seedProduct }) => (
            <SeedCard
              key={plant.slug}
              plant={plant}
              timing={timing}
              reason={reason}
              seedProduct={seedProduct}
              sellerInfo={sellerInfo}
              essentialReason={filter === 'essentials' ? essentialReasonMap.get(plant.slug) : undefined}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-stone-400">
            <div className="text-4xl mb-3">🌱</div>
            <div>No seeds to buy for {getMonthName(selectedMonth)} with this filter.</div>
          </div>
        )}
      </div>
    </div>
  );
}
