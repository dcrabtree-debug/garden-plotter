import { useMemo } from 'react';
import type { CompanionEdge, CompanionMap } from '../types/companion';
import { buildCompanionMap } from '../lib/companion-engine';
import companionsData from '../../data/companions.json';

const edges = companionsData as CompanionEdge[];

export function useCompanionDb() {
  const companionMap: CompanionMap = useMemo(
    () => buildCompanionMap(edges),
    []
  );

  return {
    edges,
    companionMap,
  };
}
