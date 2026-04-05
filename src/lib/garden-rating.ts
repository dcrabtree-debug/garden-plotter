/**
 * Holistic Garden Rating System
 *
 * Scores every planted plant across 5 axes (0-10 each):
 *   🧒 Kid-Friendly  — fast harvest, fruit category, visual fun
 *   🌸 Fragrance     — aromatic herbs, known fragrant plants
 *   🤝 Companion     — friend/foe count across ALL planted plants (GS + ground)
 *   💪 Resilience     — fewer pests/diseases, hardy, low water
 *   💰 Value          — yield × supermarket price per pocket/cell
 *
 * Overall Plant Score = weighted average (Kid 20%, Fragrance 15%, Companion 25%, Resilience 20%, Value 20%)
 * Garden Grade (A+ to F) = average of all scores + bonuses for diversity and cross-system synergy
 */

import type { Plant } from '../types/plant';
import type { CompanionMap } from '../types/companion';
import { getFriends, getConflicts } from './companion-engine';

// ─── Known fragrant plants (from RESEARCH-FRAGRANCE-PLANTS.md) ──────────────
const FRAGRANT_SLUGS = new Set([
  'lavender', 'rosemary', 'thyme', 'basil-sweet', 'mint', 'lemon-balm',
  'chamomile', 'corsican-mint', 'scented-geranium', 'night-scented-stock',
  'dianthus', 'nicotiana', 'sweet-william', 'oregano', 'sage',
  'lemon-verbena', 'dwarf-sweet-pea', 'borage',
]);

const HERB_SLUGS = new Set([
  'basil-sweet', 'chives', 'thyme', 'rosemary', 'mint', 'oregano',
  'sage', 'parsley', 'lemon-balm', 'chamomile', 'lemon-verbena',
  'corsican-mint', 'tarragon', 'dill', 'coriander',
]);

// Kid-favourite fruits/veg that are fun to pick
const KID_FAVOURITES = new Set([
  'strawberry-everbearing', 'tomato-tumbling', 'radish', 'pea',
  'sunflower', 'nasturtium', 'dwarf-french-bean', 'lettuce',
  'runner-bean', 'raspberry', 'blueberry', 'gooseberry',
]);

// ─── Yield price map (subset for scoring — full map in yield-engine.ts) ─────
const VALUE_MAP: Record<string, number> = {
  // £ per kg at UK supermarkets (April 2026)
  'basil-sweet': 40, 'lemon-verbena': 50, 'mint': 30, 'rosemary': 25,
  'thyme': 25, 'chives': 20, 'oregano': 22, 'sage': 20, 'parsley': 18,
  'chamomile': 35, 'coriander': 15, 'dill': 18, 'tarragon': 30,
  'rocket': 12, 'lettuce': 8, 'spinach': 6, 'perpetual-spinach': 6,
  'strawberry-everbearing': 8, 'raspberry': 12, 'blueberry': 14,
  'tomato-tumbling': 5, 'pepper-chilli': 10, 'pepper-sweet': 4,
  'radish': 4, 'spring-onion': 5, 'dwarf-french-bean': 5,
  'runner-bean': 4, 'courgette': 3, 'pea': 6, 'cucumber': 2,
  'kale': 4, 'beetroot': 2.5, 'carrot': 1.5, 'potato-early': 1,
  'gooseberry': 10, 'redcurrant': 12,
};

// ─── Scoring Functions ──────────────────────────────────────────────────────

export interface PlantScore {
  slug: string;
  commonName: string;
  emoji: string;
  location: 'greenstalk' | 'inground' | 'both';
  kidFriendly: number;
  fragrance: number;
  companion: number;
  resilience: number;
  value: number;
  overall: number;
}

export interface UpgradeSuggestion {
  location: 'greenstalk' | 'inground';
  position: string;
  currentSlug: string;
  currentName: string;
  suggestedSlug: string;
  suggestedName: string;
  suggestedEmoji: string;
  scoreDelta: number;
  reason: string;
}

export interface GardenGrade {
  letter: string;
  score: number; // 0-100
  plantScores: PlantScore[];
  axisAverages: {
    kidFriendly: number;
    fragrance: number;
    companion: number;
    resilience: number;
    value: number;
  };
  crossSystemBonus: number;
  diversityBonus: number;
  totalPlants: number;
  uniqueSpecies: number;
  topStrength: { axis: string; score: number };
  topWeakness: { axis: string; score: number };
  upgrades: UpgradeSuggestion[];
}

// ─── Individual axis scorers ────────────────────────────────────────────────

function scoreKidFriendly(plant: Plant): number {
  let s = 3; // baseline
  // Fast harvest = more fun
  const days = plant.daysToHarvest[0];
  if (days <= 25) s += 3;      // radish-speed
  else if (days <= 40) s += 2; // lettuce-speed
  else if (days <= 60) s += 1; // bean-speed

  // Fruit category kids love
  if (plant.category === 'fruit') s += 2;
  if (KID_FAVOURITES.has(plant.slug)) s += 2;

  // Visual interest
  if (plant.growthHabit === 'trailing' || plant.growthHabit === 'climbing') s += 1;
  if (plant.emoji === '🌻' || plant.emoji === '🌸') s += 1;

  return Math.min(10, Math.max(0, s));
}

function scoreFragrance(plant: Plant): number {
  if (FRAGRANT_SLUGS.has(plant.slug)) return 9;
  if (HERB_SLUGS.has(plant.slug)) return 5;
  if (plant.category === 'herb') return 4;
  // Flowers get a small fragrance boost
  if (plant.category === 'flower') return 3;
  return 1;
}

function scoreCompanion(
  plant: Plant,
  allPlantedSlugs: string[],
  companionMap: CompanionMap
): number {
  const others = allPlantedSlugs.filter((s) => s !== plant.slug);
  const uniqueOthers = [...new Set(others)];
  const friends = getFriends(plant.slug, uniqueOthers, companionMap);
  const foes = getConflicts(plant.slug, uniqueOthers, companionMap);

  let s = 5; // neutral baseline
  s += Math.min(friends.length * 2, 5); // +2 per friend, cap at +5
  s -= foes.length * 3;                  // -3 per foe
  return Math.min(10, Math.max(0, s));
}

function scoreResilience(plant: Plant): number {
  let s = 7; // start optimistic

  // Pest/disease burden
  const pestCount = (plant.inGround?.pests?.length ?? 0) + (plant.inGround?.diseases?.length ?? 0);
  if (pestCount >= 5) s -= 3;
  else if (pestCount >= 3) s -= 2;
  else if (pestCount >= 1) s -= 1;

  // Water need
  if (plant.water === 'high') s -= 1;
  if (plant.water === 'low') s += 1;

  // Hardiness
  const h = parseInt(plant.hardiness?.replace('H', '') ?? '5');
  if (h >= 6) s += 1; // very hardy
  if (h <= 2) s -= 1; // tender

  return Math.min(10, Math.max(0, s));
}

function scoreValue(plant: Plant): number {
  const pricePerKg = VALUE_MAP[plant.slug] ?? 2;
  // Normalize: £50/kg herbs = 10, £1/kg potatoes = 1
  const normalized = Math.min(10, Math.max(1, Math.round(pricePerKg / 5)));
  return normalized;
}

// ─── Main scoring ───────────────────────────────────────────────────────────

// Kid-friendly garden is the #1 priority (David's kids Max + Noelle).
// Fragrance is David's personal preference, secondary.
// Companion + resilience support production of the kid garden.
const WEIGHTS = {
  kidFriendly: 0.35,
  value: 0.20,
  companion: 0.15,
  resilience: 0.15,
  fragrance: 0.15,
};

export function scorePlant(
  plant: Plant,
  allPlantedSlugs: string[],
  companionMap: CompanionMap,
  location: 'greenstalk' | 'inground' | 'both'
): PlantScore {
  const kid = scoreKidFriendly(plant);
  const frag = scoreFragrance(plant);
  const comp = scoreCompanion(plant, allPlantedSlugs, companionMap);
  const res = scoreResilience(plant);
  const val = scoreValue(plant);

  const overall = Math.round(
    (kid * WEIGHTS.kidFriendly +
      frag * WEIGHTS.fragrance +
      comp * WEIGHTS.companion +
      res * WEIGHTS.resilience +
      val * WEIGHTS.value) * 10
  ) / 10;

  return {
    slug: plant.slug,
    commonName: plant.commonName,
    emoji: plant.emoji,
    location,
    kidFriendly: kid,
    fragrance: frag,
    companion: comp,
    resilience: res,
    value: val,
    overall,
  };
}

function letterGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 45) return 'D+';
  if (score >= 40) return 'D';
  return 'F';
}

const AXIS_LABELS: Record<string, string> = {
  kidFriendly: '🧒 Kid-Friendly',
  fragrance: '🌸 Fragrance',
  companion: '🤝 Companion',
  resilience: '💪 Resilience',
  value: '💰 Value',
};

export function gradeGarden(
  towerSlugs: string[],
  groundSlugs: string[],
  plants: Plant[],
  plantMap: Map<string, Plant>,
  companionMap: CompanionMap
): GardenGrade {
  const allSlugs = [...towerSlugs, ...groundSlugs];
  const towerSet = new Set(towerSlugs);
  const groundSet = new Set(groundSlugs);
  const uniqueSlugs = [...new Set(allSlugs)];

  if (uniqueSlugs.length === 0) {
    return {
      letter: '–', score: 0, plantScores: [],
      axisAverages: { kidFriendly: 0, fragrance: 0, companion: 0, resilience: 0, value: 0 },
      crossSystemBonus: 0, diversityBonus: 0, totalPlants: 0, uniqueSpecies: 0,
      topStrength: { axis: '', score: 0 }, topWeakness: { axis: '', score: 0 },
      upgrades: [],
    };
  }

  // Score each unique planted species
  const plantScores: PlantScore[] = [];
  for (const slug of uniqueSlugs) {
    const plant = plantMap.get(slug);
    if (!plant) continue;
    const loc = towerSet.has(slug) && groundSet.has(slug) ? 'both'
      : towerSet.has(slug) ? 'greenstalk' : 'inground';
    plantScores.push(scorePlant(plant, allSlugs, companionMap, loc));
  }

  // Axis averages
  const avg = (axis: keyof PlantScore) =>
    Math.round((plantScores.reduce((sum, ps) => sum + (ps[axis] as number), 0) / plantScores.length) * 10) / 10;

  const axisAverages = {
    kidFriendly: avg('kidFriendly'),
    fragrance: avg('fragrance'),
    companion: avg('companion'),
    resilience: avg('resilience'),
    value: avg('value'),
  };

  // Cross-system companion bonus: friend pairs between GS and ground
  let crossSystemBonus = 0;
  for (const gs of new Set(towerSlugs)) {
    for (const ig of new Set(groundSlugs)) {
      if (gs === ig) continue;
      const friends = getFriends(gs, [ig], companionMap);
      crossSystemBonus += friends.length * 2;
    }
  }
  crossSystemBonus = Math.min(crossSystemBonus, 15); // cap at 15

  // Diversity bonus: more unique species = higher
  const diversityBonus = Math.min(uniqueSlugs.length, 15); // 1 point per species, cap 15

  // Base score from plant averages (0-10 → 0-100)
  const avgOverall = plantScores.reduce((sum, ps) => sum + ps.overall, 0) / plantScores.length;
  const rawScore = avgOverall * 10 + crossSystemBonus + diversityBonus;
  const score = Math.min(100, Math.round(rawScore));

  // Strengths and weaknesses
  const axisEntries = Object.entries(axisAverages) as [string, number][];
  axisEntries.sort((a, b) => b[1] - a[1]);
  const topStrength = { axis: AXIS_LABELS[axisEntries[0][0]] ?? axisEntries[0][0], score: axisEntries[0][1] };
  const topWeakness = { axis: AXIS_LABELS[axisEntries[axisEntries.length - 1][0]] ?? axisEntries[axisEntries.length - 1][0], score: axisEntries[axisEntries.length - 1][1] };

  // Upgrade suggestions: for each planted slug, find a better candidate
  const upgrades = generateUpgrades(plantScores, allSlugs, plants, plantMap, companionMap, towerSet, groundSet);

  return {
    letter: letterGrade(score),
    score,
    plantScores: plantScores.sort((a, b) => b.overall - a.overall),
    axisAverages,
    crossSystemBonus,
    diversityBonus,
    totalPlants: allSlugs.length,
    uniqueSpecies: uniqueSlugs.length,
    topStrength,
    topWeakness,
    upgrades,
  };
}

function generateUpgrades(
  currentScores: PlantScore[],
  allSlugs: string[],
  plants: Plant[],
  plantMap: Map<string, Plant>,
  companionMap: CompanionMap,
  towerSet: Set<string>,
  groundSet: Set<string>
): UpgradeSuggestion[] {
  const planted = new Set(allSlugs);
  const suggestions: UpgradeSuggestion[] = [];

  // Find the 3 lowest-scoring plants
  const sorted = [...currentScores].sort((a, b) => a.overall - b.overall);
  const weakest = sorted.slice(0, 3);

  for (const weak of weakest) {
    const loc = weak.location === 'both' ? 'greenstalk' : weak.location;
    const position = loc === 'greenstalk' ? 'GreenStalk pocket' : 'In-ground cell';

    // Find best unplanted replacement
    let bestDelta = 0;
    let bestCandidate: PlantScore | null = null;
    let bestReason = '';

    for (const candidate of plants) {
      if (planted.has(candidate.slug)) continue;
      // For GreenStalk, must be suitable
      if (loc === 'greenstalk' && candidate.greenstalkSuitability === 'unsuitable') continue;

      const candidateScore = scorePlant(candidate, allSlugs, companionMap, loc);
      const delta = candidateScore.overall - weak.overall;

      if (delta > bestDelta) {
        bestDelta = delta;
        bestCandidate = candidateScore;

        // Build reason from biggest axis improvement
        const deltas: { axis: string; d: number }[] = [
          { axis: 'companion', d: candidateScore.companion - weak.companion },
          { axis: 'value', d: candidateScore.value - weak.value },
          { axis: 'kid-friendly', d: candidateScore.kidFriendly - weak.kidFriendly },
          { axis: 'fragrance', d: candidateScore.fragrance - weak.fragrance },
          { axis: 'resilience', d: candidateScore.resilience - weak.resilience },
        ].filter((d) => d.d > 0).sort((a, b) => b.d - a.d);

        bestReason = deltas.length > 0
          ? `+${deltas[0].d} ${deltas[0].axis}` + (deltas.length > 1 ? `, +${deltas[1].d} ${deltas[1].axis}` : '')
          : 'better overall fit';
      }
    }

    if (bestCandidate && bestDelta >= 1.5) {
      suggestions.push({
        location: loc,
        position,
        currentSlug: weak.slug,
        currentName: weak.commonName,
        suggestedSlug: bestCandidate.slug,
        suggestedName: bestCandidate.commonName,
        suggestedEmoji: bestCandidate.emoji,
        scoreDelta: Math.round(bestDelta * 10) / 10,
        reason: bestReason,
      });
    }
  }

  return suggestions.sort((a, b) => b.scoreDelta - a.scoreDelta);
}
