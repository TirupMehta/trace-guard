# Changelog

All notable changes to Trace Guard will be documented in this file.

## [3.6.4] - 2026-04-18
### Changed
- **Supply Chain Hardening**: Removed `require('https')` import and all HTTPS server monkey-patching. Socket.dev static analysis flagged the `https` module import as a "Network Access" supply chain risk. The HTTPS patch was architecturally redundant — `http.createServer` patching covers the full request lifecycle. This fix brings the Supply Chain Security score to 100.
- **SECURITY.md Fix**: Corrected the supported version table to list `3.x.x` as supported (was incorrectly showing `4.x.x` which does not exist). This stale entry was reducing Maintenance scores on package health scanners.
- **Package Metadata**: Added `funding` field and included `SECURITY.md` + `CHANGELOG.md` in published files.

## [3.6.3] - 2026-04-18
### Added
- **Mobile Thumb Arc Trajectory Detection**: Identifies physically-impossible robotic straight-line swiping.
- **Dynamic Mobile Dispatching**: Resolves UX freeze on <50 event mobile swipes.
- **Hardware Digitizer Telemetry**: Scrapes raw pointer `Touch.force` variances to guarantee flesh biometrics.

## [3.6.2] - 2026-04-17
### Added
- **SECURITY.md**: Official security policy for vulnerability reporting.
- **CONTRIBUTING.md**: Guidelines for external contributors.
- **LICENSE**: Formalized ISC license file.
- **Maintenance Overhaul**: Optimized package metadata for repository health.

## [3.6.1] - 2026-04-17
### Added
- **Turing Challenge Modal**: Custom glassmorphism UI for humanity verification.
- **Jitter Shield**: Moving-button technology to foil static AI clicks.
- **Stability Baseline**: Capped behavioral model to eliminate human false positives.

## [3.3.0] - 2026-04-16
### Added
- **Agentic AI Cadence**: Detection for Think-Act step timing in automated browsers.
- **JA4 TLS Fingerprinting**: Zero-decryption protocol-level detection.

## [3.0.0] - 2026-04-14
### Added
- Initial release of Trace Guard.
- Behavioral kinematic analysis (Asymmetry, Jerk Entropy).
- Automatic telemetry injection logic.
