/* FAQs — the size proof IS the page: the real Monitor builder at true scale
   beside two AA batteries, live in the bay. Show, don't tell. */

import * as THREE from 'three';
import { createWorld } from '/src/world.js';
import { buildSerengeti } from '/src/devices.js';

const world = createWorld(document.getElementById('scene'));
const { camera, root, controls } = world;

/* the unit — endurance kit (external pack + cable) hidden for the size read:
   the claim is about the sensor, and the pack would dwarf the AAs */
const unit = buildSerengeti(0x00FF64);
const _c = new THREE.Vector3();
for (const child of unit.children) {
  new THREE.Box3().setFromObject(child).getCenter(_c);
  if (_c.x > .22) child.visible = false;
}
root.add(unit);

/* two AA batteries, standing beside it. Scale: the sensor body (0.48 units
   with feet) stands for ~50 mm, so one AA (14.5 × 50.5 mm) is r=.076, h=.53 */
function aaBattery() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9c0c4, roughness: .32, metalness: .88 });
  const wrap = new THREE.MeshStandardMaterial({ color: 0x1d2422, roughness: .55, metalness: .25 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8a24b, roughness: .35, metalness: .9 });
  const cyl = (r1, r2, h, m, y) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 28), m); x.position.y = y; x.castShadow = true; g.add(x); return x; };
  cyl(.076, .076, .1, steel, .05);           // bottom shoulder
  cyl(.0765, .0765, .34, wrap, .27);         // label wrap
  cyl(.076, .076, .07, steel, .475);         // top shoulder
  cyl(.028, .028, .022, brass, .521);        // positive nub
  return g;
}
const aa1 = aaBattery(); aa1.position.set(.33, 0, .17);
const aa2 = aaBattery(); aa2.position.set(.47, 0, .04);
aa2.rotation.y = .4;
root.add(aa1, aa2);

/* framing + orbit — close, clamped, slowly turning until touched */
controls.target.set(.1, .3, 0);
camera.position.set(.75, .55, 1.05);
controls.minDistance = .55;
controls.maxDistance = 2.6;
controls.maxPolarAngle = 1.5;
controls.autoRotate = true;
controls.autoRotateSpeed = .8;
controls.update();
['pointerdown', 'wheel'].forEach(ev =>
  document.getElementById('scene').addEventListener(ev, () => { controls.autoRotate = false; }, { once: true, passive: true }));

world.onTick = (t) => {
  unit.position.y = Math.sin(t * .8) * .012;              // the bay's idle breath
};
world.start();

/* boot: drop the loader once the first frames are through */
setTimeout(() => {
  const loader = document.getElementById('loader');
  loader.style.transition = 'opacity .7s'; loader.style.opacity = '0';
  setTimeout(() => loader.remove(), 800);
  document.body.classList.remove('booting');
}, 600);

/* accordion — every row wants the click */
const fqs = [...document.querySelectorAll('.fq')];
for (const fq of fqs) {
  fq.querySelector('.q').addEventListener('click', () => {
    const open = fq.classList.toggle('open');
    fq.querySelector('.q').setAttribute('aria-expanded', String(open));
  });
}

/* headless-verification hook — same doctrine as __hw / __demo (repo CLAUDE.md) */
window.__faq = {
  qaCount: fqs.length,
  open: (i) => { fqs[i].classList.add('open'); },
  openCount: () => fqs.filter(f => f.classList.contains('open')).length,
  facts: { capture: '200 ms', battery: '>12 mo', price: '$199–225', form: '2×AA' },
  scene: { unit: () => unit.visible, batteries: 2, autoRotate: () => controls.autoRotate },
};
