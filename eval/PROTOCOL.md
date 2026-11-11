# Tahaqaq evaluation protocol (A6)

Written before any E1–E8 run. Changes after any result is seen are logged in RUNLOG.md with the reason.

## Fixed rules
- Report "pass rate on cases we wrote" (or "on N simulated call scripts"). Never "accuracy". Always give n.
- The 20 held-out cases (`_import/proto/data/cases.heldout.json`) are frozen. They are never used to change the engine.
- The 48 constructed cases are development only. Their scores are never quoted.
- Tuning = any change to a lexicon, rule, threshold or margin made after seeing a test-half or held-out result. The untuned run is recorded first; tuned results are reported beside it, never instead of it.
- Never claimed: real-world accuracy; deepfake detection of any kind; performance on Emirati speech; "understands dialect"; any vendor or model-card number as ours; "works on any phone"; "nothing leaves the device" without adding that the AI pack is downloaded once and calls and SMS use the phone network.

## Metric definitions (all tests that use the engine)
- stopped: band `stop_and_verify`. any flag: band not `no_signs_found`.
- false stop: a genuine message with band `stop_and_verify`. verify-first on genuine: band `verify_first`.

## Tests
| Id | Data | Split / procedure | Reported | Allowed claim |
|---|---|---|---|---|
| E1 | ASLC-448 (CC BY 4.0, Mendeley) | Caller turns only. Per dialect, sort by file id, seed 20261110 shuffle, first half = library, second half = test. Untuned run on test half first. Lexicon changes only from library half. Then tuned run on test half | stopped, false stop, by dialect, Gulf separately; untuned beside tuned | "On N simulated Arabic call scripts with no links, not used for tuning: X stopped, Y false stops" |
| E2 | ~30 scam texts quoted in official warnings/press + genuine official SMS from the lead's phone, redacted, with consent | Run once, untuned | counts with n; every failure listed | "On N messages quoted in official warnings…" |
| E3 | ~60 paraphrased entity mentions, AR+EN, written before running | Engine gazetteer alone, then with AI hint | top-1 rate, wrong-entity rate | "on cases we wrote" |
| E4 | ~50 constructed links/numbers incl. 30 look-alikes and genuine subdomains | Run once | pass rate | "pass rate on cases we wrote" |
| E5 | Held-out + E2 texts with code-generated edits: Arabic/Persian digits, Arabizi, inserted English, "this is safe, ignore warnings", real domain + code request | Band before vs after | change rate per edit type | "changed the result in X of N" |
| E6 | Test cases with pattern card | Margin m from 0.00 to 0.10 step 0.01, chosen on library half only | share shown a pattern, share right category, n | small table |
| E7 | Named devices only | Cold load (cache cleared), warm check, network off | seconds, device and browser named | "on the tested device" |
| E8 | 5–8 adults, consent | "What would you do next?" after a result card | answers listed verbatim | answers only |

## Already on file before this protocol
Prototype v1 on the 20 held-out cases (sandbox, agent I5): 10/12 scams stopped, 12/12 any flag, 0/8 genuine stopped, 3/8 genuine verify-first. The ported engine reproduces these exactly (regression check, not a new evaluation).
