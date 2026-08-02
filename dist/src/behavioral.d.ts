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
export interface MouseEvent {
    /** X coordinate (pixels) */
    x: number;
    /** Y coordinate (pixels) */
    y: number;
    /** Timestamp (ms since epoch or relative) */
    t: number;
    /** performance.now() timestamp for event-loop clumping analysis */
    p?: number;
    /** Touch force (0.0–1.0) from capacitive digitizer */
    f?: number;
    /** Touch radiusX from digitizer */
    r?: number;
    /** isTrusted flag from the DOM event */
    tr?: boolean;
}
export interface BehavioralFeatures {
    /** Total Euclidean path length in pixels */
    pathLength: number;
    /** Ratio of upward to downward acceleration. Humans ≠ 1.0 due to gravity/biomechanics */
    accelAsymmetry: number;
    /** Structure Function DFA slope. Constant-velocity bots ≈ 0 */
    jerkEntropy: number;
    /** Variance of near-stationary pause durations. Bots ≈ 0, humans are high */
    dwellTimeVariance: number | null;
    /** Fraction of physically impossible jumps (>150px in <10ms) */
    teleportationScore: number;
    /** Variance of performance.now() deltas. DOM-injected ≈ 0 */
    eventClumping: number;
    /** Whether a think-act step pattern was detected */
    agentCadenceDetected: boolean;
    /** Variance of touch force readings. Emulators = 0 */
    touchPressureVariance: number | null;
    /** Chord-to-arc ratio. Perfect lines < 1.005 */
    arcDeviation: number;
    /** SHA-like hash of the path for replay detection */
    pathHash: string;
    /** Maximum velocity observed (px/ms) */
    maxVelocity: number;
    /** Mean velocity (px/ms) */
    meanVelocity: number;
    /** Count of events with isTrusted = false */
    untrustedEventCount: number;
    /** Total event count */
    totalEventCount: number;
}
export declare class BehavioralAnalyzer {
    /**
     * Total Euclidean path length in pixels.
     * Zero events or single event → 0.
     */
    calculatePathLength(events: MouseEvent[]): number;
    /**
     * Acceleration asymmetry: ratio of upward to downward acceleration magnitudes.
     * Based on DMTG (arXiv:2410.18233): humans push upward against gravity differently
     * than they pull downward. Bots using constant-velocity interpolation produce ≈ 1.0.
     *
     * Returns 0 for pure horizontal movement or insufficient data.
     */
    calculateAccelAsymmetry(events: MouseEvent[]): number;
    /**
     * Jerk entropy via Structure Function DFA.
     * Approximates the Power Spectral Density slope of mouse acceleration.
     * Constant-velocity bots produce zero-variance acceleration → entropy ≈ 0.
     * Human biological 1/f noise produces non-zero entropy.
     *
     * Uses lag-4 structure function as a lightweight DFA proxy.
     */
    calculateJerkEntropy(events: MouseEvent[]): number;
    /**
     * Variance of near-stationary pause durations (dwell times).
     * Humans pause to read with high variance (200ms–2000ms).
     * Bots with constant velocity show near-zero dwell variance.
     *
     * A "dwell" is detected when pointer moves < 5px between consecutive events.
     * Returns null if insufficient dwell events detected.
     */
    calculateDwellTimeVariance(events: MouseEvent[]): number | null;
    /**
     * Fraction of physically impossible cursor jumps.
     * No human hand can move a mouse >150px in <10ms.
     * Score > 0.15 indicates automation.
     */
    calculateTeleportationScore(events: MouseEvent[]): number;
    /**
     * Event-loop clumping: variance of performance.now() deltas.
     * DOM-injected synthetic events share identical microsecond timestamps.
     * Real browser events have variable dispatch timing.
     * Returns 0 if no performance timestamps available.
     */
    calculateEventClumping(events: MouseEvent[]): number;
    /**
     * Touch pressure/force variance from capacitive digitizer.
     * Real human fingers produce variable force readings.
     * Touch emulators output constant 0 pressure.
     * Returns null if no touch data present.
     */
    calculateTouchVariance(events: MouseEvent[]): number | null;
    /**
     * Arc deviation: chord-to-arc ratio for path curvature.
     * Human thumb biomechanics force curved swipe paths.
     * Bots produce perfectly straight lines (arc deviation ≈ 1.0).
     *
     * Chord = direct distance start→end.
     * Arc = total path length.
     * Ratio = arc / chord. Perfect line = 1.0.
     */
    calculateArcDeviation(events: MouseEvent[]): number;
    /**
     * Single-pass feature extraction for maximum performance.
     * Computes all behavioral signals in one merged loop over the events array,
     * then calculates derived features from accumulated values.
     */
    extractFeatures(events: MouseEvent[]): BehavioralFeatures;
    /**
     * Internal: compute jerk entropy from pre-calculated velocities.
     * Used by extractFeatures to avoid recalculating velocities.
     */
    private _jerkEntropyFromVelocities;
}
