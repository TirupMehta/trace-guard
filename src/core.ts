import { BehavioralAnalyzer, MouseEvent } from './behavioral';
import { ProtocolAnalyzer } from './protocol';

export class TraceGuardAI {
  private behavioral = new BehavioralAnalyzer();
  private protocol = new ProtocolAnalyzer();
  private pathCache = new Set<string>(); // Simple replay detection cache

  public analyzeSession(
    ja4: string, 
    mouseEvents: MouseEvent[],
    options?: { 
      decoyTriggered?: boolean,
      trapId?: string,
      automation?: {
        webdriver?: boolean,
        chrome?: boolean,
        languages?: boolean,
        plugins?: boolean,
        notification?: boolean,
        headless?: boolean,
        softwareRenderer?: boolean,
        nativePatched?: boolean,
      };
      challengeSolved?: boolean;
      isMobile?: boolean; // Trace Guard mobile touch-event identifier
    }
  ): {
    score: number;
    decision: 'allow' | 'challenge' | 'block';
    reason: string;
    features: any; // Expose telemetry for transparency
  } {
    let totalScore = 0;
    let reasons: string[] = [];

    // --- TIER 0: CRITICAL SIGNALS (100 PTS) ---

    if (options?.decoyTriggered) {
      return { score: 1.0, decision: 'block', reason: 'HONEY_PROMPT_TRIGGERED', features: {} };
    }

    if (this.protocol.analyzeFingerprint(ja4).isKnownBot) {
      return { score: 1.0, decision: 'block', reason: 'JA4_PROTOCOL_MATCH_SCRIPT', features: {} };
    }

    // --- TIER 1: AUTOMATION & AGENT SIGNALS ---

    // v3.6.7: Differentiate partial untrusted events vs ALL untrusted events.
    // A single synthetic event in a real session (isTrusted=false) is already a hard block.
    // Use a counting loop — no array allocation — to stay allocation-free in the hot path.
    let untrustedCount = 0;
    for (let i = 0; i < mouseEvents.length; i++) {
      if (mouseEvents[i].tr === false) untrustedCount++;
    }
    if (untrustedCount > 0) {
      // If every collected event is flagged as synthetic, this is a DOM-injection script
      if (untrustedCount === mouseEvents.length) {
        totalScore += 100;
        reasons.push('ALL_EVENTS_SYNTHETIC_INJECTION');
      } else {
        totalScore += 100;
        reasons.push('UNTRUSTED_DOM_EVENTS');
      }
    }

    if (options?.automation) {
      const auto = options.automation;
      if (auto.webdriver) {
        totalScore += 80;
        reasons.push('AUTOMATION_WEBDRIVER_DETECTION');
      }
      if (auto.headless || (ja4.includes('chrome') && !auto.chrome)) {
        totalScore += 40; 
        reasons.push('HEADLESS_BROWSER_ANOMALY');
      }
      if (auto.languages === false || auto.plugins === false) {
        totalScore += 25;
        reasons.push('INCONSISTENT_BROWSER_FEATURES');
      }
      if (auto.softwareRenderer) {
        totalScore += 100; // Unambiguous headless VM hardware flag
        reasons.push('WEBGL_SOFTWARE_RENDERER_DETECTED');
      }
      if (auto.nativePatched) {
        totalScore += 100; // Scripts overriding console or window functions
        reasons.push('NATIVE_PROTOTYPE_POISONING');
      }
    }

    // Fast-path: already over the block threshold, no need to run expensive behavioral analysis
    if (totalScore >= 80) {
      const score = Math.min(totalScore / 100, 1.0);
      const decision: 'allow' | 'challenge' | 'block' = score >= 0.8 ? 'block' : 'challenge';
      return { score, decision, reason: reasons.join(' + '), features: {} };
    }

    // --- TIER 2: BEHAVIORAL & CADENCE SIGNALS ---

    const features = this.behavioral.extractFeatures(mouseEvents);

    // Replay Attack Detection (Exact path match)
    if (features.pathHash && this.pathCache.has(features.pathHash)) {
      totalScore += 100;
      reasons.push('REPLAY_ATTACK_DETECTED');
    } else if (features.pathHash) {
      this.pathCache.add(features.pathHash);
      if (this.pathCache.size > 1000) {
        const first = this.pathCache.values().next().value;
        if (first !== undefined) this.pathCache.delete(first);
      }
    }

    // AI Agent Cadence: Snap-Act pattern (Think -> Act -> Read)
    if (features.agentStepScore > 0.4) {
      totalScore += 60;
      reasons.push('AGENT_CADENCE_DETECTED');
    }

    // Teleportation: Big jumps are a strong block signal on their own
    if (features.teleportationScore > 0.15) {
      totalScore += 80;
      reasons.push('TELEPORTATION_DETECTED');
    }

    // Behavioral anomalies (capped at 100 to allow behavioral-only instant blocks)
    let behavioralScore = 0;

    if (features.jerkEntropy !== null) {
      if (features.jerkEntropy < 0.001) {
        behavioralScore += 60; 
        reasons.push('LACKS_BIOLOGICAL_JITTER'); 
      } else if (features.jerkEntropy > 1.2) {
        behavioralScore += 10; 
        reasons.push('HIGH_ENTROPY_ANOMALY');
      }
    }

    if (features.isExcessivelySmooth) {
      behavioralScore += 50; 
      reasons.push('EXCESSIVE_SMOOTHNESS_DETECTION');
    }

    // EVENT-LOOP DEFENSE: timing variance identical or physically impossible → scripted event injection
    if (features.eventClumpingVariance !== null && features.eventClumpingVariance < 0.0001) {
      behavioralScore += 100;
      reasons.push('EVENT_LOOP_CLUMPING_DETECTED');
    }

    // Dwell variance: Mechanical regularity
    if (features.dwellTimeVariance !== null && features.dwellTimeVariance < 0.1) {
      behavioralScore += 10;
      reasons.push('MECHANICAL_DWELL_PATTERN');
    }

    // PRECISION DETECTION: v3.6.7 fix — apply to BOTH axes, not just vertical.
    // A perfectly linear path in ANY direction (accelAsymmetry ≈ 0 because no vertical component,
    // but arcDeviation close to 1.0 or exactly 1.0) is a bot signal.
    // We combine arc-linearity with jerk entropy low score for higher confidence.
    const isPerfectlyLinear =
      features.arcDeviation !== null &&
      features.arcDeviation > 0 &&
      features.arcDeviation < 1.002 && // covers both perfectly horizontal and vertical paths
      features.mstLength > 50;         // only flag paths with meaningful length

    if (options?.isMobile) {
      const isTouchEmulator = features.touchVariance !== null && features.touchVariance === 0;
      if (isTouchEmulator && features.mstLength > 100) {
        behavioralScore += 100;
        reasons.push('STATIC_TOUCH_PRESSURE_ANOMALY');
      }
      // Mobile: slightly looser threshold (1.005) because human thumb swipes are imprecise
      const isLineBotMobile = features.arcDeviation !== null &&
        features.arcDeviation > 0 &&
        features.arcDeviation < 1.005 &&
        features.mstLength > 100;
      if (isLineBotMobile) {
        behavioralScore += 100;
        reasons.push('LINEAR_SWIPE_ARC_ANOMALY');
      }
    } else {
      // Desktop: strict threshold + universal axis check (v3.6.7 Horizontal Blind Spot Fix)
      if (isPerfectlyLinear) {
        behavioralScore += 100;
        reasons.push('PERFECT_LINEAR_TRAJECTORY');
      }
    }

    // CAP BEHAVIOR: cap at 100 to allow behavioral-only instant blocks
    totalScore += Math.min(behavioralScore, 100);

    // --- TIER 3: HUMANITY VERIFICATION ---
    // Biological Tremor Verification: proof of physical presence.
    // Do NOT apply if hardware/software automation signals are already confirmed.
    const hasCriticalBotSignal = !!(options?.automation?.webdriver || options?.automation?.headless);
    
    if (features.isHumanVerified && !hasCriticalBotSignal) {
      totalScore -= 40;
      reasons.push('BIOLOGICAL_TREMOR_VERIFIED');
    }

    // Challenge Solved Bypass: user successfully clicked the Turing challenge button
    if (options?.challengeSolved) {
      totalScore -= 60;
      reasons.push('CHALLENGE_SOLVED_BY_USER');
    }

    // --- TIER 4: DECISION MATRIX ---

    // Final normalization
    const score = Math.max(0, Math.min(totalScore / 100, 1.0));
    let decision: 'allow' | 'challenge' | 'block' = 'allow';
    
    if (score >= 0.8) decision = 'block';
    else if (score >= 0.4) decision = 'challenge';

    // Default reason if everything is clean
    const reason = reasons.length > 0 ? reasons.join(' + ') : 'CONSISTENT_HUMAN_TRAJECTORY';

    // Special case: empty movement — no telemetry yet, issue a soft challenge
    if (features.mstLength === 0 && mouseEvents.length > 0) {
      return { score: 0.5, decision: 'challenge', reason: 'INSUFFICIENT_BEHAVIORAL_SIGNAL', features };
    }

    return { 
      score, 
      decision, 
      reason,
      features 
    };
  }
}
