import { useState, useMemo } from 'react';
import { getRecommendedSuccessions, type SuccessionPlan } from '../lib/succession-engine';
import { usePlannerStore } from '../state/planner-store';
import { useGardenStore } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import {
  getMonthName,
  isInWindow,
  getCurrentMonth,
  SURREY_LAST_FROST_MONTH,
  SURREY_FIRST_FROST_MONTH,
} from '../lib/calendar-utils';
import type { Plant } from '../types/plant';

// ─── Expert-sourced monthly tasks (RHS / BBC Gardeners' World) ───────────────
// These are generic tasks NOT tied to specific planted crops.

interface MonthlyTask {
  emoji: string;
  task: string;
  detail: string;
  category: 'sow' | 'care' | 'pest' | 'harvest' | 'general';
}

const MONTHLY_TASKS: Record<number, MonthlyTask[]> = {
  1: [
    { emoji: '📋', task: 'Order seeds', detail: 'Best selection available early in the year. Plan your planting layout.', category: 'general' },
    { emoji: '🧹', task: 'Clean pots and trays', detail: 'Wash with hot soapy water to prevent disease carryover.', category: 'care' },
    { emoji: '🌱', task: 'Chit early potatoes', detail: 'Stand seed potatoes in egg boxes, eyes upward, in a cool bright spot.', category: 'sow' },
  ],
  2: [
    { emoji: '🌱', task: 'Sow broad beans indoors', detail: 'Start in deep pots under cover for planting out after last frost.', category: 'sow' },
    { emoji: '🧅', task: 'Sow onions and leeks', detail: 'Start in modules under cover. They need a long growing season.', category: 'sow' },
    { emoji: '🪴', task: 'Prepare seed compost', detail: 'Use fine, free-draining seed compost. Avoid multi-purpose for seeds.', category: 'care' },
  ],
  3: [
    { emoji: '🌶️', task: 'Sow peppers and aubergines', detail: 'Need 20°C+ to germinate. Use a heated propagator or warm windowsill.', category: 'sow' },
    { emoji: '🍅', task: 'Sow tomatoes indoors', detail: 'Mid-March for planting out late May. One seed per small pot.', category: 'sow' },
    { emoji: '🥬', task: 'Start early salad crops', detail: 'Lettuce, rocket, radish under cloches or in a cold greenhouse.', category: 'sow' },
    { emoji: '🐌', task: 'Set up slug defences', detail: 'Beer traps, copper tape, or nematode treatment before plants go out.', category: 'pest' },
  ],
  4: [
    { emoji: '❄️', task: 'Watch for late frosts', detail: 'Surrey last frost typically mid-April. Keep fleece handy for tender plants.', category: 'care' },
    { emoji: '🥔', task: 'Plant early potatoes', detail: 'In the ground or large containers. Earth up as shoots appear.', category: 'sow' },
    { emoji: '🫛', task: 'Direct sow hardy crops', detail: 'Peas, broad beans, beetroot, carrots, parsnips can go direct outside now.', category: 'sow' },
    { emoji: '🌱', task: 'Harden off seedlings', detail: 'Move indoor-raised plants outside for increasing periods over 7-10 days.', category: 'care' },
    { emoji: '🦗', task: 'Check for aphids', detail: 'Inspect new growth daily. Squash small colonies by hand early.', category: 'pest' },
    { emoji: '💧', task: 'Begin regular watering', detail: 'GreenStalk pockets dry out fast in spring sunshine. Check daily.', category: 'care' },
  ],
  5: [
    { emoji: '🍅', task: 'Plant out tomatoes after last frost', detail: 'Only after all frost risk has passed — usually mid-May for Surrey.', category: 'sow' },
    { emoji: '🫘', task: 'Sow runner and French beans', detail: 'Direct sow or plant out hardened-off seedlings after last frost.', category: 'sow' },
    { emoji: '🥒', task: 'Plant out courgettes and squash', detail: 'Wait until all frost risk is past. Harden off for a week first.', category: 'sow' },
    { emoji: '💧', task: 'Water daily in warm spells', detail: 'Containers and GreenStalks may need twice daily in heat. Water in the morning.', category: 'care' },
    { emoji: '🧪', task: 'Start weekly feeding', detail: 'Begin liquid tomato feed for fruiting crops once flowers appear.', category: 'care' },
  ],
  6: [
    { emoji: '🍓', task: 'Pick strawberries', detail: 'Harvest when fully red. Check every 1-2 days as fruit ripens fast.', category: 'harvest' },
    { emoji: '🥬', task: 'Succession sow salads', detail: 'Sow lettuce and rocket every 2-3 weeks for continuous harvest.', category: 'sow' },
    { emoji: '🧪', task: 'Feed weekly', detail: 'All fruiting crops need weekly liquid feed. Leafy crops fortnightly.', category: 'care' },
    { emoji: '🐛', task: 'Check for caterpillars', detail: 'Cabbage white butterflies active. Check brassica undersides daily.', category: 'pest' },
    { emoji: '💧', task: 'Consistent deep watering', detail: 'Irregular watering causes blossom end rot in tomatoes and peppers.', category: 'care' },
  ],
  7: [
    { emoji: '🍅', task: 'Remove tomato side-shoots', detail: 'Pinch out shoots growing between main stem and leaf branches (cordon types only).', category: 'care' },
    { emoji: '🫘', task: 'Pick beans regularly', detail: 'Harvest French and runner beans every 2-3 days. Regular picking = more beans.', category: 'harvest' },
    { emoji: '⚠️', task: 'Blight watch begins', detail: 'Check tomato and potato foliage for brown patches in humid weather. Remove affected leaves immediately.', category: 'pest' },
    { emoji: '💧', task: 'Water twice daily in heat', detail: 'Morning and evening watering essential for GreenStalks in summer heat.', category: 'care' },
    { emoji: '🥬', task: 'Continue succession sowing', detail: 'Last sowing of salads, radish, spring onions for autumn harvest.', category: 'sow' },
  ],
  8: [
    { emoji: '🧅', task: 'Harvest onions and garlic', detail: 'When foliage yellows and falls over. Dry in sun for 2 weeks.', category: 'harvest' },
    { emoji: '🫛', task: 'Sow winter salads', detail: 'Lamb\'s lettuce, winter lettuce, land cress for autumn and winter.', category: 'sow' },
    { emoji: '💧', task: 'Keep watering consistently', detail: 'Don\'t ease off — August heat dries containers fast.', category: 'care' },
    { emoji: '🍅', task: 'Harvest tomatoes as they ripen', detail: 'Pick when fully coloured. Green tomatoes can ripen on a windowsill.', category: 'harvest' },
  ],
  9: [
    { emoji: '🧅', task: 'Plant autumn garlic', detail: 'Plant individual cloves 15cm apart, 5cm deep. Harvest next June.', category: 'sow' },
    { emoji: '🥦', task: 'Plant spring cabbage', detail: 'Transplant spring cabbage seedlings now for spring harvest.', category: 'sow' },
    { emoji: '🍂', task: 'Clear spent crops', detail: 'Remove finished plants. Add to compost heap.', category: 'general' },
    { emoji: '🧪', task: 'Reduce feeding', detail: 'Stop feeding as growth slows. Tomatoes: stop feeding once top truss sets.', category: 'care' },
  ],
  10: [
    { emoji: '❄️', task: 'Protect tender plants', detail: 'First frost typically mid-October in Surrey. Bring GreenStalks under cover or protect with fleece.', category: 'care' },
    { emoji: '🧹', task: 'Clear and compost', detail: 'Remove all spent summer crops. Clean GreenStalk pockets.', category: 'general' },
    { emoji: '🧅', task: 'Plant garlic and broad beans', detail: 'Autumn-sown broad beans crop 2-3 weeks earlier than spring-sown.', category: 'sow' },
    { emoji: '🪴', task: 'Plant bare-root fruit', detail: 'November onwards — plant fruit trees and bushes while dormant.', category: 'sow' },
  ],
  11: [
    { emoji: '🪴', task: 'Plant bare-root trees and bushes', detail: 'Best time for fruit trees, currants, gooseberries. Soak roots before planting.', category: 'sow' },
    { emoji: '🧹', task: 'Final garden tidy', detail: 'Remove all plant debris. Clean and store canes, netting.', category: 'general' },
    { emoji: '📋', task: 'Review and plan', detail: 'Note what grew well, what didn\'t. Plan crop rotation for next year.', category: 'general' },
  ],
  12: [
    { emoji: '📋', task: 'Plan next year\'s planting', detail: 'Use crop rotation records. Order seed catalogues.', category: 'general' },
    { emoji: '🧹', task: 'Maintain tools', detail: 'Clean, sharpen, and oil garden tools. Service lawnmower.', category: 'general' },
    { emoji: '🎄', task: 'Force rhubarb', detail: 'Cover crowns with a forcing pot or bucket for tender early stems.', category: 'sow' },
  ],
};

// ─── Watering urgency calculation ─────────────────────────────────────────────

type WaterUrgency = 'daily' | 'regular' | 'occasional';

function getWaterUrgency(plant: Plant, month: number): WaterUrgency {
  const isSummer = month >= 6 && month <= 8;
  const isGrowing = month >= 4 && month <= 9;

  if (plant.water === 'high') return isSummer ? 'daily' : 'regular';
  if (plant.water === 'moderate') return isSummer ? 'regular' : 'occasional';
  return 'occasional';
}

// ─── Feeding guidance ─────────────────────────────────────────────────────────

interface FeedingAdvice {
  plant: Plant;
  advice: string;
  frequency: string;
  active: boolean;
}

function getFeedingAdvice(plant: Plant, month: number): FeedingAdvice {
  const feedText = plant.inGround?.feeding ?? '';
  const isGrowing = month >= 4 && month <= 9;
  const isFruiting = plant.category === 'fruit' || ['tomato-tumbling', 'pepper-chilli', 'pepper-sweet', 'aubergine', 'cucumber', 'courgette'].includes(plant.slug);

  if (feedText.toLowerCase().includes('no feed') || feedText.toLowerCase().includes('no additional')) {
    return { plant, advice: feedText || 'No feeding needed', frequency: 'None', active: false };
  }

  if (!isGrowing) {
    return { plant, advice: 'Dormant — no feeding needed until spring', frequency: 'None', active: false };
  }

  if (isFruiting && month >= 5) {
    return { plant, advice: feedText || 'Liquid tomato feed weekly once flowering', frequency: 'Weekly', active: true };
  }

  return { plant, advice: feedText || 'Light liquid feed monthly', frequency: 'Monthly', active: isGrowing };
}

// ─── Pest/disease alerts for the month ────────────────────────────────────────

interface PestAlert {
  name: string;
  plants: string[];
  months: number[];
  advice: string;
}

const SEASONAL_PESTS: PestAlert[] = [
  { name: 'Aphids', plants: [], months: [4, 5, 6, 7, 8], advice: 'Check shoot tips daily. Squash small colonies by hand or blast with water.' },
  { name: 'Slugs & snails', plants: [], months: [3, 4, 5, 6, 7, 8, 9, 10], advice: 'Beer traps, copper tape, or nematode biological control (Nemaslug).' },
  { name: 'Cabbage white caterpillars', plants: ['kale', 'cabbage', 'broccoli-sprouting', 'brussels-sprouts', 'cauliflower'], months: [5, 6, 7, 8, 9], advice: 'Net brassicas with Enviromesh. Check leaf undersides for eggs weekly.' },
  { name: 'Carrot fly', plants: ['carrot', 'parsnip'], months: [5, 6, 7, 8], advice: 'Cover with fine mesh (Enviromesh). Flies are low-flying — 60cm barrier works.' },
  { name: 'Potato/tomato blight', plants: ['tomato-tumbling', 'potato-early', 'potato-maincrop'], months: [7, 8, 9], advice: 'Remove affected foliage immediately. Worst in warm humid weather. Check daily in July-August.' },
  { name: 'Gooseberry sawfly', plants: ['gooseberry'], months: [4, 5, 6, 7], advice: 'Check from April — caterpillars strip leaves fast. Pick off by hand.' },
  { name: 'Vine weevil', plants: ['strawberry-everbearing'], months: [3, 4, 5, 9, 10], advice: 'Use nematode biological control (Nemasys). GreenStalk pockets are especially vulnerable.' },
  { name: 'Flea beetle', plants: ['rocket', 'turnip', 'radish'], months: [4, 5, 6], advice: 'Cover with fleece. Small holes in leaves — cosmetic damage, rarely serious.' },
  { name: 'Raspberry beetle', plants: ['raspberry'], months: [6, 7], advice: 'Shake canes over white paper — pick off beetles. Damage is maggots in fruit.' },
  { name: 'Rosemary beetle', plants: ['rosemary', 'lavender', 'sage', 'thyme'], months: [4, 5, 10, 11], advice: 'Metallic green-purple beetles on aromatic herbs. Pick off by hand into soapy water.' },
];

// ─── Frost guidance ───────────────────────────────────────────────────────────

function getFrostGuidance(month: number, isUS: boolean): { level: 'safe' | 'caution' | 'frost'; message: string } | null {
  if (isUS) return null; // SoCal doesn't really have frost issues

  if (month >= 11 || month <= 2) {
    return { level: 'frost', message: 'Frost likely overnight. Protect all tender crops. Move GreenStalks under cover or wrap with fleece.' };
  }
  if (month === 3) {
    return { level: 'frost', message: 'Hard frosts still possible. Do not plant tender crops outdoors yet.' };
  }
  if (month === 4) {
    return { level: 'caution', message: 'Last frost typically mid-April in Surrey. Keep fleece ready. Harden off seedlings gradually over 7-10 days before planting out.' };
  }
  if (month === 10) {
    return { level: 'caution', message: 'First frost typically mid-October. Protect or harvest tender crops. Bring containers under cover.' };
  }
  return { level: 'safe', message: 'Frost-free growing season. Focus on watering and feeding.' };
}

// ─── Succession sowing data (RHS / Charles Dowding) ──────────────────────────

interface SuccessionCrop {
  slug: string;
  name: string;
  emoji: string;
  intervalDays: number;
  startMonth: number;
  endMonth: number;
  note: string;
}

const SUCCESSION_CROPS: SuccessionCrop[] = [
  { slug: 'lettuce', name: 'Lettuce', emoji: '🥬', intervalDays: 14, startMonth: 4, endMonth: 7, note: 'Sow every 2 weeks Apr–Jul for continuous supply. Use bolt-resistant varieties in summer.' },
  { slug: 'radish', name: 'Radish', emoji: '🥕', intervalDays: 10, startMonth: 4, endMonth: 7, note: 'Fast 3-4 week crop. Sow every 10 days for steady harvest.' },
  { slug: 'rocket', name: 'Rocket', emoji: '🥬', intervalDays: 14, startMonth: 4, endMonth: 9, note: 'Sow every 2 weeks. Prefers cooler weather — slow summer sowings.' },
  { slug: 'spring-onion', name: 'Spring Onion', emoji: '🧅', intervalDays: 21, startMonth: 4, endMonth: 8, note: 'Sow every 3 weeks. 8-12 weeks to harvest.' },
  { slug: 'perpetual-spinach', name: 'Spinach', emoji: '🥬', intervalDays: 21, startMonth: 4, endMonth: 6, note: 'Sow every 3 weeks Apr–Jun. Bolts in summer heat — resume Aug for autumn crop.' },
  { slug: 'dwarf-french-bean', name: 'French Bean', emoji: '🫘', intervalDays: 21, startMonth: 5, endMonth: 7, note: 'Sow every 3 weeks May–Jul for beans through to October frost.' },
  { slug: 'beetroot', name: 'Beetroot', emoji: '🟣', intervalDays: 21, startMonth: 4, endMonth: 7, note: 'Sow every 3 weeks for baby beet. Last sowing July for autumn harvest.' },
  { slug: 'coriander', name: 'Coriander', emoji: '🌿', intervalDays: 14, startMonth: 4, endMonth: 8, note: 'Bolts fast in heat. Sow every 2 weeks using bolt-resistant varieties like Confetti.' },
];

// ─── Hardening off protocol (RHS) ────────────────────────────────────────────

interface HardenStep {
  days: string;
  exposure: string;
  hours: string;
  location: string;
}

const HARDEN_STEPS: HardenStep[] = [
  { days: 'Days 1–2', exposure: 'Sheltered shade', hours: '1–2 hours', location: 'By a wall or fence, out of wind' },
  { days: 'Days 3–4', exposure: 'Dappled shade', hours: '2–3 hours', location: 'Under a tree or partial cover' },
  { days: 'Days 5–6', exposure: 'Morning sun', hours: '3–4 hours', location: 'Open but sheltered spot' },
  { days: 'Days 7–8', exposure: 'Morning–midday', hours: '5–6 hours', location: 'Full sun, some shelter' },
  { days: 'Days 9–10', exposure: 'Full day outside', hours: '8+ hours', location: 'Bring in at dusk' },
  { days: 'Days 11–12', exposure: 'Overnight (>10°C)', hours: '24 hours', location: 'Leave out if mild' },
  { days: 'Days 13–14', exposure: 'Overnight (>5°C)', hours: 'Continuous', location: 'Ready to plant!' },
];

// ─── Late Start mode (compressed first season 2026) ──────────────────────────

interface LateStartCrop {
  slug: string;
  name: string;
  emoji: string;
  method: 'transplant' | 'direct-sow' | 'buy-plant';
  daysToHarvest: number;
  lastViableSowing: string; // "mid-May", "end-June" etc
  firstHarvest: string;
  confidence: 'safe' | 'tight' | 'risky';
  tip: string;
}

const LATE_START_CROPS_UK: LateStartCrop[] = [
  // SAFE — guaranteed harvest from late May start
  { slug: 'radish', name: 'Radish', emoji: '🥕', method: 'direct-sow', daysToHarvest: 25, lastViableSowing: 'end Jul', firstHarvest: 'late Jun', confidence: 'safe', tip: 'Fastest crop. Sow direct late May, harvest late June. Succession sow every 10 days.' },
  { slug: 'lettuce', name: 'Lettuce', emoji: '🥬', method: 'direct-sow', daysToHarvest: 30, lastViableSowing: 'end Jul', firstHarvest: 'early Jul', confidence: 'safe', tip: 'Cut-and-come-again varieties. First leaves in 4 weeks. Sow succession every 2 weeks.' },
  { slug: 'rocket', name: 'Rocket', emoji: '🥬', method: 'direct-sow', daysToHarvest: 28, lastViableSowing: 'Sep', firstHarvest: 'late Jun', confidence: 'safe', tip: 'Even faster than lettuce. Direct sow, harvest in under 4 weeks.' },
  { slug: 'spring-onion', name: 'Spring Onion', emoji: '🧅', method: 'direct-sow', daysToHarvest: 60, lastViableSowing: 'end Jul', firstHarvest: 'late Jul', confidence: 'safe', tip: 'Direct sow late May. Ready in 8-10 weeks.' },
  { slug: 'dwarf-french-bean', name: 'French Bean', emoji: '🫘', method: 'direct-sow', daysToHarvest: 50, lastViableSowing: 'mid Jul', firstHarvest: 'mid Jul', confidence: 'safe', tip: 'Direct sow after last frost (mid-May is perfect). Prolific cropper until October frost.' },
  { slug: 'basil-sweet', name: 'Sweet Basil', emoji: '🌿', method: 'buy-plant', daysToHarvest: 21, lastViableSowing: 'end Jun', firstHarvest: 'mid Jun', confidence: 'safe', tip: 'Buy as plug plants from garden centre. Harvest leaves from 3 weeks after planting.' },
  { slug: 'chives', name: 'Chives', emoji: '🧅', method: 'buy-plant', daysToHarvest: 14, lastViableSowing: 'anytime', firstHarvest: 'early Jun', confidence: 'safe', tip: 'Buy as a pot from any supermarket. Divide and plant. Perennial — comes back every year.' },
  { slug: 'thyme', name: 'Thyme', emoji: '🌿', method: 'buy-plant', daysToHarvest: 14, lastViableSowing: 'anytime', firstHarvest: 'early Jun', confidence: 'safe', tip: 'Buy as a plant. Perennial, drought-tolerant — perfect for GreenStalk top tiers.' },
  { slug: 'nasturtium', name: 'Nasturtium', emoji: '🌸', method: 'direct-sow', daysToHarvest: 45, lastViableSowing: 'end Jun', firstHarvest: 'mid Jul', confidence: 'safe', tip: 'Fast-growing, direct sow. Edible flowers by mid-July. Trap crop for aphids.' },
  { slug: 'mint', name: 'Mint', emoji: '🌿', method: 'buy-plant', daysToHarvest: 7, lastViableSowing: 'anytime', firstHarvest: 'late May', confidence: 'safe', tip: 'Buy as a pot plant. Harvest immediately. ONLY grow in containers — invasive in ground.' },
  // TIGHT — will work but needs garden centre transplants, not seed
  { slug: 'strawberry-everbearing', name: 'Strawberry', emoji: '🍓', method: 'buy-plant', daysToHarvest: 60, lastViableSowing: 'end May', firstHarvest: 'late Jul', confidence: 'tight', tip: 'Buy as bare-root or potted runners from garden centre. First fruit late July from May planting.' },
  { slug: 'tomato-tumbling', name: 'Tumbling Tom Tomato', emoji: '🍅', method: 'transplant', daysToHarvest: 70, lastViableSowing: 'end May', firstHarvest: 'early Aug', confidence: 'tight', tip: 'Buy as garden centre transplants (NOT seed — too late to start from seed). First ripe fruit early August.' },
  { slug: 'courgette', name: 'Courgette', emoji: '🥒', method: 'transplant', daysToHarvest: 50, lastViableSowing: 'end May', firstHarvest: 'mid Jul', confidence: 'tight', tip: 'Buy as transplant or direct sow late May. Fast-growing once warm. One plant = 20+ fruits.' },
  { slug: 'pepper-chilli', name: 'Chilli Pepper', emoji: '🌶️', method: 'transplant', daysToHarvest: 90, lastViableSowing: 'end May', firstHarvest: 'late Aug', confidence: 'tight', tip: 'Must buy as garden centre transplant. Too late from seed. Needs warmest spot available.' },
  { slug: 'perpetual-spinach', name: 'Spinach', emoji: '🥬', method: 'direct-sow', daysToHarvest: 45, lastViableSowing: 'end Jun', firstHarvest: 'mid Jul', confidence: 'tight', tip: 'Direct sow or buy plugs. Cut-and-come-again for 12+ months.' },
  // RISKY — possible but challenging for first-year late start
  { slug: 'runner-bean', name: 'Runner Bean', emoji: '🫘', method: 'direct-sow', daysToHarvest: 65, lastViableSowing: 'mid Jun', firstHarvest: 'late Jul', confidence: 'risky', tip: 'Direct sow late May or buy transplants. Needs tall support (Titan cages or cane wigwam). Tight timeline but possible.' },
  { slug: 'cucumber', name: 'Cucumber', emoji: '🥒', method: 'transplant', daysToHarvest: 60, lastViableSowing: 'end May', firstHarvest: 'late Jul', confidence: 'risky', tip: 'Buy as transplant. Needs consistently warm weather. Use a Titan cage for support.' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CarePage() {
  const towers = usePlannerStore((s) => s.towers);
  const garden = useGardenStore((s) => s.garden);
  const region = useRegion();
  const { plants, plantMap } = usePlantDb(region);
  const isUS = region === 'us';
  const currentMonth = getCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // All planted slugs (towers + garden)
  const plantedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const tower of towers) {
      for (const tier of tower.tiers) {
        for (const pocket of tier.pockets) {
          if (pocket.plantSlug) slugs.add(pocket.plantSlug);
        }
      }
    }
    for (const row of garden.cells) {
      for (const cell of row) {
        if (cell.plantSlug) slugs.add(cell.plantSlug);
      }
    }
    return slugs;
  }, [towers, garden.cells]);

  const plantedPlants = useMemo(
    () => Array.from(plantedSlugs).map((s) => plantMap.get(s)).filter(Boolean) as Plant[],
    [plantedSlugs, plantMap]
  );

  // ── Computed guidance ───────────────────────────────────────────────────────

  const sowNow = useMemo(() => {
    return plants.filter((p) => {
      const pw = p.plantingWindow;
      return (
        isInWindow(selectedMonth, pw.sowIndoors) ||
        isInWindow(selectedMonth, pw.sowOutdoors) ||
        isInWindow(selectedMonth, pw.transplant)
      );
    }).sort((a, b) => a.commonName.localeCompare(b.commonName));
  }, [plants, selectedMonth]);

  const harvestNow = useMemo(() => {
    return plantedPlants.filter((p) => isInWindow(selectedMonth, p.plantingWindow.harvest))
      .sort((a, b) => a.commonName.localeCompare(b.commonName));
  }, [plantedPlants, selectedMonth]);

  const wateringGuide = useMemo(() => {
    const daily: Plant[] = [];
    const regular: Plant[] = [];
    const occasional: Plant[] = [];

    for (const p of plantedPlants) {
      const urgency = getWaterUrgency(p, selectedMonth);
      if (urgency === 'daily') daily.push(p);
      else if (urgency === 'regular') regular.push(p);
      else occasional.push(p);
    }

    return { daily, regular, occasional };
  }, [plantedPlants, selectedMonth]);

  const feedingGuide = useMemo(() => {
    return plantedPlants
      .map((p) => getFeedingAdvice(p, selectedMonth))
      .filter((f) => f.active)
      .sort((a, b) => {
        if (a.frequency === 'Weekly' && b.frequency !== 'Weekly') return -1;
        if (a.frequency !== 'Weekly' && b.frequency === 'Weekly') return 1;
        return a.plant.commonName.localeCompare(b.plant.commonName);
      });
  }, [plantedPlants, selectedMonth]);

  const activePests = useMemo(() => {
    return SEASONAL_PESTS.filter((pest) => {
      if (!pest.months.includes(selectedMonth)) return false;
      // Show if no specific plants listed, or if user has one of the affected plants
      if (pest.plants.length === 0) return true;
      return pest.plants.some((slug) => plantedSlugs.has(slug));
    });
  }, [selectedMonth, plantedSlugs]);

  const frost = getFrostGuidance(selectedMonth, isUS);
  const monthTasks = MONTHLY_TASKS[selectedMonth] ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header + month selector */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
            Monthly Care Guide
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Expert-sourced guidance for your garden this month
          </p>

          <div className="flex items-center gap-3 mt-4">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Month</label>
            <div className="flex gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`w-8 h-8 rounded-full text-[10px] font-medium transition-all ${
                    m === selectedMonth
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : m === currentMonth
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {getMonthName(m)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ❄️ Frost alert */}
        {frost && frost.level !== 'safe' && (
          <div className={`rounded-2xl p-4 border ${
            frost.level === 'frost'
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{frost.level === 'frost' ? '❄️' : '⚠️'}</span>
              <div>
                <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">
                  {frost.level === 'frost' ? 'Frost Risk' : 'Frost Watch'}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">{frost.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* 🚀 Late Start Mode (April-June only, UK only) */}
        {!isUS && selectedMonth >= 4 && selectedMonth <= 6 && (
          <section className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800 p-5">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <span>🚀</span> Late Start Guide — First Season 2026
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 mb-1">
              {selectedMonth === 4
                ? 'Moving in April 17 — no gear until mid-May. Start seeds in conservatory with temporary trays from the garden centre.'
                : selectedMonth === 5
                  ? 'GreenStalks arrive mid-May! Set up immediately. Buy transplants for tomatoes, peppers, strawberries — too late to start from seed.'
                  : 'Last window for direct sowing fast crops. Buy any remaining plants as transplants.'}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-3 font-medium">
              {selectedMonth === 4 ? '⏳ 6 weeks until gear arrives' : selectedMonth === 5 ? '🌱 GreenStalks are here — plant everything!' : '⚡ Final sowing window for this season'}
            </p>

            {(['safe', 'tight', 'risky'] as const).map((confidence) => {
              const crops = LATE_START_CROPS_UK.filter((c) => c.confidence === confidence);
              if (crops.length === 0) return null;
              const label = confidence === 'safe' ? '✅ Safe Bets' : confidence === 'tight' ? '⚡ Tight but Doable' : '⚠️ Risky — Worth a Try';
              const desc = confidence === 'safe'
                ? 'Guaranteed harvest from a late-May start'
                : confidence === 'tight'
                  ? 'Buy as transplants from garden centre — too late from seed'
                  : 'Challenging for first year but possible with transplants';
              return (
                <div key={confidence} className="mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs font-bold ${
                      confidence === 'safe' ? 'text-emerald-700 dark:text-emerald-400' :
                      confidence === 'tight' ? 'text-amber-700 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>{label}</span>
                    <span className="text-[9px] text-stone-400">— {desc}</span>
                  </div>
                  <div className="space-y-1.5">
                    {crops.map((crop) => (
                      <div key={crop.slug} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 dark:bg-stone-800/70 border border-stone-100 dark:border-stone-700">
                        <span className="text-base">{crop.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-stone-800 dark:text-stone-200">{crop.name}</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${
                              crop.method === 'buy-plant' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' :
                              crop.method === 'transplant' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                              'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            }`}>
                              {crop.method === 'buy-plant' ? 'BUY PLANT' : crop.method === 'transplant' ? 'TRANSPLANT' : 'DIRECT SOW'}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">{crop.tip}</div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-[10px] font-semibold text-stone-600 dark:text-stone-300">{crop.daysToHarvest}d</div>
                          <div className="text-[8px] text-stone-400">→ {crop.firstHarvest}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="bg-white/50 dark:bg-stone-800/50 rounded-lg p-2.5 mt-2">
              <p className="text-[10px] text-stone-500 dark:text-stone-400">
                <strong>Shopping list for garden centre visit (mid-May):</strong> Tumbling Tom tomato transplants × 6, strawberry runners × 12, courgette transplant × 1, basil plugs × 4, chilli transplant × 2, sweet pea plugs × 6. Direct sow: lettuce, radish, rocket, beans, nasturtium, spring onion.
              </p>
            </div>
          </section>
        )}

        {/* 🌱 What to sow / plant this month */}
        <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <span>🌱</span> Sow & Plant This Month
          </h2>
          <p className="text-xs text-stone-400 mt-0.5 mb-3">
            {sowNow.length} plants in season for {getMonthName(selectedMonth)}
          </p>
          {sowNow.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sowNow.map((p) => {
                const pw = p.plantingWindow;
                const activities: string[] = [];
                if (isInWindow(selectedMonth, pw.sowIndoors)) activities.push('Sow indoors');
                if (isInWindow(selectedMonth, pw.sowOutdoors)) activities.push('Sow outdoors');
                if (isInWindow(selectedMonth, pw.transplant)) activities.push('Plant out');
                const isPlanted = plantedSlugs.has(p.slug);
                return (
                  <div
                    key={p.slug}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-colors ${
                      isPlanted
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-700/50'
                    }`}
                  >
                    <span className="text-base">{p.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-stone-700 dark:text-stone-200 truncate">
                        {p.commonName}
                      </div>
                      <div className="text-[10px] text-stone-400">{activities.join(' · ')}</div>
                    </div>
                    {isPlanted && <span className="ml-auto text-emerald-500 text-[10px]">✓ Planted</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-stone-400 italic">Nothing to sow this month.</p>
          )}
        </section>

        {/* 💧 Watering guide */}
        {plantedPlants.length > 0 && selectedMonth >= 3 && selectedMonth <= 10 && (
          <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <span>💧</span> Watering Guide
            </h2>
            <p className="text-xs text-stone-400 mt-0.5 mb-3">
              Based on your planted crops and {getMonthName(selectedMonth)} conditions
            </p>

            {wateringGuide.daily.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    Daily watering {selectedMonth >= 6 && selectedMonth <= 8 ? '(twice daily in heat)' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {wateringGuide.daily.map((p) => (
                    <span key={p.slug} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      {p.emoji} {p.commonName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {wateringGuide.regular.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Every 2-3 days
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {wateringGuide.regular.map((p) => (
                    <span key={p.slug} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {p.emoji} {p.commonName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {wateringGuide.occasional.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    Weekly or when dry
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {wateringGuide.occasional.map((p) => (
                    <span key={p.slug} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {p.emoji} {p.commonName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 🧪 Feeding schedule */}
        {feedingGuide.length > 0 && (
          <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <span>🧪</span> Feeding Schedule
            </h2>
            <p className="text-xs text-stone-400 mt-0.5 mb-3">
              {feedingGuide.length} crops need feeding in {getMonthName(selectedMonth)}
            </p>
            <div className="space-y-2">
              {feedingGuide.map((f) => (
                <div
                  key={f.plant.slug}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-700/50 border border-stone-100 dark:border-stone-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{f.plant.emoji}</span>
                    <div>
                      <div className="text-xs font-medium text-stone-700 dark:text-stone-200">
                        {f.plant.commonName}
                      </div>
                      <div className="text-[10px] text-stone-400">{f.advice}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    f.frequency === 'Weekly'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : 'bg-stone-100 dark:bg-stone-600 text-stone-500 dark:text-stone-300'
                  }`}>
                    {f.frequency}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🔄 Succession sowing tracker */}
        {(() => {
          const activeSuccessions = SUCCESSION_CROPS.filter(
            (c) => selectedMonth >= c.startMonth && selectedMonth <= c.endMonth
          );
          if (activeSuccessions.length === 0) return null;
          return (
            <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
              <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <span>🔄</span> Succession Sowing
              </h2>
              <p className="text-xs text-stone-400 mt-0.5 mb-3">
                Keep sowing for continuous harvests — never a glut, never a gap
              </p>
              <div className="space-y-2">
                {activeSuccessions.map((crop) => (
                  <div
                    key={crop.slug}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-700/50 border border-stone-100 dark:border-stone-700"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-base">{crop.emoji}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-stone-700 dark:text-stone-200">
                          {crop.name}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">{crop.note}</div>
                      </div>
                    </div>
                    <span className="flex-shrink-0 ml-2 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                      Every {crop.intervalDays}d
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* 🌡️ Hardening off protocol */}
        {(selectedMonth === 4 || selectedMonth === 5) && !isUS && (
          <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <span>🌡️</span> Hardening Off Protocol
            </h2>
            <p className="text-xs text-stone-400 mt-0.5 mb-3">
              {selectedMonth === 4
                ? 'Critical for April — seedlings raised indoors must be gradually acclimatised before planting out'
                : 'Final hardening off window before summer planting'}
            </p>
            <div className="space-y-1">
              {HARDEN_STEPS.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-700/50"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    i < 4 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' :
                    i < 6 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300' :
                    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-stone-700 dark:text-stone-200">
                      {step.days}: {step.exposure} — {step.hours}
                    </div>
                    <div className="text-[10px] text-stone-400">{step.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🐛 Pest & disease watch */}
        {activePests.length > 0 && (
          <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <span>🐛</span> Pest & Disease Watch
            </h2>
            <p className="text-xs text-stone-400 mt-0.5 mb-3">
              Active threats for {getMonthName(selectedMonth)} based on your planted crops
            </p>
            <div className="space-y-2">
              {activePests.map((pest) => (
                <div
                  key={pest.name}
                  className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30"
                >
                  <div className="text-xs font-semibold text-red-700 dark:text-red-300">{pest.name}</div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400 mt-0.5">{pest.advice}</div>
                  {pest.plants.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {pest.plants
                        .filter((s) => plantedSlugs.has(s))
                        .map((s) => {
                          const p = plantMap.get(s);
                          return p ? (
                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300">
                              {p.emoji} {p.commonName}
                            </span>
                          ) : null;
                        })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🍎 Ready to harvest */}
        {harvestNow.length > 0 && (
          <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <span>🍎</span> Harvest Window
            </h2>
            <p className="text-xs text-stone-400 mt-0.5 mb-3">
              Planted crops with {getMonthName(selectedMonth)} harvest windows
            </p>
            <div className="flex flex-wrap gap-2">
              {harvestNow.map((p) => (
                <span key={p.slug} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-medium">
                  {p.emoji} {p.commonName}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 📐 Succession Planner */}
        {selectedMonth >= 4 && selectedMonth <= 7 && (() => {
          const successions = getRecommendedSuccessions(plants);
          const multiHarvest = successions.filter((s) => s.totalHarvests >= 2);
          if (multiHarvest.length === 0) return null;
          return (
            <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
              <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <span>📐</span> Succession Planner
              </h2>
              <p className="text-xs text-stone-400 mt-0.5 mb-3">
                Squeeze 2-3 harvests from the same pocket — never leave space empty
              </p>
              <div className="space-y-2.5">
                {multiHarvest.map((plan) => (
                  <div key={plan.first.cropSlug} className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-3 border border-stone-100 dark:border-stone-700">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className="text-base">{plan.first.emoji}</span>
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{plan.first.cropName}</span>
                      {plan.second && (
                        <>
                          <span className="text-stone-400 text-xs">→</span>
                          <span className="text-base">{plan.second.emoji}</span>
                          <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{plan.second.cropName}</span>
                        </>
                      )}
                      {plan.third && (
                        <>
                          <span className="text-stone-400 text-xs">→</span>
                          <span className="text-base">{plan.third.emoji}</span>
                          <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{plan.third.cropName}</span>
                        </>
                      )}
                      <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        plan.utilizationPct >= 80
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : plan.utilizationPct >= 50
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            : 'bg-stone-100 dark:bg-stone-600 text-stone-500 dark:text-stone-300'
                      }`}>
                        {plan.utilizationPct}% utilization
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">{plan.reasoning}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* 📋 Monthly tasks */}
        <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <span>📋</span> {getMonthName(selectedMonth)} Tasks
          </h2>
          <p className="text-xs text-stone-400 mt-0.5 mb-3">
            Expert guidance from RHS and BBC Gardeners' World
          </p>
          <div className="space-y-2">
            {monthTasks.map((task, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-700/50 border border-stone-100 dark:border-stone-700"
              >
                <span className="text-lg mt-0.5">{task.emoji}</span>
                <div>
                  <div className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                    {task.task}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {task.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Source attribution */}
        <p className="text-[10px] text-stone-400 text-center pb-4">
          Guidance based on RHS growing advice, BBC Gardeners' World monthly tasks, and Garden Organic best practice.
          Frost dates calibrated for Surrey (Walton-on-Thames, RHS H5 / USDA 8b).
        </p>
      </div>
    </div>
  );
}
