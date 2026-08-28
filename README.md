# EZ Finish Auto

Mobile car detailing serving all cities across the Greater Toronto Area, Ontario. A cinematic one-page site (96 frames of one car washed from mud to mirror finish, scrubbed on a pinned scroll timeline) plus a booking/contact page and a custom 404.

**Stack**: hand-built static HTML/CSS/JS. GSAP + ScrollTrigger (vendored) drive the scroll experience. No framework, no build step.

## Pages

| URL | File | Purpose |
| --- | --- | --- |
| `/` | `index.html` | Home, hero wash experience, packages & pricing, booking section, service-area map |
| `/contact` | `contact.html` | Booking / contact, direct channels + a booking-request composer form |
| anything else | `404.html` | Custom 404 (served with a real 404 status) |

## Run locally

```bash
npm install
npm run dev        # http://localhost:4173
```

`scripts/dev.mjs` mirrors production behaviour (Vercel `cleanUrls`, no trailing slashes, real 404 status, same security headers), so what you see locally is what deploys. Don't use a plain static server, `/contact` only resolves with clean-URL handling.

## Deploy (GitHub + Vercel)

1. Push this repository to GitHub.
2. In Vercel: **Add New Project → Import** the repo. Framework preset: **Other**. No build command, no output directory, it deploys as-is.
3. `vercel.json` supplies clean URLs, redirects, caching, and security headers. `.vercelignore` keeps dev tooling out of the deployment.

### When the real domain is ready

Every absolute URL (canonicals, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`) currently points at `https://ezfinishauto.vercel.app`. After attaching the production domain in Vercel, run:

```bash
node scripts/set-site-url.mjs https://www.yourdomain.com
```

then commit and push. Finally, submit `sitemap.xml` in Google Search Console.

### The business phone number

The number is `+1 647-424-4813`, configured once as `smsNumber` in [`js/config.js`](js/config.js). Every booking CTA leads to the contact page; the green message bubble and every TEXT link open the messages app to that number with a short prefilled greeting, and CALL links dial it. The number is displayed with call and text options in the footer of every page, in the booking section, and on the contact page.

## SEO

**Keyword strategy** (local, transactional intent):

- **Primary (home)**: mobile car detailing Greater Toronto Area / mobile car detailing GTA
- **Secondary**: mobile auto detailing Toronto · mobile detailing near me · interior & exterior car detailing · car detailing at home
- **Long-tail**: mobile car detailing at your home or workplace, SUV / van / truck detailing prices GTA
- **Contact page**: book mobile car detailing GTA · mobile car detailing quote

Mapping: the homepage is the money page (service + packages + prices + area); `/contact` is the conversion page. Copy is the client's approved poster copy, deliberately terse and human; keywords live in metadata, headings, alt text, structured data, and the two pages' distinct titles/descriptions, not stuffed into the visible copy.

**Implemented**: unique titles/descriptions/canonicals per page · full Open Graph + Twitter cards with a dedicated 1200×630 share image · `AutoDetailing` (+`WebSite`/`WebPage`/`ContactPage`/`BreadcrumbList`) JSON-LD aligned with visible content · `sitemap.xml` · `robots.txt` · `llms.txt` for AI search · semantic HTML with one `h1` per page · descriptive alts · footer site navigation (doubles as the HTML sitemap) · `lang="en-CA"` · noindex on the 404.

## Structure

```
index.html  contact.html  404.html          pages
css/style.css                               one design system for all pages
js/config.js                                contact paths & phone number (single source)
js/main.js                                  home: wash scrub, camera, map, reveals
js/nav.js                                   hamburger menu (all pages)
js/contact.js                               contact: form validation + message composer
assets/seq[-sm]/                            96 wash frames (desktop / ≤700px)
assets/fonts/sora-var.woff2 + dmsans-var    Sora (display) + DM Sans (body)
assets/vendor/                              gsap, ScrollTrigger
assets/veh/ · assets/og-image.jpg · assets/footer-bg.webp
robots.txt  sitemap.xml  llms.txt           crawlers
vercel.json  .vercelignore                  deployment
scripts/dev.mjs                             prod-parity dev server
scripts/set-site-url.mjs                    one-command domain swap
audit.mjs  qa.mjs                           QA: 9-viewport visual audit + site-wide checks
```

## QA

```bash
npm run dev      # in one terminal
npm run audit    # 9-viewport visual/layout/a11y audit of the home page
npm run qa       # site-wide: routes, links, CTAs, metadata, schema, headers, form, 404
```

## Notes

- The wash frames stream on a priority ladder (first/last, then strides 8/4/2/1) and blend between the nearest loaded neighbours, so scrubbing is continuous while loading.
- Reduced motion gets a fully static layout: the finished car as a still, the three hero cards stacked in flow, no pin.
- The booking form is a **message composer** by design: it validates, writes the booking request, copies it, and hands off to Instagram DMs or the messages app. Nothing is sent or stored server-side, so there is no backend to break and nothing to maintain.
