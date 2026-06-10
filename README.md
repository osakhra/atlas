# atlas.andrewcastor.dev

Interactive 3D travel globe. A cinematic, Apple-lock-screen-style Earth
showing the places Andrew Castor has lived, vacationed, and done mission
work, with a sidebar that flies the camera to whatever you select.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS 3
- [`three`](https://www.npmjs.com/package/three) +
  [`globe.gl`](https://www.npmjs.com/package/globe.gl) for the 3D globe
- Static export (`output: 'export'`), no server runtime

See [CLAUDE.md](./CLAUDE.md) for the project's hard rules (frozen contracts,
design tokens, what not to build) and [docs/ORCHESTRATION.md](./docs/ORCHESTRATION.md)
for how this codebase was built.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Data

Places live in `src/data/places.ts`, a tree of `Place` nodes (see
`src/lib/types.ts`). It is canonical and append-only: never rewritten or
regenerated. `npm run check-data` (also runs automatically as `prebuild`)
validates the tree: unique ids, valid tiers, leaves have `lat`/`lng` and a
`category`, and the tree depth stays within bounds.

## Textures

Self-hosted in `public/textures/`, all derived from public-domain NASA
imagery (no attribution required, credited here for reference):

- `earth-day-8k.jpg` / `earth-day-4k.jpg`: NASA Visible Earth, Blue Marble
  Next Generation (`world.topo.bathy.200412.3x21600x10800.jpg`), downscaled
  to 8192x4096 and 4096x2048 (q85). The globe picks the 8K texture when
  `renderer.capabilities.maxTextureSize >= 8192`, else the 4K fallback.
- `earth-night.jpg`: NASA Earth Observatory, Black Marble 2016
  (`BlackMarble_2016_3km.jpg`), downscaled to 8192x4096.
- `earth-clouds.png`: NASA MODIS cloud composite (4096x2048, alpha channel),
  via the public-domain `webgl-earth` texture set.
- `night-sky.png`: starfield background (see Phase 0).

## Build / static export

```bash
npm run build
```

This runs `scripts/check-data.ts` first (via `prebuild`), then `next build`.
Because `next.config.js` sets `output: 'export'`, the static site is written
to `out/`.

## Deploying to Cloudflare Pages

- **Build command**: `npm run build`
- **Build output directory**: `out`
- **Root directory**: `/` (repo root)
- **Node version**: 20 or later (Node 24 recommended, matches local dev)
- Connect the `osakhra/atlas` repo and set the production branch to `main`.
  Every push to `main` triggers a new build/deploy automatically.
- No environment variables, KV, D1, or Functions are required; this is a
  pure static site (HTML/CSS/JS + self-hosted textures under
  `public/textures/`).

## Project structure

```
src/
  app/            # App Router: layout, page, globals.css
  components/     # GlobeScene, Sidebar, LocationCard, Legend, Header, Preloader
  data/           # places.ts (canonical), site.ts, tokens.ts
  lib/            # types.ts, geo.ts, selection.tsx, sun.ts, shaders.ts
public/textures/  # self-hosted Earth/cloud/starfield textures
scripts/          # check-data.ts (data validation)
```
