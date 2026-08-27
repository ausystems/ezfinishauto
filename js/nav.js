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
