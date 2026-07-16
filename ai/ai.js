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
import { buildMap, sourcesHTML } from './map.js?v=2';
import { buildTerrain } from './map3d.js?v=32';

const tip = document.createElement('div');
tip.className = 'vmap-tip';
document.body.appendChild(tip);

let mapStations = 0;
// 3D terrain centerpiece on Overview; falls back to the flat map if WebGL fails
buildTerrain('map', tip).then(t => { if (t) mapStations = t.stations; })
  .catch(() => fetch('/public/virunga-geo.json?v=1').then(r => r.json()).then(g => buildMap(g, 'map', tip)));

fetch('/public/virunga-geo.json?v=1').then(r => r.json()).then(async (geo) => {
  await buildMap(geo, 'map2', tip, { ctrl: 'msurf-ctrl', legend: 'map-leg2', default: 'occupancy' });
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

/* ── population metrics — realistic recovery time-series; the range control
   swaps the window (12-month · 30-day · 7-day). Values/deltas match the survey
   model; sparkline trends generated deterministically (no Math.random). ────── */
const fract = (x) => x - Math.floor(x);
const pnoise = (i, seed) => fract(Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) * 2 - 1;
const easeOut = (t) => 1 - Math.pow(1 - t, 1.8);
function series(lo, hi, seed, n, amp) {                     // → {p: polyline pts, ey: end y}
  const pts = []; let ey = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let v = lo + (hi - lo) * easeOut(t) + pnoise(i, seed) * amp * (0.4 + t);
    v = Math.max(0.04, Math.min(0.96, v));
    ey = 20 - v * 18;
    pts.push(`${(t * 100).toFixed(1)},${ey.toFixed(2)}`);
  }
  return { p: pts.join(' '), ey: ey.toFixed(2) };
}
// [label, value, delta, recovery lo → hi] — the rise is steepest over the year
const METRICS = {
  y: [['Presence', '0.82', '▲ .03', 0.34, 0.86], ['Occupancy', '0.61', '▲ .02', 0.30, 0.80], ['Density /km²', '3.2', '▬', 0.50, 0.60], ['Abundance', '214 ±18', '▲ 6%', 0.28, 0.82]],
  m: [['Presence', '0.81', '▲ .01', 0.72, 0.84], ['Occupancy', '0.60', '▲ .01', 0.55, 0.63], ['Density /km²', '3.2', '▬', 0.54, 0.58], ['Abundance', '212 ±19', '▲ 2%', 0.60, 0.70]],
  d: [['Presence', '0.79', '▬', 0.77, 0.80], ['Occupancy', '0.58', '▬', 0.57, 0.60], ['Density /km²', '3.1', '▬', 0.55, 0.57], ['Abundance', '209 ±21', '▬', 0.66, 0.69]],
};
const AMP = { y: 0.05, m: 0.04, d: 0.028 };
const mets = document.getElementById('mets');
function renderMetrics(r) {
  mets.innerHTML = METRICS[r].map(([label, val, delta, lo, hi], i) => {
    const s = series(lo, hi, i * 7 + (r === 'y' ? 1 : r === 'm' ? 2 : 3), r === 'd' ? 16 : 24, AMP[r]);
    return `<div class="met"><span>${label}</span><b>${val}</b><em>${delta}</em>` +
      `<svg viewBox="0 0 100 22" preserveAspectRatio="none"><polygon class="mk-area" points="0,22 ${s.p} 100,22"/><polyline points="${s.p}"/><circle class="mk-end" cx="100" cy="${s.ey}" r="1.2"/></svg></div>`;
  }).join('');
}
renderMetrics('y');
const range = document.getElementById('range');
range.addEventListener('click', (e) => {
  const b = e.target.closest('[data-r]');
  if (!b) return;
  [...range.children].forEach(c => c.classList.toggle('on', c === b));
  renderMetrics(b.dataset.r);
});

/* ── right rail — network breakdown, species bars, report links ───────────── */
const netBars = document.getElementById('net-bars');
if (netBars) {
  const cats = [['Animal', '#00FF64', 2488, 100], ['Human', '#FFC800', 412, 17], ['Vehicle', '#32C8FF', 88, 6], ['Acoustic', '#E682E6', 132, 9]];
  netBars.innerHTML = cats.map(([l, c, n, w]) =>
    `<div class="nb-row"><i style="--c:${c}"></i><b>${l}</b><span class="nb-bar"><i style="--c:${c};width:${w}%"></i></span><em>${n.toLocaleString()}</em></div>`).join('');
}
const railSp = document.getElementById('rail-species');
if (railSp) {
  const rows = [['Buffalo', '#8B5B2D', 412, 100], ['Elephant', '#F0C244', 231, 56], ['Hippo', '#3A9FE6', 188, 46], ['Ugandan kob', '#C8A24B', 144, 35],
    ['Gorilla', '#4FD17A', 96, 24], ['Leopard', '#EF7A3C', 57, 14], ['Lion', '#E0902C', 22, 6]];
  railSp.innerHTML = rows.map(([l, c, n, w]) =>
    `<div class="bar-row" style="--qh:${c}"><b>${l}</b><span class="bar"><i style="width:${w}%"></i></span><em>${n}</em></div>`).join('');
}
document.querySelectorAll('[data-view-link]').forEach(a =>
  a.addEventListener('click', (e) => { e.preventDefault(); setView(a.dataset.viewLink); }));

/* ── detections — image cards with bounding boxes, filterable by category &
   species. Field imagery is real (demo/assets/field, project archive); classes
   with no photo yet get a labeled IR placeholder frame. Sample detections. */
const CLASS_HUE = {
  human: '#00FF64', vehicle: '#1482FF', gunshot: '#E0902C',
  elephant: '#F0C244', buffalo: '#8B5B2D', kob: '#C8A24B', hippo: '#3A9FE6',
  lion: '#E0902C', topi: '#CF5A44', warthog: '#B98F5B', waterbuck: '#4FD17A', leopard: '#EF7A3C',
  gorilla: '#4FD17A',
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
  // real captures already carry their own boxes+labels — never redraw over them.
  // placeholders get a styled IR frame + a class tag (image pending), no drawn box.
  const frame = img
    ? `<img src="${img}" alt="" loading="lazy" /><span class="det-conf">${conf}</span>`
    : `<div class="det-ph" style="--qh:${col}"><span class="det-ph-cls">${cls === 'gunshot' ? 'ACOUSTIC EVENT' : label}</span><span class="det-ph-sub">${cls === 'gunshot' ? 'no image · triangulated' : 'image pending · ' + conf}</span></div>`;
  return `<article class="det-card" data-cls="${cls}" data-cat="${cat}">
    <div class="det-frame">${frame}</div>
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

/* ── survey — single-season occupancy model + diel activity + diversity ──────
   Sample survey: 27 passive-IR stations, 1,340 camera-nights (20 May–01 Jul).
   ψ̂ is detection-corrected (MacKenzie et al. 2002) so it exceeds the naïve
   proportion of stations with a detection; elusive, low-p species carry the
   largest correction. RAI = detections per 100 camera-nights. All illustrative. */
// [species, class, naïve ψ, est ψ̂, 95% CI ±, per-night p̂, RAI]
const OCC = [
  ['Buffalo', 'buffalo', 0.63, 0.71, 0.09, 0.28, 30.7],
  ['Elephant', 'elephant', 0.52, 0.61, 0.08, 0.22, 17.2],
  ['Hippopotamus', 'hippo', 0.30, 0.34, 0.07, 0.41, 14.0],
  ['Ugandan kob', 'kob', 0.44, 0.52, 0.09, 0.19, 10.7],
  ['Warthog', 'warthog', 0.41, 0.48, 0.10, 0.16, 9.6],
  ['Gorilla', 'gorilla', 0.15, 0.24, 0.10, 0.12, 7.2],
  ['Waterbuck', 'waterbuck', 0.33, 0.39, 0.09, 0.14, 6.7],
  ['Topi', 'topi', 0.30, 0.36, 0.10, 0.13, 6.3],
  ['Leopard', 'leopard', 0.19, 0.31, 0.11, 0.09, 4.3],
  ['Lion', 'lion', 0.11, 0.18, 0.09, 0.08, 1.6],
];
const occModel = document.getElementById('occ-model');
if (occModel) {
  const AX = 0.85;                                   // ψ axis max for the CI track
  const pct = (v) => (Math.max(0, Math.min(AX, v)) / AX * 100).toFixed(1);
  const head = `<div class="occ-row occ-hd"><b>Species</b><span class="occ-n">ψ&nbsp;nv</span><span class="occ-ci-h">95% CI</span><span class="occ-n">ψ̂</span><span class="occ-n">p̂</span><span class="occ-n">RAI</span></div>`;
  occModel.innerHTML = head + OCC.map(([sp, cls, nv, psi, ci, p, rai]) => {
    const lo = pct(psi - ci), hi = pct(psi + ci), mid = pct(psi), nvx = pct(nv);
    return `<div class="occ-row" style="--qh:${CLASS_HUE[cls]}">` +
      `<b>${sp}</b>` +
      `<span class="occ-n occ-dim">${nv.toFixed(2)}</span>` +
      `<span class="occ-ci" title="ψ̂ ${psi.toFixed(2)} (95% CI ${(psi - ci).toFixed(2)}–${(psi + ci).toFixed(2)})"><i class="occ-ci-bar" style="left:${lo}%;width:${(hi - lo).toFixed(1)}%"></i>` +
        `<i class="occ-ci-nv" style="left:${nvx}%"></i><i class="occ-ci-pt" style="left:${mid}%"></i></span>` +
      `<span class="occ-n occ-est">${psi.toFixed(2)}</span>` +
      `<span class="occ-n">${p.toFixed(2)}</span>` +
      `<span class="occ-n occ-rai">${rai.toFixed(1)}</span></div>`;
  }).join('');
}
// diversity + effort chips (foot of the map pane)
const occFoot = document.getElementById('occ-foot');
if (occFoot) {
  const chips = [['Richness S', '14'], ['Chao2', '15.8 ±2.1'], ['Shannon H′', '2.11'], ['Pielou J′', '0.80'], ['mean p̂', '0.18']];
  occFoot.innerHTML = chips.map(([l, v]) => `<span class="occ-chip"><em>${l}</em>${v}</span>`).join('');
}
// diel activity — hourly detection kernels (0–24 h), normalised to peak
const DIEL = [
  ['Elephant', 'elephant', 'crepuscular · dawn & dusk', [.20, .15, .12, .10, .15, .40, .75, .60, .40, .30, .25, .20, .20, .22, .25, .30, .45, .70, .85, .60, .40, .30, .25, .20]],
  ['Buffalo', 'buffalo', 'diurnal · midday grazing', [.05, .05, .05, .06, .10, .20, .35, .50, .65, .80, .90, .95, .90, .80, .70, .55, .40, .30, .20, .12, .08, .06, .05, .05]],
  ['Leopard', 'leopard', 'nocturnal · overlap Δ 0.31', [.80, .85, .70, .60, .45, .30, .15, .08, .05, .04, .04, .05, .05, .06, .08, .10, .15, .25, .40, .55, .70, .82, .88, .85]],
];
const diel = document.getElementById('diel');
if (diel) {
  diel.innerHTML = DIEL.map(([sp, cls, note, k]) => {
    const peak = k.indexOf(Math.max(...k));
    const W = 100, H = 26;
    const pts = k.map((v, i) => `${(i / 23 * W).toFixed(1)},${(H - v * (H - 3)).toFixed(1)}`).join(' ');
    const area = `0,${H} ${pts} ${W},${H}`;
    return `<div class="diel-row" style="--qh:${CLASS_HUE[cls]}">` +
      `<div class="diel-lab"><b>${sp}</b><span>${note}</span></div>` +
      `<svg class="diel-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
        `<line class="diel-grid" x1="25" y1="0" x2="25" y2="${H}"/><line class="diel-grid" x1="50" y1="0" x2="50" y2="${H}"/><line class="diel-grid" x1="75" y1="0" x2="75" y2="${H}"/>` +
        `<polygon class="diel-area" points="${area}"/><polyline class="diel-line" points="${pts}"/>` +
        `<circle class="diel-peak" cx="${(peak / 23 * W).toFixed(1)}" cy="${(H - k[peak] * (H - 3)).toFixed(1)}" r="1.6"/></svg>` +
      `<span class="diel-peak-t">${String(peak).padStart(2, '0')}:00</span></div>`;
  }).join('') + `<div class="diel-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>`;
}
// species accumulation — rarefaction curve rising to the Chao2 asymptote (S≈14
// observed at 1,340 camera-nights; Chao2 15.8 places 1–2 rare species below floor)
const accum = document.getElementById('accum');
if (accum) {
  const NMAX = 1340, SMAX = 15.8, kk = 0.00162, W = 100, H = 44, YT = 16;
  const yv = (s) => (H - 2 - (s / YT) * (H - 5)), xv = (n) => (n / NMAX) * W;
  const pts = [];
  for (let n = 0; n <= NMAX; n += NMAX / 24) pts.push(`${xv(n).toFixed(1)},${yv(SMAX * (1 - Math.exp(-kk * n))).toFixed(1)}`);
  const asym = yv(SMAX).toFixed(1), obs = yv(14).toFixed(1);
  accum.innerHTML = `<svg class="accum-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
    `<polygon class="accum-fill" points="0,${H} ${pts.join(' ')} ${W},${H}"/>` +
    `<line class="accum-asym" x1="0" y1="${asym}" x2="${W}" y2="${asym}"/>` +
    `<polyline class="accum-line" points="${pts.join(' ')}"/>` +
    `<circle class="accum-obs" cx="${xv(NMAX).toFixed(1)}" cy="${obs}" r="1.7"/></svg>` +
    `<div class="accum-ax"><span>observed S = 14</span><span>1,340 camera-nights</span><span class="accum-asym-t">Chao2 15.8 ±2.1</span></div>`;
}

/* ── reports — a Virunga-titled library; each doc renders its own preview.
   Written automatically by CTDAMS on the programme's cadence. Sample data;
   the cited population figures are real and sourced (see the sources popover).
   Optional `tbl` renders a small data table inside the preview. ──────────────*/
const REPORTS = {
  abundance: {
    title: 'Quarterly abundance report', ref: 'CTDAMS·ABD·2026·Q2 · rev 3',
    sub: 'Virunga NP · Central Sector · 20 May – 01 Jul 2026 · issued 03 Jul',
    mets: [['Presence ψ̄', '0.82'], ['Occupancy ψ̂', '0.61 ±.06'], ['Density', '3.2 /km²'], ['Abundance N̂', '214 ±18']],
    secs: [['Survey design', '27 passive-IR stations on a 2.5-km grid, 1,340 camera-nights (mean 49.6 nights/station, 96% uptime). Rwindi, Rutshuru and central-savanna strata.'],
           ['Model', 'Single-season occupancy (MacKenzie et al. 2002); Royle–Nichols abundance-induced heterogeneity for density. Covariates: distance-to-water, NDVI, patrol effort. Model-averaged by AICc.'],
           ['Detection', 'Community mean p̂ = 0.18 (0.08 lion → 0.41 hippo). Naïve ψ underestimates true occupancy by 0.06–0.12 for elusive species; corrected in ψ̂.'],
           ['Earth Credits annex', 'Metrics assembled into the measurement layer; every value retains provenance to sensor, station and survey window.']],
    tbl: ['Stratum', 'ψ̂', 'N̂', [['Rwindi plains', '0.71', '78 ±9'], ['Rutshuru', '0.64', '61 ±8'], ['Central savanna', '0.58', '52 ±7'], ['Lake Edward shore', '0.34', '23 ±5']]],
    cite: 'Large-mammal populations up to +400% from the low point (joint aerial surveys)⁶.',
  },
  detections: {
    title: 'Monthly detections digest', ref: 'CTDAMS·DET·2026·06',
    sub: 'Virunga NP · June 2026 · 3,120 sequences · 27 stations',
    mets: [['Total', '3,120'], ['Animal', '2,488'], ['Human', '412'], ['Vehicle', '88']],
    secs: [['Sequencing', 'Independent events defined by a 30-min quiet threshold; bursts collapsed to a single sequence. 132 acoustic-only events cross-referenced from the Listener array.'],
           ['Top classes', 'Buffalo 412 · elephant 231 · hippo 188 · kob 144 · gorilla 96 · warthog 129 · waterbuck 90 · leopard 57 · lion 22. RAI in the survey view.'],
           ['Routing', 'Wildlife → survey log; humans/vehicles/gunshot → ranger phones, email and operations rooms. Median alert latency 1–2 min via LoRa → satellite.']],
    tbl: ['Class', 'Count', 'Δ vs May', [['Animal', '2,488', '+6%'], ['Human', '412', '−3%'], ['Vehicle', '88', '+11%'], ['Acoustic', '132', '+4%']]],
    cite: 'Savanna elephants: 580+ returned — highest in 30 years⁴.',
  },
  species: {
    title: 'Species occupancy atlas', ref: 'CTDAMS·OCC·2026·Q2',
    sub: 'Virunga NP · Q2 2026 · ψ̂ across 27 stations · 14 species',
    mets: [['Species S', '14'], ['Chao2', '15.8 ±2.1'], ['Shannon H′', '2.11'], ['Pielou J′', '0.80']],
    secs: [['Community', 'Species accumulation approaches its asymptote by ~1,100 camera-nights; Chao2 places 1–2 rare species (serval, golden cat) below the detection floor.'],
           ['Grazers', 'Buffalo ψ̂ 0.71 and kob 0.52 track the recovering Rwindi grassland as elephants reopen it.'],
           ['Carnivores', 'Leopard ψ̂ 0.31 (naïve 0.19 — a 0.12 detection correction); lion 0.18, a re-established central breeding pair.']],
    tbl: ['Species', 'ψ naïve', 'ψ̂ (95% CI)', [['Buffalo', '0.63', '0.71 ±.09'], ['Elephant', '0.52', '0.61 ±.08'], ['Leopard', '0.19', '0.31 ±.11'], ['Lion', '0.11', '0.18 ±.09']]],
    cite: 'Mountain gorillas: 604 in the Virunga Massif (2024)²; Lake Edward hippos 2,700+³.',
  },
  alerts: {
    title: 'Alert & intrusion log', ref: 'CTDAMS·ALT·2026·06',
    sub: 'Virunga NP · June 2026 · humans · vehicles · gunshot',
    mets: [['Intrusions', '543'], ['People', '412'], ['Vehicles', '88'], ['Gunshot', '43']],
    secs: [['Response', 'Median alert-to-phone 1–2 min; 94% delivered inside 5 min. Confirmed intrusions handed to the nearest patrol with a station fix and thumbnail.'],
           ['Hotspots', 'Rutshuru approaches (RUT-02, RUT-04) and the Ishasha corridor (ISH-01) carry 61% of human detections; night ratio 2.3× day.'],
           ['Escalation', 'Gunshot signatures routed direct to operations rooms; 7 unknown acoustic events held for analyst review, none confirmed as fire.']],
    tbl: ['Sector', 'Events', 'Night %', [['Rutshuru', '188', '71%'], ['Ishasha', '146', '66%'], ['Rwindi', '121', '58%'], ['Central', '88', '49%']]],
    cite: 'Over 200 rangers lost since 2006 protecting the park⁵.',
  },
  acoustic: {
    title: 'Acoustic survey report', ref: 'CTDAMS·ACU·2026·Q2',
    sub: 'Virunga NP · Q2 2026 · Listener array · 30-day window',
    mets: [['Events', '1,532'], ['Leopard', '412'], ['Bio-acoustic', '1,048'], ['Gunshot', '36']],
    secs: [['Array', '9 Listener units, continuous edge classification; a 20-species call model runs on-device with confirmed events uplinked. Duty cycle 100%, mean SNR 14 dB.'],
           ['Triangulation', 'Bearing lines from ≥3 units converge to a fix (median error ±180 m in the current geometry); single-unit events logged as bearings only.'],
           ['Review queue', '7 unknown signatures flagged; roadmap adds acoustic triangulation and monocular distance to sharpen localisation.']],
    tbl: ['Signature', 'Events', 'Fixes', [['Leopard call', '412', '311'], ['Bio-acoustic', '1,048', '—'], ['Gunshot', '36', '34'], ['Unknown', '7', '2']]],
    cite: 'Park biodiversity: 218 mammal and 706 bird species recorded⁵.',
  },
  credits: {
    title: 'Earth Credits measurement annex', ref: 'CTDAMS·ECX·2026·Q2',
    sub: 'Virunga NP · Q2 2026 · the measurement layer, assembled',
    mets: [['Presence', '0.82'], ['Occupancy', '0.61'], ['Density /km²', '3.2'], ['Biomass t/km²', '27.6']],
    secs: [['Inputs', 'cameras · acoustics · reports · satellite — fused into the measurement layer, each stream weighted by its detection reliability.'],
           ['Measurement layer', 'Population metrics assembled into the Earth Credits standard; uncertainty propagated from per-species 95% CIs into a single confidence band.'],
           ['Delivery', 'subscription · annual updates · bundled or standalone · bespoke builds. Cadence matched to the survey window.'],
           ['Provenance', 'Every figure traces to a sensor, a station and a survey window; the audit trail ships with the annex.']],
    tbl: ['Metric', 'Value', 'Source', [['Presence ψ̄', '0.82', 'camera'], ['Occupancy ψ̂', '0.61', 'model'], ['Density', '3.2 /km²', 'RN model'], ['Biomass', '27.6 t/km²', 'UNESCO']]],
    cite: 'Savanna biomass ~27.6 t/km² — among the highest on Earth⁵.',
  },
  ranger: {
    title: 'Ranger deployment brief', ref: 'CTDAMS·RGR·2026·W27',
    sub: 'Virunga NP · week 27 · patrol routing from occupancy & alerts',
    mets: [['Patrols', '18'], ['Priority sectors', '5'], ['Open alerts', '7'], ['Coverage', '92%']],
    secs: [['Routing', 'Patrols weighted by occupancy, 7-day intrusion density and alert recency; the optimiser returns a ranked sector list each morning, not a fixed roster.'],
           ['Priority', 'Rutshuru approaches and the Ishasha corridor lead this week on night-time human detections; Rwindi core held for the recovering herds.'],
           ['Safety', 'No-go zones flagged from reported armed-group activity; routes auto-avoid them and never surface exact wildlife locations to unsecured channels.']],
    tbl: ['Sector', 'Priority', 'Patrols', [['Rutshuru', 'high', '5'], ['Ishasha', 'high', '4'], ['Rwindi core', 'med', '5'], ['Central', 'med', '4']]],
    cite: 'A breeding lion pair re-established in the central savanna⁴.',
  },
};
const repPrev = document.getElementById('rep-preview');
function renderReport(key) {
  const r = REPORTS[key];
  if (!r || !repPrev) return;
  const tbl = r.tbl ? (() => {
    const [c0, c1, c2, rows] = r.tbl;
    return `<table class="prev-tbl"><thead><tr><th>${c0}</th><th>${c1}</th><th>${c2}</th></tr></thead><tbody>` +
      rows.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('') + `</tbody></table>`;
  })() : '';
  repPrev.innerHTML =
    `<div class="pane-h">Preview<span class="pane-sub">auto-generated · sample</span></div>` +
    `<div class="prev"><div class="prev-top"><b>${r.title}</b><span class="prev-ref">${r.ref}</span></div>` +
    `<span class="prev-sub">${r.sub}</span>` +
    `<div class="prev-mets">${r.mets.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>` +
    r.secs.map(([h, body]) => `<div class="prev-sec"><span>${h}</span><p>${body}</p></div>`).join('') +
    tbl +
    `<div class="prev-cite">${r.cite}</div>` +
    `<div class="prev-foot">Written automatically by Landseed CTDAMS · sample data · every figure traces to a station, a sensor and a survey window.</div></div>`;
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

/* the phone opens at the top of the day's feed */
const tgBody = document.querySelector('#phone .tg-body');
if (tgBody) tgBody.scrollTop = 0;

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
