# QA ledger (A7, A8)

Only checks that were actually run are listed. "Not run" means nobody has done it yet.

| When (2026-11-10) | Check | Where | Result |
|---|---|---|---|
| 14:50 | Static export | macOS laptop, `npx expo export -p web` | exit 0; `dist/` 42 MB incl. embed-worker.js, transformers.min.js, ort/ (4 files) |
| 14:50 | Offline walk, 11 screens AR + EN | macOS, headless system Chrome via `node qa/shoot.mjs`; every non-local host blocked | 0 requests left the machine; 0 page errors; load about 730 ms; shots in `qa/shots/` |
| 14:50 | AI pack failure path (no model files) | same run | Result tag "AI match unavailable, rules only"; Set-up shows "AI pack files not installed" |
| 14:50 | Rules audit | `node qa/audit.mjs` | 0 hits over 40 files; probe file with "safe" made it fail (exit 1), probe removed |
| 14:50 | Engine unit checks | `node --no-warnings engine/test.ts` | unit checks OK |
| 14:44 | Practice play-test | `node --no-warnings practice/playtest.ts` | 11/12 consistent; R03 known miss (title only) |
| 14:51 | Content Credentials reader | — | cut by lead (cut-list item 2); shown as "not connected" |
| 2026-11-11 | Real browser through the real server (127.0.0.1:8080), phone size 375x812, Arabic | Claude desktop browser pane | Home, paste, result, family flow with a saved test number all work; Call button shows "Call Test Aunt" (test number, not a real one); no console errors. Found and fixed: server sent pages without a web-page type (browser downloaded them), missing files answered 200 instead of 404. |
| 2026-11-11 | Offline walk after redesign | `node qa/shoot.mjs` | 0 requests left the machine; 0 page errors; 12 shots |
| 2026-11-11 | Rules audit and unit checks after redesign | `node qa/audit.mjs`, `node engine/test.ts` | 0 hits; unit OK |

## Not run yet
- AI pack load and embed with real model files (waiting for H2).
- `tel:` and `sms:` buttons on a real phone (waiting for H9).
- Device matrix (phones, tablets, Safari).
- Screen recording.
- Untuned E1 on ASLC (waiting for H1); E2–E6.
