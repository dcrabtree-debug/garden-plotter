import { useMemo } from 'react';
import { usePlannerStore } from '../state/planner-store';
import { useGardenStore } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import type { Plant } from '../types/plant';

// ─── GreenStalk setup (RHS container growing advice + GreenStalk best practice) ──

interface SetupStep {
  emoji: string;
  title: string;
  detail: string;
  tip?: string;
}

const GREENSTALK_SETUP: SetupStep[] = [
  {
    emoji: '🪣',
    title: 'Compost mix',
    detail: 'Use a peat-free multipurpose compost mixed 3:1 with perlite or horticultural grit. This gives good moisture retention with the drainage GreenStalk pockets need. Do NOT use garden soil — it compacts and waterlogging kills roots.',
    tip: 'RHS recommends: Sylvagrow peat-free or Dalefoot wool compost. Both hold moisture well without waterlogging.',
  },
  {
    emoji: '🧪',
    title: 'Slow-release fertiliser',
    detail: 'Mix slow-release granules into the compost at planting. Use a balanced NPK (e.g. Osmocote Controlled Release 14-14-14) at the rate on the packet. This feeds for 3-4 months so you only need liquid feed from midsummer.',
    tip: 'BBC Gardeners\' World advice: slow-release at planting + switch to weekly liquid tomato feed (high potassium) once fruiting crops flower.',
  },
  {
    emoji: '💧',
    title: 'Watering system',
    detail: 'GreenStalk\'s top reservoir waters all tiers via gravity. Fill the top saucer and water trickles down. In summer (Jun-Aug), fill twice daily — morning and evening. In spring/autumn, once daily is enough.',
    tip: 'The #1 cause of GreenStalk failure is underwatering. Pockets dry out much faster than ground-level containers.',
  },
  {
    emoji: '🌊',
    title: 'Drainage check',
    detail: 'Each pocket has a drainage hole at the back. Make sure they\'re clear before planting. After filling with compost, water thoroughly and check water flows through the bottom tier\'s drainage tray.',
  },
  {
    emoji: '🌱',
    title: 'Planting density',
    detail: 'One plant per pocket for most crops. Exceptions: lettuce/rocket/spinach (2-3 per pocket as cut-and-come-again), herbs (1 plant fills the space), radish/spring onion (scatter-sow 4-5 per pocket).',
  },
  {
    emoji: '☀️',
    title: 'Positioning',
    detail: 'Place your GreenStalk where it gets 6+ hours of direct sun. Rotate the tower 90° every 2 weeks so all sides get equal light. If only one side gets sun, put your sun-hungry crops (tomatoes, peppers, strawberries) on that side.',
    tip: 'South-facing wall or patio is ideal for Surrey. In summer, provide afternoon shade for lettuce/spinach to prevent bolting.',
  },
];

// ─── Crops that need support + Titan cage allocation ─────────────────────────

interface SupportNeed {
  slug: string;
  name: string;
  emoji: string;
  supportType: string;
  titanCageSuitable: boolean;
  notes: string;
}

const SUPPORT_NEEDS: SupportNeed[] = [
  { slug: 'runner-bean', name: 'Runner Bean', emoji: '🫘', supportType: 'Tall canes or Titan cage', titanCageSuitable: true, notes: 'Climbs to 2m+. Titan cages are perfect — better than bamboo wigwams as they\'re sturdier and reusable.' },
  { slug: 'pea', name: 'Peas', emoji: '🫛', supportType: 'Twiggy sticks or netting', titanCageSuitable: false, notes: 'Grow to 60-120cm depending on variety. Use twiggy hazel sticks or pea netting. Titan cages are overkill.' },
  { slug: 'tomato-tumbling', name: 'Tomato (cordon types)', emoji: '🍅', supportType: 'Titan cage or strong stake', titanCageSuitable: true, notes: 'Tumbling Tom is a bush/determinate type — no staking needed. But if growing cordon varieties (Sungold, Gardener\'s Delight) in ground, Titan cages are ideal.' },
  { slug: 'cucumber', name: 'Cucumber', emoji: '🥒', supportType: 'Trellis or Titan cage', titanCageSuitable: true, notes: 'Climbing varieties (most outdoor types) benefit hugely from a Titan cage. Keeps fruit clean and saves space.' },
  { slug: 'pepper-chilli', name: 'Chilli Pepper', emoji: '🌶️', supportType: 'Light stake', titanCageSuitable: false, notes: 'A single bamboo cane per plant is enough. Heavy fruit can snap branches — tie loosely as fruits develop.' },
  { slug: 'pepper-sweet', name: 'Sweet Pepper', emoji: '🫑', supportType: 'Light stake', titanCageSuitable: false, notes: 'Same as chilli — a single cane. Titan cages are too big for peppers.' },
  { slug: 'broad-bean', name: 'Broad Bean', emoji: '🫘', supportType: 'Short stakes + string', titanCageSuitable: false, notes: 'Tall varieties (120cm+) need support in wind. Push in 4 corner stakes and run string around at 30cm intervals.' },
  { slug: 'sweetcorn', name: 'Sweetcorn', emoji: '🌽', supportType: 'Self-supporting in blocks', titanCageSuitable: false, notes: 'No support needed if planted in blocks of at least 3x3. Wind pollinated — rows fail, blocks succeed.' },
  { slug: 'courgette', name: 'Courgette', emoji: '🥒', supportType: 'None needed', titanCageSuitable: false, notes: 'Bush variety — completely self-supporting. Give it space (90cm between plants).' },
  { slug: 'squash', name: 'Squash', emoji: '🎃', supportType: 'None needed (ground)', titanCageSuitable: false, notes: 'Trailing habit — let it sprawl on the ground or train over a structure. Individual fruits may need a net sling if trained upward.' },
];

// ─── Clay soil preparation (RHS / Charles Dowding no-dig) ────────────────────

const CLAY_SETUP: SetupStep[] = [
  {
    emoji: '🔍',
    title: 'Test your soil',
    detail: 'Surrey clay varies from heavy yellow clay to more workable loam. Squeeze a handful: if it forms a smooth ball and holds its shape, you have heavy clay. If it crumbles, you have loamy clay — much easier to work.',
    tip: 'Buy a pH test kit (£5 from any garden centre). Surrey clay is typically pH 6.5-7.5 (neutral to slightly alkaline). Blueberries need acid soil — grow them in containers with ericaceous compost instead.',
  },
  {
    emoji: '🚫',
    title: 'Do NOT dig heavy clay',
    detail: 'Charles Dowding\'s no-dig method is especially effective on clay. Digging breaks the soil structure and creates a compacted pan below. Instead, build on top of the clay.',
    tip: 'Dowding: "Clay is actually very fertile — the minerals plants need are locked in the clay particles. Adding compost on top allows worms to incorporate it naturally."',
  },
  {
    emoji: '📦',
    title: 'Build raised beds or spread compost',
    detail: 'For new beds: lay cardboard directly on the clay (kills grass), then add 15-20cm of quality compost on top. Plant directly into the compost. Or build 30cm raised bed frames and fill with a 50/50 compost/topsoil mix.',
    tip: 'You can plant the same day you build a bed this way. No waiting. The cardboard breaks down in 6-12 months and worms work the compost into the clay below.',
  },
  {
    emoji: '🧱',
    title: 'For drainage-sensitive plants',
    detail: 'Lavender, rosemary, Mediterranean herbs, and dianthus need sharper drainage than clay provides. Either grow in raised beds with 50% grit mixed in, or mound-plant 20cm above grade. Or use your GreenStalk.',
  },
  {
    emoji: '🪱',
    title: 'Annual maintenance',
    detail: 'Each autumn (Oct-Nov), add a 5cm layer of garden compost, well-rotted manure, or leaf mould on top of beds. Do not dig it in — worms do the work. This is the entire soil care regime, every year.',
    tip: 'RHS: "Adding organic matter annually to clay soil is the single most effective thing you can do. Over 3-5 years, the top 30cm transforms into rich, workable soil."',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function SetupGuidePage() {
  const garden = useGardenStore((s) => s.garden);
  const region = useRegion();
  usePlantDb(region); // ensure plant data is loaded
  const isUS = region === 'us';

  // Find planted crops that need support
  const cropsNeedingSupport = useMemo(() => {
    const plantedSlugs = new Set<string>();
    for (const row of garden.cells) {
      for (const cell of row) {
        if (cell.plantSlug) plantedSlugs.add(cell.plantSlug);
      }
    }
    return SUPPORT_NEEDS.filter((s) => plantedSlugs.has(s.slug));
  }, [garden.cells]);

  const titanCrops = cropsNeedingSupport.filter((c) => c.titanCageSuitable);
  const titanCagesAvailable = 6;
  const titanCagesNeeded = titanCrops.length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
            Setup Guide
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Expert setup advice from RHS, BBC Gardeners' World, and Charles Dowding
          </p>
        </div>

        {/* GreenStalk setup */}
        <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
          <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2 mb-4">
            <span className="text-2xl">🌱</span> GreenStalk Setup from Scratch
          </h2>
          <p className="text-xs text-stone-400 mb-4">
            Based on RHS container growing advice and GreenStalk best practice. Get this right and everything else follows.
          </p>
          <div className="space-y-4">
            {GREENSTALK_SETUP.map((step, i) => (
              <div key={i} className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4 border border-stone-100 dark:border-stone-700">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{step.emoji}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {i + 1}. {step.title}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">{step.detail}</p>
                    {step.tip && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-start gap-1">
                        <span>💡</span> {step.tip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Support needs + Titan cage allocation */}
        <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
          <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2 mb-1">
            <span className="text-2xl">🏗️</span> Plant Support Guide
          </h2>
          <p className="text-xs text-stone-400 mb-4">
            Which crops need support — and the best use of your 6 Titan Tall Tomato Cages
          </p>

          {/* Titan cage allocation */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 mb-4">
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <span>🏋️</span> Your Titan Cage Allocation
            </h3>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 mb-3">
              6 Titan Tall Tomato Cages available — tall, sturdy metal cages ideal for climbing crops
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { crop: 'Runner Beans', count: 2, note: 'Climbers need the height' },
                { crop: 'Cucumbers', count: 2, note: 'Keeps fruit clean, saves space' },
                { crop: 'Cordon Tomatoes', count: 2, note: 'If growing tall varieties in-ground' },
              ].map((alloc, i) => (
                <div key={i} className="bg-white dark:bg-stone-700 rounded-lg p-2 text-center border border-emerald-100 dark:border-emerald-900">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{alloc.count}</div>
                  <div className="text-[10px] font-medium text-stone-700 dark:text-stone-200">{alloc.crop}</div>
                  <div className="text-[8px] text-stone-400">{alloc.note}</div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-emerald-500 mt-2">
              Recommended allocation. Adjust based on what you actually plant — runner beans are the highest priority for Titan cages.
            </p>
          </div>

          {/* Full support table */}
          <div className="space-y-2">
            {SUPPORT_NEEDS.map((crop) => (
              <div
                key={crop.slug}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
                  crop.titanCageSuitable
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                    : 'bg-stone-50 dark:bg-stone-700/50 border-stone-100 dark:border-stone-700'
                }`}
              >
                <span className="text-lg">{crop.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-stone-800 dark:text-stone-200">
                    {crop.name}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">{crop.notes}</div>
                </div>
                <div className="flex-shrink-0">
                  {crop.titanCageSuitable ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200">
                      TITAN ✓
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-300">
                      {crop.supportType === 'None needed' || crop.supportType === 'Self-supporting in blocks' ? 'No support' : crop.supportType}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Clay soil setup (UK only) */}
        {!isUS && (
          <section className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
            <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2 mb-4">
              <span className="text-2xl">🪱</span> Surrey Clay: In-Ground Setup
            </h2>
            <p className="text-xs text-stone-400 mb-4">
              No-dig method recommended by Charles Dowding and RHS for heavy clay soils
            </p>
            <div className="space-y-4">
              {CLAY_SETUP.map((step, i) => (
                <div key={i} className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4 border border-stone-100 dark:border-stone-700">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{step.emoji}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                        {i + 1}. {step.title}
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">{step.detail}</p>
                      {step.tip && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-start gap-1">
                          <span>💡</span> {step.tip}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Source attribution */}
        <p className="text-[10px] text-stone-400 text-center pb-4">
          Guidance sourced from RHS Growing Guides, BBC Gardeners' World Magazine, Charles Dowding's No-Dig method,
          and GreenStalk vertical planter best practice. Titan cage advice based on Gardener's Supply Co specifications.
        </p>
      </div>
    </div>
  );
}
