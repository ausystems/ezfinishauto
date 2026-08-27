/* ============================================================
   Local dev server with production parity.
   Mirrors the vercel.json behaviour so what you see locally is
   what deploys: cleanUrls (/contact serves contact.html and
   /contact.html redirects), no trailing slashes, a real 404
   status for the custom 404 page, and the same response
   headers. Zero dependencies.

   Run:  npm run dev   →  http://localhost:4173
   ============================================================ */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = normalize(join(fileURLToPath(import.meta.url), "..", ".."));
const PORT = process.env.PORT || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

// keep in sync with vercel.json
const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://maps.google.com https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
};

// mirrors .vercelignore: never serve what production never serves
const HIDDEN = /^\/(node_modules|dist|scripts|\.claude|\.git|audit\.mjs|qa\.mjs|package(-lock)?\.json|README\.md)(\/|$)/;

async function send(res, status, file, extraHeaders = {}) {
  const body = await readFile(file);
  res.writeHead(status, {
    "Content-Type": TYPES[extname(file)] || "application/octet-stream",
    "Content-Length": body.length,
    ...SECURITY,
    ...extraHeaders,
  });
  res.end(body);
}

async function exists(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let path = decodeURIComponent(url.pathname);

    if (HIDDEN.test(path)) return send(res, 404, join(ROOT, "404.html"));

    // trailingSlash: false
    if (path.length > 1 && path.endsWith("/")) {
      res.writeHead(308, { Location: path.slice(0, -1) + url.search });
      return res.end();
    }
    // cleanUrls: /contact.html → /contact
    if (path.endsWith(".html")) {
      const clean = path === "/index.html" ? "/" : path.slice(0, -5);
      res.writeHead(308, { Location: clean + url.search });
      return res.end();
    }

    const safe = normalize(join(ROOT, path));
    if (!safe.startsWith(ROOT)) return send(res, 404, join(ROOT, "404.html"));

    if (path === "/") return send(res, 200, join(ROOT, "index.html"));
    if (await exists(safe)) return send(res, 200, safe);
    if (!extname(path) && (await exists(safe + ".html"))) return send(res, 200, safe + ".html");

    return send(res, 404, join(ROOT, "404.html"));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("dev server error: " + e.message);
  }
}).listen(PORT, () => {
  console.log(`EZ Finish Auto → http://localhost:${PORT}`);
});
