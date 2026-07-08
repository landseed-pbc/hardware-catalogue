// ── demo.js v2 — the field demonstration ──────────────────────────────────
// A simulated protected landscape with every Landseed product at work.
// Cinematography doctrine: drone altitude, oblique 30–45° angles, camera in
// the south-east looking north-west so the ridge, river and village keep the
// viewer oriented; the sector map holds the whole board at all times.
// Show, don't tell — every beat is a product doing its actual job.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BUILDERS } from '../src/devices.js?v=5';

const $ = (s) => document.querySelector(s);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const HUES = { see: 0x00FF64, guard: 0xFFC800, link: 0x32C8FF, listen: 0xE682E6, brain: 0x9B6CE0, report: 0x1482FF };

/* ── renderer / scene / light ───────────────────────────────────────────── */

const renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2b3630, 0.009);

// dusk sky + low sun + first stars
{
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#0b1626'); g.addColorStop(.40, '#22394a');
  g.addColorStop(.58, '#6a6a58'); g.addColorStop(.70, '#d99a55'); g.addColorStop(.78, '#8a5f3c'); g.addColorStop(1, '#3a3c33');
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(230, 24, 18), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })));
  // stars, upper dome
  const N = 220, sp = new Float32Array(N * 3);
  let sd = 5; const srnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) {
    const th = srnd() * Math.PI * 2, ph = Math.acos(1 - srnd() * .55);
    sp[i * 3] = 210 * Math.sin(ph) * Math.cos(th);
    sp[i * 3 + 1] = 210 * Math.cos(ph);
    sp[i * 3 + 2] = 210 * Math.sin(ph) * Math.sin(th);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfe0ee, size: .5, transparent: true, opacity: .5, fog: false })));
}

const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, .1, 500);
const camP = { x: 40, y: 22, z: 38 }, camL = { x: -4, y: 0, z: -2 };

scene.add(new THREE.HemisphereLight(0xbdd4e0, 0x2c2517, .68));
const sun = new THREE.DirectionalLight(0xffc98f, 2.5);
sun.position.set(-40, 13, 12);                                       // low in the west — long dusk shadows
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -44;
sun.shadow.camera.right = sun.shadow.camera.top = 44;
sun.shadow.camera.far = 140;
sun.shadow.bias = -0.0008;
scene.add(sun);
// visible sun glow at the horizon
{
  const sunDir = V3(-40, 13, 12).normalize();
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const sx = sc.getContext('2d');
  const gg = sx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gg.addColorStop(0, 'rgba(255,232,190,1)'); gg.addColorStop(.25, 'rgba(255,190,110,.55)'); gg.addColorStop(1, 'rgba(255,160,80,0)');
  sx.fillStyle = gg; sx.fillRect(0, 0, 128, 128);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, fog: false, depthWrite: false }));
  spr.position.copy(sunDir.multiplyScalar(215));
  spr.scale.setScalar(70);
  scene.add(spr);
}

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .3, .8, .85));
composer.addPass(new OutputPass());

/* ── terrain ────────────────────────────────────────────────────────────── */

let seed = 20260708;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hashes = new Float32Array(4096);
for (let i = 0; i < 4096; i++) hashes[i] = rnd();
const hAt = (i, j) => hashes[((i * 73 + j * 149) & 4095)];
function noise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  return (hAt(i, j) * (1 - su) + hAt(i + 1, j) * su) * (1 - sv) +
         (hAt(i, j + 1) * (1 - su) + hAt(i + 1, j + 1) * su) * sv;
}
const riverZ = (x) => 4.5 + 5.5 * Math.sin((x + 32) * .09);
function heightAt(x, z) {
  let h = 1.5 * noise(x * .06 + 9, z * .06 + 4) + .55 * noise(x * .16, z * .16) + .22 * noise(x * .4, z * .4) - .72;
  h += 5.6 * Math.exp(-((x + 24) ** 2) / 52) * (0.7 + 0.3 * noise(z * .1, 3));   // western ridge
  const dr = z - riverZ(x);
  h -= 2.2 * Math.exp(-(dr * dr) / 2.4);                                          // river trench
  const gv = Math.exp(-(((x - 17) ** 2 + (z + 12.5) ** 2)) / 30);
  h = h * (1 - gv) + .5 * gv;                                                     // village flat
  return Math.max(h, -1.7);
}

const trail = new THREE.CatmullRomCurve3([
  V3(30, 0, 18), V3(21, 0, 14.5), V3(13, 0, 11), V3(6, 0, 9), V3(0, 0, 7.2), V3(-6, 0, 2.5), V3(-10, 0, -1.5),
]);
const road = new THREE.CatmullRomCurve3([
  V3(16, 0, -11.5), V3(10, 0, -9.5), V3(4, 0, -7), V3(-2, 0, -3), V3(-6, 0, 1.5),
]);
const herdIn = new THREE.CatmullRomCurve3([V3(0, 0, 12), V3(4.5, 0, 7), V3(8.5, 0, 1), V3(11.2, 0, -3.6), V3(12.4, 0, -6.4)]);
const herdOut = new THREE.CatmullRomCurve3([V3(12.4, 0, -6.4), V3(10, 0, -2.5), V3(5.5, 0, 3.5), V3(0, 0, 8), V3(-4, 0, 11)]);
function nearCurve(curve, x, z, n = 60) {
  let m = 1e9;
  for (let i = 0; i <= n; i++) {
    const p = curve.getPoint(i / n);
    m = Math.min(m, (p.x - x) ** 2 + (p.z - z) ** 2);
  }
  return Math.sqrt(m);
}

{
  const geo = new THREE.PlaneGeometry(110, 84, 190, 146).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cGrass1 = new THREE.Color(0x50713a), cGrass2 = new THREE.Color(0x687f41), cDry = new THREE.Color(0x8a8a4e);
  const cForest = new THREE.Color(0x33512c), cRock = new THREE.Color(0x77685a);
  const cSand = new THREE.Color(0x94805a), cDirt = new THREE.Color(0x6f5c40);
  const cCrop = new THREE.Color(0x9c964e);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const n = noise(x * .11 + 40, z * .11 + 7);
    tmp.copy(cGrass1).lerp(cGrass2, n).lerp(cDry, Math.max(0, (-z - 6) / 30) * .5);   // dryer to the south
    if (n > .55 && z > -8 && x > -20 && x < 10) tmp.lerp(cForest, .75);
    if (h > 3.2) tmp.lerp(cRock, Math.min(1, (h - 3.2) / 1.6));
    if (Math.abs(z - riverZ(x)) < 2.1) tmp.lerp(cSand, .55);
    if (nearCurve(trail, x, z, 40) < 1) tmp.lerp(cDirt, .55);
    if (nearCurve(road, x, z, 30) < 1.1) tmp.lerp(cDirt, .7);
    const cropD = ((x - 12.6) ** 2) / 9 + ((z + 7) ** 2) / 5;
    if (cropD < 1) tmp.lerp(cCrop, .8 * (1 - cropD * .4) * (0.75 + .25 * Math.sin(z * 6)));
    tmp.multiplyScalar(.94 + .12 * noise(x * .8, z * .8));                            // micro variation
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  // slope shading — steep faces darken so landforms read from altitude
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const s = 1 - Math.min(.45, (1 - nor.getY(i)) * 1.3);
    col[i * 3] *= s; col[i * 3 + 1] *= s; col[i * 3 + 2] *= s;
  }
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 }));
  ground.receiveShadow = true;
  scene.add(ground);
}

const water = new THREE.Mesh(
  new THREE.PlaneGeometry(110, 84).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x2e5f6e, roughness: .12, metalness: .35, transparent: true, opacity: .9 }));
water.position.y = -.35;
scene.add(water);

/* ── vegetation & rocks (instanced, three species) ──────────────────────── */

const SPOTS = [[6.8, 10.2], [-4.5, 5.6], [12.9, -8.6], [-12, 10.5], [-8.5, 15.5], [-15.5, 14.5], [-3, 14.5], [-21.5, -3.5]];
function scatterOK(x, z, h) {
  if (h < -.2 || h > 3.6) return false;
  if (Math.abs(z - riverZ(x)) < 2.4) return false;
  if (nearCurve(trail, x, z, 30) < 1.8) return false;
  if (nearCurve(road, x, z, 20) < 1.8) return false;
  if ((x - 17) ** 2 + (z + 12.5) ** 2 < 42) return false;
  if (SPOTS.some(([sx, sz]) => (x - sx) ** 2 + (z - sz) ** 2 < 8)) return false;
  if (nearCurve(herdIn, x, z, 30) < 2.4) return false;               // keep the elephant lane open
  if (((x - 12.6) ** 2) / 9 + ((z + 7) ** 2) / 5 < 1.4) return false; // and the crops
  return true;
}
{
  const inForest = (x, z) => noise(x * .11 + 40, z * .11 + 7) > .53 && z > -8 && x > -20 && x < 10;
  const trunkG = new THREE.CylinderGeometry(.08, .13, 1, 6);
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x4a3b28, roughness: .9 });
  const conG = new THREE.ConeGeometry(.8, 1.7, 7);
  const blobG = new THREE.SphereGeometry(.85, 8, 6);
  const accG = new THREE.CylinderGeometry(1.5, 1.1, .5, 8);
  const leafM = () => new THREE.MeshStandardMaterial({ roughness: .92 });
  const NT = 620;
  const trunks = new THREE.InstancedMesh(trunkG, trunkM, NT);
  const cons = new THREE.InstancedMesh(conG, leafM(), NT);
  const blobs = new THREE.InstancedMesh(blobG, leafM(), NT);
  const accs = new THREE.InstancedMesh(accG, leafM(), 80);
  trunks.castShadow = cons.castShadow = blobs.castShadow = accs.castShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  const G1 = new THREE.Color(0x41682f), G2 = new THREE.Color(0x2f5527), G3 = new THREE.Color(0x557539), GA = new THREE.Color(0x74854a);
  const Y = new THREE.Vector3(0, 1, 0);
  let nTr = 0, nCo = 0, nBl = 0, nAc = 0, guard = 0;
  while (nTr < NT && guard++ < 14000) {
    const x = (rnd() - .5) * 72, z = (rnd() - .5) * 52;
    const h = heightAt(x, z);
    const forest = inForest(x, z);
    const savanna = z < -9 && x < 9 && rnd() < .05;
    if (!(forest || savanna) || !scatterOK(x, z, h)) continue;
    const sc = .75 + rnd() * .95;
    pv.set(x, h + .5 * sc, z); q.setFromAxisAngle(Y, rnd() * 6.28); sv.set(1, sc, 1);
    m.compose(pv, q, sv); trunks.setMatrixAt(nTr++, m);
    if (savanna && nAc < 80) {                     // flat-top acacia
      pv.set(x, h + sc * 1.28, z); sv.set(sc, sc, sc);
      m.compose(pv, q, sv); accs.setMatrixAt(nAc, m); accs.setColorAt(nAc, GA); nAc++;
    } else if (rnd() > .45 && nCo < NT) {          // conifer
      pv.set(x, h + sc * 1.3, z); sv.set(sc, sc * (1 + rnd() * .4), sc);
      m.compose(pv, q, sv); cons.setMatrixAt(nCo, m); cons.setColorAt(nCo, rnd() > .5 ? G1 : G2); nCo++;
    } else if (nBl < NT) {                         // broadleaf
      pv.set(x, h + sc * 1.32, z); sv.set(sc * 1.02, sc * .8, sc * 1.02);
      m.compose(pv, q, sv); blobs.setMatrixAt(nBl, m); blobs.setColorAt(nBl, rnd() > .5 ? G3 : G1); nBl++;
    }
  }
  trunks.count = nTr; cons.count = nCo; blobs.count = nBl; accs.count = nAc;
  scene.add(trunks, cons, blobs, accs);

  // bushes + rocks
  const bushes = new THREE.InstancedMesh(new THREE.SphereGeometry(.4, 7, 5), leafM(), 220);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.5),
    new THREE.MeshStandardMaterial({ color: 0x7b7266, roughness: .95, flatShading: true }), 90);
  rocks.castShadow = true;
  let nB = 0, nR = 0; guard = 0;
  while ((nB < 220 || nR < 90) && guard++ < 9000) {
    const x = (rnd() - .5) * 72, z = (rnd() - .5) * 52;
    const h = heightAt(x, z);
    if (!scatterOK(x, z, h)) continue;
    if (nB < 220 && rnd() > .35) {
      const sc = .5 + rnd() * .9;
      pv.set(x, h + .22 * sc, z); q.identity(); sv.set(sc, sc * .7, sc);
      m.compose(pv, q, sv); bushes.setMatrixAt(nB, m);
      bushes.setColorAt(nB, rnd() > .5 ? G3 : G2); nB++;
    } else if (nR < 90) {
      const sc = .3 + rnd() * (h > 2.4 ? 1.6 : .6);
      pv.set(x, h + .18 * sc, z); q.setFromAxisAngle(Y, rnd() * 3); sv.set(sc, sc * .8, sc);
      m.compose(pv, q, sv); rocks.setMatrixAt(nR, m); nR++;
    }
  }
  bushes.count = nB; rocks.count = nR;
  scene.add(bushes, rocks);
}

/* ── park boundary ──────────────────────────────────────────────────────── */
{
  const pts = [];
  const loop = [[-28, -18], [10, -18], [10, 22], [-28, 22]];
  for (let s2 = 0; s2 < 4; s2++) {
    const [ax, az] = loop[s2], [bx, bz] = loop[(s2 + 1) % 4];
    for (let i = 0; i < 40; i++) {
      const u = i / 40, x = ax + (bx - ax) * u, z = az + (bz - az) * u;
      pts.push(V3(x, heightAt(x, z) + .12, z));
    }
  }
  pts.push(pts[0].clone());
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xe4efdd, dashSize: .7, gapSize: .5, transparent: true, opacity: .45 }));
  l.computeLineDistances();
  scene.add(l);
}

/* ── village + HQ ───────────────────────────────────────────────────────── */

const lampMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc36b, emissiveIntensity: 0 });
const villageLight = new THREE.PointLight(0xffc36b, 0, 10);
{
  const hutW = new THREE.MeshStandardMaterial({ color: 0xb09062, roughness: .9 });
  const hutR = new THREE.MeshStandardMaterial({ color: 0x6b4f30, roughness: .95 });
  for (const [x, z] of [[15.2, -14.4], [17.6, -15.2], [19.6, -13.4], [18.9, -10.8], [15.8, -10.2], [20.4, -15.8]]) {
    const h = heightAt(x, z);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.85, .95, 1.1, 8), hutW);
    w.position.set(x, h + .55, z); w.castShadow = true;
    const r = new THREE.Mesh(new THREE.ConeGeometry(1.25, .95, 8), hutR);
    r.position.set(x, h + 1.55, z); r.castShadow = true;
    scene.add(w, r);
  }
  const hx = 17, hz = -12.3, hh = heightAt(hx, hz);
  const hq = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 2), new THREE.MeshStandardMaterial({ color: 0x555c50, roughness: .8 }));
  hq.position.set(hx, hh + .75, hz); hq.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, .14, 2.3), new THREE.MeshStandardMaterial({ color: 0x3a4038 }));
  roof.position.set(hx, hh + 1.57, hz);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0x8a9390, metalness: .8, roughness: .35 }));
  mast.position.set(hx + 1, hh + 2.8, hz - .7);
  // warm windows — someone is on duty
  const win = new THREE.Mesh(new THREE.PlaneGeometry(.5, .34), new THREE.MeshStandardMaterial({ color: 0x0c0c0a, emissive: 0xffb45e, emissiveIntensity: 1.6 }));
  win.position.set(hx - .4, hh + .8, hz + 1.01);
  const win2 = win.clone(); win2.position.x = hx + .5;
  scene.add(hq, roof, mast, win, win2);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x5a5148 }));
  const lh = heightAt(17.5, -13.8);
  pole.position.set(17.5, lh + 1.2, -13.8);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 10), lampMat);
  bulb.position.set(17.5, lh + 2.45, -13.8);
  villageLight.position.set(17.5, lh + 2.4, -13.8);
  scene.add(pole, bulb, villageLight);
}
const HQ_TOP = V3(17, heightAt(17, -12.3) + 2.2, -12.3);

/* ── sensors — the real product models + ground FOV wedges ──────────────── */

const spins = [], pulses = [], wavers = [], floaters = [];
function place(id, x, z, ry, sc = 2) {
  const g = BUILDERS[id]({ serengeti: HUES.see, villageguard: HUES.guard, gateway: HUES.link, junglewallah: 0xFF8C42, wolf: HUES.listen, mobile: HUES.report, ai: HUES.brain }[id]);
  const h = heightAt(x, z);
  g.position.set(x, h, z);
  g.rotation.y = ry;
  g.scale.setScalar(sc);
  (g.userData.spin || []).forEach(s => spins.push(s));
  (g.userData.pulse || []).forEach(mm => { mm.userData.base = mm.emissiveIntensity; pulses.push(mm); });
  (g.userData.waves || []).forEach(w => wavers.push(w));
  if (g.userData.float) { g.userData.baseY = h + .4; floaters.push(g); }
  scene.add(g);
  return g;
}

place('serengeti', 6.8, 10.2, 1.4, 1.9);
place('serengeti', -4.5, 5.6, 1.25, 1.9);
place('villageguard', 12.9, -8.6, -.4, 1.9);
const wolves = [place('wolf', -12, 10.5, .6, 2.1), place('wolf', -8.5, 15.5, 0, 2.1), place('wolf', -15.5, 14.5, 1, 2.1)];
place('junglewallah', -3, 14.5, 2.4, 1.9);
place('gateway', -21.5, -3.5, 1.1, 2.6);
const sAI = place('ai', 17, -12.3, 0, .85);
sAI.position.y = heightAt(17, -12.3) + 2.6;
sAI.userData.baseY = sAI.position.y;

// ground-projected FOV wedge — reads perfectly from drone altitude
function fovWedge(x, z, ang, hue, R = 8, spread = .5) {
  const segs = 22, verts = [];
  for (let i = 0; i < segs; i++) {
    const a0 = ang - spread + (2 * spread) * (i / segs);
    const a1 = ang - spread + (2 * spread) * ((i + 1) / segs);
    const p0 = [x + Math.sin(a0) * R, z + Math.cos(a0) * R];
    const p1 = [x + Math.sin(a1) * R, z + Math.cos(a1) * R];
    verts.push(x, heightAt(x, z) + .16, z);
    verts.push(p0[0], heightAt(p0[0], p0[1]) + .16, p0[1]);
    verts.push(p1[0], heightAt(p1[0], p1[1]) + .16, p1[1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  const mat = new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(g, mat));
  return mat;
}
const fovSer1 = fovWedge(6.8, 10.2, 1.39, HUES.see, 8.5, .42);
const fovSer2 = fovWedge(-4.5, 5.6, 1.23, HUES.see, 7.5, .42);
const fovVG = fovWedge(12.9, -8.6, -.38, HUES.guard, 8, .52);

/* ── satellite ──────────────────────────────────────────────────────────── */

const sat = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(.7, .5, .5), new THREE.MeshStandardMaterial({ color: 0xc4ccd0, metalness: .8, roughness: .3 }));
  const pm = new THREE.MeshStandardMaterial({ color: 0x1e4a8a, metalness: .5, roughness: .4 });
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, .05, .8), pm); p1.position.x = 1.6;
  const p2 = p1.clone(); p2.position.x = -1.6;
  sat.add(body, p1, p2);
  sat.position.set(-2, 27, -2);
  scene.add(sat);
}

/* ── actors ─────────────────────────────────────────────────────────────── */

function figure(color, h = .8, skin = 0x6b503c) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.19, h * .58, 3, 8), new THREE.MeshStandardMaterial({ color, roughness: .85 }));
  body.position.y = h * .66; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.15, 10, 10), new THREE.MeshStandardMaterial({ color: skin, roughness: .8 }));
  head.position.y = h * 1.22;
  g.add(body, head);
  return g;
}
// torch beam — a warm additive cone + a pool of light on the ground ahead
function torch(fig, hue = 0xffd9a0) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.32, 2.4, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  cone.rotation.x = Math.PI / 2 - .28;
  cone.position.set(.12, .78, 1.35);
  fig.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(.42, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.position.set(.12, -.35, 2.4);
  fig.add(pool);
  return cone;
}

const poachers = new THREE.Group();
const pFigs = [figure(0x3a3229, .85), figure(0x473a2a, .8), figure(0x2e2c26, .82)];
pFigs.forEach((f, i) => {
  f.position.set(-.55 + i * .6, 0, (i % 2) * .6 - .25);
  f.scale.setScalar(1.35);
  poachers.add(f);
});
const torches = pFigs.map(f => torch(f));
const rifle = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .9, 5), new THREE.MeshStandardMaterial({ color: 0x241f18 }));
rifle.rotation.z = 1.12; rifle.position.set(-.34, .95, -.15);
pFigs[0].add(rifle);
scene.add(poachers);
const poach = { u: 0.02, stopped: false };

// the informant at the north track, Landseed Mobile in hand
const informant = figure(0x4e5a66, .82);
informant.position.set(26.5, heightAt(26.5, 16.6), 16.6);
informant.rotation.y = -2.2;
const phone = new THREE.Mesh(new THREE.PlaneGeometry(.16, .24), new THREE.MeshStandardMaterial({ color: 0x0a0f0a, emissive: 0x9fd4ff, emissiveIntensity: 1.4 }));
phone.position.set(.2, .95, .25); phone.rotation.y = .5;
informant.add(phone);
scene.add(informant);

// the village protection walker (appears at coexistence)
const guard1 = figure(0x5a6b3f, .84);
guard1.visible = false;
torch(guard1, 0xfff0c8);
scene.add(guard1);
const guardState = { u: 0 };
const guardPath = new THREE.CatmullRomCurve3([V3(16.2, 0, -12.8), V3(14.6, 0, -10.4), V3(13.4, 0, -8.2)]);

// elephants — walking legs, flapping ears
function elephant(sc = 1) {
  const g = new THREE.Group();
  const grey = new THREE.MeshStandardMaterial({ color: 0xa19d92, roughness: .85 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.62, 12, 10), grey);
  body.scale.set(1.4, 1.02, .95); body.position.y = .98; body.castShadow = true;
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(.5, 10, 8), grey);
  shoulders.position.set(.55, 1.18, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.38, 10, 9), grey);
  head.position.set(1.05, 1.18, 0);
  const earG = new THREE.SphereGeometry(.34, 8, 6);
  const e1 = new THREE.Mesh(earG, grey); e1.scale.set(.14, 1, .85); e1.position.set(.92, 1.28, .38);
  const e2 = e1.clone(); e2.position.z = -.38;
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
    [V3(1.35, 1.05, 0), V3(1.58, .7, 0), V3(1.55, .35, 0), V3(1.42, .1, 0)]), 8, .1, 6), grey);
  const legs = [];
  const legG = new THREE.CylinderGeometry(.14, .16, .86, 7);
  for (const [lx, lz] of [[-.45, .3], [-.45, -.3], [.45, .3], [.45, -.3]]) {
    const l = new THREE.Mesh(legG, grey); l.position.set(lx, .43, lz); l.castShadow = true;
    legs.push(l); g.add(l);
  }
  const tuskM = new THREE.MeshStandardMaterial({ color: 0xded5ba, roughness: .5 });
  const t1 = new THREE.Mesh(new THREE.ConeGeometry(.05, .42, 6), tuskM);
  t1.rotation.x = Math.PI; t1.rotation.z = -.5; t1.position.set(1.3, .8, .17);
  const t2 = t1.clone(); t2.position.z = -.17;
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.03, .015, .6, 5), grey);
  tail.rotation.z = .5; tail.position.set(-.85, .85, 0);
  g.add(body, shoulders, head, e1, e2, trunk, t1, t2, tail);
  g.scale.setScalar(sc);
  g.userData = { legs, ears: [e1, e2] };
  return g;
}
const herd = new THREE.Group();
const eles = [elephant(1.1), elephant(.9), elephant(.58)];
eles.forEach((e, i) => { e.position.set(-i * 1.9 - (i % 2) * .5, 0, (i % 2) * 1.6 - .7); herd.add(e); });
scene.add(herd);
const herdState = { u: 0, curve: 'in' };

// ranger jeep with headlight cone + lightbar
const jeep = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, .5, .8), new THREE.MeshStandardMaterial({ color: 0x40503a, roughness: .6 }));
  body.position.y = .55; body.castShadow = true;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(.7, .4, .74), new THREE.MeshStandardMaterial({ color: 0x35402f, roughness: .55 }));
  cab.position.set(-.2, .95, 0);
  const wheelG = new THREE.CylinderGeometry(.22, .22, .16, 10).rotateX(Math.PI / 2);
  const wheelM = new THREE.MeshStandardMaterial({ color: 0x15140f, roughness: .9 });
  jeep.userData.wheels = [];
  for (const [wx, wz] of [[-.5, .42], [-.5, -.42], [.5, .42], [.5, -.42]]) {
    const w = new THREE.Mesh(wheelG, wheelM); w.position.set(wx, .22, wz); jeep.add(w); jeep.userData.wheels.push(w);
  }
  const hl = new THREE.Mesh(new THREE.ConeGeometry(.5, 3.4, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2cf, transparent: true, opacity: .13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  hl.rotation.z = -Math.PI / 2 - .12; hl.position.set(2.2, .38, 0);
  jeep.add(hl);
  const lb1 = new THREE.Mesh(new THREE.BoxGeometry(.1, .07, .16), new THREE.MeshStandardMaterial({ color: 0x140b0b, emissive: 0xff3333, emissiveIntensity: 0 }));
  lb1.position.set(-.2, 1.2, .14);
  const lb2 = new THREE.Mesh(new THREE.BoxGeometry(.1, .07, .16), new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0x3388ff, emissiveIntensity: 0 }));
  lb2.position.set(-.2, 1.2, -.14);
  jeep.add(body, cab, lb1, lb2);
  jeep.userData.lights = [lb1.material, lb2.material];
}
jeep.visible = false;
scene.add(jeep);
const jeepState = { u: 0, on: false, arrived: false };

/* ── FX ─────────────────────────────────────────────────────────────────── */

let _glow;
function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.4, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (_glow = new THREE.CanvasTexture(c));
}
function flashAt(p, hue = 0xffffff) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hue, transparent: true, opacity: .95, depthWrite: false }));
  s.position.copy(p); s.scale.setScalar(.5);
  scene.add(s);
  gsap.to(s.scale, { x: 3.6, y: 3.6, duration: .5, ease: 'power2.out' });
  gsap.to(s.material, { opacity: 0, duration: .55, ease: 'power2.out', onComplete: () => scene.remove(s) });
}
function ringAt(x, z, hue, r = 2.6, y = null) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(.4, .04, 8, 48).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(x, y ?? (heightAt(x, z) + .18), z);
  scene.add(m);
  gsap.to(m.scale, { x: r, y: r, z: r, duration: 1.15, ease: 'power2.out' });
  gsap.to(m.material, { opacity: 0, duration: 1.2, ease: 'power2.out', onComplete: () => scene.remove(m) });
}
// wolf-array triangulation: bearing lines converge on the call, then a fix ring
function bearings(cx, cz) {
  const target = V3(cx, heightAt(cx, cz) + .6, cz);
  for (const w of wolves) {
    const from = w.position.clone().setY(w.position.y + 1.4);
    const g = new THREE.BufferGeometry().setFromPoints([from, target]);
    const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: HUES.listen, dashSize: .45, gapSize: .3, transparent: true, opacity: 0 }));
    l.computeLineDistances();
    scene.add(l);
    gsap.to(l.material, { opacity: .75, duration: .5 });
    gsap.to(l.material, { opacity: 0, delay: 2.4, duration: .7, onComplete: () => scene.remove(l) });
  }
  setTimeout(() => ringAt(cx, cz, 0xffffff, 1.6), 900);
}
const streams = [];
function stream(from, to, hue, arc = 3.2) {
  const mid = from.clone().lerp(to, .5); mid.y += arc;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
    new THREE.LineBasicMaterial({ color: hue, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const N = 5;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: hue, size: .6, map: glowTex(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, alphaTest: .01 }));
  pts.frustumCulled = false;
  scene.add(line, pts);
  const s = { curve, line, pts, n: N, t0: 0, active: false };
  streams.push(s);
  s.play = (dur = 2.4) => {
    s.t0 = clock.elapsedTime; s.active = true;
    gsap.to([line.material, pts.material], { opacity: .85, duration: .3, overwrite: true });
    gsap.to([line.material, pts.material], { opacity: 0, delay: dur - .5, duration: .6, overwrite: false, onComplete: () => { s.active = false; } });
  };
  return s;
}
const GATE_TOP = V3(-21.5, heightAt(-21.5, -3.5) + 2.4, -3.5);
const stSer1Gate = stream(V3(6.8, heightAt(6.8, 10.2) + 1.6, 10.2), GATE_TOP, HUES.see, 5);
const stSer2Gate = stream(V3(-4.5, heightAt(-4.5, 5.6) + 1.6, 5.6), GATE_TOP, HUES.see, 4);
const stVGHQ = stream(V3(12.9, heightAt(12.9, -8.6) + 1.6, -8.6), HQ_TOP, HUES.guard, 2.4);
const stWolfGate = stream(V3(-12, heightAt(-12, 10.5) + 1.4, 10.5), GATE_TOP, HUES.listen, 3.6);
const stJWGate = stream(V3(-3, heightAt(-3, 14.5) + 1.4, 14.5), GATE_TOP, HUES.link, 4.2);
const stSatHQ = stream(V3(-2, 27, -2), HQ_TOP, HUES.brain, -4);
const stMobHQ = stream(V3(26.5, heightAt(26.5, 16.6) + 1.4, 16.6), HQ_TOP, HUES.report, 4.5);
let uplink = null;
function fireUplink() {
  if (uplink) { scene.remove(uplink.line, uplink.pts); streams.splice(streams.indexOf(uplink), 1); }
  uplink = stream(GATE_TOP.clone(), sat.position.clone(), HUES.link, 2);
  uplink.play(2.6);
}

/* ── audio — synthesized, muted until invited ───────────────────────────── */

let AC = null, master = null, soundOn = false;
function audioInit() {
  if (AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination);
  // wind — filtered brown noise with a slow swell
  const len = AC.sampleRate * 4;
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3; }
  const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const wg = AC.createGain(); wg.gain.value = .16;
  const lfo = AC.createOscillator(); lfo.frequency.value = .07;
  const lfoG = AC.createGain(); lfoG.gain.value = .07;
  lfo.connect(lfoG); lfoG.connect(wg.gain);
  src.connect(lp); lp.connect(wg); wg.connect(master);
  src.start(); lfo.start();
  // low dusk drone
  const o1 = AC.createOscillator(); o1.frequency.value = 55;
  const o2 = AC.createOscillator(); o2.frequency.value = 55.6;
  const og = AC.createGain(); og.gain.value = .028;
  o1.connect(og); o2.connect(og); og.connect(master);
  o1.start(); o2.start();
}
function blip(freq = 740, dur = .12, vol = .05) {
  if (!AC || !soundOn) return;
  const o = AC.createOscillator(); o.frequency.value = freq;
  const g = AC.createGain();
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + dur);
  o.connect(g); g.connect(master);
  o.start(); o.stop(AC.currentTime + dur + .02);
}
const sfx = {
  feed: () => blip(660, .1, .04),
  detect: () => { blip(1180, .22, .07); setTimeout(() => blip(880, .26, .06), 110); },
  chirp: () => {
    if (!AC || !soundOn) return;
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(1500, AC.currentTime);
    o.frequency.exponentialRampToValueAtTime(2600, AC.currentTime + .09);
    g.gain.setValueAtTime(.03, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + .12);
    o.connect(g); g.connect(master);
    o.start(); o.stop(AC.currentTime + .15);
  },
};
$('#sound').addEventListener('click', () => {
  audioInit();
  if (AC.state === 'suspended') AC.resume();
  soundOn = !soundOn;
  gsap.to(master.gain, { value: soundOn ? .6 : 0, duration: .8 });
  $('#sound').textContent = soundOn ? '🔊 sound' : '🔇 sound';
});

/* ── UI: captions, feed, popups ─────────────────────────────────────────── */

const hex = (h) => '#' + h.toString(16).padStart(6, '0');
function caption(hue, k, t, l, hold = 7) {
  const cap = $('#cap');
  cap.style.setProperty('--fa', hex(hue));
  $('#cap-k').textContent = k; $('#cap-t').textContent = t; $('#cap-l').textContent = l;
  gsap.fromTo(cap, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .7, overwrite: true });
  gsap.to(cap, { opacity: 0, delay: hold, duration: .8, overwrite: false });
}
function feed(hue, title, text) {
  const el = document.createElement('div');
  el.className = 'fi';
  el.style.setProperty('--fa', hex(hue));
  el.innerHTML = `<i></i><div><b>${title}</b><span>${text}</span></div><em>${clockStr()}</em>`;
  const list = $('#feed-list');
  list.prepend(el);
  gsap.to(el, { opacity: 1, x: 0, duration: .5, ease: 'power2.out' });
  while (list.children.length > 5) list.removeChild(list.lastChild);
  sfx.feed();
}
function thumb(kind) {
  const c = document.createElement('canvas'); c.width = 196; c.height = 96;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 96);
  g.addColorStop(0, '#26302a'); g.addColorStop(1, '#12180f');
  x.fillStyle = g; x.fillRect(0, 0, 196, 96);
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, 74, 196, 22);
  x.strokeStyle = 'rgba(240,240,234,.25)'; x.strokeRect(.5, .5, 195, 95);
  x.font = "700 9px 'Hanken Grotesk'";
  if (kind === 'human') {
    x.fillStyle = '#0c0f0b';
    for (let i = 0; i < 3; i++) {
      const px = 46 + i * 42, ph = 34 + (i % 2) * 6;
      x.beginPath(); x.arc(px, 66 - ph, 5, 0, 7); x.fill();
      x.fillRect(px - 6, 66 - ph + 4, 12, ph - 4);
      x.strokeStyle = '#00FF64'; x.lineWidth = 1.5;
      x.strokeRect(px - 12, 66 - ph - 10, 24, ph + 12);
    }
    x.fillStyle = '#00FF64'; x.fillText('HUMAN ×3 · 0.96 · IR', 8, 88);
  } else if (kind === 'elephant') {
    x.fillStyle = '#3d3c37';
    x.beginPath(); x.ellipse(96, 52, 42, 23, 0, 0, 7); x.fill();
    x.beginPath(); x.arc(136, 44, 15, 0, 7); x.fill();
    x.fillRect(147, 44, 6, 24);
    x.strokeStyle = '#FFC800'; x.lineWidth = 1.5; x.strokeRect(50, 22, 110, 56);
    x.fillStyle = '#FFC800'; x.fillText('ELEPHANT ×3 · 0.99', 8, 88);
  } else if (kind === 'vehicle') {
    x.fillStyle = '#101511';
    x.fillRect(60, 42, 76, 22); x.fillRect(76, 32, 40, 14);
    x.beginPath(); x.arc(76, 66, 7, 0, 7); x.arc(120, 66, 7, 0, 7); x.fill();
    x.strokeStyle = '#1482FF'; x.lineWidth = 1.5; x.strokeRect(52, 26, 92, 48);
    x.fillStyle = '#4da3ff'; x.fillText('HUMAN REPORT · PHOTO', 8, 88);
  } else {   // re-id
    x.fillStyle = '#0d120d';
    x.beginPath(); x.arc(70, 46, 16, 0, 7); x.fill();
    x.beginPath(); x.arc(130, 50, 14, 0, 7); x.fill();
    x.strokeStyle = '#FF8C42'; x.lineWidth = 1.5;
    x.strokeRect(50, 26, 40, 44); x.strokeRect(112, 32, 38, 40);
    x.fillStyle = '#FF8C42'; x.fillText('IND-041          IND-017', 56, 88);
  }
  return c;
}
const pops = [];
function popup(world, hue, title, conf, sub, kind, hold = 6.5, dx = 0) {
  const el = document.createElement('div');
  el.className = 'pop';
  el.style.setProperty('--fa', hex(hue));
  el.appendChild(thumb(kind));
  const b = document.createElement('div'); b.className = 'p-b';
  b.innerHTML = `<div class="p-t">${title}<em>${conf}</em></div><div class="p-s">${sub}</div>`;
  el.appendChild(b);
  $('#pops').appendChild(el);
  const rec = { el, world, dx };
  pops.push(rec);
  gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .5 });
  gsap.to(el, { opacity: 0, delay: hold, duration: .6, onComplete: () => { el.remove(); pops.splice(pops.indexOf(rec), 1); } });
  sfx.detect();
}
function clockStr() {
  const mins = 401 + Math.floor(tl.time() * 1.4);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/* ── sector map ─────────────────────────────────────────────────────────── */

const mapC = $('#map-c'), mapX = mapC.getContext('2d');
let mapBase = null;
const mapPt = (x, z) => [(x + 38) / 76 * 416, (z + 28) / 56 * 312];
function snapshotMap() {
  const rt = new THREE.WebGLRenderTarget(416, 312);
  const oc = new THREE.OrthographicCamera(-38, 38, 28, -28, 1, 120);
  oc.position.set(0, 60, 0); oc.up.set(0, 0, -1); oc.lookAt(0, 0, 0);
  const fog = scene.fog; scene.fog = null;
  renderer.setRenderTarget(rt);
  renderer.render(scene, oc);
  const px = new Uint8Array(416 * 312 * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, 416, 312, px);
  renderer.setRenderTarget(null);
  scene.fog = fog;
  // linear → sRGB (the render target skips the output pass)
  for (let i = 0; i < px.length; i += 4) {
    px[i] = 255 * Math.pow(px[i] / 255, 1 / 2.2);
    px[i + 1] = 255 * Math.pow(px[i + 1] / 255, 1 / 2.2);
    px[i + 2] = 255 * Math.pow(px[i + 2] / 255, 1 / 2.2);
  }
  const img = mapX.createImageData(416, 312);
  for (let y = 0; y < 312; y++)   // flip Y
    img.data.set(px.subarray((311 - y) * 416 * 4, (312 - y) * 416 * 4), y * 416 * 4);
  const off = document.createElement('canvas'); off.width = 416; off.height = 312;
  off.getContext('2d').putImageData(img, 0, 0);
  mapBase = off;
  rt.dispose();
}
const MAP_SENSORS = [
  [6.8, 10.2, HUES.see], [-4.5, 5.6, HUES.see], [12.9, -8.6, HUES.guard],
  [-12, 10.5, HUES.listen], [-8.5, 15.5, HUES.listen], [-15.5, 14.5, HUES.listen],
  [-3, 14.5, 0xFF8C42], [-21.5, -3.5, HUES.link], [17, -12.3, HUES.brain],
];
function drawMap() {
  if (!mapBase) return;
  mapX.globalAlpha = 1;
  mapX.drawImage(mapBase, 0, 0);
  mapX.fillStyle = 'rgba(4,8,5,.26)';
  mapX.fillRect(0, 0, 416, 312);
  for (const [x, z, hue] of MAP_SENSORS) {
    const [mx, my] = mapPt(x, z);
    mapX.fillStyle = hex(hue);
    mapX.beginPath(); mapX.arc(mx, my, 4, 0, 7); mapX.fill();
  }
  const dot = (obj, color, r = 5) => {
    const [mx, my] = mapPt(obj.position.x, obj.position.z);
    mapX.fillStyle = color; mapX.strokeStyle = 'rgba(0,0,0,.6)'; mapX.lineWidth = 1.5;
    mapX.beginPath(); mapX.arc(mx, my, r, 0, 7); mapX.fill(); mapX.stroke();
  };
  dot(poachers, '#ff5a4d');
  dot(herd, '#d8d4c8');
  if (jeep.visible) dot(jeep, '#7fe6a3');
  // camera wedge
  const [cx, cy] = mapPt(camP.x, camP.z);
  const ang = Math.atan2(camL.x - camP.x, camL.z - camP.z);
  mapX.fillStyle = 'rgba(240,240,234,.28)';
  mapX.beginPath();
  mapX.moveTo(cx, cy);
  mapX.lineTo(cx + Math.sin(ang - .4) * 36, cy + Math.cos(ang - .4) * 36);
  mapX.lineTo(cx + Math.sin(ang + .4) * 36, cy + Math.cos(ang + .4) * 36);
  mapX.closePath(); mapX.fill();
}

/* ── timeline — 78 s, six chapters in order ─────────────────────────────── */

const tl = gsap.timeline({ repeat: -1, paused: true });
const CH = { overview: 0, intrusion: 10, response: 24, coexist: 34, listening: 48, network: 60 };
const cam = (t, p, l, dur, ease = 'power2.inOut') => {
  tl.to(camP, { x: p[0], y: p[1], z: p[2], duration: dur, ease }, t);
  tl.to(camL, { x: l[0], y: l[1], z: l[2], duration: dur, ease }, t);
};

// ── overview 0–10 · one continuous establishing move, high and oblique
tl.call(() => {
  gsap.fromTo('#title', { opacity: 0 }, { opacity: 1, duration: 1.4, delay: .4, overwrite: true });
  gsap.to('#title', { opacity: 0, duration: 1, delay: 6.2, overwrite: false });
}, null, .01);
cam(0, [40, 22, 38], [-4, 0, -2], .01, 'none');
cam(.02, [24, 19, 34], [-4, .5, 0], 9.8, 'sine.inOut');
tl.call(() => caption(HUES.see, 'A working landscape', 'Every sensor on station', 'Cameras at the chokepoints, three ears in the forest, a gateway on the ridge — the brain above headquarters.', 6.5), null, 2.6);

// ── intrusion 10–24 · the report comes first, then the cameras confirm
cam(10, [31, 7, 25.5], [23.5, 1.2, 14], 2.6);
tl.call(() => {
  popup(V3(26.5, heightAt(26.5, 16.6) + 1.9, 16.6), HUES.report, 'Human report', 'Mobile-07', 'Vehicle at the north track — an informant’s $50 Landseed Mobile', 'vehicle', 5.5, 120);
  stMobHQ.play(2.4);
  feed(HUES.report, 'Mobile-07 · report', 'Vehicle at the north track · photo received at HQ');
}, null, 11.2);
tl.call(() => caption(HUES.report, 'To report · Human in the loop', 'The first sensor is a person', 'An informant’s photo reaches HQ before the men are inside. The cameras are already waiting.', 5.5), null, 11.6);
tl.to(poach, { u: .52, duration: 6.5, ease: 'none' }, 12.5);
cam(13.4, [13, 7.5, 17.5], [5.5, 1, 8.5], 4.2, 'sine.inOut');       // oblique over the chokepoint, ridge on the horizon
tl.call(() => {                                                     // DETECTION 1
  flashAt(V3(6.8, heightAt(6.8, 10.2) + 1.6, 10.2), 0xd9ffe4);
  const pp = trail.getPoint(poach.u);
  ringAt(pp.x, pp.z, HUES.see, 3.4);
  gsap.fromTo(fovSer1, { opacity: .34 }, { opacity: .1, duration: 1.6 });
  popup(V3(pp.x, heightAt(pp.x, pp.z) + 1.6, pp.z), HUES.see, 'Human ×3', '0.96', 'SERENGETI-01 · 200 ms to image · cropped on the edge', 'human', 6.5, 150);
}, null, 19);
tl.call(() => { stSer1Gate.play(2.6); feed(HUES.see, 'Serengeti-01 · alert', 'Human ×3 at the chokepoint · image → Gateway over LoRa'); }, null, 19.9);
tl.call(() => { fireUplink(); feed(HUES.link, 'Gateway · uplink', 'Woke from deep sleep · relayed by satellite — no cell for 40 km'); }, null, 21.2);
tl.call(() => { stSatHQ.play(2.2); feed(HUES.brain, 'HQ · Landseed AI', 'Alert on rangers’ phones · 28 s after trigger'); }, null, 22.4);
tl.to(poach, { u: .74, duration: 12, ease: 'none' }, 19.2);

// ── response 24–34 · dispatch, second camera confirms, intercept
cam(24, [24, 8, -2], [17, 1.2, -12.3], 2.6);
tl.call(() => caption(HUES.brain, 'To understand · The brain', 'Response before the loss', 'Detection, image and location arrive together. A patrol is rolling in under a minute.', 5.5), null, 24.6);
tl.call(() => { jeepState.on = true; jeep.visible = true; feed(HUES.brain, 'HQ · dispatch', 'Patrol unit 2 rolling · intercept set at the ford'); }, null, 25.2);
tl.to(jeepState, { u: 1, duration: 7.6, ease: 'power1.inOut' }, 25.6);
cam(26.6, [6, 9, -12], [-2, .8, -2], 4.4, 'sine.inOut');            // high side-track on the jeep
tl.call(() => {                                                     // second camera confirms the track
  flashAt(V3(-4.5, heightAt(-4.5, 5.6) + 1.6, 5.6), 0xd9ffe4);
  gsap.fromTo(fovSer2, { opacity: .3 }, { opacity: .1, duration: 1.4 });
  stSer2Gate.play(2);
  feed(HUES.see, 'Serengeti-02 · confirm', 'Track confirmed heading for the ford — many low-cost cameras beat one dear one');
}, null, 28.4);
cam(31, [-10.5, 5, 7.5], [-6, .8, 2.3], 2.4);
tl.call(() => {                                                     // INTERCEPT
  poach.stopped = true;
  jeepState.arrived = true;
  const pp = trail.getPoint(poach.u);
  ringAt(pp.x, pp.z, HUES.see, 3);
  feed(HUES.see, 'Patrol · on site', 'Three detained at the ford · rifles seized');
}, null, 32.4);
tl.call(() => caption(HUES.see, 'Outcome', 'Detained — nothing lost', 'Like the 20 arrests across 13 gangs that earlier versions made possible, beginning in the Serengeti.', 5), null, 32.8);

// ── coexistence 34–48 · approach, the close-up, detection, the turn
cam(34, [20, 7.5, 1], [11, 1, -6.5], 3);
tl.call(() => caption(HUES.guard, 'To see · Coexistence', 'Elephants head for the crops', 'A VillageGuard on the field edge runs one model with every species on the conflict list.', 6), null, 35);
tl.to(herdState, { u: .78, duration: 7.4, ease: 'none' }, 34.2);
cam(38, [7.5, 3.4, -8.4], [11.2, 1.2, -4], 2.6, 'sine.inOut');      // settle low in the open crops — the herd walks into frame
tl.to(herdState, { u: 1, duration: 3.4, ease: 'none' }, 41.6);
cam(44.7, [16.5, 4.2, -3], [12.2, 1, -6.8], 2.2);
tl.call(() => {                                                     // DETECTION 2
  herdState.curve = 'out';
  flashAt(V3(12.9, heightAt(12.9, -8.6) + 1.6, -8.6), 0xffe9bd);
  ringAt(12.4, -6.4, HUES.guard, 3.2);
  gsap.fromTo(fovVG, { opacity: .34 }, { opacity: .1, duration: 1.6 });
  popup(V3(12.4, heightAt(12.4, -6.4) + 2.4, -6.4), HUES.guard, 'Elephant ×3', '0.99', 'VILLAGEGUARD-04 · IR optics · alert < 1 KB · direct-to-cell', 'elephant', 6, -140);
  stVGHQ.play(2.2);
  feed(HUES.guard, 'VillageGuard-04 · alert', 'Elephant ×3 approaching the fields');
}, null, 45);
tl.call(() => {
  gsap.to(lampMat, { emissiveIntensity: 2.6, duration: .4 });
  gsap.to(villageLight, { intensity: 16, duration: .4 });
  guard1.visible = true;
  feed(HUES.guard, 'Village · early warning', 'Deterrence lights on · protection unit walking out');
}, null, 45.9);
tl.to(guardState, { u: 1, duration: 5, ease: 'none' }, 46);
tl.to(herdState, { u: 0, duration: 5.6, ease: 'sine.inOut' }, 46.2);
tl.call(() => caption(HUES.guard, 'Outcome', 'Turned, not shot', 'The herd drifts back to the treeline. No crops lost, no retaliation — coexistence, on time.', 4.5), null, 46.6);

// ── listening 48–60 · the array triangulates, the survey counts
cam(48, [-2, 10, 20.5], [-11.5, 1, 12.5], 3);
tl.call(() => caption(HUES.listen, 'To listen · Bio-acoustics', 'The forest, counted by ear', 'Three Wolf units hold the canopy. The same call on three bearings becomes a point on the map.', 6.5), null, 48.8);
for (const [t, cx, cz] of [[50.6, -12.5, 13], [53, -12.5, 13]]) {
  tl.call(() => { ringAt(cx, cz, HUES.listen, 4.6, heightAt(cx, cz) + 2.6); sfx.chirp(); }, null, t);
}
tl.call(() => bearings(-12.5, 13), null, 53.6);
tl.call(() => { stWolfGate.play(2.4); feed(HUES.listen, 'Wolf array · fix', 'Primate troop · 3 bearings agree · location on the map'); }, null, 55);
tl.call(() => {
  popup(V3(-3, heightAt(-3, 14.5) + 2.2, 14.5), 0xFF8C42, 'Re-identified ×2', 'survey', 'JUNGLE-WALLAH · individuals IND-041 · IND-017 · density updated', 'reid', 5.5, 130);
  stJWGate.play(2.4);
  feed(0xFF8C42, 'Jungle-Wallah · survey', 'Two individuals re-identified · abundance revised');
}, null, 56.6);
tl.call(() => caption(HUES.listen, 'Outcome', 'Presence becomes a number', 'Calls become bearings, detections become densities — the measurement layer for Earth Credits.', 4.5), null, 57.6);

// ── network 60–78 · the whole board
cam(60, [8, 26, 30], [-2, 0, -2], 4.5);
tl.call(() => caption(HUES.brain, 'Every sensor · one brain', 'The whole landscape, reporting', 'See, listen, connect, report — every detection lands in Landseed AI, and the record writes itself.', 9), null, 61.5);
tl.call(() => { stSer1Gate.play(3); stSer2Gate.play(3); stMobHQ.play(3); }, null, 63.5);
tl.call(() => { stWolfGate.play(3); stJWGate.play(3); }, null, 64.4);
tl.call(() => { fireUplink(); stVGHQ.play(3); }, null, 65.4);
tl.call(() => { stSatHQ.play(3); }, null, 66.6);
tl.call(() => feed(HUES.brain, 'Landseed AI · report', 'Daily summary compiled · Earth Credits registry updated'), null, 67.6);
cam(64.5, [-8, 23, 27], [-2, 0, -2], 13.5, 'sine.inOut');
tl.call(() => {}, null, 78);

tl.eventCallback('onRepeat', () => {
  poach.u = .02; poach.stopped = false;
  herdState.u = 0; herdState.curve = 'in';
  jeepState.u = 0; jeepState.on = false; jeepState.arrived = false;
  jeep.visible = false;
  jeep.userData.lights.forEach(m => m.emissiveIntensity = 0);
  guard1.visible = false; guardState.u = 0;
  gsap.set(lampMat, { emissiveIntensity: 0 }); gsap.set(villageLight, { intensity: 0 });
  $('#feed-list').innerHTML = '';
});

/* ── chapter chips / pause ──────────────────────────────────────────────── */

const chips = document.querySelectorAll('#chapters .chip[data-ch]');
chips.forEach(b => b.addEventListener('click', () => { tl.play(); tl.time(CH[b.dataset.ch] + .02); }));
function markChapter() {
  const t = tl.time();
  let cur = 'overview';
  for (const [k, v] of Object.entries(CH)) if (t >= v) cur = k;
  chips.forEach(b => b.classList.toggle('on', b.dataset.ch === cur));
}
$('#pause').addEventListener('click', () => {
  if (tl.paused()) { tl.play(); $('#pause').textContent = '⏸'; }
  else { tl.pause(); $('#pause').textContent = '▶'; }
});

/* ── frame loop ─────────────────────────────────────────────────────────── */

const clock = new THREE.Clock();
const proj = new THREE.Vector3();

function placeOnCurve(group, curve, u, bobT, bobA = .05, faceX = false) {
  const p = curve.getPoint(u);
  const tan = curve.getTangent(Math.min(u + .002, 1)).setY(0).normalize();
  group.position.set(p.x, heightAt(p.x, p.z) + Math.sin(bobT) * bobA, p.z);
  group.rotation.y = Math.atan2(tan.x, tan.z) + (faceX ? -Math.PI / 2 : 0);
}

let frame = 0;
function animate() {
  requestAnimationFrame(animate);
  tick(clock.getDelta(), clock.elapsedTime);
}
function tick(dt, t) {

  for (const s of spins) s.obj.rotation[s.ax] += s.v * dt;
  for (let i = 0; i < pulses.length; i++) {
    const m = pulses[i];
    m.emissiveIntensity = m.userData.base * (0.72 + 0.28 * Math.sin(t * 2.1 + i * 2.1));
  }
  for (const w of wavers) {
    const ph = ((t * .32 + w.userData.phase) % 1);
    w.scale.setScalar(.6 + ph * 3.4);
    w.material.opacity = .34 * (1 - ph);
  }
  for (const f of floaters) f.position.y = f.userData.baseY + Math.sin(t * .8) * .12;

  // actors
  if (!poach.stopped) placeOnCurve(poachers, trail, poach.u, t * 7, .035);
  pFigs.forEach((f, i) => { f.position.y = poach.stopped ? 0 : Math.abs(Math.sin(t * 6 + i)) * .05; });
  torches.forEach((c, i) => { c.rotation.y = Math.sin(t * 1.4 + i * 2) * .3; });
  const hc = herdState.curve === 'in' ? herdIn : herdOut;
  placeOnCurve(herd, hc, herdState.curve === 'in' ? herdState.u : 1 - herdState.u, t * 2.2, .02, true);
  for (const e of eles) {
    e.userData.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 3.1 + i * Math.PI) * .38; });
    e.userData.ears.forEach((ear, i) => { ear.rotation.y = Math.sin(t * 1.7 + i) * .18; });
  }
  if (guard1.visible) placeOnCurve(guard1, guardPath, guardState.u, t * 6, .04);
  if (jeepState.on) {
    placeOnCurve(jeep, road, jeepState.u, 0, 0, true);
    for (const w of jeep.userData.wheels) w.rotation.z -= dt * (jeepState.arrived ? 0 : 8);
  }
  if (jeepState.arrived) {
    const on = Math.floor(t * 5) % 2;
    jeep.userData.lights[0].emissiveIntensity = on ? 3.2 : 0;
    jeep.userData.lights[1].emissiveIntensity = on ? 0 : 3.2;
  }

  sat.position.x = -2 + Math.sin(t * .05) * 5;
  sat.position.z = -2 + Math.cos(t * .05) * 5;
  sat.rotation.y = t * .1;

  for (const s of streams) {
    if (!s.active) { s.pts.visible = false; s.line.visible = s.line.material.opacity > .01; continue; }
    s.pts.visible = s.line.visible = true;
    const a = s.pts.geometry.attributes.position;
    for (let i = 0; i < s.n; i++) {
      const u = ((t - s.t0) * .55 + i / s.n) % 1;
      const p = s.curve.getPoint(u);
      a.setXYZ(i, p.x, p.y, p.z);
    }
    a.needsUpdate = true;
  }

  water.material.opacity = .86 + Math.sin(t * 1.3) * .04;

  camera.position.set(camP.x, camP.y, camP.z);
  camera.lookAt(camL.x, camL.y, camL.z);

  for (const rec of pops) {
    proj.copy(rec.world).project(camera);
    if (proj.z > 1) { rec.el.style.display = 'none'; continue; }
    rec.el.style.display = '';
    rec.el.style.left = ((proj.x * .5 + .5) * innerWidth + (rec.dx || 0)) + 'px';
    rec.el.style.top = ((-proj.y * .5 + .5) * innerHeight) + 'px';
  }
  markChapter();
  if ((frame++ & 3) === 0) { drawMap(); $('#feed-clock').textContent = clockStr(); }

  composer.render();
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* ── boot ───────────────────────────────────────────────────────────────── */

window.__demo = {
  tl, camera, camP, camL, CH,
  // manual frame-step for automation: render an exact timeline moment even
  // when the tab is backgrounded and requestAnimationFrame is paused
  step(T) { tl.pause(); tl.time(T, false); tick(1 / 60, T); },
};
animate();
// boot via plain timers so it completes even in a backgrounded tab
setTimeout(() => {
  snapshotMap();
  const loader = $('#loader');
  loader.style.transition = 'opacity .7s';
  loader.style.opacity = '0';
  setTimeout(() => loader.remove(), 800);
  document.body.classList.remove('booting');
  tl.play(0);
}, 500);
