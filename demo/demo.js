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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/* ── optional real terrain (AWS Terrain Tiles, public domain data) ─────────
   /demo/?terrain=real&lat=..&lon=..  — same simulation, real topography. */
const qs = new URLSearchParams(location.search);
const TWIN = qs.get('terrain') !== 'fictional' && qs.get('terrain') !== 'real';
const REAL = TWIN || qs.get('terrain') === 'real';
const LOW = innerWidth < 760 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
let satTex = null;
// Story anchors. Twin values are hand-picked from the real imagery and DEM:
// the east farm/forest boundary, real fields, a real crater rim for the
// Gateway (3,340 m — 700 m over the farm belt), real canopy clearings.
const AN = TWIN ? {
  // west act: the intrusion CLIMBS from the NW boundary farmland (2,120 m)
  // into the massif's forest — HQ below at 2,000 m, crossing at 2,600 m,
  // the listening meadow at 2,730 m under the 4,170 m peak.
  ser1: [-14, -10.5], ser2: [-6, -6.5], vg: [17.5, 9],
  w1: [0, -13], w2: [7, -19.5], jw: [10, -12],
  gate: [13.5, 16.2], ai: [12, -2], village: [28, 8.5], villages: [[28, 8.5]],
  informant: [-33.5, -22.5], truck: [-27.5, -15.5],
  trail: [[-25, -14], [-21, -11], [-17, -8], [-12, -5.5], [-7, -4], [-2, -3.5]],
  road: [[12, -2], [8, -2.4], [4, -2.9], [0, -3.2], [-2, -3.5]],
  herdIn: [[0, 12], [4.5, 11], [9, 10], [12.5, 9.2], [14.5, 8.6]],
  herdOut: [[14.5, 8.6], [11.5, 9.5], [8, 10.4], [4, 11.4], [.5, 12.3]],
  guard: [[28, 8.5], [24.5, 8.3], [21.5, 8.2]],
  pack: [4, -16],
} : {
  ser1: [6.8, 10.2], ser2: [-4.5, 5.6], vg: [12.9, -8.6],
  w1: [-10.5, 14.2], w2: [-15, 16.5], w3: [-17.5, 13.2], jw: [-3, 14.5],
  gate: [-21.5, -3.5], ai: [17, -12.3], village: [17.5, -12.8],
  informant: [25.2, 19.8], truck: [29.6, 19.1],
  trail: null, road: null, herdIn: null, herdOut: null, guard: null,
  pack: [-13.5, 15.2],
};
let dem = null;   // {grid: Float32Array, n, base}
async function loadDEM() {
  const lat = parseFloat(qs.get('lat') || (TWIN ? '-1.43' : '-1.32'));
  const lon = parseFloat(qs.get('lon') || (TWIN ? '29.45' : '35.12'));
  const z = TWIN ? 13 : 12;
  const n = Math.pow(2, z);
  const xt = Math.floor((lon + 180) / 360 * n);
  const yt = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  const cv = document.createElement('canvas'); cv.width = cv.height = 768;
  const cx = cv.getContext('2d');
  const jobs = [];
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
    jobs.push(new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { cx.drawImage(img, dx * 256, dy * 256); res(); };
      img.onerror = rej;
      img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${xt + dx}/${yt + dy}.png`;
    }));
  }
  await Promise.all(jobs);
  const px = cx.getImageData(0, 0, 768, 768).data;
  const grid = new Float32Array(768 * 768);
  for (let i = 0; i < 768 * 768; i++)
    grid[i] = px[i * 4] * 256 + px[i * 4 + 1] + px[i * 4 + 2] / 256 - 32768;
  const sorted = Float32Array.from(grid).sort();
  dem = { grid, n: 768, base: sorted[Math.floor(sorted.length * .12)] };
}
const soldierFetch = new Promise((res) => {
  new GLTFLoader().load('./assets/soldier.glb', (g) => res(g), undefined, () => res(null));
});
if (REAL) { try { await Promise.race([Promise.all([loadDEM(), TWIN ? loadSat() : Promise.resolve()]), new Promise((_, r) => setTimeout(r, 12000))]); } catch (e) { dem = null; satTex = null; console.warn('DEM unavailable — procedural terrain', e); } }
async function loadSat() {
  const lat = parseFloat(qs.get('lat') || '-1.43');
  const lon = parseFloat(qs.get('lon') || '29.45');
  const z13 = 13, n13 = Math.pow(2, z13);
  const xt = Math.floor((lon + 180) / 360 * n13);
  const yt = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n13);
  const mul = LOW ? 2 : 4;                                           // z14 on small GPUs, z15 elsewhere
  const zi = LOW ? 14 : 15;
  const x0 = (xt - 1) * mul, y0 = (yt - 1) * mul;
  const N = 3 * mul;
  const cv = document.createElement('canvas'); cv.width = cv.height = N * 256;
  const cx = cv.getContext('2d');
  const jobs = [];
  for (let dy = 0; dy < N; dy++) for (let dx = 0; dx < N; dx++) {
    jobs.push(new Promise((res) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { cx.drawImage(img, dx * 256, dy * 256); res(); };
      img.onerror = () => res();
      img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zi}/${y0 + dy}/${x0 + dx}`;
    }));
  }
  await Promise.all(jobs);
  cx.globalCompositeOperation = 'multiply';                          // a whisper of our palette, nothing more
  cx.fillStyle = '#e2e8dc'; cx.fillRect(0, 0, cv.width, cv.height);
  cx.globalCompositeOperation = 'source-over';
  satTex = new THREE.CanvasTexture(cv);
  satTex.colorSpace = THREE.SRGBColorSpace;
  satTex.anisotropy = 8;
}
function demAt(x, z) {
  // twin drapes the full plane; fictional keeps its central window
  const u = TWIN ? (x + 55) / 110 * 766 : (x + 38) / 76 * 645 + 61;
  const v = TWIN ? (z + 42) / 84 * 766 : (z + 28) / 56 * 474 + 147;
  const i0 = Math.floor(u), j0 = Math.floor(v), fu = u - i0, fv = v - j0;
  const g = dem.grid, n = dem.n;
  const a = g[j0 * n + i0], b = g[j0 * n + i0 + 1], c = g[(j0 + 1) * n + i0], d2 = g[(j0 + 1) * n + i0 + 1];
  const e = (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d2 * fu) * fv;
  return Math.min(TWIN ? 12 : 6.4, Math.max(-1.6, (e - dem.base) / (TWIN ? 115 : 240)));
}
const HUES = { see: 0x00FF64, guard: 0xFFC800, link: 0x32C8FF, listen: 0xE682E6, brain: 0x9B6CE0, report: 0x1482FF };

/* ── renderer / scene / light ───────────────────────────────────────────── */

const renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true });
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setTimeout(() => location.reload(), 400); });
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2e3833, 0.0096);

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
// One continuous 78 s flight. Duplicate keys are holds; Catmull-Rom through
// neighbours keeps velocity continuous, so arrivals decelerate and departures
// build — no per-move starts.
const CAMKEYS = TWIN ? [
  // Mission control: ONE fixed command view of the whole board for all 78 s.
  // The only motion is a near-imperceptible push-in plus the drone sway.
  // Every scene plays as events lighting up across a stationary map.
  [0,  -34, 36, -36,  -10, 8, -5],
  [78, -36, 48, -46,  0, 2, 2],
] : [
  [0,    50, 27, 46,    -5, 9, -2],       // the whole system (loop frame)
  [9,    33, 16, 30,     10, 2, 9],       // drifting in over the river
  [10.8, 30, 13, 26,    27.4, .7, 19.4],  // the stakeout: watcher, cover, men at the truck
  [13.4, 30, 13, 26,    27.4, .7, 19.4],  // · hold — the report goes out
  [15,   23, 11, 21,    13, 1, 11],       // transit — damps the spline's curl
  [16.6, 16.5, 8.5, 15.5, 4.5, .8, 7.5],  // behind the group, sensor ahead
  [21.4, 16.5, 8.5, 15.5, 4.5, .8, 7.5],  // · hold — detection at range, relay
  [22.6, 20, 15, 7,     12, .5, -6],      // over the forest
  [24.4, 25, 11, -1,    17, .8, -12.3],   // HQ
  [26.2, 25, 11, -1,    17, .8, -12.3],   // · hold — dispatch
  [29.4, 12, 12, -3,     2, .6, 1],       // riding behind the jeep
  [32.2, 2.5, 11.5, 10.5, -3, .6, 4.4],   // the crossing, birds-eye
  [36.6, 2.5, 11.5, 10.5, -3, .6, 4.4],   // · hold — the arrest plays, nothing hides it
  [38.4, 11, 18, 6,      9, 0, -5],       // crane over the forest
  [40.4, 22, 17, 6,      9.5, 0, -6.5],   // coexistence board view
  [45.8, 22, 17, 6,      9.5, 0, -6.5],   // · hold — detection, guards emerge, a breath
  [49.4, 19, 14, 3,     10.5, .3, -6.5],  // one slow push as the deterrent plays
  [50.9, 7, 16, 12,     -1, .8, 5],       // over the river
  [53.2, -3.5, 12, 26,  -13.5, 1.2, 14.6],// the listening meadow from altitude
  [61.9, -3.5, 12, 26,  -13.5, 1.2, 14.6],// · hold — howls, reports
  [78,   50, 27, 46,    -5, 9, -2],       // one pull home — lands on the opening frame
];

function crv(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return .5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}
const camP = { x: 50, y: 27, z: 46 }, camL = { x: -5, y: 9, z: -2 };
// moves are hold-to-hold runs; each is eased as ONE arc-length-parameterised
// bell, so velocity is continuous everywhere — verified numerically at 60 Hz
const CAMMOVES = (() => {
  const same = (i, j) => CAMKEYS[i][1] === CAMKEYS[j][1] && CAMKEYS[i][2] === CAMKEYS[j][2] && CAMKEYS[i][3] === CAMKEYS[j][3];
  const dist = (i, j) => Math.hypot(CAMKEYS[i][1] - CAMKEYS[j][1], CAMKEYS[i][2] - CAMKEYS[j][2], CAMKEYS[i][3] - CAMKEYS[j][3]);
  const out = [];
  let i = 0;
  while (i < CAMKEYS.length - 1) {
    if (same(i, i + 1)) { i++; continue; }
    let j = i;
    while (j < CAMKEYS.length - 1 && !same(j, j + 1)) j++;
    const cum = [0];
    for (let k = i; k < j; k++) cum.push(cum[cum.length - 1] + dist(k, k + 1));
    out.push({ t0: CAMKEYS[i][0], t1: CAMKEYS[j][0], i0: i, cum });
    i = j;
  }
  return out;
})();
function sampleCam(T) {
  let mv = null;
  for (const m of CAMMOVES) {
    if (T < m.t0) { mv = null; setKey(m.i0); return; }
    if (T <= m.t1) { mv = m; break; }
  }
  if (!mv) { setKey(CAMKEYS.length - 1); return; }
  let sPar = (T - mv.t0) / (mv.t1 - mv.t0);
  sPar = sPar * sPar * sPar * (sPar * (sPar * 6 - 15) + 10);
  const arc = sPar * mv.cum[mv.cum.length - 1];
  let seg = 0;
  while (seg < mv.cum.length - 2 && arc > mv.cum[seg + 1]) seg++;
  const u = (arc - mv.cum[seg]) / Math.max(1e-6, mv.cum[seg + 1] - mv.cum[seg]);
  const gi = mv.i0 + seg;
  const a = CAMKEYS[Math.max(0, gi - 1)], b = CAMKEYS[gi], c = CAMKEYS[gi + 1], d = CAMKEYS[Math.min(CAMKEYS.length - 1, gi + 2)];
  for (let k = 0; k < 3; k++) {
    const kk = 'xyz'[k];
    camP[kk] = crv(a[1 + k], b[1 + k], c[1 + k], d[1 + k], u);
    camL[kk] = crv(a[4 + k], b[4 + k], c[4 + k], d[4 + k], u);
  }
}
function setKey(i) {
  const k = CAMKEYS[i];
  camP.x = k[1]; camP.y = k[2]; camP.z = k[3];
  camL.x = k[4]; camL.y = k[5]; camL.z = k[6];
}

scene.add(new THREE.HemisphereLight(0xaec4d4, 0x2f2a1c, .8));
scene.add(new THREE.AmbientLight(0x2c3a30, .5));
const sun = new THREE.DirectionalLight(0xffc98f, TWIN ? 3.5 : 2.75);   // twin leans on hillshading for depth
sun.position.set(-40, 13, 12);                                       // low in the west — long dusk shadows
sun.castShadow = true;
sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
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
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .2, .7, .88));
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uTime;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(.299, .587, .114));
      c.rgb *= mix(vec3(.93, 1.02, 1.09), vec3(1.07, 1.0, .9), smoothstep(.12, .85, l));   // teal shadows, warm highs
      c.rgb = mix(vec3(l), c.rgb, .92);                                                    // gentle desaturation
      float d = distance(vUv, vec2(.5, .46));
      c.rgb *= 1. - .16 * smoothstep(.46, .9, d);                                          // vignette
      c.rgb += (hash(vUv * vec2(1920., 1080.) + fract(uTime) * 7.) * 2. - 1.) * .025;      // grain
      gl_FragColor = c;
    }`,
});
composer.addPass(grade);

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
function fbm(x, z) {
  return 1.0 * noise(x, z) + .5 * noise(x * 2.1 + 7, z * 2.1 + 3) + .25 * noise(x * 4.3 + 13, z * 4.3 + 11);
}
function heightAt(x, z) {
  if (dem) {
    let h = demAt(x, z) + .18 * noise(x * .4, z * .4);
    const gv = Math.exp(-(((x - 17) ** 2 + (z + 12.5) ** 2)) / 30);
    return h * (1 - gv) + Math.max(.3, demAt(17, -12.5)) * gv;                    // village still flattens
  }
  // domain-warped fbm — natural drainage and soft interlocking spurs
  const wx = x + 6 * noise(x * .045 + 31, z * .045 + 17) - 3;
  const wz = z + 6 * noise(x * .045 + 5, z * .045 + 47) - 3;
  let h = 1.35 * fbm(wx * .06, wz * .06) + .3 * noise(x * .5, z * .5) - 1.05;
  h -= .16 * Math.abs(noise(wx * .3 + 9, wz * .3) - .5) * 2 * Math.min(1, Math.max(0, h));   // erosion grooves bite the slopes
  h += 5.6 * Math.exp(-((x + 24) ** 2) / 52) * (0.72 + 0.28 * noise(z * .1, 3)); // western ridge
  const dr = z - riverZ(x);
  h -= 2.3 * Math.exp(-(dr * dr) / 3.4);                                          // wider, softer valley
  h -= .5 * Math.exp(-(dr * dr) / 14);                                            // valley shoulders
  const gv = Math.exp(-(((x - 17) ** 2 + (z + 12.5) ** 2)) / 30);
  h = h * (1 - gv) + .5 * gv;                                                     // village flat
  return Math.max(h, -1.7);
}

const mkCurve = (pts) => new THREE.CatmullRomCurve3(pts.map(pp => V3(pp[0], 0, pp[1])));
const trail = AN.trail ? mkCurve(AN.trail) : new THREE.CatmullRomCurve3([
  V3(30, 0, 18), V3(21, 0, 14.5), V3(13, 0, 11), V3(6, 0, 9), V3(0, 0, 7.2), V3(-6, 0, 2.5), V3(-10, 0, -1.5),
]);
const road = AN.road ? mkCurve(AN.road) : new THREE.CatmullRomCurve3([
  V3(16, 0, -11.5), V3(10, 0, -9.5), V3(4, 0, -7), V3(-2, 0, -3), V3(-6, 0, 1.5),
]);
const herdIn = AN.herdIn ? mkCurve(AN.herdIn) : new THREE.CatmullRomCurve3([V3(0, 0, 12), V3(4.5, 0, 7), V3(8.5, 0, 1), V3(10.6, 0, -2.8), V3(11.5, 0, -4.6)]);
const herdOut = AN.herdOut ? mkCurve(AN.herdOut) : new THREE.CatmullRomCurve3([V3(11.5, 0, -4.6), V3(9.5, 0, -1.5), V3(5.5, 0, 3.5), V3(0, 0, 8), V3(-4, 0, 11)]);
function nearCurve(curve, x, z, n = 60) {
  let m = 1e9;
  for (let i = 0; i <= n; i++) {
    const p = curve.getPoint(i / n);
    m = Math.min(m, (p.x - x) ** 2 + (p.z - z) ** 2);
  }
  return Math.sqrt(m);
}

{
  const geo = new THREE.PlaneGeometry(110, 84, LOW ? 170 : 300, LOW ? 130 : 230).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cGrass1 = new THREE.Color(0x44603a), cGrass2 = new THREE.Color(0x54693c), cDry = new THREE.Color(0x6e7145);
  const cForest = new THREE.Color(0x2a4527), cRock = new THREE.Color(0x6e6156);
  const cSand = new THREE.Color(0x94805a), cDirt = new THREE.Color(0x6f5c40);
  const cCrop = new THREE.Color(0x847e44);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const n = noise(x * .11 + 40, z * .11 + 7);
    tmp.copy(cGrass1).lerp(cGrass2, n).lerp(cDry, Math.max(0, (-z - 6) / 30) * .5);   // dryer to the south
    if (z > -8 && x > -20 && x < 10) tmp.lerp(cForest, .75 * Math.min(1, Math.max(0, (n - .48) / .14)));   // soft forest edge
    if (h > 2.9) tmp.lerp(cRock, Math.min(1, (h - 2.9) / 2));
    if (!dem) {
      const rd = Math.abs(z - riverZ(x));
      if (rd < 3) tmp.lerp(cSand, .5 * Math.max(0, 1 - rd / 3));                       // graded banks
      if (rd < 6) tmp.lerp(cForest, .12 * Math.max(0, 1 - rd / 6));                    // riparian green
    }
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
  const ground = new THREE.Mesh(geo, (TWIN && satTex)
    ? new THREE.MeshStandardMaterial({ map: satTex, emissive: 0xffffff, emissiveMap: satTex, emissiveIntensity: .3, roughness: .96, metalness: 0 })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 }));
  ground.receiveShadow = true;
  scene.add(ground);
}

// flowing water — scrolling ripple texture over a deep base
const waterTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#245062'; x.fillRect(0, 0, 256, 256);
  let sd2 = 77; const r2 = () => (sd2 = (sd2 * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 240; i++) {
    x.strokeStyle = `rgba(255,255,255,${.02 + r2() * .05})`;
    x.lineWidth = 1 + r2() * 1.6;
    const y = r2() * 256;
    x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(85, y + r2() * 8 - 4, 170, y + r2() * 8 - 4, 256, y); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 5);
  return t;
})();
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(110, 84).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ map: waterTex, color: 0xaac9d6, roughness: .22, metalness: .22, transparent: true, opacity: .92 }));
water.position.y = dem ? -.15 : -.35;
if (TWIN && satTex) water.visible = false;
scene.add(water);

// soft clouds in the sky (their shadows live in the breathing sunlight)
const cloudShadows = [];
{
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  for (const [cx2, cy, r] of [[80, 70, 46], [130, 58, 52], [180, 72, 40], [110, 82, 38]]) {
    const g = x.createRadialGradient(cx2, cy, 4, cx2, cy, r);
    g.addColorStop(0, 'rgba(235,225,210,.5)'); g.addColorStop(1, 'rgba(235,225,210,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx2, cy, r, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, opacity: .5, fog: false, depthWrite: false }));
    sp.position.set(-60 + i * 42, 32 + (i % 2) * 7, -40 - i * 14);
    sp.scale.set(46, 20, 1);
    scene.add(sp);
    cloudShadows.push({ m: sp, ph: 9 + i * 1.7, sky: true });
  }
}
// fireflies at the forest edge — dusk, alive
let fireflies;
{
  const N = 70, fp = new Float32Array(N * 3), base = [];
  let sd3 = 41; const r3 = () => (sd3 = (sd3 * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) {
    const x2 = -14 + r3() * 18, z2 = 2 + r3() * 15;
    base.push([x2, heightAt(x2, z2) + .5 + r3() * 1.6, z2]);
    fp.set(base[i], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  fireflies = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8f2a0, size: .1, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
  fireflies.userData.base = base;
  scene.add(fireflies);
}

/* ── vegetation & rocks (instanced, three species) ──────────────────────── */

const SPOTS = [[6.8, 10.2], [-4.5, 5.6], [12.9, -8.6], [-10.5, 14.2], [-15, 16.5], [-17.5, 13.2], [-3, 14.5], [-21.5, -3.5], [-13.5, 15.2], [-12, 15.9], [-14.9, 14.4], [-8, 18.5], [-6, 20], [-2.8, 5.3], [-1, 3.5], [-5, 3.8], [0, 6.5], [-9, 16.5]];
function scatterOK(x, z, h) {
  if (h < -.2 || h > 3.6) return false;
  if (Math.abs(z - riverZ(x)) < 2.4) return false;
  if (nearCurve(trail, x, z, 30) < 1.8) return false;
  if (nearCurve(road, x, z, 20) < 1.8) return false;
  if ((x - 17) ** 2 + (z + 12.5) ** 2 < 42) return false;
  if (SPOTS.some(([sx, sz]) => (x - sx) ** 2 + (z - sz) ** 2 < 8)) return false;
  if (nearCurve(herdIn, x, z, 30) < 2.4) return false;               // keep the elephant lane open
  if (((x - 12.6) ** 2) / 9 + ((z + 7) ** 2) / 5 < 1.4) return false; // and the crops
  if ((x - 6.6) ** 2 + (z + 9.6) ** 2 < 18) return false;            // and the close-up camera position
  return true;
}
{
  const inForest = (x, z) => noise(x * .11 + 40, z * .11 + 7) > .53 && z > -8 && x > -20 && x < 10;
  const trunkG = new THREE.CylinderGeometry(.07, .12, 1, 6);
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x453723, roughness: .95 });
  const conG = new THREE.ConeGeometry(.72, 2.3, 8);
  const blobG = new THREE.SphereGeometry(.78, 9, 7);
  const blobTopG = new THREE.SphereGeometry(.5, 8, 6);
  const accG = new THREE.SphereGeometry(1, 9, 6);
  const leafM = () => new THREE.MeshStandardMaterial({ roughness: .95 });
  const NT = (TWIN && satTex) ? 0 : (LOW ? 380 : 620);
  const trunks = new THREE.InstancedMesh(trunkG, trunkM, NT);
  const cons = new THREE.InstancedMesh(conG, leafM(), NT);
  const blobs = new THREE.InstancedMesh(blobG, leafM(), NT);
  const blobTops = new THREE.InstancedMesh(blobTopG, leafM(), NT);
  const accs = new THREE.InstancedMesh(accG, leafM(), 80);
  trunks.castShadow = cons.castShadow = blobs.castShadow = blobTops.castShadow = accs.castShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  const G1 = new THREE.Color(0x2e4a26), G2 = new THREE.Color(0x24401f), G3 = new THREE.Color(0x3a5429), GA = new THREE.Color(0x4c6633);
  const Y = new THREE.Vector3(0, 1, 0);
  let nTr = 0, nCo = 0, nBl = 0, nAc = 0, guard = 0;
  while (nTr < NT && guard++ < 14000) {
    const x = (rnd() - .5) * 72, z = (rnd() - .5) * 52;
    const h = heightAt(x, z);
    const forest = inForest(x, z);
    const savanna = z < -9 && x < 9 && rnd() < .05;
    if (!(forest || savanna) || !scatterOK(x, z, h)) continue;
    const sc = .75 + rnd() * .9;
    q.setFromAxisAngle(Y, rnd() * 6.28);
    if (savanna && nAc < 80) {                     // acacia — tall bare trunk, flat crown on top
      pv.set(x, h + 1.05 * sc, z); sv.set(.9, 2.1 * sc, .9);
      m.compose(pv, q, sv); trunks.setMatrixAt(nTr++, m);
      pv.set(x, h + 2.3 * sc, z); sv.set(sc * 1.7, sc * .34, sc * 1.7);
      m.compose(pv, q, sv); accs.setMatrixAt(nAc, m); accs.setColorAt(nAc, GA); nAc++;
    } else if (rnd() > .45 && nCo < NT) {          // conifer — short trunk, tall cone
      pv.set(x, h + .35 * sc, z); sv.set(.8, .7 * sc, .8);
      m.compose(pv, q, sv); trunks.setMatrixAt(nTr++, m);
      pv.set(x, h + (0.7 + 1.15) * sc, z); sv.set(sc, sc * (1 + rnd() * .35), sc);
      m.compose(pv, q, sv); cons.setMatrixAt(nCo, m); cons.setColorAt(nCo, rnd() > .5 ? G1 : G2); nCo++;
    } else if (nBl < NT) {                         // broadleaf — trunk + two-lobed crown
      pv.set(x, h + .6 * sc, z); sv.set(.9, 1.2 * sc, .9);
      m.compose(pv, q, sv); trunks.setMatrixAt(nTr++, m);
      const col = rnd() > .5 ? G3 : G1;
      pv.set(x, h + 1.75 * sc, z); sv.set(sc, sc * .85, sc);
      m.compose(pv, q, sv); blobs.setMatrixAt(nBl, m); blobs.setColorAt(nBl, col);
      pv.set(x + .35 * sc, h + 2.25 * sc, z + .15 * sc); sv.set(sc * .8, sc * .7, sc * .8);
      m.compose(pv, q, sv); blobTops.setMatrixAt(nBl, m); blobTops.setColorAt(nBl, col); nBl++;
    }
  }
  trunks.count = nTr; cons.count = nCo; blobs.count = nBl; blobTops.count = nBl; accs.count = nAc;
  scene.add(trunks, cons, blobs, blobTops, accs);

  // bushes + rocks
  const bushes = new THREE.InstancedMesh(new THREE.SphereGeometry(.4, 7, 5), leafM(), 220);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.5),
    new THREE.MeshStandardMaterial({ color: 0x7b7266, roughness: .95, flatShading: true }), 90);
  rocks.castShadow = true;
  let nB = 0, nR = 0; guard = 0;
  while ((nB < 220 || nR < 90) && guard++ < 9000) {
    const x = (rnd() - .5) * 72, z = (rnd() - .5) * 52;
    const h = heightAt(x, z);
    if ((TWIN && satTex) || !scatterOK(x, z, h)) continue;
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

  // grass tufts — small, everywhere the story walks
  const tuftG = new THREE.ConeGeometry(.09, .42, 4);
  const tufts = new THREE.InstancedMesh(tuftG, leafM(), (TWIN && satTex) ? 1 : (LOW ? 320 : 900));
  let nG = 0; guard = 0;
  const GT1 = new THREE.Color(0x5d7a42), GT2 = new THREE.Color(0x6d8449);
  while (nG < ((TWIN && satTex) ? 0 : (LOW ? 320 : 900)) && guard++ < 12000) {
    const x = (rnd() - .5) * 70, z = (rnd() - .5) * 50;
    const h = heightAt(x, z);
    if (h < -.1 || h > 2.6) continue;
    if (Math.abs(z - riverZ(x)) < 1.6) continue;
    if ((x - 17) ** 2 + (z + 12.5) ** 2 < 30) continue;
    const sc = .6 + rnd() * .9;
    pv.set(x, h + .18 * sc, z); q.setFromAxisAngle(Y, rnd() * 6.28); sv.set(sc, sc, sc);
    m.compose(pv, q, sv); tufts.setMatrixAt(nG, m);
    tufts.setColorAt(nG, rnd() > .5 ? GT1 : GT2); nG++;
  }
  tufts.count = nG;
  scene.add(tufts);
}

/* ── park boundary ──────────────────────────────────────────────────────── */
{
  const pts = [];
  const loop = TWIN
    ? [[-24, -42], [-28, -35], [-32.5, -28], [-37, -21], [-41.5, -14], [-46, -7], [-50, -1]]
    : [[-28, -18], [10, -18], [10, 22], [-28, 22]];
  for (let s2 = 0; s2 < loop.length - (TWIN ? 1 : 0); s2++) {
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
const villageGrp = new THREE.Group();
scene.add(villageGrp);
{
  const hutW = new THREE.MeshStandardMaterial({ color: 0xb09062, roughness: .9 });
  const hutR = new THREE.MeshStandardMaterial({ color: 0x6b4f30, roughness: .95 });
  for (const [x, z] of [[15.2, -14.4], [17.6, -15.2], [19.6, -13.4], [18.9, -10.8], [15.8, -10.2], [20.4, -15.8]]) {
    const h = heightAt(x, z);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.85, .95, 1.1, 8), hutW);
    w.position.set(x, h + .55, z); w.castShadow = true;
    const r = new THREE.Mesh(new THREE.ConeGeometry(1.25, .95, 8), hutR);
    r.position.set(x, h + 1.55, z); r.castShadow = true;
    villageGrp.add(w, r);
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
  const hqGrp = new THREE.Group();
  hqGrp.add(hq, roof, mast, win, win2);
  scene.add(hqGrp);
  window.__hqGrp = hqGrp;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x5a5148 }));
  const lh = heightAt(17.5, -13.8);
  pole.position.set(17.5, lh + 1.2, -13.8);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 10), lampMat);
  bulb.position.set(17.5, lh + 2.45, -13.8);
  villageLight.position.set(17.5, lh + 2.4, -13.8);
  villageGrp.add(pole, bulb, villageLight);
}
const SAT_POS = V3(TWIN ? -2 : -8, TWIN ? 28 : 21.5, TWIN ? 0 : -4);
const HQ_TOP = V3(AN.ai[0], heightAt(AN.ai[0], AN.ai[1]) + 2.2, AN.ai[1]);

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

const SENSORS = [];
function placeS(id, x, z, ry, sc) { const g = place(id, x, z, ry, sc); SENSORS.push({ id, g }); return g; }
placeS('serengeti', AN.ser1[0], AN.ser1[1], 1.4, 2.6);
placeS('serengeti', AN.ser2[0], AN.ser2[1], 1.25, 2.6);
placeS('villageguard', AN.vg[0], AN.vg[1], -.4, 2.6);
const wolves = [placeS('wolf', AN.w1[0], AN.w1[1], .6, 2.8), placeS('wolf', AN.w2[0], AN.w2[1], 0, 2.8)];
placeS('junglewallah', AN.jw[0], AN.jw[1], 2.4, 2.6);
placeS('gateway', AN.gate[0], AN.gate[1], 1.1, 3.3);
const sAI = placeS('ai', AN.ai[0], AN.ai[1], 0, 1.1);
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
// aim each wedge from the sensor toward its approach (twin uses real anchors)
const aimAt = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);
const fovSer1 = fovWedge(AN.ser1[0], AN.ser1[1], TWIN ? aimAt(AN.ser1, [-17, -8]) : 1.39, HUES.see, TWIN ? 6.5 : 8.5, .42);
const fovSer2 = fovWedge(AN.ser2[0], AN.ser2[1], TWIN ? aimAt(AN.ser2, [-9, -4.5]) : 1.23, HUES.see, TWIN ? 5.5 : 7.5, .42);
const fovVG = fovWedge(AN.vg[0], AN.vg[1], TWIN ? aimAt(AN.vg, [12, 9.4]) : -.38, HUES.guard, TWIN ? 5.5 : 8, .52);

/* ── satellite ──────────────────────────────────────────────────────────── */

const sat = new THREE.Group();
{
  // body — the brand cube: lockup on every side face, so the logo never leaves
  const lockupTex = new THREE.TextureLoader().load('/public/landseed-ai-lockup.png');
  const sideM = new THREE.MeshBasicMaterial({ map: lockupTex, color: 0xffffff });
  const capM = new THREE.MeshStandardMaterial({ color: 0x0b120c, roughness: .5, metalness: .35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), [sideM, sideM, capM, capM, sideM, sideM]);
  const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.17, 1.17, 1.17)),
    new THREE.LineBasicMaterial({ color: 0x59F5A0, transparent: true, opacity: .85 }));
  // solar wings — two cell panels per side, vertical green cells
  const cellTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = '#0d1a10'; x.fillRect(0, 0, 128, 96);
    x.strokeStyle = '#2ee87e'; x.lineWidth = 3;
    for (let i = 10; i < 128; i += 17) { x.beginPath(); x.moveTo(i, 6); x.lineTo(i, 90); x.stroke(); }
    x.strokeStyle = 'rgba(46,232,126,.65)'; x.strokeRect(2, 2, 124, 92);
    return new THREE.CanvasTexture(c);
  })();
  const panelM = new THREE.MeshStandardMaterial({ map: cellTex, emissive: 0x1a5c38, emissiveMap: cellTex, emissiveIntensity: .8, roughness: .6 });
  for (const side of [1, -1]) {
    const boom = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, .05),
      new THREE.MeshStandardMaterial({ color: 0x59F5A0, emissive: 0x2ee87e, emissiveIntensity: .5 }));
    boom.position.x = side * .8;
    sat.add(boom);
    for (let i = 0; i < 2; i++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(.78, .78, .04), panelM);
      panel.position.x = side * (1.72 + i * .86);
      sat.add(panel);
    }
  }
  // antenna halo
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.3, .022, 8, 20, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x59F5A0, emissive: 0x2ee87e, emissiveIntensity: .7 }));
  halo.position.y = .95;
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .22, 6), halo.material);
  stalk.position.y = .82;
  sat.add(body, rim, halo, stalk);
  sat.scale.setScalar(1.9);
  sat.position.set(SAT_POS.x, SAT_POS.y, SAT_POS.z);
  scene.add(sat);
}

/* ── actors ─────────────────────────────────────────────────────────────── */

// rigged human — cloned from the shared Soldier asset with real clips
let soldierProto = null, soldierClips = null;
const mixers = [];
{
  const g = await soldierFetch;                          // kicked off before the world build — overlaps CPU work
  if (g) { soldierProto = g.scene; soldierClips = g.animations; }
  else console.warn('soldier asset unavailable');
}
function figure(color, h = .8) {
  const g = new THREE.Group();
  if (soldierProto) {
    const inst = SkeletonUtils.clone(soldierProto);
    inst.scale.setScalar(.62);
    inst.rotation.y = Math.PI;                        // rig faces -Z; our headings are +Z
    inst.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.material = o.material.clone();
        o.material.color = new THREE.Color(color).multiplyScalar(1.6);
        o.material.roughness = .9;
      }
    });
    const mixer = new THREE.AnimationMixer(inst);
    const act = {};
    for (const c of soldierClips) act[c.name] = mixer.clipAction(c);
    act.Idle?.play();
    g.add(inst);
    g.userData.mixer = mixer; g.userData.act = act; g.userData.mode = 'Idle';
    mixers.push(mixer);
  } else {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.145, h * .62, 3, 8), new THREE.MeshStandardMaterial({ color, roughness: .88 }));
    body.position.y = h * .66; body.castShadow = true;
    g.add(body);
  }
  return g;
}
function setGait(fig, mode) {                                   // 'Idle' | 'Walk' | 'Run'
  const a = fig.userData.act; if (!a || fig.userData.mode === mode) return;
  a[fig.userData.mode]?.fadeOut(.25);
  a[mode]?.reset().fadeIn(.25).play();
  fig.userData.mode = mode;
}
// a hand lamp: real spotlight + tiny emissive body — light on the ground, no geometry cones
function handLamp(fig, hue = 0xffd9a0, intensity = 14) {
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .1),
    new THREE.MeshStandardMaterial({ color: 0x14120c, emissive: hue, emissiveIntensity: 2 }));
  bulb.position.set(.14, .8, .3);
  fig.add(bulb);
  const sp = new THREE.SpotLight(hue, intensity, 10, .42, .7, 1.6);
  sp.position.set(.14, .9, .25);
  const tgt = new THREE.Object3D(); tgt.position.set(.14, -.4, 4.5);
  fig.add(tgt); sp.target = tgt;
  fig.add(sp);
  return sp;
}

const poachers = new THREE.Group();
const pFigs = [figure(0x3a3229, .85), figure(0x473a2a, .8), figure(0x2e2c26, .82), figure(0x40342a, .84)];
pFigs.forEach((f, i) => {
  f.position.set(-.85 + i * .58, 0, (i % 2) * .62 - .28);
  f.scale.setScalar(1.28);
  poachers.add(f);
});
handLamp(pFigs[0], 0xffd9a0, 12);
const rifle = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .9, 5), new THREE.MeshStandardMaterial({ color: 0x241f18 }));
rifle.rotation.z = 1.12; rifle.position.set(-.2, .85, -.12);
pFigs[0].add(rifle);
scene.add(poachers);
const poach = { u: 0.02, lastU: 0.02, stopped: false };
if (TWIN) poachers.visible = false;

// the poachers' pickup, left at the north track — the thing the informant photographs
{
  const dark = new THREE.MeshStandardMaterial({ color: 0x23261f, roughness: .7, metalness: .15 });
  const truck = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.7, .5, .85), dark); bed.position.y = .55; bed.castShadow = true;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(.65, .42, .8), new THREE.MeshStandardMaterial({ color: 0x1c1f19, roughness: .6 }));
  cab.position.set(.45, .98, 0);
  const wG = new THREE.CylinderGeometry(.2, .2, .15, 10).rotateX(Math.PI / 2);
  const wM = new THREE.MeshStandardMaterial({ color: 0x121109, roughness: .95 });
  for (const [wx, wz] of [[-.55, .45], [-.55, -.45], [.55, .45], [.55, -.45]]) {
    const w = new THREE.Mesh(wG, wM); w.position.set(wx, .2, wz); truck.add(w);
  }
  truck.add(bed, cab);
  truck.position.set(AN.truck[0], heightAt(AN.truck[0], AN.truck[1]), AN.truck[1]);
  truck.rotation.y = -2.2;
  scene.add(truck);
  window.__pickup = truck;
}

// the informant at the north track — hidden behind cover, handheld up,
// watching the men dismount at the pickup
const informant = figure(0x4e5a66, .82);
informant.position.set(AN.informant[0], heightAt(AN.informant[0], AN.informant[1]), AN.informant[1]);
informant.lookAt(AN.truck[0], informant.position.y, AN.truck[1]);
if (TWIN) informant.visible = false;
const stakeLight = new THREE.PointLight(0xbfd9ff, 0, 7);
stakeLight.position.set(AN.informant[0], heightAt(AN.informant[0], AN.informant[1]) + 2.4, AN.informant[1]);
scene.add(stakeLight);
{
  const bushM = new THREE.MeshStandardMaterial({ color: 0x2e4226, roughness: .95 });
  for (const [bx, bz, bs] of [[26.7, 19.5, 1.0], [26.3, 20.3, .75], [27.1, 18.8, .65]]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(bs, 1), bushM);
    b.position.set(bx, heightAt(bx, bz) + bs * .55, bz);
    b.scale.y = .72;
    b.castShadow = true;
    if (!TWIN) scene.add(b);
    if (TWIN) b.visible = false;
  }
}
const phone = new THREE.Mesh(new THREE.PlaneGeometry(.16, .24), new THREE.MeshStandardMaterial({ color: 0x0a0f0a, emissive: 0x9fd4ff, emissiveIntensity: 1.4 }));
phone.position.set(.2, .95, .25); phone.rotation.y = .5;
phone.material.emissiveIntensity = 2.2;
informant.add(phone);
scene.add(informant);

// the village protection walker (appears at coexistence)
const guard1 = figure(0x5a6b3f, .84);
guard1.visible = false;
handLamp(guard1, 0xfff0c8, 24);
const guard2 = figure(0x53643c, .8);
guard2.visible = false;
handLamp(guard2, 0xfff0c8, 24);
scene.add(guard1, guard2);
const guardState = { u: 0 };
const guardPath = AN.guard ? mkCurve(AN.guard) : new THREE.CatmullRomCurve3([V3(16.2, 0, -12.8), V3(14.8, 0, -10.6), V3(13.8, 0, -8.8)]);

// elephants v2 — jointed legs (hip+knee), segmented swaying trunk, hinged ears
function elephant(sc = 1) {
  const g = new THREE.Group();
  const hide = new THREE.MeshStandardMaterial({ color: 0x95908a, roughness: .88 });
  const hideD = new THREE.MeshStandardMaterial({ color: 0x87827c, roughness: .9 });
  // body — one clean elongated mass, gently higher at the shoulder
  const barrel = new THREE.Mesh(new THREE.SphereGeometry(.72, 18, 14), hide);
  barrel.scale.set(1.6, 1.02, .95); barrel.position.set(.1, 1.2, 0);
  barrel.rotation.z = -.07; barrel.castShadow = true;
  // head — domed crown, cheeks, mouth
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.42, 12, 10), hide);
  skull.scale.set(.92, 1.08, .84);                               // taller dome, one mass
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 7), hideD);
  jaw.position.set(.22, -.28, 0);
  head.add(skull, jaw);
  head.position.set(1.32, 1.6, 0);
  // ears — big hinged discs, pivoted at the front edge
  const ears = [];
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, .05, 12, 1).rotateZ(Math.PI / 2), hideD);
    ear.scale.set(.14, 1, .86);
    ear.position.z = side * .38;
    pivot.add(ear);
    pivot.position.set(-.12, .08, side * .1);
    pivot.rotation.y = side * .35;
    pivot.rotation.x = side * .5;                               // droop outward — ears, not fins
    head.add(pivot);
    ears.push(pivot);
  }
  // trunk — six tapering segments, each a joint
  const trunkSegs = [];
  let parent = head, py = -.22;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group();
    const r1 = .13 - i * .015;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(r1 - .012, r1, .3, 8), hide);
    tube.position.y = -.15;
    seg.add(tube);
    seg.position.set(i === 0 ? .38 : 0, py, 0);
    parent.add(seg);
    trunkSegs.push(seg);
    parent = seg; py = -.29;
  }
  // tusks
  const tuskM = new THREE.MeshStandardMaterial({ color: 0xd9d0b6, roughness: .5 });
  for (const side of [1, -1]) {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(.045, .5, 7), tuskM);
    tusk.rotation.z = -2.2; tusk.rotation.x = side * .18;
    tusk.position.set(.4, -.3, side * .14);
    head.add(tusk);
  }
  // legs — hip + knee joints
  const legs = [];
  const upperG = new THREE.CylinderGeometry(.17, .15, .55, 8);
  const lowerG = new THREE.CylinderGeometry(.14, .16, .5, 8);
  for (const [lx, lz] of [[.62, .3], [.62, -.3], [-.52, .32], [-.52, -.32]]) {
    const hip = new THREE.Group();
    hip.position.set(lx, 1.02, lz);
    const upper = new THREE.Mesh(upperG, hide);
    upper.position.y = -.27; upper.castShadow = true;
    hip.add(upper);
    const knee = new THREE.Group();
    knee.position.y = -.55;
    const lower = new THREE.Mesh(lowerG, hide);
    lower.position.y = -.25; lower.castShadow = true;
    const toe = new THREE.Mesh(new THREE.CylinderGeometry(.17, .18, .1, 8), hideD);
    toe.position.y = -.48;
    knee.add(lower, toe);
    hip.add(knee);
    g.add(hip);
    legs.push({ hip, knee });
  }
  // tail
  const tail = new THREE.Group();
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(.045, .03, .55, 6), hide);
  t1.position.y = -.27; tail.add(t1);
  tail.position.set(-1.05, 1.35, 0); tail.rotation.z = .35;
  g.add(barrel, head, tail);
  g.scale.setScalar(sc);
  g.userData = { legs, ears, trunkSegs, tail, head, phase: Math.random ? 0 : 0 };
  return g;
}
const herd = new THREE.Group();
let eles = [elephant(1.65), elephant(1.35), elephant(.95)];
eles.forEach((e, i) => { e.position.set(-i * 2.1 - (i % 2) * .4, 0, (i % 2) * 1.5 - .6); herd.add(e); });
// drop-in: place a licensed animated rig at demo/assets/elephant.glb and the
// procedural family is replaced automatically (Walk clip auto-selected)
new GLTFLoader().load('./assets/elephant.glb', (g) => {
  const box = new THREE.Box3().setFromObject(g.scene);
  const sc0 = 3.4 / (box.max.y - box.min.y);
  const clips = g.animations;
  const walk = clips.find(c => /walk/i.test(c.name)) || clips[0];
  eles.forEach(e => herd.remove(e));
  eles = [];
  const spots = [[0, 0, 0], [-2.3, 1.4, 1], [-1.9, -1.6, 2]];
  for (const [px, pz, i] of spots) {
    const e = SkeletonUtils.clone(g.scene);
    e.scale.setScalar(sc0 * (1 - i * .18));
    e.position.set(px, 0, pz);
    e.traverse(o => { if (o.isMesh) o.castShadow = true; });
    if (walk) {
      const mixer = new THREE.AnimationMixer(e);
      const a = mixer.clipAction(walk); a.play(); a.time = i * .4;
      mixers.push(mixer);
    }
    e.userData = { legs: [], ears: [] };
    herd.add(e); eles.push(e);
  }
}, undefined, () => {});
herd.visible = false;                                          // enters with its own chapter
scene.add(herd);
const herdState = { u: 0, curve: 'in', turning: false };

// the wolf pack — Quaternius' animated rig (CC0), three clones with real clips
const PACK_AT = AN.pack;
const pack = new THREE.Group();
pack.position.set(PACK_AT[0], heightAt(PACK_AT[0], PACK_AT[1]), PACK_AT[1]);
pack.rotation.y = 1.2;
if (TWIN) pack.visible = false;
scene.add(pack);
const wolvesAnim = [];
new GLTFLoader().load('./assets/wolf.glb', (g) => {
  const clips = g.animations;
  // the rig's armature carries a baked 100× scale that bounding boxes miss —
  // rendered height ≈ 5.5 units at scale 1, so ~0.2 gives a real wolf
  const sc0 = .34;
  const spots = [[0, 0, 0, 0], [-1.15, .95, .7, 1], [-.95, -1.05, -.5, 2], [-2.1, -.15, .25, 3], [-1.8, 1.9, 1.1, 4]];
  for (const [px, pz, ry, i] of spots) {
    const w = SkeletonUtils.clone(g.scene);
    w.scale.setScalar(sc0 * (1 - i * .06));
    w.position.set(px, 0, pz);
    w.rotation.y = ry;
    w.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.frustumCulled = false;
        o.material = o.material.clone();
        o.material.color.multiplyScalar(1.5);
        o.material.roughness = .82;
      }
    });
    const mixer = new THREE.AnimationMixer(w);
    const idle = clips.find(c => c.name.endsWith('|Idle'));
    const act = mixer.clipAction(idle);
    act.play();
    act.time = i * .7;
    mixers.push(mixer);
    w.userData.headBone = w.getObjectByName('Head') || w.getObjectByName('Neck');
    pack.add(w);
    wolvesAnim.push(w);
  }
}, undefined, () => console.warn('wolf asset unavailable'));

const packLight = new THREE.PointLight(0xcfe0ff, 0, 14);
packLight.position.set(PACK_AT[0], heightAt(PACK_AT[0], PACK_AT[1]) + 5, PACK_AT[1]);
scene.add(packLight);

function howl(w) {                                       // muzzle lifts on the actual neck bone
  if (!w) return;
  const b = w.userData.headBone;
  if (b) {
    gsap.to(b.rotation, { x: -.85, duration: 1.0, ease: 'sine.inOut' });
    gsap.to(b.rotation, { x: 0, duration: .9, delay: 2.1, ease: 'sine.inOut', overwrite: false });
  }
  const wp = new THREE.Vector3(); w.getWorldPosition(wp);
  setTimeout(() => ringAt(wp.x, wp.z, HUES.listen, 1.6, wp.y + 1.15), 500);
}
// sound made visible: a waveform travels from the animal to each sensor —
// long slow harmonics for a howl, rapid chirps for birdsong
function soundWave(from, unit, { freq = 6, amp = .55, hue = 0xE682E6, dur = 1.3 } = {}) {
  const to = unit.position.clone().setY(unit.position.y + 1.15);
  const mid = from.clone().lerp(to, .5); mid.y += .9;
  const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to);
  const N = 56;
  const g = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(new Float32Array(N * 3), 3);
  g.setAttribute('position', posAttr);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({
    map: glowTex(), color: hue, size: .3, transparent: true, opacity: .95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(pts);
  const st = { head: 0 };
  const pt = new THREE.Vector3();
  gsap.to(st, {
    head: 1.3, duration: dur, ease: 'none',
    onUpdate: () => {
      const s1 = Math.min(1, st.head), s0 = Math.max(0, st.head - .32);
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1);
        const sPar = s0 + f * Math.max(0.001, s1 - s0);
        curve.getPoint(sPar, pt);
        const env = Math.sin(f * Math.PI);                       // packet envelope
        pt.y += env * amp * Math.sin(sPar * freq * Math.PI * 2);
        posAttr.setXYZ(i, pt.x, pt.y, pt.z);
      }
      posAttr.needsUpdate = true;
      pts.material.opacity = st.head < 1 ? .95 : Math.max(0, .95 * (1.3 - st.head) / .3);
    },
    onComplete: () => scene.remove(pts),
  });
}

// storks — animated birds over the forest
const storks = [];
new GLTFLoader().load('./assets/stork.glb', (g) => {
  for (let i = 0; i < 1; i++) {
    const b = SkeletonUtils.clone(g.scene);
    b.scale.setScalar(.009);
    b.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const mixer = new THREE.AnimationMixer(b);
    mixer.clipAction(g.animations[0]).play();
    mixers.push(mixer);
    if (!TWIN) scene.add(b);
    if (TWIN) b.visible = false;
    storks.push({ b, ph: i * Math.PI });
  }
}, undefined, () => console.warn('stork asset unavailable'));

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
  for (const hz of [.26, -.26]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(.06, .1, .12),
      new THREE.MeshStandardMaterial({ color: 0x14120c, emissive: 0xffedc4, emissiveIntensity: 2.4 }));
    lamp.position.set(.76, .5, hz);
    jeep.add(lamp);
  }
  const hlSp = new THREE.SpotLight(0xffedc4, 26, 14, .5, .65, 1.6);
  hlSp.position.set(.8, .6, 0);
  const hlTgt = new THREE.Object3D(); hlTgt.position.set(7, -.6, 0);
  jeep.add(hlTgt); hlSp.target = hlTgt; jeep.userData.hlTgt = hlTgt;
  jeep.add(hlSp);
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
const rangers = [figure(0x2e4634, .85), figure(0x35503c, .85)];
rangers.forEach(r => { r.visible = false; scene.add(r); });
const arrestLight = new THREE.PointLight(0xdfe8dd, 0, 12);
scene.add(arrestLight);

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
const GATE_TOP = V3(AN.gate[0], heightAt(AN.gate[0], AN.gate[1]) + 2.4, AN.gate[1]);
const stSer1Gate = stream(V3(AN.ser1[0], heightAt(AN.ser1[0], AN.ser1[1]) + 1.6, AN.ser1[1]), GATE_TOP, HUES.see, 5);
const stSer2Gate = stream(V3(AN.ser2[0], heightAt(AN.ser2[0], AN.ser2[1]) + 1.6, AN.ser2[1]), GATE_TOP, HUES.see, 4);
const stVGHQ = stream(V3(AN.vg[0], heightAt(AN.vg[0], AN.vg[1]) + 1.6, AN.vg[1]), HQ_TOP, HUES.guard, 2.4);
const stWolfGate = stream(V3(AN.w1[0], heightAt(AN.w1[0], AN.w1[1]) + 1.4, AN.w1[1]), GATE_TOP, HUES.listen, 3.6);
const stJWGate = stream(V3(AN.jw[0], heightAt(AN.jw[0], AN.jw[1]) + 1.4, AN.jw[1]), GATE_TOP, HUES.link, 4.2);
const stSatHQ = stream(SAT_POS.clone(), HQ_TOP, HUES.brain, 2);
const stWolf2Gate = stream(V3(AN.w2[0], heightAt(AN.w2[0], AN.w2[1]) + 1.4, AN.w2[1]), GATE_TOP, HUES.listen, 4.2);

const stHQPatrol = stream(HQ_TOP, V3(-2.8, heightAt(-2.8, 5.3) + 1, 5.3), HUES.brain, 3.4);

let uplink = null;
function fireUplink() {
  if (uplink) { scene.remove(uplink.line, uplink.pts); streams.splice(streams.indexOf(uplink), 1); }
  uplink = stream(GATE_TOP.clone(), SAT_POS.clone(), HUES.link, 2);
  if (uplink.line) uplink.line.material.opacity = Math.min(1, (uplink.line.material.opacity || .3) * 1.8);
  if (uplink.pts) uplink.pts.material.size = (uplink.pts.material.size || .5) * 1.6;
  uplink.play(2.6);
  ringAt(AN.gate[0], AN.gate[1], HUES.link, 2.4);                 // the Gateway visibly wakes
  flashAt(GATE_TOP.clone(), 0xbfe9ff);
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
const FEED_EMOJI = [[HUES.see, '\u{1F6A8}'], [HUES.guard, '\u{1F418}'], [HUES.listen, '\u{1F43A}'], [HUES.link, '\u{1F4E1}'], [HUES.brain, '\u{1F9E0}'], [HUES.report, '\u{1F4F1}'], [0xFF8C42, '\u{1F4F7}']];
function feedPhoto(hue, title, text, cnv) {
  const em = (FEED_EMOJI.find(([h]) => h === hue) || [0, '\u{1F4CD}'])[1];
  const el = document.createElement('div');
  el.className = 'tg-msg tg-photo';
  const img = document.createElement('img');
  img.src = cnv.toDataURL('image/jpeg', .82);
  el.innerHTML = `<b>${em} ${title}</b>`;
  el.appendChild(img);
  const sp = document.createElement('span'); sp.textContent = text;
  const tm = document.createElement('em'); tm.textContent = clockStr();
  el.appendChild(sp); el.appendChild(tm);
  const list = $('#feed-list');
  list.appendChild(el);
  gsap.fromTo(el, { opacity: 0, y: 20, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .75, ease: 'power3.out' });
  while (list.children.length > 4) {
    const first = list.querySelector('.tg-msg');
    if (!first) break;
    list.removeChild(first);
  }
}
function feed(hue, title, text) {
  const em = (FEED_EMOJI.find(([h]) => h === hue) || [0, '\u{1F4CD}'])[1];
  const el = document.createElement('div');
  el.className = 'tg-msg';
  el.innerHTML = `<b>${em} ${title}</b><span>${text}</span><em>${clockStr()}</em>`;
  const list = $('#feed-list');
  list.appendChild(el);
  gsap.fromTo(el, { opacity: 0, y: 20, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .75, ease: 'power3.out' });
  while (list.children.length > 4) {
    const first = list.querySelector('.tg-msg');
    if (!first) break;
    list.removeChild(first);
  }
  list.scrollTop = list.scrollHeight;
}
function thumb() {                                   // JW re-ID archive card — the one drawn thumb left
  const c = document.createElement('canvas');
  c.width = 392; c.height = 176;
  const x = c.getContext('2d');
  x.fillStyle = '#0d130f'; x.fillRect(0, 0, 392, 176);
  x.font = "700 12px 'Hanken Grotesk'";
  for (let i = 0; i < 2; i++) {
    const ox = 58 + i * 150;
    x.fillStyle = '#10231a'; x.fillRect(ox, 26, 110, 96);
    x.strokeStyle = '#FF8C42'; x.lineWidth = 2; x.strokeRect(ox + 18, 40, 66, 68);
    x.fillStyle = '#1c3527'; x.beginPath(); x.arc(ox + 51, 66, 16, 0, 7); x.fill();
    x.fillStyle = '#FF8C42'; x.fillText(`IND-0${i ? 17 : 41}`, ox + 20, 140);
  }
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 154, 392, 22);
  x.fillStyle = '#e8efe6'; x.fillText(clockStr() + ' \u00b7 archive \u00b7 re-ID', 9, 169);
  return c;
}
// render the world through the sensor's own lens — the alert card shows what
// the camera genuinely saw
function sensorSnap(from, look, { ir = false, boxes = [] } = {}) {
  const W = 392, H = 192;
  const cam2 = new THREE.PerspectiveCamera(52, W / H, .1, 200);
  cam2.position.copy(from); cam2.lookAt(look); cam2.updateMatrixWorld();
  const rt = new THREE.WebGLRenderTarget(W, H);
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam2);
  const px = new Uint8Array(W * H * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
  renderer.setRenderTarget(null); rt.dispose();
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const img = x.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
    const si = ((H - 1 - y) * W + i) * 4, di = (y * W + i) * 4;
    let r = Math.pow(px[si] / 255, 1 / 2.2) * 255,
        g = Math.pow(px[si + 1] / 255, 1 / 2.2) * 255,
        b = Math.pow(px[si + 2] / 255, 1 / 2.2) * 255;
    if (ir) { const l = (r * .3 + g * .6 + b * .1) * 1.7 + 22; r = l * .4; g = Math.min(255, l * 1.04); b = l * .48; }
    img.data[di] = r; img.data[di + 1] = g; img.data[di + 2] = b; img.data[di + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  if (ir) { x.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1); }
  const v = new THREE.Vector3();
  x.lineWidth = 2; x.font = "700 12px 'Hanken Grotesk'";
  for (const bx of boxes) {
    v.copy(bx.top).project(cam2);
    const tx = (v.x * .5 + .5) * W, ty = (-v.y * .5 + .5) * H;
    v.copy(bx.bot).project(cam2);
    const by = (-v.y * .5 + .5) * H;
    const hgt = Math.max(10, by - ty), wid = Math.max(12, hgt * bx.ar);
    x.strokeStyle = bx.col;
    x.strokeRect(tx - wid / 2, ty - 4, wid, hgt + 8);
    if (bx.tag) { x.fillStyle = bx.col; x.fillText(bx.tag, Math.max(4, tx - wid / 2), Math.max(12, ty - 8)); }
  }
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, H - 22, W, 22);
  x.fillStyle = '#e8efe6'; x.fillText((ir ? 'IR \u00b7 ' : '') + clockStr(), 9, H - 7);
  x.fillStyle = '#ff5a4d'; x.beginPath(); x.arc(W - 14, H - 12, 4, 0, 7); x.fill();
  return c;
}
// detection AT RANGE: a thin beam snaps from the subject back to the sensor,
// the wedge flashes, the LED wakes — seeing happens across distance
function triggerBeam(fromX, fromZ, sensX, sensZ, hue) {
  const from = V3(fromX, heightAt(fromX, fromZ) + 1, fromZ);
  const to = V3(sensX, heightAt(sensX, sensZ) + 1.3, sensZ);
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from, to]),
    new THREE.LineBasicMaterial({ color: hue, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(line);
  gsap.to(line.material, { opacity: .95, duration: .12, ease: 'power2.in' });
  gsap.to(line.material, { opacity: 0, duration: .7, delay: .35, onComplete: () => scene.remove(line) });
  flashAt(to, 0xd9ffe4);
}
const boxFor = (obj, height, ar, col, tag) => {
  const w = new THREE.Vector3(); obj.getWorldPosition(w);
  return { top: w.clone().setY(w.y + height), bot: w.clone().setY(w.y + .02), ar, col, tag };
};

// real field captures (project archive) — the strongest possible evidence
const FIELD = {};
for (const k of ['people-walk', 'people-close', 'elephant-walk', 'elephant-bull', 'multi-class']) {
  const im = new Image();
  im.src = `./assets/field/${k}.jpg`;
  FIELD[k] = im;
}
function fieldCard(key, maxH = 300, zoom = 1) {
  const im = FIELD[key];
  const c = document.createElement('canvas');
  const W = 504, natW = im.naturalWidth || 400, natH = im.naturalHeight || 220;
  let H = Math.round(W * natH / natW), sy = 0, sh = natH, sx = 0, sw = natW;
  if (H > maxH) {                                       // cover-crop tall frames, keep faces high
    H = maxH;
    sh = Math.round(natW * H / W);
    sy = Math.round((natH - sh) * .3);
  }
  if (zoom > 1) {                                       // a tighter second frame of the same capture
    const sw2 = sw / zoom, sh2 = sh / zoom;
    sx += (sw - sw2) * .5; sy += (sh - sh2) * .4;
    sw = sw2; sh = sh2;
  }
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.drawImage(im, sx, sy, sw, sh, 0, 0, W, H);
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, H - 27, W, 27);
  x.fillStyle = '#e8efe6'; x.font = "700 14.5px 'Hanken Grotesk'";
  x.fillText(clockStr() + ' · field capture', 11, H - 9);
  x.fillStyle = '#ff5a4d'; x.beginPath(); x.arc(W - 17, H - 14, 5, 0, 7); x.fill();
  return c;
}
// the acoustic card is a spectrogram — a listening sensor shows sound, not pictures
function spectroCard(mode) {
  const W = 392, H = 176;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a1420'); g.addColorStop(1, '#060a10');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  let sd = 9; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) {                                   // noise floor
    x.fillStyle = `rgba(40,90,110,${.05 + r() * .12})`;
    x.fillRect(r() * W, r() * (H - 24), 2, 2);
  }
  const band = (t0, t1, f, wob, col, w = 3) => {                     // a harmonic
    x.strokeStyle = col; x.lineWidth = w; x.beginPath();
    for (let t = t0; t <= t1; t += 3) {
      const y = f + Math.sin((t - t0) * .045) * wob;
      t === t0 ? x.moveTo(t, y) : x.lineTo(t, y);
    }
    x.stroke();
  };
  for (const [t0, t1] of [[30, 150], [205, 340]]) {                  // two howls, stacked harmonics
    band(t0, t1, 118, 9, 'rgba(240,220,120,.95)', 4);
    band(t0, t1, 88, 7, 'rgba(180,225,160,.7)', 3);
    band(t0, t1, 60, 5, 'rgba(120,190,170,.5)', 2);
  }
  x.strokeStyle = 'rgba(230,160,255,.85)'; x.lineWidth = 2;          // bird chirps, fast sweeps
  for (const bx of [64, 96, 168, 262, 300, 344]) {
    x.beginPath(); x.moveTo(bx, 42); x.quadraticCurveTo(bx + 5, 22, bx + 11, 34); x.stroke();
  }
  if (mode === 'bird') {
    x.strokeStyle = '#c9a4ff'; x.lineWidth = 2;
    x.strokeRect(52, 12, 316, 40);
    x.fillStyle = '#c9a4ff'; x.font = "700 12px 'Hanken Grotesk'";
    x.fillText('CHORUS 0.93 \u00b7 14 SPECIES', 56, 66);
  } else {
    x.strokeStyle = '#E682E6'; x.lineWidth = 2;
    x.strokeRect(24, 46, 132, 84);
    x.fillStyle = '#E682E6'; x.font = "700 12px 'Hanken Grotesk'";
    x.fillText('HOWL 0.97', 26, 40);
    x.strokeStyle = '#c9a4ff';
    x.strokeRect(252, 16, 108, 28);
    x.fillStyle = '#c9a4ff';
    x.fillText('CHORUS \u00b7 BIRDS', 254, 58);
  }
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, H - 22, W, 22);
  x.fillStyle = '#e8efe6'; x.fillText(clockStr() + ' · 60 s window · 0–4 kHz', 9, H - 7);
  return c;
}

const pops = [];
function popup(world, hue, title, conf, sub, kind, hold = 6.5, dx = 0, hero = false) {
  const el = document.createElement('div');
  el.className = hero ? 'pop hero' : 'pop';
  el.style.setProperty('--fa', hex(hue));
  el.appendChild(kind instanceof HTMLCanvasElement ? kind : thumb(kind));
  const b = document.createElement('div'); b.className = 'p-b';
  b.innerHTML = `<div class="p-t">${title}<em>${conf}</em></div><div class="p-s">${sub}</div>`;
  el.appendChild(b);
  $('#pops').appendChild(el);
  const rec = { el };
  pops.push(rec);
  while (pops.length > 1) {                             // one card at a time — the dock belongs to the newest alert
    const old = pops.shift();
    gsap.killTweensOf(old.el);
    old.el.remove();
  }
  gsap.fromTo(el, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: .55, ease: 'power2.out' });
  gsap.to(el, { opacity: 0, delay: hold, duration: .6, onComplete: () => { el.remove(); pops.splice(pops.indexOf(rec), 1); } });
}
function clockStr() {
  const mins = 1055 + Math.floor(tl.time() * 1.4);            // 17:35 — the film runs the dusk window it is lit for
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/* ── timeline — 78 s, six chapters in order ─────────────────────────────── */

const tl = gsap.timeline({ repeat: -1, paused: true });
const CH = { overview: 0, intrusion: 10, response: 18.5, coexist: 34, listening: 50, network: 62 };
const sceneLight = new THREE.PointLight(0xffd9a8, 0, 36, 1.7);
scene.add(sceneLight);
function lightOn(x, z, i = 5.5, d = 2.2) {
  gsap.to(sceneLight.position, { x, y: heightAt(x, z) + 9, z, duration: d, ease: 'sine.inOut' });
  gsap.to(sceneLight, { intensity: i, duration: d, ease: 'sine.inOut' });
}
if (TWIN) {
  tl.call(() => lightOn(-17, -8, 5), null, 10.2);
  tl.call(() => lightOn(-2, -3.5, 5.5), null, 19);
  tl.call(() => lightOn(15, 7, 5.5), null, 34.4);
  tl.call(() => lightOn(3, -16, 4.5), null, 50.4);
  tl.call(() => lightOn(12, -2, 4), null, 62.4);
  tl.call(() => gsap.to(sceneLight, { intensity: 2, duration: 4 }), null, 71);
}

// ── overview 0–10 · one continuous establishing move, high and oblique
tl.call(() => {
  gsap.fromTo('#title', { opacity: 0 }, { opacity: 1, duration: 1.4, delay: .4, overwrite: true });
  gsap.to('#title', { opacity: 0, duration: 1.1, delay: 7.4, overwrite: false });
}, null, .01);
tl.call(() => caption(HUES.see, 'A working landscape', 'Every sensor on station', 'Cameras on the ridgelines, listeners in the forest, a relay on the crater rim — the brain at headquarters.', 6.5), null, 2.6);

// ── intrusion 10–24 · the report comes first, then the cameras confirm
tl.call(() => $('#phone').classList.add('on'), null, 10.3);         // the phone arrives with the story
tl.call(() => caption(HUES.see, 'To see \u00b7 Park protection', 'Four men come over the hill', 'The cameras were already waiting \u2014 detected at range on the crest, confirmed on the descent.', 6), null, 10.6);
tl.call(() => { poachers.visible = true; }, null, 9.8);
tl.to(poach, { u: .42, duration: 5.4, ease: 'none' }, 10.2);
tl.call(() => {                                                     // DETECTION 1 — at the wedge edge, seven units out
  const pp = trail.getPoint(poach.u);
  triggerBeam(pp.x, pp.z, AN.ser1[0], AN.ser1[1], HUES.see);
  if (mPoach) markerPulse(mPoach, true);
  ringAt(pp.x, pp.z, HUES.see, 2.6);
  gsap.fromTo(fovSer1, { opacity: .4 }, { opacity: .1, duration: 1.8 });
  popup(V3(0, 0, 0), HUES.see, 'Human ×4', '0.96', 'AI CAMERA 01 · detected on approach · 200 ms to image', fieldCard('people-walk'), 4.2, 0, true);
}, null, 14.6);
tl.call(() => { stSer1Gate.play(2.6); feedPhoto(HUES.see, 'AI camera 01 \u00b7 alert', 'Human \u00d74 on the crest \u00b7 image \u2192 Gateway over LoRa', fieldCard('people-walk', 128, 1.5)); }, null, 15.5);
tl.call(() => fireUplink(), null, 16.7);
tl.call(() => { stSatHQ.play(2.2); feed(HUES.brain, 'HQ \u00b7 alert delivered', 'LoRa \u2192 Gateway \u2192 satellite \u2192 HQ \u00b7 no cell inside the park \u00b7 on rangers\u2019 phones 28 s after trigger'); }, null, 17.9);
tl.to(poach, { u: .95, duration: 16.6, ease: 'none' }, 15.6);

// ── response 24–34 · rise, glide to HQ, dispatch, confirm, intercept
tl.call(() => caption(HUES.brain, 'To understand · The brain', 'Response before the loss', 'Detection, image and location arrive together. The patrol is rolling before they clear the hill.', 5.5), null, 18.8);
tl.call(() => { jeepState.on = true; jeep.visible = true; feed(HUES.brain, 'HQ · dispatch', 'Patrol unit 2 rolling · intercept set on the track below'); }, null, 18.6);
tl.to(jeepState, { u: .7, duration: 10.9, ease: 'power1.inOut' }, 21.5);
tl.call(() => {                                                     // second camera confirms the track
  flashAt(V3(AN.ser2[0], heightAt(AN.ser2[0], AN.ser2[1]) + 1.6, AN.ser2[1]), 0xd9ffe4);
  gsap.fromTo(fovSer2, { opacity: .3 }, { opacity: .1, duration: 1.4 });
  stSer2Gate.play(2);
  feed(HUES.see, 'AI camera 02 · confirm', 'Track confirmed \u00b7 descending toward the village');
}, null, 24.5);
tl.call(() => {                                                     // INTERCEPT — the jeep halts short
  placeOnCurve(poachers, trail, poach.u, 0, 1);                     // deterministic even after a chip-seek
  placeOnCurve(jeep, road, Math.min(Math.max(jeepState.u, .68), .7), 0, .05, true);
  poach.stopped = true;
  jeepState.arrived = true;
  const pp = trail.getPoint(poach.u);
  const py = heightAt(pp.x, pp.z);
  ringAt(pp.x, pp.z, HUES.see, 2.4);
  const hl = jeep.userData.hlTgt;
  if (hl) { const lp = jeep.worldToLocal(V3(pp.x, py + .6, pp.z)); gsap.to(hl.position, { x: lp.x, y: lp.y, z: lp.z, duration: .9, ease: 'sine.inOut' }); }
  arrestLight.position.set(pp.x, py + 4, pp.z);
  gsap.to(arrestLight, { intensity: 14, duration: .9 });
  const adir = V3(pp.x - jeep.position.x, 0, pp.z - jeep.position.z).normalize();
  const aperp = V3(-adir.z, 0, adir.x);
  rangers.forEach((r, i) => {                                       // two rangers close in from the jeep's side of the group
    r.position.set(jeep.position.x + (i ? .6 : -.4), jeep.position.y, jeep.position.z + (i ? -.5 : .7));
    r.lookAt(pp.x, r.position.y, pp.z);
    r.visible = true;
    setGait(r, 'Walk');
    const ex = pp.x - adir.x * 1.5 + aperp.x * (i ? 1 : -1);
    const ez = pp.z - adir.z * 1.5 + aperp.z * (i ? 1 : -1);
    gsap.to(r.position, {
      x: ex, y: heightAt(ex, ez), z: ez,
      duration: 3.6, delay: .4 + i * .35, ease: 'none',
      onComplete: () => { setGait(r, 'Idle'); r.lookAt(pp.x, r.position.y, pp.z); },
    });
  });
}, null, 32.6);
tl.call(() => {                                                     // lamp down, cuffs on — quiet close
  pFigs[0].traverse(o => { if (o.isSpotLight) gsap.to(o, { intensity: 0, duration: .8 }); });
  feedPhoto(HUES.see, 'Patrol \u00b7 on site', 'Four detained \u00b7 rifles seized \u00b7 evidence packaged, chain of custody logged', fieldCard('people-close', 128, 1.3));
  if (mPoach) { mPoach.el.classList.add('nolabel'); mPoach.el.style.setProperty('--ic', '#98a29a'); }
}, null, 34);
tl.call(() => gsap.to(arrestLight, { intensity: 0, duration: 1.4 }), null, 36);
tl.call(() => caption(HUES.see, 'Outcome', 'Detained — nothing lost', 'The patrol is waiting at the bottom of the hill. Twenty arrests across thirteen gangs began exactly like this, in the Serengeti.', 5.6), null, 33.4);
tl.call(() => {
  const ap = trail.getPoint(poach.u);
  popup(V3(ap.x, heightAt(ap.x, ap.z) + 2.2, ap.z), HUES.see, 'Detained \u00d74', 'evidence', 'Faces redacted \u00b7 packaged for prosecution \u00b7 chain of custody logged', fieldCard('people-close'), 3, 0, true);
}, null, 33.9);

// ── coexistence 34–50 · approach, close-up, detection, guards out, the turn
tl.call(() => caption(HUES.guard, 'To see · Coexistence', 'Elephants head for the crops', 'A camera on the field edge runs one model with every species on the conflict list.', 5.5), null, 38.8);
tl.call(() => { herd.visible = true; }, null, 36.5);
tl.to(herdState, { u: .78, duration: 6.2, ease: 'none' }, 36.4);
tl.to(herdState, { u: 1, duration: 2.2, ease: 'none' }, 42.7);
tl.call(() => {                                                     // DETECTION 2 — the herd crosses into the wedge
  const hp = herdIn.getPoint(herdState.u);
  triggerBeam(hp.x, hp.z, AN.vg[0], AN.vg[1], HUES.guard);
  if (mHerd) markerPulse(mHerd, true);
  ringAt(hp.x, hp.z, HUES.guard, 2.6);
  gsap.fromTo(fovVG, { opacity: .4 }, { opacity: .1, duration: 1.8 });
  popup(V3(0, 0, 0), HUES.guard, 'Elephant ×3', '0.99', 'VILLAGE CAMERA 04 · detected at the treeline · alert < 1 KB', fieldCard('elephant-walk'), 3.4, 0, true);
  stVGHQ.play(2.2);
  feedPhoto(HUES.guard, 'Village camera 04 \u00b7 alert', 'Elephant \u00d73 approaching the fields \u00b7 lights on \u00b7 unit walking out', fieldCard('elephant-bull', 128));
}, null, 42.0);
tl.call(() => {
  gsap.to(lampMat, { emissiveIntensity: 2.6, duration: .4 });
  gsap.to(villageLight, { intensity: 16, duration: .4 });
  guard1.visible = guard2.visible = true;
  if (mVillage) markerPulse(mVillage, true);
}, null, 43.8);
tl.to(guardState, { u: 1, duration: 5.2, ease: 'none' }, 44.1);
tl.call(() => {
  popup(V3(12.9, heightAt(12.9, -8.6) + 2.6, -8.6), HUES.guard, 'Elephant + person', 'one model', 'VILLAGE CAMERA 04 · every class on the list in a single detector', fieldCard('multi-class'), 2.2);
  feed(HUES.guard, 'Village camera 04 · multi-class', 'Elephant and person in the same frame · one detector');
}, null, 47.4);
tl.call(() => {                                                     // the herd actually turns
  herdState.turning = true;
  gsap.to(herd.rotation, { y: '+=2.9', duration: 2.3, ease: 'sine.inOut',
    onComplete: () => { herdState.turning = false; herdState.curve = 'out'; } });
}, null, 46.2);
tl.to(herdState, { u: 0, duration: 4.6, ease: 'sine.inOut' }, 49.2);
tl.call(() => caption(HUES.guard, 'Outcome', 'Turned, not shot', 'Lights on, people out, and the herd drifts back to the treeline. No crops lost, no retaliation.', 5), null, 47);

// ── listening 50–62 · wolves howl, birds call, the array breathes it in
tl.call(() => { pack.visible = true; storks.forEach(st => st.b.visible = true); }, null, 51.4);
tl.call(() => gsap.to(packLight, { intensity: 20, duration: 2 }), null, 50.5);
tl.call(() => gsap.to(packLight, { intensity: 0, duration: 2.5 }), null, 60.5);
tl.call(() => caption(HUES.listen, 'To listen · Bio-acoustics', 'Wolves and birds, counted by ear', 'Two listeners breathe the forest in. Every call becomes a bearing; crossed bearings become a place.', 5.5), null, 53.4);
tl.call(() => { howl(wolvesAnim[0]); if (mPack) markerPulse(mPack, true); }, null, 53.8);                     // the lead howls…
tl.call(() => {
  const wp = new THREE.Vector3();
  wp.set(pack.position.x, pack.position.y + 1, pack.position.z);
  wolves.forEach((w, i) => setTimeout(() => soundWave(wp, w, { freq: 5, amp: .6, hue: 0xE682E6, dur: 1.4 }), i * 260));
}, null, 54.5);
tl.call(() => { howl(wolvesAnim[1] || wolvesAnim[0]); if (mPack) markerPulse(mPack); }, null, 55.4);                       // …an answer…
tl.call(() => {
  const wp = new THREE.Vector3();
  wp.set(pack.position.x - .8, pack.position.y + 1, pack.position.z + .6);
  wolves.forEach((w, i) => setTimeout(() => soundWave(wp, w, { freq: 5, amp: .6, hue: 0xE682E6, dur: 1.4 }), i * 260));
}, null, 56.1);
tl.call(() => {                                                     // …and a bird overhead — rapid chirp waveform
  {
    const wp = V3(AN.pack[0] + 5, heightAt(AN.pack[0] + 5, AN.pack[1] - 3) + 4.5, AN.pack[1] - 3);   // birdsong from the canopy
    wolves.forEach((w, i) => setTimeout(() => soundWave(wp.clone(), w, { freq: 16, amp: .26, hue: 0xc9a4ff, dur: 1.1 }), i * 220));
  }
}, null, 59.2);
tl.call(() => bearings(AN.pack[0], AN.pack[1]), null, 56.8);
tl.call(() => {
  popup(V3(-12.8, heightAt(-12.8, 12.6) + 2.3, 12.6), HUES.listen, 'Wolves located', '0.97', 'LISTENER ARRAY · two bearings cross · pack located on the map', spectroCard(), 2.8);
  stWolfGate.play(2.4);
  feedPhoto(HUES.listen, 'Listener array · fix', 'Wolf pack located · two bearings cross · confidence 0.97', spectroCard());
}, null, 57.6);
tl.call(() => {

  ringAt(AN.jw[0], AN.jw[1], 0xFF8C42, 2);
  feed(0xFF8C42, 'Survey unit · archive', 'Offloaded on patrol pass · two individuals re-identified');
}, null, 61.3);
tl.call(() => caption(HUES.listen, 'Outcome', 'Presence becomes a number', 'Howls become bearings, detections become densities — the measurement layer for Earth Credits.', 4.2), null, 61.6);

// ── network 62–78 · one continuous pull to the whole board

tl.call(() => caption(HUES.brain, 'Every sensor · one brain', 'The whole landscape, reporting', 'See, listen, connect, report — every detection lands in Landseed AI, and the record writes itself.', 9), null, 63.5);
tl.call(() => { stSer1Gate.play(3); stSer2Gate.play(3); }, null, 65);
tl.call(() => { stWolfGate.play(3); stWolf2Gate.play(3.4); stJWGate.play(3.4); }, null, 65.9);
tl.call(() => { fireUplink(); stVGHQ.play(3); stHQPatrol.play(3); }, null, 66.9);
tl.call(() => { stSatHQ.play(3); }, null, 68);
tl.call(() => { stSer1Gate.play(4); stSer2Gate.play(4.4); stWolfGate.play(4); stWolf2Gate.play(4.6); stVGHQ.play(4); stJWGate.play(4.6); stHQPatrol.play(4.2); }, null, 71.5);
tl.call(() => fireUplink(), null, 70);
tl.call(() => { fireUplink(); stSatHQ.play(2.6); }, null, 73.2);
tl.call(() => fireUplink(), null, 75.2);
tl.call(() => fireUplink(), null, 77.3);
tl.call(() => feed(HUES.brain, 'Landseed AI · report', 'Daily summary compiled · Earth Credits registry updated'), null, 69);
tl.call(() => {}, null, 78);

const endcta = document.createElement('div');
endcta.id = 'endcta';
endcta.innerHTML = `<a class="end-primary" href="/">View Landseed\u2019s devices \u2192</a><button class="end-again" type="button">Watch again</button>`;
document.body.appendChild(endcta);
endcta.querySelector('.end-again').addEventListener('click', () => {
  resetWorld();
  normalizeUI(0);
  endcta.classList.remove('on');
  tl.time(.01, false);
  tl.play();
});
tl.call(() => {
  $('#cap').classList.remove('on');                     // the story hands the floor to the actions
  gsap.to('#cap', { opacity: 0, duration: .8, overwrite: true });
  endcta.classList.add('on');
}, null, 73.6);

tl.call(() => tl.pause(), null, 77.9);                              // hold on the closing frame — the overlay owns the restart

function resetWorld() {
  poach.u = .02; poach.stopped = false;
  herdState.u = 0; herdState.curve = 'in'; herdState.turning = false; herd.visible = false;
  if (TWIN) { poachers.visible = false; informant.visible = false; pack.visible = false; storks.forEach(st => st.b.visible = false); }
  if (mPoach) { mPoach.el.classList.remove('nolabel'); mPoach.el.style.setProperty('--ic', hex(0xff5a4d)); }
  jeepState.u = 0; jeepState.on = false; jeepState.arrived = false;
  jeep.visible = false;
  jeep.userData.lights.forEach(m => m.emissiveIntensity = 0);
  guard1.visible = guard2.visible = false; guardState.u = 0;
  herd.rotation.y = 0;                                            // the turn tween accumulates otherwise
  rangers.forEach(r => { r.visible = false; setGait(r, 'Idle'); });
  gsap.set(lampMat, { emissiveIntensity: 0 }); gsap.set(villageLight, { intensity: 0 });
  $('#feed-list').innerHTML = '<div class="tg-day"><span>Today</span></div>';
  $('#phone').classList.remove('on');
}
tl.eventCallback('onRepeat', resetWorld);

/* ── the twin stands the physical cast down and tracks markers instead ──── */
let mPoach, mJeep, mHerd, mPack, mGuards, mVillage;
if (TWIN) {
  const hutW = new THREE.MeshStandardMaterial({ color: 0x8f7a58, roughness: .92 });
  const hutR = new THREE.MeshStandardMaterial({ color: 0x574430 });
  for (const [hx2, hz2, hs] of [[12, -2, 1], [13.6, -1.2, .85], [11, -.6, .8], [13, -3.2, .9]]) {
    const hh2 = heightAt(hx2, hz2);
    const w2 = new THREE.Mesh(new THREE.CylinderGeometry(.8 * hs, .9 * hs, 1 * hs, 8), hutW);
    w2.position.set(hx2, hh2 + .5 * hs, hz2); w2.castShadow = true;
    const r2 = new THREE.Mesh(new THREE.ConeGeometry(1.15 * hs, .85 * hs, 8), hutR);
    r2.position.set(hx2, hh2 + 1.4 * hs, hz2); r2.castShadow = true;
    scene.add(w2, r2);
  }
  const mast2 = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, 4.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x9aa39b, metalness: .8, roughness: .35 }));
  mast2.position.set(12.8, heightAt(12.8, -2.4) + 2.2, -2.4);
  scene.add(mast2);
}
if (TWIN) {
  scene.remove(poachers, herd, jeep, pack, informant, guard1, guard2, villageGrp);
  if (window.__hqGrp) scene.remove(window.__hqGrp);
  for (const rec of SENSORS) {                          // the hardware itself stands on the board — hero scale
    rec.g.scale.multiplyScalar(1.45);
    rec.g.position.y = heightAt(rec.g.position.x, rec.g.position.z);
  }
  rangers.forEach(r => scene.remove(r));
  if (window.__pickup) scene.remove(window.__pickup);
  if (fireflies) scene.remove(fireflies);
  for (const cs of cloudShadows) scene.remove(cs.m);

}

/* ── icon entities: the twin's actors are tracked markers, not models ────── */
const ICONS = [];
const GLYPHS = {
  human: 'M12.2 3.4a2.1 2.1 0 110 4.2 2.1 2.1 0 010-4.2zM10 8.6h4.2l1.9 4.6-1.6.7-1.3-3v3.4l1.8 6.4-1.9.6-1.7-5.7-1.6 5.7-1.9-.6 1.7-6.4V11l-1.4 3-1.6-.7L10 8.6z',
  elephant: 'M4.5 17.5v-6.2C4.5 8 7 6 10.2 6h5.3c2.4 0 4 1.3 4.6 3.2l1.4 4.1-1.7.6-1.2-3.4c-.2 1-.2 2-.2 3v4h-2.7v-3.6h-1.2V17H12v-3.4a3.4 3.4 0 00-4.8.5v3.4H4.5zm14-11c.9 0 1.6.5 1.9 1.3l-1.5.6c-.2-.4-.4-.5-.7-.5l.3-1.4z',
  wolf: 'M18.6 4.2l1.2 3.4c.4 1.1.2 2-.5 2.8l-2.5 2.6-.6 4.2 1.5 2.6-1.7 1-1.6-2.8.4-3.3-3.2.6-2.4 3-1.5 2.5-1.7-.9 1.5-2.7 2.2-2.9-3.3-.4c-1.5-.2-2.5-1.2-2.7-2.7L3.5 8.5l1.9-.3.3 2.1c.1.7.5 1.1 1.2 1.2l5.6.7 3.5-3.6 2.6-4.4z',
  vehicle: 'M4.5 13.5l1.6-4.3A2.4 2.4 0 018.4 7.6h7.2a2.4 2.4 0 012.3 1.6l1.6 4.3v4.6h-2.3v-1.5H6.8v1.5H4.5v-4.6zm2.8-1.2h9.4l-1-2.9H8.3l-1 2.9zM8 16.2a1.3 1.3 0 100-2.6 1.3 1.3 0 000 2.6zm8 0a1.3 1.3 0 100-2.6 1.3 1.3 0 000 2.6z',
  phone: 'M9.2 3.6h5.6c.9 0 1.6.7 1.6 1.6v13.6c0 .9-.7 1.6-1.6 1.6H9.2c-.9 0-1.6-.7-1.6-1.6V5.2c0-.9.7-1.6 1.6-1.6zm.4 2v11h4.8v-11H9.6zm2.4 13.4a.8.8 0 100-1.6.8.8 0 000 1.6z',
  bird: 'M3.5 11.5c2.8 0 4.8-1.3 6-3.5.8 1.7 2.3 2.7 4.3 2.9l6.7-2.4-2.3 3.2c-1.8 2.4-4.3 3.7-7.6 3.7l-2.3 3.4-1.2-.7 1.7-3.1c-2.4-.4-4.2-1.6-5.3-3.5zm14.8-2.4a.8.8 0 110-1.6.8.8 0 010 1.6z',
  sensor: 'M6.5 6h11a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 16.5v-9A1.5 1.5 0 016.5 6zm5.5 3.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6zm0 1.5a1.3 1.3 0 110 2.6 1.3 1.3 0 010-2.6zM7 7.2a.9.9 0 100 1.8.9.9 0 000-1.8zM11 3.6h2V6h-2V3.6z',
  village: 'M12 4l6.5 5.5v1.3h-1.2V18h-3.4v-4.4h-3.8V18H6.7v-7.2H5.5V9.5L12 4zm7.5 14v-3.6l2.6 2V18h-2.6zM2 18v-1.6l2.5-2V18H2z',
};

function iconEl(kind, hue, label, count, pillOnly) {
  const el = document.createElement('div');
  el.className = 'twin-icon ti-' + kind + (kind === 'sensor' ? ' twin-sensor' : '') + (pillOnly ? ' pill-only' : '');
  el.style.setProperty('--ic', hex(hue));
  const n = Math.min(count || 1, 5);
  const one = `<svg viewBox="0 0 24 24"><path d="${GLYPHS[kind] || GLYPHS.sensor}"/></svg>`;
  el.innerHTML = `<span class="ti-ic">${one.repeat(n)}</span>`
    + (label ? `<span class="ti-tag"><b>${label}</b></span>` : '');
  document.body.appendChild(el);
  return el;
}
// a tracked entity: world position (optionally a moving group to follow)
function marker(kind, hue, label, follow, count, pillOnly) {
  const el = iconEl(kind, hue, label, count, pillOnly);
  const rec = { el, kind, follow, pos: new THREE.Vector3(), on: true, pri: 2 };
  ICONS.push(rec);
  return rec;
}
const TRAILED = [];
function trailFrom(rec, hue) { TRAILED.push({ rec, hue, last: new THREE.Vector3(1e9, 0, 0) }); }
function dropCrumb(pos, hue) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hue, transparent: true, opacity: .55, depthWrite: false }));
  sp.scale.setScalar(.9);
  sp.position.copy(pos);
  scene.add(sp);
  gsap.to(sp.material, { opacity: 0, duration: 3.2, ease: 'power1.in', onComplete: () => scene.remove(sp) });
}
function markerPulse(rec, big = false) {
  rec.el.classList.remove('pulse', 'pulse-big');
  void rec.el.offsetWidth;
  rec.el.classList.add(big ? 'pulse-big' : 'pulse');
}
if (TWIN) {
  const SHORT = { serengeti: 'AI camera', villageguard: 'Village camera', gateway: 'Relay station', junglewallah: 'Survey unit', wolf: 'Listener', ai: 'HQ · Landseed AI' };
  const HUE_BY = { serengeti: HUES.see, villageguard: HUES.guard, gateway: HUES.link, junglewallah: 0xFF8C42, wolf: HUES.listen, ai: HUES.brain };
  const RANGE = { serengeti: 6.5, villageguard: 5.5, gateway: 9, junglewallah: 4.5, wolf: 5.5 };
  let wolfN = 0, serN = 0;
  for (const rec of SENSORS) {
    const label = rec.id === 'wolf' ? ('Listener ' + (++wolfN)) : rec.id === 'serengeti' ? ('AI camera ' + (++serN)) : SHORT[rec.id];
    const m = marker('sensor', HUE_BY[rec.id], label, rec.g, null, true);
    m.pri = rec.id === 'ai' ? 3 : 1;                    // the hub never loses its name
    if (rec.id === 'ai' || rec.id === 'gateway') m.el.classList.add('below');  // hang clear of the village cluster
    m.lift = 4.4;
    m.key = rec.id === 'wolf' ? ('w' + wolfN) : rec.id === 'serengeti' ? ('ser' + serN) : rec.id;
    m.el.addEventListener('click', () => { location.href = '/#' + rec.id; });
    m.el.title = 'View in the catalogue';
    if (RANGE[rec.id]) m.ring = rangeRing(rec.g.position.x, rec.g.position.z, HUE_BY[rec.id], RANGE[rec.id]);
    const led = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: HUE_BY[rec.id], transparent: true, opacity: .9, depthWrite: false }));
    led.scale.setScalar(1.35);
    led.position.set(rec.g.position.x, rec.g.position.y + 3.1, rec.g.position.z);
    scene.add(led);
    gsap.to(led.material, { opacity: .35, duration: 1.3 + Math.abs(rec.g.position.x % 1) * .7, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
  mPoach = marker('human', 0xff5a4d, 'Intruders', poachers, 4);
  mPoach.key = 'intruders';
  trailFrom(mPoach, 0xff5a4d);



  mJeep = marker('vehicle', 0x59F5A0, 'Patrol', jeep, 2);
  mJeep.key = 'patrol';
  mJeep.pri = 2.5;
  trailFrom(mJeep, 0x59F5A0);
  mHerd = marker('elephant', HUES.guard, 'Elephants', herd, 3);
  mHerd.key = 'herd';
  mHerd.pri = 2.5;
  trailFrom(mHerd, HUES.guard);
  mPack = marker('wolf', 0xE682E6, 'Wolf pack', pack, 5);
  mPack.key = 'pack';
  window.__birdM = [];
  mGuards = marker('human', 0x9fdc8f, 'Rangers', guard1, 2);
  mGuards.key = 'rangers';
  mVillage = marker('village', 0xffc36b, 'Village', villageGrp);
  mVillage.key = 'village';
  mVillage.pri = 1;
  if (AN.villages) for (let vi = 1; vi < AN.villages.length; vi++) {
    const vm = marker('village', 0xffc36b, 'Village', null);
    vm.pri = 1; vm.fixed = true;
    vm.pos.set(AN.villages[vi][0], heightAt(AN.villages[vi][0], AN.villages[vi][1]) + 1, AN.villages[vi][1]);
  }
  mVillage.pos.set(AN.village[0], heightAt(AN.village[0], AN.village[1]) + 1, AN.village[1]);
  mVillage.fixed = true;
}

// terrain-hugging range ring for a sensor icon
function rangeRing(x, z, hue, r) {
  const seg = 72, pts = [];
  for (let i = 0; i <= seg; i++) {
    const a = i / seg * Math.PI * 2;
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    pts.push(V3(px, heightAt(px, pz) + .25, pz));
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: hue, transparent: true, opacity: .4 }));
  scene.add(line);
  return line;
}

/* ── persistent infrastructure labels — the Gateway and HQ always read ──── */
const wlabels = [];
function worldLabel(text, pos, hue, show) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;z-index:23;transform:translate(-50%,-100%);padding:4px 9px;border-radius:6px;background:rgba(7,15,7,.62);border:1px solid rgba(240,240,234,.14);border-left:2px solid ${hex(hue)};font:700 10.5px 'Hanken Grotesk',sans-serif;letter-spacing:.08em;color:rgba(240,240,234,.85);pointer-events:none;white-space:nowrap`;
  el.textContent = text;
  document.body.appendChild(el);
  wlabels.push({ el, pos, show });
}
if (!TWIN) worldLabel('GATEWAY · RIDGE RELAY', V3(-21.5, heightAt(-21.5, -3.5) + 3.6, -3.5), HUES.link, (T) => (T > 18.5 && T < 25) || T > 62);
if (!TWIN) worldLabel('HQ · LANDSEED AI', V3(17, heightAt(17, -12.3) + 4.4, -12.3), HUES.brain, (T) => (T > 21.5 && T < 34) || T > 62 || T < 9.5);

/* ── the funnel: every sensor is a doorway into the catalogue ───────────── */

const stip = document.createElement('div');
stip.id = 'stip';
stip.style.cssText = 'position:fixed;z-index:32;padding:6px 11px;border-radius:8px;background:rgba(7,15,7,.85);border:1px solid rgba(240,240,234,.16);font:600 12px "Hanken Grotesk",sans-serif;color:#F0F0EA;pointer-events:none;opacity:0;transition:opacity .2s;white-space:nowrap;transform:translate(-50%,-160%)';
document.body.appendChild(stip);
const sRay = new THREE.Raycaster();
const sMouse = new THREE.Vector2();
const NAMES = { serengeti: 'Serengeti', villageguard: 'VillageGuard', gateway: 'Gateway', junglewallah: 'Jungle-Wallah', wolf: 'Wolf', mobile: 'Mobile', ai: 'Landseed AI' };
function pickSensor(e) {
  sMouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  sRay.setFromCamera(sMouse, camera);
  for (const rec of SENSORS) if (sRay.intersectObject(rec.g, true).length) return rec;
  return null;
}
addEventListener('pointermove', (e) => {
  const hit = pickSensor(e);
  $('#scene').style.cursor = hit ? 'pointer' : '';
  if (hit) {
    stip.textContent = `View ${NAMES[hit.id]} in the catalogue →`;
    stip.style.left = e.clientX + 'px';
    stip.style.top = e.clientY + 'px';
    stip.style.opacity = 1;
  } else stip.style.opacity = 0;
});
addEventListener('click', (e) => {
  if (e.target !== $('#scene')) return;
  const hit = pickSensor(e);
  if (hit) location.href = '/#' + hit.id;
});

/* ── chapter chips / pause ──────────────────────────────────────────────── */

const chips = document.querySelectorAll('#chapters .chip[data-ch]');
function normalizeUI(T) {
  gsap.killTweensOf('#title');
  gsap.set('#title', { opacity: T < 1 ? undefined : 0 });
  document.querySelectorAll('.pop').forEach(el => el.remove());   // a seek fires every skipped beat — don't stack their cards
  pops.length = 0;
  endcta.classList.toggle('on', T >= 73.6);
  $('#phone').classList.toggle('on', T >= 10.3);
  $('#feed-list').innerHTML = '<div class="tg-day"><span>Today</span></div>';
}
const setupResponse = () => {
  poachers.visible = true;
  poach.u = .58; poach.lastU = .58;
  jeepState.on = true; jeep.visible = true; jeepState.u = .1;
};
const setupSettled = () => {
  poachers.visible = true;
  poach.u = .95; poach.lastU = .95; poach.stopped = true;
  placeOnCurve(poachers, trail, .95, 0, .05);
  jeepState.on = true; jeepState.arrived = true; jeep.visible = true; jeepState.u = .7;
  placeOnCurve(jeep, road, .7, 0, .05, true);
};
const CHSETUP = {
  overview() {},
  intrusion() {},
  response: setupResponse,
  coexist: setupSettled,
  listening() { setupSettled(); pack.visible = true; storks.forEach(st => st.b.visible = true); },
  network() { setupSettled(); pack.visible = true; storks.forEach(st => st.b.visible = true); },
};
chips.forEach(b => b.addEventListener('click', () => {
  const T = CH[b.dataset.ch] + .02;
  resetWorld();                                          // clean base state…
  normalizeUI(T);
  (CHSETUP[b.dataset.ch] || (() => {}))();               // …then just what the chapter needs
  tl.time(T, true);                                      // no compressed beat replay
  tl.play();
}));
function markChapter() {
  const t = tl.time();
  let cur = 'overview';
  for (const [k, v] of Object.entries(CH)) if (t >= v) cur = k;
  chips.forEach(b => b.classList.toggle('on', b.dataset.ch === cur));
}
if ($('#pause')) $('#pause').addEventListener('click', () => {
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
  const target = Math.atan2(tan.x, tan.z) + (faceX ? -Math.PI / 2 : 0);
  let dAng = target - group.rotation.y;
  while (dAng > Math.PI) dAng -= Math.PI * 2;
  while (dAng < -Math.PI) dAng += Math.PI * 2;
  group.rotation.y += dAng * .12;
}

let frame = 0;
function animate() {
  requestAnimationFrame(animate);
  tick(clock.getDelta(), clock.elapsedTime);
}
function tick(dt, t) {

  for (const mx of mixers) mx.update(dt);
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
  if (!poach.stopped) placeOnCurve(poachers, trail, poach.u, t * 7, .015);
  const marching = !poach.stopped && Math.abs(poach.u - poach.lastU) > 1e-5;
  poach.lastU = poach.u;
  pFigs.forEach(f => setGait(f, marching ? 'Walk' : 'Idle'));
  if (!herdState.turning) {
    const hc = herdState.curve === 'in' ? herdIn : herdOut;
    placeOnCurve(herd, hc, herdState.curve === 'in' ? herdState.u : 1 - herdState.u, t * 2.2, .02, true);
  }
  for (let k = 0; k < eles.length; k++) {
    const e = eles[k], u = e.userData;
    if (!u.legs || !u.legs.length) continue;                       // drop-in rigs animate themselves
    const ph = t * 2.6 + k * 1.9;
    u.legs.forEach((l, i) => {                                     // diagonal gait: FL+BR / FR+BL
      const lp = ph + (i === 0 || i === 3 ? 0 : Math.PI);
      l.hip.rotation.z = Math.sin(lp) * .3;
      l.knee.rotation.z = Math.max(0, Math.sin(lp + .9)) * .45;
    });
    u.ears.forEach((ear, i) => { ear.rotation.y += (Math.sin(t * 1.4 + i * 2 + k) * .22 + (i ? -.35 : .35) - ear.rotation.y) * .06; });
    u.trunkSegs.forEach((seg2, i) => { seg2.rotation.z = .1 + Math.sin(t * 1.1 + k - i * .55) * .085; });
    u.tail.rotation.x = Math.sin(t * 1.9 + k) * .3;
    u.head.rotation.z = Math.sin(ph * .5) * .04;
  }
  if (guard1.visible) {
    placeOnCurve(guard1, guardPath, guardState.u, t * 6, .015);
    placeOnCurve(guard2, guardPath, Math.max(0, guardState.u - .2), t * 6 + 2, .015);
    setGait(guard1, guardState.u < .99 ? 'Walk' : 'Idle');
    setGait(guard2, guardState.u < .99 ? 'Walk' : 'Idle');
  }
  if (jeepState.on) {
    placeOnCurve(jeep, road, jeepState.u, 0, 0, true);
    for (const w of jeep.userData.wheels) w.rotation.z -= dt * (jeepState.arrived ? 0 : 8);
  }
  if (jeepState.arrived) {
    const on = Math.floor(t * 5) % 2;
    jeep.userData.lights[0].emissiveIntensity = on ? 3.2 : 0;
    jeep.userData.lights[1].emissiveIntensity = on ? 0 : 3.2;
  }

  for (const st of storks) {
    const a = t * .22 + st.ph;
    st.b.position.set(AN.pack[0] + Math.cos(a) * 3.8, 5 + Math.sin(t * .55 + st.ph) * .3, AN.pack[1] + .3 + Math.sin(a) * 3.4);
    st.b.rotation.y = -a - Math.PI / 2;
  }
  sat.position.x = SAT_POS.x + Math.sin(t * .05) * 3;
  sat.rotation.y = .5 + Math.sin(t * .07) * .25;
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

  waterTex.offset.x = t * .012; waterTex.offset.y = t * .004;
  water.material.opacity = .88 + Math.sin(t * 1.3) * .03;
  for (const cs of cloudShadows) {
    cs.m.position.x += .006;
    if (cs.m.position.x > 90) cs.m.position.x = -90;
  }
  if (fireflies) {
    const fa = fireflies.geometry.attributes.position;
    const fb = fireflies.userData.base;
    for (let i = 0; i < fb.length; i++) {
      fa.setXYZ(i,
        fb[i][0] + Math.sin(t * .7 + i * 1.7) * .5,
        fb[i][1] + Math.sin(t * 1.1 + i * 2.3) * .3,
        fb[i][2] + Math.cos(t * .6 + i * 1.3) * .5);
    }
    fa.needsUpdate = true;
    fireflies.material.opacity = .5 + .3 * Math.sin(t * 2.2);
  }
  sun.intensity = 2.75 + .18 * Math.sin(t * .13) + .1 * noise(t * .05, 3.3);       // living light
  grade.uniforms.uTime.value = t;

  sampleCam(tl.time());
  {
    const T = tl.time();
  }
  camera.position.set(camP.x, camP.y, camP.z);
  camera.lookAt(camL.x, camL.y, camL.z);

  const TT = tl.time();
  for (const tr of TRAILED) {
    const f = tr.rec.follow;
    if (f && f.visible !== false) {
      if (tr.last.x > 1e8) tr.last.copy(f.position);
      else if (f.position.distanceTo(tr.last) > 1.1) {
        dropCrumb(V3(f.position.x, f.position.y + .9, f.position.z), tr.hue);
        tr.last.copy(f.position);
      }
    }
  }
  const FOCUS = (() => {
    const T3 = tl.time();
    if (T3 < 9.8 || T3 >= 62) return null;                          // overview + network: everything lit
    if (T3 < 18.5) return new Set(['ser1', 'ser2', 'gateway', 'ai', 'intruders']);
    if (T3 < 36.5) return new Set(['ser2', 'gateway', 'ai', 'patrol', 'intruders']);
    if (T3 < 50)  return new Set(['villageguard', 'ai', 'herd', 'village', 'rangers']);
    return new Set(['w1', 'w2', 'junglewallah', 'gateway', 'pack', 'birds']);
  })();
  {
    const wmap = { ser1: fovSer1, ser2: fovSer2, villageguard: fovVG };
    for (const wk in wmap) {
      const m2 = wmap[wk];
      const tgt = (!FOCUS || FOCUS.has(wk)) ? .22 : .04;
      m2.opacity += (tgt - m2.opacity) * .06;
    }
  }
  const shownPills = [];
  const byPri = [...ICONS].sort((a, b) => b.pri - a.pri);
  for (const ic of byPri) {
    if (!ic.fixed && ic.follow) ic.pos.set(ic.follow.position.x, ic.follow.position.y + (ic.lift || 1.2), ic.follow.position.z);
    proj.copy(ic.pos).project(camera);
    const hidden = proj.z > 1 || (ic.follow && ic.follow.visible === false);
    ic.el.style.display = hidden ? 'none' : '';
    if (hidden) continue;
    const rx = (proj.x * .5 + .5) * innerWidth, ry = (-proj.y * .5 + .5) * innerHeight;
    ic.sx = ic.sx === undefined ? rx : ic.sx + (rx - ic.sx) * .35;   // smoothed — labels glide, never jitter
    ic.sy = ic.sy === undefined ? ry : ic.sy + (ry - ic.sy) * .35;
    const sx = ic.sx, sy = ic.sy;
    ic.el.style.left = sx.toFixed(2) + 'px';
    ic.el.style.top = sy.toFixed(2) + 'px';
    const w = ic.el.offsetWidth || 120;
    const below = ic.el.classList.contains('below');
    const box = below ? { x0: sx - w / 2 - 8, x1: sx + w / 2 + 8, y0: sy + 14, y1: sy + 58, pri: ic.pri }
                      : { x0: sx - w / 2 - 8, x1: sx + w / 2 + 8, y0: sy - 52, y1: sy + 2, pri: ic.pri };
    const clash = shownPills.some(b => b.pri >= ic.pri && box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0);
    const now = performance.now();
    if (clash && ic.pri < 3) {
      if (!ic.lockUntil || now > ic.lockUntil) { ic.el.classList.add('nolabel'); ic.lockUntil = now + 1200; }
      else if (!ic.el.classList.contains('nolabel')) shownPills.push(box);
    } else {
      if (ic.el.classList.contains('nolabel') && ic.lockUntil && now < ic.lockUntil) { /* hold hidden */ }
      else { ic.el.classList.remove('nolabel'); shownPills.push(box); ic.lockUntil = now + 1200; }
    }
    const dimmed = !!(FOCUS && ic.key && !FOCUS.has(ic.key));
    ic.el.classList.toggle('dim', dimmed);
    if (ic.ring) ic.ring.material.opacity += (((dimmed ? .07 : .4)) - ic.ring.material.opacity) * .08;
  }
  for (const wl of wlabels) {
    proj.copy(wl.pos).project(camera);
    const off = proj.z > 1 || (wl.show && !wl.show(TT));
    wl.el.style.display = off ? 'none' : '';
    if (!off) {
      wl.el.style.left = ((proj.x * .5 + .5) * innerWidth) + 'px';
      wl.el.style.top = Math.max(118, (-proj.y * .5 + .5) * innerHeight) + 'px';
      wl.el.style.opacity = Math.min(.92, Math.max(.5, (30 - camera.position.distanceTo(wl.pos)) / 18));
    }
  }
  markChapter();
  if ((frame++ & 3) === 0) $('#feed-clock').textContent = clockStr();

  composer.render();
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* ── boot ───────────────────────────────────────────────────────────────── */

const terr = $('#terr');
const hudMode = $('#hud-mode');
if (hudMode && !TWIN) hudMode.textContent = 'Field Demonstration · Concept Landscape';
if (terr) {
  if (TWIN) { terr.textContent = 'Concept mode ↗'; terr.href = './?terrain=fictional'; }
  else { terr.textContent = 'Digital twin ↗'; terr.href = './'; }
  if (TWIN && !dem) terr.textContent = 'Twin data unavailable';
}

window.__demo = {
  dbg() {
    const v = new THREE.Vector3(), out = {};
    poachers.getWorldPosition(v); out.poachers = v.toArray().map(n => +n.toFixed(1));
    out.jeep = jeep.position.toArray().map(n => +n.toFixed(1));
    rangers[0].getWorldPosition(v); out.ranger0 = v.toArray().map(n => +n.toFixed(1));
    out.rangersVisible = rangers.map(r => r.visible);
    out.trail74 = trail.getPoint(.74).toArray().map(n => +n.toFixed(1));
    return out;
  },
  tl, camera, camP, camL, CH, ICONS,
  // manual frame-step for automation: render an exact timeline moment even
  // when the tab is backgrounded and requestAnimationFrame is paused
  step(T) { tl.pause(); tl.time(T, false); tick(1 / 60, T); },
};
animate();
// boot via plain timers so it completes even in a backgrounded tab
setTimeout(() => {
  const loader = $('#loader');
  loader.style.transition = 'opacity .7s';
  loader.style.opacity = '0';
  setTimeout(() => loader.remove(), 800);
  document.body.classList.remove('booting');
  tl.play(0);
}, 500);
