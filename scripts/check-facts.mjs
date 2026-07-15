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
const why = read('why/index.html');
const ai = read('ai/index.html');

// [fact label, must-match-in-main.js, [page file, must-match-in-page]]
const CHECKS = [
  ['Monitor price', /\$199–225/, ['why/index.html', /\$199–225/, why]],
  ['first capture', /200 ms/, ['why/index.html', /200 ms/, why]],
  ['battery life', />12 mo/, ['why/index.html', /&gt;12 mo/, why]],
  ['battery chemistry', /LiFePO4/, ['why/index.html', /LiFePO4/, why]],
  ['transmission links', /LTE · LoRa · Wi-Fi · satellite/, ['why/index.html', /cell · LoRa · Wi-Fi · satellite/, why]],
  ['CTDAMS line', /fuses optical, acoustic and remotely-sensed data into population metrics/, ['ai/index.html', /fuses optical, acoustic and remotely-sensed data into population metrics/, ai]],
  ['AI metrics', /presence · occupancy · density · abundance/, ['ai/index.html', /presence · occupancy · density · abundance/, ai]],
  ['AI inputs', /cameras · acoustics · reports · satellite/, ['ai/index.html', /cameras · acoustics · reports · satellite/, ai]],
  ['AI delivery', /subscription · annual updates/, ['ai/index.html', /subscription · annual updates/, ai]],
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
if (!/spec sheet in development/.test(why)) { failed++; console.error('DRIFT  why page lost the "spec sheet in development" placeholder'); }
const sampleBadges = (ai.match(/sample data/g) || []).length;
if (sampleBadges < 3) { failed++; console.error(`DRIFT  ai page has ${sampleBadges} "sample data" badges — every dashboard panel needs one`); }

if (failed) { console.error(`\n${failed} fact check(s) failed`); process.exit(1); }
console.log(`all ${CHECKS.length + 2} fact checks pass`);
