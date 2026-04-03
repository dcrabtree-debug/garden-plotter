import { useState, useMemo } from 'react';
import { usePlantDb } from '../data/use-plant-db';
import { useSeedLinks, type SeedContext, type SeedVariety } from '../data/use-seed-links';
import { useRegion } from '../data/use-region';
import { getMonthName, isInWindow } from '../lib/calendar-utils';
import type { Plant } from '../types/plant';

type BuyTiming = 'buy-now' | 'buy-soon' | 'not-yet';

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

interface SeedLink {
  seller: string;
  url: string;
  price: string;
  logo: string;
}

interface SeedProduct {
  plantSlug: string;
  varietyName: string;
  links: SeedLink[];
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
        <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{variety.name}</span>
        {isFirst && (
          <span className="text-[8px] px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded font-semibold">RECOMMENDED</span>
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
              <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300">{link.price}</div>
              <span className="text-stone-300 group-hover:text-emerald-500 transition-colors text-xs">&rarr;</span>
            </a>
          );
        })}
        {variety.links.length > 3 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 ml-1"
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
}: {
  plant: Plant;
  timing: BuyTiming;
  reason: string;
  seedProduct: SeedProduct | null;
  sellerInfo: Record<string, { name: string; badge: string; note: string }>;
}) {
  const [showVarieties, setShowVarieties] = useState(false);
  const varieties = seedProduct?.varieties ?? [];
  const hasMultiple = varieties.length > 1;

  return (
    <div
      className={`rounded-2xl border-2 p-4 transition-all ${
        timing === 'buy-now'
          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
          : timing === 'buy-soon'
            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
            : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-4xl">{plant.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
              {plant.commonName}
            </h3>
            {timing === 'buy-now' && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full font-semibold shrink-0">
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
          className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium"
        >
          Show {varieties.length - 1} more {varieties.length - 1 === 1 ? 'variety' : 'varieties'}
        </button>
      )}
      {showVarieties && varieties.slice(1).map((v, i) => (
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
  const [filter, setFilter] = useState<'all' | 'buy-now' | 'buy-soon'>('all');

  const plantsWithTiming = useMemo(() => {
    return plants
      .map((plant) => {
        const { timing, reason } = getTimingForMonth(plant, selectedMonth);
        const seedProduct = seedLinks.find((s) => s.plantSlug === plant.slug) ?? null;
        return { plant, timing, reason, seedProduct };
      })
      .sort((a, b) => {
        const order: Record<BuyTiming, number> = { 'buy-now': 0, 'buy-soon': 1, 'not-yet': 2 };
        return order[a.timing] - order[b.timing];
      });
  }, [plants, selectedMonth, seedLinks]);

  const filtered = useMemo(() => {
    if (filter === 'all') return plantsWithTiming;
    return plantsWithTiming.filter((p) => p.timing === filter);
  }, [plantsWithTiming, filter]);

  const buyNowCount = plantsWithTiming.filter((p) => p.timing === 'buy-now').length;
  const buySoonCount = plantsWithTiming.filter((p) => p.timing === 'buy-soon').length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Seed Finder</h1>
          <p className="text-sm text-stone-500 mt-1">
            {isUS
              ? 'What to buy now for your SoCal garden. All sellers are AHS members or USDA-certified.'
              : 'What to buy now for your Surrey garden. All sellers are RHS-endorsed or hold Royal Warrants.'}
          </p>
        </div>

        {/* GreenStalk / In-Ground tabs */}
        <div className="flex gap-1 mb-5 bg-stone-100 dark:bg-stone-700 p-1 rounded-xl w-fit">
          <button
            onClick={() => setSeedContext('greenstalk')}
            className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors ${
              seedContext === 'greenstalk'
                ? 'bg-white dark:bg-stone-600 text-stone-800 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            <span className="mr-1.5">🌱</span>GreenStalk Varieties
          </button>
          <button
            onClick={() => setSeedContext('inground')}
            className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors ${
              seedContext === 'inground'
                ? 'bg-white dark:bg-stone-600 text-stone-800 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
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

          <div className="flex gap-1.5">
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
        <div className="bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-3 mb-5">
          <h3 className="text-[10px] text-stone-500 uppercase tracking-wide mb-2">Trusted Sellers</h3>
          <div className="flex gap-4 flex-wrap text-xs text-stone-600 dark:text-stone-400">
            {Object.values(sellerInfo).map((s) => (
              <span key={s.name} className="flex items-center gap-1">
                <span className="font-medium">{s.name}</span>
                <span className="text-[9px] text-stone-400">({s.badge})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Seed cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(({ plant, timing, reason, seedProduct }) => (
            <SeedCard
              key={plant.slug}
              plant={plant}
              timing={timing}
              reason={reason}
              seedProduct={seedProduct}
              sellerInfo={sellerInfo}
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
