export interface MouseEvent {
  x: number;
  y: number;
  t: number;
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
}

export class BehavioralAnalyzer {
  public calculatePathLength(events: MouseEvent[]): number {
    let length = 0;
    for (let i = 1; i < events.length; i++) {
      const dx = events[i].x - events[i - 1].x;
      const dy = events[i].y - events[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  /**
   * Calculates acceleration asymmetry (Upward vs Downward).
   * Humans are physically asymmetric in pushing (up) vs pulling (down).
   * Reference: DMTG paper (arXiv:2410.18233).
   */
  public calculateAccelAsymmetry(events: MouseEvent[]): number {
    let sumUp = 0;
    let countUp = 0;
    let sumDown = 0;
    let countDown = 0;

    for (let i = 2; i < events.length; i++) {
      const dt1 = events[i - 1].t - events[i - 2].t;
      const dt2 = events[i].t - events[i - 1].t;
      if (dt1 <= 0 || dt2 <= 0) continue;

      // Use directional velocity to distinguish push vs pull
      const dy1 = events[i - 1].y - events[i - 2].y;
      const dy2 = events[i].y - events[i - 1].y;
      const vy1 = dy1 / dt1;
      const vy2 = dy2 / dt2;

      const a = (vy2 - vy1) / dt2;

      // Check vertical direction
      if (vy2 < -0.1) {
        sumUp += Math.abs(a);
        countUp++;
      } else if (vy2 > 0.1) {
        sumDown += Math.abs(a);
        countDown++;
      }
    }

    const avgUp = countUp > 0 ? sumUp / countUp : 0;
    const avgDown = countDown > 0 ? sumDown / countDown : 0;

    // If completely horizontal, there is no vertical asymmetry.
    if (avgUp === 0 && avgDown === 0) return 0;
    if (avgDown === 0) return 100; // High ratio if only up accels
    
    return avgUp / avgDown;
  }

  /**
   * Approximates the Power Spectral Density slope of acceleration jitter.
   * Humans exhibit 'pink noise' (1/f) which has correlated fluctuations.
   * Bots often use random white noise (1/f^0) jitter which is uncorrelated.
   * We use a spatial Structure Function S2(tau) to find the scaling slope without a heavy FFT.
   * Reference: DFA methodology, arXiv:2410.18233.
   */
  public calculateJerkEntropy(events: MouseEvent[]): number | null {
    if (events.length < 10) return null;
    
    const accels: number[] = [];
    for (let i = 2; i < events.length; i++) {
      const dt1 = events[i - 1].t - events[i - 2].t;
      const dt2 = events[i].t - events[i - 1].t;
      if (dt1 <= 0 || dt2 <= 0) continue;

      const dx1 = events[i - 1].x - events[i - 2].x;
      const dy1 = events[i - 1].y - events[i - 2].y;
      const dx2 = events[i].x - events[i - 1].x;
      const dy2 = events[i].y - events[i - 1].y;

      const v1 = Math.sqrt(dx1*dx1 + dy1*dy1) / dt1;
      const v2 = Math.sqrt(dx2*dx2 + dy2*dy2) / dt2;
      accels.push((v2 - v1) / dt2);
    }

    if (accels.length < 5) return null;

    let s2_lag1 = 0;
    for (let i = 0; i < accels.length - 1; i++) {
      const diff = accels[i + 1] - accels[i];
      s2_lag1 += diff * diff;
    }
    s2_lag1 /= (accels.length - 1);

    const lag = Math.min(4, Math.floor(accels.length / 2));
    if (lag < 2) return null;
    
    let s2_lagN = 0;
    for (let i = 0; i < accels.length - lag; i++) {
        const diff = accels[i + lag] - accels[i];
        s2_lagN += diff * diff;
    }
    s2_lagN /= (accels.length - lag);

    if (s2_lag1 === 0 || s2_lagN === 0) return 0;

    // Slope of log(S2) vs log(tau). 
    // Bots (white noise) ≈ 0. Humans (correlated pink noise) > 0.
    return (Math.log(s2_lagN) - Math.log(s2_lag1)) / (Math.log(lag) - Math.log(1));
  }

  /**
   * Calculates the variance of inter-event dwell durations.
   * A "dwell" is a near-stationary pause (pointer moves <5px within a time window).
   * Humans naturally pause to read/aim — high variance (50ms to 2s).
   * Bots using constant-velocity interpolation show near-zero dwell variance.
   * Returns null if fewer than 2 valid dwell segments are found.
   */
  public calculateDwellTimeVariance(events: MouseEvent[]): number | null {
    if (events.length < 4) return null;

    // Collect inter-event deltas where displacement < 5px (stationary intervals)
    const dwellDurations: number[] = [];
    for (let i = 1; i < events.length; i++) {
      const dx = events[i].x - events[i - 1].x;
      const dy = events[i].y - events[i - 1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt = events[i].t - events[i - 1].t;
      if (dt <= 0) continue;
      // Stationary: very little movement relative to time elapsed
      if (dist < 5) {
        dwellDurations.push(dt);
      }
    }

    if (dwellDurations.length < 2) return null;

    // Calculate variance (streaming — no extra array allocations)
    let sum = 0;
    let sumSq = 0;
    const n = dwellDurations.length;
    for (let i = 0; i < n; i++) {
      sum += dwellDurations[i];
      sumSq += dwellDurations[i] * dwellDurations[i];
    }
    const mean = sum / n;
    const variance = (sumSq / n) - (mean * mean);
    return variance < 0 ? 0 : variance; // guard against float precision errors
  }

  /**
   * Calculates the teleportation score: fraction of movement events where
   * the pointer jumps >150px in <10ms — physically impossible for a human hand.
   * Bots replaying or linearly interpolating events can produce such jumps.
   * Score of 0.0 = no teleportations. Score of 1.0 = all moves are teleports.
   */
  public calculateTeleportationScore(events: MouseEvent[]): number {
    if (events.length < 2) return 0;

    const TELEPORT_DIST_PX = 150;
    const TELEPORT_TIME_MS = 10;

    let teleports = 0;
    let total = 0;
    for (let i = 1; i < events.length; i++) {
      const dx = events[i].x - events[i - 1].x;
      const dy = events[i].y - events[i - 1].y;
      const dt = events[i].t - events[i - 1].t;
      if (dt < 0) continue; // malformed — skip
      const dist = Math.sqrt(dx * dx + dy * dy);
      total++;
      if (dist > TELEPORT_DIST_PX && dt < TELEPORT_TIME_MS) {
        teleports++;
      }
    }

    return total > 0 ? teleports / total : 0;
  }

  public extractFeatures(events: MouseEvent[]): BehavioralFeatures {
    if (events.length < 3) {
      return {
        mstLength: 0,
        avgVelocity: 0,
        accelAsymmetry: 0,
        jerkEntropy: null,
        dwellTimeVariance: null,
        teleportationScore: 0,
        agentStepScore: 0,
        pathHash: '',
        isExcessivelySmooth: false,
        biologicalTremorScore: 0,
        isHumanVerified: false,
      };
    }

    // -----------------------------------------------------------------------
    // MERGED HOT LOOP: Single-pass computation of path length, acceleration
    // asymmetry, dwell-time statistics, teleportation, and agent cadence.
    // -----------------------------------------------------------------------
    const TELEPORT_DIST_PX = 150;
    const TELEPORT_TIME_MS = 10;
    const DWELL_DIST_PX = 5;
    const AGENT_THINK_THRESHOLD_MS = 400; // Hardened: typical VLM latency floor reduced to 400ms

    let pathLength = 0;
    let sumUp = 0, countUp = 0, sumDown = 0, countDown = 0;
    let teleports = 0;
    let totalMoves = 0;
    let thinkPauses = 0;
    let activeBursts = 0;
    let lastWasPause = false;

    const dwellDurations: number[] = [];
    const velocities: number[] = [];

    for (let i = 1; i < events.length; i++) {
      const dx = events[i].x - events[i - 1].x;
      const dy = events[i].y - events[i - 1].y;
      const dt = events[i].t - events[i - 1].t;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      pathLength += dist;

      // Teleportation & Movement check
      if (dt >= 0) {
        totalMoves++;
        if (dist > TELEPORT_DIST_PX && dt < TELEPORT_TIME_MS) {
          teleports++;
        }

        // Agent Cadence: Look for "Think-Act" transitions
        if (dt > AGENT_THINK_THRESHOLD_MS) {
          thinkPauses++;
          lastWasPause = true;
        } else if (dist > 5 && lastWasPause) {
          // Movement burst immediately after a long pause
          activeBursts++;
          lastWasPause = false;
        }
      }

      // Dwell: near-stationary if dist < 5px
      if (dt > 0 && dist < DWELL_DIST_PX) {
        dwellDurations.push(dt);
      }

      // Velocity for jerk entropy and acceleration asymmetry
      if (dt > 0) {
        velocities.push(dist / dt);
      } else {
        velocities.push(0);
      }

      // Acceleration asymmetry (requires 3 points: i >= 2)
      if (i >= 2) {
        const dt1 = events[i - 1].t - events[i - 2].t;
        const dt2 = dt;
        if (dt1 > 0 && dt2 > 0) {
          const vy1 = (events[i - 1].y - events[i - 2].y) / dt1;
          const vy2 = dy / dt2;
          const a = (vy2 - vy1) / dt2;
          if (vy2 < -0.1) {
            sumUp += Math.abs(a);
            countUp++;
          } else if (vy2 > 0.1) {
            sumDown += Math.abs(a);
            countDown++;
          }
        }
      }
    }

    // Teleportation score
    const teleportationScore = totalMoves > 0 ? teleports / totalMoves : 0;

    // Acceleration asymmetry
    const avgUp = countUp > 0 ? sumUp / countUp : 0;
    const avgDown = countDown > 0 ? sumDown / countDown : 0;
    let accelAsymmetry: number;
    if (avgUp === 0 && avgDown === 0) accelAsymmetry = 0;
    else if (avgDown === 0) accelAsymmetry = 100;
    else accelAsymmetry = avgUp / avgDown;

    // Dwell-time variance (streaming)
    let dwellTimeVariance: number | null = null;
    if (dwellDurations.length >= 2) {
      let sum = 0, sumSq = 0;
      const n = dwellDurations.length;
      for (let i = 0; i < n; i++) {
        sum += dwellDurations[i];
        sumSq += dwellDurations[i] * dwellDurations[i];
      }
      const mean = sum / n;
      const v = (sumSq / n) - (mean * mean);
      dwellTimeVariance = v < 0 ? 0 : v;
    }

    // Average velocity
    const duration = events[events.length - 1].t - events[0].t;
    const avgVelocity = duration > 0 ? pathLength / duration : 0;

    // Agent Step Score: Ratio of Think-Act transitions to total moves (normalized)
    const agentStepScore = totalMoves > 5 ? Math.min((thinkPauses + activeBursts) / 10, 1.0) : 0;

    // Path Hash: DJB2 hash of the unique coordinate sequence
    // v3.4.2 Protection: Only hash significant paths (> 20px) to avoid twitch collisions.
    let pathHash = '';
    if (pathLength > 20) {
        let hash = 5381;
        for (let i = 0; i < events.length; i++) {
            hash = ((hash << 5) + hash) + events[i].x;
            hash = ((hash << 5) + hash) + events[i].y;
        }
        pathHash = (hash >>> 0).toString(16);
    }

    // Jerk entropy (needs velocity array — computed above)
    const jerkEntropy = this._jerkEntropyFromVelocities(velocities);

    // Excessive Smoothness Detection:
    // We analyze the variance of Jerk (rate of change of accel).
    // Cubic Beziers have linear jerk (constant derivative), meaning very low jerk variance.
    let isExcessivelySmooth = false;
    if (velocities.length > 10) {
        let jerkSum = 0, jerkSumSq = 0, jerkCount = 0;
        for (let i = 2; i < velocities.length - 1; i++) {
           const a1 = velocities[i] - velocities[i-1];
           const a2 = velocities[i+1] - velocities[i];
           const jerk = Math.abs(a2 - a1);
           jerkSum += jerk;
           jerkSumSq += jerk * jerk;
           jerkCount++;
        }
        const jerkMean = jerkSum / jerkCount;
        const jerkVar = (jerkSumSq / jerkCount) - (jerkMean * jerkMean);
        // If jerk is too consistent (low variance) relative to velocity, it's a spline.
        if (jerkCount > 5 && jerkVar < 0.001) isExcessivelySmooth = true;
    }

    // Biological Tremor Verification (v3.4.4 Calibration):
    // Humans have 8-12Hz physiological oscillations.
    // We count reversals AND measure their interval timing.
    let microReversals = 0;
    let bioIntervals = 0;
    let lastReversalIdx = 0;

    for (let i = 2; i < velocities.length - 1; i++) {
        const dv1 = velocities[i] - velocities[i-1];
        const dv2 = velocities[i+1] - velocities[i];
        const amp = Math.abs(dv2 - dv1);
        
        if (Math.sign(dv1) !== Math.sign(dv2) && amp > 0.05 && amp < 2.0) {
            microReversals++;
            const interval = i - lastReversalIdx;
            // Human hand: At 60FPS (16.6ms), a 10Hz reversal occurs 
            // every ~3 samples (half cycle at 10Hz = 50ms).
            // Valid biological band: 2 to 5 samples between reversals.
            if (interval >= 2 && interval <= 5) {
                bioIntervals++;
            }
            lastReversalIdx = i;
        }
    }
    
    // v3.6.0 Hardened: Requires 10 intervals for high-confidence biological presence.
    const isHumanVerified = bioIntervals >= 10;
    const biologicalTremorScore = (velocities.length > 10) ? Math.min(bioIntervals / 10, 1.0) : 0;

    return {
      mstLength: pathLength,
      avgVelocity,
      accelAsymmetry,
      jerkEntropy,
      dwellTimeVariance,
      teleportationScore,
      agentStepScore,
      pathHash,
      isExcessivelySmooth,
      biologicalTremorScore,
      isHumanVerified,
    };
  }

  /** Internal helper: compute jerk entropy from pre-computed velocity array. */
  private _jerkEntropyFromVelocities(velocities: number[]): number | null {
    if (velocities.length < 5) return null;

    // Build accel array from velocities (need dt information — approximated in extractFeatures)
    // For entropy we use the already-built accels inline
    // This is called only from extractFeatures — unit tests call calculateJerkEntropy directly.
    // We reuse the same S2 structure function logic but on the velocity differences as proxy.
    let s2_lag1 = 0;
    const n = velocities.length;
    for (let i = 0; i < n - 1; i++) {
      const diff = velocities[i + 1] - velocities[i];
      s2_lag1 += diff * diff;
    }
    s2_lag1 /= (n - 1);

    const lag = Math.min(4, Math.floor(n / 2));
    if (lag < 2) return null;

    let s2_lagN = 0;
    for (let i = 0; i < n - lag; i++) {
      const diff = velocities[i + lag] - velocities[i];
      s2_lagN += diff * diff;
    }
    s2_lagN /= (n - lag);

    if (s2_lag1 === 0 || s2_lagN === 0) return 0;
    return (Math.log(s2_lagN) - Math.log(s2_lag1)) / (Math.log(lag) - Math.log(1));
  }

}
