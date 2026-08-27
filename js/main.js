/* ============================================================
   EZ FINISH AUTO · mobile detailing
   96 frames of one car, mud to mirror finish, scrubbed on a
   pinned GSAP timeline. The hero is seamless full bleed on the
   black page; poster phrases land as the wash progresses; when
   the water shuts off the film contracts into a hairline framed
   print beside THE EZ FINISH AUTO STANDARD. The light grey body
   below carries the packages, booking and footer.
   ============================================================ */

(() => {
  "use strict";

  /* The business number and contact paths live in js/config.js. */
  const CFG = window.EZ_CONFIG || {};

  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.lagSmoothing(0);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const frameEls = ["#f1", "#f2", "#f3"].map((id) => {
    const el = $(id);
    return {
      el,
      rule: $(".f-rule", el),
      lines: $$(".f-line", el),
      // the supporting line, the price line and the button move together
      bits: [...$$(".f-lead, .f-price", el), $(".f-cta", el)].filter(Boolean),
      cta: $(".f-cta", el),
    };
  });

  const dom = {
    canvas: $("#wash"),
    seq: $(".seq"),
    nav: $("#nav"),
    scrim: $("#scrim"),
    progressFill: $("#seqProgressFill"),
    lightZones: $$(".zone-light"),
  };

  /* ---------------- frames ---------------- */
  const FRAME_COUNT = 96;
  const FW = 1280, FH = 720;
  const frames = new Array(FRAME_COUNT).fill(null);
  const small = !window.__FRAMES && window.innerWidth <= 700;
  const srcOf = (i) => {
    if (window.__FRAMES) return window.__FRAMES[i];
    const id = String(i + 1).padStart(3, "0");
    return small ? `assets/seq-sm/w-${id}.webp` : `assets/seq/w-${id}.webp`;
  };

  function loadFrame(i) {
    if (frames[i]) return Promise.resolve(frames[i]);
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.src = srcOf(i);
      const done = () => { frames[i] = img; resolve(img); };
      if (img.decode) img.decode().then(done).catch(() => { img.onload = done; img.onerror = () => resolve(null); });
      else { img.onload = done; img.onerror = () => resolve(null); }
    });
  }

  // priority ladder: frame 0, the last frame, then strides 8 / 4 / 2 / 1
  function ladderOrder() {
    const seen = new Set();
    const order = [];
    const push = (i) => { if (i >= 0 && i < FRAME_COUNT && !seen.has(i)) { seen.add(i); order.push(i); } };
    push(0); push(FRAME_COUNT - 1);
    for (const s of [8, 4, 2, 1]) for (let i = 0; i < FRAME_COUNT; i += s) push(i);
    return order;
  }

  function pumpLoads() {
    const order = ladderOrder();
    let idx = 0;
    const next = () => {
      if (idx >= order.length) return;
      const i = order[idx++];
      loadFrame(i).then(() => { requestDraw(); next(); });
    };
    for (let k = 0; k < 6; k++) next();
  }

  /* ---------------- canvas + cinematic camera ----------------
     The film IS the hero: every frame is drawn full bleed, and a
     virtual camera (focal point + zoom inside the footage) dollies
     through the story on the same scrubbed timeline.
  ------------------------------------------------------------ */
  const ctx = dom.canvas.getContext("2d");
  let cw = 0, ch = 0, dpr = 1, portrait = false;

  const state = {
    vf: 0,
    fx: 0.5, fy: 0.5, zoom: 1.03,
    bandY: 0.44,
    introA: reduced ? 1 : 0,
  };
  window.__state = state;

  // pointer-driven micro pan of the camera (lerped in the ticker)
  const cam = { pfx: 0, pfy: 0, tfx: 0, tfy: 0 };

  let fitMode = false;

  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = dom.canvas.clientWidth || dom.seq.clientWidth;
    ch = dom.canvas.clientHeight || dom.seq.clientHeight;
    dom.canvas.width = Math.round(cw * dpr);
    dom.canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // matches the CSS orientation query exactly, so the card layout
    // and the camera band always agree on which script to run
    portrait = ch >= cw;
    // wide screens cover the viewport (the whole car still fits);
    // everything narrower fits the full frame width so the entire
    // car is always visible, feathered into the dark page
    fitMode = cw / ch < 1.55;
    dom.canvas.classList.toggle("fit", fitMode);
  }

  const smooth = (f) => f * f * (3 - 2 * f);

  // where the car band starts before the scrub takes over:
  // tablets run taller cards (start low), tall phones lift the car
  // toward the title, small phones keep the low band
  const bandStart = () =>
    portrait ? (cw >= 761 ? 0.92 : ch >= 760 ? 0.86 : 0.92) : 0.44;

  function nearestPair(vf) {
    let a = -1;
    for (let k = Math.floor(vf); k >= 0; k--) if (frames[k]) { a = k; break; }
    if (a < 0) for (let k = Math.floor(vf) + 1; k < FRAME_COUNT; k++) if (frames[k]) { a = k; break; }
    if (a < 0) return null;
    let b = -1;
    for (let k = a + 1; k < FRAME_COUNT; k++) if (frames[k]) { b = k; break; }
    if (b < 0 || vf <= a) return { a, b: null, t: 0 };
    const t = Math.min(1, (vf - a) / (b - a));
    return { a, b, t: smooth(t) };
  }

  function coverDraw(img, alpha) {
    const iw = img.naturalWidth || FW, ih = img.naturalHeight || FH;
    ctx.globalAlpha = alpha;
    if (fitMode) {
      // full frame width always visible: the car never crops
      const zoom = Math.min(Math.max(state.zoom, 1.0), 1.045);
      const s = (cw / iw) * zoom;
      const sw = cw / s, sh = ih;
      const sx = (iw - sw) * gsap.utils.clamp(0, 1, state.fx + cam.pfx);
      const dh = ih * s;
      const dy = (ch - dh) * state.bandY;
      ctx.drawImage(img, sx, 0, sw, sh, 0, dy, cw, dh);
    } else {
      const zoom = Math.max(state.zoom, 1.015);
      const s = Math.max(cw / iw, ch / ih) * zoom;
      const sw = cw / s, sh = ch / s;
      const fx = gsap.utils.clamp(0, 1, state.fx + cam.pfx);
      const fy = gsap.utils.clamp(0, 1, state.fy + cam.pfy);
      const sx = (iw - sw) * fx;
      const sy = (ih - sh) * fy;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    }
  }

  function draw() {
    if (!cw || !ch) return;
    ctx.clearRect(0, 0, cw, ch);
    const pair = nearestPair(gsap.utils.clamp(0, FRAME_COUNT - 1, state.vf));
    if (!pair) return;
    coverDraw(frames[pair.a], state.introA);
    if (pair.b && pair.t > 0) coverDraw(frames[pair.b], state.introA * pair.t);
    ctx.globalAlpha = 1;
  }

  let drawQueued = false;
  function requestDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => { drawQueued = false; draw(); });
  }

  /* ---------------- boot visibility ---------------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  const fontsReady = Promise.all([
    document.fonts.load('800 100px "Bricolage Grotesque"'),
    document.fonts.load('600 12px "Bricolage Grotesque"'),
    document.fonts.load('480 17px "Bricolage Grotesque"'),
  ]).then(() => document.fonts.ready).catch(() => {});

  const firstFrame = loadFrame(0).then(requestDraw);
  pumpLoads();

  const failsafe = new Promise((r) => setTimeout(r, 1600));

  Promise.race([Promise.all([fontsReady, firstFrame]), failsafe]).then(() => {
    sizeCanvas();
    draw();
    document.body.classList.add("ready");
    if (!reduced) intro();
  });

  /* ---------------- initial states ----------------
     Frame one's finished look is its CSS baseline, so rewinding the
     scrub to the top always lands on a complete first card. Frames
     two and three start hidden because their moment has not come.
  ------------------------------------------------------------ */
  if (!reduced) {
    gsap.set(dom.nav, { autoAlpha: 0, y: -10 });
    gsap.set(".sms", { autoAlpha: 0, y: 16 });
    [frameEls[1], frameEls[2]].forEach((f) => {
      gsap.set(f.el, { autoAlpha: 0 });
      gsap.set(f.lines, { yPercent: 112 });
      gsap.set(f.rule, { scaleX: 0 });
      gsap.set(f.bits, { autoAlpha: 0, y: 20 });
    });
  }

  // without motion the still should be the finished car, not the dirty one
  if (reduced) state.vf = FRAME_COUNT - 1;

  let introDone = reduced;
  function intro() {
    const f = frameEls[0];
    const tl = gsap.timeline({ defaults: { ease: "power4.out" }, onComplete: () => { introDone = true; } });
    tl.from(f.rule, { scaleX: 0, duration: 0.8, ease: "expo.out" }, 0.05)
      .fromTo(state, { zoom: 1.1 }, {
        zoom: portrait ? 1.02 : 1.035, introA: 1,
        duration: 1.6, ease: "power3.out", onUpdate: requestDraw,
      }, 0.08)
      .from(f.lines, { yPercent: 112, duration: 1.15, stagger: 0.1 }, 0.3)
      .from(f.bits, { autoAlpha: 0, y: 20, duration: 0.85, stagger: 0.1 }, 0.72)
      .to(dom.nav, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.8)
      .to(".sms", { autoAlpha: 1, y: 0, duration: 0.7, ease: "back.out(1.6)" }, 1.15);
  }

  /* ---------------- scrubbed master timeline ----------------
     10 units across a 600% pin. vf 0 -> 95 between u0.6 and
     u9.3. Poster phrases land as the wash progresses; the film
     contracts into a framed print as the water shuts off.
  ------------------------------------------------------------ */
  function buildScrub() {
    const FT = { immediateRender: false };
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: dom.seq,
        start: "top top",
        end: "+=520%",
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => gsap.set(dom.progressFill, { scaleX: self.progress }),
      },
    });

    // redraw on every render, including the scrub's catch-up after the wheel stops
    tl.eventCallback("onUpdate", requestDraw);
    tl.to(state, { vf: FRAME_COUNT - 1, duration: 8.9 }, 0.5);
    tl.fromTo(dom.scrim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ...FT }, 0.5);

    // the camera dollies through the footage while the cards change
    const FX = portrait
      ? [[0.66, 0], [0.5, 2.4], [0.4, 4.7], [0.56, 7.0], [0.5, 9.3]]
      : [[0.5, 0], [0.455, 2.4], [0.555, 4.7], [0.465, 7.0], [0.5, 9.3]];
    for (let i = 1; i < FX.length; i++) {
      tl.to(state, { fx: FX[i][0], duration: FX[i][1] - FX[i - 1][1], ease: "sine.inOut" }, FX[i - 1][1]);
    }
    tl.to(state, { zoom: 1.015, duration: 2.6, ease: "sine.inOut" }, 1.2)
      .to(state, { zoom: 1.06, duration: 2.4, ease: "sine.inOut" }, 4.4)
      .to(state, { zoom: portrait ? 1.02 : 1.04, duration: 2.5, ease: "sine.inOut" }, 6.8);

    if (portrait) {
      // portrait: the car keeps its own band under the cards; the
      // tablet layout runs taller cards, so its band rides lower
      const tab = cw >= 761;
      tl.to(state, { bandY: tab ? 0.97 : 0.9, duration: 1.2, ease: "sine.inOut" }, 0.45)
        .to(state, { bandY: tab ? 1.0 : 0.96, duration: 1.0, ease: "sine.inOut" }, 8.3);
    }

    // frame one leaves as the jets arrive
    const f1 = frameEls[0];
    tl.fromTo(f1.rule, { scaleX: 1 },
      { scaleX: 0, transformOrigin: "right center", duration: 0.4, ease: "power2.in", ...FT }, 1.15)
      .fromTo(f1.bits, { y: 0, autoAlpha: 1 },
        { y: -28, autoAlpha: 0, duration: 0.42, stagger: 0.04, ease: "power2.in", ...FT }, 1.15)
      .fromTo(f1.lines, { yPercent: 0 },
        { yPercent: -118, duration: 0.5, stagger: 0.06, ease: "power2.in", ...FT }, 1.2);

    // frames two and three each arrive, hold, and hand over
    const shows = [
      { f: frameEls[1], in: 2.9, out: 5.5 },
      { f: frameEls[2], in: 6.5, out: null },   // the last card rides to the end
    ];
    shows.forEach(({ f, in: tin, out }) => {
      tl.set(f.el, { autoAlpha: 1 }, tin - 0.05)
        .fromTo(f.rule, { scaleX: 0 }, { scaleX: 1, duration: 0.34, ease: "power2.out", ...FT }, tin)
        .fromTo(f.lines, { yPercent: 112 },
          { yPercent: 0, duration: 0.5, stagger: 0.08, ease: "power3.out", ...FT }, tin + 0.06)
        .fromTo(f.bits, { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.38, stagger: 0.09, ease: "power3.out", ...FT }, tin + 0.3);

      if (out !== null) {
        tl.to(f.bits, { y: -28, autoAlpha: 0, duration: 0.4, stagger: 0.04, ease: "power2.in" }, out)
          .to(f.lines, { yPercent: -118, duration: 0.46, stagger: 0.06, ease: "power2.in" }, out + 0.04)
          .to(f.rule, { scaleX: 0, transformOrigin: "right center", duration: 0.34, ease: "power2.in" }, out)
          .set(f.el, { autoAlpha: 0 }, out + 0.55);
      }
    });

    return tl;
  }

  /* ---------------- water light: three.js caustics ----------------
     A procedural light-through-water field behind the pricing glass.
     The cards backdrop-blur it, so the glass is refracting something
     real. Renders only while the section is on screen.
  ------------------------------------------------------------ */
  let causticsOn = false;

  // three.js is 600KB the first paint never needs: fetch it only
  // when the pricing section is approaching the viewport
  function lazyCaustics() {
    if (reduced || !$("#caustics")) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const s = document.createElement("script");
      s.src = "assets/vendor/three.min.js";
      s.onload = buildCaustics;
      document.body.appendChild(s);
    };
    if (!("IntersectionObserver" in window)) { start(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
    }, { rootMargin: "900px 0px" });
    io.observe($(".services"));
  }

  function buildCaustics() {
    const cnv = $("#caustics");
    if (!cnv || reduced || !window.THREE) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: cnv, alpha: true, antialias: false });
    } catch (e) { cnv.style.display = "none"; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const scene = new THREE.Scene();
    const camera3 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: "void main(){gl_Position=vec4(position,1.0);}",
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform vec2 uRes;
        void main(){
          vec2 uv = gl_FragCoord.xy / uRes;
          vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 5.0;
          float t = uTime * 0.35;
          vec2 i = p;
          float c = 1.0;
          for (int n = 0; n < 3; n++) {
            float fn = float(n) + 1.0;
            i = p + vec2(cos(t - i.x * 1.3) + sin(t + i.y * 1.1),
                         sin(t - i.y * 1.4) + cos(t + i.x * 1.2));
            c += 1.0 / length(vec2(p.x / (sin(i.x + t) / 0.24),
                                   p.y / (cos(i.y + t) / 0.24)));
          }
          c /= 4.0;
          c = 1.17 - pow(c, 1.4);
          float glow = pow(abs(c), 8.0);
          vec2 d = uv - vec2(0.5, 0.42);
          float mask = 1.0 - smoothstep(0.34, 0.72, length(d * vec2(1.1, 1.5)));
          vec3 col = vec3(0.18, 0.32, 1.0) * glow * 1.4 + vec3(0.05, 0.1, 0.4) * abs(c) * 0.35;
          gl_FragColor = vec4(col, mask * min(glow * 1.6 + 0.12, 0.85));
        }`,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    const svc = $(".services");
    function sizeCaustics() {
      const w = svc.clientWidth, h = svc.clientHeight;
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    }
    sizeCaustics();
    window.addEventListener("resize", () => setTimeout(sizeCaustics, 150));

    gsap.ticker.add((time) => {
      if (!causticsOn) return;
      uniforms.uTime.value = time;
      renderer.render(scene, camera3);
    });
    ScrollTrigger.create({
      trigger: svc,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => { causticsOn = self.isActive; },
    });
  }

  /* ---------------- glass card physics ---------------- */
  function buildCardTilt() {
    if (!finePointer || reduced) return;
    $$(".card").forEach((card) => {
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.7, ease: "power3.out" });
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.7, ease: "power3.out" });
      gsap.set(card, { transformPerspective: 1100 });
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        rx((0.5 - py) * 9);
        ry((px - 0.5) * 11);
      });
      card.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });
  }

  /* ---------------- the service area map ----------------
     A live Google Map of the Greater Toronto Area, centered so
     Brampton, Toronto, Mississauga, Vaughan and the lakeshore all
     read at a glance, tinted to the brand and framed by the panel.
  ------------------------------------------------------------ */
  const GMAP = "https://maps.google.com/maps?ll=43.72,-79.42&z=9&t=m&output=embed&hl=en";

  function buildMap() {
    const slot = $("#mapSlot");
    if (!slot) return;

    // shown only where an embedded map cannot load (a sandboxed
    // preview, an offline device): the region and a way to open it
    const fb = document.createElement("div");
    fb.className = "map-fallback";
    fb.innerHTML =
      '<span class="mf-rule"></span>' +
      '<span class="mf-title">GREATER TORONTO AREA</span>' +
      '<a class="mf-link" href="https://maps.google.com/?ll=43.72,-79.42&z=9" target="_blank" rel="noopener">OPEN IN GOOGLE MAPS</a>';
    slot.appendChild(fb);

    // a host that forbids third party frames reports it here, which
    // is how we know to leave the fallback in place
    let blocked = false;
    document.addEventListener("securitypolicyviolation", (e) => {
      if ((e.blockedURI || "").indexOf("google") !== -1) {
        blocked = true;
        slot.classList.remove("map-live");
      }
    });

    const frame = document.createElement("iframe");
    frame.className = "map-embed";
    frame.src = GMAP;
    frame.title = "Map of the Greater Toronto Area, served by EZ Finish Auto";
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer-when-downgrade";
    frame.addEventListener("load", () => {
      if (!blocked) slot.classList.add("map-live");
    });
    slot.appendChild(frame);

    setTimeout(() => { if (blocked) slot.classList.remove("map-live"); }, 2600);
  }

  /* ---------------- light body reveals ---------------- */
  function buildReveals() {
    const rise = (sel, trigger) => {
      const els = $$(sel);
      if (!els.length) return;
      gsap.to(els, {
        yPercent: 0, duration: 1.0, ease: "power4.out", stagger: 0.09,
        scrollTrigger: { trigger, start: "top 78%", once: true },
      });
    };
    const fade = (sel, trigger, delay = 0.15) => {
      const els = $$(sel);
      if (!els.length) return;
      gsap.from(els, {
        y: 34, autoAlpha: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, delay,
        scrollTrigger: { trigger, start: "top 78%", once: true },
      });
    };

    rise(".services-title .t-line", ".services");
    fade(".services-sub", ".services", 0.25);
    gsap.from(".card", {
      y: 72, rotationX: -7, autoAlpha: 0, transformPerspective: 1400, transformOrigin: "center bottom",
      duration: 1.15, ease: "power3.out", stagger: 0.14,
      scrollTrigger: { trigger: ".cards", start: "top 82%", once: true },
    });

    rise(".book-title .t-line", ".book");
    fade(".book .sec-eyebrow, .book-body p, .book-col .cta, .book-city", ".book", 0.16);
    gsap.from(".map-panel", {
      y: 60, autoAlpha: 0, duration: 1.1, ease: "power3.out", delay: 0.2,
      scrollTrigger: { trigger: ".book", start: "top 78%", once: true },
    });

    fade(".footer-id > *, .footer-socials a", ".footer", 0.1);
    gsap.fromTo(".footer-mark", { yPercent: 34, autoAlpha: 0.4 }, {
      yPercent: 0, autoAlpha: 1, ease: "none",
      scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: 0.6 },
    });
  }

  /* ---------------- nav theme flip ----------------
     created after the pin exists so its positions include
     the pin spacer */
  let lightCount = 0;
  function initNavFlip() {
    lightCount = 0;
    dom.lightZones.forEach((zone) => {
      ScrollTrigger.create({
        trigger: zone,
        start: "top 88px",
        end: "bottom 88px",
        onToggle: (self) => {
          lightCount += self.isActive ? 1 : -1;
          if (lightCount < 0) lightCount = 0;
          dom.nav.classList.toggle("on-light", lightCount > 0);
        },
      });
    });
  }

  /* ---------------- parallax, magnetic, inspection light ---------------- */
  if (finePointer && !reduced) {
    const hx = frameEls.map((f) => gsap.quickTo(f.el, "x", { duration: 1.2, ease: "power3.out" }));
    window.addEventListener("pointermove", (e) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = (e.clientY / window.innerHeight) * 2 - 1;
      hx.forEach((fn) => fn(mx * -6));
      // the camera leans gently toward the pointer
      cam.tfx = mx * 0.045;
      cam.tfy = my * 0.03;
    }, { passive: true });

    // every hero button pulls gently toward the cursor
    const mags = frameEls.map((f) => ({
      el: f.cta,
      x: gsap.quickTo(f.cta, "x", { duration: 0.5, ease: "power3.out" }),
      y: gsap.quickTo(f.cta, "y", { duration: 0.5, ease: "power3.out" }),
    }));
    window.addEventListener("pointermove", (e) => {
      mags.forEach((m) => {
        const r = m.el.getBoundingClientRect();
        if (!r.width || +getComputedStyle(m.el).opacity < 0.4) { m.x(0); m.y(0); return; }
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        const R = 110;
        const k = dist < R ? (1 - dist / R) * 0.3 : 0;
        m.x(dx * k); m.y(dy * k);
      });
    }, { passive: true });
  }

  // camera lean: eased pursuit of the pointer
  if (!reduced && finePointer) {
    gsap.ticker.add(() => {
      const cx0 = cam.tfx - cam.pfx, cy0 = cam.tfy - cam.pfy;
      if (Math.abs(cx0) + Math.abs(cy0) > 0.0003) {
        cam.pfx += cx0 * 0.06;
        cam.pfy += cy0 * 0.06;
        requestDraw();
      }
    });
  }

  /* ---------------- text-message links ----------------
     One configured number (js/config.js) drives the floating
     button and every booking button. Until the number is set,
     those CTAs route to the contact page so none of them is
     ever a dead link.
  ------------------------------------------------------------ */
  (() => {
    const sms = typeof CFG.smsHref === "function" ? CFG.smsHref() : "";
    const href = sms || CFG.contactPage || "/contact";
    $$("[data-sms]").forEach((el) => { el.href = href; });
  })();

  /* ---------------- anchors ---------------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  });

  /* ---------------- boot ---------------- */
  sizeCanvas();
  state.fx = portrait ? 0.66 : 0.5;
  state.bandY = bandStart();
  buildMap();
  lazyCaustics();
  buildCardTilt();
  if (!reduced) { buildScrub(); buildReveals(); initNavFlip(); ScrollTrigger.refresh(); }
  else { initNavFlip(); document.body.classList.add("ready"); }

  // verification hook: /?p=0.5 scrolls to that pin progress after load
  const qp = new URLSearchParams(location.search).get("p");
  if (qp !== null) {
    window.addEventListener("load", () => {
      setTimeout(() => {
        const st = ScrollTrigger.getAll().find((s) => s.pin);
        if (st) window.scrollTo(0, st.start + (st.end - st.start) * parseFloat(qp));
      }, 900);
    });
  }

  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const wasPortrait = portrait;
      sizeCanvas();
      if (!reduced && portrait !== wasPortrait) {
        // orientation flip: rebuild the scrub for the new camera script
        // and settle any reveal that had not fired yet
        ScrollTrigger.getAll().forEach((s) => s.kill());
        state.fx = portrait ? 0.66 : 0.5;
        state.fy = 0.5;
        state.bandY = bandStart();
        state.zoom = portrait ? 1.02 : 1.035;
        gsap.set(dom.scrim, { autoAlpha: 0 });
        gsap.set(".t-line, .sec-eyebrow, .services-sub, .card, .book-body p, .book-city, .map-panel, .book-col .cta, .footer-id > *, .footer-socials a, .footer-mark", { clearProps: "transform,opacity,visibility" });
        frameEls.forEach((f, i) => {
          gsap.set(f.el, { autoAlpha: i === 0 ? 1 : 0 });
          gsap.set(f.lines, { yPercent: 0 });
          gsap.set(f.rule, { scaleX: 1, transformOrigin: "left center" });
          gsap.set(f.bits, { autoAlpha: i === 0 ? 1 : 0, y: 0 });
        });
        buildScrub();
        initNavFlip();
      }
      draw();
      ScrollTrigger.refresh();
    }, 120);
  });
})();
