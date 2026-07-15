/* Landseed AI — reveal choreography, scrollspy, sample-data dashboards.
   All dashboard numbers are illustrative and labeled "sample data" in the DOM —
   never remove those badges (repo CLAUDE.md · satellite rules). */

const prefersStill = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* reveals — settle once, never re-run */
const rvs = [...document.querySelectorAll('.rv')];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: .12 });
rvs.forEach(el => io.observe(el));

/* scrollspy — the active section is the last anchor above the viewport's
   upper-middle line (deterministic; heading-only IntersectionObserver targets
   mislabel whenever a section is taller than the viewport) */
const anchors = ['story', 'dashboards', 'workflow'];
const chips = [...document.querySelectorAll('#chapters .chip.dive')];
const marks = anchors.map(id => document.getElementById(id)).filter(Boolean);
function spyTick() {
  const mid = scrollY + innerHeight * .45;
  let act = marks[0];
  for (const m of marks) if (m.offsetTop <= mid) act = m;
  chips.forEach(c => c.classList.toggle('on', c.getAttribute('href') === '#' + act.id));
}
addEventListener('scroll', spyTick, { passive: true });
spyTick();
document.documentElement.style.scrollBehavior = prefersStill ? 'auto' : 'smooth';

/* detection sparkline — deterministic sample curve, drawn in the page accent */
const spark = document.getElementById('spark');
if (spark) {
  const ctx = spark.getContext('2d');
  const W = spark.width, H = spark.height, N = 48;
  const pts = Array.from({ length: N }, (_, i) =>
    H - 14 - (Math.sin(i * .42) * .5 + .5) * (H - 40) * (i > 30 ? 1 : .45) - (i === 38 ? 18 : 0));
  ctx.strokeStyle = '#9B6CE0'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((y, i) => ctx[i ? 'lineTo' : 'moveTo'](10 + i * (W - 20) / (N - 1), y));
  ctx.stroke();
  ctx.fillStyle = 'rgba(155,108,224,.14)';
  ctx.lineTo(W - 10, H - 6); ctx.lineTo(10, H - 6); ctx.closePath(); ctx.fill();
}

/* occupancy heat grid — fixed sample values (deterministic, no Math.random) */
const grid = document.getElementById('grid');
if (grid) {
  const heat = [12, 30, 8, 55, 74, 38, 15, 62, 88, 41, 22, 70, 33, 9, 48, 81, 27, 58, 17, 66, 35, 91, 44, 13, 52, 76, 29];
  grid.innerHTML = heat.map(v => `<i style="--v:${v}" title="sample"></i>`).join('');
}

/* counts + bars settle on reveal */
function settle() {
  document.querySelectorAll('.dash-row .bar i').forEach(b => { b.style.width = b.dataset.w + '%'; });
  document.querySelectorAll('.dash-row em[data-n]').forEach(em => {
    const target = +em.dataset.n;
    if (prefersStill) { em.textContent = target; return; }
    const t0 = performance.now();
    (function tick(t) {
      const k = Math.min(1, (t - t0) / 900);
      em.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  });
}
const dash = document.querySelector('.dash-grid');
if (dash) new IntersectionObserver((e, o) => {
  if (e[0].isIntersecting) { settle(); o.disconnect(); }
}, { threshold: .25 }).observe(dash);

/* headless-verification hook — same doctrine as __hw / __demo (repo CLAUDE.md) */
window.__ai = {
  sections: anchors,
  active: () => (chips.find(c => c.classList.contains('on')) || {}).textContent || null,
  sampleBadges: [...document.querySelectorAll('.dash .sp-badge')].map(b => b.textContent),
  facts: {
    line: document.querySelector('.sat-hero .sat-line').textContent.slice(0, 60),
    metrics: 'presence · occupancy · density · abundance',
  },
  revealed: () => rvs.filter(el => el.classList.contains('in')).length,
};
