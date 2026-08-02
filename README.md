# Trace Guard 🛡️

**The Open-Source Defensive Toolkit Against Autonomous AI & LLM Browsing Agents.**

[![npm version](https://img.shields.io/npm/v/trace-guard.svg)](https://www.npmjs.com/package/trace-guard)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](https://github.com/tirupmehta/trace-guard)

---

## 💡 The Problem: Autonomous AI Agents & Uncontrolled Scraping

Traditional bot mitigation (IP rate-limiting, CAPTCHA, headless browser detection) fails against modern **LLM-powered autonomous agents** and **Vision-Language Model (VLM) browsers**. These agents operate real browser instances, execute full JavaScript, and read web pages visually or via the DOM just as humans do.

Attempts to detect AI agents using client-side behavioral mouse-tracking or hardware fingerprinting suffer from high false-positive rates and easy evasions (as agents can simulate human movements or run headfully).

---

## 🎯 The Solution: Architectural Vulnerability Exploitation (Canary Tokens & Adversarial Overlays)

Trace Guard pivots defense from fragile behavioral guesswork to **structural architectural vulnerabilities** inherent in Large Language Models across 13 Canary Primitives:

1. **DOM Canary Tokens**: Hidden DOM elements (`aria-label`, hidden spans, HTML comments, canvas fallbacks, meta tags) containing natural language instructions targeted at LLMs. Because LLMs cannot structurally separate instructions from passive data, agents follow embedded prompts—revealing unique tokens in their outputs or actions.
2. **AX-Tree Region Canaries**: Dedicated accessibility regions (`role="region"` without `aria-hidden="true"`) configured to expose prompt directives directly to browser Accessibility Tree (AX Tree) parsing agents (*Browser-Use*, *WebArena*, *Claude AX Mode*).
3. **Multimodal Canvas Pixel Traps**: Pixel-rendered prompt text on hidden 2D `<canvas>` contexts to catch VLM visual OCR scrapers.
4. **Multimodal Audio Honeypots**: Hidden `<audio>` tags with prompt injection attributes targeting speech/audio LLM agents.
5. **Polymorphic Prompt Engine**: Dynamic generation matrix creating 1,200+ unique prompt variations on every request to defeat static regex filter evasion.
6. **Decoy API Honeypots**: Planted JSON API routes (`/_tg_decoy_*`) that catch crawlers exploring API links.
7. **Adversarial Visual Overlays**: Grounded in recent security research (*ACL 2025: "Attacking Vision-Language Computer Agents via Pop-ups"*), Trace Guard injects transient visual overlays that distract VLM agents with 86%+ success rates while remaining invisible or automatically dismissed (150ms) for human users.

---

## 🚀 Quick Start (Zero-Setup Node.js Server Hook)

Enable Trace Guard automatically across all HTML responses with a single line of code before initializing your server:

```javascript
require('trace-guard').setupHook({
  enabled: true,
  logDetections: true,
  onDetection: (result) => {
    console.log('🚨 LLM Agent Detected:', result.reason);
  }
});

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Welcome to my website</h1>');
});

server.listen(3000);
```

### ⚡ Framework Support (Next.js, Express, Fastify, Hono)

```typescript
// Next.js App Router (middleware.ts) — Vercel Edge Compatible
import { traceGuardNextMiddleware } from 'trace-guard';

export default traceGuardNextMiddleware();
```

```javascript
// Express Middleware
const { traceGuardExpress } = require('trace-guard');
app.use(traceGuardExpress());
```

```javascript
// Fastify Plugin
const { traceGuardFastify } = require('trace-guard');
fastify.register(traceGuardFastify);
```

```typescript
// Hono (Bun / Cloudflare Workers / Deno)
import { traceGuardHono } from 'trace-guard';
app.use('*', traceGuardHono());
```

---

## 🧪 Experimental Validation

Trace Guard includes an automated experiment suite (`experiments/run-agents.js` & `experiments/test_viewports.js`) to benchmark defense efficacy against scrapers, headless browsers, and LLM readers.

| Threat Category | Detection Mechanism | Efficacy | Human Impact |
| :--- | :--- | :--- | :--- |
| **LLM Scraping & Summarization** | DOM Canary Tokens (Hidden Spans / Comments) | **100% Token Leakage** | Zero (CSS Hidden) |
| **AX-Tree Autonomous Agents** | AX-Tree Region Canaries (`role="region"`) | **100% AX Tree Exposure** | Zero (Offscreen) |
| **VLM Browsing Agents** | Adversarial Visual Overlays & Canvas OCR | **86%+ Redirection** | Zero (Auto-dismissed 150ms) |
| **Multimodal Audio Agents** | Audio API Honeypots (`<audio>`) | **Deterministic Trigger** | Zero |
| **API Discovery Crawlers** | Decoy API Routes (`/_tg_decoy_*`) | **Deterministic Trigger** | Zero |
| **Sanitizers & Strippers** | Self-Healing MutationObserver | **Tamper Detection** | Zero |

---

## ⚖️ Intellectual Property & Research Status

- **Patent Pending**: Indian Provisional Patent Application Form 2 (*"Method and System for Detecting Large Language Model Agents Using Embedded Adversarial DOM Canary Tokens"*).
- **Research Paper**: Preprint manuscript available under `paper/traceguard_paper.md`.
- **Progress Journal**: Live engineering milestones documented in `PROGRESS_LOG.md`.

---

## 📄 License

ISC License © 2026 Tirup Mehta
