# Security Policy

## Supported Versions

Only the latest stable release of Trace Guard is actively maintained for security updates.

| Version | Supported          |
| ------- | ------------------ |
| 3.x.x   | :white_check_mark: |
| < 3.0.0 | :x:                |

## Reporting a Vulnerability

As Trace Guard is a security tool, we take vulnerability reports seriously. If you find a security issue, please do NOT create a public issue.

Email your discovery to **contact@tirup.in** with the subject line `[SECURITY] trace-guard`. You can expect a response within 48 hours.

We follow a coordinated disclosure policy (responsible disclosure). Once a patch is released, we will credit you in the official security release notes in `CHANGELOG.md`.

## Scope

The following are considered in scope:
- Code execution vulnerabilities inside the detection engine
- Bypass techniques that allow bots to evade detection without triggering any signal
- Prototype pollution or supply chain attack vectors introduced by the hook mechanism

The following are **not** in scope:
- False positive rates (these are tuning issues, not security vulnerabilities)
- Performance degradation on legitimate high-traffic endpoints
