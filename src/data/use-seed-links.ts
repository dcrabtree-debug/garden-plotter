import { useState, useEffect } from 'react';

interface RawSeller {
  seller: string;
  url: string;
  priceGBP?: number;
  priceUSD?: number;
  note?: string;
}

interface RawSeedProduct {
  slug: string;
  commonName: string;
  variety: string;
  sellers: RawSeller[];
}

// Normalized for the SeedFinderPage component
export interface SeedLink {
  seller: string;
  url: string;
  price: string;
  logo: string;
}

export interface SeedProduct {
  plantSlug: string;
  varietyName: string;
  links: SeedLink[];
}

const SELLER_LOGOS: Record<string, string> = {
  'Thompson & Morgan': '\ud83c\udf31',
  'Suttons Seeds': '\ud83c\udf3e',
  "Mr Fothergill's": '\ud83c\udf3b',
  'Kings Seeds': '\ud83c\udf3f',
  'RHS Shop': '\ud83c\udfc5',
  'Burpee': '\ud83c\udf31',
  "Johnny's Selected Seeds": '\ud83c\udf3e',
  'Baker Creek Heirloom': '\ud83c\udf3b',
  'Park Seed': '\ud83c\udf3f',
  'Territorial Seed Company': '\ud83c\udf3f',
};

function normalize(raw: RawSeedProduct[], region: 'uk' | 'us'): SeedProduct[] {
  return raw.map((r) => ({
    plantSlug: r.slug,
    varietyName: r.variety,
    links: r.sellers.map((s) => {
      const price = region === 'us'
        ? `$${(s.priceUSD ?? 0).toFixed(2)}`
        : `\u00a3${(s.priceGBP ?? 0).toFixed(2)}`;
      return {
        seller: s.seller,
        url: s.url,
        price,
        logo: SELLER_LOGOS[s.seller] ?? '\ud83c\udf31',
      };
    }),
  }));
}

const cache = new Map<string, SeedProduct[]>();

export function useSeedLinks(region: 'uk' | 'us' = 'uk'): SeedProduct[] {
  const [data, setData] = useState<SeedProduct[]>(cache.get(region) ?? []);

  useEffect(() => {
    if (cache.has(region)) {
      setData(cache.get(region)!);
      return;
    }

    const file = region === 'us' ? 'seed-links-us.json' : 'seed-links.json';
    const paths = [`/data/${file}`, `/garden-plotter/data/${file}`];

    async function tryFetch() {
      for (const path of paths) {
        try {
          const r = await fetch(path);
          if (r.ok) {
            const raw: RawSeedProduct[] = await r.json();
            const normalized = normalize(raw, region);
            cache.set(region, normalized);
            setData(normalized);
            return;
          }
        } catch {}
      }
      cache.set(region, []);
      setData([]);
    }

    tryFetch();
  }, [region]);

  return data;
}
