// ── demo.js — the field demonstration ─────────────────────────────────────
// A simulated protected landscape (nowhere in particular) with every Landseed
// sensor at work. Show, don't tell: poachers detected at a chokepoint, the
// alert relayed by LoRa → Gateway → satellite → HQ, a patrol dispatched,
// elephants turned before the crops, calls triangulated in the forest — and
// everything reporting to one brain. Cinematic chaptered camera, looping.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BUILDERS } from '../src/devices.js?v=5';

const $ = (s) => document.querySelector(s);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const HUES = { see: 0x00FF64, guard: 0xFFC800, link: 0x32C8FF, listen: 0xE682E6, brain: 0x9B6CE0, alert: 0xFF5A3C };

/* ── renderer / scene ───────────────────────────────────────────────────── */

const renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x27332a, 0.0115);

// dusk sky dome
{
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#0a1420'); g.addColorStop(.42, '#1d3038');
  g.addColorStop(.62, '#54544a'); g.addColorStop(.72, '#b98a52'); g.addColorStop(1, '#3a3c33');
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 24, 18), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false }));
  scene.add(sky);
}

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, .1, 400);
const camP = { x: 36, y: 17, z: 34 }, camL = { x: 0, y: 0, z: 0 };

scene.add(new THREE.HemisphereLight(0xcfe0d8, 0x2a2418, .55));
const sun = new THREE.DirectionalLight(0xffd9a6, 2.1);
sun.position.set(-30, 26, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -42;
sun.shadow.camera.right = sun.shadow.camera.top = 42;
sun.shadow.camera.far = 110;
sun.shadow.bias = -0.0008;
scene.add(sun);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .32, .8, .86));
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
  let h = 1.5 * noise(x * .06 + 9, z * .06 + 4) + .55 * noise(x * .16, z * .16) - .6;
  h += 5.4 * Math.exp(-((x + 24) ** 2) / 52) * (0.7 + 0.3 * noise(z * .1, 3));   // western ridge
  const dr = z - riverZ(x);
  h -= 2.2 * Math.exp(-(dr * dr) / 2.4);                                          // river trench
  const dv = ((x - 17) ** 2 + (z + 12.5) ** 2);
  const gv = Math.exp(-dv / 30);
  h = h * (1 - gv) + .5 * gv;                                                     // village flat
  return Math.max(h, -1.7);
}

const trail = new THREE.CatmullRomCurve3([
  V3(30, 0, 18), V3(21, 0, 14.5), V3(13, 0, 11), V3(6, 0, 9), V3(0, 0, 7.2), V3(-6, 0, 2.5), V3(-10, 0, -1.5),
].map(p => { p.y = 0; return p; }));
const road = new THREE.CatmullRomCurve3([
  V3(16, 0, -11.5), V3(10, 0, -9.5), V3(4, 0, -7), V3(-2, 0, -3), V3(-6, 0, 1.5),
]);
function nearCurve(curve, x, z, n = 60) {
  let m = 1e9;
  for (let i = 0; i <= n; i++) {
    const p = curve.getPoint(i / n);
    m = Math.min(m, (p.x - x) ** 2 + (p.z - z) ** 2);
  }
  return Math.sqrt(m);
}

{
  const W = 76, D = 56, SX = 150, SZ = 110;
  const geo = new THREE.PlaneGeometry(W, D, SX, SZ).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cGrass1 = new THREE.Color(0x4c6b35), cGrass2 = new THREE.Color(0x5f7a3c);
  const cForest = new THREE.Color(0x35502c), cRock = new THREE.Color(0x6e6455);
  const cSand = new THREE.Color(0x8a7a54), cDirt = new THREE.Color(0x6d5a3e);
  const cCrop = new THREE.Color(0x94914a);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const n = noise(x * .11 + 40, z * .11 + 7);
    tmp.copy(cGrass1).lerp(cGrass2, n);
    if (n > .55 && z > -8 && x > -20 && x < 10) tmp.lerp(cForest, .75);          // forest floor
    if (h > 3.2) tmp.lerp(cRock, Math.min(1, (h - 3.2) / 1.6));
    if (Math.abs(z - riverZ(x)) < 2.1) tmp.lerp(cSand, .55);
    if (nearCurve(trail, x, z, 40) < 1) tmp.lerp(cDirt, .6);
    if (nearCurve(road, x, z, 30) < 1.1) tmp.lerp(cDirt, .7);
    const cropD = ((x - 12.6) ** 2) / 9 + ((z + 7) ** 2) / 5;
    if (cropD < 1) tmp.lerp(cCrop, .8 * (1 - cropD * .4) * (0.75 + .25 * Math.sin(z * 6)));
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 }));
  ground.receiveShadow = true;
  scene.add(ground);
}

// water
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(76, 56).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x2a5a66, roughness: .25, metalness: .1, transparent: true, opacity: .88 }));
water.position.y = -.35;
scene.add(water);

/* ── forest (instanced) ─────────────────────────────────────────────────── */
{
  const N = 520;
  const trunkG = new THREE.CylinderGeometry(.09, .14, 1, 6);
  const canG = new THREE.ConeGeometry(.85, 1.9, 7);
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x4a3b28, roughness: .9 });
  const canM = new THREE.MeshStandardMaterial({ roughness: .9 });
  const trunks = new THREE.InstancedMesh(trunkG, trunkM, N);
  const cans = new THREE.InstancedMesh(canG, canM, N);
  trunks.castShadow = cans.castShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const cA = new THREE.Color(0x3f6b31), cB = new THREE.Color(0x2f5527), cAc = new THREE.Color(0x6d8143);
  let placed = 0, guard = 0;
  while (placed < N && guard++ < 9000) {
    const x = (rnd() - .5) * 72, z = (rnd() - .5) * 52;
    const h = heightAt(x, z);
    const forest = noise(x * .11 + 40, z * .11 + 7) > .53 && z > -8 && x > -20 && x < 10;
    const savanna = z < -9 && x < 8 && rnd() < .045;
    if (!(forest || savanna)) continue;
    if (h < -.2 || h > 3.4) continue;
    if (Math.abs(z - riverZ(x)) < 2.4) continue;
    if (nearCurve(trail, x, z, 30) < 1.7) continue;
    if (nearCurve(road, x, z, 20) < 1.7) continue;
    if ((x - 17) ** 2 + (z + 12.5) ** 2 < 42) continue;
    // clearings around every sensor so units stay visible and cameras stay clean
    const SPOTS = [[6.8, 10.2], [-4.5, 5.6], [12.9, -8.6], [-12, 10.5], [-3, 14.5], [-21.5, -3.5]];
    if (SPOTS.some(([sx, sz]) => (x - sx) ** 2 + (z - sz) ** 2 < 8)) continue;
    const sc = .8 + rnd() * .9;
    const flat = savanna ? .45 : 1;                                     // acacia silhouettes south
    p.set(x, h + .5 * sc, z); q.identity(); s.set(1, sc, 1);
    m.compose(p, q, s); trunks.setMatrixAt(placed, m);
    p.set(x, h + sc * (savanna ? 1.15 : 1.35), z); s.set(sc * (savanna ? 1.7 : 1), sc * flat, sc * (savanna ? 1.7 : 1));
    m.compose(p, q, s); cans.setMatrixAt(placed, m);
    cans.setColorAt(placed, savanna ? cAc : (rnd() > .5 ? cA : cB));
    placed++;
  }
  trunks.count = cans.count = placed;
  scene.add(trunks, cans);
}

/* ── park boundary (dashed) ─────────────────────────────────────────────── */
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
  const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xd8e6d2, dashSize: .7, gapSize: .5, transparent: true, opacity: .4 }));
  l.computeLineDistances();
  scene.add(l);
}

/* ── village + HQ ───────────────────────────────────────────────────────── */

const lampMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc36b, emissiveIntensity: 0 });
const villageLight = new THREE.PointLight(0xffc36b, 0, 9);
{
  const hutW = new THREE.MeshStandardMaterial({ color: 0xa8895c, roughness: .9 });
  const hutR = new THREE.MeshStandardMaterial({ color: 0x6b4f30, roughness: .95 });
  const huts = [[15.2, -14.4], [17.6, -15.2], [19.6, -13.4], [18.9, -10.8], [15.8, -10.2], [20.4, -15.8]];
  for (const [x, z] of huts) {
    const h = heightAt(x, z);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.85, .95, 1.1, 8), hutW);
    w.position.set(x, h + .55, z); w.castShadow = true;
    const r = new THREE.Mesh(new THREE.ConeGeometry(1.25, .95, 8), hutR);
    r.position.set(x, h + 1.55, z); r.castShadow = true;
    scene.add(w, r);
  }
  // HQ — operations post
  const hx = 17, hz = -12.3, hh = heightAt(hx, hz);
  const hq = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 2), new THREE.MeshStandardMaterial({ color: 0x51584c, roughness: .8 }));
  hq.position.set(hx, hh + .75, hz); hq.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, .14, 2.3), new THREE.MeshStandardMaterial({ color: 0x3a4038 }));
  roof.position.set(hx, hh + 1.57, hz);
  const mastM = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0x8a9390, metalness: .8, roughness: .35 }));
  mastM.position.set(hx + 1, hh + 2.8, hz - .7);
  scene.add(hq, roof, mastM);
  // village lamp post
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x5a5148 }));
  const lh = heightAt(17.5, -13.8);
  pole.position.set(17.5, lh + 1.2, -13.8);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 10), lampMat);
  bulb.position.set(17.5, lh + 2.45, -13.8);
  villageLight.position.set(17.5, lh + 2.4, -13.8);
  scene.add(pole, bulb, villageLight);
}
const HQ_TOP = V3(17, heightAt(17, -12.3) + 2.2, -12.3);

/* ── sensors (the real product models) ──────────────────────────────────── */

const spins = [], pulses = [], wavers = [], floaters = [];
function place(id, x, z, ry, sc = 2.1) {
  const g = BUILDERS[id](
    { serengeti: HUES.see, villageguard: HUES.guard, gateway: HUES.link, junglewallah: 0xFF8C42, wolf: HUES.listen, mobile: 0x1482FF, ai: HUES.brain }[id]);
  const h = heightAt(x, z);
  g.position.set(x, h, z);
  g.rotation.y = ry;
  g.scale.setScalar(sc);
  (g.userData.spin || []).forEach(s => spins.push(s));
  (g.userData.pulse || []).forEach(m => { m.userData.base = m.emissiveIntensity; pulses.push(m); });
  (g.userData.waves || []).forEach(w => wavers.push(w));
  if (g.userData.float) { g.userData.baseY = h + .4; floaters.push(g); }
  scene.add(g);
  return g;
}

const sSer1 = place('serengeti', 6.8, 10.2, -2.25, 1.9);       // chokepoint on the trail
const sSer2 = place('serengeti', -4.5, 5.6, -2.0, 1.9);
const sVG = place('villageguard', 12.9, -8.6, 2.75, 1.9);      // watching the crop approach
const sWolf = place('wolf', -12, 10.5, .6, 2.2);
const sJW = place('junglewallah', -3, 14.5, 2.4, 1.9);
const sGate = place('gateway', -21.5, -3.5, 1.1, 2.6);         // on the ridge
const sAI = place('ai', 17, -12.3, 0, .85);                    // the brain over HQ
sAI.position.y = heightAt(17, -12.3) + 2.6;
sAI.userData.baseY = sAI.position.y;

// sensor field-of-view fans
function fov(x, z, ry, hue, len = 7, spread = .5) {
  const h = heightAt(x, z) + 1.1;
  const geo = new THREE.ConeGeometry(len * Math.tan(spread), len, 20, 1, true);
  const mat = new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(geo, mat);
  cone.rotation.z = Math.PI / 2;
  const g = new THREE.Group();
  g.add(cone);
  cone.position.x = len / 2;
  g.position.set(x, h, z);
  g.rotation.y = ry;
  g.rotation.z = -.04;
  scene.add(g);
  return mat;
}
const fovSer1 = fov(6.8, 10.2, Math.PI * .78, HUES.see, 8, .42);
const fovSer2 = fov(-4.5, 5.6, Math.PI * .82, HUES.see, 7, .42);
const fovVG = fov(12.9, -8.6, Math.PI * 1.28, HUES.guard, 8, .5);

/* ── satellite ──────────────────────────────────────────────────────────── */

const sat = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(.7, .5, .5), new THREE.MeshStandardMaterial({ color: 0xb9c2c6, metalness: .8, roughness: .3 }));
  const pm = new THREE.MeshStandardMaterial({ color: 0x1e4a8a, metalness: .5, roughness: .4 });
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, .05, .8), pm); p1.position.x = 1.6;
  const p2 = p1.clone(); p2.position.x = -1.6;
  sat.add(body, p1, p2);
  sat.position.set(-2, 27, -2);
  scene.add(sat);
}

/* ── actors ─────────────────────────────────────────────────────────────── */

function figure(color, h = .62) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.16, h * .55, 3, 8), new THREE.MeshStandardMaterial({ color, roughness: .85 }));
  body.position.y = h * .62; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6b503c, roughness: .8 }));
  head.position.y = h * 1.12;
  g.add(body, head);
  return g;
}
const poachers = new THREE.Group();
const pFigs = [figure(0x3a3229), figure(0x4a3b2b), figure(0x2e2c26)];
pFigs.forEach((f, i) => { f.position.set(-.5 + i * .55, 0, (i % 2) * .5 - .2); poachers.add(f); });
const rifle = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .8, 5), new THREE.MeshStandardMaterial({ color: 0x2a241c }));
rifle.rotation.z = 1.15; rifle.position.set(-.35, .78, -.2);
pFigs[0].add(rifle);
scene.add(poachers);
const poach = { u: 0.02, stopped: false };

// elephants
function elephant(sc = 1) {
  const g = new THREE.Group();
  const grey = new THREE.MeshStandardMaterial({ color: 0x8d8a82, roughness: .9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.62, 12, 10), grey);
  body.scale.set(1.35, 1, .95); body.position.y = .95; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.36, 10, 9), grey);
  head.position.set(.95, 1.12, 0);
  const earG = new THREE.SphereGeometry(.3, 8, 6);
  const e1 = new THREE.Mesh(earG, grey); e1.scale.set(.16, 1, .8); e1.position.set(.82, 1.2, .34);
  const e2 = e1.clone(); e2.position.z = -.34;
  const trunkPts = [V3(1.25, 1, 0), V3(1.45, .68, 0), V3(1.42, .34, 0), V3(1.3, .12, 0)];
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunkPts), 8, .09, 6), grey);
  const legG = new THREE.CylinderGeometry(.13, .15, .8, 7);
  for (const [lx, lz] of [[-.42, .3], [-.42, -.3], [.42, .3], [.42, -.3]]) {
    const l = new THREE.Mesh(legG, grey); l.position.set(lx, .4, lz); l.castShadow = true; g.add(l);
  }
  const tuskM = new THREE.MeshStandardMaterial({ color: 0xd8cfb4, roughness: .5 });
  const t1 = new THREE.Mesh(new THREE.ConeGeometry(.045, .38, 6), tuskM);
  t1.rotation.x = Math.PI; t1.rotation.z = -.5; t1.position.set(1.2, .78, .16);
  const t2 = t1.clone(); t2.position.z = -.16;
  g.add(body, head, e1, e2, trunk, t1, t2);
  g.scale.setScalar(sc);
  return g;
}
const herd = new THREE.Group();
const eles = [elephant(1.05), elephant(.85), elephant(.6)];
eles.forEach((e, i) => { e.position.set(-i * 1.6 - (i % 2) * .4, 0, (i % 2) * 1.4 - .6); herd.add(e); });
scene.add(herd);
const herdState = { u: 0, curve: 'in' };
const herdIn = new THREE.CatmullRomCurve3([V3(0, 0, 12), V3(4.5, 0, 7), V3(8.5, 0, 1), V3(11.2, 0, -3.6), V3(12.4, 0, -6.4)]);
const herdOut = new THREE.CatmullRomCurve3([V3(12.4, 0, -6.4), V3(10, 0, -2.5), V3(5.5, 0, 3.5), V3(0, 0, 8), V3(-4, 0, 11)]);

// ranger jeep
const jeep = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, .5, .8), new THREE.MeshStandardMaterial({ color: 0x3e4d38, roughness: .6 }));
  body.position.y = .55; body.castShadow = true;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(.7, .4, .74), new THREE.MeshStandardMaterial({ color: 0x333f2e, roughness: .55 }));
  cab.position.set(-.2, .95, 0);
  const wheelG = new THREE.CylinderGeometry(.22, .22, .16, 10).rotateX(Math.PI / 2);
  const wheelM = new THREE.MeshStandardMaterial({ color: 0x15140f, roughness: .9 });
  jeep.userData.wheels = [];
  for (const [wx, wz] of [[-.5, .42], [-.5, -.42], [.5, .42], [.5, -.42]]) {
    const w = new THREE.Mesh(wheelG, wheelM); w.position.set(wx, .22, wz); jeep.add(w); jeep.userData.wheels.push(w);
  }
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

/* ── FX: flashes, rings, packet streams, uplink ─────────────────────────── */

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
  gsap.to(s.scale, { x: 3.4, y: 3.4, duration: .5, ease: 'power2.out' });
  gsap.to(s.material, { opacity: 0, duration: .55, ease: 'power2.out', onComplete: () => scene.remove(s) });
}
function ringAt(x, z, hue, r = 2.6) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(.4, .035, 8, 48).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(x, heightAt(x, z) + .15, z);
  scene.add(m);
  gsap.to(m.scale, { x: r, y: r, z: r, duration: 1.15, ease: 'power2.out' });
  gsap.to(m.material, { opacity: 0, duration: 1.2, ease: 'power2.out', onComplete: () => scene.remove(m) });
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
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: hue, size: .55, map: glowTex(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, alphaTest: .01 }));
  pts.frustumCulled = false;
  scene.add(line, pts);
  const s = { curve, line, pts, n: N, t0: 0, active: false };
  streams.push(s);
  s.play = (dur = 2.4) => {
    s.t0 = clock.elapsedTime; s.active = true;
    gsap.to([line.material, pts.material], { opacity: .8, duration: .3, overwrite: true });
    gsap.to([line.material, pts.material], { opacity: 0, delay: dur - .5, duration: .6, overwrite: false, onComplete: () => { s.active = false; } });
  };
  return s;
}
const stSer1Gate = stream(V3(6.8, heightAt(6.8, 10.2) + 1.6, 10.2), V3(-21.5, heightAt(-21.5, -3.5) + 2.2, -3.5), HUES.see, 5);
const stSer2Gate = stream(V3(-4.5, heightAt(-4.5, 5.6) + 1.6, 5.6), V3(-21.5, heightAt(-21.5, -3.5) + 2.2, -3.5), HUES.see, 4);
const stVGHQ = stream(V3(12.9, heightAt(12.9, -8.6) + 1.6, -8.6), HQ_TOP, HUES.guard, 2.4);
const stWolfGate = stream(V3(-12, heightAt(-12, 10.5) + 1.4, 10.5), V3(-21.5, heightAt(-21.5, -3.5) + 2.2, -3.5), HUES.listen, 3.6);
const stJWGate = stream(V3(-3, heightAt(-3, 14.5) + 1.4, 14.5), V3(-21.5, heightAt(-21.5, -3.5) + 2.2, -3.5), HUES.link, 4.2);
const stSatHQ = stream(V3(-2, 27, -2), HQ_TOP, HUES.brain, -4);

// gateway → satellite uplink (endpoints move; rebuilt on play)
let uplink = null;
function fireUplink() {
  if (uplink) { scene.remove(uplink.line, uplink.pts); streams.splice(streams.indexOf(uplink), 1); }
  uplink = stream(V3(-21.5, heightAt(-21.5, -3.5) + 2.6, -3.5), sat.position.clone(), HUES.link, 2);
  uplink.play(2.6);
}

/* ── UI: captions, feed, popups ─────────────────────────────────────────── */

const hex = (h) => '#' + h.toString(16).padStart(6, '0');
function caption(hue, k, t, l, hold = 7) {
  const cap = $('#cap');
  cap.style.setProperty('--fa', hex(hue));
  $('#cap-k').textContent = k; $('#cap-t').textContent = t; $('#cap-l').textContent = l;
  gsap.fromTo(cap, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .7, overwrite: true });
  gsap.to(cap, { opacity: 0, delay: hold, duration: .8, overwrite: false });
}
let feedN = 0;
function feed(hue, title, text) {
  const el = document.createElement('div');
  el.className = 'fi';
  el.style.setProperty('--fa', hex(hue));
  el.innerHTML = `<i></i><div><b>${title}</b><span>${text}</span></div><em>${clockStr()}</em>`;
  const list = $('#feed-list');
  list.prepend(el);
  gsap.to(el, { opacity: 1, x: 0, duration: .5, ease: 'power2.out' });
  while (list.children.length > 5) list.removeChild(list.lastChild);
  feedN++;
}
function thumb(kind) {
  const c = document.createElement('canvas'); c.width = 196; c.height = 96;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 96);
  g.addColorStop(0, '#232d26'); g.addColorStop(1, '#11170f');
  x.fillStyle = g; x.fillRect(0, 0, 196, 96);
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, 72, 196, 24);
  x.strokeStyle = 'rgba(240,240,234,.25)'; x.strokeRect(.5, .5, 195, 95);
  if (kind === 'human') {
    x.fillStyle = '#0c0f0b';
    for (let i = 0; i < 3; i++) {
      const px = 46 + i * 42, ph = 34 + (i % 2) * 6;
      x.beginPath(); x.arc(px, 66 - ph, 5, 0, 7); x.fill();
      x.fillRect(px - 6, 66 - ph + 4, 12, ph - 4);
      x.strokeStyle = '#00FF64'; x.lineWidth = 1.5;
      x.strokeRect(px - 12, 66 - ph - 10, 24, ph + 12);
    }
    x.fillStyle = '#00FF64'; x.font = "700 9px 'Hanken Grotesk'";
    x.fillText('HUMAN ×3 · 0.96', 8, 86);
  } else {
    x.fillStyle = '#3b3a35';
    x.beginPath(); x.ellipse(98, 52, 40, 22, 0, 0, 7); x.fill();
    x.beginPath(); x.arc(136, 44, 14, 0, 7); x.fill();
    x.fillRect(146, 44, 6, 22);
    x.strokeStyle = '#FFC800'; x.lineWidth = 1.5; x.strokeRect(52, 24, 106, 52);
    x.fillStyle = '#FFC800'; x.font = "700 9px 'Hanken Grotesk'";
    x.fillText('ELEPHANT ×3 · 0.99', 8, 86);
  }
  return c;
}
const pops = [];
function popup(world, hue, title, conf, sub, kind, hold = 6.5) {
  const el = document.createElement('div');
  el.className = 'pop';
  el.style.setProperty('--fa', hex(hue));
  el.appendChild(thumb(kind));
  const b = document.createElement('div'); b.className = 'p-b';
  b.innerHTML = `<div class="p-t">${title}<em>${conf}</em></div><div class="p-s">${sub}</div>`;
  el.appendChild(b);
  $('#pops').appendChild(el);
  const rec = { el, world };
  pops.push(rec);
  gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .5 });
  gsap.to(el, {
    opacity: 0, delay: hold, duration: .6,
    onComplete: () => { el.remove(); pops.splice(pops.indexOf(rec), 1); },
  });
}
function clockStr() {
  const mins = 401 + Math.floor(tl.time() * 1.4);        // 06:41 + drift
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/* ── timeline ───────────────────────────────────────────────────────────── */

const tl = gsap.timeline({ repeat: -1, paused: true });
const CH = { overview: 0, intrusion: 10, response: 22, coexist: 34, listening: 48, network: 62 };
const cam = (t, p, l, dur, ease = 'power2.inOut') => {
  tl.to(camP, { x: p[0], y: p[1], z: p[2], duration: dur, ease }, t);
  tl.to(camL, { x: l[0], y: l[1], z: l[2], duration: dur, ease }, t);
};

// ── overview 0–10
tl.call(() => {
  gsap.fromTo('#title', { opacity: 0 }, { opacity: 1, duration: 1.4, delay: .4, overwrite: true });
  gsap.to('#title', { opacity: 0, duration: 1, delay: 6.4, overwrite: false });
}, null, .01);
cam(0, [36, 17, 34], [0, 0, 0], 0.01, 'none');
cam(.02, [-8, 15, 32], [-2, 1, 2], 9.8, 'sine.inOut');
tl.call(() => caption(HUES.see, 'A working landscape', 'Sensors in the field', 'Cameras at the chokepoints, ears in the forest, a gateway on the ridge — and the brain above headquarters.', 6), null, 3);

// ── intrusion 10–22
cam(10, [16, 3.6, 15.5], [7, 1.4, 10], 3, 'power3.inOut');
tl.call(() => caption(HUES.see, 'To see · Park protection', 'Three men cross the boundary', 'A trail chokepoint. A camera the size of a hand, twelve months on one battery, watching.', 6.5), null, 10.6);
tl.to(poach, { u: .52, duration: 4, ease: 'none' }, 11);            // walk to the chokepoint
tl.to(poach, { u: .8, duration: 16, ease: 'none' }, 15.2);          // then deeper in
cam(13, [10.5, 3.1, 13.8], [5.5, 1.2, 8.8], 4, 'sine.inOut');
tl.call(() => {                                                     // DETECTION
  flashAt(V3(6.8, heightAt(6.8, 10.2) + 1.6, 10.2), 0xd9ffe4);
  const pp = trail.getPoint(poach.u);
  ringAt(pp.x, pp.z, HUES.see, 3.4);
  gsap.fromTo(fovSer1, { opacity: .3 }, { opacity: .07, duration: 1.6 });
  popup(V3(pp.x, heightAt(pp.x, pp.z) + 2.1, pp.z), HUES.see, 'Human ×3', '0.96', 'SERENGETI-01 · image cropped on the edge · 200 ms', 'human');
}, null, 15);
tl.call(() => { stSer1Gate.play(2.6); feed(HUES.see, 'Serengeti-01 · alert', 'Human ×3 at chokepoint · image → Gateway over LoRa'); }, null, 16.2);
tl.call(() => { fireUplink(); feed(HUES.link, 'Gateway · uplink', 'Relayed by satellite — no cell for 40 km'); }, null, 17.8);
tl.call(() => { stSatHQ.play(2.2); }, null, 19);
tl.call(() => { feed(HUES.brain, 'HQ · Landseed AI', 'Alert on rangers’ phones · 28 s after trigger'); }, null, 19.8);

// ── response 22–34
cam(22, [21.5, 4.5, -6.5], [17, 1.6, -12.3], 2.4, 'power3.inOut');
tl.call(() => caption(HUES.brain, 'To understand · The brain', 'Response before the loss', 'The detection, the image and the place arrive together. A patrol rolls in under a minute.', 6), null, 22.6);
tl.call(() => { jeepState.on = true; jeep.visible = true; feed(HUES.brain, 'HQ · dispatch', 'Patrol unit 2 rolling · intercept set at the ford'); }, null, 23.6);
tl.to(jeepState, { u: 1, duration: 8.4, ease: 'power1.inOut' }, 24);
cam(25.5, [3, 5, -12], [-2, .8, -2], 5.5, 'sine.inOut');            // track the jeep
cam(31, [-10, 3.8, 6.5], [-6, .9, 2.3], 2.6, 'power2.inOut');
tl.call(() => {                                                     // INTERCEPT
  poach.stopped = true;
  jeepState.arrived = true;
  const pp = trail.getPoint(poach.u);
  ringAt(pp.x, pp.z, HUES.see, 3);
  feed(HUES.see, 'Patrol · on site', 'Three detained at the ford · rifles seized');
}, null, 32.2);
tl.call(() => caption(HUES.see, 'Outcome', 'Detained — nothing lost', 'Like the 20 arrests across 13 gangs that earlier versions made possible, beginning in the Serengeti.', 5.5), null, 32.8);

// ── coexistence 34–48
cam(34, [17.5, 3.8, -2], [11.5, 1.2, -7.5], 3, 'power3.inOut');
tl.call(() => caption(HUES.guard, 'To see · Coexistence', 'Elephants head for the crops', 'A VillageGuard on the field edge runs a multi-species model — it knows an elephant from a man from a truck.', 6.5), null, 35);
tl.to(herdState, { u: 1, duration: 8.2, ease: 'none' }, 34);        // approach
tl.call(() => {                                                     // DETECTION
  herdState.curve = 'out';
  flashAt(V3(12.9, heightAt(12.9, -8.6) + 1.6, -8.6), 0xffe9bd);
  ringAt(12.4, -6.4, HUES.guard, 3.2);
  gsap.fromTo(fovVG, { opacity: .32 }, { opacity: .07, duration: 1.6 });
  popup(V3(12.4, heightAt(12.4, -6.4) + 2.6, -6.4), HUES.guard, 'Elephant ×3', '0.99', 'VILLAGEGUARD-04 · alert < 1 KB · direct-to-cell', 'elephant');
  stVGHQ.play(2.2);
  feed(HUES.guard, 'VillageGuard-04 · alert', 'Elephant ×3 approaching the fields');
}, null, 42.2);
tl.call(() => {
  gsap.to(lampMat, { emissiveIntensity: 2.4, duration: .4 });
  gsap.to(villageLight, { intensity: 14, duration: .4 });
  feed(HUES.guard, 'Village · early warning', 'Deterrence lights on · protection unit walking out');
}, null, 43.2);
tl.to(herdState, { u: 0, duration: 5.4, ease: 'sine.inOut' }, 43.4); // turn away (reverse along out-curve)
tl.call(() => caption(HUES.guard, 'Outcome', 'Turned, not shot', 'The herd drifts back to the treeline. No crops lost, no retaliation — coexistence, on time.', 5.5), null, 44.4);

// ── listening 48–62
cam(48, [-5, 5.4, 18], [-11.5, 1.2, 10.5], 3, 'power3.inOut');
tl.call(() => caption(HUES.listen, 'To listen · Bio-acoustics', 'The forest, counted by ear', 'A Wolf hears what no camera frames. Three units triangulate the same call to a point on the map.', 6.5), null, 48.8);
for (const [t, cx, cz] of [[50.4, -14.5, 13.5], [52.6, -9.5, 14.8], [54.6, -12.5, 8]]) {
  tl.call(() => {
    ringAt(cx, cz, HUES.listen, 4.2);
    flashAt(V3(cx, heightAt(cx, cz) + 1.4, cz), 0xf2c8ee);
  }, null, t);
}
tl.call(() => { stWolfGate.play(2.4); feed(HUES.listen, 'Wolf array · detection', 'Primate troop · 3 bearings agree · location fixed'); }, null, 55.4);
tl.call(() => { stJWGate.play(2.4); feed(HUES.link, 'Jungle-Wallah · survey', 'Two individuals re-identified · density updated'); }, null, 57.6);
tl.call(() => caption(HUES.listen, 'Outcome', 'Presence becomes a number', 'Calls become bearings, bearings become density — the measurement layer for Earth Credits.', 5), null, 56.4);

// ── network 62–78
cam(62, [2, 25, 27], [-1, 0, -2], 4.5, 'power2.inOut');
tl.call(() => caption(HUES.brain, 'Every sensor · one brain', 'The whole landscape, reporting', 'See, listen, connect, report — every detection lands in Landseed AI, and the record writes itself.', 9), null, 63.5);
tl.call(() => { stSer1Gate.play(3); stSer2Gate.play(3); }, null, 65);
tl.call(() => { stWolfGate.play(3); stJWGate.play(3); }, null, 65.8);
tl.call(() => { fireUplink(); stVGHQ.play(3); }, null, 66.8);
tl.call(() => { stSatHQ.play(3); }, null, 68);
tl.call(() => feed(HUES.brain, 'Landseed AI · report', 'Daily summary compiled · registry updated'), null, 69);
cam(67, [-6, 21, 24], [0, .5, -1], 10, 'sine.inOut');
tl.call(() => {}, null, 78);                                        // hold the length

// loop housekeeping
tl.eventCallback('onRepeat', () => {
  poach.u = .02; poach.stopped = false;
  herdState.u = 0; herdState.curve = 'in';
  jeepState.u = 0; jeepState.on = false; jeepState.arrived = false;
  jeep.visible = false;
  jeep.userData.lights.forEach(m => m.emissiveIntensity = 0);
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
const upV = V3(0, 1, 0);

function placeOnCurve(group, curve, u, bobT, bobA = .05) {
  const p = curve.getPoint(u);
  const tan = curve.getTangent(Math.min(u + .002, 1)).setY(0).normalize();
  group.position.set(p.x, heightAt(p.x, p.z) + Math.sin(bobT) * bobA, p.z);
  group.rotation.y = Math.atan2(tan.x, tan.z) + (group === herd ? -Math.PI / 2 : 0);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

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
  if (!poach.stopped) placeOnCurve(poachers, trail, poach.u, t * 7, .04);
  pFigs.forEach((f, i) => { f.position.y = poach.stopped ? 0 : Math.abs(Math.sin(t * 6 + i)) * .05; });
  const hc = herdState.curve === 'in' ? herdIn : herdOut;
  placeOnCurve(herd, hc, herdState.curve === 'in' ? herdState.u : 1 - herdState.u, t * 2.4, .03);
  if (jeepState.on) {
    placeOnCurve(jeep, road, jeepState.u, 0, 0);
    jeep.rotation.y -= Math.PI / 2;                                   // body axis correction
    for (const w of jeep.userData.wheels) w.rotation.z -= dt * (jeepState.arrived ? 0 : 8);
  }
  if (jeepState.arrived) {
    const on = Math.floor(t * 5) % 2;
    jeep.userData.lights[0].emissiveIntensity = on ? 3.2 : 0;
    jeep.userData.lights[1].emissiveIntensity = on ? 0 : 3.2;
  }

  // satellite drift
  sat.position.x = -2 + Math.sin(t * .05) * 5;
  sat.position.z = -2 + Math.cos(t * .05) * 5;
  sat.rotation.y = t * .1;

  // streams
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

  // water shimmer
  water.material.opacity = .84 + Math.sin(t * 1.3) * .04;

  // camera
  camera.position.set(camP.x, camP.y, camP.z);
  camera.up.copy(upV);
  camera.lookAt(camL.x, camL.y, camL.z);

  // projected popups + chapter chip + clock
  for (const rec of pops) {
    proj.copy(rec.world).project(camera);
    if (proj.z > 1) { rec.el.style.display = 'none'; continue; }
    rec.el.style.display = '';
    rec.el.style.left = ((proj.x * .5 + .5) * innerWidth) + 'px';
    rec.el.style.top = ((-proj.y * .5 + .5) * innerHeight) + 'px';
  }
  markChapter();
  $('#feed-clock').textContent = clockStr();

  composer.render();
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* ── boot ───────────────────────────────────────────────────────────────── */

window.__demo = { tl, camera, camP, camL, CH };
animate();
requestAnimationFrame(() => requestAnimationFrame(() => {
  const loader = $('#loader');
  gsap.to(loader, { opacity: 0, duration: .7, delay: .3, onComplete: () => loader.remove() });
  setTimeout(() => { document.body.classList.remove('booting'); tl.play(0); }, 600);
}));
