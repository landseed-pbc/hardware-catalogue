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
