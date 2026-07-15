# Landseed Hardware Catalogue

An interactive 3D microsite for the **Landseed AI Technology Ecosystem product line** —
seven products, each custom-rendered as procedural 3D hardware in a holographic bay:

| Product (display name) | Internal id | Role | Price |
|---|---|---|---|
| Monitor | `serengeti` | AI camera-alert · park protection | $199–225 |
| VillageGuard | `villageguard` | AI camera-alert · coexistence | $299 |
| Survey Unit | `junglewallah` | optical + acoustic · biodiversity | custom |
| Listener | `wolf` | bio-acoustic monitor | $100 target |
| Relay Station | `gateway` | LoRa → LTE/Starlink/Viasat hub | $150 target |
| Mobile | `mobile` | human-in-the-loop camera | $50 target |
| Landseed AI | `ai` | analytics platform (CTDAMS) | subscription |

Display names are the simplified generic set (2026-07-10); internal ids, hash
deep-links (`/#serengeti`) and `BUILDERS` keys keep the original codenames.

The **catalogue is the landing page**: every device on a glowing plinth, data-stream
packets flowing into the Shaman core — the Earth Credits measurement layer, at a glance.
Chapter chips at the bottom (the [virunga-immersive](https://github.com/landseed-pbc/virunga-immersive)
pagination pattern) fly the camera to each device, dim the rest of the bay, and pin
engineering callouts to the unit's parts, with the full spec record on the right rail.

## Stack

No build step. Three.js (ESM importmap) + GSAP (UMD) from CDN.

**App pages** (fixed layout, no scrolling):

- `index.html` — DOM chrome: HUD, product-line key, spec rail, caption card, chapter chips
- `src/main.js` — the app: `DEVICES` data (every line from the product-line introduction
  & price sheet), views/flights, callout declutter, raycast hover/click
- `src/world.js` — the bay: renderer, bloom, holo-grid shader floor, plinths, data streams
- `src/devices.js` — the seven products, procedural geometry only (no model files)
- `demo/` — the field-demonstration film (see CLAUDE.md)

**Satellite pages** (flat, one viewport at desktop; import `css/styles.css` read-only
+ `css/satellite.css`; each surface has its own form — no device-view replication):

- `faqs/` — the field sheet: seven questions and six facts on one gridded screen,
  the size comparison drawn as a dimensioned sketch (Monitor beside two AA cells).
- `ai/` — the CTDAMS sample workspace: an app with four clickable views — Overview
  (the rangers' phone + occupancy + metrics), Detections (filterable table), Survey,
  Reports — every number sample-labeled; the bay's /#ai shows the brain itself.
- `scripts/check-facts.mjs` — satellite copy restates facts whose source of truth is
  `DEVICES` in `main.js`; run before deploying any satellite change.
- `_redirects` — the retired /why/ URLs 301 to /faqs/.

## Run

```bash
python3 -m http.server 8791    # then open http://localhost:8791
```

## Deploy

Cloudflare Pages, project `hardware-catalogue` (Landseed primary CF account):

```bash
npx wrangler pages deploy . --project-name=hardware-catalogue --branch=main
```

## Content honesty

Prices marked *target* are pre-launch estimates from the July 2026 price sheet. Wolf and
Jungle-Wallah spec sheets are flagged "in development" in-app because the source document
says exactly that. Serengeti availability: September 2026.
