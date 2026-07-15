/* Landseed AI — the CTDAMS sample workspace. Fully interactive: view tabs,
   detection filters, metric ranges. Every number is illustrative and the
   app bar carries the "sample data" badge — never remove it
   (repo CLAUDE.md · satellite rules). No Math.random: samples are fixed. */

/* ── view tabs — the app bar switches workspaces ──────────────────────────── */
const tabs = [...document.querySelectorAll('.app-tabs button')];
const views = [...document.querySelectorAll('.view')];
let currentView = 'overview';
function revealView(name) {                                  // smooth staggered reveal, like FAQ
  const view = document.getElementById('view-' + name);
  if (!view) return;
  [...view.querySelectorAll('.rv')].forEach((el, i) => setTimeout(() => el.classList.add('in'), 40 + i * 80));
}
function setView(name) {
  if (!document.getElementById('view-' + name)) return;
  currentView = name;
  tabs.forEach(t => t.classList.toggle('on', t.dataset.view === name));
  views.forEach(v => v.classList.toggle('on', v.id === 'view-' + name));
  revealView(name);
}
tabs.forEach(t => t.addEventListener('click', () => setView(t.dataset.view)));
// on load: reveal the header line and the first view
document.querySelector('.app-sub')?.classList.add('in');
revealView('overview');

/* ── the Virunga twin — 3D terrain (Overview) + 2D occupancy surface (Survey) ── */
import { buildMap, sourcesHTML } from './map.js?v=1';
import { buildTerrain } from './map3d.js?v=21';

const tip = document.createElement('div');
tip.className = 'vmap-tip';
document.body.appendChild(tip);

let mapStations = 0;
// 3D terrain centerpiece on Overview; falls back to the flat map if WebGL fails
buildTerrain('map', tip).then(t => { if (t) mapStations = t.stations; })
  .catch(() => fetch('/public/virunga-geo.json?v=1').then(r => r.json()).then(g => buildMap(g, 'map', tip)));

fetch('/public/virunga-geo.json?v=1').then(r => r.json()).then(async (geo) => {
  await buildMap(geo, 'map2', tip);
  if (!mapStations) mapStations = geo.stations.length;
  // sources popover — subtle "sources" affordance in each map header
  const pop = document.createElement('div');
  pop.className = 'src-pop';
  pop.innerHTML = sourcesHTML();
  document.body.appendChild(pop);
  for (const id of ['map-src', 'map-src2', 'rep-src']) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !pop.classList.contains('on');
      const r = btn.getBoundingClientRect();
      pop.style.left = Math.max(12, r.right - 320) + 'px';
      pop.style.top = (r.bottom + 8) + 'px';
      pop.classList.toggle('on', open);
    });
  }
  document.addEventListener('click', (e) => { if (!pop.contains(e.target)) pop.classList.remove('on'); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') pop.classList.remove('on'); });
}).catch(() => {});

/* ── population metrics — the range control swaps live ────────────────────── */
const METRICS = {
  d: [['Presence', '0.79', '▲ .01', '0,10 20,11 40,9 60,10 80,8 100,7'], ['Occupancy', '0.58', '▬', '0,9 20,9 40,10 60,8 80,9 100,8'], ['Density /km²', '3.1', '▬', '0,8 20,9 40,8 60,8 80,7 100,8'], ['Abundance', '209', '±21', '0,9 20,10 40,9 60,8 80,9 100,8']],
  m: [['Presence', '0.81', '▲ .02', '0,11 20,10 40,10 60,8 80,7 100,5'], ['Occupancy', '0.60', '▲ .01', '0,10 20,10 40,9 60,9 80,7 100,6'], ['Density /km²', '3.2', '▲ .1', '0,9 20,9 40,8 60,8 80,8 100,7'], ['Abundance', '212', '±19', '0,11 20,10 40,9 60,9 80,8 100,7']],
  y: [['Presence', '0.82', '▲ .03', '0,11 14,10 28,11 42,8 56,9 70,6 84,5 100,3'], ['Occupancy', '0.61', '▲ .02', '0,10 14,11 28,9 42,10 56,7 70,8 84,6 100,5'], ['Density /km²', '3.2', '▬', '0,8 14,7 28,9 42,8 56,8 70,9 84,7 100,8'], ['Abundance', '214', '±18', '0,12 14,11 28,10 42,10 56,8 70,7 84,7 100,6']],
};
const mets = document.getElementById('mets');
function renderMetrics(r) {
  mets.innerHTML = METRICS[r].map(([label, val, delta, pts]) =>
    `<div class="met"><span>${label}</span><b>${val}</b><em>${delta}</em><svg viewBox="0 0 100 14" preserveAspectRatio="none"><polyline points="${pts}"/></svg></div>`).join('');
}
renderMetrics('y');
const range = document.getElementById('range');
range.addEventListener('click', (e) => {
  const b = e.target.closest('[data-r]');
  if (!b) return;
  [...range.children].forEach(c => c.classList.toggle('on', c === b));
  renderMetrics(b.dataset.r);
});

/* ── detections — image cards with bounding boxes, filterable by category &
   species. Field imagery is real (demo/assets/field, project archive); classes
   with no photo yet get a labeled IR placeholder frame. Sample detections. */
const CLASS_HUE = {
  human: '#00FF64', vehicle: '#1482FF', gunshot: '#E0902C',
  elephant: '#F0C244', buffalo: '#8B5B2D', kob: '#C8A24B', hippo: '#3A9FE6',
  lion: '#E0902C', topi: '#CF5A44', warthog: '#B98F5B', waterbuck: '#4FD17A', leopard: '#EF7A3C',
};
// [time, category, class, label, sensor, sector, conf, route, image, boxes]
// category: intrusion | people | vehicle | animal ; boxes: [x,y,w,h] fractions
const F = '/demo/assets/field/';
const DETS = [
  ['18:39', 'animal', 'elephant', 'Elephant ×3', 'VillageGuard 01', 'RWI-01', '0.99', 'phones', F + 'elephant-walk.jpg', [[.12, .34, .5, .52], [.55, .4, .3, .4]]],
  ['18:33', 'people', 'human', 'Human ×4', 'Monitor 01', 'RUT-02', '0.96', 'ops room', F + 'people-walk.jpg', [[.3, .28, .18, .55], [.52, .32, .16, .5]]],
  ['18:12', 'vehicle', 'vehicle', 'Vehicle', 'Monitor 04', 'ISH-01', '0.93', 'phones + email', null, [[.24, .4, .54, .34]]],
  ['17:58', 'intrusion', 'gunshot', 'Gunshot signature', 'Listener 07', 'CEN-01', '0.91', 'ops room', null, []],
  ['17:41', 'animal', 'elephant', 'Elephant ×1 · bull', 'VillageGuard 02', 'RWI-04', '0.98', 'phones', F + 'elephant-bull.jpg', [[.28, .2, .5, .68]]],
  ['17:22', 'people', 'human', 'Ranger patrol ×2', 'Monitor 02', 'RWI-02', '0.97', 'logged', F + 'people-close.jpg', [[.34, .16, .34, .74]]],
  ['16:58', 'animal', 'leopard', 'Leopard', 'Listener 03', 'ISH-02', '0.88', 'survey', null, [[.36, .34, .3, .4]]],
  ['16:31', 'animal', 'buffalo', 'Buffalo ×12', 'Monitor 06', 'RUT-01', '0.95', 'survey', null, [[.1, .42, .3, .32], [.44, .44, .28, .3]]],
  ['16:04', 'animal', 'elephant', 'Elephant ×5 · herd', 'Monitor 03', 'CEN-03', '0.99', 'survey', F + 'multi-class.jpg', [[.06, .3, .34, .5], [.42, .36, .28, .44]]],
  ['15:47', 'vehicle', 'vehicle', 'Logging truck', 'Monitor 05', 'RWI-06', '0.94', 'ops room', null, [[.18, .38, .6, .38]]],
  ['15:20', 'animal', 'kob', 'Ugandan kob ×8', 'Monitor 03', 'RWI-03', '0.92', 'survey', null, [[.14, .44, .22, .3], [.4, .46, .2, .28], [.66, .45, .2, .28]]],
  ['14:52', 'animal', 'hippo', 'Hippopotamus ×6', 'Monitor 08', 'EDW-01', '0.97', 'survey', null, [[.1, .4, .34, .3], [.5, .42, .3, .28]]],
  ['14:18', 'animal', 'lion', 'Lion · pair', 'VillageGuard 01', 'RUT-02', '0.90', 'ops room', null, [[.3, .4, .38, .34]]],
  ['13:44', 'animal', 'topi', 'Topi ×4', 'Monitor 04', 'CEN-02', '0.89', 'survey', null, [[.24, .42, .26, .34], [.54, .44, .22, .3]]],
  ['13:09', 'animal', 'warthog', 'Warthog ×3', 'Monitor 07', 'RUT-04', '0.87', 'survey', null, [[.28, .5, .44, .3]]],
  ['12:36', 'people', 'human', 'Human ×2', 'Monitor 07', 'RWI-05', '0.96', 'logged', null, [[.32, .26, .16, .56], [.54, .3, .15, .5]]],
  ['12:01', 'animal', 'waterbuck', 'Waterbuck ×2', 'Monitor 03', 'EDW-03', '0.91', 'survey', null, [[.3, .34, .3, .44]]],
  ['11:27', 'intrusion', 'gunshot', 'Unknown signature', 'Listener 02', 'ISH-01', '0.71', 'review', null, []],
];

const FILTERS = [
  ['all', 'All'], ['intrusion', 'Intrusions'], ['people', 'People'], ['vehicle', 'Vehicles'],
  ['animal', 'Animals'], ['elephant', 'Elephant'], ['buffalo', 'Buffalo'], ['hippo', 'Hippo'],
  ['lion', 'Lion'], ['kob', 'Kob'], ['leopard', 'Leopard'],
];
// intrusions = people + vehicles + gunshot; animals = any wildlife class
const inFilter = (d, f) => {
  const [, cat, cls] = d;
  if (f === 'all') return true;
  if (f === 'intrusion') return cat === 'people' || cat === 'vehicle' || cls === 'gunshot';
  if (f === 'people' || f === 'vehicle') return cat === f;
  if (f === 'animal') return cat === 'animal';
  return cls === f;                               // species chip
};

const grid = document.getElementById('det-grid');
const filters = document.getElementById('filters');
const detCount = document.getElementById('det-count');
filters.innerHTML = FILTERS.map(([f, label], i) =>
  `<button class="${i === 0 ? 'on' : ''}" data-f="${f}">${label}</button>`).join('');

function card(d) {
  const [t, cat, cls, label, sensor, sector, conf, route, img, boxes] = d;
  const col = CLASS_HUE[cls] || '#9B6CE0';
  const frame = img
    ? `<img src="${img}" alt="" loading="lazy" />`
    : `<div class="det-ph" style="--qh:${col}"><span>${cls === 'gunshot' ? 'ACOUSTIC · NO IMAGE' : 'IR CAPTURE · SAMPLE'}</span></div>`;
  const svg = boxes.length
    ? `<svg class="det-box" viewBox="0 0 100 100" preserveAspectRatio="none">` +
      boxes.map(([x, y, w, h]) => `<rect x="${x * 100}" y="${y * 100}" width="${w * 100}" height="${h * 100}" style="stroke:${col}"/>`).join('') +
      `</svg><span class="det-tag" style="--qh:${col}">${label} · ${conf}</span>` : '';
  return `<article class="det-card" data-cls="${cls}" data-cat="${cat}">
    <div class="det-frame">${frame}${svg}</div>
    <div class="det-meta"><b>${label}</b><span>${sensor} · ${sector} · ${t}</span></div>
    <div class="det-hov">
      <div><em>Confidence</em>${conf}</div>
      <div><em>Sensor</em>${sensor}</div>
      <div><em>Sector</em>${sector}</div>
      <div><em>Routed</em>${route}</div>
      <div><em>Class</em>${cls}</div>
    </div>
  </article>`;
}
grid.innerHTML = DETS.map(card).join('');

let currentFilter = 'all';
function applyFilter(f) {
  currentFilter = f;
  [...filters.children].forEach(c => c.classList.toggle('on', c.dataset.f === f));
  let n = 0;
  document.querySelectorAll('.det-card').forEach((c, i) => {
    const show = inFilter(DETS[i], f);
    c.classList.toggle('hide', !show);
    if (show) n++;
  });
  detCount.textContent = `${n} of ${DETS.length}`;
}
filters.addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) applyFilter(b.dataset.f); });
applyFilter('all');

/* ── survey — detections by class, 30 d ───────────────────────────────────── */
const species = document.getElementById('species');
if (species) {
  const rows = [['Human', 'human', 412, 86], ['Elephant', 'elephant', 231, 48], ['Vehicle', 'vehicle', 88, 18], ['Leopard · acoustic', 'acoustic', 57, 12], ['Wolf · acoustic', 'acoustic', 143, 30]];
  species.innerHTML = rows.map(([label, cls, n, w]) =>
    `<div class="bar-row" style="--qh:${CLASS_HUE[cls]}"><b>${label}</b><span class="bar"><i style="width:${w}%"></i></span><em>${n}</em></div>`).join('');
}

/* ── reports — a Virunga-titled library; each doc renders its own preview ──── */
const REPORTS = {
  abundance: {
    title: 'Quarterly abundance report', sub: 'Virunga NP · Central Sector · Q2 2026 · generated 01 Jul',
    mets: [['Presence ψ', '0.82'], ['Occupancy', '0.61'], ['Density /km²', '3.2'], ['Abundance', '214 ±18']],
    secs: [['Methods', 'Royle–Nichols occupancy across 27 camera-trap stations, 1,340 camera-nights.'],
           ['Results · by sector', 'Rwindi & Rutshuru plains carry the highest occupancy; Lake Edward shore dominated by hippo.'],
           ['Confidence', 'Detection probability p̂ = 0.74; 95% CI reported per species.'],
           ['Annex · Earth Credits', 'Population metrics assembled into the measurement layer.']],
    cite: 'Large-mammal populations up to +400% from the low point (joint aerial surveys)⁶.',
  },
  detections: {
    title: 'Monthly detections digest', sub: 'Virunga NP · June 2026 · 3,120 detections',
    mets: [['Total', '3,120'], ['Animal', '2,488'], ['Human', '412'], ['Vehicle', '88']],
    secs: [['By class', 'Elephant, buffalo, kob, hippo, topi, warthog, waterbuck, lion, leopard.'],
           ['By sensor', 'Monitor, VillageGuard and Listener units across the network.'],
           ['Routing', 'Alerts to phones, email and operations rooms; survey data logged.']],
    cite: 'Savanna elephants: 580+ returned — highest in 30 years⁴.',
  },
  species: {
    title: 'Species occupancy atlas', sub: 'Virunga NP · Q2 2026 · ψ across 27 stations',
    mets: [['Species', '14'], ['Stations', '27'], ['Peak ψ', '0.97'], ['Camera-nights', '1,340']],
    secs: [['Hippo · Lake Edward', 'ψ 0.90–0.97 along the shore stations.'],
           ['Elephant · plains', 'ψ 0.77–0.94 across Rwindi & central savanna.'],
           ['Lion · central', 'ψ 0.41–0.44 — a re-established breeding pair.']],
    cite: 'Mountain gorillas: 604 in the Virunga Massif (2024)²; Lake Edward hippos 2,700+³.',
  },
  alerts: {
    title: 'Alert & intrusion log', sub: 'Virunga NP · June 2026 · humans · vehicles · gunshot',
    mets: [['Intrusions', '500'], ['People', '412'], ['Vehicles', '88'], ['Gunshot', '43']],
    secs: [['Response', 'Median alert to ranger phone: 1–2 min via LoRa → satellite.'],
           ['Hotspots', 'Rutshuru approaches and the Ishasha corridor.'],
           ['Escalation', 'Gunshot signatures routed direct to operations rooms.']],
    cite: 'Over 200 rangers lost since 2006 protecting the park⁵.',
  },
  acoustic: {
    title: 'Acoustic survey report', sub: 'Virunga NP · Q2 2026 · array triangulation',
    mets: [['Events', '1,532'], ['Leopard', '412'], ['Wolf', '1,048'], ['Gunshot', '36']],
    secs: [['Triangulation', 'Bearing lines from the Listener array converge to a fix.'],
           ['Review queue', 'Unknown signatures flagged for analyst review.'],
           ['Roadmap', 'Acoustic triangulation and monocular distance in development.']],
    cite: 'Park biodiversity: 218 mammal and 706 bird species recorded⁵.',
  },
  credits: {
    title: 'Earth Credits measurement annex', sub: 'Virunga NP · Q2 2026 · the measurement layer',
    mets: [['Presence', '0.82'], ['Occupancy', '0.61'], ['Density /km²', '3.2'], ['Biomass t/km²', '27.6']],
    secs: [['Inputs', 'cameras · acoustics · reports · satellite — fused into the measurement layer.'],
           ['Measurement layer', 'Population metrics assembled into the Earth Credits standard.'],
           ['Delivery', 'subscription · annual updates · bundled or standalone · bespoke builds.'],
           ['Provenance', 'Every figure traces to a sensor, a station and a survey window.']],
    cite: 'Savanna biomass ~27.6 t/km² — among the highest on Earth⁵.',
  },
  ranger: {
    title: 'Ranger deployment brief', sub: 'Virunga NP · weekly · patrol routing',
    mets: [['Patrols', '18'], ['Priority sectors', '5'], ['Open alerts', '7'], ['Coverage', '92%']],
    secs: [['Routing', 'Patrols weighted by occupancy, recent intrusions and alert density.'],
           ['Priority', 'Rutshuru approaches, Ishasha corridor, Rwindi core.'],
           ['Safety', 'No-go zones flagged from armed-group activity.']],
    cite: 'A breeding lion pair re-established in the central savanna⁴.',
  },
};
const repPrev = document.getElementById('rep-preview');
function renderReport(key) {
  const r = REPORTS[key];
  if (!r || !repPrev) return;
  repPrev.innerHTML =
    `<div class="pane-h">Preview · ${r.title}</div>` +
    `<div class="prev"><b>${r.title}</b><span>${r.sub}</span>` +
    `<div class="prev-mets">${r.mets.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>` +
    r.secs.map(([h, body]) => `<div class="prev-sec"><span>${h}</span><p>${body}</p></div>`).join('') +
    `<div class="prev-cite">${r.cite}</div></div>`;
}
const docList = document.querySelector('.doc-list');
if (docList) {
  docList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rep]');
    if (!b) return;
    [...docList.querySelectorAll('.doc-sel')].forEach(d => d.classList.toggle('on', d === b));
    renderReport(b.dataset.rep);
  });
  renderReport('abundance');
}

/* ── clock — the one live element ─────────────────────────────────────────── */
const clock = document.getElementById('clock');
let minutes = 18 * 60 + 45;
setInterval(() => {
  minutes = (minutes + 1) % 1440;
  clock.textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}, 20000);

/* the phone opens on the latest alert — settle across the font-swap reflow */
const tgBody = document.querySelector('#phone .tg-body');
let settle = 0;
(function keep() { if (tgBody) tgBody.scrollTop = tgBody.scrollHeight; if (++settle < 40) requestAnimationFrame(keep); })();

/* headless-verification hook — same doctrine as __hw / __demo (repo CLAUDE.md) */
window.__ai = {
  views: tabs.map(t => t.dataset.view),
  setView,
  view: () => currentView,
  filter: (f) => { const b = filters.querySelector(`[data-f="${f}"]`); if (b) b.click(); },
  visibleDetections: () => document.querySelectorAll('.det-card:not(.hide)').length,
  filterDetections: applyFilter,
  phoneBubbles: document.querySelectorAll('#phone .tg-msg').length,
  mapStations: () => mapStations,
  sampleBadge: !!document.querySelector('.app-bar .sp-badge'),
  facts: { metrics: 'presence · occupancy · density · abundance' },
};
