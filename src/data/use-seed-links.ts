import { useState, useEffect } from 'react';

interface RawSeller {
  seller: string;
  url: string;
  priceGBP?: number;
  priceUSD?: number;
  badge?: string;
  recommended?: boolean;
  note?: string;
}

interface RawVariety {
  name: string;
  why: string;
  context?: string;
  sellers: RawSeller[];
}

interface RawSeedProduct {
  slug: string;
  commonName: string;
  variety?: string; // legacy single-variety format
  varieties?: RawVariety[];
  sellers?: RawSeller[]; // legacy flat format
}

// Normalized for the SeedFinderPage component
export interface SeedLink {
  seller: string;
  url: string;
  price: string;
  logo: string;
  badge?: string;
  recommended?: boolean;
}

export interface SeedVariety {
  name: string;
  why: string;
  links: SeedLink[];
}

export interface SeedProduct {
  plantSlug: string;
  varietyName: string;
  varieties: SeedVariety[];
  links: SeedLink[]; // first variety's links for backwards compat
}

export type SeedContext = 'greenstalk' | 'inground';

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

function normalizeSeller(s: RawSeller, region: 'uk' | 'us'): SeedLink {
  const price = region === 'us'
    ? `$${(s.priceUSD ?? 0).toFixed(2)}`
    : `\u00a3${(s.priceGBP ?? 0).toFixed(2)}`;
  return {
    seller: s.seller,
    url: s.url,
    price,
    logo: SELLER_LOGOS[s.seller] ?? '\ud83c\udf31',
    badge: s.badge,
    recommended: s.recommended,
  };
}

function normalize(raw: RawSeedProduct[], region: 'uk' | 'us'): SeedProduct[] {
  return raw.map((r) => {
    // New multi-variety format
    if (r.varieties && r.varieties.length > 0) {
      const varieties: SeedVariety[] = r.varieties.map((v) => ({
        name: v.name,
        why: v.why,
        links: v.sellers.map((s) => normalizeSeller(s, region))
          .sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0)),
      }));
      return {
        plantSlug: r.slug,
        varietyName: varieties[0]?.name ?? r.commonName,
        varieties,
        links: varieties[0]?.links ?? [],
      };
    }

    // Legacy single-variety format
    const links = (r.sellers ?? []).map((s) => normalizeSeller(s, region));
    return {
      plantSlug: r.slug,
      varietyName: r.variety ?? r.commonName,
      varieties: [{
        name: r.variety ?? r.commonName,
        why: '',
        links,
      }],
      links,
    };
  });
}

const cache = new Map<string, SeedProduct[]>();

function fileForContext(region: 'uk' | 'us', context: SeedContext): string {
  if (region === 'us') {
    return context === 'greenstalk' ? 'seed-links-greenstalk-us.json' : 'seed-links-inground-us.json';
  }
  return context === 'greenstalk' ? 'seed-links-greenstalk.json' : 'seed-links-inground.json';
}

export function useSeedLinks(
  region: 'uk' | 'us' = 'uk',
  context: SeedContext = 'greenstalk'
): SeedProduct[] {
  const key = `${region}-${context}`;
  const [data, setData] = useState<SeedProduct[]>(cache.get(key) ?? []);

  useEffect(() => {
    if (cache.has(key)) {
      setData(cache.get(key)!);
      return;
    }

    const file = fileForContext(region, context);
    // Also try legacy filenames as fallback
    const legacyFile = region === 'us' ? 'seed-links-us.json' : 'seed-links.json';
    const paths = [
      `/data/${file}`, `/garden-plotter/data/${file}`,
      `/data/${legacyFile}`, `/garden-plotter/data/${legacyFile}`,
    ];

    async function tryFetch() {
      for (const path of paths) {
        try {
          const r = await fetch(path);
          if (r.ok) {
            const raw: RawSeedProduct[] = await r.json();
            const normalized = normalize(raw, region);
            cache.set(key, normalized);
            setData(normalized);
            return;
          }
        } catch {}
      }
      cache.set(key, []);
      setData([]);
    }

    tryFetch();
  }, [region, context, key]);

  return data;
}
