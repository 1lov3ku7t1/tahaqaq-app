// node run.mjs <siteRoot> <port>  — serves siteRoot statically, opens it in headless Chrome with
// ALL non-localhost requests blocked (proves the offline fallback), prints load/latency results and
// every request that tried to leave the machine.
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import puppeteer from "puppeteer-core";
const [root, port = "8765"] = process.argv.slice(2);
const types = { ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".json": "application/json", ".html": "text/html", ".onnx": "application/octet-stream" };
http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
}).listen(+port);
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--proxy-server=127.0.0.1:9", "--proxy-bypass-list=localhost;127.0.0.1"] });
const page = await browser.newPage();
const blocked = [], local = [];
await page.setRequestInterception(true);
page.on("request", r => { const u = r.url(); if (u.startsWith(`http://localhost:${port}`)) { local.push(u.replace(/^.*?:\d+/, "")); r.continue(); } else { blocked.push(u); r.abort(); } });
page.on("console", m => console.log("[console]", m.text().slice(0, 300)));
const t0 = Date.now();
await page.goto(`http://localhost:${port}/browser_check/index.html`);
await page.waitForFunction("window.__done", { timeout: 180000 });
const res = await page.evaluate("window.__done");
console.log(JSON.stringify({ wallMs: Date.now() - t0, ...res, blockedExternal: blocked, localRequests: local }, null, 1));
await browser.close(); process.exit(0);
