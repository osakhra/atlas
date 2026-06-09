# Orchestration notes

This project was built by a single orchestrator session running a small
team of subagents against a shared repo, with strict file ownership to
avoid merge conflicts. This doc records what ran, in what order, and why,
for anyone picking this up later.

## Phase 0 — Scaffold (orchestrator)

- Cloned `osakhra/castor-ui` as a starting point and stripped it down:
  removed `NetworkGrid`, `ThemeToggle`, light mode, and showcase-only
  sections/classes.
- Kept the font stack (Sora / Outfit / JetBrains Mono) and the
  terminal-prompt nav convention (`~/atlas`).
- Added `three` and `globe.gl` as the only new runtime dependencies.
- Wrote the frozen contracts: `src/lib/types.ts` (`Place`, `Category`,
  `Tier`) and `src/lib/selection.tsx` (`SelectionProvider`/`useSelection`).
- Rewrote `src/app/globals.css` and `src/data/tokens.ts` for the Atlas
  palette (category colors, atmosphere blue), removed the old `status`
  color section's now-unused values were left in `tailwind.config.ts` as
  inert (no longer referenced) leftovers from the scaffold.
- Self-hosted the four globe textures under `public/textures/` (day,
  night/city-lights, starfield, clouds), sourced from the three-globe and
  three.js example asset sets and recompressed to keep the repo small
  (~2.6 MB total).
- Verified `npm run build` produced a static export before handing off.
- Committed as `b469741 [phase-0] scaffold, contract, textures`.

## Phase 1 — Parallel feature agents

The original plan was three agents in parallel (data, globe, ui). In
practice, **the data agent ran first and alone**, then globe + ui ran in
parallel. This was a deliberate deviation:

- `src/data/places.ts` (the canonical place tree) and `src/lib/geo.ts`
  (`flattenPlaces`, `findPlace`, `centroidOf`, `altitudeForTier`) are
  imported by *both* `GlobeScene.tsx` and `page.tsx`/`Sidebar.tsx`. If all
  three agents ran simultaneously, the globe and ui agents would either
  block on stub types or risk merge conflicts on the same files.
- Running data first (commit `d58e716 [agent-data] ...`) meant globe and ui
  could both `import { places } from '@/data/places'` and
  `import { findPlace, centroidOf, altitudeForTier } from '@/lib/geo'` from
  the start, type-check cleanly, and never touch each other's files.

### Agent: data (sequential)

Owned: `src/data/places.ts`, `src/lib/geo.ts`, `scripts/check-data.ts`.
Produced the 60-node / 34-leaf / depth-5 place tree (3 continents), the geo
helper functions, and the data-validation script that runs as `prebuild`.

Committed as `d58e716 [agent-data] Add canonical places dataset, geo
helpers, and check-data validation`.

### Agents: globe + ui (parallel)

Both agents were given the same frozen `GlobeSceneProps`/`GlobeSceneHandle`
contract up front so neither blocked on the other's completion order.

- **globe** owned `src/components/GlobeScene.tsx`, `src/lib/sun.ts`,
  `src/lib/shaders.ts`. Implemented the day/night terrain shader, pins,
  selection ring, atmosphere, starfield, an animated cloud layer, orbit
  controls (drag-to-orbit + auto-rotate with idle resume), and performance/
  accessibility handling (pixel ratio cap, Page Visibility pause/resume,
  `prefers-reduced-motion`).
  Committed as `34cb8ac [agent-globe] Add GlobeScene with day/night shader,
  pins, rings, controls`.
- **ui** owned `Sidebar.tsx`, `LocationCard.tsx`, `Legend.tsx`,
  `Header.tsx`, `Preloader.tsx`, `globals.css` (additive), and `page.tsx`.
  Implemented the glass-panel layout, accessible ARIA tree sidebar (desktop
  fixed panel / mobile bottom sheet), location card (full card for leaves,
  minimal chip for groups), always-on four-category legend, and preloader
  tied to `GlobeScene`'s `onReady`.
  Committed as `2f34989 [agent-ui] Add layout shell, sidebar tree, location
  card, legend, header, preloader`.

Both agents avoided running `npm run build`/`npm run dev` concurrently
(only `npx tsc --noEmit`, expecting and ignoring errors in the other
agent's not-yet-written files) to avoid corrupting a shared `.next` cache.

## Phase 2 — Integration (orchestrator)

- Installed `@types/three` as a dev dependency. `three@0.184.0` ships no
  `.d.ts` files; without `@types/three`, `tsc`/`next build` fail under
  strict mode on every file that does `import * as THREE from 'three'`.
  This is type-only (no runtime/bundle impact), so it doesn't conflict with
  the "only `three` + `globe.gl`" dependency rule, which is about the
  production dependency surface.
- Ran `npx tsc --noEmit` and `npm run build` clean across the merged
  codebase (both agents' files type-check together with no shared-file
  conflicts).
- **Fixed a dead-code path**: the Sidebar's click handler only called
  `toggleExpanded()` for non-leaf rows (continents/countries/states/
  islands), never `select()`. That meant `centroidOf()` and
  `altitudeForTier('continent' | 'country' | 'state' | 'island')` -
  explicitly part of the camera-altitude spec - were unreachable from the
  UI. Fixed `handleActivate` in `Sidebar.tsx` so every row both selects
  *and* (for branches) toggles expansion: clicking "United States" now
  flies the camera to the country's centroid at the country altitude and
  shows the minimal name-only `LocationCard` chip, while still
  expanding/collapsing its children.
- **Added URL hash deep links** (`#paris` etc.): on first load, the page
  reads `location.hash` and selects that place if it exists; on every
  selection change, it replaces the hash via `history.replaceState` (no
  new history entries, no storage of any kind).
- Verified end-to-end in a browser: globe renders with visible day/night
  terminator and city lights, pins render in the four category colors,
  clicking any tree row (leaf or branch) flies the camera and updates the
  location card, the legend always shows all four categories, and the
  mobile bottom-sheet sidebar doesn't collide with the location card.
- Committed as `8edf25f [phase-2] Integration: branch selection fly-to, URL
  hash deep links, @types/three`.

## Phase 3 — QA, docs, deploy prep

- Re-ran `scripts/check-data.ts`, `npx tsc --noEmit`, and `npm run build`
  (static export to `out/`) as a final check.
- Wrote this file and `README.md` (dev/build commands, Cloudflare Pages
  build settings: build command `npm run build`, output directory `out`).
- See the orchestrator's final report (end of session) for accepted risks
  and judgment calls (texture sourcing, cloud layer, `next` audit
  advisories, etc).
