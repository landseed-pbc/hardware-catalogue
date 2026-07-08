# CLAUDE.md — working in this repo

A single-page, no-build-step 3D product catalogue. Three.js (ESM importmap) + GSAP (UMD)
from CDN. Layout and pagination deliberately mirror `landseed-pbc/virunga-immersive` —
keep the two sites' design language aligned.

## Invariants

1. **`DEVICES` (in `main.js`) is the single source of truth for products.** Every device
   needs: a builder in `devices.js` (`BUILDERS[id]`), a chip in `index.html#chapters`, a
   row in `#plegend` with matching `data-dev`, and callout anchor names that exist in the
   builder's `userData.anchors`. Keep all four in sync.
2. **Bump the `?v=N` query** on any file you change (`styles.css`, `main.js`, and the
   `world.js` / `devices.js` imports inside `main.js`). Stale cache is the most common
   false "it's broken."
3. **Numbers trace to the source docs** — the product-line introduction docx and the July
   2026 price sheet. Prices with "?" in the sheet are shown as "target"; missing spec
   sheets are flagged "in development". Don't invent specs.
4. **Materials are per-device instances** — builders create fresh materials so `dimTo`
   can fade devices independently (color, envMapIntensity, emissive base, and additive
   opacity are all captured in `d.mats` at assembly time).
5. **No secrets, ever.**

## Verifying a change

```bash
node --check src/main.js && node --check src/world.js && node --check src/devices.js
python3 -m http.server 8791     # open with a ?r=… cache-bust
```

Browser-automation gotcha (same as virunga): a backgrounded tab pauses rAF, so the WebGL
canvas goes stale and GSAP flights freeze. Foreground the tab
(`osascript -e 'tell application "Google Chrome" to activate'`) before any visual check,
or drive state via `window.__hw` (`goView`, `current`, `DEVICES`, `world`) and assert on
DOM/material state instead of trusting a stale screenshot.

## Deploy

Cloudflare Pages, project `hardware-catalogue` (Landseed primary CF account):

```bash
npx wrangler pages deploy . --project-name=hardware-catalogue --branch=main
```

Verify the live URL with a `?cb=$(date +%s)` query.

## Git

Canonical remote is **GitHub** (`landseed-pbc/hardware-catalogue`); **Forgejo**
(`forge.aroessner.com/Landseed-PBC/hardware-catalogue`) is the sovereign mirror. Push
GitHub first, then forge. Conventional commits (`type(scope): why`).
