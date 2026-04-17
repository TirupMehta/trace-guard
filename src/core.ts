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
        headless?: boolean
      };
      challengeSolved?: boolean;
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
      totalScore += 60; // Restored to legacy 60 pts
      reasons.push('AGENT_CADENCE_DETECTED');
    }

    // Teleportation: Big jumps are a strong block signal on their own
    if (features.teleportationScore > 0.15) {
      totalScore += 80;
      reasons.push('TELEPORTATION_DETECTED');
    }

    // v3.5.0 Stable Weights: Behavioral anomalies are supplemental.
    // v3.5.2: Cap all behavioral signals at 30 pts.
    let behavioralScore = 0;

    if (features.jerkEntropy !== null) {
        if (features.jerkEntropy < 0.3) {
            behavioralScore += 15; 
            reasons.push('LACKS_BIOLOGICAL_JITTER'); 
        } else if (features.jerkEntropy > 1.2) {
            behavioralScore += 10; 
            reasons.push('HIGH_ENTROPY_ANOMALY');
        }
    }

    if (features.isExcessivelySmooth) {
        behavioralScore += 10; 
        reasons.push('EXCESSIVE_SMOOTHNESS_DETECTION');
    }

    const isVertical = Math.abs(mouseEvents[mouseEvents.length - 1].y - mouseEvents[0].y) > 50;
    const isHorizontal = Math.abs(mouseEvents[mouseEvents.length - 1].x - mouseEvents[0].x) > 50;
    
    // Inhuman Precision: Flags linear bots
    const hasInhumanPrecision = ((features.accelAsymmetry >= 0.99 && features.accelAsymmetry <= 1.01)
      || (features.accelAsymmetry === 0 && (isVertical || isHorizontal)));
    
    if (hasInhumanPrecision && features.mstLength > 50 && (isVertical || isHorizontal)) {
      behavioralScore += 15; 
      reasons.push('BEHAVIORAL_SYMMETRY_DETECTED'); 
    }

    // Dwell variance: Mechanical regularity
    const hasMechanicalDwellPattern = features.dwellTimeVariance !== null
      && features.dwellTimeVariance < 1;
    
    if (hasMechanicalDwellPattern) {
      behavioralScore += 10;
      reasons.push('MECHANICAL_DWELL_PATTERN');
    }

    // CAP BEHAVIOR: v3.6.0 Hardened Cap to 80 to allow behavioral-only blocks.
    totalScore += Math.min(behavioralScore, 80);

    // --- TIER 3: HUMANITY VERIFICATION (v3.5.1 HEAL) ---
    // Biological Tremor Verification: The proof of physical presence.
    const hasCriticalBotSignal = !!(options?.automation?.webdriver || options?.automation?.headless || features.agentStepScore > 0.4);
    
    if (features.isHumanVerified && !hasCriticalBotSignal) {
      totalScore -= 30; // v3.6.0: Reduced from 40 to ensure high-entropy bots don't heal too fast
      reasons.push('BIOLOGICAL_TREMOR_VERIFIED');
    }

    // v3.6.0: Challenge Solved Bypass
    if (options?.challengeSolved) {
        totalScore -= 60; // Significant pull towards ALLOW
        reasons.push('CHALLENGE_SOLVED_BY_USER');
    }

    // --- TIER 4: DECISION MATRIX ---

    // Final normalization
    const score = Math.max(0, Math.min(totalScore / 100, 1.0));
    let decision: 'allow' | 'challenge' | 'block' = 'allow';
    
    if (score >= 0.8) decision = 'block';
    else if (score >= 0.4) decision = 'challenge';

    // Legacy support: Default reason if everything is clean
    const reason = reasons.length > 0 ? reasons.join(' + ') : 'CONSISTENT_HUMAN_TRAJECTORY';

    // Special case: empty movement
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
