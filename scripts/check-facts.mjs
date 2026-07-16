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
if (!/sample data/.test(ai)) { failed++; console.error('DRIFT  ai page lost its "sample data" badge'); }
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

if (failed) { console.error(`\n${failed} fact check(s) failed`); process.exit(1); }
console.log(`all ${CHECKS.length + 13} checks pass`);
