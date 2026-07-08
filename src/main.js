// ── main.js — the catalogue: product data, views, chips, callouts, spec rail ──
// Layout & pagination follow the Virunga viz: bottom chapter chips, caption card
// bottom-left, one right-rail card, labels pinned to the scene. Clicking a device
// clears the bay — every other unit vanishes and the chosen one takes the stage.

import * as THREE from 'three';
import { createWorld } from './world.js?v=2';
import { BUILDERS } from './devices.js?v=3';

const $ = (s) => document.querySelector(s);

/* ── the product line — facts from the Landseed product-line introduction &
      July 2026 price sheet (canonical). Narrative structure follows the field
      literature: how it works, deployment craft, a connectivity answer for
      every landscape. "target" = pre-launch pricing. ─────────────────────── */

const DEVICES = [
  {
    id: 'serengeti', name: 'Landseed Serengeti', kicker: 'To see · Park protection',
    hue: 0x00FF64, price: '$199–225', x: -3.1,
    line: 'The smallest, lowest-power AI camera-alert system on the market — built to be everywhere. In large parks, many low-cost sensors beat a few expensive ones: detections by earlier versions led to the arrest of 20 individuals from 13 poaching gangs, beginning in the Serengeti in 2017, then in six more countries.',
    stats: [['$199–225', 'per unit'], ['200 ms', 'first capture'], ['30 s', 'alert via cell'], ['>12 mo', 'battery']],
    badges: ['$199–225 / unit', 'available Sept 2026', 'LoRa · 2 variants'],
    best: 'One or two detection classes on the most affordable computer-vision chip made: humans, vehicles, boats, logging trucks — or a single conflict species. Best within ~9 m of the subject. For multi-species models, see VillageGuard or Jungle-Wallah.',
    how: [
      ['Wake', 'A passive-infrared trigger holds the camera at 5–10 µA until something moves — then 200 ms to a usable image.'],
      ['Think', 'The detector runs on the camera itself. Empty frames and false triggers die here, never spending airtime or battery.'],
      ['Shrink', 'The area of interest is cropped and compressed on the edge, so every transmitted image is as small as possible.'],
      ['Send', 'Direct to a cell tower where coverage exists — image in ~30 seconds — or by long-range radio to a Landseed Gateway, then satellite.'],
      ['Respond', 'The alert lands in Shaman and on rangers’ phones. Response teams move before the loss, not after it.'],
    ],
    field: [
      'Place at chokepoints on actively used trails, with cover on both sides',
      'Avoid pointing into low east–west sun — direct glare breeds false triggers',
      'Small enough to hide above eye level; camouflage the head and cables with local detritus',
      'Practice makes a deployment a ten-minute stop: test in setup mode, arm, erase your footprints',
      'Alert threshold is tunable — favour zero missed intruders, or fewer false alarms',
    ],
    features: [
      'Lowest-cost AI-embedded camera on the market — priced beside trail cams that can’t think or transmit',
      'Very fast capture and reset — 200 ms to first image, re-trigger < 1 s',
      'Good low-light performance, IR illumination without a visible flash',
      'Battery life > 12 months on the external pack',
      'Real-time alerts where there is no cell network at all',
      'Every detection lands in Landseed Shaman',
    ],
    specs: [
      ['System hardware', [['VPU', 'Himax'], ['Power', 'LiFePO4 3.3 V + expandable pack'], ['Image sensor', 'Sub-megapixel'], ['Illuminator', 'IR'], ['Storage', 'microSD']]],
      ['Operation', [['First capture', '200 ms'], ['Re-trigger', '< 1 s, programmable'], ['Detection range', 'up to 9 m'], ['Quiescent draw', '5–10 µA']]],
      ['Environment', [['Enclosure', 'IP67+ · camouflaged'], ['Temperature', '−20 to +60 °C'], ['Humidity', '0–90 % RH'], ['Durability', '14 days underwater, transmitting']]],
      ['Connectivity', [['Cellular', 'LTE'], ['Radio', 'LoRa 433 / 865–915 MHz'], ['Wi-Fi', 'Long-range'], ['Satellite', 'Starlink · Viasat · direct-to-cell']]],
      ['AI model', [['Classes', 'Humans, vehicles, 1–2 species']]],
    ],
    callouts: [
      ['lens', 'Optics', 'Sub-megapixel low-light sensor · 200 ms to first image'],
      ['ir', 'IR illuminator', 'Sees at night, shows nothing'],
      ['antenna', 'Long-range radio', 'LoRa · LTE · satellite backhaul'],
      ['pir', 'PIR trigger', '5–10 µA asleep · re-trigger < 1 s'],
      ['battery', 'LiFePO4 pack', 'External, expandable · > 12 months'],
      ['shell', 'Camo shell', 'IP67+ · 14 days underwater in testing'],
    ],
  },
  {
    id: 'villageguard', name: 'Landseed VillageGuard', kicker: 'To see · Coexistence',
    hue: 0xFFC800, price: '$299', x: -1.85,
    line: 'Turning conflict into coexistence. When predators and mega-herbivores leave the parks for villages, VillageGuard gives rangers, forest guards and village protection units the early alert that prevents the loss — of crops, livestock, lives, and the animal that would be killed in retaliation.',
    stats: [['$299', 'per unit'], ['8–10', 'object classes'], ['15 m', 'detection range'], ['<1 KB', 'alert image']],
    badges: ['$299 / unit', 'LTE + 2 LoRa variants', '8–10 classes'],
    best: 'Multi-species detection at the village edge — elephant, tiger, lion, bear and more in a single model, plus humans and vehicles, with direct-to-cell where available.',
    how: [
      ['Wake', 'PIR trigger, 200 ms to first image, 2-megapixel low-light optics.'],
      ['Think', 'The STM32N6 runs a detector with 8–10 object classes at once — one camera watches for every species on your conflict list.'],
      ['Shrink', 'On-edge auto-encoding can compress an alert image below 1 KB — small enough to ride LoRa anywhere.'],
      ['Send', 'LTE or direct-to-cell where the sky allows; long-range radio to a Gateway everywhere else.'],
      ['Respond', 'The village protection unit gets the elephant’s name before it reaches the field.'],
    ],
    field: [
      'Ring the village approaches and crop-raiding corridors, not just the park boundary',
      'One unit per corridor: a single multi-class model replaces a rack of single-species cameras',
      'Pair alerts with response drills — early warning only works when someone moves on it',
      'Alert threshold is tunable per site — miss nothing, or wake no one without cause',
    ],
    features: [
      'Runs more powerful detectors than Serengeti — up to 8–10 object classes in one model',
      '2-megapixel sensor with strong low-light performance',
      '200 ms first capture · < 1 s re-trigger · 5–10 µA quiescent',
      'Edge auto-encoding shrinks an alert image below 1 KB for LoRa',
      'Compact IP67 build · battery > 12 months',
      'Every detection lands in Landseed Shaman',
    ],
    specs: [
      ['System hardware', [['VPU', 'STM32N6'], ['Power', 'LiFePO4 3.3 V + expandable pack'], ['Image sensor', '2 MP'], ['Illuminator', 'IR'], ['Storage', 'microSD']]],
      ['Operation', [['First capture', '200 ms'], ['Re-trigger', '< 1 s, programmable'], ['Detection range', 'up to 15 m']]],
      ['Environment', [['Enclosure', 'IP67+ · camouflaged'], ['Temperature', '−20 to +60 °C'], ['Humidity', '0–90 % RH'], ['Durability', '14 days underwater, transmitting']]],
      ['Connectivity', [['Cellular', 'LTE / direct-to-cell'], ['Radio', 'LoRa 433 / 865–915 MHz'], ['Wi-Fi', 'Long-range'], ['Satellite', 'Starlink · Viasat']]],
      ['AI model', [['Classes', 'Up to 8–10 in a single detector']]],
    ],
    callouts: [
      ['lens', 'Optics', '2 MP sensor · 15 m detection range'],
      ['ir', 'Dual IR array', 'Night work at the village edge'],
      ['vpu', 'STM32N6 VPU', '8–10 object classes on the edge'],
      ['antenna', 'Twin radios', 'LoRa + LTE / direct-to-cell'],
      ['battery', 'LiFePO4 pack', 'External, expandable · > 12 months'],
    ],
  },
  {
    id: 'gateway', name: 'Landseed Gateway', kicker: 'To connect · The hub',
    hue: 0x32C8FF, price: '$150 target', x: -.62,
    line: 'Most of the world’s protected areas have no cell signal — so there is a connectivity answer for every park. The Gateway takes long-range radio from a constellation of cameras and hands it to whatever sky is available, so one airtime bill serves every sensor on the hill.',
    stats: [['$150', 'target / unit'], ['1', 'hub, many cameras'], ['5', 'landscape scenarios'], ['>12 mo', 'battery + solar']],
    badges: ['$150 target', 'LoRa · LTE · Starlink · Viasat'],
    best: 'Anywhere beyond the towers. Cameras in cell range transmit direct and need no Gateway; everywhere else, this is the bridge — placed in a village, on a ridge, on a tower, or under open sky.',
    scenarios: [
      { n: 'Reliable cell at the camera', d: 'No gateway needed — the camera’s own LTE unit transmits straight to the tower.', t: 'image in ~30 s' },
      { n: 'Cell nearby, not at the camera', d: 'Cameras reach the Gateway by LoRa; the Gateway sits in a village or on a ridge within tower range and relays by cell.', t: 'image in minutes' },
      { n: 'A powered tower in the park', d: 'On LoRaWAN or radio towers with mains power and internet, the Gateway joins by Wi-Fi or ethernet — no satellite modem at all.', t: 'image in minutes' },
      { n: 'No cell, open terrain', d: 'The Gateway uplinks by satellite — Starlink Mini, Viasat, or direct-to-cell where available.', t: 'image in minutes' },
      { n: 'No cell, closed canopy', d: 'Cameras under the forest hop by LoRa to a Gateway placed kilometres away under open sky; many cameras share one uplink.', t: 'image in minutes' },
    ],
    how: [
      ['Sleep', 'The Gateway rests in deep sleep, listening in micro-amp sips, until the first camera signal arrives.'],
      ['Receive', 'LoRa packets come in from every camera on the hill — a free protocol, at your country’s legal frequency (433 or 865–915 MHz).'],
      ['Reassemble', 'Image packets are stored and forwarded — rebuilt and handed to the strongest available uplink.'],
      ['Relay', 'Cell, Starlink Mini, Viasat, direct-to-cell, or a tower’s own internet. One bill, amortised across every camera.'],
    ],
    features: [
      'Low-cost multipurpose communications unit',
      'Deep-sleep radio wakes on the first signal from a camera',
      'One gateway amortises airtime across many dispersed cameras',
      'Drops onto a LoRaWAN tower over Wi-Fi or ethernet',
      'Battery > 12 months — indefinitely with the solar array',
      'Fits in a small IP67 case',
    ],
    specs: [
      ['System hardware', [['Modems', 'LoRa · LTE / direct-to-cell · Starlink Mini · Viasat'], ['Power', 'LiFePO4 + expandable pack · solar']]],
      ['Operation', [['Wake', 'Deep sleep until first camera signal'], ['Throughput', 'Multi-KB image in 1–several min'], ['Fan-in', 'Many cameras per gateway']]],
      ['Environment', [['Enclosure', 'IP67+ · camouflaged'], ['Temperature', '−20 to +60 °C'], ['Humidity', '0–90 % RH'], ['Durability', 'Conformal-coated boards']]],
    ],
    callouts: [
      ['lora', 'LoRa mast', 'Free-protocol long-range radio, per-country frequency'],
      ['lte', 'LTE / direct-to-cell', 'Uses the towers when they exist'],
      ['solar', 'Solar endurance', '> 12 months, indefinitely with sun'],
      ['io', 'Sealed I/O', 'Starlink Mini · Viasat · ethernet'],
      ['case', 'Field case', 'IP67 · fits in a daypack'],
    ],
  },
  {
    id: 'junglewallah', name: 'Landseed Jungle-Wallah', kicker: 'To see & listen · Biodiversity',
    hue: 0xFF8C42, price: 'custom', x: .62,
    line: 'Biodiversity monitoring without the paralysis: pick the few species that tell you the most about a landscape for the least cost, then watch and listen for exactly those. VillageGuard optics carrying bespoke species models, joined to an acoustic pod.',
    stats: [['optical', '+ acoustic'], ['custom', 'species models'], ['Wi-Fi / SD', 'collection'], ['Shaman', 'analytics']],
    badges: ['custom builds', 'per-landscape AI', 'spec sheet in development'],
    best: 'Long-term biodiversity plots where real-time isn’t required — data comes home over Wi-Fi or on the microSD card, and density falls out of re-identification and triangulation in Shaman.',
    how: [
      ['Choose', 'Landseed helps identify the indicator species of your landscape — the few that say the most.'],
      ['Watch & listen', 'A bespoke multi-species detector on VillageGuard optics, with the acoustic pod catching what never crosses the frame.'],
      ['Collect', 'No airtime needed: harvest over Wi-Fi on a patrol pass, or swap the microSD card.'],
      ['Understand', 'Shaman turns detections into presence, occupancy, density and abundance — by re-identifying individuals and triangulating calls.'],
    ],
    field: [
      'Grid the plot to your species’ home ranges, not to round numbers',
      'Pair with Landseed Wolf arrays where the canopy hides more than it shows',
      'No real-time pressure means no gateway required — batteries go further',
    ],
    features: [
      'VillageGuard camera platform with landscape-specific species detectors',
      'Individual re-identification server-side for density and abundance',
      'Stereo-vision and acoustic triangulation options through Shaman',
      'No-airtime operation: collect over Wi-Fi or from the microSD card',
      'Pairs with Landseed Wolf for the full see-and-listen array',
    ],
    specs: [
      ['Configuration', [['Platform', 'VillageGuard hardware'], ['AI', 'Custom species models per landscape'], ['Acoustics', 'Companion pod / Landseed Wolf'], ['Collection', 'Wi-Fi · microSD · optional radio']]],
      ['Status', [['Spec sheet', 'In development'], ['Analytics', 'Re-ID · stereo triangulation via Shaman']]],
    ],
    callouts: [
      ['lens', 'Optics', 'VillageGuard 2 MP platform'],
      ['pod', 'Acoustic pod', 'The listening half of the survey'],
      ['ai', 'Bespoke models', 'The key species of your landscape'],
      ['wifi', 'Wi-Fi offload', 'No airtime required'],
    ],
  },
  {
    id: 'wolf', name: 'Landseed Wolf', kicker: 'To listen · Bio-acoustics',
    hue: 0xE682E6, price: '$100 target', x: 1.85,
    line: 'The forest is louder than it looks. Wolf hears what cameras never frame — presence and absence from vocalisations, and with three units triangulating, the distance and density of the animals doing the calling.',
    stats: [['$100', 'target / unit'], ['24/7', 'listening'], ['3+', 'units triangulate'], ['Shaman', 'analytics']],
    badges: ['$100 target', 'single variant', 'spec sheet in development'],
    best: 'Vocal species and vast dark forests: presence/absence surveys, and distance-to-call via triangulation across an array.',
    how: [
      ['Listen', 'A passive acoustic monitor holds watch around the clock — no trigger needed, no line of sight.'],
      ['Detect', 'Call recognition picks your species’ voices out of the forest’s noise.'],
      ['Triangulate', 'Three or more units turn the same call into a bearing, a distance, a place on the map.'],
      ['Count', 'Shaman converts calling rates and positions into density and abundance.'],
    ],
    features: [
      'Passive acoustic monitor for vocalising wildlife',
      'Presence / absence from call detection',
      'Distance and density via multi-unit triangulation in Shaman',
      'Deploys beside Jungle-Wallah for combined optical-acoustic surveys',
    ],
    specs: [
      ['Configuration', [['Function', 'Acoustic detection'], ['Array', '3+ units for triangulation'], ['Analytics', 'Landseed Shaman']]],
      ['Status', [['Spec sheet', 'In development']]],
    ],
    callouts: [
      ['grille', 'Open grille', 'Weatherproof acoustic window'],
      ['mic', 'Mic crown', 'Omnidirectional, canopy-aimed'],
      ['core', 'Detector', 'Call recognition on the edge'],
      ['base', 'Status', 'Months on a charge'],
    ],
  },
  {
    id: 'mobile', name: 'Landseed Mobile', kicker: 'To report · Human in the loop',
    hue: 0x1482FF, price: '$50 target', x: 3.1,
    line: 'The cheapest sensor is a person who knows what they’re looking at. Mobile is the early-warning camera for informants and undercover guards — no AI, no motion trigger, no infrared. A human sees the elephant, or the poacher, frames it, and the network does the rest.',
    stats: [['$50', 'target / unit'], ['0', 'AI — by design'], ['human', 'triggered'], ['daylight', 'optics']],
    badges: ['$50 target', 'no AI · no PIR', 'informant networks'],
    best: 'Community early-warning: elephants or predators approaching a village, or intelligence from inside — transmitted over the same Landseed network into Shaman.',
    how: [
      ['See', 'A person who knows the trail, the herd, or the gang notices what a camera might not.'],
      ['Frame', 'One key: point, confirm, done. Usable under pressure, unremarkable in a pocket.'],
      ['Send', 'The report rides the same network as every automated alert — cell or Gateway.'],
      ['Act', 'In Shaman, a human report sits beside the machine detections it corroborates.'],
    ],
    features: [
      'Handheld capture-and-transmit camera for the human sensor network',
      'No AI and no PIR needed — the operator is the detector',
      'Daylight use: no light meter, no IR illuminator, so the cost stays at $50',
      'Reports land in Shaman beside every automated detection',
    ],
    specs: [
      ['Configuration', [['Trigger', 'Human operator'], ['AI', 'None — by design'], ['Optics', 'Daylight, no IR'], ['Role', 'Informants · undercover guards · village early warning']]],
    ],
    callouts: [
      ['screen', 'Report screen', 'Frame, confirm, transmit'],
      ['eye', 'Daylight camera', 'No IR, no meter — $50 stays $50'],
      ['shutter', 'One key', 'Usable under pressure'],
      ['body', 'Rugged slab', 'Pocketable, unremarkable'],
    ],
  },
  {
    id: 'shaman', name: 'Landseed Shaman', kicker: 'To understand · The platform brain',
    hue: 0x9B6CE0, price: 'subscription', x: 0, z: -1.9,
    line: 'Every sensor you just met reports here. Shaman — the CTDAMS, Landseed’s analytics brain — fuses optical, acoustic and remotely-sensed data into presence, occupancy, density and abundance, and writes the measurement layer for Earth Credits.',
    stats: [['1', 'brain, all sensors'], ['4', 'population metrics'], ['auto', 'reporting'], ['Earth', 'Credits layer']],
    badges: ['subscription', 'standalone or bundled', 'bespoke builds'],
    best: 'Sold as a package with the hardware or standalone; annual updates, with bespoke versions built to a programme’s needs.',
    how: [
      ['Ingest', 'Camera detections, acoustic hits, human reports and satellite feeds arrive in one aggregator.'],
      ['Fuse', 'Optical, acoustic and remotely-sensed layers are read together — a full picture of current conditions.'],
      ['Estimate', 'Presence, occupancy, density and abundance of target species, from re-identification and triangulation.'],
      ['Deliver', 'Alerts go to phones and operations rooms as they happen; automated reports go to the programme and the registry.'],
    ],
    field: [
      'Alerts reach designated staff wherever they are — phone, email, or an operations-room display',
      'Roadmap: monocular distance estimation to turn detections into densities',
      'Roadmap: acoustic triangulation, and a stereo camera for distance sampling without reference videos',
    ],
    features: [
      'Single aggregator for camera, acoustic, human-report and satellite data',
      'Estimates presence, occupancy, density and abundance of target species',
      'Automated reporting and insight — signal, not noise',
      'The measurement layer for Landseed’s Earth Credits programme',
      'Bespoke versions built to a programme’s needs',
    ],
    specs: [
      ['Inputs', [['Optical', 'Serengeti · VillageGuard · Jungle-Wallah · Mobile'], ['Acoustic', 'Wolf arrays'], ['Remote sensing', 'Satellite feeds']]],
      ['Outputs', [['Metrics', 'Presence · occupancy · density · abundance'], ['Reporting', 'Automated'], ['Programme', 'Earth Credits measurement layer']]],
      ['Delivery', [['Model', 'Subscription, annual updates'], ['Form', 'Package or standalone · bespoke builds']]],
    ],
    callouts: [
      ['core', 'The brain', 'CTDAMS — every sensor, one aggregator'],
      ['shells', 'Fusion layers', 'Optical · acoustic · satellite'],
      ['rings', 'Analytics', 'Occupancy, density, abundance'],
      ['swarm', 'Detections', 'Live from the field network'],
    ],
  },
];
const byId = Object.fromEntries(DEVICES.map(d => [d.id, d]));
const hex = (h) => '#' + h.toString(16).padStart(6, '0');

/* ── scene assembly ─────────────────────────────────────────────────────────── */

const world = createWorld($('#scene'));
const { camera, controls, root } = world;

const arcZ = (x) => 1.55 - .155 * x * x;
for (const d of DEVICES) {
  const g = BUILDERS[d.id](d.hue);
  const x = d.x, z = d.z ?? arcZ(d.x);
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(-x, 8.5 - z) * .9;
  g.userData.rotY0 = g.rotation.y;
  if (g.userData.float) { g.userData.baseY = .12; g.position.y = .12; }
  root.add(g);
  world.registerDevice(g);
  d.group = g;

  const plinth = world.makePlinth(d.hue, d.id === 'shaman' ? .95 : .68);
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

// data streams: each hardware unit → the Shaman core (catalogue view only)
const shamanPos = new THREE.Vector3(byId.shaman.x, 1.05, byId.shaman.z ?? arcZ(0));
for (const d of DEVICES) {
  if (d.id === 'shaman') continue;
  const from = new THREE.Vector3(d.x, .55, d.z ?? arcZ(d.x));
  world.makeStream(from, shamanPos, d.hue);
}

/* ── labels: catalogue name plates + focused-device callouts ────────────────── */

const labelsEl = $('#labels'), leadersEl = $('#leaders');
const tracked = [];   // {el, line, getPos(→Vector3), dev, kind}
const _v = new THREE.Vector3();

function addLabel(el, getPos, dev, kind, withLine = false) {
  labelsEl.appendChild(el);
  let line = null;
  if (withLine) {
    line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leadersEl.appendChild(line);
  }
  tracked.push({ el, line, getPos, dev, kind });
}

for (const d of DEVICES) {
  const el = document.createElement('div');
  el.className = 'dlabel';
  el.style.setProperty('--fa', hex(d.hue));
  el.innerHTML = `<span class="dn">${d.name.replace('Landseed ', '')}</span><span class="dp">${d.price}</span><span class="ddot"></span>`;
  el.addEventListener('click', () => goView(d.id));
  const p = new THREE.Vector3(d.x, d.group.userData.labelY + .28, d.z ?? arcZ(d.x));
  addLabel(el, () => p, d, 'plate');

  d.calloutEls = d.callouts.map(([a, n, s]) => {
    const k = document.createElement('div');
    k.className = 'klabel';
    k.style.setProperty('--fa', hex(d.hue));
    k.style.opacity = '0';
    k.innerHTML = `<span class="kn">${n}</span><span class="ks">${s}</span>`;
    const anchor = d.group.userData.anchors[a] ?? new THREE.Vector3();
    const getPos = () => _v.copy(anchor).applyMatrix4(d.group.matrixWorld);
    addLabel(k, getPos, d, 'callout', true);
    return k;
  });
}

const proj = new THREE.Vector3();
world.onTick = () => {
  const cols = { L: [], R: [] };     // visible callouts, decluttered per side
  for (const t of tracked) {
    const hidden = t.el.style.opacity === '0';
    if (hidden) { if (t.line) t.line.style.opacity = '0'; continue; }
    proj.copy(t.getPos()).project(camera);
    const behind = proj.z > 1;
    t.el.style.display = behind ? 'none' : '';
    if (behind) { if (t.line) t.line.style.opacity = '0'; continue; }
    const sx = (proj.x * .5 + .5) * innerWidth, sy = (-proj.y * .5 + .5) * innerHeight;
    if (t.kind === 'callout') {
      proj.copy(t.dev.group.position).setY(t.dev.group.position.y + .5).project(camera);
      const cx = (proj.x * .5 + .5) * innerWidth;
      const right = sx >= cx;
      (right ? cols.R : cols.L).push({ t, sx, sy, ly: sy });
    } else {
      t.el.style.left = sx + 'px'; t.el.style.top = sy + 'px';
    }
  }
  const off = Math.min(170, innerWidth * .13), GAP = 50;
  for (const side of ['L', 'R']) {
    const list = cols[side].sort((a, b) => a.sy - b.sy);
    for (let i = 1; i < list.length; i++)
      if (list[i].ly - list[i - 1].ly < GAP) list[i].ly = list[i - 1].ly + GAP;
    for (const c of list) {
      const right = side === 'R';
      const lx = c.sx + (right ? off : -off);
      c.t.el.classList.toggle('kr', !right);
      c.t.el.style.left = lx + 'px'; c.t.el.style.top = c.ly + 'px';
      if (c.t.line) {
        const w = c.t.el.offsetWidth;
        c.t.line.setAttribute('x1', c.sx); c.t.line.setAttribute('y1', c.sy);
        c.t.line.setAttribute('x2', lx + (right ? -w / 2 - 8 : w / 2 + 8)); c.t.line.setAttribute('y2', c.ly);
        c.t.line.style.opacity = c.t.el.style.opacity;
      }
    }
  }
};

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

const CAT_CAM = { pos: new THREE.Vector3(0, 2.7, 8.1), tgt: new THREE.Vector3(0, .72, 0) };

function deviceFrame(d) {
  const x = d.x, z = d.z ?? arcZ(d.x);
  const rotY = d.group.userData.rotY0 ?? d.group.rotation.y;
  // straight-on hero framing from the device's own front, a touch off-axis
  const front = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
  const side = new THREE.Vector3(front.z, 0, -front.x);
  if (Math.sign(side.x || 1) !== Math.sign(x || 1)) side.multiplyScalar(-1);
  const big = d.id === 'shaman' || d.id === 'gateway';
  const ty = d.id === 'shaman' ? 1.0 : .44;
  const dist = big ? 2.5 : 1.8;
  const pos = new THREE.Vector3(x, ty + .38, z)
    .addScaledVector(front, dist)
    .addScaledVector(side, dist * .28);
  return { pos, tgt: new THREE.Vector3(x, ty, z) };
}

let current = 'catalogue', busy = false, turntable = null;

function startTurntable(d) {
  stopTurntable();
  const g = d.group;
  turntable = gsap.to(g.rotation, { y: '+=6.28318', duration: 52, repeat: -1, ease: 'none', delay: 2.2 });
  turntable.dev = d;
}
function stopTurntable() {
  if (!turntable) return;
  const g = turntable.dev.group;
  turntable.kill();
  gsap.to(g.rotation, { y: g.userData.rotY0, duration: 1.2, ease: 'power2.inOut', overwrite: true });
  turntable = null;
}

function flyTo(pos, tgt, dur = 1.6, ease = 'power3.inOut') {
  busy = true;
  gsap.to(camera.position, { x: pos.x, y: pos.y, z: pos.z, duration: dur, ease, overwrite: true });
  gsap.to(controls.target, {
    x: tgt.x, y: tgt.y, z: tgt.z, duration: dur, ease, overwrite: true,
    onComplete: () => { busy = false; },
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

function fillSpecs(d) {
  const s = $('#specs-scroll');
  $('#specs').style.setProperty('--fa', hex(d.hue));
  let h = d.badges.map(b => `<span class="sp-badge">${b}</span>`).join('');
  h += `<div class="sp-h">Best use</div><div class="sp-best">${d.best}</div>`;
  if (d.scenarios) {
    h += `<div class="sp-h">A solution for every landscape</div>` + d.scenarios.map((c, i) =>
      `<div class="sp-scen"><b>${i + 1} · ${c.n}</b><p>${c.d}</p><em>${c.t}</em></div>`).join('');
  }
  if (d.how) {
    h += `<div class="sp-h">How it works</div>` + d.how.map(([t, x], i) =>
      `<div class="sp-step"><i>${i + 1}</i><div><b>${t}</b><span>${x}</span></div></div>`).join('');
  }
  h += `<div class="sp-h">Key features</div>` + d.features.map(f => `<div class="sp-feat">${f}</div>`).join('');
  for (const [head, rows] of d.specs)
    h += `<div class="sp-h">${head}</div>` + rows.map(([k, v]) => `<div class="sp-row"><span>${k}</span><b>${v}</b></div>`).join('');
  if (d.field) {
    h += `<div class="sp-h">In the field</div>` + d.field.map(f => `<div class="sp-feat">${f}</div>`).join('');
  }
  h += `<div class="sp-note">From the Landseed product-line introduction and July 2026 price sheet. Target prices are pre-launch and subject to change.</div>`;
  s.innerHTML = h;
  s.scrollTop = 0;
}

const CAT_LINE = 'Poaching, illegal logging and human-wildlife conflict drive the loss of the wild — and the sensors meant to stop them have been expensive, blind, or disconnected. Landseed’s answer: cameras that think before they transmit, a network that reaches any sky, and prices that let a field programme deploy in numbers — all reporting to one brain.';

function goView(id) {
  if (busy && current !== id) return;
  if (!byId[id] && id !== 'catalogue') return;
  const prev = current; current = id;
  location.hash = id === 'catalogue' ? '' : id;

  document.querySelectorAll('#chapters .chip').forEach(b => b.classList.toggle('on', b.dataset.go === id));
  document.querySelectorAll('#plegend .wl-row.dv').forEach(r => r.classList.toggle('on', r.dataset.dev === id));

  if (id === 'catalogue') {
    stopTurntable();
    flyTo(CAT_CAM.pos, CAT_CAM.tgt, prev === 'catalogue' ? 1.2 : 1.7);
    controls.minDistance = 2.2;
    for (const d of DEVICES) fadeDevice(d, true);
    world.setStreamsVisible(true);
    world.setGridDim(false);
    for (const t of tracked) t.el.style.opacity = t.kind === 'plate' ? '' : '0';
    $('#plegend').classList.add('show');
    $('#specs').classList.remove('show');
    setCaption('The product line', 'Landseed Hardware',
      CAT_LINE,
      [['7', 'products'], ['$50–299', 'hardware'], ['30 s', 'fastest alert'], ['>12 mo', 'battery']],
      [['Begin the tour → Serengeti', 'serengeti']], null);
    return;
  }

  const d = byId[id];
  $('#hint').classList.add('gone');
  stopTurntable();
  const f = deviceFrame(d);
  flyTo(f.pos, f.tgt, 1.7);
  controls.minDistance = .9;
  for (const x of DEVICES) fadeDevice(x, x === d);
  world.setStreamsVisible(false);
  world.setGridDim(true);
  if (id !== 'shaman' && id !== 'gateway') startTurntable(d);   // large assemblies stay put
  for (const t of tracked) {
    if (t.kind === 'plate') t.el.style.opacity = '0';
    else t.el.style.opacity = (t.dev === d) ? '' : '0';
  }
  $('#plegend').classList.remove('show');
  $('#specs').classList.add('show');
  fillSpecs(d);

  const i = DEVICES.indexOf(d), next = DEVICES[(i + 1) % DEVICES.length];
  const links = [[`Next · ${next.name.replace('Landseed ', '')} →`, next.id], ['← Catalogue', 'catalogue']];
  setCaption(d.kicker, d.name, d.line, d.stats, links, d.hue);
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
  if (e.target !== $('#scene')) { $('#scene').classList.remove('pointing'); return; }
  const d = current === 'catalogue' ? pick(e) : null;
  $('#scene').classList.toggle('pointing', !!d);
  if (hovered !== d) {
    if (hovered && current === 'catalogue') gsap.to(hovered.plinth.userData.ring.material, { opacity: .8, duration: .3 });
    hovered = d;
    if (d) gsap.to(d.plinth.userData.ring.material, { opacity: 1, duration: .2 });
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
window.__hw = { world, camera, controls, goView, DEVICES, get current() { return current; } };

world.start();

const startId = (() => {
  const h = location.hash.slice(1);
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
