export interface MouseEvent {
    x: number;
    y: number;
    t: number;
    p?: number;
    f?: number;
    r?: number;
    tr?: boolean;
}
export interface BehavioralFeatures {
    mstLength: number;
    avgVelocity: number;
    accelAsymmetry: number;
    jerkEntropy: number | null;
    /** Variance of "pause durations" (intervals where the pointer barely moves).
     *  Humans: high variance (200ms-2000ms pauses). Bots: near-zero variance.
     *  Null if fewer than 2 pauses detected.
     */
    dwellTimeVariance: number | null;
    /** Fraction of movements that are physically impossible teleportations.
     *  (>150px displacement in <10ms). Humans: ~0. Bots: can be >0.
     */
    teleportationScore: number;
    /** Score indicating AI agent "step-wise" cadence (Think-Act pattern).
     *  0.0 = Fluid continuous movement. 1.0 = Highly bursty/discrete steps.
     */
    agentStepScore: number;
    /** Stable hash of the movement trajectory (x,y points).
     *  Used for Replay Attack detection.
     */
    pathHash: string;
    /** Flag for mathematical smoothness (e.g. Bezier curves).
     *  Humans exhibit high-frequency tremor noise; bots are "too smooth".
     */
    isExcessivelySmooth: boolean;
    /** Score indicating physical biological tremor (8-12Hz noise).
     *  0.0 = Robotic. 1.0 = Highly biological jitter detected.
     */
    biologicalTremorScore: number;
    /** High-confidence biological verification flag.
     *  Set true if IRI (Inter-Reversal Interval) pattern matches human hand tremor.
     */
    isHumanVerified: boolean;
    touchVariance: number | null;
    arcDeviation: number | null;
    /** Variance of high-resolution timing deltas.
     *  0.0 = Synthetic DOM-injected event clump.
     */
    eventClumpingVariance: number | null;
}
export declare class BehavioralAnalyzer {
    calculatePathLength(events: MouseEvent[]): number;
    /**
     * Calculates acceleration asymmetry (Upward vs Downward).
     * Humans are physically asymmetric in pushing (up) vs pulling (down).
     * Reference: DMTG paper (arXiv:2410.18233).
     */
    calculateAccelAsymmetry(events: MouseEvent[]): number;
    /**
     * Approximates the Power Spectral Density slope of acceleration jitter.
     * Humans exhibit 'pink noise' (1/f) which has correlated fluctuations.
     * Bots often use random white noise (1/f^0) jitter which is uncorrelated.
     * We use a spatial Structure Function S2(tau) to find the scaling slope without a heavy FFT.
     * Reference: DFA methodology, arXiv:2410.18233.
     */
    calculateJerkEntropy(events: MouseEvent[]): number | null;
    /**
     * Calculates the variance of inter-event dwell durations.
     * A "dwell" is a near-stationary pause (pointer moves <5px within a time window).
     * Humans naturally pause to read/aim — high variance (50ms to 2s).
     * Bots using constant-velocity interpolation show near-zero dwell variance.
     * Returns null if fewer than 2 valid dwell segments are found.
     */
    calculateDwellTimeVariance(events: MouseEvent[]): number | null;
    /**
     * Calculates the teleportation score: fraction of movement events where
     * the pointer jumps >150px in <10ms — physically impossible for a human hand.
     * Bots replaying or linearly interpolating events can produce such jumps.
     * Score of 0.0 = no teleportations. Score of 1.0 = all moves are teleports.
     */
    calculateTeleportationScore(events: MouseEvent[]): number;
    /**
     * Evaluates if pressure/force fluctuates, inherently proving biological flesh.
     * If hardware does not supply unique pressure, it safely returns null.
     */
    calculateTouchVariance(events: MouseEvent[]): number | null;
    /**
     * Calculates "Event-Loop Clumping".
     * Synthetic Playwright bots inject batches of DOM events synchronously or with
     * strict timer intervals. Organic mice interrupt the browser's RequestAnimationFrame
     * with physical USB polling rate friction.
     * Near-zero variance here proves non-hardware scripting.
     */
    calculateEventClumping(events: MouseEvent[]): number | null;
    /**
     * Detects "Thumb Arc" Biomechanics.
     * Humans naturally swipe in a subtle arc because the thumb pivots at a joint constraints.
     * Perfect straight lines (chord length == path length) are likely robotic macros.
     */
    calculateArcDeviation(events: MouseEvent[], pathLength: number): number | null;
    extractFeatures(events: MouseEvent[]): BehavioralFeatures;
    /** Internal helper: compute jerk entropy from pre-computed velocity array. */
    private _jerkEntropyFromVelocities;
}
