/* Landseed AI — the platform brain, live in the bay. The orb is the real
   buildShaman model; the purple dive chips open sample dashboards one at a
   time. All dashboard numbers are illustrative and labeled "sample data" —
   never remove those badges (repo CLAUDE.md · satellite rules). */

import * as THREE from 'three';
import { createWorld } from '/src/world.js';
import { buildShaman } from '/src/devices.js';

const world = createWorld(document.getElementById('scene'));
const { camera, root, controls } = world;

const orb = buildShaman(0x9B6CE0);
orb.position.y = .98;
root.add(orb);

/* the shells counter-rotate, the swarm drifts, the whole brain breathes */
const shells = [], swarms = [];
orb.traverse(o => {
  if (o.isMesh && o.geometry?.type === 'IcosahedronGeometry') shells.push(o);
  if (o.isPoints) swarms.push(o);
});
world.onTick = (t) => {
  orb.rotation.y = t * .1;
  orb.position.y = .98 + Math.sin(t * .7) * .045;
  shells.forEach((s, i) => { s.rotation.y = t * .22 * (i ? -1 : 1); s.rotation.x = Math.sin(t * .15) * .2; });
  swarms.forEach(p => { p.rotation.y = -t * .07; });
};

controls.target.set(0, .92, 0);
camera.position.set(1.65, 1.25, 2.75);
controls.minDistance = 1.1;
controls.maxDistance = 4.5;
controls.maxPolarAngle = 1.52;
controls.autoRotate = true;
controls.autoRotateSpeed = .55;
controls.update();
['pointerdown', 'wheel'].forEach(ev =>
  document.getElementById('scene').addEventListener(ev, () => { controls.autoRotate = false; }, { once: true, passive: true }));
world.start();

setTimeout(() => {
  const loader = document.getElementById('loader');
  loader.style.transition = 'opacity .7s'; loader.style.opacity = '0';
  setTimeout(() => loader.remove(), 800);
  document.body.classList.remove('booting');
}, 600);

/* ── sample dashboards — three distinct visual forms, one spotlight ───────── */
const prefersStill = matchMedia('(prefers-reduced-motion: reduce)').matches;

function sparkline(host) {
  const c = document.createElement('canvas');
  c.width = 560; c.height = 220; host.appendChild(c);
  const ctx = c.getContext('2d'), W = c.width, H = c.height, N = 48;
  const pts = Array.from({ length: N }, (_, i) =>
    H - 26 - (Math.sin(i * .42) * .5 + .5) * (H - 70) * (i > 30 ? 1 : .45) - (i === 38 ? 30 : 0));
  ctx.strokeStyle = '#9B6CE0'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((y, i) => ctx[i ? 'lineTo' : 'moveTo'](14 + i * (W - 28) / (N - 1), y));
  ctx.stroke();
  ctx.fillStyle = 'rgba(155,108,224,.14)';
  ctx.lineTo(W - 14, H - 10); ctx.lineTo(14, H - 10); ctx.closePath(); ctx.fill();
}

function bars(host, rows) {
  for (const [label, w, n] of rows) {
    const r = document.createElement('div'); r.className = 'dash-row';
    r.innerHTML = `<b>${label}</b><span class="bar"><i></i></span><em>0</em>`;
    host.appendChild(r);
    requestAnimationFrame(() => { r.querySelector('.bar i').style.width = w + '%'; });
    const em = r.querySelector('em');
    if (prefersStill) { em.textContent = n; continue; }
    const t0 = performance.now();
    (function tick(t) {
      const k = Math.min(1, (t - t0) / 900);
      em.textContent = Math.round(n * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
}

const DASHBOARDS = {
  detections: {
    title: 'Detections · 24 h',
    foot: 'every alert from the field network, streamed live',
    render(host) {
      sparkline(host);
      bars(host, [['Human', 72, 14], ['Elephant', 34, 6], ['Vehicle', 18, 3]]);
    },
  },
  occupancy: {
    title: 'Occupancy · sector grid',
    foot: 'occupancy, density and abundance, always current',
    render(host) {
      const heat = [12, 30, 8, 55, 74, 38, 15, 62, 88, 41, 22, 70, 33, 9, 48, 81, 27, 58, 17, 66, 35, 91, 44, 13, 52, 76, 29];
      const g = document.createElement('div'); g.className = 'dash-grid9';
      g.innerHTML = heat.map(v => `<i style="--v:${v}" title="sample sector · ${v}%"></i>`).join('');
      host.appendChild(g);
    },
  },
  alerts: {
    title: 'Alerts routed',
    foot: 'phones · email · operations rooms',
    render(host) {
      for (const [t, line] of [['18:39', 'Elephant ×3 · treeline → phones'], ['18:33', 'Human ×4 · river crossing → ops room'], ['18:12', 'Vehicle · east road → phones + email'], ['17:58', 'Gunshot signature · sector 7 → ops room']]) {
        const r = document.createElement('div'); r.className = 'dash-row';
        r.innerHTML = `<b>${t}</b><span style="flex:1">${line}</span>`;
        host.appendChild(r);
      }
    },
  },
};

const spot = document.getElementById('spot');
const chips = [...document.querySelectorAll('#chapters .chip.dive')];
let openName = null;

function openDash(name) {
  const d = DASHBOARDS[name];
  if (!d) return;
  openName = name;
  document.getElementById('spot-title').textContent = d.title;
  document.getElementById('spot-foot').textContent = d.foot;
  const body = document.getElementById('spot-body');
  body.innerHTML = '';
  d.render(body);
  spot.classList.add('on');
  chips.forEach(c => c.classList.toggle('on', c.dataset.dash === name));
}
function closeDash() {
  openName = null;
  spot.classList.remove('on');
  chips.forEach(c => c.classList.remove('on'));
}
chips.forEach(c => c.addEventListener('click', () => (openName === c.dataset.dash ? closeDash() : openDash(c.dataset.dash))));
document.getElementById('spot-close').addEventListener('click', closeDash);
spot.addEventListener('click', (e) => { if (e.target === spot) closeDash(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDash(); });

/* headless-verification hook — same doctrine as __hw / __demo (repo CLAUDE.md) */
window.__ai = {
  dashboards: Object.keys(DASHBOARDS),
  open: openDash,
  close: closeDash,
  active: () => openName,
  facts: { metrics: 'presence · occupancy · density · abundance' },
  scene: { orb: () => orb.visible, autoRotate: () => controls.autoRotate },
};
