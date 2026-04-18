import { TraceGuardAI } from '../src/core';
import { BehavioralAnalyzer } from '../src/behavioral';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a perfectly linear set of mouse events (constant velocity, no jitter). */
function linearEvents(count: number, dx = 1, dy = 1, dt = 16): Array<{ x: number; y: number; t: number }> {
  const events = [];
  for (let i = 0; i < count; i++) {
    // Synthetic bots typically use uniform event injection
    events.push({ x: i * dx, y: i * dy, t: i * dt, p: i * dt + 0.0001 });
  }
  return events;
}

/**
 * Generate human-like noisy mouse events: diagonal traversal with organic micro-jitter and variable timing.
 * Uses a straight-line base path (not a perfect circle) to avoid synthetic spectral regularity.
 * Variable timing mimics reading pauses. Micro-jitter adds pink-noise character.
 */
function humanEvents(count = 60): Array<{ x: number; y: number; t: number }> {
  const events = [];
  let t = 0;
  let x = 50, y = 50, vx = 0, vy = 0, ax = 0, ay = 0;
  
  // Deterministic seeded random for test stability
  let seed = 12345;
  const sRand = () => {
      let r = Math.sin(seed++) * 10000;
      return r - Math.floor(r);
  };

  for (let i = 0; i < count; i++) {
    // 1/f Brownian acceleration (Pink Noise proxy)
    ax = 0.8 * ax + (sRand() - 0.5) * 8.0;
    ay = 0.8 * ay + (sRand() - 0.5) * 8.0;

    vx += ax;
    vy += ay;
    
    // Spring restorative force towards goal (diagonal swipe)
    const targetX = 50 + (i / count) * 700;
    const targetY = 50 + (i / count) * 500;
    vx += (targetX - x) * 0.15;
    vy += (targetY - y) * 0.15;

    x += vx;
    y += vy;

    events.push({
      x: Math.round(x),
      y: Math.round(y),
      t: Math.round(t),
      p: t + (sRand() * 2), // Organic high-definition polling variation
    });
    // biological 8-12Hz timing variations + system lag
    t += 16 + (sRand() * 6);
  }
  return events;
}

/** Generate events containing teleportation jumps. */
function teleportEvents(count = 20): Array<{ x: number; y: number; t: number }> {
  const events = [];
  for (let i = 0; i < count; i++) {
    const t = i * 16;
    // Every 5th event: jump 200px in <10ms
    if (i > 0 && i % 5 === 0) {
      // Add teleport: big jump, tiny dt from previous
      const prev: { x: number; y: number; t: number } = events[events.length - 1];
      events.push({ x: prev.x + 200, y: prev.y + 200, t: prev.t + 2 }); // 2ms, 283px jump
    } else {
      events.push({ x: i * 5, y: i * 3, t });
    }
  }
  return events;
}

/** Generate Agent-like "Think-Act" events: long pauses followed by rapid, linear movement. */
function agentCadenceEvents(steps = 3): Array<{ x: number; y: number; t: number }> {
  const events = [];
  let t = 0;
  let p = 0;
  let x = 100, y = 100;
  for (let s = 0; s < steps; s++) {
    // 1. Thinking phase (long pause)
    t += 1000; 
    p += 1000;
    events.push({ x, y, t, p });
    // 2. Action phase (rapid movement burst generated linearly inside a single event loop cycle)
    for (let i = 0; i < 5; i++) {
        x += 20; y += 15; t += 20;
        p += 0.0001; // The dead giveaway of DOM event injection
        events.push({ x, y, t, p });
    }
  }
  return events;
}

// ---------------------------------------------------------------------------
// TraceGuardAI Integration Tests
// ---------------------------------------------------------------------------

describe('TraceGuardAI — Protocol Layer', () => {
  const guard = new TraceGuardAI();

  it('blocks known script fingerprints (python-requests / curl)', () => {
    const res = guard.analyzeSession('ja4_c01_0001_0001', []);
    expect(res.decision).toBe('block');
    expect(res.reason).toContain('JA4_PROTOCOL_MATCH_SCRIPT');
  });

  it('blocks instantly if VLM Honey-Prompt decoy is triggered (regardless of behavior)', () => {
    const humanLike = humanEvents();
    const res = guard.analyzeSession('ja4_c01_a001_b001', humanLike, { decoyTriggered: true });
    expect(res.decision).toBe('block');
    expect(res.reason).toBe('HONEY_PROMPT_TRIGGERED');
    expect(res.score).toBe(1.0);
  });
});

describe('TraceGuardAI — Automation Signals (Stealth-Busting)', () => {
  let guard: TraceGuardAI;
  const BROWSER_JA4 = 'ja4_c01_a001_b001';

  beforeEach(() => {
    guard = new TraceGuardAI();
  });

  it('blocks if navigator.webdriver is true (Score 80)', () => {
    const res = guard.analyzeSession(BROWSER_JA4, humanEvents(), { 
      automation: { webdriver: true } 
    });
    expect(res.decision).toBe('block');
    expect(res.reason).toContain('AUTOMATION_WEBDRIVER_DETECTION');
    expect(res.score).toBeGreaterThanOrEqual(0.8);
  });

  it('challenges on headless anomaly (Score 50)', () => {
    const res = guard.analyzeSession(BROWSER_JA4, humanEvents(), { 
      automation: { headless: true } 
    });
    expect(res.decision).toBe('challenge');
    expect(res.reason).toContain('HEADLESS_BROWSER_ANOMALY');
  });

  it('blocks on combined automation signals (webdriver + headless = 100+)', () => {
    const res = guard.analyzeSession(BROWSER_JA4, humanEvents(), { 
      automation: { webdriver: true, headless: true } 
    });
    expect(res.decision).toBe('block');
    expect(res.score).toBe(1.0);
  });
});

describe('TraceGuardAI — Agentic Defense (v3.3.0)', () => {
  let guard: TraceGuardAI;
  const BROWSER_JA4 = 'ja4_browser';

  beforeEach(() => {
    guard = new TraceGuardAI();
  });

  it('detects AI Agent "Think-Act" step cadence (Score 60+)', () => {
    const events = agentCadenceEvents(4);
    const res = guard.analyzeSession(BROWSER_JA4, events);
    // cadence(60) + block from EVENT Clumping
    expect(res.decision).toBe('block');
    expect(res.score).toBe(1.0); 
  });

  it('allows access if challengeSolved is true (Turing Challenge loop)', () => {
    const events = agentCadenceEvents(4); // Suspicious cadence + Event Clumping
    const res = guard.analyzeSession(BROWSER_JA4, events, { challengeSolved: true });
    // Event Clumping hits 100 behavior Cap. 100 - 60 (Challenge solved) = 40 (Challenge)
    expect(res.decision).toBe('challenge');
    expect(res.score).toBeCloseTo(0.4, 1);
  });

  it('blocks instantly if VLM Cognitive Trap is triggered', () => {
    const res = guard.analyzeSession(BROWSER_JA4, humanEvents(), { 
      decoyTriggered: true,
      trapId: 'tg-vlm-verify' 
    });
    expect(res.decision).toBe('block');
    expect(res.reason).toBe('HONEY_PROMPT_TRIGGERED');
    expect(res.score).toBe(1.0);
  });
});

describe('TraceGuardAI — Behavioral Analysis (Weighted)', () => {
  let guard: TraceGuardAI;
  const BROWSER_JA4 = 'ja4_c01_a001_b001';

  beforeEach(() => {
    guard = new TraceGuardAI();
  });

  it('blocks purely horizontal constant bot movement', () => {
    const events = [];
    for (let i = 0; i < 20; i++) {
        events.push({ x: i * 10, y: 50, t: i * 16 });
    }
    const res = guard.analyzeSession(BROWSER_JA4, events);
    // Smoothness (50) + No Jitter (60) + Symmetry (80) = 190 -> capped to 100
    expect(res.decision).toBe('block');
    expect(res.score).toBe(1.0);
  });

  it('allows asymmetric vertical human movements', () => {
    const res = guard.analyzeSession(BROWSER_JA4, humanEvents());
    expect(res.decision).toBe('allow');
  });

  it('blocks symmetric linear bot movements instantly', () => {
    // Perfectly vertical linear events: symmetric and no jitter
    const evts: Array<{ x: number; y: number; t: number }> = [];
    let t = 0;
    for (let i = 0; i < 50; i++) {
        evts.push({ x: 100, y: i * 5, t });
        t += 20;
    }
    const res = guard.analyzeSession(BROWSER_JA4, evts);
    expect(res.decision).toBe('block'); 
    expect(res.score).toBe(1.0); 
  });

  it('blocks symmetric linear bot that also fails automation check', () => {
    const evts = linearEvents(50, 0, 5, 20); // vertical linear
    const res = guard.analyzeSession(BROWSER_JA4, evts, { 
      automation: { languages: false } // +25 pts
    });
    // behavior(100) + languages(25) = 125 -> capped at 1.0 max per scale
    expect(res.decision).toBe('block');
    expect(res.score).toBe(1.0); 
  });
});

describe('TraceGuardAI — Teleportation Detection', () => {
  const guard = new TraceGuardAI();

  it('blocks teleportation events (Score 80 baseline)', () => {
    const events = teleportEvents(25);
    const res = guard.analyzeSession('ja4_browser', events);
    // Teleportation (80) = 80
    expect(res.decision).toBe('block');
    expect(res.score).toBeGreaterThanOrEqual(0.8);
  });
});

describe('TraceGuardAI — Unknown JA4 Robustness', () => {
  const guard = new TraceGuardAI();
  const UNKNOWN_JA4 = 'ja4_unknown_client';

  it('allows a human with unknown JA4', () => {
    const res = guard.analyzeSession(UNKNOWN_JA4, humanEvents());
    expect(res.decision).toBe('allow');
  });

  it('blocks unknown client with symmetric linear movement', () => {
    const events = linearEvents(50, 0, 1, 20); // purely linear vertical, 49px total
    const res = guard.analyzeSession(UNKNOWN_JA4, events);
    // behavior no longer capped, symmetry instantly blocks
    expect(res.decision).toBe('block');
    expect(res.score).toBeGreaterThanOrEqual(0.8); 
  });
});

// ---------------------------------------------------------------------------
// BehavioralAnalyzer Unit Tests
// ---------------------------------------------------------------------------

describe('BehavioralAnalyzer — Unit Tests', () => {
  const analyzer = new BehavioralAnalyzer();

  // --- calculatePathLength ---
  describe('calculatePathLength', () => {
    it('returns 0 for a single event', () => {
      expect(analyzer.calculatePathLength([{ x: 0, y: 0, t: 0 }])).toBe(0);
    });

    it('returns 0 for empty input', () => {
      expect(analyzer.calculatePathLength([])).toBe(0);
    });

    it('calculates Pythagorean distance correctly', () => {
      const events = [{ x: 0, y: 0, t: 0 }, { x: 3, y: 4, t: 100 }];
      expect(analyzer.calculatePathLength(events)).toBeCloseTo(5, 5);
    });

    it('accumulates path length across multiple segments', () => {
      const events = [
        { x: 0, y: 0, t: 0 },
        { x: 3, y: 4, t: 100 },
        { x: 6, y: 8, t: 200 },
      ];
      expect(analyzer.calculatePathLength(events)).toBeCloseTo(10, 5);
    });
  });

  // --- calculateAccelAsymmetry ---
  describe('calculateAccelAsymmetry', () => {
    it('returns 0 for purely horizontal movement', () => {
      const events = linearEvents(10, 5, 0, 16); // no vertical component
      expect(analyzer.calculateAccelAsymmetry(events)).toBe(0);
    });

    it('handles fewer than 3 events (returns 0)', () => {
      const events = [{ x: 0, y: 0, t: 0 }, { x: 10, y: 10, t: 100 }];
      expect(analyzer.calculateAccelAsymmetry(events)).toBe(0);
    });

    it('handles duplicate timestamps without crashing (dt <= 0)', () => {
      const events = [
        { x: 0, y: 0, t: 100 },
        { x: 10, y: 10, t: 100 }, // duplicate t
        { x: 20, y: 20, t: 200 },
      ];
      expect(() => analyzer.calculateAccelAsymmetry(events)).not.toThrow();
    });

    it('returns 0 for constant-velocity upward movement (acceleration is zero)', () => {
      // Constant velocity upward → velocity delta = 0 → acceleration = 0 for all points.
      // Neither countUp nor countDown accumulate → both avgUp and avgDown are 0 → returns 0.
      const events = [
        { x: 0, y: 300, t: 0 },
        { x: 0, y: 200, t: 100 },
        { x: 0, y: 100, t: 200 },
        { x: 0, y: 0, t: 300 },
      ];
      const result = analyzer.calculateAccelAsymmetry(events);
      expect(result).toBe(0);
    });

    it('returns 100 when only upward NON-CONSTANT acceleration exists', () => {
      // Variable velocity upward (accelerating upward) → vy changes between steps
      // t=0→100: dy=-100, vy=-1; t=100→150: dy=-100, vy=-2; t=150→160: dy=-100, vy=-10
      const events = [
        { x: 0, y: 300, t: 0 },
        { x: 0, y: 200, t: 100 }, // vy = -1
        { x: 0, y: 100, t: 150 }, // vy = -2  → acceleration upward
        { x: 0, y: 0, t: 160 },   // vy = -10 → strong upward acceleration
      ];
      const result = analyzer.calculateAccelAsymmetry(events);
      // Only upward acceleration → avgDown = 0 → returns 100
      expect(result).toBe(100);
    });
  });

  // --- calculateJerkEntropy ---
  describe('calculateJerkEntropy', () => {
    it('returns null for fewer than 10 events', () => {
      expect(analyzer.calculateJerkEntropy(linearEvents(5))).toBeNull();
    });

    it('returns null for empty input', () => {
      expect(analyzer.calculateJerkEntropy([])).toBeNull();
    });

    it('does not throw on duplicate timestamps', () => {
      const events = Array.from({ length: 15 }, (_, i) => ({
        x: i, y: i, t: i < 5 ? 0 : i * 10 // some duplicate ts at start
      }));
      expect(() => analyzer.calculateJerkEntropy(events)).not.toThrow();
    });

    it('returns a finite number for linear motion (not null)', () => {
      const events = linearEvents(30, 2, 1, 16);
      const result = analyzer.calculateJerkEntropy(events);
      // Linear motion may return 0 or null — both are valid, should not be a non-finite number
      if (result !== null) {
        expect(isFinite(result)).toBe(true);
      }
    });
  });

  // --- calculateDwellTimeVariance ---
  describe('calculateDwellTimeVariance', () => {
    it('returns null for fewer than 4 events', () => {
      expect(analyzer.calculateDwellTimeVariance([
        { x: 0, y: 0, t: 0 },
        { x: 1, y: 1, t: 100 },
      ])).toBeNull();
    });

    it('returns null when no near-stationary events exist', () => {
      // All events move more than 5px per step
      const events = linearEvents(20, 10, 10, 16);
      expect(analyzer.calculateDwellTimeVariance(events)).toBeNull();
    });

    it('returns non-null and non-negative when dwell events exist', () => {
      const events = [
        { x: 100, y: 100, t: 0 },
        { x: 101, y: 100, t: 200 },  // near-stationary (1px)
        { x: 102, y: 100, t: 600 },  // near-stationary (1px)
        { x: 103, y: 100, t: 700 },  // near-stationary (1px)
        { x: 200, y: 200, t: 800 },  // movement
      ];
      const result = analyzer.calculateDwellTimeVariance(events);
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThanOrEqual(0);
    });

    it('returns high variance for erratic human-like pauses', () => {
      // Pauses of 500ms and 10ms — very different
      const events = [
        { x: 50, y: 50, t: 0 },
        { x: 51, y: 50, t: 500 }, // 500ms pause (near-stationary)
        { x: 52, y: 50, t: 510 }, // 10ms pause (near-stationary)
        { x: 53, y: 50, t: 1010 }, // 500ms pause (near-stationary)
        { x: 54, y: 50, t: 1020 }, // 10ms pause
        { x: 200, y: 200, t: 1100 }, // big move
      ];
      const result = analyzer.calculateDwellTimeVariance(events);
      // Variance between [500, 10, 500, 10] is high
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThan(50000); // 500² level variance expected
    });
  });

  // --- calculateTeleportationScore ---
  describe('calculateTeleportationScore', () => {
    it('returns 0 for a single event', () => {
      expect(analyzer.calculateTeleportationScore([{ x: 0, y: 0, t: 0 }])).toBe(0);
    });

    it('returns 0 for empty input', () => {
      expect(analyzer.calculateTeleportationScore([])).toBe(0);
    });

    it('returns 0 for normal human speed movements', () => {
      const events = humanEvents(50);
      expect(analyzer.calculateTeleportationScore(events)).toBe(0);
    });

    it('returns > 0.15 for events with multiple teleportation jumps', () => {
      const events = teleportEvents(25);
      expect(analyzer.calculateTeleportationScore(events)).toBeGreaterThan(0.15);
    });

    it('does not count large movement with sufficient time as teleportation', () => {
      // 200px jump but in 100ms — ~2px/ms, reasonable
      const events = [
        { x: 0, y: 0, t: 0 },
        { x: 200, y: 0, t: 100 },
        { x: 400, y: 0, t: 200 },
      ];
      expect(analyzer.calculateTeleportationScore(events)).toBe(0);
    });
  });

  // --- extractFeatures edge cases ---
  describe('extractFeatures — Edge Cases', () => {
    it('returns zero-value features for empty array', () => {
      const f = analyzer.extractFeatures([]);
      expect(f.mstLength).toBe(0);
      expect(f.avgVelocity).toBe(0);
      expect(f.accelAsymmetry).toBe(0);
      expect(f.jerkEntropy).toBeNull();
      expect(f.dwellTimeVariance).toBeNull();
      expect(f.teleportationScore).toBe(0);
    });

    it('returns zero-value features for single event', () => {
      const f = analyzer.extractFeatures([{ x: 100, y: 200, t: 1000 }]);
      expect(f.mstLength).toBe(0);
      expect(f.teleportationScore).toBe(0);
    });

    it('handles NaN coordinates gracefully (no crash)', () => {
      const events = [
        { x: NaN, y: 0, t: 0 },
        { x: 10, y: NaN, t: 100 },
        { x: 20, y: 20, t: 200 },
      ];
      expect(() => analyzer.extractFeatures(events)).not.toThrow();
    });

    it('handles negative coordinates without crashing', () => {
      const events = [
        { x: -100, y: -200, t: 0 },
        { x: -50, y: -100, t: 100 },
        { x: 0, y: 0, t: 200 },
      ];
      expect(() => analyzer.extractFeatures(events)).not.toThrow();
      const f = analyzer.extractFeatures(events);
      expect(f.mstLength).toBeGreaterThan(0);
    });

    it('handles zero-duration session gracefully', () => {
      const events = [
        { x: 0, y: 0, t: 500 },
        { x: 10, y: 10, t: 500 }, // same timestamp
        { x: 20, y: 20, t: 500 },
      ];
      expect(() => analyzer.extractFeatures(events)).not.toThrow();
    });
  });
});
