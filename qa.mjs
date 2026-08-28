/* ============================================================
   Site-wide QA: routes, redirects, headers, metadata, schema,
   links, CTAs, images, a11y basics, and the contact form flow.
   Requires the dev server:  npm run dev   then  npm run qa
   ============================================================ */

import { chromium } from "playwright-core";

const BASE = "http://localhost:4173";
let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ FAIL ${label}`); }
};

/* ---------------- 1 · HTTP layer ---------------- */
console.log("\n== HTTP: routes, redirects, headers ==");

const get = (path, redirect = "manual") => fetch(BASE + path, { redirect });

{
  const r = await get("/");
  ok(r.status === 200, "/ → 200");
  ok((r.headers.get("content-security-policy") || "").includes("default-src 'self'"), "CSP header present");
  ok(r.headers.get("x-content-type-options") === "nosniff", "nosniff header present");
  ok((r.headers.get("referrer-policy") || "").length > 0, "referrer-policy present");
}
{
  const r = await get("/contact");
  ok(r.status === 200, "/contact → 200 (clean URL)");
}
{
  const r = await get("/contact.html");
  ok(r.status === 308 && r.headers.get("location") === "/contact", "/contact.html → 308 /contact");
}
{
  const r = await get("/contact/");
  ok(r.status === 308 && r.headers.get("location") === "/contact", "/contact/ → 308 /contact");
}
{
  const r = await get("/definitely-not-a-page");
  const body = await r.text();
  ok(r.status === 404, "unknown route → HTTP 404");
  ok(body.includes("NOTHING TO DETAIL"), "404 serves the custom page");
}
for (const p of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/favicon.ico", "/favicon.svg", "/apple-touch-icon.png", "/assets/og-image.jpg"]) {
  const r = await get(p);
  ok(r.status === 200, `${p} → 200`);
}
{
  const robots = await (await get("/robots.txt")).text();
  ok(/^Sitemap: https:\/\/\S+\/sitemap\.xml$/m.test(robots), "robots.txt names the sitemap");
  const sm = await (await get("/sitemap.xml")).text();
  const locs = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  ok(locs.length === 2, `sitemap has 2 URLs (${locs.length})`);
  for (const loc of locs) {
    const path = new URL(loc).pathname;
    const r = await get(path);
    ok(r.status === 200, `sitemap URL resolves locally: ${path}`);
  }
}
for (const p of ["/package.json", "/node_modules/sharp/package.json", "/scripts/dev.mjs", "/README.md", "/dist/artifact.html"]) {
  const r = await get(p);
  ok(r.status === 404, `${p} is not served`);
}

/* ---------------- 2 · pages in a real browser ---------------- */
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

const PAGES = [
  { path: "/", h1: "YOUR CAR STAYS PUT", ld: 1 },
  { path: "/contact", h1: "BOOK YOUR", ld: 1 },
  { path: "/definitely-not-a-page", h1: "NOTHING TO DETAIL", ld: 0, noindex: true },
];

const seenMeta = new Set();

for (const view of [{ name: "desktop", w: 1440, h: 900 }, { name: "mobile", w: 390, h: 844, mobile: true }]) {
  for (const pg of PAGES) {
    console.log(`\n== ${pg.path} · ${view.name} ==`);
    const page = await browser.newPage({
      viewport: { width: view.w, height: view.h },
      deviceScaleFactor: view.mobile ? 2 : 1,
      isMobile: !!view.mobile,
      hasTouch: !!view.mobile,
    });
    const errs = [];
    page.on("pageerror", (e) => errs.push("JS: " + String(e).slice(0, 140)));
    page.on("console", (c) => {
      const src = c.location()?.url || "";
      // a 404 page's own document request logs as a failed resource (expected)
      if (pg.noindex && src === BASE + pg.path) return;
      if (c.type() === "error" && !/googleapis|gstatic|google\.com|maps/.test(src))
        errs.push("CON: " + c.text().slice(0, 140));
    });
    page.on("requestfailed", (r) => {
      if (!/google|gstatic/.test(r.url())) errs.push("REQ: " + r.url().slice(0, 120));
    });

    await page.goto(BASE + pg.path, { waitUntil: "load" });
    await page.waitForTimeout(2200);

    const info = await page.evaluate(() => {
      const de = document.documentElement;
      const h1s = [...document.querySelectorAll("h1")];
      const lds = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
        try { JSON.parse(s.textContent); return true; } catch { return false; }
      });
      const badImgs = [...document.querySelectorAll("img")].filter((i) => i.loading !== "lazy" && !i.naturalWidth).map((i) => i.src);
      const emptyHrefs = [...document.querySelectorAll("a")].filter((a) => {
        const h = a.getAttribute("href");
        return !h || h === "#";
      }).length;
      const anchors = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href"));
      const missingAnchors = anchors.filter((h) => h !== "#top" && h.length > 1 && !document.querySelector(h));
      const paths = [...new Set([...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute("href").split("#")[0]).filter(Boolean))];
      const meta = {
        title: document.title,
        desc: document.querySelector('meta[name="description"]')?.content || "",
        canonical: document.querySelector('link[rel="canonical"]')?.href || "",
        robots: document.querySelector('meta[name="robots"]')?.content || "",
        ogImage: document.querySelector('meta[property="og:image"]')?.content || "",
        twitter: document.querySelector('meta[name="twitter:card"]')?.content || "",
      };
      const fontLoaded = document.fonts.check('800 40px "Sora"') && document.fonts.check('460 16px "DM Sans"');
      return {
        overflow: de.scrollWidth - de.clientWidth,
        h1Count: h1s.length, h1Text: h1s[0]?.textContent || "",
        lds, badImgs, emptyHrefs, missingAnchors, paths, meta, fontLoaded,
      };
    });

    ok(errs.length === 0, `no console/JS/request errors${errs.length ? " → " + errs.join(" | ") : ""}`);
    ok(info.overflow <= 1, `no horizontal overflow (${info.overflow}px)`);
    ok(info.h1Count === 1, `exactly one h1 (${info.h1Count})`);
    ok(info.h1Text.includes(pg.h1), `h1 is correct ("${info.h1Text.trim().slice(0, 40)}…")`);
    ok(info.lds.length >= pg.ld && info.lds.every(Boolean), `JSON-LD present and valid (${info.lds.length} block[s])`);
    ok(info.badImgs.length === 0, `all eager images decoded${info.badImgs.length ? " → " + info.badImgs.join(",") : ""}`);
    ok(info.emptyHrefs === 0, `no dead links (href="#" or empty): ${info.emptyHrefs}`);
    ok(info.missingAnchors.length === 0, `all same-page anchors exist${info.missingAnchors.length ? " → " + info.missingAnchors : ""}`);
    ok(info.fontLoaded, "brand font loaded");

    if (!pg.noindex) {
      ok(info.meta.title.length > 15 && info.meta.title.length <= 65, `title length ok (${info.meta.title.length})`);
      ok(info.meta.desc.length > 60 && info.meta.desc.length <= 180, `meta description length ok (${info.meta.desc.length})`);
      ok(info.meta.canonical.startsWith("https://"), "canonical is absolute");
      ok(info.meta.ogImage.startsWith("https://"), "og:image is absolute");
      ok(info.meta.twitter === "summary_large_image", "twitter card set");
      if (view.name === "desktop") {
        ok(!seenMeta.has(info.meta.title), "title unique across pages");
        ok(!seenMeta.has(info.meta.desc), "description unique across pages");
        seenMeta.add(info.meta.title); seenMeta.add(info.meta.desc);
      }
    } else {
      ok(info.meta.robots.includes("noindex"), "404 is noindex");
    }

    // every internal path this page links to must resolve
    for (const p of info.paths) {
      const r = await get(p === "" ? "/" : p);
      ok(r.status === 200, `internal link resolves: ${p || "/"}`);
    }

    // tap targets on the static pages (the home page is covered by audit.mjs)
    if (pg.path !== "/" && view.mobile) {
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("a, button, input, select, textarea")]
          .filter((el) => {
            if (el.closest('[aria-hidden="true"]') || el.tabIndex === -1) return false;
            const r = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && r.height < 43.5;
          })
          .map((el) => `${el.tagName}.${el.className}`.slice(0, 40)));
      ok(small.length === 0, `tap targets ≥44px${small.length ? " → " + small.join(", ") : ""}`);
    }

    await page.close();
  }
}

/* ---------------- 3 · contact form flow ---------------- */
console.log("\n== contact form flow ==");
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + "/contact", { waitUntil: "load" });
  await page.waitForTimeout(600);

  // hidden-by-default blocks must actually be invisible (computed style,
  // not just the attribute, since display:flex/grid can override [hidden])
  const hiddenOk = await page.evaluate(() => {
    const el = document.getElementById("qdone");
    return el && getComputedStyle(el).display === "none";
  });
  ok(hiddenOk, "success panel is visually hidden by default");

  // empty submit → all six required fields flag, form stays
  await page.click(".q-submit");
  const errState = await page.evaluate(() => ({
    errs: document.querySelectorAll(".field.has-err").length,
    invalid: document.querySelectorAll('[aria-invalid="true"]').length,
    doneHidden: getComputedStyle(document.getElementById("qdone")).display === "none",
    focused: document.activeElement?.id,
  }));
  ok(errState.errs === 6 && errState.invalid === 6, `empty submit flags all six required fields (${errState.errs})`);
  ok(errState.doneHidden, "empty submit does not advance");
  ok(errState.focused === "q-name", "focus moves to the first error");

  // errors clear on input
  await page.fill("#q-name", "Jordan");
  const cleared = await page.evaluate(() => document.querySelectorAll("#fw-name.has-err").length);
  ok(cleared === 0, "error clears while typing");

  // a malformed email is caught before composing
  await page.fill("#q-phone", "647 555 0123");
  await page.fill("#q-email", "not-an-email");
  await page.fill("#q-city", "Mississauga");
  await page.selectOption("#q-vehicle", "SUV");
  await page.fill("#q-model", "Honda CR-V 2023");
  await page.click(".q-submit");
  const badEmail = await page.evaluate(() => ({
    err: document.querySelectorAll("#fw-email.has-err").length,
    doneHidden: getComputedStyle(document.getElementById("qdone")).display === "none",
  }));
  ok(badEmail.err === 1 && badEmail.doneHidden, "invalid email blocks the submit");

  // valid submit → prepared message with every field (message left empty: optional)
  await page.fill("#q-email", "jordan@example.com");
  await page.click(".q-submit");
  await page.waitForTimeout(400);
  const doneState = await page.evaluate(() => ({
    formHidden: getComputedStyle(document.getElementById("qform")).display === "none",
    doneShown: getComputedStyle(document.getElementById("qdone")).display !== "none",
    msg: document.getElementById("qdoneMsg").textContent,
    igHref: document.getElementById("qIg").href,
    smsHref: document.getElementById("qSms").href,
    smsShown: getComputedStyle(document.getElementById("qSms")).display !== "none",
    note: document.getElementById("qdoneNote").textContent,
  }));
  ok(doneState.formHidden && doneState.doneShown, "valid submit shows the prepared message");
  ok(["Jordan", "647 555 0123", "jordan@example.com", "SUV", "Honda CR-V 2023", "Mississauga"].every((v) => doneState.msg.includes(v)), "message contains every field");
  ok(!doneState.msg.includes("Message:"), "empty optional message stays out of the text");
  ok(doneState.igHref.includes("ig.me/m/ezfinishauto"), "Instagram handoff link correct");
  ok(doneState.smsShown && doneState.smsHref.startsWith("sms:+16474244813"), "text handoff opens the business number");
  ok(doneState.note.length > 0, "clipboard status note shown");

  // edit returns to the form with values intact
  await page.click("#qEdit");
  const back = await page.evaluate(() => ({
    formShown: !document.getElementById("qform").hidden,
    name: document.getElementById("q-name").value,
    model: document.getElementById("q-model").value,
  }));
  ok(back.formShown && back.name === "Jordan" && back.model === "Honda CR-V 2023", "edit returns to the filled form");

  // the optional message rides along when present
  await page.fill("#q-message", "Parked in my driveway");
  await page.click(".q-submit");
  await page.waitForTimeout(300);
  const withMsg = await page.evaluate(() => document.getElementById("qdoneMsg").textContent);
  ok(withMsg.includes("Message: Parked in my driveway"), "optional message included when filled");
  await page.click("#qEdit");

  // honeypot: bot fill → no advance
  await page.evaluate(() => { document.getElementById("q-company").value = "spam co"; });
  await page.click(".q-submit");
  const hp = await page.evaluate(() => document.getElementById("qdone").hidden);
  ok(hp, "honeypot blocks bot submissions");

  await page.close();
}

await browser.close();
console.log(`\n============================\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
