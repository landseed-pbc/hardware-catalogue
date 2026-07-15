/* Why Landseed — reveal choreography + the verification hook. No Three.js,
   no GSAP: this page is built to be forwarded and to load on field bandwidth. */

const rvs = [...document.querySelectorAll('.rv')];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: .12 });
rvs.forEach(el => io.observe(el));

// headless-verification hook — same doctrine as __hw / __demo (repo CLAUDE.md)
window.__why = {
  facts: {
    capture: '200 ms',
    battery: '>12 mo',
    price: '$199–225',
    links: 'cell · LoRa · Wi-Fi · satellite',
  },
  qaCount: document.querySelectorAll('.qa > div').length,
  badges: [...document.querySelectorAll('.sp-badge')].map(b => b.textContent),
  revealed: () => rvs.filter(el => el.classList.contains('in')).length,
};
