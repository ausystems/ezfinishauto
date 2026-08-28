import { chromium } from 'playwright-core';
const OUT = process.env.AUDIT_OUT || '/private/tmp/claude-501/-Users-ahmadkhalid-EZ-Finish-Auto/d5d15f7d-d6bf-46cd-8f1a-6d18da390593/scratchpad/audit';
import { mkdirSync } from 'fs';
mkdirSync(OUT, { recursive: true });

const VIEWS = [
  ['xs-320',  320,  568, true],
  ['iphone-se', 375, 667, true],
  ['iphone-14', 390, 844, true],
  ['iphone-max', 430, 932, true],
  ['land-844', 844, 390, true],
  ['tab-768', 768, 1024, false],
  ['tab-1024', 1024, 1366, false],
  ['laptop', 1280, 800, false],
  ['desktop', 1600, 900, false],
];

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const report = [];

for (const [label, w, h, mobile] of VIEWS) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const errs = [];
  page.on('pageerror', e => errs.push('JS: ' + String(e).slice(0, 120)));
  page.on('console', c => { if (c.type() === 'error') errs.push('CON: ' + c.text().slice(0, 120)); });
  page.on('requestfailed', r => errs.push('REQ: ' + r.url().split('/').pop().slice(0, 60)));

  const t0 = Date.now();
  await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded' });
  const domMs = Date.now() - t0;
  await page.waitForTimeout(2600);

  // settle every reveal first so bounds reflect the real, final layout
  await page.evaluate(async () => {
    document.querySelector('#services').scrollIntoView();
    await new Promise(r => setTimeout(r, 900));
    document.querySelector('#book').scrollIntoView();
    await new Promise(r => setTimeout(r, 900));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 900));
  });
  await page.waitForTimeout(600);

  const issues = await page.evaluate(() => {
    const out = [];
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) out.push(`H-OVERFLOW page ${de.scrollWidth}>${de.clientWidth}`);
    // any element whose VISIBLE box exceeds the viewport. An element
    // deliberately clipped by an overflow-hidden ancestor (a bleed
    // inside a card) is measured by what actually renders, not its
    // raw rect: intersect with every clipping ancestor first.
    document.querySelectorAll('body *').forEach(el => {
      let left = el.getBoundingClientRect().left;
      let right = el.getBoundingClientRect().right;
      const width = right - left;
      if (width <= 0) return;
      let a = el.parentElement;
      while (a && a !== document.body) {
        const acs = getComputedStyle(a);
        if (/(hidden|clip)/.test(acs.overflow + acs.overflowX)) {
          const ar = a.getBoundingClientRect();
          left = Math.max(left, ar.left);
          right = Math.min(right, ar.right);
        }
        a = a.parentElement;
      }
      if (right <= left) return; // fully clipped away
      if (right > innerWidth + 2 || left < -2) {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.overflow !== 'hidden' && el.id !== 'wash' && !el.closest('#wash')) {
          out.push(`OUT-OF-BOUNDS ${el.tagName}.${(el.className||'').toString().split(' ')[0]} L${Math.round(left)} R${Math.round(right)}`);
        }
      }
    });
    // tap targets
    document.querySelectorAll('a,button').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && (r.height < 40 || r.width < 40)) {
        out.push(`SMALL-TAP ${el.tagName}.${(el.className||'').toString().split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    // hero copy visible unscrolled
    const hc = document.getElementById('heroCopy');
    if (hc) {
      const r = hc.getBoundingClientRect();
      const cs = getComputedStyle(hc);
      if (+cs.opacity < 0.95) out.push('HERO-COPY faded ' + cs.opacity);
      if (r.bottom > innerHeight + 1 || r.top < 0) out.push(`HERO-COPY off-screen top${Math.round(r.top)} bot${Math.round(r.bottom)} vh${innerHeight}`);
    }
    // images without dimensions or alt
    document.querySelectorAll('img').forEach(im => {
      if (!im.getAttribute('alt')) out.push('IMG-NO-ALT ' + im.src.split('/').pop());
      if (!im.getAttribute('width')) out.push('IMG-NO-DIM ' + im.src.split('/').pop());
      if (im.naturalWidth === 0 && im.complete) out.push('IMG-BROKEN ' + im.src.split('/').pop());
    });
    return out;
  });

  await page.screenshot({ path: `${OUT}/${label}_hero.png` });

  // scroll through the whole page and collect more issues
  await page.evaluate(() => document.querySelector('#services').scrollIntoView());
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/${label}_svc.png` });
  const svcIssues = await page.evaluate(() => {
    const out = [];
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) out.push('H-OVERFLOW at services');
    document.querySelectorAll('.card-shot img').forEach(im => {
      const r = im.getBoundingClientRect();
      if (r.width < 60) out.push('CARD-IMG tiny ' + Math.round(r.width));
    });
    return out;
  });
  await page.evaluate(() => document.querySelector('#book').scrollIntoView());
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/${label}_book.png` });
  const bookIssues = await page.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push('H-OVERFLOW at book');
    const slot = document.getElementById('mapSlot');
    if (slot && slot.getBoundingClientRect().height < 120) out.push('MAP too short ' + Math.round(slot.getBoundingClientRect().height));
    return out;
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${label}_foot.png` });
  const footIssues = await page.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push('H-OVERFLOW at footer');
    return out;
  });

  const all = [...issues, ...svcIssues, ...bookIssues, ...footIssues, ...errs];
  report.push({ label, w, h, domMs, count: all.length, issues: [...new Set(all)].slice(0, 14) });
  await page.close();
}
await browser.close();
for (const r of report) {
  console.log(`\n=== ${r.label} (${r.w}x${r.h}) dom:${r.domMs}ms issues:${r.count}`);
  r.issues.forEach(i => console.log('   -', i));
}
