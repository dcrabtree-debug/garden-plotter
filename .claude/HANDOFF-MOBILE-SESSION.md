# Mobile Session Handoff — April 7, 2026

## Session Summary

David's mobile Claude Code session (branch `claude/iphone-friendly-garden-plotter-IYx8f`). All work merged to `main` via auto-merge GitHub Action. Everything is pushed and deployed.

## What Was Built This Session

### 1. iPhone Mobile Responsiveness
- GreenStalk pockets: 64px → 48px on mobile, tier labels shrink, flex-wrap
- All modals capped to `max-w-[calc(100vw-2rem)]` on mobile
- KnowledgeBasePage: card layout on mobile (replaces table)
- CalendarPage: horizontal scroll wrapper, 3-char month labels
- YieldPage: responsive ranking rows, single-col categories
- Garden grid: responsive cellSize (18px mobile vs 28px desktop)
- SettingsPage, SetupGuidePage: responsive grids

### 2. Navigation Consolidation (12 tabs → 6)
- Today, Plan (GreenStalk|Garden), Grow (Care|Calendar|Harvest), Learn (Plants|Yield|Sun|Setup), Seeds, Settings
- Sub-nav bar appears below header for grouped tabs

### 3. Garden Map Features
- **GreenStalk markers** on garden map with placement advisor (sun hours per tower)
- **Zoom controls** (slider 0.5x-3x, Ctrl+scroll, +/- buttons)
- **Rich hover tooltips** with sun suitability, companion info, care tips, placement reasoning
- **Vivid sun heatmap** — continuous gradient (blue→green→yellow→orange) with gradient legend bar
- **Bloom visualization** overlay showing what's in flower/fruit by month
- **Conservatory** cell type (teal) — distinct from patio, accepts plant placement
- **GreenStalk** cell type (emerald) — distinct from veg-patch, excluded from auto-populate

### 4. Smart Plant Picker
- Click empty GreenStalk pocket → popup ranks every plant by tier suitability, companions, season, sun
- Click empty garden cell → same popup with sun hours context
- Shows recommended varietal name + notes for each suggestion
- Category filter tabs (All, Vegetable, Herb, Fruit, Flower)
- **Duo pocket sharing REMOVED from GreenStalk** — pockets too small (15cm×20cm) for two plants
- Duo still works for in-ground cells where there's room

### 5. RHS Expert's Choice Auto-Populate (TOP PICK)
- **GreenStalk**: Tower 1 "The Producer" + Tower 2 "The Grazer" with specific RHS AGM varietals
  - Tumbling Tom Red, Cherry Falls, Mara des Bois, Albion, Tendergreen, Purple Teepee, etc.
  - 80-line JSDoc with full varietal rationale
- **In-Ground Esher**: Scarlet Emperor runner beans, Spencer Mix sweet peas
  - Raised bed "daily salad bar" with slug protection strategy
  - Full-size in-ground varietals (NOT dwarf/container types)

### 6. Conservatory + Soil Improver Plants
- **6 new plants**: Dwarf Olive, Dwarf Lemon, Hardy Fern, Comfrey, Crimson Clover, Phacelia
- **19 new companion relationships** for soil improvers
- **Conservatory revised for LOW LIGHT**: removed dwarf lemon/olive/basil (need 6h+ sun), replaced with fern, mint, lemon balm, parsley, coriander (prefers shade), chives
- **Garden orientation corrected**: house faces NE (was SE)

### 7. Dashboard Fixes
- To-do list moved to TOP of Dashboard (was buried below weather/snapshot)
- PRE_MOVE/NO_GEAR tasks now show in "Your To-Do List" (were going to "Coming Up" because deadlines 12+ days away)
- Tapped tasks no longer vanish — stay visible with strikethrough + "tap to undo"
- Service worker bumped v3→v4 to force browser cache refresh

### 8. Seed Link Fixes
- **327 broken URLs fixed** — Thompson & Morgan (159), Suttons (84), RHS Plants
- Product page URLs replaced with search URLs that always find current stock

## Outstanding Request — NEEDS TO BE BUILT

**David asked for local garden centre shopping data.** He wants the Shopping page to:

1. **Add local garden centres near 21 Esher Avenue** with specific recommendations:
   - **RHS Wisley** (5 min drive) — best for: unusual varietals, expert advice, plant quality
   - **Squire's Garden Centre Cobham** (10 min) — best for: everyday seeds, compost, tools
   - **Squire's Hersham** (5 min) — smaller but closer
   - **Notcutts West Horsley** (15 min) — good plant range
   
2. **Tell the user what to buy in-person vs online:**
   - **Buy in-person** (quality matters, shipping damages): strawberry plants, herb plugs, sweet pea plugs, tomato transplants, compost, cages/supports
   - **Buy online** (seeds ship fine, wider variety): seeds (all types), specialist compost (ericaceous), nematode bio-controls
   
3. **Integrate into the Shopping page** with a "Local Garden Centres" section showing:
   - Which items from their planting plan are best bought at which local centre
   - Distance/drive time from 21 Esher Avenue
   - What's in stock seasonally (RHS Wisley has the widest range April-May)

### How to implement:
- Add a `LOCAL_CENTRES` data array in `SeedFinderPage.tsx` or a new data file
- In the shopping list section, categorize items as "Buy at garden centre" vs "Order seeds online"
- Show nearest centre recommendation per item type
- Add a collapsible "Local Garden Centres" card with addresses and what they're best for

## Key Architecture Notes

- `SmartPlantPicker.tsx` was modified by a linter — has `DuoCard` component and `onSelectDuo` prop for in-ground use. GreenStalk no longer passes `onSelectDuo`.
- `PlannerPage.tsx` was also linter-modified — `locked` state from planner store, `GardenGradePanel` import
- Auto-merge GitHub Action (`.github/workflows/auto-merge-mobile.yml`) now also triggers deploy
- Service worker at `public/sw.js` is at `v4` — bump to `v5` if making significant changes

## Branch Status
- `claude/iphone-friendly-garden-plotter-IYx8f` and `main` are at same commit (`e09f976`)
- Working tree clean, nothing uncommitted
- All GitHub Actions should be passing
