/* ============================================================
   Point the site at its real domain.

   Every absolute URL (canonicals, Open Graph, structured data,
   sitemap, robots, llms.txt) is generated from one base URL.
   When the production domain is ready, run:

     node scripts/set-site-url.mjs https://www.ezfinishauto.com

   and every file is rewritten in place. Run it again any time
   the domain changes.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = normalize(join(fileURLToPath(import.meta.url), "..", ".."));
const FILES = ["index.html", "contact.html", "sitemap.xml", "robots.txt", "llms.txt"];

const next = (process.argv[2] || "").replace(/\/+$/, "");
if (!/^https:\/\/[a-z0-9.-]+$/i.test(next)) {
  console.error("Usage: node scripts/set-site-url.mjs https://www.yourdomain.com");
  process.exit(1);
}

// find the current base from the homepage canonical
const home = await readFile(join(ROOT, "index.html"), "utf8");
const m = home.match(/<link rel="canonical" href="(https:\/\/[^/"]+)\/?"/);
if (!m) { console.error("Could not find the current canonical URL in index.html"); process.exit(1); }
const current = m[1];

if (current === next) { console.log(`Site URL is already ${next}`); process.exit(0); }

for (const f of FILES) {
  const p = join(ROOT, f);
  const before = await readFile(p, "utf8");
  const after = before.split(current).join(next);
  await writeFile(p, after);
  const count = before.split(current).length - 1;
  console.log(`${f}: ${count} URL${count === 1 ? "" : "s"} updated`);
}
console.log(`\nSite URL: ${current} → ${next}`);
