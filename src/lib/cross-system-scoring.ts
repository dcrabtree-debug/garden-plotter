/**
 * Cross-system compatibility scoring between GreenStalk tower layouts
 * and in-ground Esher garden layouts.
 *
 * Scores how well a GreenStalk configuration pairs with an in-ground
 * configuration based on companion relationships, crop diversity,
 * and thematic alignment.
 */
import type { CompanionMap } from '../types/companion';
import { checkPair } from './companion-engine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CrossSystemScore {
  total: number; // 0-100 composite
  companionScore: number; // 0-50
  diversityScore: number; // 0-25
  strategyScore: number; // 0-25
  friendPairs: { ground: string; tower: string; reason: string }[];
  foePairs: { ground: string; tower: string; reason: string }[];
  overlapSlugs: string[];
  summary: string;
}

export interface CrossSystemPairing {
  layoutId: string;
  layoutName: string;
  system: 'greenstalk' | 'in-ground';
  score: CrossSystemScore;
}

// ─── Strategy affinity matrix ───────────────────────────────────────────────
// Maps (esherLayoutId, gsLayoutId) → bonus points (0-25)

const AFFINITY: Record<string, Record<string, number>> = {
  'max-food': {
    'maximum-berries': 25,
    'family-harvest': 15,
    'companion-optimal': 20,
    'fragrant-edible': 10,
  },
  'kid-friendly': {
    'family-harvest': 25,
    'maximum-berries': 15,
    'companion-optimal': 10,
    'fragrant-edible': 10,
  },
  'fragrant-edible': {
    'fragrant-edible': 25,
    'companion-optimal': 15,
    'family-harvest': 10,
    'maximum-berries': 5,
  },
  'companion-fortress': {
    'companion-optimal': 25,
    'fragrant-edible': 15,
    'family-harvest': 10,
    'maximum-berries': 5,
  },
};

// ─── Core scoring ───────────────────────────────────────────────────────────

export function scoreCrossSystemCompatibility(
  groundSlugs: string[],
  towerSlugs: string[],
  companionMap: CompanionMap,
  esherLayoutId?: string,
  gsLayoutId?: string
): CrossSystemScore {
  const uniqueGround = [...new Set(groundSlugs)];
  const uniqueTower = [...new Set(towerSlugs)];

  // 1. Companion score (0-50)
  const friendPairs: CrossSystemScore['friendPairs'] = [];
  const foePairs: CrossSystemScore['foePairs'] = [];

  for (const g of uniqueGround) {
    for (const t of uniqueTower) {
      if (g === t) continue;
      const edge = checkPair(g, t, companionMap);
      if (!edge) continue;
      if (edge.relationship === 'friend') {
        friendPairs.push({ ground: g, tower: t, reason: edge.reason });
      } else if (edge.relationship === 'foe') {
        foePairs.push({ ground: g, tower: t, reason: edge.reason });
      }
    }
  }

  // Each friend pair +4, each foe pair -6, clamped to 0-50
  const rawCompanion = friendPairs.length * 4 - foePairs.length * 6;
  const companionScore = Math.max(0, Math.min(50, rawCompanion));

  // 2. Diversity score (0-25) — fewer overlapping crops = higher score
  const groundSet = new Set(uniqueGround);
  const overlapSlugs = uniqueTower.filter((s) => groundSet.has(s));
  const minCrops = Math.min(uniqueGround.length, uniqueTower.length);
  const diversityScore =
    minCrops > 0
      ? Math.round(25 * (1 - overlapSlugs.length / minCrops))
      : 25;

  // 3. Strategy alignment (0-25) — from affinity matrix
  let strategyScore = 12; // neutral default
  if (esherLayoutId && gsLayoutId) {
    strategyScore = AFFINITY[esherLayoutId]?.[gsLayoutId] ?? 12;
  }

  const total = companionScore + diversityScore + strategyScore;

  // Summary
  const parts: string[] = [];
  if (friendPairs.length > 0)
    parts.push(`${friendPairs.length} companion benefits across systems`);
  if (foePairs.length > 0)
    parts.push(`${foePairs.length} conflicts to watch`);
  if (overlapSlugs.length === 0) parts.push('zero crop overlap');
  else parts.push(`${overlapSlugs.length} shared crops`);

  const summary = parts.join(', ');

  return {
    total,
    companionScore,
    diversityScore,
    strategyScore,
    friendPairs,
    foePairs,
    overlapSlugs,
    summary,
  };
}

// ─── Find best pairing ─────────────────────────────────────────────────────

interface LayoutWithSlugs {
  id: string;
  name: string;
  slugs: string[];
}

export function findBestPairing(
  mySlugs: string[],
  myLayoutId: string,
  otherLayouts: LayoutWithSlugs[],
  system: 'greenstalk' | 'in-ground',
  companionMap: CompanionMap
): CrossSystemPairing | undefined {
  if (otherLayouts.length === 0) return undefined;

  let best: CrossSystemPairing | undefined = undefined;

  for (const other of otherLayouts) {
    // Determine which is esher vs gs for affinity lookup
    const [esherLayoutId, gsLayoutId] =
      system === 'greenstalk'
        ? [myLayoutId, other.id]
        : [other.id, myLayoutId];

    const score = scoreCrossSystemCompatibility(
      system === 'greenstalk' ? mySlugs : other.slugs,
      system === 'greenstalk' ? other.slugs : mySlugs,
      companionMap,
      esherLayoutId,
      gsLayoutId
    );

    if (!best || score.total > best.score.total) {
      best = {
        layoutId: other.id,
        layoutName: other.name,
        system,
        score,
      };
    }
  }

  return best;
}
