# Run log (append only)

Any later edit to PROTOCOL.md gets a new entry: what changed, and whether results had been seen.

- 2026-11-10T10:27:12Z PROTOCOL.md written. sha256 f187422bb6adf1a90257b610f7c484b3e6df453c73ab0ac8d6ae09103134bba5
- 2026-11-10T10:27:13Z Note: engine/test.ts regression on held-out ran once before this entry (port check only, reproduces prototype v1 exactly: 10/12, 12/12, 0/8, 3/8). No tuning done.
- 2026-11-10T10:43:28Z Practice play-test (practice/playtest.ts), engine UNTUNED: 6 verbatim scam texts R01–R06 → stopped 2/6 (R01, R02), no flag 4/6 (R03 title only, R04, R05, R06). 3 scenarios S07–S09 stopped 3/3. 3 official feed items G10–G12: 0/3 stopped. Decision: practice texts are now DEVELOPMENT data (lexicon may be changed on them). E2 must use different texts. Held-out stays frozen.
- 2026-11-10T10:44:16Z Lexicon change on practice dev texts (settle/unpaid fine, verify details, contact this number, freeze/hold notice, customs; Arabic family-word boundaries fixing a false match inside قايمه; advice red lines no longer shown as record mismatch). After change: practice R01–R06 stopped 5/6 (R03 still no flag); held-out regression unchanged 10/12, 12/12, 0/8, 3/8 (not used to choose the change).
