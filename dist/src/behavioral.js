"use strict";
/**
 * Trace Guard — Behavioral Analysis Engine
 *
 * Physiological trajectory analysis rooted in published research:
 * - Acceleration Asymmetry: DMTG (arXiv:2410.18233)
 * - Jerk Entropy: Structure Function DFA approximation
 * - BeCAPTCHA-Mouse: Neuromotor features (arXiv:2005.00890)
 * - FP-Agent: Behavioral fingerprinting (arXiv:2605.01247)
 *
 * All analysis uses a single-pass extractFeatures() loop for performance.
 * Zero production dependencies.
 *
 * @author Tirup Mehta
 * @license ISC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehavioralAnalyzer = void 0;
// ── BehavioralAnalyzer ──
class BehavioralAnalyzer {
    /**
     * Total Euclidean path length in pixels.
     * Zero events or single event → 0.
     */
    calculatePathLength(events) {
        if (events.length < 2)
            return 0;
        let total = 0;
        for (let i = 1; i < events.length; i++) {
            const dx = events[i].x - events[i - 1].x;
            const dy = events[i].y - events[i - 1].y;
            total += Math.sqrt(dx * dx + dy * dy);
        }
        return total;
    }
    /**
     * Acceleration asymmetry: ratio of upward to downward acceleration magnitudes.
     * Based on DMTG (arXiv:2410.18233): humans push upward against gravity differently
     * than they pull downward. Bots using constant-velocity interpolation produce ≈ 1.0.
     *
     * Returns 0 for pure horizontal movement or insufficient data.
     */
    calculateAccelAsymmetry(events) {
        if (events.length < 3)
            return 0;
        let upAccelSum = 0;
        let downAccelSum = 0;
        let upCount = 0;
        let downCount = 0;
        for (let i = 2; i < events.length; i++) {
            const dt1 = events[i - 1].t - events[i - 2].t;
            const dt2 = events[i].t - events[i - 1].t;
            if (dt1 <= 0 || dt2 <= 0)
                continue;
            const vy1 = (events[i - 1].y - events[i - 2].y) / dt1;
            const vy2 = (events[i].y - events[i - 1].y) / dt2;
            const accel = (vy2 - vy1) / ((dt1 + dt2) / 2);
            if (accel < 0) {
                // Upward acceleration (screen Y decreases upward)
                upAccelSum += Math.abs(accel);
                upCount++;
            }
            else if (accel > 0) {
                // Downward acceleration
                downAccelSum += Math.abs(accel);
                downCount++;
            }
        }
        if (upCount === 0 || downCount === 0)
            return 0;
        const upMean = upAccelSum / upCount;
        const downMean = downAccelSum / downCount;
        if (downMean === 0)
            return 0;
        return upMean / downMean;
    }
    /**
     * Jerk entropy via Structure Function DFA.
     * Approximates the Power Spectral Density slope of mouse acceleration.
     * Constant-velocity bots produce zero-variance acceleration → entropy ≈ 0.
     * Human biological 1/f noise produces non-zero entropy.
     *
     * Uses lag-4 structure function as a lightweight DFA proxy.
     */
    calculateJerkEntropy(events) {
        if (events.length < 6)
            return 0;
        // Calculate velocities
        const velocities = [];
        for (let i = 1; i < events.length; i++) {
            const dt = events[i].t - events[i - 1].t;
            if (dt <= 0)
                continue;
            const dx = events[i].x - events[i - 1].x;
            const dy = events[i].y - events[i - 1].y;
            velocities.push(Math.sqrt(dx * dx + dy * dy) / dt);
        }
        if (velocities.length < 5)
            return 0;
        // Calculate accelerations (jerk proxy)
        const accels = [];
        for (let i = 1; i < velocities.length; i++) {
            accels.push(velocities[i] - velocities[i - 1]);
        }
        if (accels.length < 4)
            return 0;
        // Structure Function at lag 4
        const lag = Math.min(4, Math.floor(accels.length / 2));
        let sfSum = 0;
        let sfCount = 0;
        for (let i = 0; i < accels.length - lag; i++) {
            const diff = accels[i + lag] - accels[i];
            sfSum += diff * diff;
            sfCount++;
        }
        if (sfCount === 0)
            return 0;
        const sf = sfSum / sfCount;
        // Structure Function at lag 1
        let sf1Sum = 0;
        let sf1Count = 0;
        for (let i = 0; i < accels.length - 1; i++) {
            const diff = accels[i + 1] - accels[i];
            sf1Sum += diff * diff;
            sf1Count++;
        }
        if (sf1Count === 0 || sf1Sum === 0)
            return 0;
        const sf1 = sf1Sum / sf1Count;
        // Slope approximation (log-log)
        if (sf <= 0 || sf1 <= 0)
            return 0;
        return Math.log(sf / sf1) / Math.log(lag);
    }
    /**
     * Variance of near-stationary pause durations (dwell times).
     * Humans pause to read with high variance (200ms–2000ms).
     * Bots with constant velocity show near-zero dwell variance.
     *
     * A "dwell" is detected when pointer moves < 5px between consecutive events.
     * Returns null if insufficient dwell events detected.
     */
    calculateDwellTimeVariance(events) {
        if (events.length < 3)
            return null;
        const dwells = [];
        for (let i = 1; i < events.length; i++) {
            const dx = events[i].x - events[i - 1].x;
            const dy = events[i].y - events[i - 1].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 5) {
                dwells.push(events[i].t - events[i - 1].t);
            }
        }
        if (dwells.length < 2)
            return null;
        const mean = dwells.reduce((a, b) => a + b, 0) / dwells.length;
        const variance = dwells.reduce((sum, d) => sum + (d - mean) ** 2, 0) / dwells.length;
        return variance;
    }
    /**
     * Fraction of physically impossible cursor jumps.
     * No human hand can move a mouse >150px in <10ms.
     * Score > 0.15 indicates automation.
     */
    calculateTeleportationScore(events) {
        if (events.length < 2)
            return 0;
        let teleportCount = 0;
        let totalSegments = 0;
        for (let i = 1; i < events.length; i++) {
            const dx = events[i].x - events[i - 1].x;
            const dy = events[i].y - events[i - 1].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const dt = events[i].t - events[i - 1].t;
            totalSegments++;
            if (dist > 150 && dt < 10) {
                teleportCount++;
            }
        }
        return totalSegments === 0 ? 0 : teleportCount / totalSegments;
    }
    /**
     * Event-loop clumping: variance of performance.now() deltas.
     * DOM-injected synthetic events share identical microsecond timestamps.
     * Real browser events have variable dispatch timing.
     * Returns 0 if no performance timestamps available.
     */
    calculateEventClumping(events) {
        const pTimestamps = events.filter(e => e.p !== undefined).map(e => e.p);
        if (pTimestamps.length < 3)
            return -1; // Not enough data
        const deltas = [];
        for (let i = 1; i < pTimestamps.length; i++) {
            deltas.push(pTimestamps[i] - pTimestamps[i - 1]);
        }
        const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const variance = deltas.reduce((sum, d) => sum + (d - mean) ** 2, 0) / deltas.length;
        return variance;
    }
    /**
     * Touch pressure/force variance from capacitive digitizer.
     * Real human fingers produce variable force readings.
     * Touch emulators output constant 0 pressure.
     * Returns null if no touch data present.
     */
    calculateTouchVariance(events) {
        const forces = events.filter(e => e.f !== undefined).map(e => e.f);
        if (forces.length < 2)
            return null;
        const mean = forces.reduce((a, b) => a + b, 0) / forces.length;
        const variance = forces.reduce((sum, f) => sum + (f - mean) ** 2, 0) / forces.length;
        return variance;
    }
    /**
     * Arc deviation: chord-to-arc ratio for path curvature.
     * Human thumb biomechanics force curved swipe paths.
     * Bots produce perfectly straight lines (arc deviation ≈ 1.0).
     *
     * Chord = direct distance start→end.
     * Arc = total path length.
     * Ratio = arc / chord. Perfect line = 1.0.
     */
    calculateArcDeviation(events) {
        if (events.length < 3)
            return 1.0;
        const first = events[0];
        const last = events[events.length - 1];
        const chordDx = last.x - first.x;
        const chordDy = last.y - first.y;
        const chord = Math.sqrt(chordDx * chordDx + chordDy * chordDy);
        if (chord < 10)
            return 1.0; // Too short to measure
        const arc = this.calculatePathLength(events);
        return arc / chord;
    }
    /**
     * Single-pass feature extraction for maximum performance.
     * Computes all behavioral signals in one merged loop over the events array,
     * then calculates derived features from accumulated values.
     */
    extractFeatures(events) {
        const n = events.length;
        // Accumulators
        let pathLength = 0;
        let upAccelSum = 0, downAccelSum = 0, upCount = 0, downCount = 0;
        let teleportCount = 0, totalSegments = 0;
        let untrustedCount = 0;
        let maxVelocity = 0, velocitySum = 0, velocityCount = 0;
        const dwells = [];
        const pDeltas = [];
        const velocities = [];
        const forces = [];
        // Path hash via simple DJB2
        let hash = 5381;
        for (let i = 0; i < n; i++) {
            const e = events[i];
            // Hash
            hash = ((hash << 5) + hash + (e.x ^ e.y)) >>> 0;
            // Untrusted
            if (e.tr === false)
                untrustedCount++;
            // Collect forces
            if (e.f !== undefined)
                forces.push(e.f);
            if (i === 0)
                continue;
            const prev = events[i - 1];
            const dx = e.x - prev.x;
            const dy = e.y - prev.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const dt = e.t - prev.t;
            // Path length
            pathLength += dist;
            // Velocity
            if (dt > 0) {
                const v = dist / dt;
                velocities.push(v);
                velocitySum += v;
                velocityCount++;
                if (v > maxVelocity)
                    maxVelocity = v;
            }
            // Teleportation
            totalSegments++;
            if (dist > 150 && dt < 10)
                teleportCount++;
            // Dwell detection (< 5px movement)
            if (dist < 5 && dt > 0) {
                dwells.push(dt);
            }
            // Performance.now() deltas
            if (e.p !== undefined && prev.p !== undefined) {
                pDeltas.push(e.p - prev.p);
            }
            // Acceleration (for asymmetry)
            if (i >= 2) {
                const prevPrev = events[i - 2];
                const dt1 = prev.t - prevPrev.t;
                const dt2 = e.t - prev.t;
                if (dt1 > 0 && dt2 > 0) {
                    const vy1 = (prev.y - prevPrev.y) / dt1;
                    const vy2 = (e.y - prev.y) / dt2;
                    const accel = (vy2 - vy1) / ((dt1 + dt2) / 2);
                    if (accel < 0) {
                        upAccelSum += Math.abs(accel);
                        upCount++;
                    }
                    else if (accel > 0) {
                        downAccelSum += Math.abs(accel);
                        downCount++;
                    }
                }
            }
        }
        // ── Derived calculations ──
        // Acceleration asymmetry
        let accelAsymmetry = 0;
        if (upCount > 0 && downCount > 0) {
            const upMean = upAccelSum / upCount;
            const downMean = downAccelSum / downCount;
            if (downMean > 0)
                accelAsymmetry = upMean / downMean;
        }
        // Jerk entropy from velocities
        const jerkEntropy = this._jerkEntropyFromVelocities(velocities);
        // Dwell variance
        let dwellTimeVariance = null;
        if (dwells.length >= 2) {
            const dMean = dwells.reduce((a, b) => a + b, 0) / dwells.length;
            dwellTimeVariance = dwells.reduce((s, d) => s + (d - dMean) ** 2, 0) / dwells.length;
        }
        // Event clumping
        let eventClumping = -1;
        if (pDeltas.length >= 2) {
            const pMean = pDeltas.reduce((a, b) => a + b, 0) / pDeltas.length;
            eventClumping = pDeltas.reduce((s, d) => s + (d - pMean) ** 2, 0) / pDeltas.length;
        }
        // Agent cadence detection (think-act pattern: gaps of 1-3s followed by bursts)
        let agentCadenceDetected = false;
        if (n >= 10) {
            let longGaps = 0;
            let shortBursts = 0;
            for (let i = 1; i < n; i++) {
                const dt = events[i].t - events[i - 1].t;
                if (dt >= 1000 && dt <= 3500)
                    longGaps++;
                else if (dt < 50)
                    shortBursts++;
            }
            // Agent pattern: multiple think pauses + action bursts
            if (longGaps >= 3 && shortBursts >= 5 && longGaps / (n - 1) > 0.15) {
                agentCadenceDetected = true;
            }
        }
        // Touch pressure variance
        let touchPressureVariance = null;
        if (forces.length >= 2) {
            const fMean = forces.reduce((a, b) => a + b, 0) / forces.length;
            touchPressureVariance = forces.reduce((s, f) => s + (f - fMean) ** 2, 0) / forces.length;
        }
        // Arc deviation
        let arcDeviation = 1.0;
        if (n >= 3) {
            const first = events[0];
            const last = events[n - 1];
            const chord = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
            if (chord >= 10) {
                arcDeviation = pathLength / chord;
            }
        }
        // Teleportation score
        const teleportationScore = totalSegments === 0 ? 0 : teleportCount / totalSegments;
        return {
            pathLength,
            accelAsymmetry,
            jerkEntropy,
            dwellTimeVariance,
            teleportationScore,
            eventClumping,
            agentCadenceDetected,
            touchPressureVariance,
            arcDeviation,
            pathHash: hash.toString(16),
            maxVelocity,
            meanVelocity: velocityCount > 0 ? velocitySum / velocityCount : 0,
            untrustedEventCount: untrustedCount,
            totalEventCount: n,
        };
    }
    /**
     * Internal: compute jerk entropy from pre-calculated velocities.
     * Used by extractFeatures to avoid recalculating velocities.
     */
    _jerkEntropyFromVelocities(velocities) {
        if (velocities.length < 5)
            return 0;
        const accels = [];
        for (let i = 1; i < velocities.length; i++) {
            accels.push(velocities[i] - velocities[i - 1]);
        }
        if (accels.length < 4)
            return 0;
        const lag = Math.min(4, Math.floor(accels.length / 2));
        let sfSum = 0, sfCount = 0;
        for (let i = 0; i < accels.length - lag; i++) {
            const diff = accels[i + lag] - accels[i];
            sfSum += diff * diff;
            sfCount++;
        }
        if (sfCount === 0)
            return 0;
        const sf = sfSum / sfCount;
        let sf1Sum = 0, sf1Count = 0;
        for (let i = 0; i < accels.length - 1; i++) {
            const diff = accels[i + 1] - accels[i];
            sf1Sum += diff * diff;
            sf1Count++;
        }
        if (sf1Count === 0 || sf1Sum === 0)
            return 0;
        const sf1 = sf1Sum / sf1Count;
        if (sf <= 0 || sf1 <= 0)
            return 0;
        return Math.log(sf / sf1) / Math.log(lag);
    }
}
exports.BehavioralAnalyzer = BehavioralAnalyzer;
