# Garden Plotter — Claude Code Project Context

## The Garden: 21 Esher Avenue, Surrey, UK

### Property Overview
- **Type:** Rented semi-detached house. We do NOT own it — all planting must be reversible/removable.
- **Location:** Esher Avenue, Surrey (RHS Hardiness Zone H5, roughly USDA Zone 8b)
- **Move-in date:** April 15, 2026
- **GreenStalk planters + gardening gear arrival:** Mid-May 2026 (shipping container from US)
- **Growing season:** Approximately April–October for Surrey, last frost typically mid-April, first frost late October

### Garden Layout & Orientation
- **Front garden:** Narrow strip along front path. Existing shrubs. NOT a planting target — leave it alone.
- **Rear garden:** Large rectangular lawn (~10m x 8m). OFF LIMITS for planting — rental property.
- **Conservatory:** Victorian-style glass, faces NORTH/WEST. Gets limited direct sun. Good for: seed starting, overwintering tender plants, shade-tolerant herbs. Not suitable for sun-hungry crops.
- **Right-side fence border:** 6ft closeboard fencing. Established Cordylines and Euphorbia. Narrow bed. Potential for sweet peas/climbers trained up fence panels.
- **Back of garden (NORTH-WEST side):** Very tall (3-4m) dense laurel/ivy hedge. Casts AFTERNOON/EVENING shade across the terrace area. Critical for sun calculations.
- **Terraced area (PRIMARY PLANTING ZONE):** Paved/stepped area toward back-left, near shed. Gets SOUTHERN SUN (faces south-east). This is where the two GreenStalk vertical planters go. Existing raised bed with strawberries and perennials.
- **Shed:** Wooden garden shed, back corner. Glazed panels on front — partial cold frame. Storage + limited propagation space.
- **Back fence/gate:** Lower fence panels with trellis tops. Some established shrubs (possibly gooseberry/currant).

### Key Constraints
1. **No lawn planting** — rental property
2. **All planting must be reversible** — containers, vertical planters, temporary supports only
3. **Existing plants cannot be removed**
4. **Late start this year** — move in April 15, gear arrives mid-May. Compressed first season.
5. **Laurel hedge shades the terrace in late afternoon** — sun calculations must factor this in

### Equipment
- **2x GreenStalk vertical planters** (5-tier, arriving mid-May)
- **6x Titan Tall Tomato Cages** (Gardener's Supply Co — 80"/200cm, sturdy metal)
- Standard gardening tools (arriving mid-May)
- Conservatory + shed for propagation

---

## Tech Stack & Architecture

- React 19 + Vite 8 + TypeScript 5.9 + Tailwind CSS 4 + Zustand 5
- GitHub Pages deployment via GitHub Actions (`.github/workflows/deploy.yml`)
- Build: `tsc -b && vite build` — TypeScript errors block deployment
- Node path: `/opt/homebrew/bin/node`
- GitHub CLI: `/opt/homebrew/bin/gh`
- GitHub repo: https://github.com/dcrabtree-debug/garden-plotter
- Live site: https://dcrabtree-debug.github.io/garden-plotter/

### Data Architecture
- `data/plants.json` — 75 UK plants (8 fragrance), full inGround data, hardiness, soil
- `data/plants-us.json` — 34 US/Manhattan Beach plants
- `data/companions.json` — 159 companion relationships
- `public/data/seed-links-*.json` — 4 seed link files (greenstalk/inground × uk/us)
- `public/sw.js` — Service worker v3, caches all data files
- Plant data statically imported (`use-plant-db.ts`); US data + seed links fetched at runtime

### Key Modules
- `src/state/planner-store.ts` — GreenStalk tower state (Zustand + localStorage)
- `src/state/garden-store.ts` — In-ground garden grid, rotation history, spacing/rotation warnings
- `src/state/harvest-store.ts` — Harvest tracking with harvesters (Max, Noelle)
- `src/lib/auto-populate.ts` — 4 GreenStalk auto-populate strategies (Fragrant Edible, Family Harvest, Companion Powerhouse, Max Berries)
- `src/lib/garden-auto-populate.ts` — 3 in-ground strategies (Sun-Optimized, Kitchen Garden, Max Yield)
- `src/lib/calendar-utils.ts` — Frost dates, planting window logic
- `src/data/use-region.ts` — UK/US detection via `useRegion()` hook
- `src/types/plant.ts` — Plant type with inGround, hardiness, soil, planting window

### Pages
- `PlannerPage` — GreenStalk planner with drag-and-drop, auto-populate, companion indicators
- `GardenPage` — In-ground grid with solar engine, shadow projection, companion/spacing/rotation overlays
- `HarvestPage` — "What can we pick today?" + harvest logging
- `SeedFinderPage` — Seed finder with Essentials filter, Buy Now/Soon timing, multi-variety
- `CarePage` — Monthly Care Dashboard (sow, water, feed, pests, succession, hardening off, frost)
- `SetupGuidePage` — GreenStalk setup, plant support guide, Titan cage allocation, clay soil prep
- `CalendarPage` — Seasonal planting calendar with frost overlay
- `KnowledgeBasePage` — Plant encyclopedia
- `SettingsPage` — Location, tower count

---

## Canonical Research Folder

`/Users/davidcrabtree/Library/CloudStorage/GoogleDrive-dcrabtree@gmail.com/My Drive/GARDEN/`

All garden research lives here. Key files:
- `RESEARCH-SURREY-UK-PLANTS.md` — 48 plants with Surrey-specific dates
- `RESEARCH-FRAGRANCE-PLANTS.md` — 25 fragrance plants for Surrey clay
- `RESEARCH-COMPETITOR-APPS.md` — 10 app analysis with feature roadmap
- `RESEARCH-COMPANION-PLANTING.md`, `RESEARCH-GREENSTALK-TIER.md`, `RESEARCH-MANHATTAN-BEACH-PLANTS.md`
- `garden-plotter-claude-code-handoff.md` — Full feature development handoff (this file's source)

---

## Priority Features to Build

### TIER 1 — Build These First
1. **Hedge/Structure Shadow Modeler** — Calculate actual sun hours per zone using hedge height, direction, latitude. Foundation for everything else.
2. **Yield-per-Square-Foot Calculator** — Compare plants by actual output per pocket/sqft
3. **Succession Planting Scheduler** — "After X finishes, plant Y in same pocket" with compressed first-season mode

### TIER 2 — Build Next
4. **Microclimate Zone Mapper** — Named zones (Terrace, Conservatory, Fence Border, Shed) with profiles
5. **UK Seasonal Timing Engine** — Met Office-aligned, RHS hardiness, frost alerts by postcode
6. **Renter Mode / Reversibility Filter** — Flag anything that could cause tenancy issues
7. **Kid Engagement: Growth Tracker + Countdown** — "Days until harvest", growth stages, photo diary, badges

### TIER 3 — Ambitious / V2
8. **Photo-Based Garden Scanner** — Upload garden photos, AI-assisted recognition, auto-populate plan (3 phases)
9. **Fence Climber Planner** — Linear metres, light mapping, cutting schedules
10. **Cut Flower Vase Life & Cutting Guide** — When to cut, conditioning, reminders
11. **Weather/Frost Alert Integration** — Met Office API for Surrey postcode

### Critical Dependency
The shadow modeler (Feature 1) should come first because the microclimate mapper, yield calculator, and photo scanner all depend on knowing actual sun hours per zone.

---

## Compressed First Season (2026)

| Date | Event |
|------|-------|
| April 15 | Move in. NO gardening gear yet. |
| April 15–May 15 | Start seeds in conservatory. Assess garden, take photos, plan layout. |
| Mid-May | GreenStalks + tools arrive from shipping container |
| Late May | GreenStalks set up on terrace. Transplant seedlings. Direct sow fast crops. |
| June–September | Main growing season |
| October | Season winds down, first frost risk |

**"Late Start" mode:** For a late-May start in Surrey:
- **Still great:** Cherry tomatoes (transplants), strawberries (buy as plants), beans (direct sow), courgettes, herbs, nasturtiums, lettuce, radishes, spring onions
- **Risky:** Anything needing 100+ days from seed
- **Sweet peas:** Buy as plug plants (should have been started February)

---

## Who This Is For

David Crabtree (screenwriter) + family: Max (age 5) and Noelle (age 3). They grow food on GreenStalk vertical planters while renting. The app should be fun, visual, and accessible for young children. Kid-friendly harvesting is the emotional centerpiece.

**Nick Dazé** (best friend) has a parallel garden in Manhattan Beach, CA — the app supports both UK Surrey and US SoCal via region switching.

**Design principles:** Decisions should be surfaced, not buried in data. Take decision-making out of it wherever possible. Expert guidance (RHS, BBC Gardeners' World) baked in.
