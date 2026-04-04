import { useState, useMemo } from 'react';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import { rankByYield, type YieldSort, type YieldEstimate } from '../lib/yield-engine';

function YieldBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex-1 h-3 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  );
}

export function YieldPage() {
  const region = useRegion();
  const isUS = region === 'us';
  const { plants } = usePlantDb(region);
  const [context, setContext] = useState<'greenstalk' | 'inground'>('greenstalk');
  const [sort, setSort] = useState<YieldSort>('value-per-pocket');

  const ranked = useMemo(() => rankByYield(plants, sort, context), [plants, sort, context]);

  const maxValue = ranked.length > 0
    ? (context === 'greenstalk' ? ranked[0].pocketValueGBP : ranked[0].cellValueGBP)
    : 1;
  const maxKg = ranked.length > 0
    ? (context === 'greenstalk' ? ranked[0].kgPerPocket : ranked[0].kgPerM2)
    : 1;

  const currency = isUS ? '$' : '£';

  // Top-level stats
  const totalPocketValue = ranked.slice(0, 30).reduce((s, e) => s + e.pocketValueGBP, 0);
  const topHerbs = ranked.filter((e) => e.plant.category === 'herb').slice(0, 3);
  const topVeg = ranked.filter((e) => e.plant.category === 'vegetable' || e.plant.category === 'legume').slice(0, 3);
  const topFruit = ranked.filter((e) => e.plant.category === 'fruit').slice(0, 3);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
            Yield Calculator
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Compare plants by actual output — every pocket and every square foot matters
          </p>
        </div>

        {/* Context + sort controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-stone-800/50 rounded-full p-1 inline-flex">
            <button
              onClick={() => { setContext('greenstalk'); setSort('value-per-pocket'); }}
              className={`text-xs px-4 py-1.5 rounded-full font-medium transition-colors ${
                context === 'greenstalk' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-400 hover:bg-stone-700'
              }`}
            >
              🌱 Per Pocket
            </button>
            <button
              onClick={() => { setContext('inground'); setSort('value-per-cell'); }}
              className={`text-xs px-4 py-1.5 rounded-full font-medium transition-colors ${
                context === 'inground' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-400 hover:bg-stone-700'
              }`}
            >
              🏡 Per m²
            </button>
          </div>

          <div className="flex gap-1">
            {context === 'greenstalk' ? (
              <>
                <button onClick={() => setSort('value-per-pocket')} className={`text-[10px] px-2.5 py-1 rounded-full ${sort === 'value-per-pocket' ? 'bg-amber-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'}`}>
                  {currency} Value
                </button>
                <button onClick={() => setSort('kg-per-pocket')} className={`text-[10px] px-2.5 py-1 rounded-full ${sort === 'kg-per-pocket' ? 'bg-emerald-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'}`}>
                  kg Weight
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setSort('value-per-cell')} className={`text-[10px] px-2.5 py-1 rounded-full ${sort === 'value-per-cell' ? 'bg-amber-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'}`}>
                  {currency} Value
                </button>
                <button onClick={() => setSort('kg-per-m2')} className={`text-[10px] px-2.5 py-1 rounded-full ${sort === 'kg-per-m2' ? 'bg-emerald-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'}`}>
                  kg/m²
                </button>
              </>
            )}
          </div>
        </div>

        {/* Key insight */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-4">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <span>💡</span> Value Density Insight
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            {context === 'greenstalk' ? (
              <>
                <strong>Herbs are the highest-value GreenStalk crops by far.</strong> A pocket of basil saves ~{currency}{topHerbs[0]?.pocketValueGBP.toFixed(2) ?? '0'}/season
                because supermarket herbs cost {currency}30-50/kg. Strawberries and cherry tomatoes follow — both expensive to buy but easy to grow.
                {ranked.length >= 30 && ` Your top 30 pockets would produce ~${currency}${totalPocketValue.toFixed(0)} worth of food per season.`}
              </>
            ) : (
              <>
                <strong>Rocket and asparagus are the highest-value in-ground crops per m².</strong> Rocket costs {currency}12/kg retail and grows fast.
                Asparagus costs {currency}12/kg and is perennial — plant once, harvest for 20 years.
              </>
            )}
          </p>
        </div>

        {/* Category winners */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Best Herb', items: topHerbs, color: 'emerald' },
            { label: 'Best Veg', items: topVeg, color: 'amber' },
            { label: 'Best Fruit', items: topFruit, color: 'rose' },
          ].map(({ label, items, color }) => {
            const winner = items[0];
            if (!winner) return null;
            const val = context === 'greenstalk' ? winner.pocketValueGBP : winner.cellValueGBP;
            return (
              <div key={label} className={`rounded-xl p-3 border bg-${color}-50 dark:bg-${color}-900/10 border-${color}-200 dark:border-${color}-800`}>
                <div className="text-[9px] font-bold uppercase tracking-wide text-stone-400">{label}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xl">{winner.plant.emoji}</span>
                  <div>
                    <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">{winner.plant.commonName}</div>
                    <div className="text-[10px] text-stone-500">{currency}{val.toFixed(2)}/{context === 'greenstalk' ? 'pocket' : 'cell'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rankings table */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {context === 'greenstalk' ? 'GreenStalk Pocket Rankings' : 'In-Ground Rankings'} — {ranked.length} crops
            </h3>
          </div>

          <div className="divide-y divide-stone-50 dark:divide-stone-700">
            {ranked.map((est, i) => {
              const value = context === 'greenstalk' ? est.pocketValueGBP : est.cellValueGBP;
              const kg = context === 'greenstalk' ? est.kgPerPocket : est.kgPerM2;
              const isValueSort = sort.includes('value');
              const barValue = isValueSort ? value : kg;
              const barMax = isValueSort ? maxValue : maxKg;

              return (
                <div key={est.plant.slug} className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                  <span className={`w-5 text-[10px] font-bold text-right ${
                    i < 3 ? 'text-amber-500' : i < 10 ? 'text-stone-500' : 'text-stone-300 dark:text-stone-600'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-lg w-7 text-center">{est.plant.emoji}</span>
                  <div className="w-32 min-w-0">
                    <div className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">{est.plant.commonName}</div>
                    <div className="text-[9px] text-stone-400">{est.plant.category} · {est.harvestDays}d harvest</div>
                  </div>
                  <YieldBar
                    value={barValue}
                    max={barMax}
                    color={isValueSort ? 'bg-amber-400 dark:bg-amber-500' : 'bg-emerald-400 dark:bg-emerald-500'}
                  />
                  <div className="w-20 text-right">
                    {isValueSort ? (
                      <>
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400">{currency}{value.toFixed(2)}</div>
                        <div className="text-[8px] text-stone-400">/{context === 'greenstalk' ? 'pocket' : 'cell'}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{(kg * 1000).toFixed(0)}g</div>
                        <div className="text-[8px] text-stone-400">/{context === 'greenstalk' ? 'pocket' : 'm²'}</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-stone-400 text-center pb-4">
          Yields based on RHS growing guides for Surrey conditions. Supermarket prices approximate (UK, April 2026).
          GreenStalk pocket area ≈ 300cm². Container productivity bonus applied for ideal/good suitability ratings.
        </p>
      </div>
    </div>
  );
}
