import type { PlantingWindow } from '../types/plant';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

export function isInWindow(
  month: number,
  window: [number, number] | null
): boolean {
  if (!window) return false;
  const [start, end] = window;
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getActiveActivities(
  window: PlantingWindow,
  month: number
): string[] {
  const activities: string[] = [];
  if (isInWindow(month, window.sowIndoors)) activities.push('Sow indoors');
  if (isInWindow(month, window.sowOutdoors)) activities.push('Sow outdoors');
  if (isInWindow(month, window.transplant)) activities.push('Transplant');
  if (isInWindow(month, window.harvest)) activities.push('Harvest');
  return activities;
}

export const SURREY_LAST_FROST_MONTH = 4;
export const SURREY_FIRST_FROST_MONTH = 10;
