/**
 * Shared priority task system — single source of truth for Dashboard + TodayPage.
 *
 * Extracted to eliminate duplication between DashboardPage.tsx and TodayPage.tsx.
 * Both pages import from here.
 */

// ── Key dates ────────────────────────────────────────────────────────────────
export const MOVE_IN = new Date('2026-04-17');
export const GEAR_ARRIVES = new Date('2026-05-15');
export const FIRST_FROST = new Date('2026-10-25');

export type Phase = 'PRE_MOVE' | 'NO_GEAR' | 'EARLY_SEASON' | 'PEAK_SEASON' | 'LATE_SEASON' | 'DORMANT';

export function getPhase(d: Date): Phase {
  if (d < MOVE_IN) return 'PRE_MOVE';
  if (d < GEAR_ARRIVES) return 'NO_GEAR';
  const m = d.getMonth() + 1;
  if (m <= 6) return 'EARLY_SEASON';
  if (m <= 8) return 'PEAK_SEASON';
  if (m <= 10) return 'LATE_SEASON';
  return 'DORMANT';
}

export const PHASE_LABELS: Record<Phase, { label: string; emoji: string }> = {
  PRE_MOVE: { label: 'Pre-Move', emoji: '📦' },
  NO_GEAR: { label: 'Conservatory Season', emoji: '🏠' },
  EARLY_SEASON: { label: 'Setup & Planting', emoji: '🌱' },
  PEAK_SEASON: { label: 'Peak Growing', emoji: '☀️' },
  LATE_SEASON: { label: 'Harvest & Wind Down', emoji: '🍂' },
  DORMANT: { label: 'Planning Season', emoji: '❄️' },
};

export const PHASE_BADGE_COLORS: Record<Phase, string> = {
  PRE_MOVE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  NO_GEAR: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  EARLY_SEASON: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  PEAK_SEASON: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  LATE_SEASON: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  DORMANT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Priority Tasks ─────────────────────────────────────────────────────────

export interface PriorityTask {
  id: string;
  priority: number;
  label: string;
  detail: string;
  phases: Phase[];
  category: 'setup' | 'planting' | 'maintenance' | 'shopping';
  oneTime: boolean;
  deadline?: string;       // Display string
  deadlineDate?: string;   // ISO date for comparison (2026-MM-DD)
  buyUrl?: string;
  /** When overdue, what should the user do instead? */
  overdueAlt?: string;
}

export const PRIORITY_TASKS: PriorityTask[] = [
  // ── One-time setup & planting tasks ──────────────────────────────────────
  { id: 'buy-compost', priority: 1, label: 'Buy peat-free compost + perlite', detail: 'Mix 3:1 ratio. Get at least 100L for two GreenStalks. Can order online now or buy at garden centre after move-in.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'Apr 20', deadlineDate: '2026-04-20', buyUrl: 'https://www.thompson-morgan.com/p/peat-free-multipurpose-compost/t67890' },
  { id: 'buy-seed-trays', priority: 2, label: 'Buy seed trays + small pots', detail: 'Start seeds indoors on conservatory windowsill. First weekend after move-in.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'Apr 19', deadlineDate: '2026-04-19', buyUrl: 'https://www.thompson-morgan.com/c/seed-trays-and-pots' },
  { id: 'sow-tomato-indoor', priority: 3, label: 'Sow tomato seeds indoors', detail: 'Tumbling Tom needs 6-8 weeks to transplant size. Sow first weekend in new house.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 20', deadlineDate: '2026-04-20', overdueAlt: 'Getting tight for seed — buy Tumbling Tom transplants from garden centre in mid-May if you miss this window.', buyUrl: 'https://www.thompson-morgan.com/p/tomato-tumbling-tom-red/t59034' },
  { id: 'sow-basil-indoor', priority: 4, label: 'Sow basil seeds indoors', detail: 'Needs warmth to germinate. Conservatory windowsill ideal.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 22', deadlineDate: '2026-04-22', overdueAlt: 'Still OK until early May from seed — or buy basil plug plants from garden centre.', buyUrl: 'https://www.thompson-morgan.com/p/basil-sweet-genovese/t55100' },
  { id: 'sow-courgette-indoor', priority: 5, label: 'Sow courgette seeds indoors', detail: 'One seed per 9cm pot. Grows fast — sow 4 weeks before transplant.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 25', deadlineDate: '2026-04-25', overdueAlt: 'Still viable until end of May — sow now or buy transplants.' },
  { id: 'divide-strawberries', priority: 6, label: 'Divide existing strawberry runners from raised bed', detail: 'FREE strawberries! The raised bed already has healthy runners (photo-verified). Snip rooted plantlets, pot into 9cm pots, keep watered 2-3 weeks, then transplant to GreenStalk tiers 3-4 when gear arrives. No need to buy new plants.', phases: ['NO_GEAR', 'EARLY_SEASON'], category: 'planting', oneTime: true, deadline: 'May 10', deadlineDate: '2026-05-10', overdueAlt: 'Still fine to divide until June — runners keep producing all summer.' },
  { id: 'buy-sweet-pea-plugs', priority: 7, label: 'Buy sweet pea plug plants', detail: 'Too late to start from seed (should have been February). Buy as plugs.', phases: ['PRE_MOVE', 'NO_GEAR', 'EARLY_SEASON'], category: 'shopping', oneTime: true, deadline: 'May 1', deadlineDate: '2026-05-01', overdueAlt: 'Still available as plugs through May — buy now before stock runs out.', buyUrl: 'https://www.thompson-morgan.com/p/sweet-pea-spencer-mixed/t10886' },
  { id: 'assess-garden', priority: 8, label: 'Assess garden: photos + sun patterns', detail: 'Take photos from every angle. Note morning vs afternoon sun on the terrace. Use Photo Coach tab!', phases: ['NO_GEAR'], category: 'setup', oneTime: true, deadline: 'Apr 26', deadlineDate: '2026-04-26' },
  { id: 'position-greenstalks', priority: 9, label: 'Position GreenStalks on sunniest spot', detail: 'Use the Sun Heatmap on the Garden page. Aim for 6+ hours direct sun.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 16', deadlineDate: '2026-05-16' },
  { id: 'fill-greenstalks', priority: 10, label: 'Fill GreenStalks with compost mix', detail: '3:1 peat-free compost to perlite. Add slow-release fertiliser (NPK 14-14-14).', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 17', deadlineDate: '2026-05-17' },
  { id: 'check-drainage', priority: 11, label: 'Check all GreenStalk drainage holes', detail: 'Poke a pencil through each pocket drain. Blocked drains = root rot.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 17', deadlineDate: '2026-05-17' },
  { id: 'test-watering', priority: 12, label: 'Fill top reservoir + test water flow', detail: 'Water should trickle through all 5 tiers evenly. Adjust perlite ratio if pooling.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 18', deadlineDate: '2026-05-18' },
  { id: 'setup-titan-cages', priority: 13, label: 'Set up Titan cages for climbers', detail: 'Allocate: 2x runner beans, 2x cucumbers, 2x cordon tomatoes (if in-ground).', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 25', deadlineDate: '2026-05-25' },
  { id: 'transplant-seedlings', priority: 14, label: 'Transplant indoor seedlings to GreenStalks', detail: 'Harden off for 7 days first. Move outside during day, in at night.', phases: ['EARLY_SEASON'], category: 'planting', oneTime: true, deadline: 'May 25', deadlineDate: '2026-05-25', overdueAlt: 'Transplant ASAP — each day of delay reduces growing season.' },
  { id: 'direct-sow-salad', priority: 15, label: 'Direct sow: radish, lettuce, rocket, peas', detail: 'Safe late-start crops. Radish ready in 25 days, lettuce in 30.', phases: ['EARLY_SEASON', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'May 30', deadlineDate: '2026-05-30' },
  { id: 'sow-beans', priority: 16, label: 'Direct sow French beans + runner beans', detail: 'Beans from seed are fine in late May. Sow 5cm deep, 15cm apart.', phases: ['EARLY_SEASON'], category: 'planting', oneTime: true, deadline: 'Jun 7', deadlineDate: '2026-06-07', overdueAlt: 'Still OK until mid-June — sow now for late-season harvest.' },
  { id: 'buy-herb-plants', priority: 17, label: 'Buy potted herbs: mint, chives, thyme, rosemary', detail: 'Garden centre potted herbs establish faster than seed at this stage.', phases: ['NO_GEAR', 'EARLY_SEASON'], category: 'shopping', oneTime: true, deadline: 'May 20', deadlineDate: '2026-05-20', buyUrl: 'https://www.thompson-morgan.com/c/herb-plants' },

  // ── Garden centre trips (weekly, max 1/week) ────────────────────────────
  { id: 'gc-squires-week1', priority: 30, label: '🚗 Squires Hersham — Week 1', detail: 'Buy: broccoli 6-pack plugs, Brussels sprout 6-pack plugs, onion sets, seed trays, peat-free compost. Squires has the best plug selection locally — under 10 min from Walton.', phases: ['NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'Apr 26', deadlineDate: '2026-04-26', overdueAlt: 'Squires will still have plugs through May — go ASAP for best selection.', buyUrl: 'https://www.squiresgardencentres.co.uk/hersham/' },
  { id: 'gc-wisley-week2', priority: 31, label: '🚗 RHS Wisley — Week 2', detail: 'Buy: tomato starts (Tumbling Tom + Gardener\'s Delight), thyme plants, French lavender, sweet marjoram. Wisley has RHS-gold varieties hardened off for Surrey. More expensive than Squires but premium quality.', phases: ['NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'May 3', deadlineDate: '2026-05-03', overdueAlt: 'Still available through May — herb plants are stocked all season.', buyUrl: 'https://www.rhs.org.uk/gardens/wisley' },
  { id: 'gc-squires-week3', priority: 32, label: '🚗 Squires Hersham — Week 3', detail: 'Buy: chilli pepper plugs, sweet pepper plugs, aubergine plugs. Too late for these from seed — 6-pack plugs are the way. Call ahead to check stock.', phases: ['NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'May 10', deadlineDate: '2026-05-10', overdueAlt: 'Pepper and aubergine plugs sell out fast — check Squires stock online or call ahead.' },

  // ── Recurring maintenance ────────────────────────────────────────────────
  { id: 'water-daily', priority: 20, label: 'Water GreenStalks', detail: 'Daily in spring/autumn, twice daily June–August. Fill the top reservoir.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'pest-check', priority: 21, label: 'Check for pests (undersides of leaves)', detail: 'Look for aphids, whitefly, caterpillars. Check twice weekly minimum.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'feed-weekly', priority: 22, label: 'Liquid feed tomatoes + peppers', detail: 'Tomato feed (high potash) once flowering starts. Weekly through summer.', phases: ['PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false, buyUrl: 'https://www.thompson-morgan.com/p/tomorite-concentrated-tomato-food/t69481' },
  { id: 'harvest-daily', priority: 23, label: 'Harvest ripe crops daily', detail: 'Regular picking encourages more fruit. Don\'t let beans go stringy.', phases: ['PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'succession-sow', priority: 24, label: 'Succession sow salads every 2 weeks', detail: 'Lettuce, rocket, radish — keep sowing for continuous harvest.', phases: ['EARLY_SEASON', 'PEAK_SEASON'], category: 'planting', oneTime: false },
  { id: 'rotate-greenstalks', priority: 25, label: 'Rotate GreenStalks 90° every 2 weeks', detail: 'Ensures even sun exposure on all sides.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
];

// ── Checklist persistence ───────────────────────────────────────────────────
export const CHECKLIST_STORAGE_KEY = 'garden-plotter-checklist';

export function loadChecklist(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch { return new Set(); }
}

export function saveChecklist(completed: Set<string>) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...completed]));
}

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  setup: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', label: '🔧 Setup' },
  planting: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: '🌱 Planting' },
  maintenance: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: '🔄 Ongoing' },
  shopping: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', label: '🛒 Buy' },
};
