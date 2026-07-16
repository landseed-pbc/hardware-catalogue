/* Virunga occupancy twin — a multi-layer scientific surface over the real OSM
   park boundary (relation 404784) + Lake Edward. Four togglable layers, each
   derived directly from the camera-trap station network (public/virunga-geo.json):
     · Occupancy ψ        — modeled presence probability (real per-station ψ)
     · Detection density  — 30-day detection counts (real per-station)
     · Species richness   — derived from detection load, ψ and habitat guild
     · Human pressure     — derived from sector, low ψ and edge exposure
   Lightweight: one SVG, blurred inverse-distance fields, a smooth crossfade on
   toggle, station markers recoloured/resized per layer. Figures are sample/
   illustrative; the cited population numbers are real and sourced (SOURCES). */

const SOURCES = [
  ['Boundary & Lake Edward geometry', 'OpenStreetMap — Virunga NP relation 404784'],
  ['Mountain gorillas · 604 in the Virunga Massif (2024)', 'IGCP / Virunga Massif survey, 2024'],
  ['Lake Edward hippos · 2,700+ (recovering from <1,000 in 2005)', 'ICCN / Virunga National Park census'],
  ['Savanna elephants · 580+ returned, highest in 30 years', 'Africa Geographic / National Geographic, 2024'],
  ['Savanna biomass ~27.6 t/km² · among the highest on Earth', 'UNESCO World Heritage datasheet'],
  ['Large-mammal recovery · up to +400% from the low point', 'Joint aerial surveys, WCS / Virunga'],
];

// a real cited figure per dominant class — shown subtly in the station tooltip
const CITE = {
  hippo: ['Lake Edward hippos: 2,700+ (2026 census), up from <1,000 in 2005', 3],
  elephant: ['Savanna elephants: 580+ returned — highest in 30 years', 4],
  'forest-elephant': ['Forest elephants recolonising the Semliki lowland', 4],
  gorilla: ['Mountain gorillas: 604 in the Virunga Massif (2024)', 2],
  'grauers-gorilla': ['Grauer’s gorilla persists on Mt Tshiaberimu', 2],
  lion: ['A breeding lion pair re-established in the central savanna', 4],
  buffalo: ['Buffalo returning as elephants restore the grassland', 4],
  kob: ['Ugandan kob among the recovering plains grazers', 4],
  topi: ['Topi returning to the Rwindi–Rutshuru plains', 4],
  warthog: ['Warthog recovering across the central savanna', 4],
  waterbuck: ['Waterbuck along the Lake Edward shore', 4],
  chimpanzee: ['Eastern chimpanzee in the Tongo forest', 1],
  'golden-monkey': ['Golden monkey in the Mikeno bamboo zone', 1],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// habitat guild → richness base: open savanna carries the most co-occurring
// large mammals, the lake shore the fewest, forest a specialised subset
const GUILD = {
  elephant: 'sav', buffalo: 'sav', kob: 'sav', topi: 'sav', warthog: 'sav', waterbuck: 'sav', lion: 'sav',
  hippo: 'shore', gorilla: 'for', 'grauers-gorilla': 'for', 'golden-monkey': 'for',
  chimpanzee: 'for', 'forest-elephant': 'for', 'forest-duiker': 'for',
};
const RBASE = { sav: 7, shore: 4, for: 5 };
// sector → baseline anthropogenic pressure: Rutshuru approaches and the Ishasha
// corridor lead human/vehicle detections; forest interiors are lowest
const PBASE = { RWI: 0.50, RUT: 0.82, EDW: 0.30, ISH: 0.78, CEN: 0.40, MIK: 0.26, TON: 0.34, SEM: 0.56, TSH: 0.40 };

function derive(s) {
  const [, , id, dom, psi, det] = s;
  const g = GUILD[dom] || 'for';
  const j = (id.charCodeAt(id.length - 1) % 3) - 1;
  s._occ = psi;
  s._den = det;
  s._ric = clamp(RBASE[g] + Math.round(det / 1420 * 3) + Math.round((psi - 0.4) / 0.57 * 3) + j, 4, 13);
  const sec = id.split('-')[0];
  s._pre = clamp((PBASE[sec] ?? 0.4) + (1 - psi) * 0.14 + (((id.charCodeAt(id.length - 1) % 5) - 2) * 0.02), 0.08, 0.98);
}

// each layer: display label, full name, unit, a low→high colour ramp, an accent
// dot, the field-blur radius, the station key it reads, and a value formatter
const LAYERS = {
  occupancy: { label: 'Occupancy', name: 'Occupancy ψ', unit: 'presence probability', stops: [[26, 20, 46], [74, 52, 138], [176, 130, 240], [214, 190, 255]], dot: '#B682F0', blur: 30, key: '_occ', fmt: (v) => v.toFixed(2) },
  density: { label: 'Density', name: 'Detection density', unit: 'detections · 30 d', stops: [[24, 16, 10], [120, 58, 18], [228, 138, 30], [255, 214, 96]], dot: '#F0A030', blur: 19, key: '_den', fmt: (v) => Math.round(v).toLocaleString() },
  richness: { label: 'Richness', name: 'Species richness', unit: 'species per station', stops: [[10, 26, 20], [24, 90, 58], [64, 196, 116], [176, 240, 196]], dot: '#4FD17A', blur: 26, key: '_ric', fmt: (v) => Math.round(v) },
  pressure: { label: 'Pressure', name: 'Human pressure', unit: 'intrusion index', stops: [[34, 12, 14], [128, 30, 36], [228, 68, 58], [255, 158, 120]], dot: '#F0604A', blur: 23, key: '_pre', fmt: (v) => v.toFixed(2) },
};
const ORDER = ['occupancy', 'density', 'richness', 'pressure'];

function ramp(stops, t) {
  t = clamp(t, 0, 1);
  const seg = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(seg)), f = seg - i;
  const c = (a, b) => Math.round(a + (b - a) * f);
  const [r, g, b] = [0, 1, 2].map((k) => c(stops[i][k], stops[i + 1][k]));
  return `rgb(${r},${g},${b})`;
}
const gradCss = (stops) => `linear-gradient(90deg,${stops.map((s, i) => `rgb(${s[0]},${s[1]},${s[2]}) ${Math.round(i / (stops.length - 1) * 100)}%`).join(',')})`;

const SVGNS = 'http://www.w3.org/2000/svg';
const el = (n, a = {}) => { const e = document.createElementNS(SVGNS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

export async function buildMap(geo, hostId, tip, opts = {}) {
  const host = document.getElementById(hostId);
  if (!host) return;

  // the operational central sector — the dense 2.5-km camera-trap grid, where an
  // interpolated surface is meaningful (Mikeno/Semliki satellites are far-flung)
  const V = { w: 29.24, e: 29.98, s: -1.12, n: -0.02 };
  const AR = (V.e - V.w) / (V.n - V.s);
  const W = 1000, H = Math.round(W / AR);
  const px = (lon) => (lon - V.w) / (V.e - V.w) * W, py = (lat) => (V.n - lat) / (V.n - V.s) * H;
  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${px(p[0]).toFixed(1)} ${py(p[1]).toFixed(1)}`).join('') + 'Z';
  const uid = hostId;

  const inView = geo.stations.filter((s) => { const x = px(s[0]), y = py(s[1]); return x >= -60 && x <= W + 60 && y >= -60 && y <= H + 60; });
  inView.forEach(derive);
  const norm = {};
  for (const k of ORDER) { const key = LAYERS[k].key; const vs = inView.map((s) => s[key]); const mn = Math.min(...vs), mx = Math.max(...vs); norm[k] = { mn, mx, t: (v) => (mx > mn ? (v - mn) / (mx - mn) : 0.5) }; }

  const sp = geo.species;
  const ctrlEl = opts.ctrl ? document.getElementById(opts.ctrl) : null;
  const legendEl = opts.legend ? document.getElementById(opts.legend) : null;
  let curLayer = opts.default || 'occupancy';
  function tpRow(lab, val, active) { return `<span class="tp-row${active ? ' on' : ''}"><em>${lab}</em>${val}</span>`; }

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'vmap', preserveAspectRatio: 'xMidYMid meet' });
  const defs = el('defs');
  const clip = el('clipPath', { id: `clip-${uid}` }); clip.appendChild(el('path', { d: path(geo.park) })); defs.appendChild(clip);
  for (const k of ORDER) { const f = el('filter', { id: `blur-${uid}-${k}`, x: '-25%', y: '-25%', width: '150%', height: '150%' }); f.appendChild(el('feGaussianBlur', { stdDeviation: LAYERS[k].blur })); defs.appendChild(f); }
  svg.appendChild(defs);

  svg.appendChild(el('path', { d: path(geo.park), class: 'vmap-park' }));

  // four inverse-distance fields, stacked; the active one is shown (CSS crossfade)
  const fields = {};
  for (const k of ORDER) {
    const L = LAYERS[k];
    const g = el('g', { class: 'vfield', 'data-layer': k, 'clip-path': `url(#clip-${uid})`, filter: `url(#blur-${uid}-${k})` });
    g.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: ramp(L.stops, 0) }));
    for (const s of inView) { const t = norm[k].t(s[L.key]); const x = px(s[0]), y = py(s[1]); g.appendChild(el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (30 + t * 54).toFixed(0), fill: ramp(L.stops, t), opacity: (0.32 + t * 0.56).toFixed(2) })); }
    fields[k] = g; svg.appendChild(g);
  }

  // Lake Edward over the field (water, not habitat), then the park rim on top
  svg.appendChild(el('path', { d: path(geo.edward), class: 'vmap-lake', 'clip-path': `url(#clip-${uid})` }));
  svg.appendChild(el('path', { d: path(geo.park), class: 'vmap-rim' }));

  const labels = [['RWINDI', 29.35, -0.9], ['RUTSHURU', 29.45, -1.03], ['LAKE EDWARD', 29.5, -0.4], ['ISHASHA', 29.64, -0.58], ['CENTRAL', 29.55, -0.76]];
  for (const [t, lon, lat] of labels) { const x = px(lon), y = py(lat); if (x < 0 || x > W || y < 0 || y > H) continue; const tx = el('text', { x: x.toFixed(0), y: y.toFixed(0), class: 'vmap-label' }); tx.textContent = t; svg.appendChild(tx); }

  // stations — cores recoloured/resized per active layer, tooltip lists all four
  const cores = [];
  const dots = el('g');
  for (const s of inView) {
    const x = px(s[0]), y = py(s[1]);
    const g = el('g', { class: 'vmap-st', tabindex: '0', role: 'button' });
    const halo = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 11, class: 'vmap-halo' });
    const core = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3.6, class: 'vmap-core', stroke: '#0a0812', 'stroke-width': 1 });
    g.appendChild(halo); g.appendChild(core);
    cores.push({ s, halo, core });
    const show = (ev) => {
      const [name, status] = sp[s[3]] || [s[3], ''];
      const cite = CITE[s[3]];
      tip.innerHTML = `<b>${s[2]} · ${name}</b>` +
        tpRow('occupancy ψ', s._occ.toFixed(2), curLayer === 'occupancy') +
        tpRow('detections · 30 d', s._den.toLocaleString(), curLayer === 'density') +
        tpRow('richness', s._ric + ' species', curLayer === 'richness') +
        tpRow('pressure', s._pre.toFixed(2), curLayer === 'pressure') +
        `<span class="tp-row"><em>IUCN</em>${status}</span>` +
        (cite ? `<span class="tp-cite">${cite[0]}<sup>${cite[1]}</sup></span>` : '');
      tip.classList.add('on');
      tip.style.left = Math.min(innerWidth - 244, ev.clientX + 14) + 'px';
      tip.style.top = Math.max(8, ev.clientY - 10) + 'px';
    };
    g.addEventListener('mouseenter', show);
    g.addEventListener('mousemove', show);
    g.addEventListener('focus', () => { const b = g.getBoundingClientRect(); show({ clientX: b.left + 6, clientY: b.top }); });
    g.addEventListener('mouseleave', () => tip.classList.remove('on'));
    g.addEventListener('blur', () => tip.classList.remove('on'));
    dots.appendChild(g);
  }
  svg.appendChild(dots);

  host.innerHTML = '';
  host.appendChild(svg);

  function applyLayer(k) {
    if (!LAYERS[k]) return;
    curLayer = k;
    const L = LAYERS[k];
    for (const kk of ORDER) fields[kk].classList.toggle('on', kk === k);
    for (const { s, halo, core } of cores) {
      const t = norm[k].t(s[L.key]);
      const col = ramp(L.stops, 0.28 + t * 0.72);
      core.style.fill = col;
      core.setAttribute('r', (2.8 + t * 3.4).toFixed(1));
      halo.style.fill = col;
    }
    if (legendEl) legendEl.innerHTML =
      `<span class="mleg-name" style="--c:${L.dot}">${L.name}</span>` +
      `<span class="mleg-ramp" style="background:${gradCss(L.stops)}"></span>` +
      `<span class="mleg-sc">${L.fmt(norm[k].mn)} → ${L.fmt(norm[k].mx)}</span>` +
      `<span class="map-leg-r">${inView.length} stations · ${L.unit}</span>`;
    if (ctrlEl) [...ctrlEl.children].forEach((b) => b.classList.toggle('on', b.dataset.k === k));
  }

  if (ctrlEl) {
    ctrlEl.innerHTML = ORDER.map((k) => `<button data-k="${k}"><i style="--c:${LAYERS[k].dot}"></i>${LAYERS[k].label}</button>`).join('');
    ctrlEl.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) applyLayer(b.dataset.k); });
  }
  applyLayer(curLayer);

  return { stations: inView.length, setLayer: applyLayer, layers: ORDER };
}

export function sourcesHTML() {
  return '<b>Sources</b>' + SOURCES.map(([f, s], i) =>
    `<span class="src-row"><sup>${i + 1}</sup><span>${f} — <em>${s}</em></span></span>`).join('');
}
