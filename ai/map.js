/* Virunga occupancy twin — a living map of the group's operating area, rendered
   from the real OSM park boundary (relation 404784) and Lake Edward, with a
   modeled occupancy surface driven by a camera-trap sensor network at real
   central-sector locations. All figures are sample/illustrative; the cited
   population numbers are real and sourced (see SOURCES). Lightweight: one SVG,
   a blurred inverse-distance field, no tiles, no Three.js. */

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

// occupancy ψ → purple sequential ramp (on-brand; low dim → high bright)
function ramp(psi) {
  const t = Math.max(0, Math.min(1, (psi - 0.35) / 0.62));
  const stops = [[26, 20, 46], [74, 52, 138], [176, 130, 240], [214, 190, 255]];
  const seg = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(seg)), f = seg - i;
  const c = (a, b) => Math.round(a + (b - a) * f);
  const [r, g, b] = [0, 1, 2].map(k => c(stops[i][k], stops[i + 1][k]));
  return `rgb(${r},${g},${b})`;
}

const SVGNS = 'http://www.w3.org/2000/svg';
const el = (n, a = {}) => { const e = document.createElementNS(SVGNS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

export async function buildMap(geo, hostId, tip) {
  const host = document.getElementById(hostId);
  if (!host) return;

  // view frame: the operational central sector (camera-trap zone), Mikeno to
  // the north Semliki edge trimmed — honest to where occupancy is monitored.
  const V = { w: 29.24, e: 29.98, s: -1.12, n: -0.02 };
  const AR = (V.e - V.w) / (V.n - V.s);          // width : height (deg ≈ equal length near equator)
  const W = 1000, H = Math.round(W / AR);
  const px = (lon) => (lon - V.w) / (V.e - V.w) * W;
  const py = (lat) => (V.n - lat) / (V.n - V.s) * H;
  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${px(p[0]).toFixed(1)} ${py(p[1]).toFixed(1)}`).join('') + 'Z';

  const uid = hostId;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'vmap', preserveAspectRatio: 'xMidYMid meet' });

  const defs = el('defs');
  const clip = el('clipPath', { id: `clip-${uid}` });
  clip.appendChild(el('path', { d: path(geo.park) }));
  defs.appendChild(clip);
  const blur = el('filter', { id: `blur-${uid}`, x: '-20%', y: '-20%', width: '140%', height: '140%' });
  blur.appendChild(el('feGaussianBlur', { stdDeviation: 26 }));
  defs.appendChild(blur);
  svg.appendChild(defs);

  // park body
  svg.appendChild(el('path', { d: path(geo.park), class: 'vmap-park' }));

  // occupancy field — blurred inverse-distance from the stations, clipped to park
  const field = el('g', { 'clip-path': `url(#clip-${uid})`, filter: `url(#blur-${uid})` });
  field.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: 'rgb(20,15,36)' }));
  for (const s of geo.stations) {
    const [lon, lat, id, dom, psi] = s;
    const x = px(lon), y = py(lat);
    if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
    field.appendChild(el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (34 + psi * 46).toFixed(0), fill: ramp(psi), opacity: (0.35 + psi * 0.5).toFixed(2) }));
  }
  svg.appendChild(field);

  // Lake Edward over the field (it is water, not habitat)
  svg.appendChild(el('path', { d: path(geo.edward), class: 'vmap-lake', 'clip-path': `url(#clip-${uid})` }));
  // park rim on top
  svg.appendChild(el('path', { d: path(geo.park), class: 'vmap-rim' }));

  // sector labels
  const labels = [
    ['RWINDI PLAINS', 29.31, -0.87], ['RUTSHURU', 29.44, -1.04],
    ['LAKE EDWARD', 29.52, -0.33], ['ISHASHA', 29.66, -0.6], ['CENTRAL SAVANNA', 29.56, -0.75],
  ];
  for (const [t, lon, lat] of labels) {
    const x = px(lon), y = py(lat);
    if (x < 0 || x > W || y < 0 || y > H) continue;
    svg.appendChild(el('text', { x: x.toFixed(0), y: y.toFixed(0), class: 'vmap-label' })).textContent = t;
  }

  // stations — interactive, pulsing, coloured by dominant species
  const sp = geo.species;
  const dots = el('g');
  for (const s of geo.stations) {
    const [lon, lat, id, dom, psi, det] = s;
    const x = px(lon), y = py(lat);
    if (x < 0 || x > W || y < 0 || y > H) continue;
    const col = (sp[dom] || [, , '#fff'])[2];
    const g = el('g', { class: 'vmap-st', tabindex: '0', role: 'button' });
    g.appendChild(el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 11, class: 'vmap-halo', fill: col }));
    g.appendChild(el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3.4, fill: col, stroke: '#0a0812', 'stroke-width': 1 }));
    const show = (ev) => {
      const [name, status] = sp[dom] || [dom, ''];
      const cite = CITE[dom];
      tip.innerHTML =
        `<b>${id} · ${name}</b>` +
        `<span class="tp-row"><em>occupancy ψ</em>${psi.toFixed(2)}</span>` +
        `<span class="tp-row"><em>detections · 30 d</em>${det.toLocaleString()}</span>` +
        `<span class="tp-row"><em>IUCN</em>${status}</span>` +
        (cite ? `<span class="tp-cite">${cite[0]}<sup>${cite[1]}</sup></span>` : '');
      tip.classList.add('on');
      const r = host.getBoundingClientRect();
      const cx = r.left + (x / W) * r.width * (r.height / (H / W * r.width) > 1 ? 1 : 1);
      // position via the event point for reliability
      tip.style.left = Math.min(r.right - 240, Math.max(r.left + 6, ev.clientX + 14)) + 'px';
      tip.style.top = Math.max(r.top + 6, ev.clientY - 10) + 'px';
    };
    g.addEventListener('mouseenter', show);
    g.addEventListener('mousemove', show);
    g.addEventListener('focus', (e) => { const b = g.getBoundingClientRect(); show({ clientX: b.left + 6, clientY: b.top }); });
    g.addEventListener('mouseleave', () => tip.classList.remove('on'));
    g.addEventListener('blur', () => tip.classList.remove('on'));
    dots.appendChild(g);
  }
  svg.appendChild(dots);

  host.innerHTML = '';
  host.appendChild(svg);
  return { stations: geo.stations.length };
}

export function sourcesHTML() {
  return '<b>Sources</b>' + SOURCES.map(([f, s], i) =>
    `<span class="src-row"><sup>${i + 1}</sup><span>${f} — <em>${s}</em></span></span>`).join('');
}
