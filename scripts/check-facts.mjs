#!/usr/bin/env node
/* Fact-drift check — satellites restate facts whose source of truth is DEVICES
   in src/main.js. Every number on a satellite page must still exist in the
   source; run before any deploy that touches a satellite (repo CLAUDE.md).
   Exit 1 on drift. */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const main = read('src/main.js');
const faqs = read('faqs/index.html');
const ai = read('ai/index.html');
const aijs = read('ai/ai.js');
const mapjs = read('ai/map.js');
const map3d = existsSync(join(root, 'ai/map3d.js')) ? read('ai/map3d.js') : '';
import { existsSync } from 'node:fs';
const hasGeo = existsSync(join(root, 'public/virunga-geo.json'));
const hasTerrain = existsSync(join(root, 'public/terrain-vir/sat.jpg')) && existsSync(join(root, 'public/terrain-vir/dem.png'));
const species = existsSync(join(root, 'ai/species.js')) ? read('ai/species.js') : '';

// [fact label, must-match-in-main.js, [page file, must-match-in-page, page text]]
const CHECKS = [
  ['Monitor price', /\$199–225/, ['faqs/index.html', /\$199–225/, faqs]],
  ['first capture', /200 ms/, ['faqs/index.html', /200 ms/, faqs]],
  ['battery life', />12 mo/, ['faqs/index.html', /&gt;12 mo/, faqs]],
  ['battery chemistry', /LiFePO4/, ['faqs/index.html', /LiFePO4/, faqs]],
  ['transmission links', /LTE · LoRa · Wi-Fi · satellite/, ['faqs/index.html', /cell · LoRa · Wi-Fi · satellite/, faqs]],
  ['underwater proof', /14 days underwater, transmitting/, ['faqs/index.html', /14 days/, faqs]],
  ['CTDAMS line', /fuses optical, acoustic and remotely-sensed data into population metrics/, ['ai/index.html', /fuses optical, acoustic and remotely-sensed data into population metrics/, ai]],
  ['AI metrics', /presence · occupancy · density · abundance/, ['ai/index.html', /presence · occupancy · density · abundance/, ai]],
  ['AI inputs', /cameras · acoustics · reports · satellite/, ['ai/ai.js', /cameras · acoustics · reports · satellite/, aijs]],
  ['AI delivery', /subscription · annual updates/, ['ai/ai.js', /subscription · annual updates/, aijs]],
  ['AI roadmap', /monocular distance · acoustic triangulation/, ['ai/index.html', /monocular distance · acoustic triangulation/, ai]],
];

let failed = 0;
for (const [label, srcRe, [page, pageRe, pageText]] of CHECKS) {
  const inSrc = srcRe.test(main);
  const inPage = pageRe.test(pageText);
  if (!inSrc || !inPage) {
    failed++;
    console.error(`DRIFT  ${label}: source=${inSrc ? 'ok' : 'MISSING from main.js'} · ${page}=${inPage ? 'ok' : 'MISSING'}`);
  }
}

// satellite honesty invariants
if (!/spec sheet in development/.test(faqs)) { failed++; console.error('DRIFT  faqs page lost the "spec sheet in development" placeholder'); }
// guard the actual rendered badge ELEMENT, not the word "sample" anywhere (it
// lives in comments too) — the badge is the honesty disclaimer that must ship
if (!/class="sp-badge">sample data<\/span>/.test(ai)) { failed++; console.error('DRIFT  ai page lost its visible "sample data" badge element'); }
if (!/Camera Trap Data Analysis Management System/.test(ai)) { failed++; console.error('DRIFT  ai page lost the CTDAMS expansion'); }
if (!/sample/.test(aijs)) { failed++; console.error('DRIFT  ai.js lost its sample labeling'); }
if (!hasGeo) { failed++; console.error('DRIFT  public/virunga-geo.json (real OSM boundary) missing'); }
if (!/OpenStreetMap/.test(mapjs)) { failed++; console.error('DRIFT  map.js lost its OSM source attribution'); }
if (!/Virunga/.test(ai)) { failed++; console.error('DRIFT  ai page lost the Virunga framing'); }
if (!hasTerrain) { failed++; console.error('DRIFT  public/terrain-vir (real DEM + ESRI satellite) missing'); }
if (!/SPECIES|SPSVG/.test(species)) { failed++; console.error('DRIFT  ai/species.js lost the Virunga species registry'); }
if (!/Gorilla beringei beringei/.test(species)) { failed++; console.error('DRIFT  species.js lost verified species data'); }
if (!/buildSerengeti|buildVillageGuard|buildGateway|buildWolf/.test(map3d)) { failed++; console.error('DRIFT  map3d.js lost the deployed-device (sensors) layer'); }
// cited population figures must keep their sources in the map SOURCES list
for (const fig of ['604', '2,700', '27.6']) if (!mapjs.includes(fig)) { failed++; console.error(`DRIFT  map.js lost cited figure ${fig}`); }
// the 2×AA form factor is founder-stated (2026-07-15), not in DEVICES — it must
// stay paired with the in-development badge until the spec sheet publishes
if (/2×AA|two AA/.test(faqs) && !/spec sheet in development/.test(faqs)) {
  failed++; console.error('DRIFT  faqs states the AA form factor without the spec-sheet badge');
}

/* ── structural coupling: adding or renaming a device must stay in sync ──────
   The catalogue's single source of truth is DEVICES in src/main.js. A new/renamed
   device must touch: (a) a builder in devices.js, (b) a #plegend row in index.html,
   (c) callout anchors in the builder. These guards catch the statically-checkable
   couplings so a half-applied edit fails CI instead of shipping a dead legend row
   or a mis-coloured map token. (Runtime warns on missing callout anchors.) */
const index = read('index.html');
const devIds = [...main.matchAll(/id:\s*'([a-z]+)',/g)].map((m) => m[1]);
const plegend = [...index.matchAll(/data-dev="([a-z]+)"/g)].map((m) => m[1]);
for (const id of devIds) if (!plegend.includes(id)) { failed++; console.error(`COUPLING  device "${id}" (DEVICES) has no #plegend data-dev row in index.html`); }
for (const dv of plegend) if (!devIds.includes(dv)) { failed++; console.error(`COUPLING  #plegend row data-dev="${dv}" has no matching DEVICES entry in main.js`); }

// map3d DEVLAYERS restates device identity — its cat id must be a real device and
// its hue must equal that device's DEVICES hue (or the map silently drifts)
const devHue = {};
for (const m of main.matchAll(/id:\s*'([a-z]+)',[\s\S]{0,160}?hue:\s*(0x[0-9A-Fa-f]{6})/g)) devHue[m[1]] = m[2].toLowerCase();
for (const m of map3d.matchAll(/hue:\s*(0x[0-9A-Fa-f]{6})[\s\S]{0,80}?cat:\s*'([a-z]+)'/g)) {
  const hue = m[1].toLowerCase(), cat = m[2];
  if (!devHue[cat]) { failed++; console.error(`COUPLING  map3d DEVLAYERS cat "${cat}" is not a DEVICES id`); }
  else if (devHue[cat] !== hue) { failed++; console.error(`COUPLING  map3d DEVLAYERS hue ${hue} ≠ DEVICES "${cat}" hue ${devHue[cat]}`); }
}

// every importer of devices.js must pin the SAME ?v= — a partial bump serves a
// stale builder to whichever page was missed
const devVers = new Set();
for (const f of ['src/main.js', 'demo/demo.js', 'ai/map3d.js']) {
  const mm = read(f).match(/devices\.js\?v=(\d+)/);
  if (mm) devVers.add(mm[1]);
}
if (devVers.size > 1) { failed++; console.error(`DRIFT  devices.js imported at diverging ?v= (${[...devVers].join(', ')}) — unify every importer`); }

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log(`all checks pass (${CHECKS.length} facts + honesty + device-coupling + version guards)`);
