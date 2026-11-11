// node serve.mjs dist 8080 — static server for the offline demo. No dependencies, localhost only.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
const root = resolve(process.argv[2] || "dist"), port = Number(process.argv[3] || 8080);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".css": "text/css", ".wasm": "application/wasm", ".onnx": "application/octet-stream", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let f = join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
  if (f.endsWith("/") || f === root) f = join(f, "index.html");
  try { const b = await readFile(f); res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" }).end(b); }
  catch { if (extname(f)) { res.writeHead(404).end(); return; } try { res.writeHead(200, { "content-type": TYPES[".html"] }).end(await readFile(join(root, "index.html"))); } catch { res.writeHead(404).end(); } }
}).listen(port, "127.0.0.1", () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
