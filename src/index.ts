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

import type { IncomingMessage, ServerResponse } from 'http';

let http: typeof import('http') | null = null;
let zlib: typeof import('zlib') | null = null;

try { http = require('http'); } catch {}
try { zlib = require('zlib'); } catch {}

import { TraceGuardAI } from './core';
import type { TraceGuardResult, DetectionEvent } from './core';

// ── Public Types ──

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

// ── Hook State ──

let hookConfig: HookOptions = {
  enabled: true,
  exclude: [],
  logDetections: true,
};

const globalAi = new TraceGuardAI();
let originalCreateServer: any = null;
let hookEnabled = false;

// Periodic cleanup of old canaries (unref to allow clean process exit)
const cleanupTimer = setInterval(() => globalAi.cleanup(), 300_000);
if (cleanupTimer.unref) cleanupTimer.unref();

/**
 * Get the defensive HTML to inject into a page.
 * Accepts optional CSP nonce string to attach to injected script.
 */
export function getTraceGuardHTML(nonce?: string): string {
  const { html } = globalAi.generateDefenses();
  if (nonce) {
    return html.replace(/<script>/g, `<script nonce="${nonce}">`);
  }
  return html;
}

/**
 * Extract CSP Nonce from Content-Security-Policy header string.
 */
function extractCspNonce(cspHeader?: string): string | undefined {
  if (!cspHeader) return undefined;
  const match = cspHeader.match(/'nonce-([^']+)'/i);
  return match ? match[1] : undefined;
}

/**
 * Create a detection handler for frameworks.
 * Returns a function that processes POST requests to /_tg/detect or Decoy routes.
 */
export function createDetectionHandler() {
  return async (request: Request): Promise<Response> => {
    try {
      const urlObj = new URL(request.url);
      
      // Check Decoy Route
      const decoyCheck = globalAi.checkDecoyRoute(urlObj.pathname);
      if (decoyCheck && decoyCheck.detected) {
        if (hookConfig.onDetection) hookConfig.onDetection(decoyCheck);
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
        console.log(
          '\x1b[31m%s\x1b[0m',
          `[TRACE GUARD] 🚨 LLM AGENT DETECTED — ${result.reason}`
        );
      }
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response('{}', { status: 400 });
    }
  };
}

/**
 * Express middleware for the detection endpoint & Decoy routes.
 */
export function expressDetectionMiddleware() {
  return (req: any, res: any, next: any) => {
    const url = req.url || '/';

    // Decoy route check
    const decoyResult = globalAi.checkDecoyRoute(url);
    if (decoyResult && decoyResult.detected) {
      if (hookConfig.onDetection) hookConfig.onDetection(decoyResult);
      if (hookConfig.logDetections) {
        console.log('\x1b[31m%s\x1b[0m', `[TRACE GUARD] 🚨 LLM AGENT DETECTED VIA DECOY API ROUTE: ${url}`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', data: [] }));
    }

    if (url !== '/_tg/detect') return next ? next() : undefined;

    let body = '';
    req.on('data', (chunk: any) => (body += chunk));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const result = globalAi.processDetection(data);
        if (result.detected && hookConfig.onDetection) {
          hookConfig.onDetection(result);
        }
        if (result.detected && hookConfig.logDetections) {
          console.log(
            '\x1b[31m%s\x1b[0m',
            `[TRACE GUARD] 🚨 LLM AGENT DETECTED — ${result.reason}`
          );
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch {
        res.writeHead(400);
        res.end('{}');
      }
    });
  };
}

/**
 * Get all detections recorded so far.
 */
export function getDetections(): DetectionEvent[] {
  return globalAi.getDetections();
}

/**
 * Setup the HTTP server hook.
 * Patches http.createServer to automatically inject Trace Guard defenses.
 */
export function setupHook(options?: HookOptions): void {
  if (options) hookConfig = { ...hookConfig, ...options };
  if (!hookConfig.enabled || !http) return;

  if (!hookEnabled) {
    originalCreateServer = http.createServer;

    (http as any).createServer = function (
      requestListener?: any,
      ...args: any[]
    ) {
      if (!requestListener) {
        return originalCreateServer.apply(this, arguments);
      }

      const wrappedListener = (req: IncomingMessage, res: ServerResponse) => {
        const url = req.url || '/';

        // Path exclusion
        if (hookConfig.exclude?.some(p => url.startsWith(p))) {
          return requestListener(req, res);
        }

        // ── Decoy API Route Interception ──
        const decoyResult = globalAi.checkDecoyRoute(url);
        if (decoyResult && decoyResult.detected) {
          if (hookConfig.onDetection) hookConfig.onDetection(decoyResult);
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

          req.on('data', (chunk: Buffer | string) => {
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
                if (hookConfig.onDetection) hookConfig.onDetection(result);
                if (hookConfig.logDetections) {
                  console.log(
                    '\x1b[31m%s\x1b[0m',
                    `[TRACE GUARD] 🚨 LLM AGENT DETECTED — ${result.reason}`
                  );
                  for (const d of result.triggeredCanaries) {
                    console.log(
                      '\x1b[33m%s\x1b[0m',
                      `  Canary: ${d.canaryType} | Secret: ${d.secret} | Context: ${d.context || 'none'}`
                    );
                  }
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (e) {
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
        let cspHeader: string | undefined = undefined;
        let chunks: Buffer[] = [];

        res.setHeader = function (name: string, value: any) {
          const n = name.toLowerCase();
          if (n === 'content-type' && String(value).includes('text/html')) isHtml = true;
          if (n === 'content-encoding') contentEncoding = String(value).toLowerCase();
          if (n === 'content-security-policy') cspHeader = String(value);
          if (n === 'content-length' && isHtml) return this;
          return originalSetHeader.apply(this, arguments as any);
        };

        res.writeHead = function (statusCode: number, ...args: any[]) {
          let headers = args[args.length - 1];
          if (headers && typeof headers === 'object') {
            Object.keys(headers).forEach(k => {
              const lower = k.toLowerCase();
              if (lower === 'content-type' && String(headers[k]).includes('text/html')) isHtml = true;
              if (lower === 'content-encoding') contentEncoding = String(headers[k]).toLowerCase();
              if (lower === 'content-security-policy') cspHeader = String(headers[k]);
            });
          }
          if (isHtml) {
            if (headers && typeof headers === 'object') delete (headers as any)['content-length'];
            res.removeHeader('content-length');
          }
          return originalWriteHead.apply(this, arguments as any);
        };

        res.write = function (chunk: any, encoding?: any, cb?: any) {
          if (isHtml) {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
            if (typeof encoding === 'function') encoding();
            if (typeof cb === 'function') cb();
            return true;
          }
          return originalWrite.apply(this, arguments as any);
        };

        res.end = function (chunk?: any, encoding?: any, cb?: any) {
          if (isHtml) {
            if (chunk && typeof chunk !== 'function') {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
            }

            let fullBuffer = Buffer.concat(chunks);
            try {
              let decompressed = fullBuffer;
              if (zlib) {
                if (contentEncoding === 'gzip') decompressed = zlib.gunzipSync(fullBuffer);
                else if (contentEncoding === 'deflate') decompressed = zlib.inflateSync(fullBuffer);
                else if (contentEncoding === 'br') decompressed = zlib.brotliDecompressSync(fullBuffer);
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
              } else {
                const htmlIdx = html.lastIndexOf('</html>');
                if (htmlIdx !== -1) {
                  html = html.slice(0, htmlIdx) + '\n' + defenseHtml + '\n' + html.slice(htmlIdx);
                } else {
                  html += '\n' + defenseHtml;
                }
              }

              let finalBuffer = Buffer.from(html, 'utf8');
              if (zlib) {
                if (contentEncoding === 'gzip') finalBuffer = zlib.gzipSync(finalBuffer);
                else if (contentEncoding === 'deflate') finalBuffer = zlib.deflateSync(finalBuffer);
                else if (contentEncoding === 'br') finalBuffer = zlib.brotliCompressSync(finalBuffer);
              }

              if (!res.headersSent) {
                originalSetHeader.call(res, 'Content-Length', finalBuffer.length.toString());
              }

              let callback = cb;
              if (typeof chunk === 'function') callback = chunk;
              if (typeof encoding === 'function') callback = encoding;

              return originalEnd.call(res, finalBuffer, callback);
            } catch (e) {
              return originalEnd.apply(this, arguments as any);
            }
          }
          return originalEnd.apply(this, arguments as any);
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
