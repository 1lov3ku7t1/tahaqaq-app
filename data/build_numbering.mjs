// Builds data/numbering.json from libphonenumber 971 ranges.csv (Apache-2.0, provenance column kept).
import { readFileSync, writeFileSync } from "node:fs";
const src = new URL("../_import/data_samples/libphonenumber_971_ranges.csv", import.meta.url);
const rows = readFileSync(src, "utf8").trim().split("\n").slice(1).map(l => l.split(";").map(s => s.trim().replace(/^"|"$/g, "")));
const ranges = rows.map(([prefix, length, type, tariff, , operator, , , region, provenance]) =>
  ({ prefix, length, type, tariff, operator: operator || null, region: region || null, provenance: provenance || null }));
writeFileSync(new URL("./numbering.json", import.meta.url), JSON.stringify({
  _source: "Google libphonenumber metadata resources/metadata/971/ranges.csv (Apache-2.0), https://raw.githubusercontent.com/google/libphonenumber/master/resources/metadata/971/ranges.csv. Not published by TDRA directly.",
  retrieved: "2026-11-10", ranges }, null, 1));
console.log("numbering ranges:", ranges.length);
