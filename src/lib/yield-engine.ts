/**
 * Yield Calculator Engine
 *
 * Converts raw yield-per-m² strings into actionable comparisons:
 * - Estimated kg per GreenStalk pocket per season
 * - Estimated kg per garden grid cell per season
 * - Supermarket value (what you'd pay at Tesco/Waitrose)
 * - Value density ranking (£ saved per pocket)
 *
 * Sources: RHS yield guides, BBC Gardeners' World, Gardeners' World
 * "How Much to Grow" calculator, UK supermarket prices (April 2026).
 */

import type { Plant } from '../types/plant';

// ─── Supermarket prices (UK, per kg, approximate April 2026) ──────────────────

const SUPERMARKET_PRICES_GBP: Record<string, number> = {
  // Fruit
  'strawberry-everbearing': 8.00,  // £4/250g punnet = £16/kg, but homegrown ~£8 effective
  'raspberry': 12.00,              // £3/125g punnet = £24/kg, effective ~£12
  'blueberry': 14.00,              // £3.50/125g = £28/kg, effective ~£14
  'gooseberry': 6.00,
  'blackcurrant': 8.00,
  'redcurrant': 10.00,
  'blackberry': 5.00,
  'apple-dwarf': 2.50,
  'pear': 2.50,
  'plum': 3.00,
  'fig': 12.00,
  'rhubarb': 4.00,

  // Vegetables
  'tomato-tumbling': 5.00,         // Cherry tomatoes ~£2.50/250g = £10/kg, homegrown effective ~£5
  'pepper-chilli': 15.00,          // Fresh chillies are expensive per kg
  'pepper-sweet': 4.00,
  'aubergine': 4.00,
  'courgette': 3.00,
  'cucumber': 3.50,
  'dwarf-french-bean': 5.00,       // Fine beans £2.50/200g = £12.50/kg, effective ~£5
  'runner-bean': 4.00,
  'broad-bean': 4.00,
  'pea': 6.00,                     // Fresh peas in pods expensive
  'lettuce': 8.00,                 // Bags of mixed leaves £1.50/80g = £18.75/kg, effective ~£8
  'rocket': 12.00,                 // £1.50/60g bags = £25/kg, effective ~£12
  'perpetual-spinach': 6.00,
  'swiss-chard': 5.00,
  'kale': 5.00,
  'radish': 4.00,
  'beetroot': 2.50,
  'carrot': 1.50,
  'parsnip': 2.00,
  'potato-early': 1.50,            // New potatoes slightly more
  'potato-maincrop': 1.00,
  'onion-sets': 1.50,
  'garlic': 8.00,                  // Good garlic is expensive
  'leek': 3.00,
  'sweetcorn': 4.00,               // ~50p per cob, ~4 cobs/kg
  'turnip': 2.00,
  'squash': 2.00,
  'celery': 3.00,
  'cabbage': 1.50,
  'cauliflower': 2.50,
  'broccoli-sprouting': 5.00,
  'brussels-sprouts': 4.00,
  'asparagus': 12.00,              // £3/bunch of 250g = £12/kg
  'spring-onion': 6.00,            // Small bunches add up
  'fennel': 4.00,

  // Herbs (per kg is misleading — herbs are high value per small quantity)
  'basil-sweet': 40.00,            // £1.50/30g pack = £50/kg, effective ~£40
  'chives': 30.00,                 // Fresh herbs are expensive by weight
  'mint': 25.00,
  'parsley': 20.00,
  'thyme': 35.00,
  'oregano': 30.00,
  'rosemary': 25.00,
  'sage': 30.00,
  'coriander': 25.00,
  'dill': 25.00,
  'bay-laurel': 40.00,
  'lemon-balm': 30.00,
  'lemon-verbena': 50.00,
  'chamomile': 20.00,
  'corsican-mint': 25.00,

  // Flowers & ornamentals — no direct supermarket equivalent
  'nasturtium': 0,
  'marigold': 0,
  'calendula': 0,
  'borage': 0,
  'sunflower': 0,
  'cornflower': 0,
  'sweet-william': 0,
  'lavender': 0,
  'dianthus': 0,
  'scented-geranium': 0,
  'night-scented-stock': 0,
  'nicotiana': 0,
  'dwarf-sweet-pea': 0,
};

// ─── GreenStalk pocket area ──────────────────────────────────────────────────
// A GreenStalk pocket is roughly 15cm x 20cm x 20cm deep
// Surface area ≈ 0.03 m² (300 cm²)
const GREENSTALK_POCKET_AREA_M2 = 0.03;

// Standard garden grid cell (from garden store config)
// Default 0.5m x 0.5m = 0.25 m²
const DEFAULT_CELL_AREA_M2 = 0.25;

// ─── Yield parsing ───────────────────────────────────────────────────────────

interface ParsedYield {
  minKgPerM2: number;
  maxKgPerM2: number;
  avgKgPerM2: number;
  isPerPlant: boolean;
  raw: string;
}

function parseYieldString(raw: string): ParsedYield {
  const s = raw.toLowerCase();

  // Empty or missing — use defaults based on plant category
  if (!s || s === 'missing') {
    return { minKgPerM2: 0, maxKgPerM2: 0, avgKgPerM2: 0, isPerPlant: false, raw: '' };
  }

  // "N/A" or companion/ornamental
  if (s.includes('n/a') || s.includes('companion') || s.includes('ornamental') || s.includes('pollinator')) {
    return { minKgPerM2: 0, maxKgPerM2: 0, avgKgPerM2: 0, isPerPlant: false, raw };
  }

  // "X-Y kg/m2" or "X-Y kg per m2"
  const rangeMatch = s.match(/([\d.]+)\s*-\s*([\d.]+)\s*kg/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    return { minKgPerM2: min, maxKgPerM2: max, avgKgPerM2: (min + max) / 2, isPerPlant: false, raw };
  }

  // "X kg per plant" or "X kg per bush" or "X-Y kg per crown"
  const perPlantMatch = s.match(/([\d.]+)\s*-?\s*([\d.]*)\s*kg\s*(per|\/)\s*(plant|bush|crown|tree|metre)/);
  if (perPlantMatch) {
    const min = parseFloat(perPlantMatch[1]);
    const max = perPlantMatch[2] ? parseFloat(perPlantMatch[2]) : min;
    // Approximate: one plant per ~0.5-1 m²
    return { minKgPerM2: min * 0.7, maxKgPerM2: max * 0.7, avgKgPerM2: ((min + max) / 2) * 0.7, isPerPlant: true, raw };
  }

  // "1 head per plant" type
  const headMatch = s.match(/(\d+)\s*(head|cob|bulb|fruit)/);
  if (headMatch) {
    const count = parseInt(headMatch[1]);
    // Approximate weight: 0.5-1kg per head/cob
    return { minKgPerM2: count * 0.3, maxKgPerM2: count * 0.7, avgKgPerM2: count * 0.5, isPerPlant: true, raw };
  }

  // "Multiple harvests" or text description
  if (s.includes('harvest') || s.includes('leaves') || s.includes('year-round')) {
    return { minKgPerM2: 0.3, maxKgPerM2: 0.8, avgKgPerM2: 0.5, isPerPlant: false, raw };
  }

  return { minKgPerM2: 0, maxKgPerM2: 0, avgKgPerM2: 0, isPerPlant: false, raw };
}

// ─── Yield calculation per context ───────────────────────────────────────────

export interface YieldEstimate {
  plant: Plant;
  /** Kg per GreenStalk pocket per season */
  kgPerPocket: number;
  /** Kg per garden grid cell (0.3m x 0.3m) per season */
  kgPerCell: number;
  /** Kg per m² per season */
  kgPerM2: number;
  /** Supermarket price per kg */
  pricePerKg: number;
  /** Value of one GreenStalk pocket's yield (£) */
  pocketValueGBP: number;
  /** Value of one garden cell's yield (£) */
  cellValueGBP: number;
  /** Surrey growing season factor (0-1, accounts for shorter UK season) */
  seasonFactor: number;
  /** Days of harvest from one sowing */
  harvestDays: number;
  /** Human-readable yield description */
  description: string;
}

function getSurreySeasonFactor(plant: Plant): number {
  const hw = plant.plantingWindow.harvest;
  if (!hw) return 0.5;
  const [start, end] = hw;
  const months = start <= end ? end - start + 1 : (12 - start + 1) + end;
  // Longer harvest window = higher factor (max 1.0 for year-round crops)
  return Math.min(1.0, months / 6);
}

// Fallback yields for plants without explicit data (e.g. US plants)
const CATEGORY_DEFAULTS_KG_M2: Record<string, number> = {
  vegetable: 3.0,
  fruit: 2.5,
  herb: 0.5,
  legume: 2.5,
  flower: 0,
};

export function calculateYield(plant: Plant): YieldEstimate {
  let parsed = parseYieldString(plant.inGround?.expectedYieldPerM2 ?? '');

  // Fallback for plants with no yield data
  if (parsed.avgKgPerM2 <= 0 && plant.category !== 'flower') {
    const fallback = CATEGORY_DEFAULTS_KG_M2[plant.category] ?? 1.0;
    parsed = { minKgPerM2: fallback * 0.7, maxKgPerM2: fallback * 1.3, avgKgPerM2: fallback, isPerPlant: false, raw: 'estimated' };
  }

  const seasonFactor = getSurreySeasonFactor(plant);
  const pricePerKg = SUPERMARKET_PRICES_GBP[plant.slug] ?? 0;

  // Apply season factor for Surrey's shorter growing season
  const effectiveKgPerM2 = parsed.avgKgPerM2 * seasonFactor;

  // Scale to pocket/cell size
  // GreenStalk pockets are small but intensive — plants fill them well
  // Use a productivity multiplier for container-intensive growing (1.5x)
  const containerBonus = plant.greenstalkSuitability === 'ideal' ? 1.5 :
    plant.greenstalkSuitability === 'good' ? 1.2 : 1.0;

  const kgPerPocket = effectiveKgPerM2 * GREENSTALK_POCKET_AREA_M2 * containerBonus;
  const kgPerCell = effectiveKgPerM2 * DEFAULT_CELL_AREA_M2;

  const pocketValueGBP = kgPerPocket * pricePerKg;
  const cellValueGBP = kgPerCell * pricePerKg;

  // Harvest duration
  const hw = plant.plantingWindow.harvest;
  const harvestDays = hw ? ((hw[1] >= hw[0] ? hw[1] - hw[0] + 1 : 12 - hw[0] + 1 + hw[1]) * 30) : 0;

  // Description
  let description: string;
  if (parsed.avgKgPerM2 <= 0) {
    description = plant.category === 'flower' ? 'Companion/ornamental — no food yield' : 'Yield data not available';
  } else if (pricePerKg >= 20) {
    description = `High-value crop: £${pocketValueGBP.toFixed(2)}/pocket saves you buying expensive ${plant.commonName.toLowerCase()} (£${pricePerKg}/kg retail)`;
  } else if (kgPerPocket >= 0.1) {
    description = `Good producer: ~${(kgPerPocket * 1000).toFixed(0)}g per pocket over ${harvestDays} days`;
  } else {
    description = `Light yield: ~${(kgPerPocket * 1000).toFixed(0)}g per pocket — grown for flavour, not volume`;
  }

  return {
    plant,
    kgPerPocket: Math.round(kgPerPocket * 1000) / 1000,
    kgPerCell: Math.round(kgPerCell * 1000) / 1000,
    kgPerM2: Math.round(effectiveKgPerM2 * 100) / 100,
    pricePerKg,
    pocketValueGBP: Math.round(pocketValueGBP * 100) / 100,
    cellValueGBP: Math.round(cellValueGBP * 100) / 100,
    seasonFactor: Math.round(seasonFactor * 100) / 100,
    harvestDays,
    description,
  };
}

export type YieldSort = 'value-per-pocket' | 'kg-per-pocket' | 'value-per-cell' | 'kg-per-m2';

export function rankByYield(
  plants: Plant[],
  sort: YieldSort = 'value-per-pocket',
  context: 'greenstalk' | 'inground' = 'greenstalk'
): YieldEstimate[] {
  const estimates = plants
    .map((p) => calculateYield(p))
    .filter((e) => {
      if (context === 'greenstalk') {
        return e.plant.greenstalkSuitability !== 'unsuitable' && e.kgPerPocket > 0;
      }
      return e.kgPerM2 > 0;
    });

  const sortFn: Record<YieldSort, (a: YieldEstimate, b: YieldEstimate) => number> = {
    'value-per-pocket': (a, b) => b.pocketValueGBP - a.pocketValueGBP,
    'kg-per-pocket': (a, b) => b.kgPerPocket - a.kgPerPocket,
    'value-per-cell': (a, b) => b.cellValueGBP - a.cellValueGBP,
    'kg-per-m2': (a, b) => b.kgPerM2 - a.kgPerM2,
  };

  return estimates.sort(sortFn[sort]);
}
