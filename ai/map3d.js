/* Virunga 3D twin — real DEM relief (packed height PNG) + real ESRI satellite,
   both cropped to the operating area from the virunga-immersive terrain and
   downsampled to ~0.6 MB (procterrain). Species icons and data are the site's
   own (species.js). One displaced plane, no tile streaming — lightweight real.
   Lazy: built on first call. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SPECIES, iconSVG } from './species.js?v=1';
import { buildSerengeti, buildVillageGuard, buildGateway } from '/src/devices.js?v=146';

// the deployed field hardware, placed strategically across the park — the same
// 3D models as the catalogue & demo. Spaced into the gaps, clear of the wildlife
// area-markers. Landseed AI is the platform brain, not a field unit, so it is
// not placed on the map. [lat, lon]
const DEVLAYERS = {
  monitor:      { build: buildSerengeti,   hue: 0x00FF64, name: 'Monitor',      role: 'AI camera-alert · park protection', h: .12,
    pts: [[-1.2, 29.3], [-1.15, 29.545], [-1.05, 29.685], [-.95, 29.51], [-.6, 29.3], [-.3, 29.3], [-.3, 29.79]] },
  villageguard: { build: buildVillageGuard, hue: 0xFFC800, name: 'VillageGuard', role: 'multi-species · coexistence',       h: .13,
    pts: [[-1.4, 29.3], [-1.4, 29.65], [-1.4, 29.79], [-1.35, 29.405]] },
  gateway:      { build: buildGateway,      hue: 0x32C8FF, name: 'Relay Station', role: 'LoRa → LTE / satellite hub',        h: .16,
    pts: [[-1.25, 29.615], [-1.15, 29.755], [-.75, 29.685]] },
};

const BASE = '/public/terrain-vir/';
const KM = 111;

// station occupancy (from the sensor network) → shown on species/station hover
export async function buildTerrain(hostId, tip) {
  const host = document.getElementById(hostId);
  if (!host) return null;

  const [meta, geo] = await Promise.all([
    fetch(BASE + "meta.json?v=2").then(r => r.json()),
    fetch('/public/virunga-geo.json?v=1').then(r => r.json()),
  ]);
  const B = meta.bbox, midLat = (B.n + B.s) / 2;
  const SC = 42;
  const Wx = (B.e - B.w) * KM * Math.cos(midLat * Math.PI / 180) / SC;
  const Wz = (B.n - B.s) * KM / SC;
  const EX = 7.6;                                            // vertical exaggeration — taller relief fills the frame
  const hSpan = (meta.elevMax - meta.elevMin) / 1000 / SC * EX;

  // DEM → heights
  const demImg = await loadImg(BASE + "dem.png?v=2");
  const dc = document.createElement('canvas'); dc.width = demImg.width; dc.height = demImg.height;
  const dctx = dc.getContext('2d', { willReadFrequently: true }); dctx.drawImage(demImg, 0, 0);
  const dem = dctx.getImageData(0, 0, demImg.width, demImg.height).data;
  const DW = demImg.width, DH = demImg.height;
  const hAt = (u, v) => {                                    // u,v in [0,1], v top→bottom
    const i = Math.min(DW - 1, Math.max(0, Math.round(u * (DW - 1))));
    const j = Math.min(DH - 1, Math.max(0, Math.round(v * (DH - 1))));
    return dem[(j * DW + i) * 4] / 255 * hSpan;              // grayscale 0..1 × span
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.innerHTML = ''; host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0812, Wz * .9, Wz * 2.3);   // atmospheric depth
  const camera = new THREE.PerspectiveCamera(52, host.clientWidth / host.clientHeight, .05, 100);

  // terrain plane, displaced + real normals
  const SEG = 340;
  const geoP = new THREE.PlaneGeometry(Wx, Wz, Math.round(SEG * Wx / Wz), SEG);
  geoP.rotateX(-Math.PI / 2);
  const pos = geoP.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / Wx + 0.5, v = 0.5 - pos.getZ(i) / Wz;
    pos.setY(i, hAt(u, v));
  }
  geoP.computeVertexNormals();
  const satTex = await loadTex(BASE + 'sat.jpg?v=3');
  satTex.colorSpace = THREE.SRGBColorSpace; satTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mat = new THREE.MeshStandardMaterial({ map: satTex, roughness: 1, metalness: 0 });
  const terrain = new THREE.Mesh(geoP, mat);
  terrain.castShadow = true; terrain.receiveShadow = true;
  scene.add(terrain);

  // lat/lon → world; height sampled on the terrain
  const lonlat = (lat, lon) => {
    const u = (lon - B.w) / (B.e - B.w), v = (B.n - lat) / (B.n - B.s);
    return new THREE.Vector3((u - 0.5) * Wx, hAt(u, v) + 0.02, (v - 0.5) * Wz);
  };

  // park boundary rim, draped on the relief
  const ringPts = geo.park.filter(p => p[1] < B.n && p[1] > B.s && p[0] > B.w && p[0] < B.e)
    .map(p => { const q = lonlat(p[1], p[0]); q.y += 0.015; return q; });
  if (ringPts.length > 2) {
    const rim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0xb98cff, transparent: true, opacity: .8 }));
    scene.add(rim);
  }

  // lighting — low raking sun for strong relief definition + a soft sky fill
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x2a2418, .5));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
  sun.position.set(-Wx * 1.2, hSpan * 3 + 2, Wz * .1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = .1; sun.shadow.camera.far = Wz * 4;
  const sc = sun.shadow.camera; sc.left = -Wx; sc.right = Wx; sc.top = Wz * .7; sc.bottom = -Wz * .7; sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x3a4457, .38));

  // camera + controls — a low, near-horizon diagonal from the SE corner looking
  // up to the NW: the volcanoes stand against the sky, the whole map recedes in
  // view. Almost level, slightly above for perspective. No auto-rotate.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .09;
  controls.minDistance = Wz * .55; controls.maxDistance = Wz * 1.5;
  controls.maxPolarAngle = 1.46; controls.minPolarAngle = .35;
  controls.target.set(Wx * .05, hSpan * .05, Wz * .02);
  camera.position.set(-Wx * .58, Wz * .44, Wz * .84);
  controls.autoRotate = false;
  controls.update();
  const refDist = camera.position.distanceTo(controls.target);   // depth-scale reference

  // ── species icons + sensor stations, projected as DOM markers ──
  const layer = document.createElement('div');
  layer.className = 'vt-layer';
  host.appendChild(layer);

  const markers = [];
  // species (real Virunga icons + data) — only those inside the frame; collapse
  // near-coincident points of the same species so one local population reads as
  // one icon (keeps distribution real without stacking markers)
  for (const [key, s] of Object.entries(SPECIES)) {
    const kept = [];
    for (const [lat, lon] of s.pts) {
      if (lat >= B.n || lat <= B.s || lon <= B.w || lon >= B.e) continue;
      if (kept.some(([la, lo]) => Math.hypot(la - lat, lo - lon) < 0.07)) continue;
      kept.push([lat, lon]);
    }
    for (const [lat, lon] of kept) {
      const p = lonlat(lat, lon); p.y += hSpan * .06 + 0.05;
      const el = document.createElement('button');
      el.className = 'vt-sp';
      el.style.setProperty('--fa', s.color);
      el.innerHTML = iconSVG(s.icon);
      el.addEventListener('mouseenter', (e) => speciesTip(tip, s, e));
      el.addEventListener('mousemove', (e) => posTip(tip, e));
      el.addEventListener('mouseleave', () => tip.classList.remove('on'));
      el.addEventListener('focus', (e) => { const b = el.getBoundingClientRect(); speciesTip(tip, s, { clientX: b.left, clientY: b.top }); });
      el.addEventListener('blur', () => tip.classList.remove('on'));
      layer.appendChild(el);
      markers.push({ el, p, rad: 15, mass: 1 });             // species: bigger, heavier (dots yield)
    }
  }

  // ── sensors layer — the real 3D device models placed across the park ──
  const _box = new THREE.Box3();
  const deviceGroups = {}, hotspots = [];
  for (const [type, def] of Object.entries(DEVLAYERS)) {
    const grp = new THREE.Group();
    const hex = '#' + def.hue.toString(16).padStart(6, '0');
    for (const [lat, lon] of def.pts) {
      if (lat >= B.n || lat <= B.s || lon <= B.w || lon >= B.e) continue;
      const model = def.build(def.hue);
      _box.setFromObject(model);
      const sz = (_box.max.y - _box.min.y) || 1, s = def.h / sz;
      model.scale.setScalar(s);
      const wp = lonlat(lat, lon);
      model.position.set(wp.x, wp.y - _box.min.y * s, wp.z);
      const glow = new THREE.Color(def.hue);
      model.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = false;
        if (o.material && o.material.isMeshStandardMaterial) {
          o.material = o.material.clone();
          o.material.emissive = glow;
          o.material.emissiveIntensity = 0.14;
        }
      });
      grp.add(model);
      const hp = document.createElement('button');
      hp.className = 'vt-dev';
      hp.style.setProperty('--fa', hex);
      const dp = wp.clone(); dp.y += def.h * 1.05;
      hp.addEventListener('mouseenter', (e) => deviceTip(tip, def, e));
      hp.addEventListener('mousemove', (e) => posTip(tip, e));
      hp.addEventListener('mouseleave', () => tip.classList.remove('on'));
      layer.appendChild(hp);
      hotspots.push({ el: hp, p: dp, type });
    }
    scene.add(grp);
    deviceGroups[type] = grp;
  }

  // ── layers panel (top-right) — biodiversity + sensors with per-asset subs ──
  const state = { bio: true, sensors: true, dev: { monitor: true, villageguard: true, gateway: true } };
  const panel = document.createElement('div');
  panel.className = 'layers';
  panel.innerHTML =
    `<button class="lyr on" data-l="bio"><span class="ly-k"></span>Biodiversity</button>` +
    `<button class="lyr on" data-l="sensors"><span class="ly-k"></span>Sensors</button>` +
    `<div class="lyr-sub" id="lyr-sub">` +
    Object.entries(DEVLAYERS).map(([t, d]) =>
      `<button class="sub on" data-d="${t}"><i style="--c:#${d.hue.toString(16).padStart(6, '0')}"></i>${d.name}</button>`).join('') +
    `</div>`;
  host.appendChild(panel);
  const applyDevices = () => { for (const t in deviceGroups) deviceGroups[t].visible = state.sensors && state.dev[t]; };
  panel.querySelector('[data-l="bio"]').addEventListener('click', (e) => { state.bio = !state.bio; e.currentTarget.classList.toggle('on', state.bio); });
  panel.querySelector('[data-l="sensors"]').addEventListener('click', (e) => { state.sensors = !state.sensors; e.currentTarget.classList.toggle('on', state.sensors); panel.querySelector('#lyr-sub').classList.toggle('off', !state.sensors); applyDevices(); });
  panel.querySelectorAll('[data-d]').forEach(btn => btn.addEventListener('click', () => { const t = btn.dataset.d; state.dev[t] = !state.dev[t]; btn.classList.toggle('on', state.dev[t]); applyDevices(); }));
  applyDevices();

  // screen-space declutter — markers start at their true projected position and
  // only push apart where they overlap, so distribution stays real (not gridded)
  // and nothing collides from any orbit angle; species outweigh dots.
  const v = new THREE.Vector3();
  function project() {
    const w = host.clientWidth, h = host.clientHeight;
    for (const m of markers) {
      if (!state.bio) { m.el.style.opacity = '0'; m.skip = true; continue; }
      m.skip = false;
      v.copy(m.p).project(camera);
      m.behind = v.z > 1;
      m.sx = (v.x * .5 + .5) * w; m.sy = (-v.y * .5 + .5) * h;
      // perspective scale: near markers larger, far smaller — reads proportionate
      m.s = Math.max(.72, Math.min(1.28, refDist / camera.position.distanceTo(m.p)));
      m.rr = m.rad * m.s;
    }
    const vis = markers.filter(m => !m.skip && !m.behind);
    for (let it = 0; it < 44; it++) {
      for (let a = 0; a < vis.length; a++) for (let b = a + 1; b < vis.length; b++) {
        const A = vis[a], C = vis[b];
        const min = A.rr + C.rr;
        let dx = C.sx - A.sx, dy = C.sy - A.sy, d = Math.hypot(dx, dy) || .01;
        if (d < min) {
          const push = (min - d), inv = 1 / (A.mass + C.mass);
          dx /= d; dy /= d;
          A.sx -= dx * push * C.mass * inv; A.sy -= dy * push * C.mass * inv;
          C.sx += dx * push * A.mass * inv; C.sy += dy * push * A.mass * inv;
        }
      }
    }
    for (const m of markers) {
      if (m.skip) continue;
      m.el.style.opacity = m.behind ? '0' : '';
      m.el.style.left = m.sx.toFixed(1) + 'px';
      m.el.style.top = m.sy.toFixed(1) + 'px';
      m.el.style.setProperty('--s', m.s.toFixed(2));
    }
    // device hotspots — visibility tracks the sensors layer + per-asset sub
    for (const d of hotspots) {
      if (!state.sensors || !state.dev[d.type]) { d.el.style.opacity = '0'; continue; }
      v.copy(d.p).project(camera);
      if (v.z > 1) { d.el.style.opacity = '0'; continue; }
      const sc = Math.max(.75, Math.min(1.3, refDist / camera.position.distanceTo(d.p)));
      d.el.style.opacity = '';
      d.el.style.left = ((v.x * .5 + .5) * w).toFixed(1) + 'px';
      d.el.style.top = ((-v.y * .5 + .5) * h).toFixed(1) + 'px';
      d.el.style.setProperty('--s', sc.toFixed(2));
    }
  }

  // smooth fade-in on load
  renderer.domElement.style.opacity = '0';
  renderer.domElement.style.transition = 'opacity 1s ease';
  layer.style.opacity = '0';
  layer.style.transition = 'opacity 1s ease .3s';

  let alive = true, faded = false;
  function tick() {
    if (!alive) return;
    requestAnimationFrame(tick);
    if (host.offsetParent === null) return;                 // paused when its view is hidden
    controls.update();
    renderer.render(scene, camera);
    project();
    if (!faded) { faded = true; requestAnimationFrame(() => { renderer.domElement.style.opacity = '1'; layer.style.opacity = '1'; }); }
  }
  tick();

  const onResize = () => {
    if (!host.clientWidth) return;
    camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  };
  addEventListener('resize', onResize);

  return { species: Object.keys(SPECIES).length, stations: geo.stations.length, stop: () => { alive = false; } };
}

function speciesTip(tip, s, e) {
  const d = s.data;
  tip.innerHTML =
    `<span class="tp-illus" style="--fa:${s.color}">${iconSVG(s.icon)}</span>` +
    `<b>${d.name}</b><i class="tp-latin">${d.latin}</i>` +
    `<span class="tp-row"><em>IUCN</em>${d.status}</span>` +
    `<span class="tp-row"><em>${d.unit}</em>${d.now}</span>` +
    `<span class="tp-range">${d.range}</span>`;
  tip.className = 'vmap-tip vt-tip on';
  posTip(tip, e);
}
function deviceTip(tip, def, e) {
  tip.innerHTML =
    `<b style="color:${'#' + def.hue.toString(16).padStart(6, '0')}">${def.name}</b>` +
    `<span class="tp-row"><em>role</em>${def.role}</span>` +
    `<span class="tp-range">deployed across Virunga · sample placement</span>`;
  tip.className = 'vmap-tip vt-tip on';
  posTip(tip, e);
}
function posTip(tip, e) {
  tip.style.left = Math.min(innerWidth - 250, e.clientX + 14) + 'px';
  tip.style.top = Math.max(8, e.clientY - 10) + 'px';
}

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function loadTex(src) { return new Promise((res, rej) => new THREE.TextureLoader().load(src, res, undefined, rej)); }
