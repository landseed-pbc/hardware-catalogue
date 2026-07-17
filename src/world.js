// ── world.js — the hardware bay: renderer, holo floor, plinths, data streams ──

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050d08);
  scene.fog = new THREE.FogExp2(0x050d08, 0.055);

  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 60);
  camera.position.set(0, 2.6, 8.4);

  // image-based light so the gunmetal and glass read as real materials
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  // ── lights ────────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0x9fd8c0, 0x0a1410, .5));
  const key = new THREE.DirectionalLight(0xf2fff0, 1.9);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -7;
  key.shadow.camera.right = key.shadow.camera.top = 7;
  key.shadow.camera.far = 22;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 5;
  scene.add(key);
  const rimA = new THREE.PointLight(0x32C8FF, 14, 14); rimA.position.set(-5, 2.4, -3); scene.add(rimA);
  const rimB = new THREE.PointLight(0x00BE5A, 10, 14); rimB.position.set(5.5, 1.6, -2); scene.add(rimB);
  const fill = new THREE.DirectionalLight(0xcfe8dc, .5); fill.position.set(0, 3, 9); scene.add(fill);

  // ── the deck: dark disc + holo grid + contact shadows ─────────────────────
  const deck = new THREE.Mesh(
    new THREE.CircleGeometry(16, 72).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x081109, roughness: .94, metalness: .08 })
  );
  deck.position.y = -.012;
  deck.receiveShadow = true;
  scene.add(deck);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: .42 })
  );
  shadowPlane.position.y = -.005;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // holographic grid — polar rings + spokes + fine cartesian mesh, breathing
  const gridUniforms = { uTime: { value: 0 }, uOpacity: { value: 1 } };
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 32).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: gridUniforms,
      vertexShader: /* glsl */`
        varying vec2 vP;
        void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: /* glsl */`
        varying vec2 vP; uniform float uTime; uniform float uOpacity;
        float lineOn(float v, float w){ float f = abs(fract(v - .5) - .5) / fwidth(v); return 1. - smoothstep(0., w, f); }
        void main(){
          float d = length(vP);
          float cart = max(lineOn(vP.x, 1.1), lineOn(vP.y, 1.1)) * .16;          // 1m cartesian mesh
          float rings = lineOn(d * .5, 1.2) * .5;                                 // 2m polar rings
          float ang = atan(vP.y, vP.x) / 6.28318;
          float spokes = lineOn(ang * 24., 1.1) * .22 * smoothstep(1.2, 4., d);   // 15° spokes
          float pulse = smoothstep(.14, .0, abs(fract(d * .18 - uTime * .06) - .5) - .32) * .1;
          float a = (cart + rings + spokes + pulse) * smoothstep(15., 5.5, d) * (1. - smoothstep(0., .8, -d + .6));
          vec3 col = mix(vec3(.05,.75,.42), vec3(.16,.62,.85), smoothstep(2., 12., d));
          gl_FragColor = vec4(col, a * .6 * uOpacity);
        }`
    })
  );
  grid.position.y = .002;
  scene.add(grid);

  // ── drifting dust — depth cue in the dark hall ────────────────────────────
  let dust;
  {
    const N = 380, p = new Float32Array(N * 3);
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < N; i++) {
      p[i * 3] = (rnd() - .5) * 22; p[i * 3 + 1] = rnd() * 5.5; p[i * 3 + 2] = (rnd() - .5) * 22;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    dust = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0x9fd8c0, size: .028, transparent: true, opacity: .32,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(dust);
  }
  // soft round sprites, not hard squares (texture assigned once created below)

  // ── controls ──────────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .06;
  controls.minDistance = .9;
  controls.maxDistance = 15;                             // above the authored opening/phone framing (~14.2) so update() doesn't silently clamp it in
  controls.maxPolarAngle = 1.52;
  controls.minPolarAngle = .18;
  controls.enablePan = false;
  controls.target.set(0, .8, 0);

  const root = new THREE.Group();
  scene.add(root);

  /* ── plinth — glowing ring + floor wash under each unit ─────────────────── */
  let _glowTex;
  function glowTexture() {
    if (_glowTex) return _glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.35, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    _glowTex = new THREE.CanvasTexture(c);
    return _glowTex;
  }
  dust.material.map = glowTexture();     // soft round dust sprites
  dust.material.needsUpdate = true;

  function makePlinth(hue, r = .74) {
    const p = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, .012, 8, 80).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.position.y = .015;
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(r * .8, .005, 8, 64).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring2.position.y = .015;
    const wash = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 2.6, r * 2.6).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: glowTexture(), color: hue, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false }));
    wash.position.y = .006;
    p.add(ring, ring2, wash);
    p.userData.ring = ring;
    return p;
  }

  /* ── data streams — pulses flowing from every sensor into Shaman ─────────── */
  const streams = [];
  function makeStream(from, to, hue) {
    const mid = from.clone().lerp(to, .5);
    mid.y += 1.15 + from.distanceTo(to) * .1;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    // faint carrier line
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
      new THREE.LineBasicMaterial({ color: hue, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false }));
    // the packets
    const N = 4;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: hue, size: .075, transparent: true, opacity: .95,
      blending: THREE.AdditiveBlending, depthWrite: false, map: glowTexture(), alphaTest: .01,
    }));
    pts.frustumCulled = false;
    const s = { curve, line, pts, n: N, offset: streams.length * .13 };
    streams.push(s);
    scene.add(line, pts);
    return s;
  }
  function setStreamsVisible(v, dur = .8) {
    for (const s of streams) {
      gsap.to(s.line.material, { opacity: v ? .12 : 0, duration: dur, overwrite: true });
      gsap.to(s.pts.material, { opacity: v ? .95 : 0, duration: dur, overwrite: true });
    }
  }

  /* ── frame loop ───────────────────────────────────────────────────────────── */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .55, .85, .8);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const clock = new THREE.Clock();
  let onTick = null;
  const spinners = [];   // {obj, ax, v}
  const pulsers = [];    // materials with emissive
  const floaters = [];   // groups that levitate
  const wavers = [];     // wolf's expanding rings

  function registerDevice(g) {
    (g.userData.spin || []).forEach(s => spinners.push(s));
    (g.userData.pulse || []).forEach(m => pulsers.push(m));
    if (g.userData.float) floaters.push(g);
    (g.userData.waves || []).forEach(w => wavers.push(w));
  }

  // per-device idle motion (spinners/pulsers/floaters/wavers) — shared so the
  // phone stage can drive it too via world.stepDevices() without the desktop
  // render/controls path (the mobile loop owns its own camera + render).
  function stepDevices(t, dt) {
    for (const s of spinners) s.obj.rotation[s.ax] += s.v * dt * .96;
    for (let i = 0; i < pulsers.length; i++) {
      const m = pulsers[i];
      if (m.userData.base === undefined) m.userData.base = m.emissiveIntensity;
      m.emissiveIntensity = m.userData.base * (0.72 + 0.28 * Math.sin(t * 2.1 + i * 2.3));
    }
    for (const f of floaters) f.position.y = (f.userData.baseY ?? 0) + Math.sin(t * .8) * .05;
    for (const w of wavers) {
      const ph = ((t * .32 + w.userData.phase) % 1);
      w.scale.setScalar(.6 + ph * 3.4);
      w.material.opacity = .34 * (1 - ph) * (w.material.userData.fadeMul ?? 1);   // honour the device dim, don't fight applyFade
    }
  }

  let _lastT = 0;
  const _spTmp = new THREE.Vector3();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(.05, t - _lastT); _lastT = t;      // clamped delta — spinners are time-based, not refresh-rate coupled
    gridUniforms.uTime.value = t;

    stepDevices(t, dt);
    dust.rotation.y = t * .006;

    for (const s of streams) {
      const a = s.pts.geometry.attributes.position;
      for (let i = 0; i < s.n; i++) {
        const u = (t * .16 + s.offset + i / s.n) % 1;
        s.curve.getPoint(u, _spTmp);                       // reuse a scratch vector — no per-packet allocation
        a.setXYZ(i, _spTmp.x, _spTmp.y, _spTmp.z);
      }
      a.needsUpdate = true;
    }

    controls.update();
    onTick && onTick(t);
    composer.render();
  }

  addEventListener('resize', () => {
    if (innerWidth <= 560) return;                          // phone: the mobile stage owns the renderer size (per-viz); never reallocate to fullscreen
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });

  function setGridDim(dim, dur = 1.2) {
    gsap.to(gridUniforms.uOpacity, { value: dim ? .32 : 1, duration: dur, ease: 'power2.inOut', overwrite: true });
  }

  return {
    renderer, scene, camera, controls, root, bloom, composer,
    makePlinth, makeStream, setStreamsVisible, registerDevice, setGridDim, stepDevices,
    set onTick(fn) { onTick = fn; },
    start() { animate(); },
  };
}
