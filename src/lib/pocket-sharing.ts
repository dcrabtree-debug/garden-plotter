/**
 * Pocket sharing: small herbs/flowers that can tuck into the same
 * GreenStalk pocket or in-ground cell as a larger primary plant.
 *
 * Rules based on physical size (≤25 cm spacing), companion data,
 * and real-world growing practice (RHS, BBC GW).
 */

import { checkPair } from './companion-engine';
import type { CompanionMap } from '../types/companion';
import type { Plant } from '../types/plant';

/** Slugs small enough to share a pocket with a larger plant */
const TUCK_IN_SLUGS = new Set([
  'basil-sweet',
  'thyme',
  'chives',
  'parsley',
  'marigold',
  'coriander',
  'dill',
  'chamomile',
  'oregano',
  'cornflower',
  'night-scented-stock',
  'corsican-mint',
]);

export interface ShareResult {
  canShare: boolean;
  reason: string;
}

export interface DuoPairing {
  companionSlug: string;
  companionName: string;
  companionEmoji: string;
  reason: string;
}

/** Check if two plants can share a pocket */
export function canSharePocket(
  primarySlug: string,
  companionSlug: string,
  companionMap: CompanionMap,
  plantMap: Map<string, Plant>,
): ShareResult {
  if (primarySlug === companionSlug) {
    return { canShare: false, reason: 'Same plant' };
  }

  const companion = plantMap.get(companionSlug);
  if (!companion) return { canShare: false, reason: 'Unknown plant' };

  // Companion must be a small herb/flower
  if (!TUCK_IN_SLUGS.has(companionSlug)) {
    return { canShare: false, reason: 'Too large to share a pocket' };
  }

  // Must be proven companion friends
  const edge = checkPair(primarySlug, companionSlug, companionMap);
  if (!edge || edge.relationship !== 'friend') {
    return { canShare: false, reason: 'Not proven companions' };
  }

  return { canShare: true, reason: edge.reason };
}

/** Get all small companions that can share a pocket with a primary plant */
export function getShareableCompanions(
  primarySlug: string,
  companionMap: CompanionMap,
  plantMap: Map<string, Plant>,
): DuoPairing[] {
  const results: DuoPairing[] = [];
  for (const tuckSlug of TUCK_IN_SLUGS) {
    const result = canSharePocket(primarySlug, tuckSlug, companionMap, plantMap);
    if (result.canShare) {
      const plant = plantMap.get(tuckSlug)!;
      results.push({
        companionSlug: tuckSlug,
        companionName: plant.commonName,
        companionEmoji: plant.emoji,
        reason: result.reason,
      });
    }
  }
  return results;
}

/** Check if a slug is a small tuck-in plant */
export function isTuckInPlant(slug: string): boolean {
  return TUCK_IN_SLUGS.has(slug);
}
