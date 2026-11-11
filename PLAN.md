# Tahaqaq build plan (Chef, C1)

Clock start: 2026-11-10 14:17 (+04). Gate 2:00 = 16:17. Freeze 4:15 = 18:32. End 5:30 = 19:47.
Repo: `tahaqaq/` (placeholder in the brief was empty; Chef default).
Inputs unpacked to `tahaqaq/_import/` (read-only; agents copy from it, never edit it).

Chef note on models: the lead declined subagent spawns, so all roles (C1, C2, A1–A8) run inline in the lead session (Opus 5.5), labelled by role. Earlier note: C1 and C2 run in the lead session, not as separate Fable and Haiku
workers. Reason: the plan needs the full Tahaqaq.md and zip context already loaded; a cold worker
would re-read all of it. Working agents keep their assigned models.

## Goal

A bilingual, offline, rules-decided Tahaqaq web build on the demo laptop that passes the must-work
list (a)–(h) and every hard product rule, with honest labels on everything not connected.

## Done when

- [ ] (a) Paste or taps → claim card in Arabic and English; rules only; works with network off.
- [ ] (b) Source line from `registry.json`, showing source URL and date; only human-approved rows ship.
- [ ] (c) Red-line line with its source URL and date.
- [ ] (d) Verify by `tel:` only → outcome → reporting routes from u.ae with the page date.
- [ ] (e) Announcement line from the dated snapshot, date shown, "Abu Dhabi only" stated.
- [ ] (f) 12 practice rounds, each built from a quoted official warning with its source.
- [ ] (g) Sources screen: every record, publisher, licence status, date; "not affiliated with any government body".
- [ ] (h) Static web export opens from a local server on the demo laptop with Wi-Fi off.
- [ ] Rule 2 audit by A8: zero hits for safe/real/genuine/آمن/حقيقي/موثوق/percent/score in UI strings and results.
- [ ] Rule 3: no reply-in-chat path; saved number never shown as reassurance.
- [ ] Rule 5: `eval/PROTOCOL.md` timestamp earlier than the first run; untuned beside tuned; "pass rate on our cases".
- [ ] Rule 6: fee list, Content Credentials (unless working), detector show "not connected"; samples say "sample".
- [ ] Rule 7 (no event or affiliation material in any file): `node qa/audit.mjs` passes.
- [ ] Rule 8: every dependency pinned to an exact version; advisory check recorded in `qa/deps.md`.
- [ ] A7 ledger `qa/LEDGER.md`: real / sample / not connected, per feature, per device actually run.

## Contracts fixed by Chef (so A1, A2, A3, A4 can start in parallel)

- Engine entry: `analyze(input: {text?: string; taps?: Taps}, data: {registry, redlines, numbering, announcements}, family: {saved: FamilyContact[]; senderIs?: "saved" | "new" | "not_sure"}) => CheckResult`. A2 owns the exact type; it publishes `engine/types.ts` first and A1 imports only from there.
- `RecordLine.status` stays `"mismatch" | "match" | "unknown"`. Every line carries `source: {url, title, retrieved}`. User text for the three states is fixed: "Does not match official record" / "Matches official record (the request can still be a scam)" / "Not in official sources (unknown)".
- `Band` stays internal. UI headline for `no_signs_found` is "No warning signs found in the words. Still call before you act." Never a pass.
- AI pack output enters the engine only as an optional `entityHint` / `announcementHint` / `patternId`; the engine re-checks every hint against the record. A hint never changes `status` on its own.
- Registry row (A4 owns `data/registry.schema.json`): `{id, names_ar[], names_en[], aliases[], domains[], phones[{e164, kind}], portal_url, source_url, source_title, retrieved, approved_by_lead: boolean, notes}`. Loader ships only rows with `approved_by_lead: true` and a non-empty `source_url` that is the entity's own page.

## Steps

Wave 1 starts now (no human input needed). Later waves follow the hour table in Tahaqaq.md §8.

| # | Work | Agent | Skills | Depends on | Check that proves done | Risk |
|---|---|---|---|---|---|---|
| 1 | Registry schema; import the six u.ae rows as `approved_by_lead:false` (source is the directory, not the entity page); red-line and routes files as skeletons with only source-backed rows from Tahaqaq.md §2/§7; missing-data list | A4 | engineering:documentation | — | `node data/validate.mjs` prints row counts and 0 schema errors; every row has source_url+retrieved | .ae sites unreachable from agents → rows wait for H5 |
| 2 | Test protocol E1–E8 written and timestamped before any run | A6 | engineering:testing-strategy, verification-before-completion | — | `eval/PROTOCOL.md` exists; file mtime logged in `eval/RUNLOG.md` | Protocol edited after results |
| 3 | Port engine.ts to `/engine`; tap input; saved/new/not-sure; publish `engine/types.ts`; held-out and constructed runs reproduce prototype numbers before any change | A2 | karpathy-guidelines, engineering:testing-strategy | Chef contract | `node engine/test.ts` passes; held-out summary equals `_import/proto/results/v1_heldout_summary.txt` | Silent behaviour change in port |
| 4 | Expo 58 app in `/app`, exact versions copied from the working `check-this` project; imports `engine/types.ts`; web export builds | A1 | frontend-design, ui-ux-pro-max | 3 (types) | `npx expo export -p web` exits 0; `dist/` lists index.html | Metro cannot import from `../engine` → copy step |
| 5 | Static copy-through: `public/` files (worker, data JSON) appear in `dist/` | A7 | webapp-testing, deploy-checklist | 4 | `ls dist/` shows test file | — |
| 6 | Dependency pin + advisory check | A8 | engineering:code-review | 4 | `npm audit` output saved to `qa/deps.md` | — |
| 7 | Worker drop-in from `_import/proto/browser_check/worker.js`; transformers 4.3.2 + ORT wasm into `app/public/`; size check script for the model file; "AI match unavailable, rules only" path | A3 | engineering:debug, webapp-testing | 4; model files from H2 for the load test | Failure path shown in browser with model absent; size check prints 118,308,185 when H2 lands | iOS Safari memory |
| 8 | Verify buttons (`tel:`, `sms:` only), close outcomes incl. "do not forward", helper call | A5 | design:ux-copy | 3, 4 | Grep shows no `wa.me`/`whatsapp:` URL; buttons render from engine output | Laptop `tel:` no-op → show on phone |
| 9 | **Gate 2:00**: Input + Result render live engine output in AR and EN | A1, review A8 | — | 3, 4 | Screenshot of AR + EN result for held-out case; A8 sign-off | Miss → A3 pairs with A1 |
| 10 | Layered source check, number type (numbering.json from the libphonenumber CSV), red lines in engine | A2 | as 3 | 1, 3 | Unit cases for look-alike, punycode, 600/800/900/mobile | — |
| 11 | ASLC conversion + untuned E1 run recorded | A6 | as 2 | 2, H1 | `eval/RUNLOG.md` untuned entry before any lexicon change | H1 late → E1 slides |
| 12 | ~25 approved entities; red lines; u.ae routes; announcement snapshot | A4 | as 1 | 1, H3, H4, H5 | validator: approved count, 0 errors | Human approval bottleneck |
| 13 | Entity resolution, announcement match, pattern margin, 15 s timeout, phone gating | A3 | as 7 | 7, 12, H2 | E3 table; timeout path screenshot | Cut list items 3–4 |
| 14 | Verify/Close/Set-up screens; then Sources + "not connected" labels | A1 | ux-copy, accessibility-review | 8, 12 | Screens render; labels visible | — |
| 15 | Content Credentials reader, 60-minute hard timebox | A7 | webapp-testing | 4 | Works on one signed file, or cut and labelled "not connected" | Cut list item 2 |
| 16 | 12 practice rounds from quoted official warnings | A5 | ux-copy | 3, 12 | Each round has source URL; play-test log vs engine | No sourced examples → fewer rounds, flagged |
| 17 | E2–E6 runs; final tables untuned beside tuned | A6 | as 2 | 10, 11, 13 | `eval/TABLES.md` | — |
| 18 | Device matrix; offline build; screen recording | A7 | webapp-testing, deploy-checklist | 14 | Ledger rows only for devices actually run | — |
| 19 | **Freeze 4:15** review + rules audit (2, 3, 6, 7, AI-influence) | A8 | code-review, verification-before-completion | all | Audit report with grep outputs | — |
| 20 | Fixes only; evidence text; Sources text; ledger | A2, A6, A4, A7 | — | 19 | Final `qa/LEDGER.md` | — |

## Human tasks (H) and when each is needed

| # | Task | Needed by |
|---|---|---|
| H1 | Download ASLC-448 from Mendeley; put the folder in `tahaqaq/_inbox/aslc/` | 1:00 (step 11, untuned run before 2:00) |
| H2 | Download `Xenova/multilingual-e5-small` (config, tokenizer files, `onnx/model_quantized.onnx`) into `tahaqaq/_inbox/e5/` | 1:30 (step 7 load test, step 13) |
| H3 | Dubai Pulse logged out: try the notary-fees CSV; submit access requests for fee list and entity register; send me the date | 2:00 (Sources text) |
| H4 | Save Abu Dhabi Media Office feeds (Government Affairs, Security, Economy; Arabic if they exist) as files in `tahaqaq/_inbox/feeds/` | 2:30 (announcement snapshot, step 12) |
| H5 | Open each entity's contact page; approve rows in `data/registry.review.md` (A4 prepares the list) | rolling, all approved by 3:30 |
| H6 | WhatsApp "Transcribe" on an Arabic voice note: one Android, one iPhone; reply yes/no per phone | 3:00 (input screen wording) |
| H7 | Ask organisers in writing which AI services we may use | before demo |
| H8 | Try to open AEDA-POL-007 on the regulator's own site | 3:15 (Sources text) |
| H9 | Phone for the `tel:` demo and device matrix (Android Chrome, iOS Safari) | 3:00 |

## Open questions (none block wave 1)

1. Clock start and repo path were placeholders. Chef used 14:17 and `tahaqaq/`. Correct me if wrong.
2. The six u.ae rows cite the directory, not each entity's own page, and three have no website. Rule 4 means none ship until H5. Until then the source line shows "Not in official sources (unknown)" for every entity. Confirm that is acceptable for the 2:00 gate (gate only needs live engine output, not approved rows).
3. Prototype band `no_signs_found`: Chef wording above. Approve or change.
4. 12 practice rounds need 12 sourced official-warning messages. If fewer are found, ship fewer and say so, or allow "sample" rounds labelled as constructed?

## Status (Dispatcher) — 0:33 (14:50)

| # | Step | Agent | Status | Evidence |
|---|---|---|---|---|
| 1 | Schema + data skeleton | A4 | done | `node data/validate.mjs`: 6/4/7 rows, 0 approved, 0 errors |
| 2 | Test protocol | A6 | done | `eval/RUNLOG.md` sha256 f187422b… at 10:27Z |
| 3 | Engine port + contract | A2 | done | `node engine/test.ts`: unit OK; held-out 10/12, 12/12, 0/8, 3/8 = prototype |
| 4 | Expo app, pinned | A1 | done | `npx expo export -p web` → dist/ |
| 5 | public/ copy-through | A7 | done | `ls app/dist` shows embed-worker.js, transformers.min.js, ort/ (4 files); dist 42 MB |
| 6 | Deps + advisories | A8 | done | `qa/deps.md` |
| 7 | Worker drop-in | A3 | done except load test (waiting for H2 model files) | `worker/build.mjs`; failure path on screen: "AI match unavailable, rules only" + "AI pack files not installed" (shots 03, 08) |
| 8 | Verify buttons tel:/sms: | A5 | done | Result screen; no WhatsApp URL anywhere |
| 9 | Gate 2:00 | A1 | passed at about 0:20 (self-check, not an independent review) | `qa/shots/02,03,04,06`; 0 external requests, 0 page errors |
| 10 | Layered source + number type | A2 | done early | unit checks: look-alike, shortener, punycode, gov.ae, 600/800/900/mobile |
| 11 | ASLC untuned run | A6 | waiting for human (H1) | — |
| 12 | Records | A4 | announcements done (120 items, 5 Abu Dhabi feeds, snapshot 2026-11-10); registry/red lines/routes waiting for human (H5) | `data/feeds/`, `data/registry.review.md` |
| 13 | AI client | A3 | code done: HEAD check, 15 s timeout, off by default on phones, margin rule (provisional 0.85 / 0.03, to be set by E3/E6); hints only, engine re-checks | `app/src/ai.ts`; not run with a model yet (H2) |
| 14 | Verify/Close/Set-up/Sources | A1 | done; Sources bilingual; AI toggle + status in Set-up, AI tag on Result | shots 03, 05, 07, 08 |
| 16 | 12 practice rounds | A5 | done, sourced only: 6 verbatim texts (5 cross-checked in page HTML), 3 scenarios from warnings without text, 3 official feed items | `node --no-warnings practice/playtest.ts`: 11/12 consistent; R03 known miss; shots 09–11 |
| 19 (part) | Rules audit script | A8 | `node qa/audit.mjs`: 0 hits over 40 files; probe with a banned word fails it as expected | `qa/audit.mjs` |
| 15 | Content Credentials reader | A7 | cut by lead at 0:35 (cut-list item 2); stays "not connected" on Sources | lead decision in chat |
| 17, 18, 19 (review), 20 | — | — | pending | — |
