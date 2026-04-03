import { useMemo } from 'react';
import type { Plant } from '../types/plant';
import plantsData from '../../data/plants.json';

const plants = plantsData as Plant[];

export function usePlantDb() {
  const plantMap = useMemo(() => {
    const map = new Map<string, Plant>();
    for (const p of plants) map.set(p.slug, p);
    return map;
  }, []);

  return {
    plants,
    plantMap,
    getPlant: (slug: string) => plantMap.get(slug) ?? null,
    searchPlants: (query: string) => {
      const q = query.toLowerCase();
      return plants.filter(
        (p) =>
          p.commonName.toLowerCase().includes(q) ||
          p.category.includes(q) ||
          p.botanicalName.toLowerCase().includes(q)
      );
    },
  };
}
