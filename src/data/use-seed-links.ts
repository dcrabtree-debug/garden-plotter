import { useState, useEffect } from 'react';

interface RawSeller {
  seller: string;
  url: string;
  priceGBP: number;
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
};

function normalize(raw: RawSeedProduct[]): SeedProduct[] {
  return raw.map((r) => ({
    plantSlug: r.slug,
    varietyName: r.variety,
    links: r.sellers.map((s) => ({
      seller: s.seller,
      url: s.url,
      price: `\u00a3${s.priceGBP.toFixed(2)}`,
      logo: SELLER_LOGOS[s.seller] ?? '\ud83c\udf31',
    })),
  }));
}

let cachedData: SeedProduct[] | null = null;

export function useSeedLinks(): SeedProduct[] {
  const [data, setData] = useState<SeedProduct[]>(cachedData ?? []);

  useEffect(() => {
    if (cachedData) return;

    // Try multiple paths (dev vs production with base path)
    const paths = ['/data/seed-links.json', '/garden-plotter/data/seed-links.json'];

    async function tryFetch() {
      for (const path of paths) {
        try {
          const r = await fetch(path);
          if (r.ok) {
            const raw: RawSeedProduct[] = await r.json();
            const normalized = normalize(raw);
            cachedData = normalized;
            setData(normalized);
            return;
          }
        } catch {}
      }
      cachedData = [];
      setData([]);
    }

    tryFetch();
  }, []);

  return data;
}
