import { useState, useEffect, useCallback } from 'react';
import { useHarvestStore } from '../state/harvest-store';
import { usePlantDb } from '../data/use-plant-db';
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
      onClick={handlePick}
      className={`
        relative w-full rounded-3xl p-5 text-left transition-all duration-200
        active:scale-95 hover:scale-[1.02] shadow-lg hover:shadow-xl
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
        <div className="text-lg font-bold text-stone-800">{plant.commonName}</div>
        <div className="text-sm text-stone-500 mt-1">
          Today: <span className="font-bold text-stone-700">{todayCount}</span>
          {' '} | Total: <span className="font-bold text-stone-700">{count}</span>
        </div>
      </div>

      {/* Pick badge */}
      {justPicked && (
        <div className="absolute -top-2 -right-2 text-3xl animate-bounce">
          +1
        </div>
      )}
    </button>
  );
}

function HarvesterSection({ harvester }: { harvester: Harvester }) {
  const { plantMap } = usePlantDb();
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
    <div className="bg-white rounded-3xl shadow-md overflow-hidden">
      {/* Harvester header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: `${harvester.color}20` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl">{harvester.emoji}</span>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: harvester.color }}>
              {harvester.name}'s Garden
            </h2>
            <p className="text-sm text-stone-500">
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
              className="text-2xl hover:scale-125 transition-transform cursor-default"
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
  const { plantMap } = usePlantDb();

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
    <div className="bg-white rounded-3xl shadow-md p-5">
      <h3 className="text-lg font-bold text-stone-700 mb-3">Recent Harvests</h3>
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
    <div className="bg-white rounded-3xl shadow-md p-5">
      <h3 className="text-lg font-bold text-stone-700 mb-3">Scoreboard</h3>
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
              <div className="text-3xl font-black text-stone-800 my-1">{total}</div>
              <div className="text-[10px] text-stone-500">total picked</div>
              <div className="flex justify-center gap-1 mt-2">
                {badges.map((m) => (
                  <span key={m.id} className="text-lg" title={m.label}>
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

export function HarvestPage() {
  const { harvesters } = useHarvestStore();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-stone-800">
            🌱 Harvest Tracker
          </h1>
          <p className="text-stone-500 mt-1">
            Tap a plant when you pick it!
          </p>
        </div>

        {/* Harvester sections */}
        {harvesters.map((h) => (
          <HarvesterSection key={h.id} harvester={h} />
        ))}

        {/* Bottom panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Scoreboard />
          <HarvestLog />
        </div>
      </div>
    </div>
  );
}
