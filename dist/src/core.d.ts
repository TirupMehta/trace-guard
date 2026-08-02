/**
 * Trace Guard — Polymorphic Canary Token, Multimodal Canvas, Self-Healing & HMAC Signed Telemetry Engine
 *
 * Core defensive engine exploiting structural LLM vulnerabilities across 3 agent viewports:
 * 1. Raw HTML Viewport (Scrapers, cURL, BeautifulSoup, Raw Text Pipelines)
 * 2. Accessibility Tree Viewport (Browser-Use, WebArena, Claude AX Mode)
 * 3. Visual Viewport (VLM Screenshots: OSWorld, GPT-4V, Claude Computer Use)
 *
 * Advanced Features:
 * - Cryptographic HMAC Signing: Time-bound server-signed HMAC-SHA256 signatures attached to client scripts to block spoofed/forged detection callbacks.
 * - Multimodal Canvas Visual Render Traps: Injects invisible <canvas> elements containing pixel-rendered prompt instructions for visual inspection VLMs.
 * - Audio API Honeypots: Injects hidden <audio> tags with prompt injection attributes targeting speech/audio LLM agents.
 * - Polymorphic Prompt Matrix: Generates 1,200+ unique prompt variations to resist static regex filtering.
 * - Sanitizer Resiliency: Class-based CSS stylesheet injection (`.tg-offscreen-trap`) ensuring canary visibility isolation even if inline style attributes are stripped by sanitizers.
 * - Self-Healing MutationObserver: Catches bots that attempt to sanitize/delete canary elements from the DOM in real time.
 * - Decoy API Honeypot Generator: Plant fake JSON API routes in comments/link tags.
 *
 * @author Tirup Mehta
 * @license ISC
 */
export interface CanaryToken {
    /** Unique identifier for this canary */
    id: string;
    /** The type of trap */
    type: CanaryType;
    /** The secret word/phrase the LLM is instructed to produce */
    secret: string;
    /** When this canary was planted */
    planted: number;
    /** Decoy route URL if type is decoy-api */
    decoyUrl?: string;
}
export type CanaryType = 'hidden-span' | 'aria-label' | 'ax-tree-region' | 'html-comment' | 'canvas-fallback' | 'meta-instruction' | 'adversarial-overlay' | 'hidden-input' | 'semantic-misdirection' | 'image-alt-trap' | 'decoy-api' | 'canary-element-deleted' | 'audio-honeypot' | 'canvas-render-trap';
export interface DetectionEvent {
    /** Which canary was triggered */
    canaryId: string;
    /** What type of canary */
    canaryType: CanaryType;
    /** The secret that was detected */
    secret: string;
    /** Timestamp of detection */
    timestamp: number;
    /** Any additional context from the client */
    context?: string;
}
export interface TraceGuardResult {
    /** Whether an LLM agent was detected */
    detected: boolean;
    /** Which canaries were triggered */
    triggeredCanaries: DetectionEvent[];
    /** Summary reason */
    reason: string;
}
export declare class TraceGuardAI {
    private activeCanaries;
    private decoyRoutes;
    private detections;
    private serverHmacSecret;
    private rateLimitWindow;
    private metrics;
    constructor();
    /**
     * Sliding window rate limiter for telemetry callbacks (max 100 requests / min / IP).
     */
    checkTelemetryRateLimit(ip?: string): boolean;
    /**
     * Retrieve OpenTelemetry / Prometheus compatible metrics object.
     */
    getMetrics(): {
        activeCanaryCount: number;
        activeDecoyRoutes: number;
        totalDetectionsCount: number;
        totalDefensesGenerated: number;
        totalDetections: number;
        rateLimitedRequests: number;
    };
    /**
     * Retrieve OpenTelemetry / Prometheus compatible metrics in text exposition format.
     */
    exportPrometheusMetrics(): string;
    /**
     * Compute HMAC signature for a canary session token.
     */
    computeHmacSignature(canaryId: string, timestamp: number): string;
    /**
     * Compute Sub-Resource Integrity (SRI) SHA-384 hash of inline client defense script.
     */
    getScriptSriHash(scriptContent: string): string;
    /**
     * Validate incoming client HMAC signature.
     */
    verifyHmacSignature(canaryId: string, timestamp: number, signature?: string): boolean;
    /**
     * Generate a complete set of polymorphic canary tokens across all 3 agent viewports.
     * Returns the canaries and the HTML to inject.
     */
    generateDefenses(): {
        html: string;
        canaries: CanaryToken[];
    };
    checkDecoyRoute(path: string, metadata?: {
        ip?: string;
        userAgent?: string;
    }): TraceGuardResult | null;
    processDetection(data: {
        canaryId: string;
        type: string;
        secret: string;
        sig?: string;
        t?: number;
        value?: string;
        context?: string;
        via?: string;
    }): TraceGuardResult;
    getDetections(): DetectionEvent[];
    getActiveCanaryCount(): number;
    cleanup(): void;
    private _createCanary;
}
