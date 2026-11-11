// Usage: node eval.ts [cases.json]   (default: data/cases.constructed.json)
// Prints band per case, confusion table and failures. Writes results/rules_<name>.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { analyze, type Registry } from "./engine.ts";

const casesPath = process.argv[2] || new URL("./data/cases.constructed.json", import.meta.url).pathname;
const reg: Registry = JSON.parse(readFileSync(new URL("./data/registry.sample.json", import.meta.url), "utf8"));
const raw = JSON.parse(readFileSync(casesPath, "utf8"));
const cases: { id: string; label: string; group: string; text: string; dialect?: string }[] = raw.cases ?? raw;
const FAMILY_SAVED = ["0509999999"]; // constructed

const rows = cases.map(c => {
  const t0 = performance.now();
  const r = analyze(c.text, reg, FAMILY_SAVED);
  return { ...c, band: r.band, ms: performance.now() - t0, reasons: r.reasons,
    asks: r.asks.map(a => a.value), who: r.who.map(w => w.value), lines: r.lines.map(l => `${l.check}:${l.status}`),
    qg: r.quoteGuardRemoved };
});

const by = (k: (r: typeof rows[0]) => string) => {
  const m = new Map<string, Record<string, number>>();
  for (const r of rows) { const g = k(r); const o = m.get(g) ?? {}; o[`${r.label}->${r.band}`] = (o[`${r.label}->${r.band}`] ?? 0) + 1; m.set(g, o); }
  return m;
};
const scams = rows.filter(r => r.label === "scam"), legit = rows.filter(r => r.label === "legit");
const pct = (a: number, b: number) => b ? `${a}/${b} (${(100 * a / b).toFixed(1)}%)` : "n/a";
console.log("cases:", rows.length, "| scam:", scams.length, "| legit:", legit.length);
console.log("scam  -> stop_and_verify :", pct(scams.filter(r => r.band === "stop_and_verify").length, scams.length));
console.log("scam  -> any flag        :", pct(scams.filter(r => r.band !== "no_signs_found").length, scams.length));
console.log("legit -> stop_and_verify :", pct(legit.filter(r => r.band === "stop_and_verify").length, legit.length), " <- false alarm");
console.log("legit -> verify_first    :", pct(legit.filter(r => r.band === "verify_first").length, legit.length));
console.log("quote-guard removals     :", rows.reduce((s, r) => s + r.qg, 0));
const ms = rows.map(r => r.ms).sort((a, b) => a - b);
console.log("latency ms p50/max       :", ms[Math.floor(ms.length / 2)].toFixed(2), ms[ms.length - 1].toFixed(2));
console.log("\nby group:"); for (const [g, o] of by(r => r.dialect ?? r.group)) console.log(" ", g.padEnd(12), JSON.stringify(o));
console.log("\nfailures (scam not stopped / legit stopped):");
for (const r of rows) if ((r.label === "scam" && r.band !== "stop_and_verify") || (r.label === "legit" && r.band === "stop_and_verify"))
  console.log(` ${r.id} [${r.label}->${r.band}] asks=${r.asks} who=${r.who} lines=${r.lines} :: ${r.text.slice(0, 80)}`);
mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
const name = casesPath.split("/").pop()!.replace(".json", "");
writeFileSync(new URL(`./results/rules_${name}.json`, import.meta.url), JSON.stringify(rows, null, 1));
