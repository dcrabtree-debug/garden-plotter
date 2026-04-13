import { useState, useEffect, useMemo } from 'react';
import { usePlannerStore } from '../state/planner-store';
import {
  type PriorityTask, PRIORITY_TASKS,
  FIRST_FROST,
  PHASE_LABELS, PHASE_BADGE_COLORS, CATEGORY_COLORS,
  getPhase, daysBetween,
  loadChecklist, saveChecklist,
} from '../lib/priority-tasks';

interface WeatherDay { date: string; minTemp: number; }

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
