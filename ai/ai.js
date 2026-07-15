/* Landseed AI — the CTDAMS sample workspace. Fully interactive: view tabs,
   detection filters, metric ranges. Every number is illustrative and the
   app bar carries the "sample data" badge — never remove it
   (repo CLAUDE.md · satellite rules). No Math.random: samples are fixed. */

/* ── view tabs — the app bar switches workspaces ──────────────────────────── */
const tabs = [...document.querySelectorAll('.app-tabs button')];
const views = [...document.querySelectorAll('.view')];
let currentView = 'overview';
function setView(name) {
  if (!document.getElementById('view-' + name)) return;
  currentView = name;
  tabs.forEach(t => t.classList.toggle('on', t.dataset.view === name));
  views.forEach(v => v.classList.toggle('on', v.id === 'view-' + name));
}
tabs.forEach(t => t.addEventListener('click', () => setView(t.dataset.view)));

/* ── occupancy sectors — deterministic sample values ──────────────────────── */
const heat = [
  12, 30, 8, 55, 74, 38, 15, 62, 88,
  41, 22, 70, 33, 9, 48, 81, 27, 58,
  17, 66, 35, 91, 44, 13, 52, 76, 29,
  61, 19, 83, 46, 25, 68, 11, 57, 39,
  72, 31, 14, 64, 87, 23, 49, 7, 53,
];
const occHTML = heat.map((v, i) =>
  `<i style="--v:${v}" title="sector ${'ABCDEFGHI'[i % 9]}${Math.floor(i / 9) + 1} · ${v}% · sample"></i>`).join('');
for (const id of ['occ', 'occ2']) { const el = document.getElementById(id); if (el) el.innerHTML = occHTML; }

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

/* ── detections table — sample rows, filterable like the real product ─────── */
const DETS = [
  ['18:39', 'elephant', 'Elephant ×3', 'VillageGuard 01', 'D4', '0.99', 'phones'],
  ['18:33', 'human', 'Human ×4', 'Monitor 01', 'B2', '0.96', 'ops room'],
  ['18:12', 'vehicle', 'Vehicle', 'Monitor 04', 'F1', '0.93', 'phones + email'],
  ['17:58', 'acoustic', 'Gunshot signature', 'Listener 07', 'G2', '0.91', 'ops room'],
  ['17:41', 'elephant', 'Elephant ×1 · bull', 'VillageGuard 02', 'C5', '0.98', 'phones'],
  ['17:22', 'human', 'Human ×2 · patrol', 'Monitor 02', 'B3', '0.97', 'logged'],
  ['16:58', 'acoustic', 'Leopard call', 'Listener 03', 'H4', '0.88', 'survey'],
  ['16:31', 'human', 'Human ×1', 'Monitor 06', 'A1', '0.95', 'ops room'],
  ['16:04', 'elephant', 'Elephant ×5 · herd', 'Monitor 03', 'E3', '0.99', 'phones'],
  ['15:47', 'vehicle', 'Logging truck', 'Monitor 05', 'I2', '0.94', 'ops room'],
  ['15:20', 'acoustic', 'Wolf pack event', 'Listener 01', 'H1', '0.90', 'survey'],
  ['14:52', 'human', 'Human ×3', 'Monitor 01', 'B2', '0.92', 'phones'],
  ['14:18', 'elephant', 'Elephant ×2', 'VillageGuard 01', 'D4', '0.97', 'logged'],
  ['13:44', 'vehicle', 'Vehicle', 'Monitor 04', 'F2', '0.89', 'phones + email'],
  ['13:09', 'acoustic', 'Leopard call', 'Listener 04', 'G5', '0.87', 'survey'],
  ['12:36', 'human', 'Human ×2', 'Monitor 07', 'A3', '0.96', 'logged'],
  ['12:01', 'elephant', 'Elephant ×4', 'Monitor 03', 'E4', '0.98', 'phones'],
  ['11:27', 'acoustic', 'Unknown signature', 'Listener 02', 'C1', '0.71', 'review'],
];
const CLASS_HUE = { human: '#00FF64', elephant: '#FFC800', vehicle: '#1482FF', acoustic: '#E682E6' };
const detList = document.getElementById('det-list');
detList.innerHTML = DETS.map(([t, cls, label, sensor, sector, conf, route]) =>
  `<div class="det-row" data-class="${cls}" style="--qh:${CLASS_HUE[cls]}"><b>${t}</b><span class="dc"><i></i>${label}</span><span>${sensor}</span><span>${sector}</span><em>${conf}</em><span class="rt">${route}</span></div>`).join('');
const filters = document.getElementById('filters');
let currentFilter = 'all';
filters.addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]');
  if (!b) return;
  currentFilter = b.dataset.f;
  [...filters.children].forEach(c => c.classList.toggle('on', c === b));
  document.querySelectorAll('.det-row').forEach(r =>
    r.classList.toggle('hide', currentFilter !== 'all' && r.dataset.class !== currentFilter));
});

/* ── survey — detections by class, 30 d ───────────────────────────────────── */
const species = document.getElementById('species');
if (species) {
  const rows = [['Human', 'human', 412, 86], ['Elephant', 'elephant', 231, 48], ['Vehicle', 'vehicle', 88, 18], ['Leopard · acoustic', 'acoustic', 57, 12], ['Wolf · acoustic', 'acoustic', 143, 30]];
  species.innerHTML = rows.map(([label, cls, n, w]) =>
    `<div class="bar-row" style="--qh:${CLASS_HUE[cls]}"><b>${label}</b><span class="bar"><i style="width:${w}%"></i></span><em>${n}</em></div>`).join('');
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
  visibleDetections: () => document.querySelectorAll('.det-row:not(.hide)').length,
  phoneBubbles: document.querySelectorAll('#phone .tg-msg').length,
  sectors: heat.length,
  sampleBadge: !!document.querySelector('.app-bar .sp-badge'),
  facts: { metrics: 'presence · occupancy · density · abundance' },
};
