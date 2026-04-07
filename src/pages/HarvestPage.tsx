import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useHarvestStore } from '../state/harvest-store';
import { usePlannerStore } from '../state/planner-store';
import { useGardenStore } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import { getGrowthProgress, calculateBadges, type Badge } from '../lib/kid-engagement';
import type { Harvester } from '../types/harvest';
import type { Plant } from '../types/plant';

// Harvestable plants (things kids can actually pick)
const HARVESTABLE_SLUGS = [
  'strawberry-everbearing',
  'tumbling-tom-tomato',
  'dwarf-french-bean',
  'perpetual-spinach',
  'swiss-chard',
  'basil',
  'thyme',
  'oregano',
  'parsley',
  'nasturtium',
  'radish',
  'lettuce',
  'rocket',
  'spring-onion',
  'chives',
  'mint',
];

// ─── "What can we pick today?" ───────────────────────────────────────────────

type ReadyStatus = 'ready' | 'almost' | 'growing';

interface PickableItem {
  plant: Plant;
  status: ReadyStatus;
  daysUntilReady: number; // 0 or negative = ready, positive = days to go
  source: string; // e.g. "Tower 1, Tier 3" or "Garden"
}

function getDaysBetween(dateStr: string, today: Date): number {
  const planted = new Date(dateStr + 'T00:00:00');
  const diff = today.getTime() - planted.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function usePickableItems(): {
  ready: PickableItem[];
  almost: PickableItem[];
  hasAnyPlantedDates: boolean;
  hasAnyPlants: boolean;
} {
  const towers = usePlannerStore((s) => s.towers);
  const garden = useGardenStore((s) => s.garden);
  const region = useRegion();
  const { plantMap } = usePlantDb(region);

  return useMemo(() => {
    const today = new Date();
    const seen = new Map<string, PickableItem>();
    let hasAnyPlantedDates = false;
    let hasAnyPlants = false;

    // Scan tower pockets
    for (const tower of towers) {
      for (const tier of tower.tiers) {
        for (const pocket of tier.pockets) {
          if (!pocket.plantSlug) continue;
          hasAnyPlants = true;
          if (!pocket.plantedDate) continue;
          hasAnyPlantedDates = true;

          const plant = plantMap.get(pocket.plantSlug);
          if (!plant) continue;

          const daysSincePlanted = getDaysBetween(pocket.plantedDate, today);
          const earliestHarvest = plant.daysToHarvest[0];
          const daysUntilReady = earliestHarvest - daysSincePlanted;

          let status: ReadyStatus;
          if (daysUntilReady <= 0) {
            status = 'ready';
          } else if (daysUntilReady <= 7) {
            status = 'almost';
          } else {
            status = 'growing';
          }

          const source = `${tower.name}, Tier ${tier.tierNumber}`;

          // Keep the best status per slug (ready > almost > growing)
          const existing = seen.get(plant.slug);
          if (
            !existing ||
            (status === 'ready' && existing.status !== 'ready') ||
            (status === 'almost' && existing.status === 'growing') ||
            daysUntilReady < existing.daysUntilReady
          ) {
            seen.set(plant.slug, { plant, status, daysUntilReady, source });
          }
        }
      }
    }

    // Scan garden cells (no plantedDate on GardenCell, so just mark as planted)
    for (const row of garden.cells) {
      for (const cell of row) {
        if (cell.plantSlug) {
          hasAnyPlants = true;
          // Garden cells lack plantedDate — can't compute readiness
        }
      }
    }

    const items = Array.from(seen.values());
    const ready = items
      .filter((i) => i.status === 'ready')
      .sort((a, b) => a.daysUntilReady - b.daysUntilReady);
    const almost = items
      .filter((i) => i.status === 'almost')
      .sort((a, b) => a.daysUntilReady - b.daysUntilReady);

    return { ready, almost, hasAnyPlantedDates, hasAnyPlants };
  }, [towers, garden.cells, plantMap]);
}

function ReadyToPickSection({
  onSelectPlant,
}: {
  onSelectPlant: (slug: string) => void;
}) {
  const { ready, almost, hasAnyPlantedDates, hasAnyPlants } =
    usePickableItems();

  // Nothing planted at all
  if (!hasAnyPlants) {
    return (
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl shadow-lg border border-stone-700/50 p-8 text-center">
        <div className="text-5xl mb-3">🌱</div>
        <h2 className="text-xl font-bold text-stone-700 dark:text-stone-200 mb-2">
          What can we pick today?
        </h2>
        <p className="text-stone-500 dark:text-stone-400">
          Plant something first, then we'll tell you when it's ready!
        </p>
      </div>
    );
  }

  // Plants exist but none have plantedDate
  if (!hasAnyPlantedDates) {
    return (
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl shadow-lg border border-stone-700/50 p-8 text-center">
        <div className="text-5xl mb-3">🌱</div>
        <h2 className="text-xl font-bold text-stone-700 dark:text-stone-200 mb-2">
          What can we pick today?
        </h2>
        <p className="text-stone-500 dark:text-stone-400">
          Plant something first, then we'll tell you when it's ready!
        </p>
      </div>
    );
  }

  // Nothing ready or almost ready
  if (ready.length === 0 && almost.length === 0) {
    return (
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl shadow-lg border border-stone-700/50 p-8 text-center">
        <div className="text-5xl mb-3">🌱</div>
        <h2 className="text-xl font-bold text-stone-700 dark:text-stone-200 mb-2">
          What can we pick today?
        </h2>
        <p className="text-stone-500 dark:text-stone-400">
          Nothing ready yet! Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl shadow-lg border border-stone-700/50 overflow-hidden">
      <div className="px-6 pt-5 pb-2">
        <h2 className="text-xl font-bold text-stone-700 dark:text-stone-200">
          What can we pick today?
        </h2>
      </div>

      {/* Ready to Pick row */}
      {ready.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2 px-2">
            Ready to pick!
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-hide">
            {ready.map((item) => (
              <button
                key={item.plant.slug}
                onClick={() => onSelectPlant(item.plant.slug)}
                className="
                  flex-shrink-0 snap-start flex flex-col items-center justify-center
                  w-[88px] h-[96px] rounded-2xl
                  bg-emerald-50 dark:bg-emerald-900/40
                  border-2 border-emerald-300 dark:border-emerald-600
                  shadow-md hover:shadow-lg
                  active:scale-95 hover:scale-105
                  transition-all duration-200
                  animate-[pulse-gentle_2s_ease-in-out_infinite]
                "
              >
                <span className="text-[52px] leading-none drop-shadow-sm">
                  {item.plant.emoji}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mt-1 truncate max-w-[80px] px-1">
                  {item.plant.commonName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Almost Ready row */}
      {almost.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 px-2">
            Almost ready!
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-hide">
            {almost.map((item) => (
              <button
                key={item.plant.slug}
                onClick={() => onSelectPlant(item.plant.slug)}
                className="
                  flex-shrink-0 snap-start flex flex-col items-center justify-center
                  w-[76px] h-[88px] rounded-2xl
                  bg-amber-50 dark:bg-amber-900/30
                  border-2 border-amber-200 dark:border-amber-700
                  shadow hover:shadow-md
                  active:scale-95 hover:scale-105
                  transition-all duration-200
                "
              >
                <span className="text-[40px] leading-none">
                  {item.plant.emoji}
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 mt-1">
                  {item.daysUntilReady}d to go
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── End "What can we pick today?" ───────────────────────────────────────────

function CelebrationOverlay({
  emoji,
  message,
  onDone,
}: {
  emoji: string;
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 pointer-events-none">
      <div className="animate-bounce text-center">
        <div className="text-8xl mb-4">{emoji}</div>
        <div className="text-3xl font-bold text-white drop-shadow-lg bg-black/40 rounded-2xl px-8 py-4">
          {message}
        </div>
      </div>
      {/* Confetti-like emojis */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-4xl animate-ping"
          style={{
            top: `${10 + Math.random() * 80}%`,
            left: `${5 + Math.random() * 90}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${0.8 + Math.random() * 0.5}s`,
          }}
        >
          {['⭐', '🎉', '🌟', '✨', '🎊'][Math.floor(Math.random() * 5)]}
        </div>
      ))}
    </div>
  );
}

function HarvestButton({
  plant,
  harvester,
  count,
  todayCount,
  onPick,
}: {
  plant: Plant;
  harvester: Harvester;
  count: number;
  todayCount: number;
  onPick: () => void;
}) {
  const [justPicked, setJustPicked] = useState(false);

  const handlePick = () => {
    setJustPicked(true);
    onPick();
    setTimeout(() => setJustPicked(false), 400);
  };

  return (
    <button
      data-plant-slug={plant.slug}
      onClick={handlePick}
      className={`
        relative w-full rounded-2xl p-5 text-left transition-transform duration-150
        active:scale-95 hover:scale-105 shadow-md hover:shadow-xl
        ${justPicked ? 'scale-110 ring-4 ring-yellow-400' : ''}
      `}
      style={{
        background: `linear-gradient(135deg, ${harvester.color}15, ${harvester.color}30)`,
        borderWidth: 3,
        borderColor: `${harvester.color}60`,
      }}
    >
      {/* Plant emoji — big and touchable */}
      <div className="text-6xl mb-2 text-center">
        {plant.emoji}
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-stone-800 dark:text-stone-100">{plant.commonName}</div>
        <div className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Today: <span className="font-bold text-stone-700 dark:text-stone-200">{todayCount}</span>
          {' '} | Total: <span className="font-bold text-stone-700 dark:text-stone-200">{count}</span>
        </div>
      </div>

      {/* Pick badge — upward bounce */}
      {justPicked && (
        <div className="absolute -top-3 -right-2 text-3xl font-bold text-yellow-400 drop-shadow-md animate-bounce">
          +1
        </div>
      )}
    </button>
  );
}

function HarvesterSection({ harvester }: { harvester: Harvester }) {
  const region = useRegion();
  const { plantMap } = usePlantDb(region);
  const {
    addHarvest,
    getCountForHarvester,
    getTodayCountForHarvester,
    getEarnedMilestones,
  } = useHarvestStore();

  const [celebration, setCelebration] = useState<{
    emoji: string;
    message: string;
  } | null>(null);

  const harvestable = HARVESTABLE_SLUGS.map((s) => plantMap.get(s)).filter(Boolean) as Plant[];
  const totalToday = getTodayCountForHarvester(harvester.id);
  const totalAll = getCountForHarvester(harvester.id);
  const earned = getEarnedMilestones(harvester.id);

  const handlePick = useCallback(
    (plant: Plant) => {
      const prevCount = getCountForHarvester(harvester.id, plant.slug);
      addHarvest(harvester.id, plant.slug);
      const newCount = prevCount + 1;

      // Check milestones
      const milestones = useHarvestStore.getState().milestones;
      const newlyEarned = milestones.filter((m) => {
        if (m.plantSlug && m.plantSlug !== plant.slug) return false;
        const totalForThis = m.plantSlug
          ? newCount
          : useHarvestStore.getState().entries
              .filter((e) => e.harvesterId === harvester.id)
              .reduce((sum, e) => sum + e.count, 0);
        const prevTotal = totalForThis - 1;
        return prevTotal < m.target && totalForThis >= m.target;
      });

      if (newlyEarned.length > 0) {
        const milestone = newlyEarned[0];
        setCelebration({
          emoji: milestone.emoji,
          message: `${harvester.name} earned: ${milestone.label}!`,
        });
      }
    },
    [harvester.id, harvester.name, addHarvest, getCountForHarvester]
  );

  return (
    <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-md overflow-hidden">
      {/* Harvester header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: `${harvester.color}20` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{harvester.emoji}</span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: harvester.color }}>
              {harvester.name}'s Garden
            </h2>
            <p className="text-sm text-stone-400 font-medium">
              {totalToday} picked today | {totalAll} total
            </p>
          </div>
        </div>

        {/* Milestone badges */}
        <div className="flex gap-1.5">
          {earned.map((m) => (
            <span
              key={m.id}
              title={m.label}
              className="text-2xl bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-600/30 rounded-xl px-1.5 py-0.5 hover:scale-125 transition-transform cursor-default shadow-[0_0_8px_rgba(217,119,6,0.25)]"
            >
              {m.emoji}
            </span>
          ))}
        </div>
      </div>

      {/* Harvest grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {harvestable.map((plant) => (
          <HarvestButton
            key={plant.slug}
            plant={plant}
            harvester={harvester}
            count={getCountForHarvester(harvester.id, plant.slug)}
            todayCount={getTodayCountForHarvester(harvester.id, plant.slug)}
            onPick={() => handlePick(plant)}
          />
        ))}
      </div>

      {/* Celebration overlay */}
      {celebration && (
        <CelebrationOverlay
          emoji={celebration.emoji}
          message={celebration.message}
          onDone={() => setCelebration(null)}
        />
      )}
    </div>
  );
}

function HarvestLog() {
  const { entries, harvesters } = useHarvestStore();
  const region = useRegion();
  const { plantMap } = usePlantDb(region);

  const recentEntries = [...entries]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  if (recentEntries.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400">
        <div className="text-5xl mb-3">🌱</div>
        <div className="text-lg">No harvests yet!</div>
        <div className="text-sm">Tap a plant above when you pick something</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-md p-5">
      <h3 className="text-lg font-bold text-stone-700 dark:text-stone-200 mb-3">Recent Harvests</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {recentEntries.map((entry) => {
          const harvester = harvesters.find((h) => h.id === entry.harvesterId);
          const plant = plantMap.get(entry.plantSlug);
          if (!harvester || !plant) return null;
          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 text-sm py-1.5 border-b border-stone-100 last:border-0"
            >
              <span className="text-lg">{harvester.emoji}</span>
              <span className="font-medium" style={{ color: harvester.color }}>
                {harvester.name}
              </span>
              <span className="text-stone-400">picked</span>
              <span className="text-lg">{plant.emoji}</span>
              <span className="text-stone-600">{plant.commonName}</span>
              <span className="ml-auto text-[10px] text-stone-400">
                {new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Scoreboard() {
  const { harvesters, getCountForHarvester, getEarnedMilestones } = useHarvestStore();

  return (
    <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-md p-5">
      <h3 className="text-lg font-bold text-stone-700 dark:text-stone-200 mb-3">Scoreboard</h3>
      <div className="grid grid-cols-2 gap-4">
        {harvesters.map((h) => {
          const total = getCountForHarvester(h.id);
          const badges = getEarnedMilestones(h.id);
          return (
            <div
              key={h.id}
              className="text-center rounded-2xl p-4"
              style={{ background: `${h.color}10` }}
            >
              <div className="text-4xl mb-1">{h.emoji}</div>
              <div className="text-lg font-bold" style={{ color: h.color }}>
                {h.name}
              </div>
              <div className="text-3xl font-black text-stone-800 dark:text-stone-100 my-1">{total}</div>
              <div className="text-[10px] text-stone-500">total picked</div>
              <div className="flex justify-center gap-1 mt-2">
                {badges.map((m) => (
                  <span key={m.id} className="text-lg bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-600/30 rounded-xl px-1 py-0.5 shadow-[0_0_6px_rgba(217,119,6,0.2)]" title={m.label}>
                    {m.emoji}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Growth Tracker (kid-friendly plant progress) ────────────────────────────

function GrowthTracker() {
  const towers = usePlannerStore((s) => s.towers);
  const region = useRegion();
  const { plantMap } = usePlantDb(region);

  const plantedItems = useMemo(() => {
    const items: { plant: Plant; plantedDate: string; source: string }[] = [];
    for (const tower of towers) {
      for (const tier of tower.tiers) {
        for (const pocket of tier.pockets) {
          if (!pocket.plantSlug || !pocket.plantedDate) continue;
          const plant = plantMap.get(pocket.plantSlug);
          if (plant) {
            // De-dupe by slug
            if (!items.find((i) => i.plant.slug === plant.slug)) {
              items.push({ plant, plantedDate: pocket.plantedDate, source: `${tower.name}, Tier ${tier.tierNumber}` });
            }
          }
        }
      }
    }
    return items;
  }, [towers, plantMap]);

  if (plantedItems.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-950/10 rounded-2xl shadow-lg border border-emerald-700/30 p-5">
      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2 mb-3">
        <span>🌱</span> How are my plants growing?
      </h2>
      <div className="space-y-2.5">
        {plantedItems.map(({ plant, plantedDate }) => {
          const progress = getGrowthProgress(plantedDate, plant.daysToHarvest, plant.commonName);
          return (
            <div key={plant.slug} className="bg-white/10 dark:bg-stone-800/50 rounded-xl px-3 py-2.5 border border-stone-700/30">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{progress.stageEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-200">{plant.emoji} {plant.commonName}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-700 text-stone-300">{progress.stageName}</span>
                  </div>
                </div>
                <div className="text-right">
                  {progress.daysRemaining > 0 ? (
                    <span className="text-xs font-bold text-amber-400">{progress.daysRemaining}d</span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400">Ready! 🎉</span>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-stone-700/50 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress.progressPct >= 95 ? 'bg-emerald-400' :
                    progress.progressPct >= 75 ? 'bg-amber-400' :
                    progress.progressPct >= 50 ? 'bg-blue-400' :
                    'bg-stone-400'
                  }`}
                  style={{ width: `${progress.progressPct}%` }}
                />
              </div>
              {/* Kid message */}
              <p className="text-[10px] text-stone-400 italic">{progress.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Achievement Badges ──────────────────────────────────────────────────────

function BadgesSection() {
  const entries = useHarvestStore((s) => s.entries);

  const stats = useMemo(() => {
    let totalHarvests = 0;
    const harvestedSlugs = new Set<string>();
    const uniquePlants = new Set<string>();

    for (const entry of entries) {
      totalHarvests += entry.count;
      harvestedSlugs.add(entry.plantSlug);
      uniquePlants.add(entry.plantSlug);
    }

    // Approximate days gardening from entry dates
    const dates = new Set<string>();
    for (const entry of entries) {
      dates.add(entry.date.split('T')[0]);
    }

    return { totalHarvests, harvestedSlugs, uniquePlants, daysGardening: dates.size };
  }, [entries]);

  const badges = calculateBadges(
    stats.totalHarvests,
    stats.uniquePlants,
    stats.daysGardening,
    stats.harvestedSlugs
  );

  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);

  return (
    <div className="bg-gradient-to-br from-amber-900/20 to-amber-950/10 rounded-2xl shadow-lg border border-amber-700/30 p-5">
      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2 mb-3">
        <span>🏆</span> Badges
        <span className="text-xs font-normal text-stone-400">
          {unlocked.length}/{badges.length} unlocked
        </span>
      </h2>

      {/* Unlocked badges */}
      {unlocked.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {unlocked.map((badge) => (
            <div
              key={badge.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-800/30 border border-amber-300 dark:border-amber-700"
            >
              <span className="text-lg">{badge.emoji}</span>
              <div>
                <div className="text-[10px] font-bold text-amber-800 dark:text-amber-200">{badge.name}</div>
                <div className="text-[8px] text-amber-600 dark:text-amber-400">{badge.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Locked badges with progress */}
      <div className="grid grid-cols-2 gap-2">
        {locked.map((badge) => (
          <div
            key={badge.id}
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-stone-800/50 border border-stone-700/50 opacity-60"
          >
            <span className="text-lg grayscale">{badge.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-stone-400">{badge.name}</div>
              {badge.progress !== undefined && badge.target && (
                <div className="h-1 bg-stone-700 rounded-full mt-0.5 overflow-hidden">
                  <div className="h-full bg-stone-500 rounded-full" style={{ width: `${badge.progress * 100}%` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HarvestPage() {
  const { harvesters } = useHarvestStore();
  const harvestSectionRef = useRef<HTMLDivElement>(null);

  // When a "ready to pick" plant is tapped, scroll down to the harvest buttons
  // and briefly highlight the matching plant buttons
  const handleSelectPlant = useCallback((slug: string) => {
    if (!harvestSectionRef.current) return;

    // Scroll the harvest sections into view
    harvestSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // After scroll, find and flash the matching buttons
    setTimeout(() => {
      const buttons = harvestSectionRef.current?.querySelectorAll(
        `[data-plant-slug="${slug}"]`
      );
      buttons?.forEach((btn) => {
        btn.classList.add('ring-4', 'ring-emerald-400', 'scale-105');
        setTimeout(() => {
          btn.classList.remove('ring-4', 'ring-emerald-400', 'scale-105');
        }, 1200);
      });
    }, 400);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-100">
            🌱 Harvest Tracker
          </h1>
          <p className="text-stone-500 mt-1">
            Tap a plant when you pick it!
          </p>
        </div>

        {/* "What can we pick today?" — above the harvest picker */}
        <ReadyToPickSection onSelectPlant={handleSelectPlant} />

        {/* Harvester sections */}
        <div ref={harvestSectionRef} className="space-y-6">
          {harvesters.map((h) => (
            <HarvesterSection key={h.id} harvester={h} />
          ))}
        </div>

        {/* Growth Tracker */}
        <GrowthTracker />

        {/* Badges */}
        <BadgesSection />

        {/* Bottom panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Scoreboard />
          <HarvestLog />
        </div>
      </div>
    </div>
  );
}
