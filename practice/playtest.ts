// node --no-warnings practice/playtest.ts — A5 play-test: every practice round through the engine (all records, dev view).
// Prints band and record lines per round; fails if a round has no source, or a scam/scenario round gets no flag.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { analyze, type Data } from "../engine/engine.ts";
const j = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const data: Data = { registry: j("../data/registry.json"), redlines: j("../data/redlines.json"), numbering: j("../data/numbering.json"), announcements: j("../data/announcements.json") };
const rounds = j("../data/practice.json").rounds;
assert.equal(rounds.length, 12, "need 12 rounds");
let fails = 0;
for (const r of rounds) {
  assert.ok(r.source_url?.startsWith("https://") && r.published, r.id + " source");
  const res = analyze(r.taps ? { taps: r.taps } : { text: r.text }, data, { saved: [{ name: "Son", tel: "+971500000000" }], senderIs: r.senderIs });
  const flagged = res.band !== "no_signs_found";
  const ok = r.broken === "nothing" ? res.band !== "stop_and_verify" : flagged;
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"} ${r.id} broken=${r.broken.padEnd(7)} band=${res.band.padEnd(15)} lines=${res.lines.map(l => l.check + ":" + l.status).join(",") || "-"} outcomes=${res.outcomes.length}`);
}
console.log(fails ? `${fails} rounds where the engine result disagrees with the answer key` : "all rounds consistent with the engine");
