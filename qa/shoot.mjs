// node qa/shoot.mjs [url] [outDir] — drives system Chrome with ALL non-localhost requests blocked,
// walks Home → Input (sample) → Result in Arabic and English, saves screenshots, prints any request that tried to leave.
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
// Serves app/dist from disk inside Chrome (no server, no network). Any other host is blocked and logged.
const dist = process.argv[2] || decodeURIComponent(new URL("../app/dist/", import.meta.url).pathname);
const url = "http://tahaqaq.test/";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon", ".wasm": "application/wasm", ".onnx": "application/octet-stream" };
const out = process.argv[3] || decodeURIComponent(new URL("./shots/", import.meta.url).pathname);
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-first-run"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const leaks = [], errors = [];
await page.setRequestInterception(true);
page.on("request", r => {
  const u = new URL(r.url());
  if (r.url().startsWith("data:")) return r.continue();
  if (u.hostname !== "tahaqaq.test") { leaks.push(r.url()); return r.abort(); }
  let f = join(dist, decodeURIComponent(u.pathname)); if (!existsSync(f) || f.endsWith("/")) f = join(dist, "index.html");
  r.respond({ status: 200, contentType: TYPES[extname(f)] || "application/octet-stream", body: readFileSync(f) });
});
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
const click = async txt => {
  const ok = await page.evaluate(t => {
    const all = [...document.querySelectorAll('[role="button"],[role="tab"],button')];
    const el = all.find(e => e.textContent.trim() === t) || all.filter(e => e.textContent.includes(t)).pop();
    if (!el) return false; el.click(); return true;
  }, txt);
  if (!ok) throw new Error("not found: " + txt);
  await new Promise(r => setTimeout(r, 300));
};
const shot = async name => { await page.screenshot({ path: out + name + ".png", fullPage: true }); console.log("shot", name); };
const t0 = Date.now();
await page.goto(url, { waitUntil: "networkidle0" });
console.log("load ms", Date.now() - t0);
await shot("01-home-ar");
await click("افحص رسالة"); await click("نموذج 1"); await click("افحص"); await shot("02-result-ar-official");
await click("English"); await shot("03-result-en-official");
await click("Check"); await click("Sample 2"); await click("Saved number");
await click("Check"); await shot("04-result-en-family");
await click("After the call"); await click("Not confirmed: do not pay"); await shot("05-close-en");
await click("Check"); await click("Tap what happened"); await click("A family member"); await shot("05b-wizard-en"); await click("Continue"); await click("Money"); await click("Continue"); await click("Hurry"); await click("Continue"); await click("Voice note"); await click("Continue"); await click("A new number");
await click("Check"); await shot("06-result-en-taps");
await click("Sources"); await shot("07-sources-en");
await click("Set-up"); await shot("08-setup-en");
await click("Practice"); await shot("09-practice-en"); await click("Who"); await shot("10-practice-answer-en"); await click("Next"); await click("Next").catch(() => {}); await click("العربية"); await shot("11-practice-ar");
console.log("requests that tried to leave the machine:", leaks.length ? leaks : "none");
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
