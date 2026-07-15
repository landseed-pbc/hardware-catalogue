/* FAQs — the field sheet. Flat page: entrance reveals + the verification hook.
   No Three.js, no GSAP — everything on one sheet, everything visible. */

const rvs = [...document.querySelectorAll('.rv')];
rvs.forEach((el, i) => setTimeout(() => el.classList.add('in'), 60 + i * 45));

// headless-verification hook — same doctrine as __hw / __demo (repo CLAUDE.md)
window.__faq = {
  qaCount: document.querySelectorAll('.cell.qa').length,
  factCount: document.querySelectorAll('.cell.fact').length,
  sketch: !!document.querySelector('.cell.sketch svg'),
  facts: { capture: '200 ms', battery: '>12 mo', price: '$199–225', form: '2×AA' },
  badges: [...document.querySelectorAll('.sp-badge')].map(b => b.textContent),
  revealed: () => rvs.filter(el => el.classList.contains('in')).length,
};
