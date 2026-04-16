import { useState, useEffect, useMemo } from 'react';
import type { Plant } from '../types/plant';
import plantsUK from '../../data/plants.json';

const ukPlants = plantsUK as Plant[];

const cache = new Map<string, Plant[]>();

export function usePlantDb(region: 'uk' | 'us' = 'uk') {
  const [usPlants, setUsPlants] = useState<Plant[] | null>(cache.get('us') ?? null);

  useEffect(() => {
    if (region !== 'us') return;
    if (cache.has('us')) {
      setUsPlants(cache.get('us')!);
      return;
    }

    const base = import.meta.env.BASE_URL || '/';
    const paths = [`${base}data/plants-us.json`];

    async function tryFetch() {
      for (const path of paths) {
        try {
          const r = await fetch(path);
          if (r.ok) {
            const data: Plant[] = await r.json();
            cache.set('us', data);
            setUsPlants(data);
            return;
          }
        } catch {}
      }
      // Fallback to UK data if US data not found
      cache.set('us', ukPlants);
      setUsPlants(ukPlants);
    }

    tryFetch();
  }, [region]);

  const plants = region === 'us' ? (usPlants ?? ukPlants) : ukPlants;

  const plantMap = useMemo(() => {
    const map = new Map<string, Plant>();
    for (const p of plants) map.set(p.slug, p);
    return map;
  }, [plants]);

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
