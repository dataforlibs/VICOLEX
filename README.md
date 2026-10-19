# DK508 — Mapping Ukraine's History Through a Library Catalog

A Create React App port of four interactive visualizations built from the
Library of Congress DK508 classification ("Ukraine — History"): a landing
page, a map & network explorer, and two D3 streamgraph "rivers." This is a
faithful port — the original D3.js and Leaflet code is unchanged, just
wrapped in React components with client-side routing instead of four
separate static HTML files.

## Pages

| Route         | Page                                                    |
|---------------|----------------------------------------------------------|
| `#/`          | Landing page — data, methodology, honesty section         |
| `#/map`       | Map & Network Explorer (Leaflet + D3, with search/pin)     |
| `#/topics`    | Subject Themes River (D3 streamgraph, 18 named topics)     |
| `#/influence` | Geographic Influence River (Russia/Poland/Other vs Ukraine) |

Routes use `#/...` (a `HashRouter`) rather than clean URLs like `/map`,
deliberately — GitHub Pages serves static files with no server-side
rewrite rules, so a direct link or a browser refresh on a clean-URL route
would 404. Hash routes always load `index.html` first and the router reads
the hash client-side, so no server configuration is needed.

## Local development

Using npm:

```bash
npm install
npm start
```

Using pnpm:

```bash
pnpm install
pnpm start
```

Opens at `http://localhost:3000`. The three chart pages fetch their data
from `public/data/*.json` at runtime (the temporal map's file alone is
~3.5MB), so give the map page a moment to load on first visit.

**A note for pnpm users:** this repo ships an `.npmrc` with
`shamefully-hoist=true`. `react-scripts` (Create React App's build
tooling) expects a flat `node_modules` and doesn't cope well with pnpm's
default symlinked, non-flat layout — without this setting the dev server
or build can fail to resolve some sub-dependencies. Leave `.npmrc` as-is;
it only affects this project's local `node_modules`, not your global pnpm
config. A `pnpm-lock.yaml` is included so `pnpm install` reproduces the exact
dependency versions that were tested. If you'd rather use npm, delete
`pnpm-lock.yaml` first and run `npm install` — it will generate its own
`package-lock.json`.

## Deploying to GitHub Pages

This project uses the `gh-pages` npm package (already in `devDependencies`).
`gh-pages` is invoked the same way regardless of which package manager you
used to install:

```bash
# one-time: create the repo on GitHub and push this project to it
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main

# deploy (npm)
npm run deploy

# deploy (pnpm)
pnpm run deploy
```

`deploy` runs `build` first (via the `predeploy` script) and pushes the
built `build/` folder to a `gh-pages` branch. After the first deploy, go to
the repo's Settings → Pages and confirm the source is set to the
`gh-pages` branch (this is usually detected automatically). The site then
serves at `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`.

`homepage` in `package.json` is set to `"."` (a relative path) rather than
a hardcoded GitHub Pages URL, so the build works regardless of what you
name the repo — no need to edit it before deploying.

## Notes on the port

- Each chart page's original inline `<script>` block was moved into its
  own `*Logic.js` file almost unchanged, wrapped in an
  `init(container, DATA)` function. `d3` and `leaflet` are now npm
  imports instead of CDN `<script>` globals; everything else — every
  function, every `d3.select(...)`/`document.getElementById(...)` call —
  is the same code that ran in the standalone HTML files.
- Each page's large embedded `DATA` JSON blob lives under
  `public/data/*.json` and is fetched at runtime instead of being inlined
  into the JS bundle, so the production bundle stays a reasonable size.
- The landing page has no script logic (it's static markup), so its body
  HTML is injected as-is via a ref rather than hand-converted to JSX —
  this avoids any risk of a class/attribute slip across ~500 lines of
  tuned markup.
- Map tiles are fetched live from `basemaps.cartocdn.com` at runtime, same
  as the original standalone page — this needs a working internet
  connection for the map's basemap to render (the data itself does not
  require any API key or network access).
- Cleanup on unmount calls `.remove()` on both Leaflet map instances (the
  main map and the small pinned-publication preview map) so navigating
  away from and back to `/map` doesn't hit Leaflet's "container already
  initialized" error. The two D3-only river pages don't hold a persistent
  instance the way Leaflet does, so their cleanup is a no-op beyond
  clearing the container.
