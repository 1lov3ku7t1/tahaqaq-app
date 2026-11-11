// node --no-warnings test.ts   — unit checks + regression summary on the prototype cases.
// The regression uses _import/proto/data/registry.sample.json ONLY as a dev fixture (never shipped).
// Held-out cases are frozen: this prints their summary; nobody tunes against it (rule 5).
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { analyze, shipOnly, numberType, uaeNsn, STATUS, OUTCOMES, LABELS, type Data, type RegistryRow } from "./engine.ts";

const j = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const real: Data = { registry: j("../data/registry.json"), redlines: j("../data/redlines.json"), numbering: j("../data/numbering.json"), announcements: j("../data/announcements.json") };
const allRed = { rules: real.redlines.rules.map((r: any) => ({ ...r, approved_by_lead: true })) };

// --- fixture registry: prototype sample adapted to the new schema (dev only) ---
const sample = j("../_import/proto/data/registry.sample.json");
const fixture: Data = { ...real, redlines: allRed,
  registry: { entities: sample.entities.map((e: any): RegistryRow => ({ id: e.id, names_en: e.names, names_ar: [], aliases: [], domains: e.domains, phones: [],
    portal_url: "", source_url: "https://example.invalid/fixture", source_title: "dev fixture", retrieved: "2026-11-10", approved_by_lead: true })) } };

// ---------- unit checks ----------
const fam = { saved: [{ name: "Ahmed", tel: "+971509999999" }], helper: { name: "Sara", tel: "+971501111111" } };
// shipOnly drops unapproved rows
assert.equal(shipOnly(real).registry.entities.length, real.registry.entities.filter((e: any) => e.approved_by_lead).length);
// numbering
const ty = (n: string) => numberType(uaeNsn(n)!, real.numbering.ranges);
assert.equal(ty("+971 55 123 4567")?.type, "MOBILE");
assert.equal(ty("800 511")?.tariff, "TOLL_FREE");
assert.equal(ty("600 599999")?.type, "UAN");
assert.equal(ty("+971 900 212345")?.tariff, "PREMIUM_RATE");
assert.equal(ty("1200"), null); // an amount is not a number
// look-alike, shortener, punycode, wrong domain for claimed entity
const src = (t: string) => analyze({ text: t }, fixture).lines.filter(l => l.check === "source").map(l => l.status);
assert.deepEqual(src("Dubai Police fine: pay at dubaipolice-fines.com now"), ["mismatch"]);
assert.deepEqual(src("pay at bit.ly/abc"), ["mismatch"]);
assert.deepEqual(src("visit xn--mohr-9ra.ae to pay"), ["mismatch"]);
assert.deepEqual(src("RTA: renew at https://rta.ae/services"), ["match"]);
assert.deepEqual(src("see https://example.gov.ae"), ["unknown"]);
// official claim + mobile number
assert.ok(analyze({ text: "Ministry of interior: call 0551234567 to avoid arrest" }, fixture).reasons.includes("official_on_mobile_or_premium"));
// taps path, family + new number
const r1 = analyze({ taps: { who: "family", wants: ["money"], pressure: ["urgency"], via: "voice_note" } }, fixture, { ...fam, senderIs: "new" });
assert.equal(r1.input, "taps"); assert.equal(r1.band, "stop_and_verify");
assert.ok(r1.asks.every(a => a.fromTaps));
assert.equal(r1.lines.find(l => l.check === "family")?.status, "mismatch");
assert.ok(r1.lines.some(l => l.check === "content" && l.state === "not_connected"));
assert.deepEqual(r1.verify.map(v => v.kind), ["family", "helper"]);
assert.ok(r1.verify.every(v => /^\+?\d+$/.test(v.tel)));
// saved number is never a pass
const r2 = analyze({ taps: { who: "family", wants: ["money"], pressure: [] } }, fixture, { ...fam, senderIs: "saved" });
assert.equal(r2.lines.find(l => l.check === "family")?.status, "unknown");
assert.notEqual(r2.band, "no_signs_found");
// AI hint for an unknown entity is ignored; a hint never sets a status alone
const r3 = analyze({ text: "hello" }, fixture, fam, { entityId: "NOPE" });
assert.ok(!r3.reasons.includes("entity_from_ai_hint")); assert.equal(r3.lines.length, 0);
// forward ask -> do-not-forward outcome
assert.ok(analyze({ taps: { who: "official", wants: ["forward"], pressure: [], via: "video" } }, fixture).outcomes.includes("not_confirmed_do_not_forward"));
// rule 2: banned words in any engine wording
const engineSrc = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
const strings = [...Object.values(STATUS), ...Object.values(OUTCOMES), ...Object.values(LABELS)].flatMap(t => [t.en, t.ar]).join(" ") +
  (engineSrc.match(/`[^`]*`|"[^"]{8,}"/g) || []).join(" ");
const banned = strings.match(/\b(safe|real|genuine|fake|legit(imate)?|percent|score|confidence)\b|%|آمن|حقيقي|موثوق|نسبة/gi);
assert.equal(banned, null, "banned words: " + banned);
console.log("unit checks: OK");

// ---------- regression summary (same format as prototype eval.ts) ----------
for (const f of ["cases.heldout.json", "cases.constructed.json"]) {
  const cases: any[] = j("../_import/proto/data/" + f).cases;
  const res = cases.map(c => ({ ...c, band: analyze({ text: c.text }, fixture, { saved: [{ name: "x", tel: "0509999999" }] }).band }));
  const n = (lab: string, b?: string) => res.filter(r => r.label === lab && (!b || r.band === b)).length;
  const sc = n("scam"), lg = n("legit");
  console.log(`\n${f}: ${cases.length} | scam ${sc} | legit ${lg}` + (f.includes("constructed") ? "   (development set: never quoted)" : ""));
  console.log(`scam  -> stop_and_verify : ${n("scam", "stop_and_verify")}/${sc}`);
  console.log(`scam  -> any flag        : ${sc - n("scam", "no_signs_found")}/${sc}`);
  console.log(`legit -> stop_and_verify : ${n("legit", "stop_and_verify")}/${lg}`);
  console.log(`legit -> verify_first    : ${n("legit", "verify_first")}/${lg}`);
  if (f.includes("heldout")) for (const r of res) if ((r.label === "scam" && r.band !== "stop_and_verify") || (r.label === "legit" && r.band === "stop_and_verify")) console.log(` fail ${r.id} [${r.label}->${r.band}]`);
}
