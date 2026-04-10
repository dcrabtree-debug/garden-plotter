export interface Harvester {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface HarvestEntry {
  id: string;
  harvesterId: string;
  plantSlug: string;
  count: number;
  date: string; // ISO date
  timestamp: number;
}

export interface HarvestMilestone {
  id: string;
  label: string;
  emoji: string;
  target: number;
  plantSlug: string | null; // null = any plant
}

export const DEFAULT_HARVESTERS: Harvester[] = [
  { id: 'max', name: 'Max', emoji: '\ud83e\uddd1', color: '#3b82f6' },
  { id: 'noelle', name: 'Noelle', emoji: '\ud83d\udc67', color: '#ec4899' },
];

export const DEFAULT_MILESTONES: HarvestMilestone[] = [
  { id: 'm-1', label: 'First Strawberry!', emoji: '\ud83c\udf53', target: 1, plantSlug: 'strawberry-everbearing' },
  { id: 'm-5', label: '5 Strawberries', emoji: '\ud83c\udf53', target: 5, plantSlug: 'strawberry-everbearing' },
  { id: 'm-10', label: 'Berry Champion', emoji: '\ud83c\udfc6', target: 10, plantSlug: 'strawberry-everbearing' },
  { id: 'm-t1', label: 'First Tomato!', emoji: '\ud83c\udf45', target: 1, plantSlug: 'tomato-tumbling' },
  { id: 'm-t5', label: '5 Tomatoes', emoji: '\ud83c\udf45', target: 5, plantSlug: 'tomato-tumbling' },
  { id: 'm-25', label: 'Super Harvester', emoji: '\u2b50', target: 25, plantSlug: null },
  { id: 'm-50', label: 'Garden Hero', emoji: '\ud83e\uddb8', target: 50, plantSlug: null },
  { id: 'm-100', label: 'Harvest Legend', emoji: '\ud83d\udc51', target: 100, plantSlug: null },
];
