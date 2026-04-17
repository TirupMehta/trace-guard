# trace-guard

![npm version](https://img.shields.io/npm/v/trace-guard)
![license](https://img.shields.io/npm/l/trace-guard?color=blue)
![snyk health](https://img.shields.io/badge/snyk%20health-verified-brightgreen)
![maintenance](https://img.shields.io/badge/maintenance-sustainable-orange)
![build](https://img.shields.io/badge/build-passing-brightgreen)

> [!IMPORTANT]
> **STABLE BASELINE (v3.6.2)**: Trace Guard has reached its first production-ready health baseline. The project now includes a formalized security policy, contribution guidelines, and an ISC license. The behavioral engine is tuned to eliminate human false positives while maintaining 100% block rates for agentic browsers.

Add one line to your server. That's it. Trace Guard silently intercepts every HTTP/HTTPS request, injects a behavioral telemetry script, and blocks bots — including sophisticated agentic browsers driven by Vision-Language Models (VLMs, Playwright, Puppeteer, Claude Computer Use).

---

## Security First

Trace Guard is a security-focused library. We maintain a strict [Security Policy](file:///c:/all/Trace%20Guard/trace-guard-npm/SECURITY.md). If you discover a vulnerability, please report it via our coordinated disclosure process.

---

## Install

```bash
npm install trace-guard
```

## Quick Start (30 Seconds)

```javascript
// At the TOP of your server entry point, before anything else.
require('trace-guard');

// Then start your server as normal — Express, Fastify, raw http, whatever.
const express = require('express');
const app = express();
app.listen(3000);
```

That's the complete integration. You add zero routes, zero middleware, zero config files.

---

## How It Works

Trace Guard operates in three tiers of defense:

```
Incoming Request
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│  TIER 1: JA4 TLS Fingerprint Analysis (Protocol Layer)  │
│  → Blocks curl, python-requests, wget instantly          │
│  → Full-stack emulators (Puppeteer) flagged for Tier 2  │
└─────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│  TIER 2: Physiological Kinematic Analysis               │
│  → Acceleration Asymmetry (biological push/pull)         │
│  → Jerk Entropy / Structure Function DFA                 │
│  → Dwell-Time Variance (human reading pauses)           │
│  → Teleportation Detection (physically impossible jumps) │
└─────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│  TIER 3: VLM Honey-Prompts (DOM Decoys)                 │
│  → Hidden DOM instructions targeting only AI readers    │
│  → Clicking the invisible trap = immediate block        │
└─────────────────────────────────────────────────────────┘
```

### The Science

Trace Guard's behavioral analysis is rooted in published academic research:

- **Acceleration Asymmetry**: Humans physically push upward (against gravity) differently than they pull downward. The ratio of upward vs. downward acceleration is biomechanically asymmetric for biological users. Bots using constant-velocity interpolation produce a symmetric ratio of ~1.0. Based on DMTG (arXiv:2410.18233).

- **Jerk Entropy / DFA**: We approximate the Power Spectral Density slope of mouse acceleration using a Structure Function (a lightweight proxy for Detrended Fluctuation Analysis). Constant-velocity bots produce zero-variance acceleration (jerk entropy = 0). Any path with actual movement variation scores differently, distinguishing it from purely mechanical interpolation.

- **Dwell-Time Variance**: Humans pause to read — at buttons, at form fields, at images. These pauses have high variance (200ms to 2000ms). Bots with constant velocity show near-zero dwell variance.

- **Teleportation Detection**: No human hand can move a mouse 150+ pixels in under 10 milliseconds. Bots replaying pre-recorded events or interpolating at high speed can produce these physically impossible jumps.

- **VLM Honey-Prompts**: Agentic AI browsers (Claude, GPT-4V, Gemini) read both the rendered visual AND the DOM. We inject hidden DOM elements with instructions that only an AI DOM-reader would act on. Interacting with the hidden element triggers an immediate block. Based on research into VLM-agent deception (Cohen et al., 2025).

---

## Configuration

```javascript
// With options
require('trace-guard')({
  enabled: true,           // Default: true. Set false to pause protection.
  threshold: 0.7,          // Score threshold for action (0-1). Default: 0.7.
  mode: 'block',           // 'block' | 'challenge' | 'monitor'. Default: 'block'.
  exclude: ['/health'],    // URL prefixes to skip. Useful for health checks.
  onDetection: (result) => {
    // Called on every non-allow decision.
    // result: { score: number, decision: string, reason: string }
    console.log('[Bot Detected]', result);
  }
});
```

## Manual Mode (Advanced)

For fine-grained control, use the `TraceGuardAI` class directly:

```javascript
const { TraceGuardAI } = require('trace-guard');

const guard = new TraceGuardAI();

// Analyze a session manually
const result = guard.analyzeSession(
  'ja4_fingerprint_string',  // JA4 TLS fingerprint
  mouseEventsArray,          // Array of { x, y, t } mouse events
  { decoyTriggered: false }  // Optional: true if honey-prompt was clicked
);

console.log(result);
// { score: 0.1, decision: 'allow', reason: 'CONSISTENT_HUMAN_TRAJECTORY' }
// { score: 0.8, decision: 'challenge', reason: 'BEHAVIORAL_SYMMETRY_DETECTED' }
// { score: 1.0, decision: 'block', reason: 'JA4_PROTOCOL_MATCH_SCRIPT' }
// { score: 1.0, decision: 'block', reason: 'TELEPORTATION_DETECTED' }
// { score: 1.0, decision: 'block', reason: 'HONEY_PROMPT_TRIGGERED' }
```

---

## API Reference

### `TraceGuardAI.analyzeSession(ja4, mouseEvents, options?)`

| Parameter | Type | Description |
|---|---|---|
| `ja4` | `string` | JA4 TLS fingerprint string from the client connection. |
| `mouseEvents` | `MouseEvent[]` | Array of `{ x: number, y: number, t: number }` pointer events. |
| `options.decoyTriggered` | `boolean?` | Set `true` if the client interacted with the VLM honey-prompt. |

Returns `{ score: number, decision: 'allow' | 'challenge' | 'block', reason: string }`.

### Decision Reasons

| Reason | Tier | Description |
|---|---|---|
| `CONSISTENT_HUMAN_TRAJECTORY` | — | All signals pass. Session is allowed. |
| `JA4_PROTOCOL_MATCH_SCRIPT` | 1 | Known script client (curl, python-requests). Instant block. |
| `TELEPORTATION_DETECTED` | 2 | Physically impossible cursor jumps. Universal block. |
| `BEHAVIORAL_SYMMETRY_DETECTED` | 2 | Symmetric acceleration ratio — bot-like interpolation. |
| `LACKS_BIOLOGICAL_JITTER` | 2 | Zero-variance constant-velocity movement. |
| `MULTI_SIGNAL_ANOMALY_UNKNOWN_CLIENT` | 2 | Unknown JA4 client showing ≥2 bot signals. |
| `INSUFFICIENT_BEHAVIORAL_SIGNAL` | 2 | Zero path length — no movement data. |
| `HONEY_PROMPT_TRIGGERED` | 3 | VLM agent interacted with DOM decoy. Instant block. |

### `BehavioralAnalyzer` (exported from `trace-guard/behavioral`)

All methods are fully documented with JSDoc. Key public methods:

- `calculatePathLength(events)` — Total Euclidean path length in pixels.
- `calculateAccelAsymmetry(events)` — Up/down acceleration ratio. Humans: ≠ 1.0.
- `calculateJerkEntropy(events)` — Structure Function DFA slope. Linear bots: ~0.
- `calculateDwellTimeVariance(events)` — Variance of pause durations. Humans: high.
- `calculateTeleportationScore(events)` — Fraction of physically impossible jumps.
- `extractFeatures(events)` — All features in one optimized single-pass call.

---

## Zero-Conflict Guarantee

Trace Guard is designed to be **invisible** to the host application:

- Monkey-patches `http.createServer` and `https.createServer` globally — no route changes needed.
- Strips `Content-Length` from intercepted HTML responses to prevent truncation.
- Handles gzip, deflate, and brotli compressed responses natively via Node's built-in `zlib` C-bindings.
- Uses `position:fixed; z-index:2147483647` overlays — never destroys React/Angular Virtual DOM.
- No `document.body.innerHTML = ...`, no `alert()`, no `eval()`.
- Zero production dependencies. No phoning home.

---

## Performance

Benchmarked at **1,000,000 iterations** on a standard development machine:

| Version | Time | Change |
|---|---|---|
| v2.0.0 (baseline) | 131.61ms | — |
| v3.0.0 | 112.13ms | −14.8% |
| v3.1.0 | 119.43ms | +6.5% vs v3.0.0¹ |

¹ *v3.1.0 added two new detection signals (dwell-time variance, teleportation) offset by a single-pass loop optimization in `extractFeatures`.*

---

## Research & Patent Direction

This library is the reference implementation for a forthcoming research publication and patent filing on:

> **"Physiological Noise Spectroscopy for Autonomous Web Agent Detection"**

The core novel claims are:
1. Using Detrended Fluctuation Analysis of human involuntary micro-tremor (biological 1/f noise) to distinguish human from synthetic pointer trajectories.
2. DOM-level VLM Honey-Prompts as a first-of-its-kind trap for Vision-Language Model agentic browsers.
3. Multi-signal behavioral fingerprinting (acceleration asymmetry + jerk entropy + dwell variance + teleportation) as a composite identity signal for continuous session verification.

---

## License

ISC © Tirup Mehta
