import { useState, useEffect } from 'react';

interface SeedLink {
  seller: string;
  url: string;
  price: string;
  logo: string;
}

interface SeedProduct {
  plantSlug: string;
  varietyName: string;
  links: SeedLink[];
}

let cachedData: SeedProduct[] | null = null;

export function useSeedLinks(): SeedProduct[] {
  const [data, setData] = useState<SeedProduct[]>(cachedData ?? []);

  useEffect(() => {
    if (cachedData) return;
    fetch('/data/seed-links.json')
      .then((r) => r.json())
      .then((d: SeedProduct[]) => {
        cachedData = d;
        setData(d);
      })
      .catch(() => {
        // Seed links not yet compiled — return empty
        cachedData = [];
        setData([]);
      });
  }, []);

  return data;
}
