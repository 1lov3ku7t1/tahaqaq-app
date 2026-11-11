# Tahaqaq (تحقّق)

Arabic and English web app for checking a message that asks you for something. It quotes the pushy phrases, compares the claim with official records, and points to one way to verify: call a number the sender does not control. It never says a message is safe and never gives a score.

Not affiliated with or endorsed by any government body. Student prototype.

## Open it on a phone
https://1lov3ku7t1.github.io/tahaqaq-app/ (QR code: `qr-tahaqaq.png`). After the first visit it works with no internet. iPhone: Safari, Share, Add to Home Screen. Android: Chrome menu, Install app.

## How it decides
Rules and dated official records decide every result line. The optional on-device AI pack only suggests which entity or announcement a message is about. It never sets a result.

## Run it
```bash
cd app && npm install && npx expo export -p web && node serve.mjs dist 8080
# hosted build under a sub-path: BASE_URL=/tahaqaq-app npx expo export -p web --output-dir dist-pages
```
Open http://127.0.0.1:8080 (phone-width window looks best). Works offline.

## Checks
```bash
node --no-warnings engine/test.ts   # engine unit checks + regression on the test cases
node qa/audit.mjs                   # wording and source rules
node --no-warnings practice/playtest.ts
```

## Status, honestly
- Registry, red-line and reporting-route rows are not yet approved, so records lines show "unknown" and no official numbers are offered.
- Announcements are a dated snapshot of Abu Dhabi Media Office RSS feeds (2026-11-10).
- Not connected: AI pack model files, official fee list, Content Credentials reader, deepfake video model.
- Practice rounds use only sourced warnings, each with its link and date. The sample messages are written for testing; no one received them.
- Results on our own test cases are pass rates, not accuracy. See `eval/`.
