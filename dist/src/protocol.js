"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolAnalyzer = void 0;
/**
 * Known script-based automation JA4 fingerprint prefixes.
 * These are non-browser HTTP clients that cannot render JavaScript.
 * Format: JA4 hash prefix → label
 */
const SCRIPT_SIGNATURES = {
    // Python requests library
    't13d1516h2_8daaf6152771': 'python-requests',
    // curl
    't13d1517h2_8daaf6152771': 'curl',
    // wget
    't13d1516h2_e5627efa2ab1': 'wget',
    // Node.js undici/fetch
    't13d1517h2_a56c5b726c34': 'node-fetch',
    // Go net/http
    't13d1516h2_2bab15409345': 'go-http',
    // httpie
    't13d1516h2_fcb2f0568783': 'httpie',
    // scrapy
    't13d1516h2_3e3bde12f447': 'scrapy',
};
/**
 * Known browser emulator JA4 fingerprint prefixes.
 * These are full browsers controlled by automation frameworks.
 * They render JavaScript but are not operated by humans.
 */
const EMULATOR_SIGNATURES = {
    // Playwright Chromium (headless)
    't13d1715h2_5b57614c22b0': 'playwright-chromium-headless',
    // Puppeteer headless Chrome
    't13d1715h2_8a1c67f425e8': 'puppeteer-headless',
    // Selenium WebDriver Chrome
    't13d1715h2_e725af00e684': 'selenium-chrome',
    // Playwright Firefox (headless)
    't12d1715h2_a56f92dcb23c': 'playwright-firefox-headless',
};
class ProtocolAnalyzer {
    /**
     * Analyze a JA4 TLS fingerprint string.
     * Returns classification: known bot, full-stack emulator, or unknown.
     */
    analyze(ja4) {
        if (!ja4 || typeof ja4 !== 'string') {
            return { isKnownBot: false, isFullStackEmulator: false, matchLabel: 'no_fingerprint' };
        }
        const normalized = ja4.trim().toLowerCase();
        // Check against known script signatures
        for (const [prefix, label] of Object.entries(SCRIPT_SIGNATURES)) {
            if (normalized.startsWith(prefix) || normalized === prefix) {
                return { isKnownBot: true, isFullStackEmulator: false, matchLabel: label };
            }
        }
        // Check against known emulator signatures
        for (const [prefix, label] of Object.entries(EMULATOR_SIGNATURES)) {
            if (normalized.startsWith(prefix) || normalized === prefix) {
                return { isKnownBot: false, isFullStackEmulator: true, matchLabel: label };
            }
        }
        return { isKnownBot: false, isFullStackEmulator: false, matchLabel: 'unknown' };
    }
}
exports.ProtocolAnalyzer = ProtocolAnalyzer;
