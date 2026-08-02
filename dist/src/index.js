"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSyslogEvent = exports.formatCefEvent = exports.generateCdpTrapScript = exports.generateAudioHoneypotScript = exports.generateWebSocketPoisonFrame = exports.generatePoisonedJsonData = exports.getSafeGlobalHeaders = exports.generateLlmsTxtHoneypot = exports.generateSitemapXmlHoneypot = exports.generateRobotsTxtHoneypot = exports.generateGraphQLIntrospectionHoneypot = exports.generateHoneypotOpenApiSpec = exports.traceGuardHono = exports.traceGuardFastify = exports.traceGuardExpress = exports.traceGuardNextMiddleware = exports.TraceGuardAI = void 0;
exports.getTraceGuardHTML = getTraceGuardHTML;
exports.createDetectionHandler = createDetectionHandler;
exports.expressDetectionMiddleware = expressDetectionMiddleware;
exports.getDetections = getDetections;
exports.setupHook = setupHook;
let http = null;
let zlib = null;
try {
    http = require('http');
}
catch { }
try {
    zlib = require('zlib');
}
catch { }
const core_1 = require("./core");
// ── Hook State ──
let hookConfig = {
    enabled: true,
    exclude: [],
    logDetections: true,
};
const globalAi = new core_1.TraceGuardAI();
let originalCreateServer = null;
let hookEnabled = false;
// Periodic cleanup of old canaries (unref to allow clean process exit)
const cleanupTimer = setInterval(() => globalAi.cleanup(), 300_000);
if (cleanupTimer.unref)
    cleanupTimer.unref();
/**
 * Get the defensive HTML to inject into a page.
 * Accepts optional CSP nonce string to attach to injected script.
 */
function getTraceGuardHTML(nonce) {
    const { html } = globalAi.generateDefenses();
    if (nonce) {
        return html.replace(/<script>/g, `<script nonce="${nonce}">`);
    }
    return html;
}
/**
 * Extract CSP Nonce from Content-Security-Policy header string.
 */
function extractCspNonce(cspHeader) {
    if (!cspHeader)
        return undefined;
    const match = cspHeader.match(/'nonce-([^']+)'/i);
    return match ? match[1] : undefined;
}
/**
 * Create a detection handler for frameworks.
 * Returns a function that processes POST requests to /_tg/detect or Decoy routes.
 */
function createDetectionHandler() {
    return async (request) => {
        try {
            const urlObj = new URL(request.url);
            // Check Decoy Route
            const decoyCheck = globalAi.checkDecoyRoute(urlObj.pathname);
            if (decoyCheck && decoyCheck.detected) {
                if (hookConfig.onDetection)
                    hookConfig.onDetection(decoyCheck);
                if (hookConfig.logDetections) {
                    console.log('\x1b[31m%s\x1b[0m', `[TRACE GUARD] 🚨 LLM AGENT DETECTED VIA DECOY API ROUTE: ${urlObj.pathname}`);
                }
                return new Response(JSON.stringify({ status: 'ok', data: [] }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            const data = await request.json();
            const result = globalAi.processDetection(data);
            if (result.detected && hookConfig.onDetection) {
                hookConfig.onDetection(result);
            }
            if (result.detected && hookConfig.logDetections) {
                console.log('\x1b[31m%s\x1b[0m', `[TRACE GUARD] 🚨 LLM AGENT DETECTED — ${result.reason}`);
            }
            return new Response(JSON.stringify(result), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        catch {
            return new Response('{}', { status: 400 });
        }
    };
}
/**
 * Express middleware for the detection endpoint & Decoy routes.
 */
function expressDetectionMiddleware() {
    return (req, res, next) => {
        const url = req.url || '/';
        // Decoy route check
        const decoyResult = globalAi.checkDecoyRoute(url);
        if (decoyResult && decoyResult.detected) {
            if (hookConfig.onDetection)
                hookConfig.onDetection(decoyResult);
            if (hookConfig.logDetections) {
                console.log('\x1b[31m%s\x1b[0m', `[TRACE GUARD] 🚨 LLM AGENT DETECTED VIA DECOY API ROUTE: ${url}`);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok', data: [] }));
        }
        if (url !== '/_tg/detect')
            return next ? next() : undefined;
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const result = globalAi.processDetection(data);
                if (result.detected && hookConfig.onDetection) {
                    hookConfig.onDetection(result);
                }
                if (result.detected && hookConfig.logDetections) {
                    console.log('\x1b[31m%s\x1b[0m', `[TRACE GUARD] 🚨 LLM AGENT DETECTED — ${result.reason}`);
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            }
            catch {
                res.writeHead(400);
                res.end('{}');
            }
        });
    };
}
/**
 * Get all detections recorded so far.
 */
function getDetections() {
    return globalAi.getDetections();
}
/**
 * Setup the HTTP server hook.
 * Patches http.createServer to automatically inject Trace Guard defenses.
 */
function setupHook(options) {
    if (options)
        hookConfig = { ...hookConfig, ...options };
    if (!hookConfig.enabled || !http)
        return;
    if (!hookEnabled) {
        originalCreateServer = http.createServer;
        http.createServer = function (requestListener, ...args) {
            if (!requestListener) {
                return originalCreateServer.apply(this, arguments);
            }
            const wrappedListener = (req, res) => {
                const url = req.url || '/';
                // Path exclusion
                if (hookConfig.exclude?.some(p => url.startsWith(p))) {
                    return requestListener(req, res);
                }
                // ── Decoy API Route Interception ──
                const decoyResult = globalAi.checkDecoyRoute(url);
                if (decoyResult && decoyResult.detected) {
                    if (hookConfig.onDetection)
                        hookConfig.onDetection(decoyResult);
                    if (hookConfig.logDetections) {
                        console.log('\x1b[31m%s\x1b[0m', `[TRACE GUARD] 🚨 LLM AGENT DETECTED VIA DECOY API ROUTE: ${url}`);
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', data: [] }));
                    return;
                }
                // ── Detection Endpoint ──
                if (url === '/_tg/detect' && req.method === 'POST') {
                    let body = '';
                    let bodySize = 0;
                    const MAX_BODY = 1024 * 1024;
                    req.on('data', (chunk) => {
                        bodySize += Buffer.byteLength(chunk);
                        if (bodySize > MAX_BODY) {
                            req.destroy();
                            return;
                        }
                        body += chunk;
                    });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const result = globalAi.processDetection(data);
                            if (result.detected) {
                                if (hookConfig.onDetection)
                                    hookConfig.onDetection(result);
                                if (hookConfig.logDetections) {
                                    console.log('\x1b[31m%s\x1b[0m', `[TRACE GUARD] 🚨 LLM AGENT DETECTED — ${result.reason}`);
                                    for (const d of result.triggeredCanaries) {
                                        console.log('\x1b[33m%s\x1b[0m', `  Canary: ${d.canaryType} | Secret: ${d.secret} | Context: ${d.context || 'none'}`);
                                    }
                                }
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(result));
                        }
                        catch (e) {
                            res.writeHead(400);
                            res.end('{}');
                        }
                    });
                    return;
                }
                // ── HTML Response Interception & Canary Injection ──
                const originalWrite = res.write;
                const originalEnd = res.end;
                const originalSetHeader = res.setHeader;
                const originalWriteHead = res.writeHead;
                let isHtml = false;
                let contentEncoding = '';
                let cspHeader = undefined;
                let chunks = [];
                res.setHeader = function (name, value) {
                    const n = name.toLowerCase();
                    if (n === 'content-type' && String(value).includes('text/html'))
                        isHtml = true;
                    if (n === 'content-encoding')
                        contentEncoding = String(value).toLowerCase();
                    if (n === 'content-security-policy')
                        cspHeader = String(value);
                    if (n === 'content-length' && isHtml)
                        return this;
                    return originalSetHeader.apply(this, arguments);
                };
                res.writeHead = function (statusCode, ...args) {
                    let headers = args[args.length - 1];
                    if (headers && typeof headers === 'object') {
                        Object.keys(headers).forEach(k => {
                            const lower = k.toLowerCase();
                            if (lower === 'content-type' && String(headers[k]).includes('text/html'))
                                isHtml = true;
                            if (lower === 'content-encoding')
                                contentEncoding = String(headers[k]).toLowerCase();
                            if (lower === 'content-security-policy')
                                cspHeader = String(headers[k]);
                        });
                    }
                    if (isHtml) {
                        if (headers && typeof headers === 'object')
                            delete headers['content-length'];
                        res.removeHeader('content-length');
                    }
                    return originalWriteHead.apply(this, arguments);
                };
                res.write = function (chunk, encoding, cb) {
                    if (isHtml) {
                        if (chunk)
                            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
                        if (typeof encoding === 'function')
                            encoding();
                        if (typeof cb === 'function')
                            cb();
                        return true;
                    }
                    return originalWrite.apply(this, arguments);
                };
                res.end = function (chunk, encoding, cb) {
                    if (isHtml) {
                        if (chunk && typeof chunk !== 'function') {
                            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
                        }
                        let fullBuffer = Buffer.concat(chunks);
                        try {
                            let decompressed = fullBuffer;
                            if (zlib) {
                                if (contentEncoding === 'gzip')
                                    decompressed = zlib.gunzipSync(fullBuffer);
                                else if (contentEncoding === 'deflate')
                                    decompressed = zlib.inflateSync(fullBuffer);
                                else if (contentEncoding === 'br')
                                    decompressed = zlib.brotliDecompressSync(fullBuffer);
                            }
                            let html = decompressed.toString('utf8');
                            // Extract CSP Nonce if present
                            const nonce = extractCspNonce(cspHeader);
                            // Generate fresh canaries for this page
                            const defenseHtml = getTraceGuardHTML(nonce);
                            // Inject before </body> or </html> or at end
                            const bodyIdx = html.lastIndexOf('</body>');
                            if (bodyIdx !== -1) {
                                html = html.slice(0, bodyIdx) + '\n' + defenseHtml + '\n' + html.slice(bodyIdx);
                            }
                            else {
                                const htmlIdx = html.lastIndexOf('</html>');
                                if (htmlIdx !== -1) {
                                    html = html.slice(0, htmlIdx) + '\n' + defenseHtml + '\n' + html.slice(htmlIdx);
                                }
                                else {
                                    html += '\n' + defenseHtml;
                                }
                            }
                            let finalBuffer = Buffer.from(html, 'utf8');
                            if (zlib) {
                                if (contentEncoding === 'gzip')
                                    finalBuffer = zlib.gzipSync(finalBuffer);
                                else if (contentEncoding === 'deflate')
                                    finalBuffer = zlib.deflateSync(finalBuffer);
                                else if (contentEncoding === 'br')
                                    finalBuffer = zlib.brotliCompressSync(finalBuffer);
                            }
                            if (!res.headersSent) {
                                originalSetHeader.call(res, 'Content-Length', finalBuffer.length.toString());
                            }
                            let callback = cb;
                            if (typeof chunk === 'function')
                                callback = chunk;
                            if (typeof encoding === 'function')
                                callback = encoding;
                            return originalEnd.call(res, finalBuffer, callback);
                        }
                        catch (e) {
                            return originalEnd.apply(this, arguments);
                        }
                    }
                    return originalEnd.apply(this, arguments);
                };
                return requestListener(req, res);
            };
            return originalCreateServer.call(http, wrappedListener, ...args);
        };
        hookEnabled = true;
        if (hookConfig.logDetections) {
            console.log('\x1b[32m%s\x1b[0m', '[TRACE GUARD] ✅ Defense system active — CSP-aware canary tokens & decoy routes armed');
        }
    }
}
// Re-export
var core_2 = require("./core");
Object.defineProperty(exports, "TraceGuardAI", { enumerable: true, get: function () { return core_2.TraceGuardAI; } });
var frameworks_1 = require("./frameworks");
Object.defineProperty(exports, "traceGuardNextMiddleware", { enumerable: true, get: function () { return frameworks_1.traceGuardNextMiddleware; } });
Object.defineProperty(exports, "traceGuardExpress", { enumerable: true, get: function () { return frameworks_1.traceGuardExpress; } });
Object.defineProperty(exports, "traceGuardFastify", { enumerable: true, get: function () { return frameworks_1.traceGuardFastify; } });
Object.defineProperty(exports, "traceGuardHono", { enumerable: true, get: function () { return frameworks_1.traceGuardHono; } });
var honeypot_1 = require("./honeypot");
Object.defineProperty(exports, "generateHoneypotOpenApiSpec", { enumerable: true, get: function () { return honeypot_1.generateHoneypotOpenApiSpec; } });
var graphql_honeypot_1 = require("./graphql_honeypot");
Object.defineProperty(exports, "generateGraphQLIntrospectionHoneypot", { enumerable: true, get: function () { return graphql_honeypot_1.generateGraphQLIntrospectionHoneypot; } });
var seo_honeypot_1 = require("./seo_honeypot");
Object.defineProperty(exports, "generateRobotsTxtHoneypot", { enumerable: true, get: function () { return seo_honeypot_1.generateRobotsTxtHoneypot; } });
Object.defineProperty(exports, "generateSitemapXmlHoneypot", { enumerable: true, get: function () { return seo_honeypot_1.generateSitemapXmlHoneypot; } });
var llmstxt_honeypot_1 = require("./llmstxt_honeypot");
Object.defineProperty(exports, "generateLlmsTxtHoneypot", { enumerable: true, get: function () { return llmstxt_honeypot_1.generateLlmsTxtHoneypot; } });
var header_honeypot_1 = require("./header_honeypot");
Object.defineProperty(exports, "getSafeGlobalHeaders", { enumerable: true, get: function () { return header_honeypot_1.getSafeGlobalHeaders; } });
var json_poison_1 = require("./json_poison");
Object.defineProperty(exports, "generatePoisonedJsonData", { enumerable: true, get: function () { return json_poison_1.generatePoisonedJsonData; } });
var websocket_honeypot_1 = require("./websocket_honeypot");
Object.defineProperty(exports, "generateWebSocketPoisonFrame", { enumerable: true, get: function () { return websocket_honeypot_1.generateWebSocketPoisonFrame; } });
var audio_honeypot_1 = require("./audio_honeypot");
Object.defineProperty(exports, "generateAudioHoneypotScript", { enumerable: true, get: function () { return audio_honeypot_1.generateAudioHoneypotScript; } });
var cdp_traps_1 = require("./cdp_traps");
Object.defineProperty(exports, "generateCdpTrapScript", { enumerable: true, get: function () { return cdp_traps_1.generateCdpTrapScript; } });
var audit_1 = require("./audit");
Object.defineProperty(exports, "formatCefEvent", { enumerable: true, get: function () { return audit_1.formatCefEvent; } });
Object.defineProperty(exports, "formatSyslogEvent", { enumerable: true, get: function () { return audit_1.formatSyslogEvent; } });
