import type { Plant } from '../types/plant';

export type TierSuitability = 'ideal' | 'ok' | 'poor';

export function getTierSuitability(
  plant: Plant,
  tierNumber: number
): TierSuitability {
  if (plant.idealTiers.includes(tierNumber)) return 'ideal';
  const distance = Math.min(
    ...plant.idealTiers.map((t) => Math.abs(t - tierNumber))
  );
  if (distance <= 1) return 'ok';
  return 'poor';
}

export function getTierLabel(tierNumber: number): string {
  const labels: Record<number, string> = {
    1: 'Top',
    2: 'Upper',
    3: 'Middle',
    4: 'Lower',
    5: 'Bottom',
  };
  return labels[tierNumber] ?? `Tier ${tierNumber}`;
}

export function getTierAdvice(tierNumber: number): string {
  const advice: Record<number, string> = {
    1: 'Best for trailing plants, strawberries, and slug-sensitive crops',
    2: 'Great for trailing tomatoes, leafy greens, and fruit',
    3: 'Ideal for herbs and compact vegetables',
    4: 'Good for beans, robust herbs, and flowers',
    5: 'Perfect for trailing flowers and trap crops',
  };
  return advice[tierNumber] ?? '';
}

// ── Root competition scoring ──

/** Plants with root depth at or above this threshold compete for space */
const DEEP_ROOT_CM = 15;

/**
 * Assess root competition for a tier based on how many deep-rooted
 * plants (≥15 cm) share the same soil ring.
 *
 * GreenStalk tiers hold ~11 L of compost across 6 pockets. Deep-rooted,
 * heavy-feeding plants (tomatoes 20 cm, kale 20 cm, chillies 20 cm) need
 * more volume per plant — clustering too many on one tier starves them of
 * nutrients and water. Pair deep roots with shallow companions (basil 10 cm,
 * lettuce 10 cm, chives 10 cm) for the best balance.
 */
export type RootLoad = 'light' | 'moderate' | 'heavy';

export function getTierRootLoad(tierPlants: Plant[]): RootLoad {
  const deepCount = tierPlants.filter((p) => p.depthCm >= DEEP_ROOT_CM).length;
  if (deepCount <= 2) return 'light';
  if (deepCount <= 3) return 'moderate';
  return 'heavy';
}

export const ROOT_LOAD_META: Record<
  RootLoad,
  { label: string; color: string; advice: string }
> = {
  light: {
    label: 'Low root competition',
    color: '#22c55e',
    advice: 'Good root balance — shallow and deep roots share soil well.',
  },
  moderate: {
    label: 'Moderate root competition',
    color: '#f59e0b',
    advice: 'Moderate root competition — consider extra feeding during fruiting.',
  },
  heavy: {
    label: 'Heavy root competition',
    color: '#ef4444',
    advice:
      'Too many deep-rooted plants sharing this tier. Stagger deep-rooted plants across different tiers for better growth.',
  },
};
