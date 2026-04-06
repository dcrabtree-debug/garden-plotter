import { useState, useEffect, useMemo } from 'react';
import { usePlannerStore } from '../state/planner-store';
import { useGardenStore } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import type { Plant } from '../types/plant';

// ── Key dates ────────────────────────────────────────────────────────────────
const MOVE_IN = new Date('2026-04-17');
const GEAR_ARRIVES = new Date('2026-05-15');
const FIRST_FROST = new Date('2026-10-25');

type Phase = 'PRE_MOVE' | 'NO_GEAR' | 'EARLY_SEASON' | 'PEAK_SEASON' | 'LATE_SEASON' | 'DORMANT';

function getPhase(d: Date): Phase {
  if (d < MOVE_IN) return 'PRE_MOVE';
  if (d < GEAR_ARRIVES) return 'NO_GEAR';
  const m = d.getMonth() + 1;
  if (m <= 6) return 'EARLY_SEASON';
  if (m <= 8) return 'PEAK_SEASON';
  if (m <= 10) return 'LATE_SEASON';
  return 'DORMANT';
}

const PHASE_LABELS: Record<Phase, { label: string; emoji: string }> = {
  PRE_MOVE: { label: 'Pre-Move', emoji: '📦' },
  NO_GEAR: { label: 'Conservatory Season', emoji: '🏠' },
  EARLY_SEASON: { label: 'Setup & Planting', emoji: '🌱' },
  PEAK_SEASON: { label: 'Peak Growing', emoji: '☀️' },
  LATE_SEASON: { label: 'Harvest & Wind Down', emoji: '🍂' },
  DORMANT: { label: 'Planning Season', emoji: '❄️' },
};

const PHASE_BADGE_COLORS: Record<Phase, string> = {
  PRE_MOVE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  NO_GEAR: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  EARLY_SEASON: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  PEAK_SEASON: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  LATE_SEASON: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  DORMANT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

interface WeatherDay { date: string; minTemp: number; }

// ── Priority Task Checklist ──────────────────────────────────────────────────
interface PriorityTask {
  id: string;
  priority: number;
  label: string;
  detail: string;
  phases: Phase[];
  category: 'setup' | 'planting' | 'maintenance' | 'shopping';
  oneTime: boolean;
  deadline?: string;
  buyUrl?: string;
}

const PRIORITY_TASKS: PriorityTask[] = [
  { id: 'buy-compost', priority: 1, label: 'Buy peat-free compost + perlite', detail: 'Mix 3:1 ratio. Get at least 100L for two GreenStalks.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'Apr 20', buyUrl: 'https://www.thompson-morgan.com/p/peat-free-multipurpose-compost/t67890' },
  { id: 'buy-seed-trays', priority: 2, label: 'Buy seed trays + small pots', detail: 'Start seeds indoors on conservatory windowsill.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'Apr 19', buyUrl: 'https://www.thompson-morgan.com/c/seed-trays-and-pots' },
  { id: 'sow-tomato-indoor', priority: 3, label: 'Sow tomato seeds indoors', detail: 'Tumbling Tom needs 6-8 weeks to transplant size. Sow first weekend in new house.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 20', buyUrl: 'https://www.thompson-morgan.com/p/tomato-tumbling-tom-red/t59034' },
  { id: 'sow-basil-indoor', priority: 4, label: 'Sow basil seeds indoors', detail: 'Needs warmth to germinate. Conservatory windowsill ideal.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 22', buyUrl: 'https://www.thompson-morgan.com/p/basil-sweet-genovese/t55100' },
  { id: 'sow-courgette-indoor', priority: 5, label: 'Sow courgette seeds indoors', detail: 'One seed per 9cm pot. Grows fast — sow 4 weeks before transplant.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'Apr 25' },
  { id: 'order-strawberries', priority: 6, label: 'Order strawberry plants online', detail: 'Buy as potted plants (not seed). Everbearing variety for all-summer harvest.', phases: ['PRE_MOVE', 'NO_GEAR'], category: 'shopping', oneTime: true, deadline: 'Apr 20', buyUrl: 'https://www.thompson-morgan.com/p/strawberry-just-add-cream/t66823' },
  { id: 'buy-sweet-pea-plugs', priority: 7, label: 'Buy sweet pea plug plants', detail: 'Too late to start from seed (should have been February). Buy as plugs.', phases: ['PRE_MOVE', 'NO_GEAR', 'EARLY_SEASON'], category: 'shopping', oneTime: true, deadline: 'May 1', buyUrl: 'https://www.thompson-morgan.com/p/sweet-pea-spencer-mixed/t10886' },
  { id: 'assess-garden', priority: 8, label: 'Assess garden: photos + sun patterns', detail: 'Take photos from every angle. Note morning vs afternoon sun on the terrace.', phases: ['NO_GEAR'], category: 'setup', oneTime: true, deadline: 'Apr 26' },
  { id: 'position-greenstalks', priority: 9, label: 'Position GreenStalks on sunniest spot', detail: 'Use the Sun Heatmap on the Garden page. Aim for 6+ hours direct sun.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 16' },
  { id: 'fill-greenstalks', priority: 10, label: 'Fill GreenStalks with compost mix', detail: '3:1 peat-free compost to perlite. Add slow-release fertiliser (NPK 14-14-14).', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 17' },
  { id: 'check-drainage', priority: 11, label: 'Check all GreenStalk drainage holes', detail: 'Poke a pencil through each pocket drain. Blocked drains = root rot.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 17' },
  { id: 'test-watering', priority: 12, label: 'Fill top reservoir + test water flow', detail: 'Water should trickle through all 5 tiers evenly. Adjust perlite ratio if pooling.', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 18' },
  { id: 'setup-titan-cages', priority: 13, label: 'Set up Titan cages for climbers', detail: 'Allocate: 2x runner beans, 2x cucumbers, 2x cordon tomatoes (if in-ground).', phases: ['EARLY_SEASON'], category: 'setup', oneTime: true, deadline: 'May 25' },
  { id: 'transplant-seedlings', priority: 14, label: 'Transplant indoor seedlings to GreenStalks', detail: 'Harden off for 7 days first. Move outside during day, in at night.', phases: ['EARLY_SEASON'], category: 'planting', oneTime: true, deadline: 'May 25' },
  { id: 'direct-sow-salad', priority: 15, label: 'Direct sow: radish, lettuce, rocket, peas', detail: 'Safe late-start crops. Radish ready in 25 days, lettuce in 30.', phases: ['EARLY_SEASON', 'NO_GEAR'], category: 'planting', oneTime: true, deadline: 'May 30' },
  { id: 'sow-beans', priority: 16, label: 'Direct sow French beans + runner beans', detail: 'Beans from seed are fine in late May. Sow 5cm deep, 15cm apart.', phases: ['EARLY_SEASON'], category: 'planting', oneTime: true, deadline: 'Jun 7' },
  { id: 'buy-herb-plants', priority: 17, label: 'Buy potted herbs: mint, chives, thyme, rosemary', detail: 'Garden centre potted herbs establish faster than seed at this stage.', phases: ['NO_GEAR', 'EARLY_SEASON'], category: 'shopping', oneTime: true, deadline: 'May 20', buyUrl: 'https://www.thompson-morgan.com/c/herb-plants' },
  { id: 'water-daily', priority: 20, label: 'Water GreenStalks', detail: 'Daily in spring/autumn, twice daily June\u2013August. Fill the top reservoir.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'pest-check', priority: 21, label: 'Check for pests (undersides of leaves)', detail: 'Look for aphids, whitefly, caterpillars. Check twice weekly minimum.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'feed-weekly', priority: 22, label: 'Liquid feed tomatoes + peppers', detail: 'Tomato feed (high potash) once flowering starts. Weekly through summer.', phases: ['PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false, buyUrl: 'https://www.thompson-morgan.com/p/tomorite-concentrated-tomato-food/t69481' },
  { id: 'harvest-daily', priority: 23, label: 'Harvest ripe crops daily', detail: 'Regular picking encourages more fruit. Don\'t let beans go stringy.', phases: ['PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
  { id: 'succession-sow', priority: 24, label: 'Succession sow salads every 2 weeks', detail: 'Lettuce, rocket, radish \u2014 keep sowing for continuous harvest.', phases: ['EARLY_SEASON', 'PEAK_SEASON'], category: 'planting', oneTime: false },
  { id: 'rotate-greenstalks', priority: 25, label: 'Rotate GreenStalks 90\u00b0 every 2 weeks', detail: 'Ensures even sun exposure on all sides.', phases: ['EARLY_SEASON', 'PEAK_SEASON', 'LATE_SEASON'], category: 'maintenance', oneTime: false },
];

const CHECKLIST_STORAGE_KEY = 'garden-plotter-checklist';

function loadChecklist(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch { return new Set(); }
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
  const settings = usePlannerStore((s) => s.settings);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => loadChecklist());
  const [weather, setWeather] = useState<WeatherDay[] | null>(null);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      saveChecklist(next);
      return next;
    });
  };

  const today = new Date();
  const phase = getPhase(today);
  const phaseInfo = PHASE_LABELS[phase];
  const daysToFrost = daysBetween(today, FIRST_FROST);

  // Minimal weather fetch — just for frost alert
  useEffect(() => {
    const lat = settings.latitude || 51.3867;
    const lng = settings.longitude || -0.4175;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_min&timezone=Europe/London&forecast_days=3`)
      .then((r) => r.json())
      .then((data) => {
        if (data.daily) {
          setWeather(data.daily.time.map((t: string, i: number) => ({
            date: t,
            minTemp: data.daily.temperature_2m_min[i],
          })));
        }
      })
      .catch(() => {});
  }, [settings.latitude, settings.longitude]);

  const frostRisk = weather?.some((d) => d.minTemp < 3) ?? false;

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
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
              {phaseInfo.emoji} To Do
            </h1>
            <p className="text-sm text-stone-400 mt-0.5">
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${PHASE_BADGE_COLORS[phase]}`}>
              {phaseInfo.emoji} {phaseInfo.label}
            </div>
            {daysToFrost > 0 && (
              <span className="text-[10px] text-stone-400">{daysToFrost}d left in season</span>
            )}
          </div>
        </div>

        {/* Frost alert */}
        {frostRisk && (
          <div className="text-xs px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium">
            ❄️ Frost risk in the next 3 days — cover tender seedlings tonight.
          </div>
        )}

        {/* Priority Checklist */}
        {phaseTasks.length > 0 ? (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">
                  Prioritized for {phaseInfo.label.toLowerCase()}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400">{completedCount}/{totalTasks}</span>
                  <div className="w-20 h-1.5 bg-stone-200 dark:bg-stone-600 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
              {phaseTasks.map((task, i) => {
                const done = completedTasks.has(task.id);
                const cat = CATEGORY_COLORS[task.category];
                return (
                  <div
                    key={task.id}
                    className={`px-4 py-2.5 flex items-start gap-3 cursor-pointer transition-all hover:bg-stone-50 dark:hover:bg-stone-700/30 ${done ? 'opacity-50' : ''}`}
                    onClick={() => toggleTask(task.id)}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 dark:border-stone-500'
                    }`}>
                      {done && <span className="text-xs">✓</span>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${done ? 'line-through text-stone-400' : 'text-stone-800 dark:text-stone-100'}`}>
                          {task.label}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>{cat.label}</span>
                        {!task.oneTime && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-600 text-stone-400">recurring</span>
                        )}
                      </div>
                      <p className={`text-[10px] mt-0.5 ${done ? 'text-stone-300 dark:text-stone-600' : 'text-stone-500 dark:text-stone-400'}`}>
                        {task.detail}
                      </p>
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
                            className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-200 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            🛒 Buy →
                          </a>
                        )}
                      </div>
                    </div>

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
        ) : (
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-8 text-center text-stone-400">
            <div className="text-3xl mb-2">✅</div>
            No tasks for this phase. Check the Care page for ongoing maintenance.
          </div>
        )}
      </div>
    </div>
  );
}
