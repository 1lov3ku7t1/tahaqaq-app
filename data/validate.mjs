// node data/validate.mjs — checks every record file. Exit 1 on any error.
import { readFileSync } from "node:fs";
const load = f => JSON.parse(readFileSync(new URL("./" + f, import.meta.url), "utf8"));
let errors = 0; const err = m => { errors++; console.log("ERROR", m); };
const files = { "registry.json": "entities", "redlines.json": "rules", "routes.json": "routes" };
for (const [f, key] of Object.entries(files)) {
  const rows = load(f)[key]; let approved = 0; const ids = new Set();
  for (const x of rows) {
    if (!x.id || ids.has(x.id)) err(`${f}: missing or duplicate id ${x.id}`); ids.add(x.id);
    if (!x.source_url?.startsWith("https://")) err(`${f}:${x.id} source_url`);
    if (!/^\d{4}-\d\d-\d\d$/.test(x.retrieved || "")) err(`${f}:${x.id} retrieved date`);
    if (typeof x.approved_by_lead !== "boolean") err(`${f}:${x.id} approved_by_lead`);
    if (x.approved_by_lead) approved++;
    if (f === "registry.json") {
      if (!x.names_en?.length && !x.names_ar?.length) err(`${f}:${x.id} no name`);
      for (const p of x.phones) if (!/^\+971\d{3,12}$/.test(p.e164)) err(`${f}:${x.id} phone ${p.e164}`);
      if (x.approved_by_lead && x.source_url.includes("u.ae/en/Help")) err(`${f}:${x.id} approved but source is the directory, not the entity's own page`);
    }
  }
  console.log(`${f}: ${rows.length} rows, ${approved} approved`);
}
const a = load("announcements.json"); console.log(`announcements.json: ${a.items.length} items, snapshot ${a.snapshot_date ?? "NOT CONNECTED"}`);
console.log(`numbering.json: ${load("numbering.json").ranges.length} ranges`);
console.log(errors ? `${errors} errors` : "0 errors"); process.exit(errors ? 1 : 0);
