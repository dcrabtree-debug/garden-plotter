import { useState, useEffect, useMemo } from 'react';
import { usePlannerStore } from '../state/planner-store';
import { useGardenStore } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { useCompanionDb } from '../data/use-companion-db';
import { useRegion } from '../data/use-region';
import { isInWindow, getMonthName } from '../lib/calendar-utils';
import { gradeGarden, type GardenGrade, type PlantScore } from '../lib/garden-rating';
import type { Plant } from '../types/plant';

// ── Key dates ────────────────────────────────────────────────────────────────
const MOVE_IN = new Date('2026-04-15');
const GEAR_ARRIVES = new Date('2026-05-15');
const FIRST_FROST = new Date('2026-10-25');

type Phase = 'PRE_MOVE' | 'NO_GEAR' | 'EARLY_SEASON' | 'PEAK_SEASON' | 'LATE_SEASON' | 'DORMANT';

function getPhase(d: Date): Phase {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (d < MOVE_IN) return 'PRE_MOVE';
  if (d < GEAR_ARRIVES) return 'NO_GEAR';
  if (m <= 6) return 'EARLY_SEASON';
  if (m <= 8) return 'PEAK_SEASON';
  if (m <= 10) return 'LATE_SEASON';
  return 'DORMANT';
}

const PHASE_LABELS: Record<Phase, { label: string; emoji: string; color: string }> = {
  PRE_MOVE: { label: 'Pre-Move', emoji: '📦', color: 'amber' },
  NO_GEAR: { label: 'Conservatory Season', emoji: '🏠', color: 'sky' },
  EARLY_SEASON: { label: 'Setup & Planting', emoji: '🌱', color: 'emerald' },
  PEAK_SEASON: { label: 'Peak Growing', emoji: '☀️', color: 'orange' },
  LATE_SEASON: { label: 'Harvest & Wind Down', emoji: '🍂', color: 'amber' },
  DORMANT: { label: 'Planning Season', emoji: '❄️', color: 'blue' },
};

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function weatherEmoji(code: number): string {
  if (code <= 1) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── RHS-backed organic pest remedies ────────────────────────────────────────
interface PestRemedy {
  emoji: string;
  rhsUrl?: string; // RHS pest ID page for visual identification
  tips: { icon: string; label: string; detail: string }[];
}

const PEST_REMEDIES: Record<string, PestRemedy> = {
  slugs: {
    emoji: '🐌',
    rhsUrl: 'https://www.rhs.org.uk/biodiversity/slugs',
    tips: [
      { icon: '🍺', label: 'Beer traps', detail: 'Sink jam jars level with soil, fill with cheap beer. Empty daily.' },
      { icon: '🥚', label: 'Crushed eggshells', detail: 'Ring plants with crushed shells — slugs avoid the sharp edges.' },
      { icon: '🌙', label: 'Evening patrol', detail: 'Go out after dark with a torch. Pick off slugs by hand into salty water.' },
      { icon: '🌿', label: 'Companion planting', detail: 'Rosemary, thyme, and lavender repel slugs with aromatic oils.' },
    ],
  },
  aphids: {
    emoji: '🟢',
    rhsUrl: 'https://www.rhs.org.uk/biodiversity/aphids',
    tips: [
      { icon: '💦', label: 'Blast with water', detail: 'Strong jet from a hose knocks aphids off. Repeat every 2-3 days.' },
      { icon: '🧴', label: 'Soapy water spray', detail: 'Mix 1 tsp washing-up liquid per litre of water. Spray undersides of leaves.' },
      { icon: '🐞', label: 'Attract ladybirds', detail: 'Ladybird larvae eat 50+ aphids per day. Plant calendula and fennel nearby.' },
      { icon: '🌸', label: 'Nasturtium trap crop', detail: 'Plant nasturtiums nearby — aphids prefer them over your food crops.' },
    ],
  },
  'vine weevil': {
    emoji: '🪲',
    rhsUrl: 'https://www.rhs.org.uk/biodiversity/vine-weevil',
    tips: [
      { icon: '🔍', label: 'Check at night', detail: 'Adults feed after dark — shake plants over white paper to spot them.' },
      { icon: '🧫', label: 'Nematode drench', detail: 'Apply Steinernema kraussei nematodes to compost in spring/autumn (soil temp 5°C+).' },
      { icon: '🪤', label: 'Barrier method', detail: 'Stand pots in water trays — weevils cannot swim to reach plants.' },
      { icon: '🔄', label: 'Repot annually', detail: 'Check roots when repotting — destroy any C-shaped white grubs.' },
    ],
  },
  'carrot fly': {
    emoji: '🪰',
    rhsUrl: 'https://www.rhs.org.uk/biodiversity/carrot-fly',
    tips: [
      { icon: '🧅', label: 'Allium companion', detail: 'Interplant with onions, chives, or spring onions — scent confuses the fly.' },
      { icon: '🛡️', label: 'Fleece barrier', detail: 'Cover with fine mesh (Enviromesh) from sowing — fly can\'t reach soil to lay eggs.' },
      { icon: '📏', label: 'Height barrier', detail: 'Carrot fly flies below 60cm. A 60cm-tall barrier around the bed blocks them.' },
      { icon: '🌿', label: 'Thin on still days', detail: 'The smell of bruised carrot foliage attracts them — thin on calm evenings.' },
    ],
  },
  whitefly: {
    emoji: '🦟',
    rhsUrl: 'https://www.rhs.org.uk/biodiversity/glasshouse-whitefly',
    tips: [
      { icon: '💛', label: 'Yellow sticky traps', detail: 'Hang yellow sticky cards among plants — whitefly are attracted to the colour.' },
      { icon: '🌿', label: 'Basil companion', detail: 'Plant basil next to tomatoes — its oils repel whitefly.' },
      { icon: '💦', label: 'Soap spray', detail: 'Spray dilute washing-up liquid on undersides of leaves. Repeat weekly.' },
      { icon: '🌬️', label: 'Ventilation', detail: 'In conservatory: open vents to reduce humidity. Whitefly thrive in still, warm air.' },
    ],
  },
  'powdery mildew': {
    emoji: '🤍',
    rhsUrl: 'https://www.rhs.org.uk/disease/powdery-mildews',
    tips: [
      { icon: '💧', label: 'Water at base', detail: 'Water soil, not leaves. Wet foliage promotes fungal spread.' },
      { icon: '✂️', label: 'Remove affected leaves', detail: 'Cut off badly affected leaves. Don\'t compost them — bin or burn.' },
      { icon: '🥛', label: 'Milk spray', detail: 'Mix 1 part milk to 9 parts water. Spray weekly as preventative.' },
      { icon: '🌬️', label: 'Improve airflow', detail: 'Space plants properly and prune to allow air circulation between stems.' },
    ],
  },
  'grey mould': {
    emoji: '🩶',
    rhsUrl: 'https://www.rhs.org.uk/disease/grey-moulds',
    tips: [
      { icon: '✂️', label: 'Remove dead tissue', detail: 'Cut away any dead or dying plant material immediately — mould feeds on decay.' },
      { icon: '🌬️', label: 'Improve airflow', detail: 'Don\'t overcrowd. Good ventilation is the #1 prevention.' },
      { icon: '🧅', label: 'Chive companion', detail: 'Chives near strawberries reduce grey mould — allium compounds inhibit the fungus.' },
      { icon: '🌧️', label: 'Avoid overhead watering', detail: 'Water at the base to keep foliage dry. Mould needs wet surfaces to germinate.' },
    ],
  },
  'blight': {
    emoji: '🟤',
    rhsUrl: 'https://www.rhs.org.uk/disease/potato-and-tomato-blight',
    tips: [
      { icon: '🛡️', label: 'Blight-resistant varieties', detail: 'Choose varieties like "Crimson Crush" or "Sarpo Mira" bred for blight resistance.' },
      { icon: '🌧️', label: 'Watch for warm rain', detail: 'Blight spreads in warm, wet weather (Smith periods). Cover with fleece if forecast.' },
      { icon: '✂️', label: 'Remove immediately', detail: 'At first sign (brown patches on leaves), remove all affected foliage. Don\'t compost.' },
      { icon: '📏', label: 'Space well', detail: 'Good air circulation between plants slows spore spread.' },
    ],
  },
  'caterpillars': {
    emoji: '🐛',
    rhsUrl: 'https://www.rhs.org.uk/biodiversity/caterpillars',
    tips: [
      { icon: '🛡️', label: 'Butterfly netting', detail: 'Cover brassicas with fine mesh to prevent butterflies laying eggs.' },
      { icon: '👀', label: 'Check undersides', detail: 'Inspect leaf undersides weekly — remove yellow egg clusters by hand.' },
      { icon: '🐦', label: 'Encourage birds', detail: 'Hang a bird feeder nearby — blue tits eat caterpillars voraciously.' },
      { icon: '🌿', label: 'Companion: sage & rosemary', detail: 'Strong aromatics confuse cabbage white butterflies\' scent navigation.' },
    ],
  },
  general: {
    emoji: '🐛',
    tips: [
      { icon: '👀', label: 'Regular checks', detail: 'Inspect plants twice weekly — catch problems early before they spread.' },
      { icon: '🌸', label: 'Attract predators', detail: 'Plant calendula, fennel, and yarrow to attract ladybirds, hoverflies, and lacewings.' },
      { icon: '🧹', label: 'Garden hygiene', detail: 'Remove dead leaves and debris — pests overwinter in decaying material.' },
      { icon: '🔄', label: 'Crop rotation', detail: 'Don\'t grow the same family in the same spot two years running.' },
    ],
  },
};

interface WeatherDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  rain: number;
  code: number;
}

// ── Priority Task Checklist ──────────────────────────────────────────────────
// Phase-aware tasks ranked by priority. Setup + Late Start + Maintenance.
// Persists completed state in localStorage.

interface PriorityTask {
  id: string;
  priority: number; // 1 = highest
  label: string;
  detail: string;
  phases: Phase[]; // which phases this task appears in
  category: 'setup' | 'planting' | 'maintenance' | 'shopping';
  oneTime: boolean;
  deadline?: string; // "Do by" date, e.g. "Apr 10" or "May 15"
  buyUrl?: string; // link for shopping items
}

const PRIORITY_TASKS: PriorityTask[] = [
  // ── SETUP (one-time) ──
  { id: 'buy-compost', priority: 1, label: 'Buy peat-free compost + perlite', detail: 'Mix 3:1 ratio. Get at least 100L for two GreenStalks.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'Apr 14', buyUrl: 'https://www.thompson-morgan.com/p/peat-free-multipurpose-compost/t67890' },
  { id: 'buy-seed-trays', priority: 2, label: 'Buy seed trays + small pots', detail: 'Start seeds indoors on any sunny windowsill.', phases: ['PRE_MOVE'], category: 'shopping', oneTime: true, deadline: 'Apr 8', buyUrl: 'https://www.thompson-morgan.com/c/seed-trays-and-pots' },
  { id: 'sow-tomato-indoor', priority: 3, label: 'Sow tomato seeds indoors', detail: 'Tumbling Tom needs 6-8 weeks to transplant size. Start NOW.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 10', buyUrl: 'https://www.thompson-morgan.com/p/tomato-tumbling-tom-red/t59034' },
  { id: 'sow-basil-indoor', priority: 4, label: 'Sow basil seeds indoors', detail: 'Needs warmth to germinate. Windowsill or conservatory.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 10', buyUrl: 'https://www.thompson-morgan.com/p/basil-sweet-genovese/t55100' },
  { id: 'sow-courgette-indoor', priority: 5, label: 'Sow courgette seeds indoors', detail: 'One seed per 9cm pot. Grows fast — sow 4 weeks before transplant.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 20' },
  { id: 'order-strawberries', priority: 6, label: 'Order strawberry plants online', detail: 'Buy as potted plants (not seed). Everbearing variety for all-summer harvest.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'Apr 14', buyUrl: 'https://www.thompson-morgan.com/p/strawberry-just-add-cream/t66823' },
  { id: 'buy-sweet-pea-plugs', priority: 7, label: 'Buy sweet pea plug plants', detail: 'Too late to start from seed (should have been February). Buy as plugs.', phases: ['PRE_MOVE', 'NO_GEAR', 'EARLY_SEASON'], category: 'shopping', oneTime: true, deadline: 'May 1', buyUrl: 'https://www.thompson-morgan.com/p/sweet-pea-spencer-mixed/t10886' },
  { id: 'assess-garden', priority: 8, label: 'Assess garden: photos + sun patterns', detail: 'Take photos from every angle. Note morning vs afternoon sun on the terrace.', phases: ['NO_GEAR'], category: 'setup', oneTime: true, deadline: 'Apr 20' },
  { id: 'position-greenstalks', priority: 9, label: 'Position GreenStalks on sunniest spot', detail: 'Use the Sun Heatmap on the Garden page. Aim for 6+ hours direct sun.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 16' },
  { id: 'fill-greenstalks', priority: 10, label: 'Fill GreenStalks with compost mix', detail: '3:1 peat-free compost to perlite. Add slow-release fertiliser (NPK 14-14-14).', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 17' },
  { id: 'check-drainage', priority: 11, label: 'Check all GreenStalk drainage holes', detail: 'Poke a pencil through each pocket drain. Blocked drains = root rot.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 17' },
  { id: 'test-watering', priority: 12, label: 'Fill top reservoir + test water flow', detail: 'Water should trickle through all 5 tiers evenly. Adjust perlite ratio if pooling.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 18' },
  { id: 'setup-titan-cages', priority: 13, label: 'Set up Titan cages for climbers', detail: 'Allocate: 2x runner beans, 2x cucumbers, 2x cordon tomatoes (if in-ground).', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 25' },
  { id: 'transplant-seedlings', priority: 14, label: 'Transplant indoor seedlings to GreenStalks', detail: 'Harden off for 7 days first. Move outside during day, in at night.', phases: ['EARLY_SEASON'], category: 'planting', oneTime: true, deadline: 'May 25' },
  { id: 'direct-sow-salad', priority: 15, label: 'Direct sow: radish, lettuce, rocket, peas', detail: 'Safe late-start crops. Radish ready in 25 days, lettuce in 30.', phases: ['EARLY_SEASON', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'May 30' },
  { id: 'sow-beans', priority: 16, label: 'Direct sow French beans + runner beans', detail: 'Beans from seed are fine in late May. Sow 5cm deep, 15cm apart.', phases: ['EARLY_SEASON'], category: 'planting', oneTime: true, deadline: 'Jun 7' },
  { id: 'buy-herb-plants', priority: 17, label: 'Buy potted herbs: mint, chives, thyme, rosemary', detail: 'Garden centre potted herbs establish faster than seed at this stage.', phases: ['NO_GEAR', 'EARLY_SEASON'], category: 'shopping', oneTime: true, deadline: 'May 20', buyUrl: 'https://www.thompson-morgan.com/c/herb-plants' },

  // ── ONGOING MAINTENANCE (recurring) ──
  { id: 'water-daily', priority: 20, label: 'Water GreenStalks', detail: 'Daily in spring/autumn, twice daily June–August. Fill the top reservoir.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'pest-check', priority: 21, label: 'Check for pests (undersides of leaves)', detail: 'Look for aphids, whitefly, caterpillars. Check twice weekly minimum.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'feed-weekly', priority: 22, label: 'Liquid feed tomatoes + peppers', detail: 'Tomato feed (high potash) once flowering starts. Weekly through summer.', phases: ['PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false, buyUrl: 'https://www.thompson-morgan.com/p/tomorite-concentrated-tomato-food/t69481' },
  { id: 'harvest-daily', priority: 23, label: 'Harvest ripe crops daily', detail: 'Regular picking encourages more fruit. Don\'t let beans go stringy.', phases: ['PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'succession-sow', priority: 24, label: 'Succession sow salads every 2 weeks', detail: 'Lettuce, rocket, radish — keep sowing for continuous harvest.', phases: ['EARLY_SEASON', 'PEAK_SEASON'], category: 'planting', oneTime: false },
  { id: 'rotate-greenstalks', priority: 25, label: 'Rotate GreenStalks 90° every 2 weeks', detail: 'Ensures even sun exposure on all sides.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
];

const CHECKLIST_STORAGE_KEY = 'garden-plotter-checklist';

function loadChecklist(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveChecklist(completed: Set<string>) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...completed]));
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  setup: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', label: '🔧 Setup' },
  planting: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: '🌱 Planting' },
  maintenance: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: '🔄 Ongoing' },
  shopping: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', label: '🛒 Buy' },
};

// ── Component ────────────────────────────────────────────────────────────────

export function TodayPage() {
  const region = useRegion();
  const { plants, plantMap } = usePlantDb(region);
  const { companionMap } = useCompanionDb();
  const towers = usePlannerStore((s) => s.towers);
  const settings = usePlannerStore((s) => s.settings);
  const gardenCells = useGardenStore((s) => s.garden.cells);

  const [weather, setWeather] = useState<WeatherDay[] | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => loadChecklist());

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      saveChecklist(next);
      return next;
    });
  };

  const today = new Date();
  const month = today.getMonth() + 1;
  const phase = getPhase(today);
  const phaseInfo = PHASE_LABELS[phase];

  // ── Fetch weather ──────────────────────────────────────────────────────
  useEffect(() => {
    const lat = settings.latitude || 51.3867;
    const lng = settings.longitude || -0.4175;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Europe/London&forecast_days=3`)
      .then((r) => r.json())
      .then((data) => {
        if (data.daily) {
          const days: WeatherDay[] = data.daily.time.map((t: string, i: number) => ({
            date: t,
            maxTemp: data.daily.temperature_2m_max[i],
            minTemp: data.daily.temperature_2m_min[i],
            rain: data.daily.precipitation_sum[i],
            code: data.daily.weathercode[i],
          }));
          setWeather(days);
        }
      })
      .catch(() => setWeatherError(true));
  }, [settings.latitude, settings.longitude]);

  // ── Collect planted plants ─────────────────────────────────────────────
  const greenstalkSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const t of towers) for (const tier of t.tiers) for (const p of tier.pockets) if (p.plantSlug) slugs.add(p.plantSlug);
    return slugs;
  }, [towers]);

  const gardenSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const row of gardenCells) for (const c of row) if (c.plantSlug) slugs.add(c.plantSlug);
    return slugs;
  }, [gardenCells]);

  const allPlantedSlugs = useMemo(() => new Set([...greenstalkSlugs, ...gardenSlugs]), [greenstalkSlugs, gardenSlugs]);
  const plantedPlants = useMemo(() => [...allPlantedSlugs].map((s) => plantMap.get(s)).filter(Boolean) as Plant[], [allPlantedSlugs, plantMap]);

  // ── Garden Grade (holistic rating across both systems) ────────────────
  const grade: GardenGrade = useMemo(() => {
    return gradeGarden(
      [...greenstalkSlugs], [...gardenSlugs],
      plants, plantMap, companionMap
    );
  }, [greenstalkSlugs, gardenSlugs, plants, plantMap, companionMap]);

  // ── Derived task lists ────────────────────────────────────────────────
  const sowIndoorsNow = useMemo(() => plants.filter((p) => isInWindow(month, p.plantingWindow.sowIndoors)), [plants, month]);
  const sowOutdoorsNow = useMemo(() => plants.filter((p) => isInWindow(month, p.plantingWindow.sowOutdoors)), [plants, month]);
  const transplantNow = useMemo(() => plantedPlants.filter((p) => isInWindow(month, p.plantingWindow.transplant)), [plantedPlants, month]);
  const harvestNow = useMemo(() => plantedPlants.filter((p) => isInWindow(month, p.plantingWindow.harvest)), [plantedPlants, month]);

  const needsFeeding = useMemo(() => plantedPlants.filter((p) => p.inGround?.feeding && !p.inGround.feeding.toLowerCase().includes('none')), [plantedPlants]);
  const pestWatch = useMemo(() => {
    const pests = new Map<string, string[]>();
    for (const p of plantedPlants) {
      for (const pest of p.inGround?.pests ?? []) {
        if (!pests.has(pest)) pests.set(pest, []);
        pests.get(pest)!.push(p.commonName);
      }
    }
    return pests;
  }, [plantedPlants]);

  // Shopping: plants in sowing window but not yet planted
  const buyAsPlugs = useMemo(() => plants.filter((p) =>
    !allPlantedSlugs.has(p.slug) &&
    p.greenstalkSuitability !== 'unsuitable' &&
    isInWindow(month, p.plantingWindow.transplant) &&
    !isInWindow(month, p.plantingWindow.sowIndoors) &&
    !isInWindow(month, p.plantingWindow.sowOutdoors)
  ).slice(0, 8), [plants, allPlantedSlugs, month]);

  const buySeeds = useMemo(() => plants.filter((p) =>
    !allPlantedSlugs.has(p.slug) &&
    (isInWindow(month, p.plantingWindow.sowIndoors) || isInWindow(month, p.plantingWindow.sowOutdoors))
  ).slice(0, 10), [plants, allPlantedSlugs, month]);

  // Weather-based advice
  const frostRisk = weather && weather.some((d) => d.minTemp < 3);
  const rainToday = weather && weather[0]?.rain > 1;
  const hotDay = weather && weather[0]?.maxTemp > 25;

  // Countdowns
  const daysToMove = daysBetween(today, MOVE_IN);
  const daysToGear = daysBetween(today, GEAR_ARRIVES);
  const daysToFrost = daysBetween(today, FIRST_FROST);
  const earliestHarvest = plantedPlants.length > 0
    ? Math.min(...plantedPlants.map((p) => p.daysToHarvest[0]))
    : null;

  // Priority tasks for current phase, sorted by priority
  const phaseTasks = useMemo(() => {
    return PRIORITY_TASKS
      .filter((t) => t.phases.includes(phase))
      .sort((a, b) => a.priority - b.priority);
  }, [phase]);

  const completedCount = phaseTasks.filter((t) => completedTasks.has(t.id)).length;
  const totalTasks = phaseTasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
                {phaseInfo.emoji} What To Do Right Now
              </h1>
              <p className="text-sm text-stone-400 mt-1">
                {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-${phaseInfo.color}-100 text-${phaseInfo.color}-800 dark:bg-${phaseInfo.color}-900/30 dark:text-${phaseInfo.color}-300`}>
              {phaseInfo.emoji} {phaseInfo.label}
            </div>
          </div>
        </div>

        {/* ── Countdowns ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {daysToMove > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{daysToMove}</div>
              <div className="text-[10px] font-medium text-amber-800 dark:text-amber-300">days to move-in</div>
            </div>
          )}
          {daysToGear > 0 && (
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800 p-3 text-center">
              <div className="text-2xl font-bold text-sky-600">{daysToGear}</div>
              <div className="text-[10px] font-medium text-sky-800 dark:text-sky-300">days to GreenStalks</div>
            </div>
          )}
          {daysToFrost > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{daysToFrost}</div>
              <div className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">days left in season</div>
            </div>
          )}
          <div className="bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-3 text-center">
            <div className="text-2xl font-bold text-stone-600 dark:text-stone-300">{allPlantedSlugs.size}</div>
            <div className="text-[10px] font-medium text-stone-500 dark:text-stone-400">plants selected</div>
          </div>
        </div>

        {/* ── Weather ────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
          <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-3">3-Day Forecast — Surrey</h2>
          {weather ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {weather.map((d, i) => {
                  const dt = new Date(d.date);
                  return (
                    <div key={d.date} className={`rounded-xl p-3 text-center ${i === 0 ? 'bg-stone-50 dark:bg-stone-700 ring-2 ring-emerald-500/30' : 'bg-stone-50 dark:bg-stone-700/50'}`}>
                      <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">{i === 0 ? 'Today' : DAY_NAMES[dt.getDay()]}</div>
                      <div className="text-2xl my-1">{weatherEmoji(d.code)}</div>
                      <div className="text-xs font-bold text-stone-800 dark:text-stone-200">{Math.round(d.maxTemp)}° / {Math.round(d.minTemp)}°</div>
                      {d.rain > 0 && <div className="text-[10px] text-sky-600">💧 {d.rain.toFixed(1)}mm</div>}
                    </div>
                  );
                })}
              </div>
              {/* Weather-based advice */}
              <div className="space-y-1.5">
                {frostRisk && (
                  <div className="text-xs px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium">
                    ❄️ <strong>Frost risk!</strong> Temps dropping below 3°C — cover tender seedlings or bring pots into the conservatory tonight.
                  </div>
                )}
                {rainToday ? (
                  <div className="text-xs px-3 py-2 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 rounded-lg">
                    🌧️ Rain today — skip watering. Good day for indoor seed starting, planning, or weeding (soil is soft).
                  </div>
                ) : (
                  <div className="text-xs px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg">
                    ☀️ No rain forecast — water GreenStalks and any new transplants this evening.
                  </div>
                )}
                {hotDay && (
                  <div className="text-xs px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg">
                    🌡️ Hot day (25°+) — water deeply in the evening, not midday. Lettuce and spinach may bolt.
                  </div>
                )}
              </div>
            </>
          ) : weatherError ? (
            <p className="text-xs text-stone-400">Unable to load weather data. Check your connection.</p>
          ) : (
            <p className="text-xs text-stone-400 animate-pulse">Loading forecast...</p>
          )}
        </div>

        {/* ── Phase Status (compact — details in checklist below) ────── */}
        {(phase === 'PRE_MOVE' || phase === 'NO_GEAR') && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl px-4 py-2.5 text-white shadow-lg flex items-center justify-between">
            <div>
              <span className="font-bold text-sm">
                {phase === 'PRE_MOVE' ? `📦 ${daysToMove} days to move-in` : `🏠 GreenStalks arrive in ${daysToGear} days`}
              </span>
              <span className="text-white/80 text-xs ml-2">
                — see checklist below for your ranked action plan
              </span>
            </div>
          </div>
        )}

        {/* ── Garden Grade (holistic rating) ──────────────────────────── */}
        {grade.totalPlants > 0 && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">📊 Garden Grade</h2>
              <span className="text-[10px] text-stone-400">{grade.uniqueSpecies} species · {grade.totalPlants} plants</span>
            </div>

            <div className="px-4 py-4">
              {/* Grade + Score */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`text-4xl font-black w-16 h-16 rounded-2xl flex items-center justify-center ${
                  grade.score >= 75 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                  grade.score >= 55 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                  'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
                }`}>
                  {grade.letter}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2.5 bg-stone-200 dark:bg-stone-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          grade.score >= 75 ? 'bg-emerald-500' : grade.score >= 55 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${grade.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300">{grade.score}/100</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-stone-400">
                    <span>+{grade.crossSystemBonus} cross-system synergy</span>
                    <span>+{grade.diversityBonus} diversity</span>
                  </div>
                </div>
              </div>

              {/* 5-axis breakdown */}
              <div className="grid grid-cols-5 gap-1.5 mb-4">
                {([
                  { key: 'kidFriendly', label: '🧒 Kids', value: grade.axisAverages.kidFriendly },
                  { key: 'fragrance', label: '🌸 Scent', value: grade.axisAverages.fragrance },
                  { key: 'companion', label: '🤝 Companion', value: grade.axisAverages.companion },
                  { key: 'resilience', label: '💪 Hardy', value: grade.axisAverages.resilience },
                  { key: 'value', label: '💰 Value', value: grade.axisAverages.value },
                ] as const).map((axis) => (
                  <div key={axis.key} className="text-center">
                    <div className="text-[10px] text-stone-400 mb-1">{axis.label}</div>
                    <div className={`text-sm font-bold ${
                      axis.value >= 7 ? 'text-emerald-600 dark:text-emerald-400' :
                      axis.value >= 4 ? 'text-amber-600 dark:text-amber-400' :
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      {axis.value.toFixed(1)}
                    </div>
                    <div className="w-full h-1 bg-stone-200 dark:bg-stone-600 rounded-full mt-0.5">
                      <div
                        className={`h-full rounded-full ${
                          axis.value >= 7 ? 'bg-emerald-500' : axis.value >= 4 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${axis.value * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Strengths and weaknesses */}
              <div className="flex gap-2 mb-3 text-[10px]">
                <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg">
                  Strongest: {grade.topStrength.axis} ({grade.topStrength.score.toFixed(1)})
                </span>
                <span className="px-2 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-lg">
                  Weakest: {grade.topWeakness.axis} ({grade.topWeakness.score.toFixed(1)})
                </span>
              </div>

              {/* Top plant scores */}
              <div className="mb-3">
                <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                  Plant Rankings (all systems combined)
                </div>
                <div className="space-y-1">
                  {grade.plantScores.slice(0, 8).map((ps, i) => (
                    <div key={ps.slug} className="flex items-center gap-2 text-[10px]">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-stone-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-stone-100 dark:bg-stone-600 text-stone-400'
                      }`}>{i + 1}</span>
                      <span>{ps.emoji}</span>
                      <span className="font-medium text-stone-700 dark:text-stone-300 flex-1 truncate">{ps.commonName}</span>
                      <span className="text-[9px] text-stone-400">
                        {ps.location === 'both' ? '🌱+🏡' : ps.location === 'greenstalk' ? '🌱' : '🏡'}
                      </span>
                      <span className={`font-bold ${
                        ps.overall >= 7 ? 'text-emerald-600 dark:text-emerald-400' : ps.overall >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>{ps.overall.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upgrade suggestions */}
              {grade.upgrades.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                    💡 Upgrade Suggestions
                  </div>
                  <div className="space-y-1.5">
                    {grade.upgrades.map((u) => (
                      <div key={`${u.currentSlug}-${u.suggestedSlug}`} className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-2.5 py-1.5 text-[10px] flex items-center justify-between gap-2">
                        <div>
                          <span className="text-indigo-700 dark:text-indigo-300">
                            Swap <strong>{u.currentName}</strong> → {u.suggestedEmoji} <strong>{u.suggestedName}</strong>
                          </span>
                          <span className="text-indigo-500 dark:text-indigo-400 ml-1">
                            (+{u.scoreDelta} overall: {u.reason})
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            // One-click swap: replace in the appropriate store
                            if (u.location === 'greenstalk') {
                              const store = usePlannerStore.getState();
                              for (const tower of store.towers) {
                                for (const tier of tower.tiers) {
                                  for (let p = 0; p < tier.pockets.length; p++) {
                                    if (tier.pockets[p].plantSlug === u.currentSlug) {
                                      store.assignPlant(tower.id, tier.tierNumber, p, u.suggestedSlug);
                                      return; // swap first instance only
                                    }
                                  }
                                }
                              }
                            } else {
                              const gStore = useGardenStore.getState();
                              const cells = gStore.garden.cells;
                              for (let r = 0; r < cells.length; r++) {
                                for (let c = 0; c < cells[r].length; c++) {
                                  if (cells[r][c].plantSlug === u.currentSlug) {
                                    gStore.plantInCell(r, c, u.suggestedSlug);
                                    return;
                                  }
                                }
                              }
                            }
                          }}
                          className="shrink-0 px-2 py-1 rounded bg-indigo-600 text-white text-[9px] font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          Swap ↻
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Priority Task Checklist ───────────────────────────────── */}
        {phaseTasks.length > 0 && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">
                  ✅ Your Priority Checklist
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400">{completedCount}/{totalTasks}</span>
                  <div className="w-20 h-1.5 bg-stone-200 dark:bg-stone-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5">
                Ranked by priority for {phaseInfo.label.toLowerCase()}. Check off as you go — progress saves automatically.
              </p>
            </div>

            <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
              {phaseTasks.map((task, i) => {
                const done = completedTasks.has(task.id);
                const cat = CATEGORY_COLORS[task.category];
                return (
                  <div
                    key={task.id}
                    className={`px-4 py-2.5 flex items-start gap-3 cursor-pointer transition-all hover:bg-stone-50 dark:hover:bg-stone-700/30 ${
                      done ? 'opacity-50' : ''
                    }`}
                    onClick={() => toggleTask(task.id)}
                  >
                    {/* Checkbox */}
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-stone-300 dark:border-stone-500'
                    }`}>
                      {done && <span className="text-xs">✓</span>}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${done ? 'line-through text-stone-400' : 'text-stone-800 dark:text-stone-100'}`}>
                          {task.label}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>
                          {cat.label}
                        </span>
                        {!task.oneTime && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-600 text-stone-400">
                            recurring
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className={`text-[10px] ${done ? 'text-stone-300 dark:text-stone-600' : 'text-stone-500 dark:text-stone-400'}`}>
                          {task.detail}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.deadline && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            done ? 'bg-stone-100 dark:bg-stone-600 text-stone-300' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                          }`}>
                            📅 Do by {task.deadline}
                          </span>
                        )}
                        {task.buyUrl && !done && (
                          <a
                            href={task.buyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/40 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            🛒 Buy →
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Priority badge */}
                    <div className={`text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 ${
                      i < 3 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                        : i < 8 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        : 'bg-stone-100 dark:bg-stone-600 text-stone-400'
                    }`}>
                      {i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── This Week's Tasks ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">This Week — {getMonthName(month)}</h2>
          </div>
          <div className="divide-y divide-stone-50 dark:divide-stone-700">
            {/* Sow indoors */}
            {sowIndoorsNow.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-sky-700 dark:text-sky-400 mb-1.5">🏠 Sow Indoors / Conservatory</h3>
                <div className="flex flex-wrap gap-1.5">
                  {sowIndoorsNow.map((p) => (
                    <span key={p.slug} className={`text-[10px] px-2 py-1 rounded-full ${allPlantedSlugs.has(p.slug) ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold' : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'}`}>
                      {p.emoji} {p.commonName} {allPlantedSlugs.has(p.slug) ? '✓' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sow outdoors */}
            {sowOutdoorsNow.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">🌱 Direct Sow Outdoors</h3>
                <div className="flex flex-wrap gap-1.5">
                  {sowOutdoorsNow.map((p) => (
                    <span key={p.slug} className={`text-[10px] px-2 py-1 rounded-full ${allPlantedSlugs.has(p.slug) ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold' : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'}`}>
                      {p.emoji} {p.commonName} {allPlantedSlugs.has(p.slug) ? '✓' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Transplant */}
            {transplantNow.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5">🔄 Ready to Transplant</h3>
                <div className="flex flex-wrap gap-1.5">
                  {transplantNow.map((p) => (
                    <span key={p.slug} className="text-[10px] px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      {p.emoji} {p.commonName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Harvest */}
            {harvestNow.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1.5">🧺 Ready to Harvest</h3>
                <div className="flex flex-wrap gap-1.5">
                  {harvestNow.map((p) => (
                    <span key={p.slug} className="text-[10px] px-2 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-semibold">
                      {p.emoji} {p.commonName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Feeding */}
            {needsFeeding.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-1.5">🧪 Feed This Week</h3>
                <div className="space-y-1">
                  {needsFeeding.slice(0, 6).map((p) => (
                    <div key={p.slug} className="flex items-center gap-2 text-[10px] text-stone-600 dark:text-stone-400">
                      <span>{p.emoji}</span>
                      <span className="font-medium">{p.commonName}:</span>
                      <span className="text-stone-400">{p.inGround.feeding}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pest watch with remedies */}
            {pestWatch.size > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-2">🐛 Pest Watch &amp; Organic Remedies</h3>
                <div className="space-y-2">
                  {[...pestWatch.entries()].slice(0, 8).map(([pest, crops]) => {
                    const remedy = PEST_REMEDIES[pest.toLowerCase()] ?? PEST_REMEDIES['general'];
                    return (
                      <div key={pest} className="bg-orange-50 dark:bg-orange-900/15 rounded-lg p-2.5 border border-orange-100 dark:border-orange-800/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-[11px] text-orange-800 dark:text-orange-300 capitalize flex items-center gap-1.5">
                            {remedy.emoji} {pest}
                            {remedy.rhsUrl && (
                              <a href={remedy.rhsUrl} target="_blank" rel="noopener noreferrer"
                                className="text-[9px] text-orange-500 hover:text-orange-700 dark:hover:text-orange-200 underline font-normal normal-case">
                                ID photos →
                              </a>
                            )}
                          </div>
                          <div className="text-[9px] text-orange-500 dark:text-orange-400/70 shrink-0">
                            Affects: {crops.slice(0, 3).join(', ')}
                          </div>
                        </div>
                        <div className="mt-1.5 space-y-0.5">
                          {remedy.tips.map((tip, i) => (
                            <div key={i} className="text-[10px] text-orange-700 dark:text-orange-300/80 flex items-start gap-1">
                              <span className="shrink-0 mt-px">{tip.icon}</span>
                              <span><strong>{tip.label}:</strong> {tip.detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {plantedPlants.length === 0 && (
              <div className="px-4 py-6 text-center text-stone-400 text-sm">
                <p>No plants selected yet. Add plants to your GreenStalk or Garden to see personalised tasks.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Shopping List ──────────────────────────────────────────── */}
        {(buySeeds.length > 0 || buyAsPlugs.length > 0) && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-3">🛒 Garden Centre Shopping List</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {buySeeds.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">Seeds to Buy (sow now)</h3>
                  <div className="space-y-1">
                    {buySeeds.map((p) => (
                      <div key={p.slug} className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                        <span>{p.emoji}</span> {p.commonName}
                        <span className="text-[9px] text-stone-400">— sow {isInWindow(month, p.plantingWindow.sowIndoors) ? 'indoors' : 'outdoors'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {buyAsPlugs.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">Buy as Plug Plants (too late for seed)</h3>
                  <div className="space-y-1">
                    {buyAsPlugs.map((p) => (
                      <div key={p.slug} className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                        <span>{p.emoji}</span> {p.commonName}
                        <span className="text-[9px] text-stone-400">— transplant {getMonthName(p.plantingWindow.transplant?.[0] ?? month)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Phase Guidance ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl p-5 text-white">
          <h2 className="text-lg font-bold mb-3">{phaseInfo.emoji} {phaseInfo.label} — What This Means</h2>
          {phase === 'PRE_MOVE' && (
            <div className="text-sm text-stone-300">
              <p>Your priority checklist above has everything ranked with deadlines and buy links. Mid-May is NOT too late — most Surrey gardeners don't plant tender crops until after the May bank holiday.</p>
            </div>
          )}
          {phase === 'NO_GEAR' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p>You're in the house! GreenStalks arrive in <strong className="text-white">{daysToGear} days</strong>. The conservatory is your propagation HQ.</p>
              <p className="font-semibold text-emerald-400">This is your head-start window:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Start seeds in the conservatory</strong> — tomatoes, basil, courgettes, herbs in small pots on the windowsill</li>
                <li><strong className="text-white">Assess the garden</strong> — take photos from every angle, measure sun patterns morning vs afternoon</li>
                <li><strong className="text-white">Direct sow fast crops</strong> in any pots you have: lettuce, radish, rocket, spring onions</li>
                <li><strong className="text-white">Plan GreenStalk positions</strong> — the back patio gets the best south-east sun</li>
                <li><strong className="text-white">Buy plug plants</strong> from garden centres for anything that needed an earlier start</li>
              </ol>
              <p className="text-stone-400 text-xs mt-2">By the time GreenStalks arrive, you'll have 4-6 week old seedlings ready to transplant immediately. No time lost.</p>
            </div>
          )}
          {phase === 'EARLY_SEASON' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p><strong className="text-white">Your GreenStalks are here!</strong> This is the big planting push. Every week counts.</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Set up GreenStalks on the sunniest patio spot</strong> (check the Sun Map page)</li>
                <li><strong className="text-white">Transplant all indoor seedlings</strong> into GreenStalk pockets</li>
                <li><strong className="text-white">Direct sow beans, courgettes, herbs</strong> — still plenty of time</li>
                <li><strong className="text-white">Plant strawberry plants</strong> in top tiers (elevated = no slugs)</li>
                <li><strong className="text-white">Water daily</strong> — GreenStalks dry out faster than ground beds</li>
              </ol>
            </div>
          )}
          {phase === 'PEAK_SEASON' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p><strong className="text-white">Peak growing season.</strong> Your garden is producing. Focus on harvesting and maintenance.</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Harvest daily</strong> — regular picking encourages more production</li>
                <li><strong className="text-white">Water GreenStalks every evening</strong> — they dry fast in summer</li>
                <li><strong className="text-white">Feed fortnightly</strong> with liquid fertiliser (tomato feed for fruiting plants)</li>
                <li><strong className="text-white">Succession sow</strong> lettuce and radish every 2 weeks for continuous supply</li>
                <li><strong className="text-white">Watch for pests</strong> — check undersides of leaves for aphids daily</li>
              </ol>
            </div>
          )}
          {phase === 'LATE_SEASON' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p><strong className="text-white">Season winding down.</strong> {daysToFrost} days until likely first frost.</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Harvest everything before frost</strong> — green tomatoes can ripen on a windowsill</li>
                <li><strong className="text-white">Sow green manures</strong> (crimson clover, phacelia) on bare beds</li>
                <li><strong className="text-white">Move tender plants to conservatory</strong> — lemon, olive, frost-sensitive herbs</li>
                <li><strong className="text-white">Clean GreenStalks</strong> and store pockets for winter</li>
                <li><strong className="text-white">Save seeds</strong> from your best performers</li>
              </ol>
            </div>
          )}
          {phase === 'DORMANT' && (
            <div className="space-y-2 text-sm text-stone-300">
              <p><strong className="text-white">Winter planning season.</strong> The garden is resting. You're not.</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><strong className="text-white">Review this year</strong> — what worked, what didn't</li>
                <li><strong className="text-white">Order seeds</strong> for next season (January sales are best)</li>
                <li><strong className="text-white">Plan next year's layout</strong> — use the Garden Plotter to try new arrangements</li>
                <li><strong className="text-white">Check stored GreenStalks</strong> for damage</li>
                <li><strong className="text-white">Tend conservatory plants</strong> — water sparingly, ensure frost-free</li>
              </ol>
            </div>
          )}
        </div>

        <p className="text-[10px] text-stone-400 text-center pb-4">
          Tasks update automatically based on today's date, your selected plants, and live weather data from Open-Meteo.
        </p>
      </div>
    </div>
  );
}
