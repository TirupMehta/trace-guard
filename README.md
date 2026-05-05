# trace-guard

![npm version](https://img.shields.io/npm/v/trace-guard)
![license](https://img.shields.io/npm/l/trace-guard?color=blue)
![supply chain](https://img.shields.io/badge/supply%20chain-100%25-brightgreen)
![maintenance](https://img.shields.io/badge/maintenance-sustainable-orange)
![build](https://img.shields.io/badge/build-passing-brightgreen)

> [!IMPORTANT]
> **STABLE BASELINE (v3.6.8)**: 100% Edge-Compatible (Vercel/Cloudflare). Integrated pure-JS SHA-256 for time-limited (5m) session HMAC integrity to completely prevent replay attacks. Patched OOM DoS and CPU Exhaustion vectors for infinite payload attacks. Now features frictionless exports for Next.js App Router and Express middlewares.

Add one line to your server. That's it. Trace Guard silently intercepts every HTTP/HTTPS request, injects a behavioral telemetry script, and blocks bots — including sophisticated agentic browsers driven by Vision-Language Models (VLMs, Playwright, Puppeteer, Claude Computer Use).

---

## Security First

Trace Guard is a security-focused library. We maintain a strict [Security Policy](file:///c:/all/Trace%20Guard/trace-guard-npm/SECURITY.md). If you discover a vulnerability, please report it via our coordinated disclosure process.

---

## Install

```bash
npm install trace-guard
```

## Usage (Global / Vanilla Node.js)

For traditional Node.js servers (Express, Fastify, raw `http`), Trace Guard intercepts all HTML responses and validates telemetry globally. Just place this at the absolute top of your entry file.

```javascript
require('trace-guard').setupHook({
    enabled: true,
    mode: 'block',     // 'block' | 'challenge' | 'monitor'
    threshold: 0.7,    // Block threshold (0.0 to 1.0)
});

// Your normal server code below...
const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Protected by Trace Guard</h1></body></html>');
}).listen(8080);
```

## Usage (Next.js App Router / Vercel Edge)

Trace Guard is 100% Edge-Compatible. You can integrate it natively into Next.js without monkey-patching.

**1. Inject the Script in `app/layout.tsx`:**
```tsx
import { getTraceGuardHTML } from 'trace-guard/dist/src/frameworks';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <div dangerouslySetInnerHTML={{ __html: getTraceGuardHTML() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**2. Mount the Validation Endpoint in `app/_tg/validate/route.ts`:**
```tsx
import { createNextRouteHandler } from 'trace-guard/dist/src/frameworks';
export const POST = createNextRouteHandler();
```

## Usage (Express Middleware)

For fine-grained control in Express without global monkey-patching:

```javascript
const express = require('express');
const { expressMiddleware } = require('trace-guard/dist/src/frameworks');

const app = express();
app.use(express.json());

// Mount the validation endpoint
app.post('/_tg/validate', expressMiddleware());

app.listen(8080);
```

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
│  TIER 1b: Automation Fingerprinting                      │
│  → navigator.webdriver detection                         │
│  → WebGL renderer unmasking (SwiftShader/LLVMpipe/Mesa) │
│  → Native prototype poisoning detection                  │
└─────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│  TIER 2: Physiological & Temporal Analysis               │
│  → Acceleration Asymmetry (biological push/pull)         │
│  → Jerk Entropy / Structure Function DFA                 │
│  → Event-Loop Clumping (performance.now() variance)      │
│  → Dwell-Time Variance (human reading pauses)           │
│  → Teleportation Detection (physically impossible jumps) │
│  → AI Agent Cadence (Think-Act step pattern)            │
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
  mouseEventsArray,          // Array of { x, y, t, p? } mouse events
  { decoyTriggered: false }  // Optional: true if honey-prompt was clicked
);

console.log(result);
// { score: 0.1, decision: 'allow', reason: 'CONSISTENT_HUMAN_TRAJECTORY' }
// { score: 1.0, decision: 'block', reason: 'WEBGL_SOFTWARE_RENDERER_DETECTED' }
// { score: 1.0, decision: 'block', reason: 'EVENT_LOOP_CLUMPING_DETECTED' }
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
| `mouseEvents` | `MouseEvent[]` | Array of `{ x: number, y: number, t: number, p?: number }` pointer events. `p` is `performance.now()` for Event-Loop Clumping analysis. |
| `options.decoyTriggered` | `boolean?` | Set `true` if the client interacted with the VLM honey-prompt. |
| `options.automation` | `object?` | Automation signals from the browser (`webdriver`, `headless`, `softwareRenderer`, `nativePatched`). |
| `options.challengeSolved` | `boolean?` | Set `true` when user passes the Turing challenge modal. |
| `options.isMobile` | `boolean?` | Enables mobile-specific kinematic analysis (arc deviation, touch pressure). |

Returns `{ score: number, decision: 'allow' | 'challenge' | 'block', reason: string }`.

### Decision Reasons

| Reason | Tier | Description |
|---|---|---|
| `CONSISTENT_HUMAN_TRAJECTORY` | — | All signals pass. Session is allowed. |
| `JA4_PROTOCOL_MATCH_SCRIPT` | 1 | Known script client (curl, python-requests). Instant block. |
| `AUTOMATION_WEBDRIVER_DETECTION` | 1 | `navigator.webdriver` is `true`. High-confidence automation signal. |
| `WEBGL_SOFTWARE_RENDERER_DETECTED` | 1 | GPU is a software renderer (SwiftShader/LLVMpipe). Headless VM proof. |
| `NATIVE_PROTOTYPE_POISONING` | 1 | Browser native functions have been monkey-patched by a stealth plugin. |
| `HEADLESS_BROWSER_ANOMALY` | 1 | User-agent or Chrome flags indicate headless mode. |
| `INCONSISTENT_BROWSER_FEATURES` | 1 | `navigator.languages` or `navigator.plugins` absent — headless environment. |
| `UNTRUSTED_DOM_EVENTS` | 1 | One or more events have `isTrusted=false` — scripted event injection detected. |
| `ALL_EVENTS_SYNTHETIC_INJECTION` | 1 | Every event in the session has `isTrusted=false` — full session is fabricated. |
| `TELEPORTATION_DETECTED` | 2 | Physically impossible cursor jumps (>150px in <10ms). Universal block. |
| `EVENT_LOOP_CLUMPING_DETECTED` | 2 | Events share identical microsecond timestamps — proof of DOM injection. |
| `AGENT_CADENCE_DETECTED` | 2 | Think-Act step timing pattern consistent with agentic browsers. |
| `LACKS_BIOLOGICAL_JITTER` | 2 | Absolute zero-variance constant-velocity movement (threshold < 0.001). |
| `EXCESSIVE_SMOOTHNESS_DETECTION` | 2 | Mathematically perfect Bezier curve smoothness — physically impossible. |
| `PERFECT_LINEAR_TRAJECTORY` | 2 | Arc deviation < 1.002 on desktop — geometrically perfect path (any axis). |
| `LINEAR_SWIPE_ARC_ANOMALY` | 2 | Arc deviation < 1.005 on mobile — robotic straight-line swipe. |
| `REPLAY_ATTACK_DETECTED` | 2 | Identical path hash seen in a previous session — pre-recorded human replay. |
| `MECHANICAL_DWELL_PATTERN` | 2 | Near-zero variance in pause durations — constant-velocity bot. |
| `STATIC_TOUCH_PRESSURE_ANOMALY` | 2 | Touch pressure is identically 0 throughout — touch emulator. |
| `BIOLOGICAL_TREMOR_VERIFIED` | 2 | IRI pattern confirms biological hand tremor. Reduces score by 40pts. |
| `INSUFFICIENT_BEHAVIORAL_SIGNAL` | 2 | Zero path length — no movement data collected yet. Challenge issued. |
| `CHALLENGE_SOLVED_BY_USER` | — | User solved the Turing challenge. Reduces score by 60pts. |
| `HONEY_PROMPT_TRIGGERED` | 3 | VLM agent interacted with DOM decoy. Instant block. |

### `BehavioralAnalyzer` (exported from `trace-guard/behavioral`)

All methods are fully documented with JSDoc. Key public methods:

- `calculatePathLength(events)` — Total Euclidean path length in pixels.
- `calculateAccelAsymmetry(events)` — Up/down acceleration ratio. Humans: ≠ 1.0.
- `calculateJerkEntropy(events)` — Structure Function DFA slope. Linear bots: ~0.
- `calculateDwellTimeVariance(events)` — Variance of pause durations. Humans: high.
- `calculateTeleportationScore(events)` — Fraction of physically impossible jumps.
- `calculateEventClumping(events)` — Variance of `performance.now()` deltas. DOM-injected bots: ~0.
- `calculateTouchVariance(events)` — Variance of digitizer pressure/radius (mobile).
- `calculateArcDeviation(events)` — Chord-to-arc ratio for thumb biomechanics (mobile).
- `extractFeatures(events)` — All features in one optimized single-pass call.

---

## Zero-Conflict Guarantee

Trace Guard is designed to be **invisible** to the host application:

- Monkey-patches `http.createServer` globally — no route changes needed. Zero network-access dependencies.
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
