/* Landseed AI — the operations console, flat. All numbers on this page are
   illustrative and the console is labeled "sample data" — never remove that
   badge (repo CLAUDE.md · satellite rules). */

/* entrances */
const rvs = [...document.querySelectorAll('.rv')];
rvs.forEach((el, i) => setTimeout(() => el.classList.add('in'), 60 + i * 90));

/* occupancy sectors — deterministic sample values (no Math.random) */
const heat = [
  12, 30, 8, 55, 74, 38, 15, 62, 88,
  41, 22, 70, 33, 9, 48, 81, 27, 58,
  17, 66, 35, 91, 44, 13, 52, 76, 29,
  61, 19, 83, 46, 25, 68, 11, 57, 39,
  72, 31, 14, 64, 87, 23, 49, 7, 53,
];
document.getElementById('occ').innerHTML =
  heat.map((v, i) => `<i style="--v:${v}" title="sector ${'ABCDEFGHI'[i % 9]}${Math.floor(i / 9) + 1} · ${v}% · sample"></i>`).join('');

/* the console clock runs — the one live element */
const clock = document.getElementById('clock');
let mins = 18 * 60 + 45;
setInterval(() => {
  mins = (mins + 1) % 1440;
  clock.textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}, 20000);

/* headless-verification hook — same doctrine as __hw / __demo (repo CLAUDE.md) */
window.__ai = {
  panes: [...document.querySelectorAll('.pane-h')].map(h => h.textContent),
  sectors: heat.length,
  feedRows: document.querySelectorAll('.feed-row').length,
  sampleBadge: !!document.querySelector('.con-bar .sp-badge'),
  facts: { metrics: 'presence · occupancy · density · abundance' },
  revealed: () => rvs.filter(el => el.classList.contains('in')).length,
};
