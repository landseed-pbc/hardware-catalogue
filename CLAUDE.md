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
5. **Callout plates are settle-then-freeze.** Device callouts lay out ONCE when
   the camera flight completes (`flyTo` fires the `onSettle` hook →
   `revealCallouts` → `layoutCallouts`), then the plates stay put; only the
   anchor dots and leader lines track the part per frame. Never reintroduce
   per-frame plate layout — text dragging across the screen during flights is
   the exact bug this replaced.
6. **No secrets, ever.**

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

Verify the live URL with a `?cb=$(date +%s)` query for JS/CSS. For HTML, check the
BARE url — Pages can serve stale edge copies for query-string variants of pages
(observed 2026-07-15: `/faqs/?cb=…` lagged the deploy while `/faqs/` was current).

## Git

Canonical remote is **GitHub** (`landseed-pbc/hardware-catalogue`); **Forgejo**
(`forge.aroessner.com/Landseed-PBC/hardware-catalogue`) is the sovereign mirror. Push
GitHub first, then forge. Conventional commits (`type(scope): why`).

## Satellite pages (/faqs/ · /ai/ — rebuilt app-style 2026-07-15)

Two more app pages alongside Catalogue and Demo. Binding rules:

1. **Satellites import `css/styles.css` read-only** — it IS the design system (tokens,
   chips incl. the purple `.chip.dive`, caption card, HUD, responsive tiers). Never edit
   it for a satellite need; overrides live in `css/satellite.css` + per-page files.
2. **Each surface has its own form — satellites never replicate the device-view.**
   The bay is 3D, the demo is a film, /faqs/ is a flat gridded field sheet (the size
   comparison is a dimensioned SVG sketch — Monitor beside two AA cells; form factor
   founder-stated 2026-07-15, spec-sheet badge stays until dimensions publish), /ai/ is
   the CTDAMS sample workspace — an immersive app, not a framed console: its own app
   bar (mark · tabs · sample-data badge · clock), four clickable views: Overview
   (rangers' phone + the Virunga occupancy twin + metrics), Detections (image cards
   with bounding boxes, filterable by intrusion/people/vehicle/animal-by-species),
   Survey (the twin + class bars + acoustics), Reports (a Virunga-titled library,
   each doc renders its own preview). The occupancy centerpiece is a LIVING 3D TWIN of
   the group's area (ai/map3d.js): real DEM relief + real ESRI satellite, cropped
   to the operating area from the virunga-immersive terrain and downsampled to
   ~0.6 MB (public/terrain-vir/, one displaced Three.js plane — no tile streaming).
   Species icons and hover data are the site's OWN, lifted verbatim into
   ai/species.js (SPSVG field-guide icons + SPECIES registry — accurate, identical
   iconography, verified population figures). Camera-trap stations carry sample
   occupancy ψ. Survey keeps a lightweight 2D occupancy surface (ai/map.js) as a
   second lens. Regenerate terrain-vir with the procterrain script (crop+downsample
   the virunga-immersive rift DEM/satellite; DEM decode is R*256+G+B/256-32768). The bay's /#ai shows the brain itself.
   No Three.js on satellites. Desktop fits one viewport; small screens scroll
   (the ≤1080px media block in satellite.css).
3. **Nav bars are uniform:** every page ends its chip bar with
   `Catalogue · Demo · Landseed AI · FAQs`, current page as a solid-green `.chip.on`
   self-chip. In-page chips (Demo's chapters, /ai/'s purple dashboard dive chips) come
   first, then `.chip-div`, then the four. All plain `.chip` — no `.cta` outlines.
   `#9B6CE0` purple only where content is semantically Landseed AI.
   `_redirects` 301s the retired /why/ URLs to /faqs/.
4. **Facts trace to `DEVICES` in `main.js`** (or its successor data module) and the source
   docs — same as invariant 3 above. Unconfirmed numbers get the exact phrase
   "spec sheet in development". Every illustrative dashboard carries a "sample data" chip —
   convincing fake interfaces ship labeled, always.
5. **`?v=N` discipline extends to satellites** — including any prefetch/preload hints
   pointing at versioned files (the hint version must match the reference it warms).
6. **Every satellite ships a `window.__faq` / `__ai` hook** (cell/pane counts, badge
   flags, rendered fact values) so changes verify headlessly — same doctrine as
   `__hw` / `__demo.step()`. Console/dashboard graphics are crisp SVG or DOM with
   tabular numbers — no scaled canvas.
7. **The rangers' phone chrome on /ai/ is a copy of demo.css v45's** `#phone` +
   `.ph-`/`.tg-` block (only the frame is in-flow instead of fixed). When the demo's
   phone styling evolves, re-sync satellite.css — or extract a shared phone.css.
8. **Indexability is per-page:** /demo/ is deliberately noindex; satellites are indexable
   and ship full OG cards, with the OG image generated before first deploy, not after.

Verifying a satellite change:

```bash
node --check faqs/faqs.js && node --check ai/ai.js
node scripts/check-facts.mjs        # fact drift vs DEVICES in main.js — must pass
python3 -m http.server 8791         # then assert on window.__faq / window.__ai
```

## /demo — the field demonstration

Standalone cinematic page (`demo/index.html` + `demo.js` + `demo.css`), linked
from the catalogue's chapter chips. A procedural low-poly protected landscape
where the products are shown working: chaptered GSAP timeline
(`window.__demo.tl`, chapters in `CH`), deterministic beats (detection → LoRa →
Relay Station → satellite → HQ → patrol), reusing the real device models from
`src/devices.js` (which is why that file's texture path is root-relative).
**CONCEPT mode is the shipping default (2026-07-10). The digital twin stays in
code behind `?terrain=twin`; its mode-toggle UI is commented out.** Device
display names are the generic set (Monitor, VillageGuard, Relay Station, Survey
Unit, Listener, HQ · Landseed AI) in both modes and the catalogue. Verify by
seeking:
`__demo.tl.pause(); __demo.tl.time(T); __demo.tl.play()` — callbacks re-fire on
forward seeks only. Planned to become the default page, with the current
catalogue moving to /catalogue, once perfected.

### Demo v4 notes
- Detection popups render the REAL scene from the sensor's lens (`sensorSnap`,
  IR-graded, boxes projected from true actor positions).
- Humans are rigged Soldier.glb clones (three.js examples, MIT — see
  ATTRIBUTION.md) with Idle/Walk clips via `setGait`.
- Filmic grade ShaderPass (teal-orange, vignette, grain) after OutputPass.
- Sensors are clickable → `/#<id>` catalogue deep-links (hover tooltip).
- `?terrain=real&lat=&lon=` loads AWS Terrain Tiles (top-level await) and swaps
  `heightAt` to the DEM; falls back to procedural on failure.
- Iterate against the LIVE deploy and bump `demo.js?v=N` on every deploy — the
  Pages CDN caches aggressively.
- Alert cards render in a fixed top-centre dock (one at a time, killed by the
  next) — they are deliberately NOT world-projected. Big beats also land in the
  Telegram phone as photo bubbles (`feedPhoto`). The film pauses on its final
  frame; the overlay's Watch again restarts via `resetWorld()`.
- TWIN camera doctrine (FINAL): ONE fixed command view for the whole film —
  no stations, no cuts. CAMKEYS is two keys (a 78 s push-in). NO sway, NO
  look-target rides - the camera is dead-still by user instruction (2026-07-09).
  Scene direction = events on the board (pulses, beams, streams, cards),
  never camera moves. Do not reintroduce stations.
- TWIN (retired from UI, `?terrain=twin`): real DEM (z13) + ESRI imagery (z15, z14 on LOW) with ALL
  story anchors in the `AN` table, hand-picked from the imagery/DEM (grid
  overlay script in the session scratchpad). Fictional keeps its own AN set.
  Sim clock runs 17:35→19:23 (dusk truth). fovSer/fovVG are MATERIALS, not
  meshes — hide via opacity, not scene.remove.
- Verification gotcha: backgrounded tabs freeze rAF AND gsap real-time holds —
  ghost cards / stale clocks in screenshots are artifacts, not bugs. Foreground
  the window before judging timing.

## Callout & framing reference (LOCKED 2026-07-11)

Hand-tuned on Alex's 13" MacBook Pro. **All hand offsets are authored in px at an
860px-tall viewport and scaled by `kk = innerHeight/860`** in `layoutCallouts` —
this is what keeps every screen size looking identical. Do not convert these to
absolute px and do not change the 860 basis. The current values live in
`DEVICES[..].callouts` (`[anchor, title, sub, dx, dy, mode, noline]`), `AI_POS`,
and the `PAN` map in `deviceFrame`; this section records the system so nobody
"simplifies" it away:

- **Frame pans** (`deviceFrame` PAN map): gateway +.27, serengeti −.12,
  villageguard +.10 along the side vector. Distances: gateway 2.2, ai 3.15,
  villageguard 2.35, others 1.8.
- **Landseed AI page**: leaderless composed diagram. Stations in `AI_POS` are
  {x: fraction of the safe band between #howto's right edge and #specs' left
  edge, y: fraction of viewport height} — clock face: core 12, shells 2,
  swarm 4, base 8, rings 10. Plates: `.kw` 190px (`.kc` centred 240px at 12
  o'clock). No dots/lines (`noline`), labels ride the orb's bob.
- **Plates are CSS-centred**: the entrance animates OPACITY ONLY. Never tween
  a klabel's transform — gsap bakes the % translate into pixels at tween time,
  and any reflow (font swap) renders the plate half a box off its leader.
  `.klabel{transform:translate(-50%,-50%)}` owns position at all times.
- **Leaders**: aim at plate center; a mostly-horizontal leader pins to the
  plate's near text edge at mid-height (never detaches), a mostly-vertical one
  clips at the plate border. `above`/`below`-mode plates with a leader render
  centre-aligned.
- **Left rail**: ONE card (#caption, body.devview) spanning top:78 → bottom:92
  at `min(410px,30vw)` — kicker/title/summary, stats, then the chain (#cap-how,
  "How it works"; gateway gets its key spec there instead), buttons pinned to
  the bottom. #cap-how scrolls (hidden scrollbar) if content overflows; one
  `tight` tier on #caption condenses steps first. #howto is retired from
  device views but stays in the DOM (the AI safe-band uses its rect).
  **Never reintroduce a scale() fallback or fixed/equalized two-card heights**
  — both shipped and were rolled back (scale renders every page a different
  size; fixed heights clip titles).
