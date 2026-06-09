# atlas.andrewcastor.dev — project rules

Interactive 3D travel globe. Cinematic, Apple-lock-screen-style Earth showing
everywhere Andrew Castor has lived, vacationed, and done mission work.
Sidebar-driven navigation; clicking a place flies the camera to it.

## Hard rules

1. **Read before writing.** Read any existing file in full before modifying it.
2. **Dependencies.** Only `three` and `globe.gl` may be added beyond the
   scaffold (Next.js, React, Tailwind, TypeScript). No GSAP, framer-motion,
   d3, state libraries, or UI kits. If another dependency seems required,
   stop and report instead of installing.
3. **No browser storage.** No localStorage, sessionStorage, or IndexedDB.
   All state lives in React state (see `src/lib/selection.tsx`).
4. **No em dashes** in user-facing copy. Use commas, semicolons, colons,
   periods, or middle dots (·).
5. **`src/data/places.ts` is canonical content and append-only.** Never
   rewrite, regenerate, or "clean up" entries. Never invent places, dates,
   blurbs, or best-spots content. Empty fields stay empty until the owner
   fills them in.
6. **Design tokens are frozen** (see below). Do not change colors or fonts.
7. **Static export must keep working.** `output: 'export'` in
   `next.config.js`, `images.unoptimized = true`, no server components that
   require a server, no API routes. The globe renders client-side only
   (`'use client'`, loaded via `next/dynamic` with `ssr: false`).
8. Commit messages are prefixed `[phase-N]` or `[agent-<name>]`.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS 3, static export.
- All app code lives under `src/` (`src/app`, `src/components`, `src/data`,
  `src/lib`). Path alias `@/*` -> `./src/*`.
- Fonts: Sora (display), Outfit (body), JetBrains Mono (coords, dates,
  header). Always dark (`data-theme="dark"` on `<html>`); there is no light
  mode and no theme toggle.
- `three` and `globe.gl` render the globe via `src/components/GlobeScene.tsx`.

## Design tokens (do not alter)

- Background: `#080B12`. Glass card surface: `rgba(13,17,23,0.72)`,
  `backdrop-filter: blur(12px)`, border `rgba(130,148,166,0.18)`, radius 12px.
- Category colors: Lived `#1E9E8A` (teal) · Vacationed `#9B6FD4` (purple) ·
  Work/Mission `#C9922A` (gold) · Planned `#8294A6` (silver).
- Interactive accent (hover/focus/active): teal `#1E9E8A` only.
- Atmosphere: `#7FB7E3` (physical pale blue, not brand teal).
- Text: `#D5DDE0` / `#B5BEC8` / `#7E8898`.

All of the above live as CSS vars in `src/app/globals.css` and as TS
constants in `src/data/tokens.ts`. Both must stay in sync.

## Contract files (frozen)

- `src/lib/types.ts` — `Place`, `Category`, `Tier`. Do not change shape.
- `src/lib/selection.tsx` — `SelectionProvider` / `useSelection()` exposing
  `{ selected: Place | null, select(id), clear() }`.
- `src/lib/geo.ts` — `flattenPlaces`, `findPlace`, `centroidOf`,
  `altitudeForTier` (owned by the data work).

## Textures

Self-hosted in `public/textures/`: `earth-day.jpg`, `earth-night.jpg`,
`night-sky.png`, `earth-clouds.png`. Sourced from the three-globe example
assets and three.js example assets (public domain / open source), recompressed.
Do not hotlink external texture URLs.

## What not to build

No photo galleries, search box, realtime sun position/SunCalc, analytics,
CMS, or tests beyond `scripts/check-data.ts`. No light mode. No zoom controls.
No content invention of any kind in `src/data/places.ts`.
