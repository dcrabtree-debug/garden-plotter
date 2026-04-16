// ═══════════════════════════════════════════════════════════════════════════
// Variety → Direct Shop URL mapping
// ═══════════════════════════════════════════════════════════════════════════
//
// Maps specific named varieties to their direct product pages at UK seed
// suppliers. Used by PlantDetail to render "🛒 Buy 'Sungold' at T&M" links
// next to each expert-recommended variety.
//
// Coverage: ~60 of the most-recommended named varieties across our 98 plants.
// Uncovered varieties fall back to a generic T&M search URL in the UI.
// ═══════════════════════════════════════════════════════════════════════════

export interface VarietyBuyInfo {
  url: string;
  supplier:
    | 'Thompson & Morgan'
    | 'Chiltern Seeds'
    | 'Sarah Raven'
    | 'RHS'
    | 'DT Brown'
    | 'Marshalls'
    | 'Crocus';
}

/**
 * Lookup by variety name (case-insensitive). Name matching is fuzzy:
 * `lookupVarietyBuyUrl` strips parentheticals and common suffixes.
 */
const VARIETY_BUY_URLS: Record<string, VarietyBuyInfo> = {
  // ── Tomatoes ─────────────────────────────────────────────────────────────
  'tumbling tom red': { url: 'https://www.thompson-morgan.com/p/tomato-tumbling-tom-red-garden-ready-plants/T52933TM', supplier: 'Thompson & Morgan' },
  'tumbling tom yellow': { url: 'https://www.thompson-morgan.com/p/tomato-tumbling-tom-yellow-seeds/T52957TM', supplier: 'Thompson & Morgan' },
  'sungold': { url: 'https://www.thompson-morgan.com/p/tomato-sungold-f1-hybrid-seeds/T71112TM', supplier: 'Thompson & Morgan' },
  'sweet aperitif': { url: 'https://www.thompson-morgan.com/p/tomato-sweet-aperitif-seeds/T61129TM', supplier: 'Thompson & Morgan' },
  'gardener\'s delight': { url: 'https://www.thompson-morgan.com/p/tomato-gardeners-delight-seeds/t52992tm', supplier: 'Thompson & Morgan' },

  // ── Beans & Peas ─────────────────────────────────────────────────────────
  'wisley magic': { url: 'https://www.thompson-morgan.com/p/runner-bean-wisley-magic-agm-seeds/T65050TM', supplier: 'Thompson & Morgan' },
  'firestorm': { url: 'https://www.thompson-morgan.com/p/runner-bean-firestorm-seeds/T55013TM', supplier: 'Thompson & Morgan' },
  'scarlet emperor': { url: 'https://www.thompson-morgan.com/p/runner-bean-scarlet-emperor-seeds/T58998TM', supplier: 'Thompson & Morgan' },
  'moonlight': { url: 'https://www.thompson-morgan.com/p/runner-bean-moonlight-seeds/T57004TM', supplier: 'Thompson & Morgan' },
  'safari': { url: 'https://www.thompson-morgan.com/p/dwarf-french-bean-safari-seeds/T58869TM', supplier: 'Thompson & Morgan' },
  'purple teepee': { url: 'https://www.thompson-morgan.com/p/dwarf-french-bean-purple-teepee-seeds/T58858TM', supplier: 'Thompson & Morgan' },
  'hurst green shaft': { url: 'https://www.thompson-morgan.com/p/pea-hurst-green-shaft-agm-seeds/T55076TM', supplier: 'Thompson & Morgan' },
  'kelvedon wonder': { url: 'https://www.thompson-morgan.com/p/pea-kelvedon-wonder-seeds/T55078TM', supplier: 'Thompson & Morgan' },
  'aquadulce claudia': { url: 'https://www.thompson-morgan.com/p/broad-bean-aquadulce-claudia-seeds/T55037TM', supplier: 'Thompson & Morgan' },
  'the sutton': { url: 'https://www.thompson-morgan.com/p/broad-bean-the-sutton-agm-seeds/T55035TM', supplier: 'Thompson & Morgan' },
  'crimson flowered': { url: 'https://www.thompson-morgan.com/p/broad-bean-crimson-flowered-seeds/T55036TM', supplier: 'Thompson & Morgan' },

  // ── Potatoes ─────────────────────────────────────────────────────────────
  'charlotte': { url: 'https://www.thompson-morgan.com/p/seed-potato-charlotte-agm-2nd-early/T63100TM', supplier: 'Thompson & Morgan' },
  'accent': { url: 'https://www.thompson-morgan.com/p/seed-potato-accent-first-early/T63098TM', supplier: 'Thompson & Morgan' },
  'foremost': { url: 'https://www.thompson-morgan.com/p/seed-potato-foremost-first-early/T63104TM', supplier: 'Thompson & Morgan' },
  'desiree': { url: 'https://www.thompson-morgan.com/p/seed-potato-desiree-maincrop/T63103TM', supplier: 'Thompson & Morgan' },
  'king edward': { url: 'https://www.thompson-morgan.com/p/seed-potato-king-edward-maincrop/T63106TM', supplier: 'Thompson & Morgan' },
  'sarpo mira': { url: 'https://www.thompson-morgan.com/p/seed-potato-sarpo-mira-maincrop/T63108TM', supplier: 'Thompson & Morgan' },
  'pink fir apple': { url: 'https://www.thompson-morgan.com/p/seed-potato-pink-fir-apple-agm-maincrop/T63107TM', supplier: 'Thompson & Morgan' },

  // ── Salad & Leaf ─────────────────────────────────────────────────────────
  'little gem': { url: 'https://www.thompson-morgan.com/p/lettuce-little-gem-seeds/T55116TM', supplier: 'Thompson & Morgan' },
  'bijou': { url: 'https://www.thompson-morgan.com/p/lettuce-bijou-agm-seeds/T55114TM', supplier: 'Thompson & Morgan' },
  'rudi': { url: 'https://www.thompson-morgan.com/p/radish-rudi-seeds/T61006TM', supplier: 'Thompson & Morgan' },
  'french breakfast 3': { url: 'https://www.thompson-morgan.com/p/radish-french-breakfast-3-seeds/T61001TM', supplier: 'Thompson & Morgan' },
  'cherry belle': { url: 'https://www.thompson-morgan.com/p/radish-cherry-belle-seeds/T61000TM', supplier: 'Thompson & Morgan' },

  // ── Brassicas & Roots ────────────────────────────────────────────────────
  'nero di toscana': { url: 'https://www.thompson-morgan.com/p/kale-cavolo-nero-nero-di-toscana-seeds/T58935TM', supplier: 'Thompson & Morgan' },
  'cavolo nero': { url: 'https://www.thompson-morgan.com/p/kale-cavolo-nero-nero-di-toscana-seeds/T58935TM', supplier: 'Thompson & Morgan' },
  'redbor': { url: 'https://www.thompson-morgan.com/p/kale-redbor-agm-seeds/T58937TM', supplier: 'Thompson & Morgan' },
  'reflex': { url: 'https://www.thompson-morgan.com/p/kale-reflex-agm-seeds/T58938TM', supplier: 'Thompson & Morgan' },
  'boltardy': { url: 'https://www.thompson-morgan.com/p/beetroot-boltardy-agm-seeds/T58775TM', supplier: 'Thompson & Morgan' },
  'pablo': { url: 'https://www.thompson-morgan.com/p/beetroot-pablo-f1-agm-seeds/T58779TM', supplier: 'Thompson & Morgan' },
  'nantes 2': { url: 'https://www.thompson-morgan.com/p/carrot-nantes-2-seeds/T58827TM', supplier: 'Thompson & Morgan' },
  'early nantes': { url: 'https://www.thompson-morgan.com/p/carrot-nantes-2-seeds/T58827TM', supplier: 'Thompson & Morgan' },
  'amsterdam forcing': { url: 'https://www.thompson-morgan.com/p/carrot-amsterdam-forcing-3-seeds/T58818TM', supplier: 'Thompson & Morgan' },
  'resistafly': { url: 'https://www.thompson-morgan.com/p/carrot-resistafly-f1-seeds/T58833TM', supplier: 'Thompson & Morgan' },
  'early purple sprouting': { url: 'https://www.thompson-morgan.com/p/broccoli-early-purple-sprouting-seeds/T58799TM', supplier: 'Thompson & Morgan' },
  'rudolph': { url: 'https://www.thompson-morgan.com/p/broccoli-rudolph-agm-seeds/T58801TM', supplier: 'Thompson & Morgan' },
  'white lisbon': { url: 'https://www.thompson-morgan.com/p/spring-onion-white-lisbon-seeds/T61060TM', supplier: 'Thompson & Morgan' },
  'sturon': { url: 'https://www.thompson-morgan.com/p/onion-sturon-agm-sets/T58841TM', supplier: 'Thompson & Morgan' },
  'red baron': { url: 'https://www.thompson-morgan.com/p/onion-red-baron-sets/T58840TM', supplier: 'Thompson & Morgan' },
  'gladiator': { url: 'https://www.thompson-morgan.com/p/parsnip-gladiator-f1-agm-seeds/T58948TM', supplier: 'Thompson & Morgan' },

  // ── Cucurbits ────────────────────────────────────────────────────────────
  'defender': { url: 'https://www.thompson-morgan.com/p/courgette-defender-f1-agm-seeds/T58892TM', supplier: 'Thompson & Morgan' },
  'parador': { url: 'https://www.thompson-morgan.com/p/courgette-parador-f1-agm-seeds/T58895TM', supplier: 'Thompson & Morgan' },
  'tromboncino': { url: 'https://www.thompson-morgan.com/p/courgette-tromboncino-seeds/T58899TM', supplier: 'Thompson & Morgan' },
  'marketmore': { url: 'https://www.thompson-morgan.com/p/cucumber-marketmore-seeds/T58902TM', supplier: 'Thompson & Morgan' },
  'la diva': { url: 'https://www.thompson-morgan.com/p/cucumber-la-diva-f1-agm-seeds/T58903TM', supplier: 'Thompson & Morgan' },

  // ── Peppers ──────────────────────────────────────────────────────────────
  'apache': { url: 'https://www.thompson-morgan.com/p/chilli-pepper-apache-f1-agm-seeds/T65033TM', supplier: 'Thompson & Morgan' },
  'hungarian hot wax': { url: 'https://www.thompson-morgan.com/p/chilli-pepper-hungarian-hot-wax-seeds/T65036TM', supplier: 'Thompson & Morgan' },
  'sweet banana': { url: 'https://www.thompson-morgan.com/p/pepper-sweet-banana-seeds/T65040TM', supplier: 'Thompson & Morgan' },

  // ── Herbs ────────────────────────────────────────────────────────────────
  'sweet genovese': { url: 'https://www.thompson-morgan.com/p/basil-sweet-genovese-seeds/T59018TM', supplier: 'Thompson & Morgan' },
  'champion moss curled': { url: 'https://www.thompson-morgan.com/p/parsley-champion-moss-curled-seeds/T59032TM', supplier: 'Thompson & Morgan' },
  'italian giant': { url: 'https://www.thompson-morgan.com/p/parsley-plain-leaved-giant-seeds/T59033TM', supplier: 'Thompson & Morgan' },
  'dukat': { url: 'https://www.thompson-morgan.com/p/dill-dukat-seeds/T59022TM', supplier: 'Thompson & Morgan' },
  'calypso': { url: 'https://www.thompson-morgan.com/p/coriander-calypso-seeds/T59020TM', supplier: 'Thompson & Morgan' },

  // ── Fruit ────────────────────────────────────────────────────────────────
  'flamenco': { url: 'https://www.thompson-morgan.com/p/strawberry-flamenco-agm-plants/KB7029TM', supplier: 'Thompson & Morgan' },
  'mara des bois': { url: 'https://www.thompson-morgan.com/p/strawberry-mara-des-bois-plants/KB9086TM', supplier: 'Thompson & Morgan' },
  'finesse': { url: 'https://www.thompson-morgan.com/p/strawberry-finesse-agm-plants/KB9084TM', supplier: 'Thompson & Morgan' },

  // ── Flowers / Ornamentals ────────────────────────────────────────────────
  'matucana': { url: 'https://www.chilternseeds.co.uk/item_6060_matucana_sweet_pea_seeds', supplier: 'Chiltern Seeds' },
  'cupani': { url: 'https://www.chilternseeds.co.uk/item_6080_cupani_sweet_pea_seeds', supplier: 'Chiltern Seeds' },
  'gwendoline': { url: 'https://www.sarahraven.com/sweet-pea-gwendoline', supplier: 'Sarah Raven' },
  'empress of india': { url: 'https://www.thompson-morgan.com/p/nasturtium-empress-of-india-seeds/T36112TM', supplier: 'Thompson & Morgan' },
  'alaska mixed': { url: 'https://www.thompson-morgan.com/p/nasturtium-alaska-series-mixed-seeds/T36103TM', supplier: 'Thompson & Morgan' },
  'naughty marietta': { url: 'https://www.thompson-morgan.com/p/french-marigold-naughty-marietta-agm-seeds/T35051TM', supplier: 'Thompson & Morgan' },
};

/**
 * Generate a Thompson & Morgan search URL as a fallback when no direct
 * product page is mapped. This keeps every variety at least clickable.
 */
function searchFallbackUrl(varietyName: string, plantName?: string): VarietyBuyInfo {
  const q = encodeURIComponent(plantName ? `${plantName} ${varietyName}` : varietyName);
  return {
    url: `https://www.thompson-morgan.com/search?q=${q}`,
    supplier: 'Thompson & Morgan',
  };
}

function normaliseVarietyName(name: string): string {
  // Strip parentheticals, trim whitespace, lowercase
  let s = name.toLowerCase().trim();
  s = s.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  s = s.replace(/\s+f1$/, '');
  s = s.replace(/\s+agm$/, '');
  s = s.replace(/\s+series$/, '');
  return s;
}

export function lookupVarietyBuyUrl(varietyName: string, plantName?: string): VarietyBuyInfo {
  const key = normaliseVarietyName(varietyName);
  if (VARIETY_BUY_URLS[key]) return VARIETY_BUY_URLS[key];

  // Try partial match — e.g. "Tumbling Tom Red / Yellow" when only "tumbling tom red" is keyed
  for (const k of Object.keys(VARIETY_BUY_URLS)) {
    if (key.includes(k) || k.includes(key)) {
      return VARIETY_BUY_URLS[k];
    }
  }

  return searchFallbackUrl(varietyName, plantName);
}
