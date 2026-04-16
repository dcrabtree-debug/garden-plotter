// ═══════════════════════════════════════════════════════════════════════════
// Sow Event Store — tracks when you actually sowed/transplanted/harvested a crop.
//
// This enables event-driven succession reminders: the Dashboard shows
// "Time to re-sow radish!" only AFTER you've recorded a sow event, and
// only when enough days have passed (per Joy Larkcom's intervals).
//
// Separate from the planner-store (GreenStalk pockets) and garden-store
// (in-ground cells) because sow events are a PERSONAL LOG, not tied to
// a specific physical location.
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';

const STORAGE_KEY = 'garden-plotter-sow-events';

export type SowActionType = 'sow-indoors' | 'sow-outdoors' | 'transplant' | 'harvest';

export interface SowEvent {
  id: string;                   // unique (timestamp + slug + action)
  slug: string;                 // plant slug
  action: SowActionType;
  date: string;                 // ISO date YYYY-MM-DD
  notes?: string;               // optional free text
  source?: 'greenstalk' | 'in-ground' | 'windowsill' | 'other';
}

interface SowEventState {
  events: SowEvent[];
  logEvent: (slug: string, action: SowActionType, date?: string, notes?: string, source?: SowEvent['source']) => void;
  removeEvent: (id: string) => void;
  getLastEvent: (slug: string, action?: SowActionType) => SowEvent | null;
  getEventsForSlug: (slug: string) => SowEvent[];
}

function loadEvents(): SowEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: SowEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // localStorage full or unavailable
  }
}

export const useSowEventStore = create<SowEventState>((set, get) => ({
  events: loadEvents(),

  logEvent: (slug, action, date, notes, source) => {
    const isoDate = date ?? new Date().toISOString().split('T')[0];
    const id = `${isoDate}-${slug}-${action}-${Date.now()}`;
    const event: SowEvent = { id, slug, action, date: isoDate, notes, source };
    set((state) => {
      const events = [...state.events, event];
      saveEvents(events);
      return { events };
    });
  },

  removeEvent: (id) => {
    set((state) => {
      const events = state.events.filter((e) => e.id !== id);
      saveEvents(events);
      return { events };
    });
  },

  getLastEvent: (slug, action) => {
    const events = get().events
      .filter((e) => e.slug === slug && (!action || e.action === action))
      .sort((a, b) => b.date.localeCompare(a.date));
    return events[0] ?? null;
  },

  getEventsForSlug: (slug) => {
    return get().events
      .filter((e) => e.slug === slug)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
}));

// ── Helper for succession reminders ────────────────────────────────────────

export interface SuccessionReminder {
  slug: string;
  plantName: string;
  emoji: string;
  action: SowActionType;
  lastSowDate: string;          // ISO date
  daysSinceLast: number;
  successionDays: number;        // Joy Larkcom interval
  daysOverdue: number;           // daysSinceLast - successionDays (negative = not due yet)
}

/**
 * Given a list of plants with successionDays and the sow event log,
 * produce reminders for plants that are DUE or OVERDUE for re-sowing.
 *
 * Only produces a reminder when:
 *  1. The plant has a successionDays field in expert data
 *  2. There's at least one previous sow event for that slug
 *  3. The time since last sow ≥ successionDays
 *  4. The current month is within the plant's sowing window
 */
export function computeSuccessionReminders(
  plants: { slug: string; commonName: string; emoji: string; successionDays: number }[],
  events: SowEvent[],
  today: Date,
): SuccessionReminder[] {
  const reminders: SuccessionReminder[] = [];
  const todayStr = today.toISOString().split('T')[0];

  for (const plant of plants) {
    // Find last sow-indoors or sow-outdoors event
    const sowEvents = events
      .filter((e) => e.slug === plant.slug && (e.action === 'sow-indoors' || e.action === 'sow-outdoors'))
      .sort((a, b) => b.date.localeCompare(a.date));

    if (sowEvents.length === 0) continue; // No sow event → no succession reminder

    const last = sowEvents[0];
    const lastDate = new Date(last.date);
    const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
    const daysOverdue = daysSince - plant.successionDays;

    if (daysOverdue >= 0) {
      reminders.push({
        slug: plant.slug,
        plantName: plant.commonName,
        emoji: plant.emoji,
        action: last.action,
        lastSowDate: last.date,
        daysSinceLast: daysSince,
        successionDays: plant.successionDays,
        daysOverdue,
      });
    }
  }

  // Sort: most overdue first
  reminders.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return reminders;
}
