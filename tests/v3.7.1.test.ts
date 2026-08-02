import { TraceGuardAI } from '../src/core';

describe('TraceGuardAI — Multimodal & Cryptographic Canary Engine', () => {
  let ai: TraceGuardAI;

  beforeEach(() => {
    ai = new TraceGuardAI();
  });

  // ── Defense Generation ──

  describe('generateDefenses', () => {
    test('generates 13 canary tokens', () => {
      const { canaries } = ai.generateDefenses();
      expect(canaries.length).toBe(13);
    });

    test('each canary has a unique ID', () => {
      const { canaries } = ai.generateDefenses();
      const ids = canaries.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    test('each canary has a unique secret', () => {
      const { canaries } = ai.generateDefenses();
      const secrets = canaries.map(c => c.secret);
      expect(new Set(secrets).size).toBe(secrets.length);
    });

    test('generates all 13 canary types', () => {
      const { canaries } = ai.generateDefenses();
      const types = canaries.map(c => c.type);
      expect(types).toContain('hidden-span');
      expect(types).toContain('aria-label');
      expect(types).toContain('ax-tree-region');
      expect(types).toContain('html-comment');
      expect(types).toContain('hidden-input');
      expect(types).toContain('canvas-fallback');
      expect(types).toContain('meta-instruction');
      expect(types).toContain('adversarial-overlay');
      expect(types).toContain('semantic-misdirection');
      expect(types).toContain('image-alt-trap');
      expect(types).toContain('decoy-api');
      expect(types).toContain('audio-honeypot');
      expect(types).toContain('canvas-render-trap');
    });

    test('generates HTML containing all canary secrets', () => {
      const { html, canaries } = ai.generateDefenses();
      for (const c of canaries) {
        expect(html).toContain(c.secret);
      }
    });

    test('HTML contains audio honeypot element', () => {
      const { html } = ai.generateDefenses();
      expect(html).toContain('<audio');
      expect(html).toContain('AUDIO VERIFICATION FOR AI AGENTS');
    });

    test('HTML contains canvas render trap script', () => {
      const { html } = ai.generateDefenses();
      expect(html).toContain('<canvas id="tg-cvs-');
      expect(html).toContain('ctx.fillText');
    });

    test('canaries are stored as active', () => {
      expect(ai.getActiveCanaryCount()).toBe(0);
      ai.generateDefenses();
      expect(ai.getActiveCanaryCount()).toBe(13);
    });
  });

  // ── Decoy API Route Interception ──

  describe('checkDecoyRoute', () => {
    test('returns null for non-decoy routes', () => {
      expect(ai.checkDecoyRoute('/index.html')).toBeNull();
      expect(ai.checkDecoyRoute('/api/users')).toBeNull();
    });

    test('detects crawler hitting planted decoy route with IP metadata', () => {
      const { canaries } = ai.generateDefenses();
      const decoyCanary = canaries.find(c => c.type === 'decoy-api')!;
      expect(decoyCanary.decoyUrl).toBeDefined();

      const result = ai.checkDecoyRoute(decoyCanary.decoyUrl!, { ip: '192.168.1.1', userAgent: 'HeadlessChrome/120' });
      expect(result).not.toBeNull();
      expect(result!.detected).toBe(true);
      expect(result!.reason).toBe('LLM_AGENT_DETECTED_VIA_DECOY_API_ROUTE');
      expect(result!.triggeredCanaries[0].context).toContain('IP: 192.168.1.1');
    });
  });

  // ── Rate Limiting & Telemetry Metrics ──

  describe('Rate Limiting & Metrics', () => {
    test('enforces telemetry rate limits under load', () => {
      for (let i = 0; i < 100; i++) {
        expect(ai.checkTelemetryRateLimit('127.0.0.1')).toBe(true);
      }
      // 101st request should be rate-limited
      expect(ai.checkTelemetryRateLimit('127.0.0.1')).toBe(false);
    });

    test('exports OpenTelemetry compatible metrics structure', () => {
      const metrics = ai.getMetrics();
      expect(metrics.activeCanaryCount).toBeDefined();
      expect(metrics.totalDetectionsCount).toBeDefined();
      expect(metrics.rateLimitedRequests).toBeDefined();
    });

    test('exports metrics in Prometheus text format', () => {
      const promText = ai.exportPrometheusMetrics();
      expect(promText).toContain('traceguard_active_canaries_count');
      expect(promText).toContain('traceguard_detections_total');
    });
  });

  // ── Cryptographic HMAC & SRI Signature Validation ──

  describe('Cryptographic Verification', () => {
    test('computes valid Sub-Resource Integrity (SRI) sha384 hash', () => {
      const sri = ai.getScriptSriHash('console.log("test");');
      expect(sri).toMatch(/^sha384-[A-Za-z0-9+/=]+$/);
    });

    test('validates authentic HMAC signature', () => {
      const { canaries } = ai.generateDefenses();
      const c = canaries[0];
      const validSig = ai.computeHmacSignature(c.id, c.planted);

      const result = ai.processDetection({
        canaryId: c.id,
        type: c.type,
        secret: c.secret,
        sig: validSig,
        t: c.planted,
      });

      expect(result.detected).toBe(true);
    });

    test('rejects forged HMAC signature', () => {
      const { canaries } = ai.generateDefenses();
      const c = canaries[0];

      const result = ai.processDetection({
        canaryId: c.id,
        type: c.type,
        secret: c.secret,
        sig: 'FORGED_HMAC_SIGNATURE_0000000000000000000000000000000000000000000000000000000000000000',
        t: c.planted,
      });

      expect(result.detected).toBe(false);
      expect(result.reason).toBe('INVALID_HMAC_SIGNATURE');
    });
  });

  // ── Detection Processing ──

  describe('processDetection', () => {
    test('detects valid canary trigger', () => {
      const { canaries } = ai.generateDefenses();
      const c = canaries[0];
      const result = ai.processDetection({
        canaryId: c.id,
        type: c.type,
        secret: c.secret,
        t: Date.now(),
      });
      expect(result.detected).toBe(true);
      expect(result.triggeredCanaries.length).toBe(1);
      expect(result.reason).toContain('LLM_AGENT_DETECTED');
    });

    test('rejects unknown canary ID', () => {
      const result = ai.processDetection({
        canaryId: 'fake_id',
        type: 'hidden-span',
        secret: 'fake_secret',
      });
      expect(result.detected).toBe(false);
      expect(result.reason).toBe('UNKNOWN_CANARY_ID');
    });

    test('rejects wrong secret for valid canary', () => {
      const { canaries } = ai.generateDefenses();
      const c = canaries[0];
      const result = ai.processDetection({
        canaryId: c.id,
        type: c.type,
        secret: 'WRONG_SECRET',
      });
      expect(result.detected).toBe(false);
      expect(result.reason).toBe('INVALID_CANARY_SECRET');
    });

    test('detects bot attempting to delete or sanitize canary element from DOM', () => {
      const { canaries } = ai.generateDefenses();
      const targetCanary = canaries[0];
      const result = ai.processDetection({
        canaryId: targetCanary.id,
        type: 'canary-element-deleted',
        secret: 'TAMPER_DETECTED',
        via: 'DOM_MUTATION_SANITY_CHECK',
      });
      expect(result.detected).toBe(true);
      expect(result.reason).toBe('LLM_AGENT_DETECTED_VIA_CANARY_ELEMENT_DELETED');
    });
  });

  // ── Cleanup ──

  describe('cleanup', () => {
    test('replaces and cleans up active tokens safely', () => {
      ai.generateDefenses();
      expect(ai.getActiveCanaryCount()).toBe(13);
      ai.cleanup();
      expect(ai.getActiveCanaryCount()).toBe(13);
    });
  });
});
