// ── main.js — the catalogue: product data, views, chips, callouts, panels ──
// Layout & pagination follow the Virunga viz: bottom chapter chips, caption
// card bottom-left, labels pinned to the scene. Clicking a device clears the
// bay and stages it alone; its record splits across two fixed panels — the
// chain (left) and the key specification (right) — sized to need no scrolling.

import * as THREE from 'three';
import { createWorld } from './world.js?v=3';
import { BUILDERS } from './devices.js?v=31';

const $ = (s) => document.querySelector(s);

/* ── the product line — facts from the Landseed product-line introduction &
      July 2026 price sheet (canonical). "target" = pre-launch pricing. ────── */

const DEVICES = [
  {
    id: 'serengeti', name: 'Landseed Monitor', kicker: 'To see · Park protection',
    hue: 0x00FF64, price: '$199–225', x: -3.75,
    desc: 'AI alert camera for park protection',
    line: 'The smallest, lowest-power AI camera-alert system on the market — built to be everywhere. Earlier versions put 20 poachers from 13 gangs under arrest, from the Serengeti outward to six more countries.',
    stats: [['$199–225', 'per unit'], ['200 ms', 'first capture'], ['30 s', 'alert via cell'], ['>12 mo', 'battery']],
    badges: ['$199–225 / unit', 'available Sept 2026', 'LoRa · 2 variants'],
    best: 'One or two detection classes — humans, vehicles, boats, logging trucks, or a single conflict species — on the most affordable computer-vision chip made. Best within ~9 m.',
    how: [
      ['Wake', 'Motion trigger; 200 ms to an image.'],
      ['Think', 'On-camera detector; false triggers die here.'],
      ['Shrink', 'Area of interest cropped and compressed.'],
      ['Send', 'Cell in ~30 s, or LoRa → Relay Station → satellite.'],
      ['Respond', 'Rangers move before the loss, not after.'],
    ],
    key: [
      ['VPU', 'ultra-low-power vision NPU'],
      ['Sensor', 'sub-megapixel · IR illuminated'],
      ['Speed', '200 ms capture · < 1 s re-trigger'],
      ['Range', 'up to 9 m'],
      ['Classes', 'humans · vehicles · 1–2 species'],
      ['Threshold', 'tunable — miss nothing, or wake no one'],
      ['vs trail cams', 'thinks on-board · transmits without cell'],
      ['Power', 'LiFePO4 pack · > 12 months'],
      ['Enclosure', 'IP67+ camo · −20 to +60 °C'],
      ['Links', 'LTE · LoRa · Wi-Fi · satellite'],
      ['Proven', '14 days underwater, transmitting'],
    ],
    callouts: [
      ['lens', 'Optics', 'Low-light sensor · 200 ms to first image', 50, -65],
      ['ir', 'IR illuminator', 'Sees at night, shows nothing', 60, -65],
      ['antenna', 'Long-range radio', 'LoRa · LTE · satellite backhaul'],
      ['pir', 'PIR trigger', '5–10 µA asleep · re-trigger < 1 s', -290, 65],
      ['battery', 'Battery pack', 'External, expandable · > 12 months', -20, 20],
      ['shell', 'Camo shell', 'IP67+ · tested underwater', 0, 0, 'above'],
    ],
  },
  {
    id: 'villageguard', name: 'Landseed VillageGuard', kicker: 'To see · Coexistence',
    hue: 0xFFC800, price: '$299', x: -2.25,
    desc: 'Multi-species AI camera for conflict prevention',
    line: 'When predators and mega-herbivores leave the parks for villages, VillageGuard gives rangers and village protection units the early alert that turns conflict into coexistence.',
    stats: [['$299', 'per unit'], ['8–10', 'object classes'], ['15 m', 'detection range'], ['<1 KB', 'alert image']],
    badges: ['$299 / unit', 'LTE + 2 LoRa variants', '8–10 classes'],
    best: 'Multi-species detection at the village edge — elephant, tiger, lion, bear and more in one model, plus humans and vehicles, with direct-to-cell where available.',
    how: [
      ['Wake', '200 ms wake · 2 MP low-light optics.'],
      ['Think', '8–10 species and threats in one model.'],
      ['Shrink', 'Alert image auto-encoded below 1 KB.'],
      ['Send', 'LTE / direct-to-cell, or LoRa to a Relay Station.'],
      ['Respond', 'The village knows before the elephant arrives.'],
    ],
    key: [
      ['VPU', 'dedicated vision NPU'],
      ['Sensor', '2 MP · IR illuminated'],
      ['Speed', '200 ms capture · < 1 s re-trigger'],
      ['Range', 'up to 15 m'],
      ['Classes', '8–10 in one detector'],
      ['Threshold', 'tunable per site'],
      ['Alert image', '< 1 KB auto-encoded'],
      ['Power', 'LiFePO4 pack · > 12 months'],
      ['Enclosure', 'IP67+ camo · −20 to +60 °C'],
      ['Links', 'LTE / direct-to-cell · LoRa · satellite'],
    ],
    callouts: [
      ['lens', 'Optics', '2 MP sensor · 15 m range', 70, -70],
      ['ir', 'Dual IR array', 'Night work at the village edge', 80, -55],
      ['vpu', 'Dedicated vision NPU', '8–10 classes on the edge', 30, -2],
      ['antenna', 'Twin radios', 'LoRa + LTE / direct-to-cell'],
      ['battery', 'Battery pack', 'External, expandable · > 12 months', 4, 1, 'above'],
    ],
  },
  {
    id: 'gateway', name: 'Landseed Relay Station', kicker: 'To connect · The hub',
    hue: 0x32C8FF, price: '$150 target', x: -.75,
    desc: 'Connects cameras where there is no cell signal',
    line: 'Most protected areas have no cell signal. The Relay Station takes long-range radio from many cameras and hands it to whatever sky is available — one airtime bill for the whole hill.',
    stats: [['$150', 'target / unit'], ['1', 'hub, many cameras'], ['5', 'landscape scenarios'], ['>12 mo', 'battery + solar']],
    badges: ['$150 target', 'IP67+ field case', 'any sky'],
    best: 'Anywhere beyond the towers. Cameras in cell range transmit direct and need no Relay Station; everywhere else this is the bridge — in a village, on a ridge, on a tower, or under open sky.',
    scenarios: [
      { n: 'Reliable cell at the camera', d: 'Cameras transmit direct — no Relay Station needed.', t: '~30 s' },
      { n: 'Cell nearby, not at the camera', d: 'LoRa to a Relay Station in a village or on a ridge; out by cell.', t: 'minutes' },
      { n: 'A powered tower in the park', d: 'The Relay Station joins the tower’s internet by Wi-Fi or ethernet.', t: 'minutes' },
      { n: 'No cell, open terrain', d: 'Satellite uplink — Starlink Mini, Viasat, or direct-to-cell.', t: 'minutes' },
      { n: 'No cell, closed canopy', d: 'LoRa hop to a Relay Station placed under open sky; many cameras share it.', t: 'minutes' },
    ],
    key: [
      ['Modems', 'LoRa · LTE / direct-to-cell'],
      ['Satellite', 'Starlink Mini · Viasat'],
      ['Frequency', '433 / 865–915 MHz, per country'],
      ['LoRa reach', 'km-scale line-of-sight · ≤10 km advised'],
      ['Wake', 'deep sleep until a camera calls'],
      ['Power', 'LiFePO4 · > 12 mo · solar indefinite'],
    ],
    callouts: [
      ['lora', 'LoRa mast', 'Free-protocol radio, per-country frequency', 280, -75, null, 2],
      ['lte', 'LTE / direct-to-cell', 'Uses the towers when they exist', 60, 15, 'above', 2],
      ['solar', 'Solar endurance', 'Indefinite with sun', 150, 45],
      ['io', 'Sealed I/O', 'Starlink Mini · Viasat · ethernet', -10, 43],
      ['case', 'Field case', 'IP67 · fits in a daypack', 85, -105],
    ],
  },
  {
    id: 'junglewallah', name: 'Landseed Survey Unit', kicker: 'To see & listen · Biodiversity',
    hue: 0xFF8C42, price: 'custom', x: .75,
    desc: 'Camera + acoustic unit for biodiversity surveys',
    line: 'Pick the few species that tell you the most about a landscape, then watch and listen for exactly those — VillageGuard optics carrying bespoke species models, joined to an acoustic pod.',
    stats: [['optical', '+ acoustic'], ['custom', 'species models'], ['Wi-Fi / SD', 'collection'], ['re-ID', 'for density']],
    badges: ['custom builds', 'per-landscape AI', 'spec sheet in development'],
    best: 'Long-term biodiversity plots where real-time isn’t required — data comes home over Wi-Fi or on the microSD card, and density falls out of re-identification and triangulation.',
    how: [
      ['Choose', 'The few indicator species that say the most.'],
      ['Watch & listen', 'A bespoke detector, plus the acoustic pod.'],
      ['Collect', 'Wi-Fi on patrol, or swap the microSD card.'],
      ['Understand', 'Density from re-ID and triangulation.'],
    ],
    key: [
      ['Platform', 'VillageGuard hardware'],
      ['AI', 'custom species models per landscape'],
      ['Acoustics', 'companion pod / Landseed Listener'],
      ['Collection', 'Wi-Fi · microSD · optional radio'],
      ['Analytics', 're-ID + triangulation in Landseed AI'],
      ['Spec sheet', 'in development'],
    ],
    callouts: [
      ['lens', 'Optics', 'VillageGuard 2 MP platform', -15, -50],
      ['pod', 'Acoustic pod', 'The listening half of the survey', -45, -10, 'above'],
      ['ai', 'Bespoke models', 'The key species of your landscape', 60, -5],
      ['wifi', 'Wi-Fi offload', 'No airtime required', -15, -15, null, 2],
    ],
  },
  {
    id: 'wolf', name: 'Landseed Listener', kicker: 'To listen · Bio-acoustics',
    hue: 0xE682E6, price: '$100 target', x: 2.25,
    desc: 'Listens for vocalising wildlife',
    line: 'The forest is louder than it looks. The Listener hears what cameras never frame — and with three units triangulating the same call: how far away, and how many.',
    stats: [['$100', 'target / unit'], ['24/7', 'listening'], ['3+', 'units triangulate'], ['passive', 'no trigger']],
    badges: ['$100 target', 'single variant', 'spec sheet in development'],
    best: 'Vocal species and vast dark forests: presence and absence from call detection, distance and density from an array.',
    how: [
      ['Listen', 'Always on — no trigger, no line of sight.'],
      ['Detect', 'Call recognition picks species from noise.'],
      ['Triangulate', '3+ units place the caller on the map.'],
      ['Count', 'Calling rates become density in Landseed AI.'],
    ],
    key: [
      ['Function', 'passive acoustic detection'],
      ['Output', 'presence / absence per species'],
      ['Array', '3+ units triangulate distance'],
      ['Pairs with', 'Survey Unit passes'],
      ['Analytics', 'Landseed AI'],
      ['Spec sheet', 'in development'],
    ],
    callouts: [
      ['grille', 'Open grille', 'Weatherproof acoustic window'],
      ['mic', 'Mic crown', 'Omnidirectional, canopy-aimed', 0, 0],
      ['core', 'Detector', 'Call recognition on the edge'],
      ['base', 'Status', 'Months on a charge'],
    ],
  },
  {
    id: 'mobile', name: 'Landseed Mobile', kicker: 'To report · Human in the loop',
    hue: 0x1482FF, price: '$50 target', x: 3.75,
    desc: 'Handheld camera for human reports — no AI',
    line: 'The cheapest sensor is a person who knows what they’re looking at. No AI, no motion trigger, no infrared — a human sees the elephant or the poacher, frames it, and the network does the rest.',
    stats: [['$50', 'target / unit'], ['0', 'AI — by design'], ['human', 'triggered'], ['daylight', 'optics']],
    badges: ['$50 target', 'no AI · no PIR', 'informant networks'],
    best: 'Community early-warning — elephants or predators near a village, or intelligence from inside — carried over the same Landseed network.',
    how: [
      ['See', 'A person notices what cameras miss.'],
      ['Frame', 'One key: point, confirm, done.'],
      ['Send', 'Same network as every automated alert.'],
      ['Act', 'Corroborates the machine detections.'],
    ],
    key: [
      ['Trigger', 'human operator'],
      ['AI', 'none — by design'],
      ['Optics', 'daylight · no IR · no light meter'],
      ['Network', 'cell or Landseed Relay Station'],
      ['Role', 'informants · guards · village early warning'],
      ['Why $50', 'nothing on board that a person replaces'],
    ],
    callouts: [
      ['screen', 'Report screen', 'Frame, confirm, transmit', 55, 10],
      ['eye', 'Daylight camera', 'No IR, no meter — $50 stays $50'],
      ['shutter', 'Shutter key', 'One press to capture and send', 45, 60],
      ['body', 'Rugged slab', 'Pocketable, unremarkable', -10, 70],
    ],
  },
  {
    id: 'ai', name: 'Landseed AI', kicker: 'To understand · The platform brain',
    hue: 0x9B6CE0, price: 'subscription', x: 0, z: -1.9,
    desc: 'The analytics platform behind every sensor',
    line: 'Every sensor reports here. Landseed AI — the platform brain, the CTDAMS — fuses optical, acoustic and remotely-sensed data into population metrics, and writes the measurement layer for Earth Credits.',
    stats: [],
    badges: ['subscription', 'standalone or bundled', 'bespoke builds'],
    best: 'Sold as a package with the hardware or standalone; annual updates, with bespoke versions built to a programme’s needs.',
    how: [
      ['Ingest', 'Cameras, acoustics, reports, satellite feeds.'],
      ['Fuse', 'All layers read together.'],
      ['Estimate', 'Presence, occupancy, density, abundance.'],
      ['Deliver', 'Live alerts + automated reports.'],
    ],
    key: [
      ['Inputs', 'cameras · acoustics · reports · satellite'],
      ['Metrics', 'presence · occupancy · density · abundance'],
      ['Alerts', 'phones · email · operations rooms'],
      ['Reporting', 'automated'],
      ['Programme', 'Earth Credits measurement layer'],
      ['Delivery', 'subscription · annual updates'],
      ['Form', 'bundled or standalone · bespoke builds'],
      ['Roadmap', 'monocular distance · acoustic triangulation'],
    ],
    callouts: [
      ['core', 'The brain', 'CTDAMS — every sensor in the landscape feeds one aggregator', 0, 95, null, 1],
      ['shells', 'Fusion layers', 'Optical, acoustic and satellite streams, read together', -10, 65, null, 1],
      ['rings', 'Analytics', 'Occupancy, density and abundance, always current', 15, 65, null, 1],
      ['swarm', 'Detections', 'Every alert from the field network, streamed live', -10, -45, null, 1],
      ['base', 'Back to the sources', 'Alerts and reports return to the teams in the field', 15, -40, null, 1],
    ],
  },
];
const byId = Object.fromEntries(DEVICES.map(d => [d.id, d]));
const hex = (h) => '#' + h.toString(16).padStart(6, '0');

/* ── scene assembly ─────────────────────────────────────────────────────────── */

const world = createWorld($('#scene'));
const { camera, controls, root } = world;

const arcZ = (x) => 1.55 - .11 * x * x;
for (const d of DEVICES) {
  const g = BUILDERS[d.id](d.hue);
  const x = d.x, z = d.z ?? arcZ(d.x);
  g.position.set(x, 0, z);
  if (d.id !== 'ai') g.scale.setScalar(1.15);          // keep units readable in the wider arc
  g.rotation.y = Math.atan2(-x, 8.5 - z) * .9;
  g.userData.rotY0 = g.rotation.y;
  if (g.userData.float) { g.userData.baseY = .12; g.position.y = .12; }
  root.add(g);
  world.registerDevice(g);
  d.group = g;

  const plinth = world.makePlinth(d.hue, d.id === 'ai' ? .95 : .68);
  plinth.position.set(x, 0, z);
  root.add(plinth);
  d.plinth = plinth;

  // collect materials once for independent fading
  const std = [], add = [], glow = [], pulseSet = new Set(g.userData.pulse || []);
  g.traverse(o => {
    if (!o.material) return;
    const m = o.material;
    if (m.emissive !== undefined && (m.emissive.r || m.emissive.g || m.emissive.b)) {
      if (m.userData.base === undefined) m.userData.base = m.emissiveIntensity;
      if (m.userData.origBase === undefined) m.userData.origBase = m.userData.base;
      if (!glow.includes(m)) glow.push(m);
    }
    if (m.transparent && m.color && m.emissive === undefined) { if (m.userData.o0 === undefined) m.userData.o0 = m.opacity; add.push(m); }
    else if (m.color) {
      if (!m.userData.c0) m.userData.c0 = m.color.clone();
      if (m.envMapIntensity !== undefined && m.userData.e0 === undefined) m.userData.e0 = m.envMapIntensity;
      std.push(m);
    }
  });
  plinth.traverse(o => { if (o.material) { if (o.material.userData.o0 === undefined) o.material.userData.o0 = o.material.opacity; add.push(o.material); } });
  d.mats = { std, add, glow, pulseSet };
  d.dim = { v: 0 };
}

// data streams: each hardware unit → the Landseed AI core (catalogue view only)
const aiPos = new THREE.Vector3(byId.ai.x, 1.05, byId.ai.z ?? arcZ(0));
for (const d of DEVICES) {
  if (d.id === 'ai') continue;
  const from = new THREE.Vector3(d.x, .55, d.z ?? arcZ(d.x));
  world.makeStream(from, aiPos, d.hue);
}

/* ── labels: name plates under each unit + focused-device callouts ──────────── */

const labelsEl = $('#labels'), leadersEl = $('#leaders');
const tracked = [];   // {el, line, getPos(→Vector3), dev, kind}
const _v = new THREE.Vector3();

function addLabel(el, getPos, dev, kind, withLine = false) {
  labelsEl.appendChild(el);
  let line = null, dot = null;
  if (withLine) {
    line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '2.6');
    leadersEl.appendChild(line);
    leadersEl.appendChild(dot);
  }
  tracked.push({ el, line, dot, getPos, dev, kind });
}

for (const d of DEVICES) {
  const el = document.createElement('div');
  el.className = 'dlabel';
  el.style.setProperty('--fa', hex(d.hue));
  const plateName = d.id === 'ai' ? d.name : d.name.replace('Landseed ', '');
  el.innerHTML = `<span class="dn">${plateName}</span><span class="dp">${d.price}</span>`;
  el.addEventListener('click', () => goView(d.id));
  // plate anchor: the front edge of the plinth, so the plate reads BELOW the
  // unit — except Landseed AI, whose plate floats ABOVE the brain in clear sky
  const z = d.z ?? arcZ(d.x);
  let p;
  if (d.id === 'ai') { el.classList.add('up'); p = new THREE.Vector3(0, 1.8, z); }
  else p = new THREE.Vector3(d.x, 0, z + .68);
  addLabel(el, () => p, d, 'plate');
  d.plateEl = el;                                       // raycast hover lights the plate too

  d.calloutEls = d.callouts.map(([a, n, s, ox, oy, mode, noline]) => {
    const k = document.createElement('div');
    k.className = 'klabel';
    if (d.id === 'ai') k.classList.add('kw');           // the orb's floating notes get a wider plate
    k.style.setProperty('--fa', hex(d.hue));
    k.style.opacity = '0';
    k.innerHTML = `<span class="kn">${n}</span><span class="ks">${s}</span>`;
    k.__anchor = a;
    k.__off = [ox || 0, oy || 0];                       // hand-tuned nudge, applied after auto-layout
    k.__mode = mode || null;                            // 'above'/'below': place relative to the part, not the side columns
    k.__noline = !!noline;                              // the part's own beacon serves as the dot — no leader drawn
    const anchor = d.group.userData.anchors[a] ?? new THREE.Vector3();
    const getPos = () => _v.copy(anchor).applyMatrix4(d.group.matrixWorld);
    addLabel(k, getPos, d, 'callout', true);
    return k;
  });
}

const proj = new THREE.Vector3();
world.onTick = () => {
  if (!calloutsLive && !busy && current !== 'catalogue' && byId[current]) revealCallouts(byId[current]);
  const cols = { L: [], R: [] };     // visible callouts, decluttered per side
  const plates = [];                 // visible plates, decluttered by overlap
  for (const t of tracked) {
    const hidden = t.el.style.opacity === '0';
    if (hidden) { if (t.line) { t.line.style.opacity = '0'; t.dot.style.opacity = '0'; } continue; }
    proj.copy(t.getPos()).project(camera);
    const behind = proj.z > 1;
    t.el.style.display = behind ? 'none' : '';
    if (behind) { if (t.line) { t.line.style.opacity = '0'; t.dot.style.opacity = '0'; } continue; }
    const sx = (proj.x * .5 + .5) * innerWidth, sy = (-proj.y * .5 + .5) * innerHeight;
    if (t.kind === 'callout') {
      // the plate is frozen where layoutCallouts put it — only the anchor
      // dot and the leader line follow the part through the frame
      if (t.fx == null) { t.el.style.display = 'none'; if (t.line) { t.line.style.opacity = '0'; t.dot.style.opacity = '0'; } continue; }
      const rox = sx - (t.fax ?? sx), roy = sy - (t.fay ?? sy);
      const rlx = t.fx + rox, rly = t.fy + roy;
      t.el.style.left = rlx + 'px'; t.el.style.top = rly + 'px';
      t.dot.setAttribute('cx', sx); t.dot.setAttribute('cy', sy);
      const rw = t.el.offsetWidth, rh = t.el.offsetHeight;
      const rdx = sx - rlx, rdy = sy - rly;
      let X1 = sx, Y1 = sy, X2, Y2;
      if (Math.abs(rdx) >= Math.abs(rdy)) {
        X2 = rlx + Math.sign(rdx) * (rw / 2 + 2); Y2 = rly;
      } else {
        const rbt = Math.min(1, 1 / Math.max(Math.abs(rdx) / (rw / 2 + 4), Math.abs(rdy) / (rh / 2 + 4), 1e-6));
        X2 = rlx + rdx * rbt; Y2 = rly + rdy * rbt;
      }
      if (t.el.__noline === 2) {
        // a beacon hairline FLOATS: pulled off the glow at one end and short
        // of the words at the other — it points, it never touches
        const ldx = X2 - X1, ldy = Y2 - Y1, ll = Math.hypot(ldx, ldy) || 1;
        X1 += ldx / ll * 16; Y1 += ldy / ll * 16;
        X2 -= ldx / ll * 7; Y2 -= ldy / ll * 7;
      }
      t.line.setAttribute('x1', X1); t.line.setAttribute('y1', Y1);
      t.line.setAttribute('x2', X2); t.line.setAttribute('y2', Y2);
      // noline tiers: 1 = bare (the part IS the marker) · 2 = hairline to the
      // part's own beacon, no dot (the glow plays the dot's role)
      const vis = getComputedStyle(t.el).opacity;
      t.line.style.opacity = t.el.__noline === 1 ? '0' : vis;
      t.dot.style.opacity = t.el.__noline ? '0' : vis;
    } else {
      plates.push({ t, sx, sy, ly: sy, hw: t.el.offsetWidth / 2 + 8, h: t.el.offsetHeight + 6 });
    }
  }
  // every name sits centred under ITS device — x is never moved. The arc is
  // pure y: an even half-sine by device order, with just enough sag that
  // adjacent plates clear each other diagonally.
  plates.sort((a, b) => a.sx - b.sx);
  let cramped = false;
  const arc = plates.filter(pp => pp.t.dev.id !== 'ai');
  if (arc.length > 1) {
    const endY = Math.min(arc[0].sy, arc[arc.length - 1].sy);
    const spread = arc[arc.length - 1].sx - arc[0].sx;
    const sag = Math.min(Math.max(spread * .13, 54), 112);
    const base = Math.min(endY, innerHeight - 168 - sag);   // the whole arc shifts UP to fit — never shears flat
    arc.forEach((pp, i) => {
      const u = i / (arc.length - 1);
      pp.ly = base + sag * Math.sin(Math.PI * u);
    });
    if (innerHeight < 700) cramped = true;
    // the centre pair shares the arc's lowest tier — if their plates kiss,
    // micro-nudge them apart (bounded, so device alignment stays honest)
    for (let i = 1; i < arc.length; i++) {
      const a = arc[i - 1], b = arc[i];
      if (Math.abs(a.ly - b.ly) < Math.max(a.h, b.h) * .8) {
        const need = a.hw + b.hw + 8, gap = b.sx - a.sx;
        if (gap < need) {
          const shift = Math.min(34, (need - gap) / 2);
          a.sx -= shift; b.sx += shift;
        }
      }
    }
  }
  for (const p of plates) {
    p.sx = Math.max(p.hw + 10, Math.min(innerWidth - p.hw - 10, p.sx));
    p.ly = Math.min(p.ly ?? p.sy, innerHeight - 150);
    p.t.el.style.left = p.sx + 'px'; p.t.el.style.top = p.ly + 'px';
  }
  // not enough vertical room for stacked plates with descriptions —
  // drop to name + price everywhere and let the rows breathe
  if (cramped) document.body.classList.add('slim-plates');
};

// ── …and becomes a one-shot: computed once when the camera settles, so the
// plates never drag across the screen during a flight. Dots keep tracking.
// Landseed AI reads as a composed diagram: five leaderless notes at fixed
// stations ringing the orb. x is a fraction of the SAFE BAND between the left
// rail and the spec panel (so the ring holds at any window); y is viewport
// clock face: the brain at 12, then 2 · 4 · 8 · 10 around the orb
const AI_POS = { core: [.50, .12], shells: [.88, .27], swarm: [.88, .75], base: [.12, .75], rings: [.12, .27] };
function layoutCallouts(d) {
  const pv = new THREE.Vector3();
  pv.copy(d.group.position).setY(d.group.position.y + .5).project(camera);
  const cx = (pv.x * .5 + .5) * innerWidth;
  const cols = { L: [], R: [] };
  for (const t of tracked) {
    if (t.kind !== 'callout' || t.dev !== d) continue;
    pv.copy(t.getPos()).project(camera);
    if (pv.z > 1) { t.fx = null; continue; }
    const sx = (pv.x * .5 + .5) * innerWidth, sy = (-pv.y * .5 + .5) * innerHeight;
    (sx >= cx ? cols.R : cols.L).push({ t, sx, sy, ly: sy });
  }
  const off = Math.min(185, innerWidth * .135), GAP = 72;
  for (const side of ['L', 'R']) {
    const list = cols[side].sort((a, b) => a.sy - b.sy);
    for (const c of list) c.ly = Math.max(96, Math.min(innerHeight - 130, c.ly));  // anchors above the frame still get an on-screen label
    for (let i = 1; i < list.length; i++)
      if (list[i].ly - list[i - 1].ly < GAP) list[i].ly = list[i - 1].ly + GAP;
    for (const c of list) {
      const right = side === 'R';
      // keep plates out from under the side panels and screen edges
      const panelW = Math.min(356, innerWidth * .26) + 40;
      const kk = innerHeight / 860;                   // hand offsets authored on a ~860px-tall viewport
      const [odx, ody] = c.t.el.__off || [0, 0];
      const dx2 = odx * kk, dy2 = ody * kk;
      let lx, ly;
      const aip = d.id === 'ai' && AI_POS[c.t.el.__anchor];
      if (aip) {
        // the orb page is a composed diagram — no leaders, so the five notes
        // take fixed stations RINGED ON THE ORB: the band between the rail
        // cards sets the ring's width, the orb's own screen position sets its
        // centre, so orb and notes move as one grouped piece
        const hw = $('#howto').getBoundingClientRect(), sp = $('#specs').getBoundingClientRect();
        const bandW = ((sp.width ? sp.left : innerWidth) - 20) - ((hw.width ? hw.right : 0) + 20);
        const pv2 = _v.copy(d.group.position); pv2.y += 1; pv2.project(camera);
        const orbX = (pv2.x * .5 + .5) * innerWidth;
        lx = orbX + (aip[0] - .5) * bandW + dx2;
        ly = aip[1] * innerHeight + dy2;
      } else if (c.t.el.__mode === 'above' || c.t.el.__mode === 'below') {
        lx = c.sx + dx2;                                // straight over/under the part
        ly = Math.max(96, Math.min(innerHeight - 130, c.sy + (c.t.el.__mode === 'above' ? -84 : 84) * kk + dy2));
      } else {
        lx = Math.max(panelW + 135, Math.min(innerWidth - panelW - 135, c.sx + (right ? off : -off))) + dx2;
        ly = c.ly + dy2;
      }
      c.t.el.classList.toggle('kr', aip ? aip[0] < .4 : !right);
      c.t.el.classList.toggle('kc', (!!aip && aip[0] >= .4 && aip[0] <= .6) ||   // 12 o'clock reads centred —
        ((c.t.el.__mode === 'above' || c.t.el.__mode === 'below') && !c.t.el.__noline)); // and so does a plate on a vertical leader
      c.t.el.style.display = '';
      c.t.el.style.left = lx + 'px'; c.t.el.style.top = ly + 'px';
      const w = c.t.el.offsetWidth, h = c.t.el.offsetHeight;
      // the leader aims at the label's CENTRE and stops at its border:
      // wherever the label moves, the line rotates to lead to its middle
      const ddx = c.sx - lx, ddy = c.sy - ly;
      if (Math.abs(ddx) >= Math.abs(ddy)) {
        // side leader — pin to the text's near edge at mid-height; the text
        // always hugs that edge, so the line can never visibly detach
        c.t.line.setAttribute('x2', lx + Math.sign(ddx) * (w / 2 + 2));
        c.t.line.setAttribute('y2', ly);
      } else {
        const bt = Math.min(1, 1 / Math.max(Math.abs(ddx) / (w / 2 + 4), Math.abs(ddy) / (h / 2 + 4), 1e-6));
        c.t.line.setAttribute('x2', lx + ddx * bt);
        c.t.line.setAttribute('y2', ly + ddy * bt);
      }
      c.t.fx = lx; c.t.fy = ly;
      c.t.fax = c.sx; c.t.fay = c.sy;
    }
  }
}
function revealCallouts(d) {
  calloutsLive = true;
  layoutCallouts(d);
  d.calloutEls.forEach((k, i) => {
    k.style.transition = 'none';                        // gsap owns the entrance
    // opacity ONLY — never animate the transform: gsap bakes the % translate
    // into pixels at tween time, and any reflow mid-entrance (font swap)
    // renders the plate half a box off its leader until it snaps back
    k.style.transform = '';
    gsap.fromTo(k, { opacity: 0 }, { opacity: 1, duration: .55, delay: .1 + .09 * i, ease: 'power2.out', overwrite: true });
  });
}

/* ── the disappearing act — non-focused units leave the stage entirely ──────── */

function applyFade(d) {
  const k = d.dim.v;
  for (const m of d.mats.std) {
    m.color.copy(m.userData.c0).multiplyScalar(1 - .97 * k);
    if (m.userData.e0 !== undefined) m.envMapIntensity = m.userData.e0 * (1 - k);
  }
  for (const m of d.mats.add) m.opacity = m.userData.o0 * (1 - k);
  for (const m of d.mats.glow) {
    if (d.mats.pulseSet.has(m)) m.userData.base = m.userData.origBase * (1 - k);
    else m.emissiveIntensity = m.userData.origBase * (1 - k);
  }
}

function fadeDevice(d, show, dur = .8) {
  if (show) { d.group.visible = true; d.plinth.visible = true; }
  gsap.to(d.dim, {
    v: show ? 0 : 1, duration: dur, ease: 'power2.inOut', overwrite: true,
    onUpdate: () => applyFade(d),
    onComplete: () => { if (!show) { d.group.visible = false; d.plinth.visible = false; } },
  });
}

/* ── views: one catalogue + one per device (the virunga chip pattern) ───────── */

const CAT_CAM = { pos: new THREE.Vector3(-.4, 2.7, 8.1), tgt: new THREE.Vector3(-.4, .72, 0) };

// fit the whole arc — devices, plinths, name plates — into the free band
// between the caption (left) and the product-line key (right), whatever the
// window shape. Solves camera distance + lateral shift; no card ever covers a unit.
function fitCatalogue() {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const a = innerWidth / innerHeight;
  const capB = $('#caption').getBoundingClientRect();
  const legB = $('#plegend').getBoundingClientRect();
  const bandL = Math.min(capB.right, innerWidth * .45) + 30;
  const bandR = Math.max(Math.max(legB.left, bandL + 320), innerWidth * .55) - 30;
  const halfN = (bandR - bandL) / innerWidth;                       // NDC half-width of the band
  const cN = ((bandL + bandR) / 2 - innerWidth / 2) * 2 / innerWidth; // NDC centre of the band
  const worldHalf = 4.65;                                           // arc + plinths + plate margin
  const d = THREE.MathUtils.clamp(worldHalf / (halfN * t * a), 7.4, 12.5);
  const shift = -cN * d * t * a;
  // short windows get a steeper pitch, lifting the bay (and its plates) clear
  // of the chip bar so the plate rows have room to stagger
  const lift = Math.max(0, 780 - innerHeight) * .004;
  return {
    pos: new THREE.Vector3(shift, 2.7 + (d - 8.1) * .22 + lift, .8 + d),
    tgt: new THREE.Vector3(shift, .72 - lift * .3, 0),
  };
}

function deviceFrame(d) {
  const x = d.x, z = d.z ?? arcZ(d.x);
  const rotY = d.group.userData.rotY0 ?? d.group.rotation.y;
  // straight-on hero framing from the device's own front, a touch off-axis
  const front = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
  const side = new THREE.Vector3(front.z, 0, -front.x);
  if (Math.sign(side.x || 1) !== Math.sign(x || 1)) side.multiplyScalar(-1);
  const big = d.id === 'ai' || d.id === 'gateway';
  const ty = d.id === 'ai' ? 1.0 : .44;
  const dist = d.id === 'gateway' ? 2.2 : d.id === 'ai' ? 3.15 : big ? 2.5 : d.id === 'villageguard' ? 2.35 : 1.8;
  const pos = new THREE.Vector3(x, ty + .38, z)
    .addScaledVector(front, dist)
    .addScaledVector(side, dist * .28);
  const tgt = new THREE.Vector3(x, ty, z);
  // per-device frame pan: the battery box hangs off one side of each camera,
  // so the ensemble is re-centred — gateway right, monitor left, VG right
  const PAN = { gateway: .27, serengeti: -.12, villageguard: .1, ai: -.12 };
  if (PAN[d.id]) {
    pos.addScaledVector(side, PAN[d.id]);
    tgt.addScaledVector(side, PAN[d.id]);
  }
  return { pos, tgt };
}

let current = 'catalogue', busy = false, onSettle = null, calloutsLive = true;

function flyTo(pos, tgt, dur = 1.6, ease = 'power3.inOut') {
  busy = true;
  gsap.to(camera.position, { x: pos.x, y: pos.y, z: pos.z, duration: dur, ease, overwrite: true });
  gsap.to(controls.target, {
    x: tgt.x, y: tgt.y, z: tgt.z, duration: dur, ease, overwrite: true,
    onComplete: () => { busy = false; if (onSettle) { const f = onSettle; onSettle = null; f(); } },
  });
}

function setCaption(kicker, title, line, stats, links, hue) {
  const cap = $('#caption');
  cap.style.setProperty('--fa', hue ? hex(hue) : 'rgba(0,190,90,.6)');
  $('#cap-kicker').textContent = kicker;
  $('#cap-title').textContent = title;
  $('#cap-line').textContent = line;
  $('#cap-stats').innerHTML = stats.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
  $('#cap-links').innerHTML = '';
  for (const [txt, go] of links) {
    const b = document.createElement('button');
    b.className = 'cap-link'; b.textContent = txt;
    b.addEventListener('click', () => goView(go));
    $('#cap-links').appendChild(b);
  }
  cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
}

function fillPanels(d) {
  const fa = hex(d.hue);
  $('#specs').style.setProperty('--fa', fa);
  $('#howto').style.setProperty('--fa', fa);
  const badges = d.badges.map(b => `<span class="sp-badge">${b}</span>`).join('');
  const best = `<div class="sp-h">Best use</div><div class="sp-best">${d.best}</div>`;
  const keyRows = d.key.map(([k, v]) => `<div class="sp-row"><span>${k}</span><b>${v}</b></div>`).join('');
  const note = `<div class="sp-note">Landseed product-line introduction · July 2026 price sheet. Target prices are pre-launch.</div>`;
  if (d.scenarios) {
    // the scenarios are the marquee — they take the tall right panel;
    // the key record moves left, above the caption
    const consult = `<div class="sp-note">Every deployment starts with a connectivity consultation — the right mix is chosen before systems ship.</div>`;
    $('#specs-scroll').innerHTML = badges + best +
      `<div class="sp-h">A solution for every landscape</div>` +
      d.scenarios.map((c, i) => `<div class="sp-scen"><b>${i + 1} · ${c.n}<em>${c.t}</em></b><p>${c.d}</p></div>`).join('') + consult + note;
    $('#cap-how').innerHTML = `<div class="pan-h">Key specification</div>` + keyRows;
  } else {
    $('#specs-scroll').innerHTML = badges + best +
      `<div class="sp-h">Key specification</div>` + keyRows + note;
    $('#cap-how').innerHTML = `<div class="pan-h">How it works</div>` + d.how.map(([t, x], i) =>
      `<div class="sp-step"><i>${i + 1}</i><div><b>${t}</b><span>${x}</span></div></div>`).join('');
  }
}

// panels must never overlap the caption (left) or run past the chips (right):
// step through density tiers until everything fits the viewport
function fitPanels() {
  // the caption is the whole left rail: if its chain section can't fit,
  // it steps to the tight tier once, then scrolls — never scales, never hides
  const cap = $('#caption'), how = $('#cap-how');
  cap.classList.remove('tight');
  if (how.scrollHeight > how.clientHeight + 1) cap.classList.add('tight');
  // the specs card spans the same 64→78 rail as the caption; its content
  // steps down (tight, then mini), then scrolls inside the fixed card
  const sp = $('#specs'), sc = $('#specs-scroll');
  sp.classList.remove('tight', 'mini');
  if (sc.scrollHeight > sc.clientHeight + 1) sp.classList.add('tight');
  if (sc.scrollHeight > sc.clientHeight + 1) sp.classList.add('mini');
}
addEventListener('resize', () => {
  if (current !== 'catalogue') { fitPanels(); if (!busy && byId[current]) layoutCallouts(byId[current]); return; }
  document.body.classList.remove('slim-plates');       // re-earn descriptions if room returns
  const f = fitCatalogue();
  flyTo(f.pos, f.tgt, .8);
});

const CAT_LINE = 'Poaching, illegal logging and human-wildlife conflict drive the loss of the wild — and the tools meant to stop them have been expensive, blind, or disconnected. Landseed builds cameras that think before they transmit, a network that reaches any sky, and prices that deploy in numbers — all reporting to one brain.';

function goView(id, force = false) {
  if (force) busy = false;                              // the wordmark always brings you home
  if (busy && current !== id) return;
  if (!byId[id] && id !== 'catalogue') return;
  const prev = current; current = id;
  location.hash = id === 'catalogue' ? '' : id;

  document.querySelectorAll('#chapters .chip').forEach(b => b.classList.toggle('on', b.dataset.go === id));
  document.querySelectorAll('#plegend .wl-row.dv').forEach(r => r.classList.toggle('on', r.dataset.dev === id));

  if (id === 'catalogue') {
    $('#verb').classList.remove('show');
    controls.minDistance = 2.2;
    for (const d of DEVICES) fadeDevice(d, true);
    world.setStreamsVisible(true);
    world.setGridDim(false);
    onSettle = null; calloutsLive = true;
    for (const t of tracked) { if (t.kind === 'plate') t.el.style.opacity = ''; else { t.el.style.opacity = '0'; t.fx = null; gsap.killTweensOf(t.el); } }
    $('#plegend').classList.add('show');
    $('#specs').classList.remove('show');
    document.body.classList.remove('devview');
    $('#cap-how').innerHTML = '';
    setCaption('The product line', 'Landseed Hardware',
      CAT_LINE,
      [['7', 'products'], ['$50–299', 'hardware'], ['30 s', 'fastest alert'], ['>12 mo', 'battery']],
      [['Begin the tour → Monitor', 'serengeti']], null);
    $('#caption').classList.remove('stack2');
    requestAnimationFrame(() => {                       // measure cards, then frame the bay
      const f = fitCatalogue();
      flyTo(f.pos, f.tgt, prev === 'catalogue' ? 1.2 : 1.7);
    });
    return;
  }

  const d = byId[id];
  $('#hint').classList.add('gone');
  const f = deviceFrame(d);
  flyTo(f.pos, f.tgt, 1.7);
  controls.minDistance = .9;
  for (const x of DEVICES) fadeDevice(x, x === d);
  world.setStreamsVisible(false);
  world.setGridDim(true);
  const verb = $('#verb');
  verb.textContent = d.kicker.split('·')[0].trim();
  verb.classList.add('show');
  for (const t of tracked) {
    if (t.kind === 'plate') t.el.style.opacity = '0';
    else { t.el.style.opacity = '0'; t.fx = null; gsap.killTweensOf(t.el); }
  }
  calloutsLive = false;                                 // the tick reveals once the flight has settled
  $('#plegend').classList.remove('show');
  $('#specs').classList.add('show');
  document.body.classList.add('devview');   // the caption becomes the full left rail
  fillPanels(d);

  const i = DEVICES.indexOf(d), next = DEVICES[(i + 1) % DEVICES.length];
  const nextName = next.id === 'ai' ? next.name : next.name.replace('Landseed ', '');
  const links = [['← Catalogue', 'catalogue'], [`Next · ${nextName} →`, next.id]];
  setCaption(d.kicker, d.name, d.line, d.stats, links, d.hue);
  requestAnimationFrame(fitPanels);
}

/* ── input: chips, legend rows, raycast hover/click, keys, hash ─────────────── */

document.querySelectorAll('#chapters .chip').forEach(b => b.addEventListener('click', () => goView(b.dataset.go)));
document.querySelectorAll('#plegend .wl-row.dv').forEach(r => {
  r.style.setProperty('--fa', hex(byId[r.dataset.dev].hue));
  r.addEventListener('click', () => goView(r.dataset.dev));
});

const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hovered = null, downAt = 0, downXY = [0, 0];

function pick(e) {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  for (const d of DEVICES) {
    if (!d.group.visible) continue;
    if (ray.intersectObject(d.group, true).length) return d;
  }
  return null;
}
addEventListener('pointermove', (e) => {
  const onScene = e.target === $('#scene');
  if (!onScene) $('#scene').classList.remove('pointing');
  const d = onScene && current === 'catalogue' ? pick(e) : null;
  if (onScene) $('#scene').classList.toggle('pointing', !!d);
  if (hovered !== d) {
    if (hovered && current === 'catalogue') {
      gsap.to(hovered.plinth.userData.ring.material, { opacity: .8, duration: .3 });
      hovered.plateEl?.classList.remove('hl');
    }
    hovered = d;
    if (d) {
      gsap.to(d.plinth.userData.ring.material, { opacity: 1, duration: .2 });
      d.plateEl?.classList.add('hl');
    }
  }
});
addEventListener('pointerdown', (e) => { downAt = performance.now(); downXY = [e.clientX, e.clientY]; });
addEventListener('pointerup', (e) => {
  if (e.target !== $('#scene')) return;
  if (performance.now() - downAt > 300) return;                                   // it was a drag
  if (Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 7) return;
  const d = pick(e);
  if (d && current === 'catalogue') goView(d.id);
  $('#hint').classList.add('gone');
});
addEventListener('pointerdown', () => $('#hint').classList.add('gone'), { once: true });

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return goView('catalogue');
  const order = ['catalogue', ...DEVICES.map(d => d.id)];
  const i = order.indexOf(current);
  if (e.key === 'ArrowRight') goView(order[(i + 1) % order.length]);
  if (e.key === 'ArrowLeft') goView(order[(i - 1 + order.length) % order.length]);
});

/* ── boot: loader off, opening flight, chrome in ────────────────────────────── */

// debug/automation handle (same convention as the virunga viz's __virunga)
const brandHome = document.getElementById('brand-home');
if (brandHome) brandHome.addEventListener('click', (e) => { e.preventDefault(); goView('catalogue', true); });

window.__hw = { world, camera, controls, goView, DEVICES, layoutCallouts, revealCallouts, get current() { return current; } };

world.start();

const startId = (() => {
  let h = location.hash.slice(1);
  if (h === 'shaman') h = 'ai';                        // legacy deep-links
  return byId[h] ? h : 'catalogue';
})();

// opening: high and far, then the settle into the bay
camera.position.set(0, 6.8, 12.8);
controls.target.set(0, .72, 0);

requestAnimationFrame(() => requestAnimationFrame(() => {
  const loader = $('#loader');
  gsap.to(loader, { opacity: 0, duration: .7, delay: .25, onComplete: () => loader.remove() });
  setTimeout(() => {
    document.body.classList.remove('booting');
    goView(startId);
    if (startId === 'catalogue') $('#plegend').classList.add('show');
  }, 550);
  setTimeout(() => $('#hint').classList.add('gone'), 7000);
}));
