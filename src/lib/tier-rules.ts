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
