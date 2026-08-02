/**
 * Trace Guard — Zero-Setup HTTP Server Hook
 *
 * Monkey-patches http.createServer to automatically inject defensive
 * canary tokens, polymorphic prompts, and adversarial overlays into all HTML responses.
 *
 * Advanced Features:
 * - CSP Nonce Auto-Detection & Preservation: Parses Content-Security-Policy headers to append valid nonces to injected scripts.
 * - Multi-Encoding Compression: Supports Gzip, Deflate, and Brotli Sync stream decompression/recompression.
 * - Decoy API Honeypot Route Interception: Logs automated crawlers requesting planted `/_tg_decoy_*` routes.
 *
 * @author Tirup Mehta
 * @license ISC
 */
import type { TraceGuardResult, DetectionEvent } from './core';
export interface HookOptions {
    /** Enable or disable protection. Default: true */
    enabled?: boolean;
    /** URL prefixes to skip injection. Default: [] */
    exclude?: string[];
    /** Callback when an LLM agent is detected */
    onDetection?: (result: TraceGuardResult) => void;
    /** Log detections to console. Default: true */
    logDetections?: boolean;
}
/**
 * Get the defensive HTML to inject into a page.
 * Accepts optional CSP nonce string to attach to injected script.
 */
export declare function getTraceGuardHTML(nonce?: string): string;
/**
 * Create a detection handler for frameworks.
 * Returns a function that processes POST requests to /_tg/detect or Decoy routes.
 */
export declare function createDetectionHandler(): (request: Request) => Promise<Response>;
/**
 * Express middleware for the detection endpoint & Decoy routes.
 */
export declare function expressDetectionMiddleware(): (req: any, res: any, next: any) => any;
/**
 * Get all detections recorded so far.
 */
export declare function getDetections(): DetectionEvent[];
/**
 * Setup the HTTP server hook.
 * Patches http.createServer to automatically inject Trace Guard defenses.
 */
export declare function setupHook(options?: HookOptions): void;
export { TraceGuardAI, TraceGuardResult, DetectionEvent, CanaryToken, CanaryType } from './core';
export { traceGuardNextMiddleware, traceGuardExpress, traceGuardFastify, traceGuardHono } from './frameworks';
export { generateHoneypotOpenApiSpec } from './honeypot';
export { generateGraphQLIntrospectionHoneypot } from './graphql_honeypot';
export { generateRobotsTxtHoneypot, generateSitemapXmlHoneypot } from './seo_honeypot';
export { generateLlmsTxtHoneypot } from './llmstxt_honeypot';
export { getSafeGlobalHeaders } from './header_honeypot';
export { generatePoisonedJsonData } from './json_poison';
export { generateWebSocketPoisonFrame } from './websocket_honeypot';
export { generateAudioHoneypotScript } from './audio_honeypot';
export { generateCdpTrapScript } from './cdp_traps';
export { formatCefEvent, formatSyslogEvent } from './audit';
