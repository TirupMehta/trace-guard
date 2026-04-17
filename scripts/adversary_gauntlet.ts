import { TraceGuardAI } from '../src/core';

/**
 * ADVERSARY GAUNTLET v3.4.0
 * Simulates sophisticated AI agent movement patterns to test detection robustness.
 */
const guard = new TraceGuardAI();

function logResult(name: string, result: any) {
    console.log(`[${name.toUpperCase()}]`);
    console.log(`  Decision: ${result.decision.toUpperCase()}`);
    console.log(`  Reason:   ${result.reason}`);
    console.log(`  Entropy:  ${(result.features.jerkEntropy || 0).toFixed(4)}`);
    console.log(`  Asymmetry: ${(result.features.accelAsymmetry || 0).toFixed(2)}`);
    console.log(`  Hash:      ${result.features.pathHash}`);
    console.log('-----------------------------------------');
}

/** 1. THE SMOOTH OPERATOR: Bézier Curve (e.g., ghost-cursor) */
function simulateBezierBot() {
    const events = [];
    const points = 50;
    for (let i = 0; i < points; i++) {
        const t = i / points;
        // Cubic Bézier formula
        const x = (1-t)**3 * 100 + 3*(1-t)**2*t * 400 + 3*(1-t)*t**2 * 100 + t**3 * 500;
        const y = (1-t)**3 * 100 + 3*(1-t)**2*t * 100 + 3*(1-t)*t**2 * 400 + t**3 * 500;
        events.push({ x: Math.round(x), y: Math.round(y), t: i * 20 });
    }
    return events;
}

/** 2. THE JITTERER: Linear + White Noise (trying to spoof 1/f noise) */
function simulateJitterBot() {
    const events = [];
    for (let i = 0; i < 50; i++) {
        const x = 100 + i * 10 + (Math.random() - 0.5) * 4;
        const y = 100 + i * 8 + (Math.random() - 0.5) * 4;
        events.push({ x: Math.round(x), y: Math.round(y), t: i * 20 });
    }
    return events;
}

/** RUN THE GAUNTLET */
console.log('--- TRACE GUARD ADVERSARY GAUNTLET ---');

const bezier = simulateBezierBot();
const res1 = guard.analyzeSession('ja4_test', bezier);
logResult('Bezier Curve (Smooth)', res1);

const jitter = simulateJitterBot();
const res2 = guard.analyzeSession('ja4_test', jitter);
logResult('Linear + White Noise', res2);

// TEST REPLAY DEFENSE
console.log('[REPLAY ATTACK TEST]');
const res3 = guard.analyzeSession('ja4_test', bezier); // Second time
logResult('Replayed Bezier Path', res3);

if (res3.reason.includes('REPLAY_ATTACK_DETECTED')) {
    console.log('SUCCESS: Path Replay detected and blocked.');
} else {
    console.error('FAILURE: Path Replay bypassed detection!');
    process.exit(1);
}
