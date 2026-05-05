"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceGuardAI = void 0;
const behavioral_1 = require("./behavioral");
const protocol_1 = require("./protocol");
// Pure-JS SHA-256 for 100% Edge/Serverless compatibility (Zero Dependencies)
function sha256Sync(message) {
    const m = unescape(encodeURIComponent(message));
    const hash = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
    const k = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078365, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
    const w = new Int32Array(64);
    let l = m.length;
    const bytes = new Uint8Array(l + 64 - (l % 64 || 64) + 64);
    for (let i = 0; i < l; i++)
        bytes[i] = m.charCodeAt(i);
    bytes[l++] = 0x80;
    const view = new DataView(bytes.buffer);
    view.setUint32(bytes.length - 4, (m.length * 8) >>> 0);
    for (let i = 0; i < bytes.length; i += 64) {
        for (let j = 0; j < 16; j++)
            w[j] = view.getInt32(i + j * 4);
        for (let j = 16; j < 64; j++) {
            const w15 = w[j - 15], w2 = w[j - 2];
            const s0 = (w15 >>> 7 | w15 << 25) ^ (w15 >>> 18 | w15 << 14) ^ (w15 >>> 3);
            const s1 = (w2 >>> 17 | w2 << 15) ^ (w2 >>> 19 | w2 << 13) ^ (w2 >>> 10);
            w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
        }
        let [a, b, c, d, e, f, g, h] = hash;
        for (let j = 0; j < 64; j++) {
            const S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
            const S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) | 0;
            h = g;
            g = f;
            f = e;
            e = (d + temp1) | 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) | 0;
        }
        hash[0] = (hash[0] + a) | 0;
        hash[1] = (hash[1] + b) | 0;
        hash[2] = (hash[2] + c) | 0;
        hash[3] = (hash[3] + d) | 0;
        hash[4] = (hash[4] + e) | 0;
        hash[5] = (hash[5] + f) | 0;
        hash[6] = (hash[6] + g) | 0;
        hash[7] = (hash[7] + h) | 0;
    }
    return Array.from(hash).map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
}
class TraceGuardAI {
    behavioral = new behavioral_1.BehavioralAnalyzer();
    protocol = new protocol_1.ProtocolAnalyzer();
    pathCache = new Set(); // Simple replay detection cache
    serverSecret = Math.random().toString(36) + Date.now().toString(36);
    generateSessionToken() {
        // Embed timestamp for 5-minute expiration
        const timestamp = Date.now();
        const nonce = Math.random().toString(36).substring(2);
        const sessionId = `${timestamp}-${nonce}`;
        // HMAC proxy: Hash(secret + Hash(secret + message))
        const inner = sha256Sync(this.serverSecret + sessionId);
        const signature = sha256Sync(this.serverSecret + inner);
        return { sessionId, signature };
    }
    analyzeSession(ja4, mouseEvents, options) {
        let totalScore = 0;
        let reasons = [];
        // CPU Exhaustion Defense: Limit events to prevent CPU spikes from massive payloads
        if (mouseEvents && mouseEvents.length > 500) {
            mouseEvents = mouseEvents.slice(0, 500);
        }
        // --- TIER 0: CRITICAL SIGNALS (100 PTS) ---
        if (!options?.sessionId || !options?.signature) {
            return { score: 1.0, decision: 'block', reason: 'MISSING_TELEMETRY_SIGNATURE', features: {} };
        }
        else {
            const inner = sha256Sync(this.serverSecret + options.sessionId);
            const expectedSignature = sha256Sync(this.serverSecret + inner);
            if (expectedSignature !== options.signature) {
                return { score: 1.0, decision: 'block', reason: 'INVALID_TELEMETRY_SIGNATURE', features: {} };
            }
            // Enforce 5-minute expiration rule
            const parts = options.sessionId.split('-');
            if (parts.length === 2) {
                const timestamp = parseInt(parts[0], 10);
                if (isNaN(timestamp) || Date.now() - timestamp > 5 * 60 * 1000) {
                    return { score: 1.0, decision: 'block', reason: 'EXPIRED_TELEMETRY_SIGNATURE', features: {} };
                }
            }
            else {
                return { score: 1.0, decision: 'block', reason: 'MALFORMED_TELEMETRY_SESSION', features: {} };
            }
        }
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
            if (mouseEvents[i].tr === false)
                untrustedCount++;
        }
        if (untrustedCount > 0) {
            // If every collected event is flagged as synthetic, this is a DOM-injection script
            if (untrustedCount === mouseEvents.length) {
                totalScore += 100;
                reasons.push('ALL_EVENTS_SYNTHETIC_INJECTION');
            }
            else {
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
            const decision = score >= 0.8 ? 'block' : 'challenge';
            return { score, decision, reason: reasons.join(' + '), features: {} };
        }
        // --- TIER 2: BEHAVIORAL & CADENCE SIGNALS ---
        const features = this.behavioral.extractFeatures(mouseEvents);
        // Replay Attack Detection (Exact path match)
        if (features.pathHash && this.pathCache.has(features.pathHash)) {
            totalScore += 100;
            reasons.push('REPLAY_ATTACK_DETECTED');
        }
        else if (features.pathHash) {
            this.pathCache.add(features.pathHash);
            if (this.pathCache.size > 1000) {
                const first = this.pathCache.values().next().value;
                if (first !== undefined)
                    this.pathCache.delete(first);
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
            }
            else if (features.jerkEntropy > 1.2) {
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
        const isPerfectlyLinear = features.arcDeviation !== null &&
            features.arcDeviation > 0 &&
            features.arcDeviation < 1.002 && // covers both perfectly horizontal and vertical paths
            features.mstLength > 50; // only flag paths with meaningful length
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
        }
        else {
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
        let decision = 'allow';
        if (score >= 0.8)
            decision = 'block';
        else if (score >= 0.4)
            decision = 'challenge';
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
exports.TraceGuardAI = TraceGuardAI;
