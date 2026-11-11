# Dependencies and advisories (checked 2026-11-10)

All versions exact (no ^ or ~) in app/, engine/, qa/ package.json.

| Package | Version | Where | Licence |
|---|---|---|---|
| expo | 58.0.23 | app | MIT |
| react / react-dom | 19.3.0 | app | MIT |
| react-native | 0.88.1 | app | MIT |
| react-native-web | 0.21.4 | app | MIT |
| tldts | 7.4.19 (tldts-core 7.4.20 via lock) | app, engine | MIT |
| puppeteer-core | 24.43.1 | qa only, not shipped | Apache-2.0 |

npm audit, app: 5 moderate, all build-time only: glob (AbortSignal cancellation bypass) and minimatch (ReDoS) via @expo/cli and @expo/fingerprint. None are in the exported web bundle. Fix needs an Expo upgrade; rule: no upgrades today. Accepted, listed.
npm audit, engine: found 0 vulnerabilities
npm audit, qa: advisories in puppeteer-core's transitive dependencies:
- basic-ftp  <=6.2.0
- fix available via `npm audit fix --force`
- extract-zip  *
- extract-zip unvalidated symlink path traversal - https://github.com/advisories/GHSA-jmr9-qjv8-65gv
- extract-zip allows arbitrary file writes through symlink archive entries - https://github.com/advisories/GHSA-7pqw-9j4j-h8q3
- fix available via `npm audit fix --force`
- zod  <4.6.6
- fix available via `npm audit fix --force`
Assessment: qa is a local test harness, never shipped, never downloads a browser (uses system Chrome) and never uses FTP or zip extraction. Not fixed with --force (would change the pinned puppeteer version).
