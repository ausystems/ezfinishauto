/* ============================================================
   FOOTER · stacking card
   The footer is pulled a card's depth into the section above it and
   starts the page held back down at the seam. As the last screen of
   scroll arrives it rides up over the content, rounded top corners
   and a soft edge, like a card settling on a deck. Scroll back and it
   returns exactly the way it came.

   One transform write per frame, nothing that touches layout, and it
   stands down entirely when the reader asks for reduced motion.
------------------------------------------------------------ */
(() => {
  "use strict";

  const footer = document.querySelector(".footer");
  if (!footer) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

  let lift = 0;      // how far the card travels, from the CSS
  let from = 0;      // the scroll position the travel starts at
  let span = 1;      // the scroll distance the travel is spread over
  let frame = 0;
  let painted = -1;
  let running = false;
  let observer = null;

  function measure() {
    // read the untransformed position, then hand the transform back
    const held = footer.style.transform;
    footer.style.transform = "none";
    const docTop = footer.getBoundingClientRect().top + window.scrollY;
    footer.style.transform = held;

    // the travel is the depth the card is set into the section above,
    // taken straight off the used margin so CSS stays the single source
    lift = Math.max(0, -parseFloat(getComputedStyle(footer).marginTop) || 0);

    const vh = window.innerHeight;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    from = Math.max(0, Math.min(docTop - vh, maxScroll));
    // never ask for more scroll than the page has left to give
    span = Math.max(1, Math.min(vh * 0.5, maxScroll - from));
  }

  function paint() {
    frame = 0;
    const p = clamp01((window.scrollY - from) / span);
    const eased = p * p * (3 - 2 * p);          // smoothstep, no easing library
    const y = (1 - eased) * lift;
    if (Math.abs(y - painted) < 0.05) return;
    painted = y;
    footer.style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
  }

  function onScroll() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measure();
      painted = -1;
      paint();
    }, 120);
  }

  function start() {
    if (running) return;
    running = true;
    measure();
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
    window.addEventListener("load", onResize);
    if ("ResizeObserver" in window && !observer) {
      // pinned sections and late images change the page height under us
      observer = new ResizeObserver(onResize);
      observer.observe(document.body);
    }
  }

  function stop() {
    running = false;
    footer.style.transform = "none";
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onResize);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  if (reduced.matches) footer.style.transform = "none";
  else start();

  const onPref = (e) => (e.matches ? stop() : (running = false, start()));
  if (reduced.addEventListener) reduced.addEventListener("change", onPref);
  else if (reduced.addListener) reduced.addListener(onPref);
})();
