// A8 rules audit: node qa/audit.mjs  (exit 1 on any hit)
// Rule 2: no safe/real/genuine/score/percent wording in anything we show (quoted scam texts and feed titles are excluded: they are not our words).
// Rule 4: every shipped data row has a source URL and a date. Rule 7: no event/team/pitch material in project files.
// Rule 1: the AI client never sets a status and never imports the engine.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const root = decodeURIComponent(new URL("../", import.meta.url).pathname);
const SKIP = /node_modules|\/_import\/|\/vendor\/|\/dist\/|\/public\/|\/shots\/|\/feeds\/|\.git\//;
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return SKIP.test(p + "/") ? [] : statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(root).filter(f => /\.(tsx?|mjs|js|json|md|py)$/.test(f));
const hits = [];
const hit = (f, why, m) => hits.push(`${relative(root, f)}: ${why}: ${m}`);

const BANNED = /\b(safe|real|genuine|legit(imate)?|percent|score|confidence|accuracy)\b|\d\s*%|آمن|حقيقي|موثوق|نسبة/gi;
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
// UI + engine wording: string literals and JSX text in shipped code.
for (const f of files.filter(f => /\/(app\/(App\.tsx|src\/)|engine\/engine\.ts)/.test(f))) {
  const src = stripComments(readFileSync(f, "utf8"));
  const lits = src.match(/'(?:[^'\\\n]|\\.){6,}'|"(?:[^"\\\n]|\\.){6,}"|`[^`]{6,}`|>[^<>{}\n]{6,}</g) || [];
  for (const s of lits.filter(x => !/gradient\(/.test(x))) for (const m of s.match(BANNED) || []) hit(f, "banned word", `${m} in ${s.slice(0, 80)}`);
}
// Data wording we wrote (notes, red-line text, scenarios, names). Quoted message `text` and feed titles are not ours.
const OURS = /^(text_en|text_ar|note_en|note_ar|scenario_en|scenario_ar|check|notes|source_title)$/;
const scan = (f, v, k = "") => {
  if (Array.isArray(v)) return v.forEach(x => scan(f, x, k));
  if (v && typeof v === "object") return Object.entries(v).forEach(([kk, x]) => scan(f, x, kk));
  if (typeof v === "string" && OURS.test(k)) for (const m of v.match(BANNED) || []) hit(f, `banned word in ${k}`, `${m} in ${v.slice(0, 80)}`);
};
for (const f of files.filter(f => /\/data\/[^/]+\.json$/.test(f))) scan(f, JSON.parse(readFileSync(f, "utf8")));

// Rule 4: every row in shipped data carries its own page URL and a date.
for (const [file, key, dateKeys] of [["registry.json", "entities", ["retrieved"]], ["redlines.json", "rules", ["published", "retrieved"]], ["routes.json", "routes", ["page_updated", "retrieved"]], ["practice.json", "rounds", ["published"]]]) {
  const f = join(root, "data", file), rows = JSON.parse(readFileSync(f, "utf8"))[key] || [];
  rows.forEach((r, i) => {
    if (!/^https:\/\//.test(r.source_url || "")) hit(f, "row without source_url", r.id ?? i);
    if (!dateKeys.some(k => /^\d{4}-\d{2}-\d{2}/.test(r[k] || ""))) hit(f, "row without a date", r.id ?? i);
  });
}

// Rule 7: no event, team, prize or pitch material anywhere in our files.
const EVENT = /hackathon|rising stars|challenge 40|\bprize|\bpitch\b|judg(e|ing) panel|our team name/gi;
// Feed titles are third-party news, and this file names the patterns, so both are skipped.
for (const f of files.filter(f => !/audit\.mjs$|announcements\.json$/.test(f))) for (const m of readFileSync(f, "utf8").match(EVENT) || []) hit(f, "event/pitch material", m);
// Rule 7: no claim of government affiliation (the disclaimer "not affiliated" is required and allowed).
for (const f of files.filter(f => /\/app\//.test(f))) for (const m of readFileSync(f, "utf8").replace(/not affiliated with or endorsed by/gi, "").match(/(official|government) app\b|endorsed by|(?<!not )affiliated with/gi) || []) hit(f, "affiliation claim", m);

// Rule 1: AI code proposes hints only.
const ai = stripComments(readFileSync(join(root, "app/src/ai.ts"), "utf8"));
if (/engine\.ts['"]|\banalyze\b/.test(ai.replace(/import type[^\n]*/g, ""))) hit("app/src/ai.ts", "AI client touches the engine", "import/analyze");
if (/\bstatus\s*:\s*['"](mismatch|match|unknown)/.test(ai)) hit("app/src/ai.ts", "AI client sets a status", "status");

console.log(`audited ${files.length} files`);
if (hits.length) { console.log(hits.join("\n")); process.exit(1); }
console.log("rules audit: 0 hits");
