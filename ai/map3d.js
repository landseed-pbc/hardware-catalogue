/* Virunga 3D twin — real DEM relief (packed height PNG) + real ESRI satellite,
   both cropped to the operating area from the virunga-immersive terrain and
   downsampled to ~0.6 MB (procterrain). Species icons and data are the site's
   own (species.js). One displaced plane, no tile streaming — lightweight real.
   Lazy: built on first call. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SPECIES, iconSVG } from './species.js?v=1';

const BASE = '/public/terrain-vir/';
const KM = 111;

// station occupancy (from the sensor network) → shown on species/station hover
export async function buildTerrain(hostId, tip) {
  const host = document.getElementById(hostId);
  if (!host) return null;

  const [meta, geo] = await Promise.all([
    fetch(BASE + 'meta.json?v=1').then(r => r.json()),
    fetch('/public/virunga-geo.json?v=1').then(r => r.json()),
  ]);
  const B = meta.bbox, midLat = (B.n + B.s) / 2;
  const SC = 42;
  const Wx = (B.e - B.w) * KM * Math.cos(midLat * Math.PI / 180) / SC;
  const Wz = (B.n - B.s) * KM / SC;
  const EX = 2.6;                                            // vertical exaggeration
  const hSpan = (meta.elevMax - meta.elevMin) / 1000 / SC * EX;

  // DEM → heights
  const demImg = await loadImg(BASE + 'dem.png?v=1');
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
  renderer.toneMappingExposure = 1.15;
  host.innerHTML = ''; host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, .05, 100);

  // terrain plane, displaced + real normals
  const SEG = 220;
  const geoP = new THREE.PlaneGeometry(Wx, Wz, Math.round(SEG * Wx / Wz), SEG);
  geoP.rotateX(-Math.PI / 2);
  const pos = geoP.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / Wx + 0.5, v = 0.5 - pos.getZ(i) / Wz;
    pos.setY(i, hAt(u, v));
  }
  geoP.computeVertexNormals();
  const satTex = await loadTex(BASE + 'sat.jpg?v=1');
  satTex.colorSpace = THREE.SRGBColorSpace; satTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mat = new THREE.MeshStandardMaterial({ map: satTex, roughness: .95, metalness: 0 });
  const terrain = new THREE.Mesh(geoP, mat);
  terrain.receiveShadow = true;
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

  // lighting — golden hour
  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x2a2418, .55));
  const sun = new THREE.DirectionalLight(0xffe8c4, 2.1);
  sun.position.set(-Wx, hSpan * 6 + 3, Wz * .3);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x404a5a, .5));

  // camera + controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minDistance = Wz * .5; controls.maxDistance = Wz * 1.6;
  controls.maxPolarAngle = 1.35; controls.minPolarAngle = .2;
  controls.target.set(0, 0, 0);
  camera.position.set(Wx * .7, Wz * .85, Wz * .95);
  controls.autoRotate = true; controls.autoRotateSpeed = .35;
  controls.update();
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; }, { once: true });

  // ── species icons + sensor stations, projected as DOM markers ──
  const layer = document.createElement('div');
  layer.className = 'vt-layer';
  host.appendChild(layer);

  const markers = [];
  // species (real Virunga icons + data) — only those inside the frame
  for (const [key, s] of Object.entries(SPECIES)) {
    for (const [lat, lon] of s.pts) {
      if (lat >= B.n || lat <= B.s || lon <= B.w || lon >= B.e) continue;
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
      markers.push({ el, p });
    }
  }
  // sensor stations — occupancy dots with ψ hovers
  const SPP = geo.species;
  for (const st of geo.stations) {
    const [lon, lat, id, dom, psi, det] = st;
    if (lat >= B.n || lat <= B.s || lon <= B.w || lon >= B.e) continue;
    const p = lonlat(lat, lon); p.y += 0.04;
    const el = document.createElement('button');
    el.className = 'vt-st';
    const col = (SPP[dom] || [, , '#9B6CE0'])[2];
    el.style.setProperty('--fa', col);
    el.style.setProperty('--r', (3 + psi * 4).toFixed(1) + 'px');
    el.addEventListener('mouseenter', (e) => stationTip(tip, st, SPP, e));
    el.addEventListener('mousemove', (e) => posTip(tip, e));
    el.addEventListener('mouseleave', () => tip.classList.remove('on'));
    layer.appendChild(el);
    markers.push({ el, p, st: true });
  }

  const v = new THREE.Vector3();
  function project() {
    const w = host.clientWidth, h = host.clientHeight;
    for (const m of markers) {
      v.copy(m.p).project(camera);
      const behind = v.z > 1;
      m.el.style.opacity = behind ? '0' : '';
      m.el.style.left = ((v.x * .5 + .5) * w).toFixed(1) + 'px';
      m.el.style.top = ((-v.y * .5 + .5) * h).toFixed(1) + 'px';
    }
  }

  let alive = true;
  function tick() {
    if (!alive) return;
    requestAnimationFrame(tick);
    if (host.offsetParent === null) return;                 // paused when its view is hidden
    controls.update();
    renderer.render(scene, camera);
    project();
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
function stationTip(tip, st, SPP, e) {
  const [lon, lat, id, dom, psi, det] = st;
  const name = (SPP[dom] || [dom])[0];
  tip.innerHTML =
    `<b>${id} · camera-trap</b>` +
    `<span class="tp-row"><em>dominant</em>${name}</span>` +
    `<span class="tp-row"><em>occupancy ψ</em>${psi.toFixed(2)}</span>` +
    `<span class="tp-row"><em>detections · 30 d</em>${det.toLocaleString()}</span>`;
  tip.className = 'vmap-tip vt-tip on';
  posTip(tip, e);
}
function posTip(tip, e) {
  tip.style.left = Math.min(innerWidth - 250, e.clientX + 14) + 'px';
  tip.style.top = Math.max(8, e.clientY - 10) + 'px';
}

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function loadTex(src) { return new Promise((res, rej) => new THREE.TextureLoader().load(src, res, undefined, rej)); }
