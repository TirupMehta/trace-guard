/**
 * Trace Guard — Protocol Analysis Layer
 *
 * Lightweight JA4 TLS fingerprint classifier.
 * Based on JA4 TLS fingerprinting research (arXiv:2602.09606):
 * TLS ClientHello metadata achieves 98%+ accuracy for identifying automated tools.
 *
 * Known limitation: full-stack emulators (Puppeteer/Playwright with headed Chrome)
 * produce identical JA4 to real browsers. That's why Trace Guard uses behavioral
 * analysis as the primary defense, not protocol analysis alone.
 *
 * Zero dependencies.
 *
 * @author Tirup Mehta
 * @license ISC
 */
export interface ProtocolResult {
    /** True if the JA4 matches a known scripting client (curl, python, etc.) */
    isKnownBot: boolean;
    /** True if the JA4 matches a known full-stack browser emulator */
    isFullStackEmulator: boolean;
    /** Human-readable label if matched */
    matchLabel: string;
}
export declare class ProtocolAnalyzer {
    /**
     * Analyze a JA4 TLS fingerprint string.
     * Returns classification: known bot, full-stack emulator, or unknown.
     */
    analyze(ja4: string): ProtocolResult;
}
