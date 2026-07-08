# Landseed Hardware Catalogue

An interactive 3D microsite for the **Landseed AI Technology Ecosystem product line** —
seven products, each custom-rendered as procedural 3D hardware in a holographic bay:

| Product | Role | Price |
|---|---|---|
| Serengeti | AI camera-alert · park protection | $199–225 |
| VillageGuard | AI camera-alert · coexistence | $299 |
| Jungle-Wallah | optical + acoustic · biodiversity | custom |
| Wolf | bio-acoustic monitor | $100 target |
| Gateway | LoRa → LTE/Starlink/Viasat hub | $150 target |
| Mobile | human-in-the-loop camera | $50 target |
| Shaman | analytics platform (CTDAMS) | subscription |

The **catalogue is the landing page**: every device on a glowing plinth, data-stream
packets flowing into the Shaman core — the Earth Credits measurement layer, at a glance.
Chapter chips at the bottom (the [virunga-immersive](https://github.com/landseed-pbc/virunga-immersive)
pagination pattern) fly the camera to each device, dim the rest of the bay, and pin
engineering callouts to the unit's parts, with the full spec record on the right rail.

## Stack

No build step. Three.js (ESM importmap) + GSAP (UMD) from CDN, one HTML file, one CSS
file, three JS modules:

- `index.html` — DOM chrome: HUD, product-line key, spec rail, caption card, chapter chips
- `src/main.js` — the app: `DEVICES` data (every line from the product-line introduction
  & price sheet), views/flights, callout declutter, raycast hover/click
- `src/world.js` — the bay: renderer, bloom, holo-grid shader floor, plinths, data streams
- `src/devices.js` — the seven products, procedural geometry only (no model files)

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
