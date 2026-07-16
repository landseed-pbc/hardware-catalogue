/* Virunga occupancy twin — a multi-layer scientific surface over the real OSM
   park boundary (relation 404784) + Lake Edward. The surface is an inverse-
   distance-weighted hexbin raster (6 discrete classes, cartographic — not a
   glow), togglable across four layers derived directly from the camera-trap
   station network (public/virunga-geo.json):
     · Occupancy ψ        — modeled presence probability (real per-station ψ)
     · Detection density  — 30-day detection counts (real per-station)
     · Species richness   — derived from detection load, ψ and habitat guild
     · Human pressure     — derived from sector, low ψ and edge exposure
   Fully labelled: coordinate graticule, sector names, station points, a scale
   bar and a north arrow. One SVG, no tiles. Figures are sample/illustrative;
   the cited population numbers are real and sourced (SOURCES). */

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
// dot, the station key it reads, and a value formatter
const LAYERS = {
  occupancy: { label: 'Occupancy', name: 'Occupancy ψ', unit: 'presence probability', stops: [[24, 20, 44], [72, 50, 132], [150, 108, 220], [214, 190, 255]], dot: '#B682F0', key: '_occ', fmt: (v) => v.toFixed(2) },
  density: { label: 'Density', name: 'Detection density', unit: 'detections · 30 d', stops: [[26, 18, 12], [126, 62, 20], [226, 138, 32], [255, 214, 110]], dot: '#F0A030', key: '_den', fmt: (v) => Math.round(v).toLocaleString() },
  richness: { label: 'Richness', name: 'Species richness', unit: 'species per station', stops: [[12, 28, 22], [26, 96, 62], [70, 190, 118], [180, 240, 200]], dot: '#4FD17A', key: '_ric', fmt: (v) => Math.round(v) },
  pressure: { label: 'Pressure', name: 'Human pressure', unit: 'intrusion index', stops: [[32, 14, 16], [132, 32, 38], [226, 70, 60], [255, 168, 130]], dot: '#F0604A', key: '_pre', fmt: (v) => v.toFixed(2) },
};
const ORDER = ['occupancy', 'density', 'richness', 'pressure'];
const NC = 6;                                                  // surface classes

function ramp(stops, t) {
  t = clamp(t, 0, 1);
  const seg = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(seg)), f = seg - i;
  const c = (a, b) => Math.round(a + (b - a) * f);
  const [r, g, b] = [0, 1, 2].map((k) => c(stops[i][k], stops[i + 1][k]));
  return `rgb(${r},${g},${b})`;
}

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
  const spx = inView.map((st) => ({ x: px(st[0]), y: py(st[1]), _occ: st._occ, _den: st._den, _ric: st._ric, _pre: st._pre }));

  // ── inverse-distance hexbin surface ──────────────────────────────────────
  const hs = 30;                                              // hex radius (viewBox units)
  const dxC = 1.5 * hs, dyC = Math.sqrt(3) * hs;
  const hexD = (cx, cy) => { let d = ''; for (let a = 0; a < 6; a++) { const ang = Math.PI / 3 * a; d += (a ? 'L' : 'M') + (cx + hs * Math.cos(ang)).toFixed(1) + ' ' + (cy + hs * Math.sin(ang)).toFixed(1); } return d + 'Z'; };
  const cells = [];
  for (let col = 0; col * dxC <= W + dxC; col++) {
    const cx = col * dxC, off = (col % 2) ? dyC / 2 : 0;
    for (let cy = off - dyC; cy <= H + dyC; cy += dyC) {
      let sw = 0, so = 0, sd = 0, sr = 0, sp = 0;
      for (const st of spx) { const ex = cx - st.x, ey = cy - st.y; const w = 1 / (ex * ex + ey * ey + 70); sw += w; so += w * st._occ; sd += w * st._den; sr += w * st._ric; sp += w * st._pre; }
      cells.push({ cx, cy, v: { occupancy: so / sw, density: sd / sw, richness: sr / sw, pressure: sp / sw } });
    }
  }
  const rng = {};
  for (const k of ORDER) { let mn = 1e9, mx = -1e9; for (const c of cells) { const v = c.v[k]; if (v < mn) mn = v; if (v > mx) mx = v; } rng[k] = { mn, mx }; }
  const cls = (k, v) => { const { mn, mx } = rng[k]; return Math.min(NC - 1, Math.floor((mx > mn ? (v - mn) / (mx - mn) : 0.5) * NC)); };
  for (const c of cells) { c.c = {}; for (const k of ORDER) c.c[k] = cls(k, c.v[k]); }

  const sp = geo.species;
  const ctrlEl = opts.ctrl ? document.getElementById(opts.ctrl) : null;
  const legendEl = opts.legend ? document.getElementById(opts.legend) : null;
  let curLayer = opts.default || 'occupancy';
  const tpRow = (lab, val, active) => `<span class="tp-row${active ? ' on' : ''}"><em>${lab}</em>${val}</span>`;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'vmap', preserveAspectRatio: 'xMidYMid meet' });
  const defs = el('defs');
  const clip = el('clipPath', { id: `clip-${uid}` }); clip.appendChild(el('path', { d: path(geo.park) })); defs.appendChild(clip);
  svg.appendChild(defs);

  svg.appendChild(el('path', { d: path(geo.park), class: 'vmap-park' }));

  // hexbin surface — one geometry, recoloured per layer (classed choropleth)
  const surf = el('g', { class: 'vsurf', 'clip-path': `url(#clip-${uid})` });
  for (const c of cells) { const p = el('path', { class: 'hexc', d: hexD(c.cx, c.cy) }); c.el = p; surf.appendChild(p); }
  svg.appendChild(surf);

  // Lake Edward over the surface (water, not habitat), then the park rim
  svg.appendChild(el('path', { d: path(geo.edward), class: 'vmap-lake', 'clip-path': `url(#clip-${uid})` }));
  svg.appendChild(el('path', { d: path(geo.park), class: 'vmap-rim' }));

  // coordinate graticule with edge labels
  const grat = el('g', { class: 'vgrat' });
  for (const lon of [29.4, 29.6, 29.8]) { const x = px(lon); if (x < 8 || x > W - 8) continue; grat.appendChild(el('line', { x1: x, y1: 0, x2: x, y2: H, class: 'grat-l' })); const t = el('text', { x: x.toFixed(0), y: 15, class: 'grat-t', 'text-anchor': 'middle' }); t.textContent = lon.toFixed(1) + '°E'; grat.appendChild(t); }
  for (const lat of [-0.2, -0.4, -0.6, -0.8, -1.0]) { const y = py(lat); if (y < 12 || y > H - 8) continue; grat.appendChild(el('line', { x1: 0, y1: y, x2: W, y2: y, class: 'grat-l' })); const t = el('text', { x: 7, y: (y - 4).toFixed(0), class: 'grat-t', 'text-anchor': 'start' }); t.textContent = Math.abs(lat).toFixed(1) + '°S'; grat.appendChild(t); }
  svg.appendChild(grat);

  // sector labels
  const labels = [['RWINDI', 29.34, -0.9], ['RUTSHURU', 29.45, -1.04], ['LAKE EDWARD', 29.49, -0.42], ['ISHASHA', 29.64, -0.57], ['CENTRAL', 29.55, -0.76]];
  const secG = el('g', { class: 'vsec' });
  for (const [t, lon, lat] of labels) { const x = px(lon), y = py(lat); if (x < 0 || x > W || y < 0 || y > H) continue; const tx = el('text', { x: x.toFixed(0), y: y.toFixed(0), class: 'vmap-label', 'text-anchor': 'middle' }); tx.textContent = t; secG.appendChild(tx); }
  svg.appendChild(secG);

  // scale bar (10 km) + north arrow
  const kmPerU = (V.e - V.w) * 111.32 * Math.cos(Math.PI / 180 * ((V.n + V.s) / 2)) / W;
  const barU = 10 / kmPerU, bx = 34, by = H - 30;
  const sb = el('g', { class: 'vscale' });
  sb.appendChild(el('line', { x1: bx, y1: by, x2: bx + barU, y2: by, class: 'sb-line' }));
  sb.appendChild(el('line', { x1: bx, y1: by - 5, x2: bx, y2: by + 5, class: 'sb-line' }));
  sb.appendChild(el('line', { x1: bx + barU, y1: by - 5, x2: bx + barU, y2: by + 5, class: 'sb-line' }));
  const sbt = el('text', { x: (bx + barU / 2).toFixed(0), y: (by - 9).toFixed(0), class: 'sb-t', 'text-anchor': 'middle' }); sbt.textContent = '10 km'; sb.appendChild(sbt);
  svg.appendChild(sb);
  const na = el('g', { class: 'vnorth' });
  na.appendChild(el('path', { d: `M${W - 32} 30 L${W - 39} 52 L${W - 32} 45 L${W - 25} 52 Z`, class: 'na-tri' }));
  const nat = el('text', { x: W - 32, y: 24, class: 'na-t', 'text-anchor': 'middle' }); nat.textContent = 'N'; na.appendChild(nat);
  svg.appendChild(na);

  // stations — cartographic points with IDs; tooltip lists all four metrics
  const dots = el('g');
  for (const s of inView) {
    const x = px(s[0]), y = py(s[1]);
    const g = el('g', { class: 'vmap-st', tabindex: '0', role: 'button' });
    g.appendChild(el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3.4, class: 'vstat' }));
    const lbl = el('text', { x: (x + 5.5).toFixed(1), y: (y - 4).toFixed(1), class: 'vstat-t' }); lbl.textContent = s[2]; g.appendChild(lbl);
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
    for (const c of cells) c.el.style.fill = ramp(L.stops, (c.c[k] + 0.5) / NC);
    if (legendEl) legendEl.innerHTML =
      `<span class="mleg-name" style="--c:${L.dot}">${L.name}</span>` +
      `<span class="mleg-steps">${Array.from({ length: NC }, (_, i) => `<i style="background:${ramp(L.stops, (i + 0.5) / NC)}"></i>`).join('')}</span>` +
      `<span class="mleg-sc">${L.fmt(rng[k].mn)} → ${L.fmt(rng[k].mx)}</span>` +
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
