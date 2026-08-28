/* ============================================================
   EZ FINISH AUTO · mobile navigation
   A minimal hamburger for small screens: full-screen panel,
   scroll lock while open, Escape and link-click to close,
   focus returned to the toggle. Shared by every page.
   ============================================================ */

(() => {
  "use strict";

  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  if (!toggle || !menu) return;

  let open = false;

  function setOpen(next) {
    open = next;
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    toggle.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("menu-open", open);
    if (open) {
      const first = menu.querySelector("a");
      if (first) first.focus();
    } else {
      toggle.focus();
    }
  }

  toggle.addEventListener("click", () => setOpen(!open));

  // any choice closes the menu; same-page anchors then scroll as usual
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });

  // leaving the mobile breakpoint tidies up after itself
  const mq = window.matchMedia("(min-width: 901px)");
  const onChange = () => { if (mq.matches && open) setOpen(false); };
  if (mq.addEventListener) mq.addEventListener("change", onChange);
})();

/* ============================================================
   Nav light-flip for the subpages.
   The homepage flips the bar to its light glass state with
   ScrollTrigger as it crosses light sections; the contact and
   404 pages have no GSAP, so the same rule runs here with a
   plain scroll listener: the bar goes light while the 88px
   line sits inside the page's light band (below the dark hero,
   above the dark footer). The hero page skips this block.
   ============================================================ */

(() => {
  "use strict";
  if (document.querySelector(".seq")) return; // homepage: main.js owns the flip

  const nav = document.getElementById("nav");
  const footer = document.querySelector(".footer");
  if (!nav || !footer) return;
  const hero = document.querySelector(".chero"); // dark split hero (contact); absent on 404

  let lightStart = 0;
  let lightEnd = Infinity;

  function measure() {
    const y = window.scrollY;
    lightStart = hero ? hero.getBoundingClientRect().bottom + y : 0;
    lightEnd = footer.getBoundingClientRect().top + y;
    apply();
  }

  function apply() {
    const line = window.scrollY + 88;
    nav.classList.toggle("on-light", line >= lightStart && line < lightEnd);
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; apply(); });
  }, { passive: true });
  window.addEventListener("resize", () => setTimeout(measure, 150));
  window.addEventListener("load", measure);
  measure();
})();

/* ============================================================
   Prefilled text links.
   Static links marked .js-sms point at sms:<number> so they
   work without JavaScript; here they gain the short prefilled
   greeting, with the right body separator per platform.
   ============================================================ */

(() => {
  "use strict";
  const CFG = window.EZ_CONFIG || {};
  if (typeof CFG.smsHref !== "function") return;
  const href = CFG.smsHref();
  if (!href) return;
  document.querySelectorAll("a.js-sms").forEach((a) => { a.href = href; });
})();
