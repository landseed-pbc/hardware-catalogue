// ── devices.js — the seven products, built entirely from procedural geometry ──
// Every builder returns a THREE.Group with:
//   .userData.anchors  — named local-space points the callout labels pin to
//   .userData.spin     — parts that idle-rotate (antenna tips, rings, cores)
//   .userData.pulse    — emissive materials that breathe (status LEDs, cores)
// Materials are created fresh per call so each device dims independently.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ── procedural textures ─────────────────────────────────────────────────── */

function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// woodland camo — layered soft splotches over an olive base
let _camo;
function camoTex() {
  if (_camo) return _camo;
  _camo = canvasTex(256, (x, s) => {
    x.fillStyle = '#3d4938'; x.fillRect(0, 0, s, s);
    const pal = ['#2b382b', '#4b5842', '#242e20', '#55624a', '#31402e'];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 120; i++) {
      x.fillStyle = pal[i % pal.length];
      x.beginPath();
      const cx = rnd() * s, cy = rnd() * s, r = 8 + rnd() * 26;
      for (let a = 0; a <= 12; a++) {
        const th = (a / 12) * Math.PI * 2, rr = r * (0.6 + rnd() * 0.5);
        const px = cx + Math.cos(th) * rr, py = cy + Math.sin(th) * rr * 0.8;
        a ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.closePath(); x.fill();
    }
  });
  _camo.wrapS = _camo.wrapT = THREE.RepeatWrapping;
  return _camo;
}

// speaker / mic grille — hex-packed perforations
let _grille;
function grilleTex() {
  if (_grille) return _grille;
  _grille = canvasTex(256, (x, s) => {
    x.fillStyle = '#20261f'; x.fillRect(0, 0, s, s);
    x.fillStyle = '#0a0d0a';
    const st = 18;
    for (let r = 0; r < s / st + 2; r++) for (let c = 0; c < s / st + 2; c++) {
      x.beginPath();
      x.arc(c * st + (r % 2 ? st / 2 : 0), r * st, 5.4, 0, Math.PI * 2);
      x.fill();
    }
  });
  _grille.wrapS = _grille.wrapT = THREE.RepeatWrapping;
  return _grille;
}

// solar cell array — dark silicon cells with bus bars
let _solar;
function solarTex() {
  if (_solar) return _solar;
  _solar = canvasTex(256, (x, s) => {
    x.fillStyle = '#0b1d33'; x.fillRect(0, 0, s, s);
    const n = 4, g = 6, w = (s - g * (n + 1)) / n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const px = g + c * (w + g), py = g + r * (w + g);
      const gr = x.createLinearGradient(px, py, px + w, py + w);
      gr.addColorStop(0, '#12365e'); gr.addColorStop(.5, '#0d2748'); gr.addColorStop(1, '#123a66');
      x.fillStyle = gr; x.fillRect(px, py, w, w);
      x.strokeStyle = 'rgba(140,180,220,.35)'; x.lineWidth = 1;
      for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(px, py + (w / 4) * i); x.lineTo(px + w, py + (w / 4) * i); x.stroke(); }
    }
  });
  return _solar;
}

// handheld screen — a live field-report UI, drawn once
function screenTex() {
  return canvasTex(256, (x, s) => {
    x.fillStyle = '#06120a'; x.fillRect(0, 0, s, s);
    x.fillStyle = 'rgba(20,130,255,.9)'; x.fillRect(18, 20, 74, 8);           // header bar
    x.fillStyle = 'rgba(240,240,234,.28)'; x.fillRect(150, 20, 88, 8);
    x.strokeStyle = 'rgba(20,130,255,.55)'; x.lineWidth = 2;
    x.strokeRect(18, 44, 220, 118);                                            // viewfinder frame
    x.strokeStyle = 'rgba(0,255,100,.8)';
    x.strokeRect(96, 78, 66, 52);                                              // detection box
    x.fillStyle = 'rgba(0,255,100,.85)'; x.fillRect(96, 66, 44, 9);
    x.fillStyle = 'rgba(240,240,234,.5)';
    for (let i = 0; i < 3; i++) x.fillRect(18, 178 + i * 20, 150 + (i % 2) * 50, 7);
    x.fillStyle = 'rgba(20,130,255,.9)'; x.beginPath(); x.arc(222, 216, 15, 0, Math.PI * 2); x.fill();
  });
}

/* ── shared materials ─────────────────────────────────────────────────────── */

const M = {
  body:   (c = 0x2c3230) => new THREE.MeshStandardMaterial({ color: c, roughness: .48, metalness: .62 }),
  rubber: (c = 0x171b17) => new THREE.MeshStandardMaterial({ color: c, roughness: .92, metalness: .04 }),
  steel:  (c = 0x8f9797) => new THREE.MeshStandardMaterial({ color: c, roughness: .3, metalness: .95 }),
  glass:  () => new THREE.MeshStandardMaterial({ color: 0x050607, roughness: .06, metalness: .9, envMapIntensity: 2.2 }),
  camo:   () => new THREE.MeshStandardMaterial({ map: camoTex(), roughness: .78, metalness: .1 }),
  led:    (c, i = 2.2) => new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: c, emissiveIntensity: i, roughness: .4 }),
};

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
const RB = (w, h, d, r = .03, s = 3) => new RoundedBoxGeometry(w, h, d, s, r);
const CYL = (rt, rb, h, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg);

/* ── recurring parts ──────────────────────────────────────────────────────── */

// camera lens assembly: barrel + knurled rim + deep glass element + iris ring
function lensUnit(r = .085, depth = .07) {
  const g = new THREE.Group();
  g.add(mesh(CYL(r, r, depth, 28).rotateX(Math.PI / 2), M.body(0x22282a), 0, 0, depth / 2));
  const rim = mesh(new THREE.TorusGeometry(r * .96, r * .13, 10, 28), M.steel(0x545c5a), 0, 0, depth);
  g.add(rim);
  g.add(mesh(CYL(r * .8, r * .8, .012, 28).rotateX(Math.PI / 2), M.glass(), 0, 0, depth + .002));
  const iris = mesh(new THREE.RingGeometry(r * .3, r * .44, 24),
    new THREE.MeshBasicMaterial({ color: 0x2a66ff, transparent: true, opacity: .85, side: THREE.DoubleSide }));
  iris.position.z = depth + .012; iris.castShadow = false;
  g.add(iris);
  return g;
}

// IR illuminator strip — a row of tiny deep-red emitters
function irStrip(n, w, mat) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(.011, 8, 8);
  for (let i = 0; i < n; i++) g.add(mesh(geo, mat, -w / 2 + (w / (n - 1)) * i, 0, 0));
  return g;
}

// whip antenna with emissive tip
function antenna(h, tipMat, r = .012) {
  const g = new THREE.Group();
  g.add(mesh(CYL(r * .9, r, h * .22, 10), M.rubber(), 0, h * .11, 0));
  g.add(mesh(CYL(r * .55, r * .7, h * .78, 10), M.rubber(0x1d221d), 0, h * .22 + h * .39, 0));
  const tip = mesh(new THREE.SphereGeometry(r * 1.5, 10, 10), tipMat, 0, h * 1.02, 0);
  g.add(tip);
  g.userData.tip = tip;
  return g;
}

// PIR motion window — dark faceted dome
function pirDome(r = .045) {
  const m = mesh(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x101410, roughness: .35, metalness: .2, flatShading: true }));
  return m;
}

// strap lugs + a hint of webbing for tree-mounting
function strapLugs(w, h, d) {
  const g = new THREE.Group();
  const lug = () => mesh(new THREE.TorusGeometry(.028, .009, 8, 14).rotateY(Math.PI / 2), M.body(0x1e2320));
  const a = lug(); a.position.set(-w / 2 - .01, h * .3, 0);
  const b = lug(); b.position.set(w / 2 + .01, h * .3, 0);
  g.add(a, b);
  return g;
}

// cable — catmull-rom tube between two local points, sagging under gravity
function cable(from, to, sag = .12, r = .012) {
  const mid = from.clone().lerp(to, .5); mid.y -= sag;
  const q1 = from.clone().lerp(to, .25); q1.y -= sag * .7;
  const q3 = from.clone().lerp(to, .75); q3.y -= sag * .7;
  const curve = new THREE.CatmullRomCurve3([from, q1, mid, q3, to]);
  return mesh(new THREE.TubeGeometry(curve, 24, r, 8), M.rubber(0x14180f));
}

// external battery pack — the endurance story, shared by camera units
function batteryPack(led) {
  const g = new THREE.Group();
  g.add(mesh(RB(.3, .17, .2, .03), M.rubber(0x1c211c), 0, .085, 0));
  g.add(mesh(RB(.31, .028, .21, .01), M.body(0x272d27), 0, .175, 0));
  const l = mesh(new THREE.SphereGeometry(.012, 8, 8), led, .1, .18, .08);
  g.add(l);
  return g;
}

/* ── the seven products ───────────────────────────────────────────────────── */

// 1 · Serengeti — the smallest, lowest-power AI camera; camo shell, one job
export function buildSerengeti(hue) {
  const g = new THREE.Group();
  const led = M.led(hue, 2.4);
  const W = .3, H = .42, D = .2;

  const body = mesh(RB(W, H, D, .035), M.camo(), 0, H / 2 + .06, 0);
  g.add(body);
  g.add(mesh(RB(W * .84, H * .9, .02, .015), M.rubber(0x11150f), 0, H / 2 + .06, D / 2));

  const lens = lensUnit(.062, .05); lens.position.set(0, H * .68 + .06, D / 2);
  g.add(lens);
  const ir = irStrip(5, W * .55, M.led(0x330000, 1.1)); ir.position.set(0, H * .93 + .06, D / 2 + .012);
  g.add(ir);
  const pir = pirDome(.038); pir.position.set(0, H * .38 + .06, D / 2 + .01);
  g.add(pir);

  const ant = antenna(.3, led); ant.position.set(W / 2 - .045, H + .06, 0);
  g.add(ant);
  g.add(strapLugs(W, H, D));

  // feet / mount stub
  g.add(mesh(RB(.12, .06, .12, .015), M.rubber(), 0, .03, 0));

  // the endurance kit: cable out the base to the external LiFePO4 pack
  const pack = batteryPack(led); pack.position.set(.46, 0, .1); pack.rotation.y = -.5;
  g.add(pack);
  g.add(cable(V3(W / 2 - .02, .12, .04), V3(.38, .1, .14), .1));

  const status = mesh(new THREE.SphereGeometry(.011, 8, 8), led, -W / 2 + .05, H * .93 + .06, D / 2 + .01);
  g.add(status);

  g.userData.anchors = {
    lens:    V3(0, H * .68 + .06, D / 2 + .09),
    ir:      V3(0, H * .93 + .06, D / 2 + .04),
    pir:     V3(0, H * .38 + .06, D / 2 + .05),
    antenna: V3(W / 2 - .045, H + .38, 0),
    battery: V3(.44, .07, .16),                        // low on the pack face — a short lead to the label below
    shell:   V3(-W / 4, H + .075, D / 6),              // top of the unit — the shell is everywhere, the leader stays short
  };
  g.userData.pulse = [led];
  g.userData.labelY = 1.0;
  return g;
}

// 2 · VillageGuard — the bigger brain: 2 MP, 8–10 classes, twin antennas
export function buildVillageGuard(hue) {
  const g = new THREE.Group();
  const led = M.led(hue, 2.4);
  const W = .38, H = .54, D = .26;

  g.add(mesh(RB(W, H, D, .04), M.body(0x333b36), 0, H / 2 + .07, 0));
  g.add(mesh(RB(W * .88, H * .92, .022, .015), M.rubber(0x12160f), 0, H / 2 + .07, D / 2));
  // conformal side rails — the rugged tell
  g.add(mesh(RB(.015, H * .8, D * .9, .006), M.body(0x272e29), -W / 2 - .004, H / 2 + .07, 0));
  g.add(mesh(RB(.015, H * .8, D * .9, .006), M.body(0x272e29), W / 2 + .004, H / 2 + .07, 0));

  const lens = lensUnit(.085, .065); lens.position.set(0, H * .66 + .07, D / 2);
  g.add(lens);
  const ir1 = irStrip(6, W * .62, M.led(0x330000, 1.1)); ir1.position.set(0, H * .935 + .07, D / 2 + .014);
  const ir2 = irStrip(6, W * .62, M.led(0x330000, 1.1)); ir2.position.set(0, H * .885 + .07, D / 2 + .014);
  g.add(ir1, ir2);
  const pir = pirDome(.048); pir.position.set(0, H * .33 + .07, D / 2 + .012);
  g.add(pir);

  const a1 = antenna(.34, led); a1.position.set(-W / 2 + .05, H + .07, 0);
  const a2 = antenna(.24, M.led(0xFFC800, 2)); a2.position.set(W / 2 - .05, H + .07, 0);
  g.add(a1, a2);
  g.add(strapLugs(W, H, D));
  g.add(mesh(RB(.14, .07, .14, .018), M.rubber(), 0, .035, 0));

  const pack = batteryPack(led); pack.position.set(-.5, 0, .12); pack.rotation.y = .55;
  g.add(pack);
  g.add(cable(V3(-W / 2 + .02, .14, .05), V3(-.42, .1, .16), .11));

  const status = mesh(new THREE.SphereGeometry(.012, 8, 8), led, W / 2 - .06, H * .12 + .07, D / 2 + .012);
  g.add(status);

  g.userData.anchors = {
    lens:    V3(0, H * .66 + .07, D / 2 + .1),
    ir:      V3(-.1, H * .91 + .07, D / 2 + .05),       // leftmost LED cluster — the leader reads cleanly leftward
    vpu:     V3(W / 2 + .04, H * .5 + .07, 0),
    antenna: V3(-W / 2 + .05, H + .42, 0),
    pir:     V3(0, H * .33 + .07, D / 2 + .06),
    battery: V3(-.5, .2, .12),
  };
  g.userData.pulse = [led];
  g.userData.labelY = 1.12;
  return g;
}

// 3 · Gateway — the hub: rugged case, three radios, solar endurance mast
export function buildGateway(hue) {
  const g = new THREE.Group();
  const led = M.led(hue, 2.4);
  const W = .52, H = .24, D = .34;

  // pelican-style case with lid seam + latches
  g.add(mesh(RB(W, H, D, .04), M.rubber(0x1e2420), 0, H / 2 + .05, 0));
  g.add(mesh(RB(W * 1.01, .02, D * 1.01, .008), M.body(0x303733), 0, H * .68 + .05, 0));
  for (const sx of [-1, 1]) g.add(mesh(RB(.05, .08, .03, .01), M.steel(0x6a7370), sx * W * .28, H * .5 + .05, D / 2 + .01));

  // radio deck: LoRa whip, LTE stub, WiFi nub
  const lora = antenna(.46, led); lora.position.set(-W * .32, H + .05, -D * .18);
  const lte = antenna(.26, M.led(0xFFC800, 2)); lte.position.set(0, H + .05, -D * .2);
  const wifi = mesh(CYL(.02, .026, .09, 10), M.rubber(), W * .3, H + .1, -D * .18);
  g.add(lora, lte, wifi);

  // front IO: sealed connectors + status LEDs
  for (let i = 0; i < 3; i++)
    g.add(mesh(CYL(.026, .026, .03, 12).rotateX(Math.PI / 2), M.steel(0x596260), -W * .3 + i * .12, H * .35 + .05, D / 2 + .012));
  for (let i = 0; i < 4; i++)
    g.add(mesh(new THREE.SphereGeometry(.01, 8, 8), i ? M.led(0x0a3320, .9) : led, W * .3 - i * .055, H * .78 + .05, D / 2 + .008));

  // solar mast behind — tilted panel + down-cable into the case
  const mast = mesh(CYL(.016, .02, .62, 10), M.steel(0x4a5350), -.52, .31, -.3);
  g.add(mast);
  const panel = new THREE.Group();
  panel.add(mesh(RB(.44, .02, .3, .008), M.body(0x22282e), 0, 0, 0));
  const cells = mesh(new THREE.PlaneGeometry(.4, .26), new THREE.MeshStandardMaterial({ map: solarTex(), roughness: .32, metalness: .35 }));
  cells.rotation.x = -Math.PI / 2; cells.position.y = .012; cells.castShadow = false;
  panel.add(cells);
  panel.position.set(-.52, .64, -.3); panel.rotation.z = .42; panel.rotation.y = .35;
  g.add(panel);
  g.add(cable(V3(-.52, .58, -.3), V3(-W / 2 + .04, .16, -.1), .06, .01));

  g.userData.anchors = {
    lora:  V3(-W * .32 + .035, H + .54, -D * .18),     // right shoulder of the mast beacon, same treatment as lte
    lte:   V3(.035, H + .36, -D * .2),                 // right shoulder of the beacon — the hairline leaves the glow's right side
    io:    V3(0, H * .35 + .05, D / 2 + .08),
    case:  V3(W / 2 + .05, H * .5 + .05, 0),
    solar: V3(-.405, .66, -.182),                      // near rim, a third toward the raised end — the leader falls at the panel's perpendicular
    leds:  V3(W * .3, H * .78 + .05, D / 2 + .06),
  };
  g.userData.pulse = [led];
  g.userData.labelY = .95;
  return g;
}

// 4 · Jungle-Wallah — VillageGuard optics + an acoustic pod: see and listen
export function buildJungleWallah(hue) {
  const g = new THREE.Group();
  const led = M.led(hue, 2.4);
  const W = .38, H = .5, D = .26;

  g.add(mesh(RB(W, H, D, .04), M.camo(), 0, H / 2 + .07, 0));
  g.add(mesh(RB(W * .88, H * .9, .022, .015), M.rubber(0x12160f), 0, H / 2 + .07, D / 2));

  const lens = lensUnit(.08, .06); lens.position.set(0, H * .62 + .07, D / 2);
  g.add(lens);
  const ir = irStrip(6, W * .6, M.led(0x330000, 1.1)); ir.position.set(0, H * .9 + .07, D / 2 + .014);
  g.add(ir);
  const pir = pirDome(.044); pir.position.set(0, H * .3 + .07, D / 2 + .012);
  g.add(pir);

  // the listening pod — the Listener unit itself, strapped on and angled
  // skyward: same base, grille, glow core, cap, mic port and hanging ring
  const pod = new THREE.Group();
  {
    const pr = .055, ph = .18;
    pod.add(mesh(CYL(pr, pr * 1.06, .075, 24), M.rubber(0x1c211c), 0, -ph * .38, 0));
    const pgr = mesh(CYL(pr * .98, pr * .98, ph * .62, 24),
      new THREE.MeshStandardMaterial({ map: grilleTex(), roughness: .68, metalness: .3 }), 0, 0, 0);
    pgr.material.map = grilleTex().clone();
    pgr.material.map.repeat.set(3, 1.4);
    pod.add(pgr);
    const pcore = mesh(CYL(pr * .82, pr * .82, ph * .56, 20), M.led(hue, 1.5), 0, 0, 0);  // the listening presence glows through the grille
    pcore.castShadow = false;
    pod.add(pcore);
    pod.add(mesh(CYL(pr * 1.04, pr, .045, 24), M.body(0x272d27), 0, ph * .34, 0));
    pod.add(mesh(CYL(.015, .015, .026, 14), M.steel(0x596260), 0, ph * .34 + .025, 0));
    pod.add(mesh(new THREE.TorusGeometry(.021, .005, 8, 18), M.steel(0x6a7370), 0, ph * .34 + .062, 0));
  }
  pod.position.set(W / 2 + .08, H + .1, -.02); pod.rotation.z = -.35;
  g.add(pod);
  const stalk = mesh(CYL(.012, .016, .16, 8), M.steel(0x4a5350), W / 2 + .05, H, -.02);
  stalk.rotation.z = -.3;
  g.add(stalk);

  const ant = antenna(.3, led); ant.position.set(-W / 2 + .05, H + .07, 0);
  g.add(ant);
  g.add(strapLugs(W, H, D));
  g.add(mesh(RB(.14, .07, .14, .018), M.rubber(), 0, .035, 0));

  const status = mesh(new THREE.SphereGeometry(.012, 8, 8), led, W / 2 - .06, H * .12 + .07, D / 2 + .012);
  g.add(status);

  g.userData.anchors = {
    lens:  V3(-.05, H * .62 + .125, D / 2 + .08),      // upper-left rim of the ring — the leader stays off the LED row
    pod:   V3(W / 2 + .065, H + .155, -.02),           // upper-left shoulder — the leader clears the hanging ring
    ir:    V3(0, H * .9 + .07, D / 2 + .05),
    ai:    V3(W / 2, H * .52 + .07, .05),            // on the camo flank itself — dot anchored to the body
    wifi:  V3(-W / 2 + .05, H + .375, 0),              // dead centre of the tip ball (mast .3 → tip at H+.376)
  };
  g.userData.pulse = [led];
  g.userData.labelY = 1.15;
  return g;
}

// 5 · Wolf — the acoustic monitor: a listening column, glow behind the grille
export function buildWolf(hue) {
  const g = new THREE.Group();
  const led = M.led(hue, 2.2);
  const R = .13, H = .44;

  g.add(mesh(CYL(R, R * 1.06, .1, 24), M.rubber(0x1c211c), 0, .1, 0));
  const grille = mesh(CYL(R * .98, R * .98, H * .62, 24),
    new THREE.MeshStandardMaterial({ map: grilleTex(), roughness: .68, metalness: .3 }), 0, .15 + H * .31, 0);
  grille.material.map = grilleTex().clone();
  grille.material.map.repeat.set(3, 1.4);
  g.add(grille);
  // inner glow — the animal presence behind the perforations
  const core = mesh(CYL(R * .82, R * .82, H * .56, 20), M.led(hue, 1.4), 0, .15 + H * .31, 0);
  core.castShadow = false;
  g.add(core);
  g.add(mesh(CYL(R * 1.04, R, .06, 24), M.body(0x272d27), 0, .15 + H * .62 + .03, 0));
  // crown: mic port + hanging loop
  g.add(mesh(CYL(.032, .032, .05, 14), M.steel(0x596260), 0, .15 + H * .62 + .08, 0));
  g.add(mesh(new THREE.TorusGeometry(.05, .011, 8, 18), M.steel(0x6a7370), 0, .15 + H * .62 + .17, 0));

  const status = mesh(new THREE.SphereGeometry(.012, 8, 8), led, R * .8, .13, R * .5);
  g.add(status);

  // acoustic rings — expanding sound waves, animated in world.js
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = mesh(new THREE.TorusGeometry(.2, .0045, 8, 48),
      new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }),
      0, .15 + H * .31, 0);
    ring.rotation.x = Math.PI / 2; ring.castShadow = false;
    ring.userData.phase = i / 3;
    rings.push(ring); g.add(ring);
  }
  g.userData.waves = rings;

  g.userData.anchors = {
    grille: V3(R * .62, .15 + H * .31, R * .78),        // on the grille face toward the viewer
    mic:    V3(-.06, .15 + H * .62 + .17, 0),          // the left outer rim of the hanging ring
    core:   V3(-R * .62, .15 + H * .42, R * .78),       // on the grille, upper-left
    base:   V3(R * .8, .13, R * .5),                    // the status LED itself
  };
  g.userData.pulse = [led, core.material];
  g.userData.labelY = .92;
  return g;
}

// 6 · Mobile — the human sensor: a rugged handheld, screen mid-report
export function buildMobile(hue) {
  const g = new THREE.Group();
  const led = M.led(hue, 2.2);
  const W = .24, H = .46, D = .045;

  const slab = new THREE.Group();
  slab.add(mesh(RB(W, H, D, .028), M.rubber(0x1b211d)));
  slab.add(mesh(RB(W * .94, H * .95, .01, .012), M.body(0x232a26), 0, 0, -D / 2));
  // screen — emissive UI texture
  const scr = mesh(new THREE.PlaneGeometry(W * .84, H * .86),
    new THREE.MeshStandardMaterial({ map: screenTex(), emissive: 0xffffff, emissiveMap: screenTex(), emissiveIntensity: .75, roughness: .3, color: 0x0a0f0a }));
  scr.position.z = D / 2 + .002; scr.castShadow = false;
  slab.add(scr);
  // camera eye on the top bezel + shutter key on the edge
  slab.add(mesh(CYL(.016, .016, .012, 14).rotateX(Math.PI / 2), M.glass(), W * .3, H * .43, D / 2 + .004));
  slab.add(mesh(RB(.05, .022, .014, .006), M.steel(0x6a7370), W / 2 + .004, H * .28, 0));
  const status = mesh(new THREE.SphereGeometry(.009, 8, 8), led, -W * .3, H * .43, D / 2 + .006);
  slab.add(status);
  // lanyard loop + strap hint
  slab.add(mesh(new THREE.TorusGeometry(.024, .007, 8, 14), M.rubber(), -W / 2 + .04, -H / 2 - .012, 0));

  slab.position.y = H / 2 + .18;
  slab.rotation.x = -.16;
  g.add(slab);

  // field stand — leaning on a low rock-like wedge so it reads at catalogue scale
  g.add(mesh(RB(.2, .16, .16, .05, 4), M.body(0x20261f), 0, .08, -.1));

  g.userData.anchors = {
    screen:  V3(0, .47, .015),                          // upper half of the display
    eye:     V3(W * .3, .61, 0),                        // the camera nub on the top bezel
    shutter: V3(W / 2 + .015, .54, -.02),               // the key on the right edge
    body:    V3(-W / 2 + .015, .36, .022),          // on the bezel corner, not beside it
  };
  g.userData.pulse = [led];
  g.userData.labelY = .85;
  return g;
}

// 7 · Shaman — not hardware: the analytics brain, rendered as a hologram
// around the Landseed AI mark itself
export function buildShaman(hue) {
  const g = new THREE.Group();
  const col = new THREE.Color(hue);

  // the core IS the brand — the full Landseed AI lockup on all four faces of
  // a slowly turning cube, so the mark is never lost edge-on
  const logoTex = new THREE.TextureLoader().load('/public/landseed-ai-lockup.png');
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = 8;
  const core = new THREE.Group();
  const LW = .42, LH = LW * (720 / 831);
  const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false, side: THREE.FrontSide });
  const blank = new THREE.MeshBasicMaterial({ visible: false });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(LW, LH, LW),
    [logoMat, logoMat, blank, blank, logoMat, logoMat]);   // ±x, ±z faces carry the mark
  cube.castShadow = false;
  core.add(cube);
  g.add(core);

  // lattice shells — nested wireframes, counter-rotating
  const wire = (r, o) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1),
      new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.castShadow = false;
    return m;
  };
  const s1 = wire(.37, .5), s2 = wire(.5, .22);
  g.add(s1, s2);

  // instrument rings — gyroscope planes
  const rings = [];
  const ringMat = () => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false });
  const mkRing = (r, rx, rz) => {
    const t = mesh(new THREE.TorusGeometry(r, .004, 8, 72), ringMat());
    t.rotation.set(rx, 0, rz); t.castShadow = false;
    rings.push(t); g.add(t);
  };
  mkRing(.56, Math.PI / 2, 0);
  mkRing(.64, Math.PI / 2.6, .5);
  mkRing(.72, Math.PI / 1.8, -.4);

  // node swarm — signals resident in the brain
  const N = 90, pos = new Float32Array(N * 3);
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) {
    const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1), r = .34 + rnd() * .38;
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const swarm = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: col, size: .016, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  g.add(swarm);

  // levitation group offset — the whole brain floats; world.js bobs it
  g.position.y = 0;
  g.children.forEach(c => c.position.y += .78);

  g.userData.anchors = {
    core:   V3(.19, .8, .21),                           // front-right of the lockup cube
    shells: V3(.4, 1.08, 0),                            // on the outer lattice shell
    rings:  V3(-.33, 1.16, .05),                        // upper-left of the outer shell
    swarm:  V3(.48, .58, .12),                          // inside the detection cloud
    base:   V3(-.38, .47, .08),                         // lower-left of the outer shell
  };
  g.userData.spin = [
    { obj: s1, ax: 'y', v: .22 }, { obj: s2, ax: 'y', v: -.12 },
    { obj: rings[0], ax: 'z', v: .3 }, { obj: rings[1], ax: 'z', v: -.2 }, { obj: rings[2], ax: 'z', v: .16 },
    { obj: swarm, ax: 'y', v: .08 },
    { obj: core, ax: 'y', v: .22 },
  ];
  g.userData.pulse = [];
  g.userData.float = true;
  g.userData.labelY = 1.42;
  return g;
}

export const BUILDERS = {
  serengeti: buildSerengeti,
  villageguard: buildVillageGuard,
  gateway: buildGateway,
  junglewallah: buildJungleWallah,
  wolf: buildWolf,
  mobile: buildMobile,
  ai: buildShaman,
};
