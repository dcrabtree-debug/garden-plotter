import type { CompanionEdge, CompanionMap } from '../types/companion';

export function buildCompanionMap(edges: CompanionEdge[]): CompanionMap {
  const map: CompanionMap = new Map();
  for (const edge of edges) {
    if (!map.has(edge.plantA)) map.set(edge.plantA, new Map());
    if (!map.has(edge.plantB)) map.set(edge.plantB, new Map());
    map.get(edge.plantA)!.set(edge.plantB, edge);
    map.get(edge.plantB)!.set(edge.plantA, {
      ...edge,
      plantA: edge.plantB,
      plantB: edge.plantA,
    });
  }
  return map;
}

export function checkPair(
  a: string,
  b: string,
  map: CompanionMap
): CompanionEdge | null {
  return map.get(a)?.get(b) ?? null;
}

export function getConflicts(
  plantSlug: string,
  neighbours: string[],
  map: CompanionMap
): CompanionEdge[] {
  return neighbours
    .map((n) => checkPair(plantSlug, n, map))
    .filter((e): e is CompanionEdge => e !== null && e.relationship === 'foe');
}

export function getFriends(
  plantSlug: string,
  neighbours: string[],
  map: CompanionMap
): CompanionEdge[] {
  return neighbours
    .map((n) => checkPair(plantSlug, n, map))
    .filter(
      (e): e is CompanionEdge => e !== null && e.relationship === 'friend'
    );
}

export type CompanionStatus = 'clear' | 'friends' | 'conflict';

export function getCompanionStatus(
  plantSlug: string,
  neighbours: string[],
  map: CompanionMap
): CompanionStatus {
  const conflicts = getConflicts(plantSlug, neighbours, map);
  if (conflicts.length > 0) return 'conflict';
  const friends = getFriends(plantSlug, neighbours, map);
  if (friends.length > 0) return 'friends';
  return 'clear';
}
