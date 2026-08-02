"use strict";
/**
 * Trace Guard — Enterprise Framework Adapters
 *
 * Production-ready exports for modern web framework stacks:
 * 1. Next.js App Router Middleware (`middleware.ts`) — Vercel Edge compatible
 * 2. Express Middleware (`app.use(traceGuardExpress())`)
 * 3. Fastify Plugin (`fastify.register(traceGuardFastify)`)
 * 4. Hono Middleware (`app.use('*', traceGuardHono())`) — Bun / Cloudflare Workers
 *
 * @author Tirup Mehta
 * @license ISC
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceGuardNextMiddleware = traceGuardNextMiddleware;
exports.traceGuardExpress = traceGuardExpress;
exports.traceGuardFastify = traceGuardFastify;
exports.traceGuardHono = traceGuardHono;
const core_1 = require("./core");
const ai = new core_1.TraceGuardAI();
/**
 * Next.js Middleware helper for `middleware.ts`.
 * Works seamlessly on Vercel Edge Runtime, Cloudflare Pages, and Node.js.
 */
function traceGuardNextMiddleware() {
    return async function middleware(request, response) {
        const urlObj = new URL(request.url);
        // 1. Intercept Decoy Route & OpenAPI Honeypots
        if (urlObj.pathname === '/openapi.json' || urlObj.pathname === '/swagger.json') {
            const { generateHoneypotOpenApiSpec } = await Promise.resolve().then(() => __importStar(require('./honeypot')));
            const spec = generateHoneypotOpenApiSpec(ai);
            return new Response(JSON.stringify(spec), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        if (urlObj.pathname === '/graphql' || (urlObj.searchParams.get('query') || '').includes('__schema')) {
            const { generateGraphQLIntrospectionHoneypot } = await Promise.resolve().then(() => __importStar(require('./graphql_honeypot')));
            const spec = generateGraphQLIntrospectionHoneypot(ai);
            return new Response(JSON.stringify(spec), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        if (urlObj.pathname === '/robots.txt') {
            const { generateRobotsTxtHoneypot } = await Promise.resolve().then(() => __importStar(require('./seo_honeypot')));
            return new Response(generateRobotsTxtHoneypot(ai), {
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
            });
        }
        if (urlObj.pathname === '/sitemap.xml') {
            const { generateSitemapXmlHoneypot } = await Promise.resolve().then(() => __importStar(require('./seo_honeypot')));
            return new Response(generateSitemapXmlHoneypot(ai, urlObj.origin), {
                status: 200,
                headers: { 'Content-Type': 'application/xml' },
            });
        }
        if (urlObj.pathname === '/llms.txt' || urlObj.pathname === '/llms-full.txt') {
            const { generateLlmsTxtHoneypot } = await Promise.resolve().then(() => __importStar(require('./llmstxt_honeypot')));
            return new Response(generateLlmsTxtHoneypot(ai), {
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
            });
        }
        const decoyCheck = ai.checkDecoyRoute(urlObj.pathname);
        if (decoyCheck && decoyCheck.detected) {
            const { generatePoisonedJsonData } = await Promise.resolve().then(() => __importStar(require('./json_poison')));
            return new Response(JSON.stringify(generatePoisonedJsonData(ai)), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        // 2. Intercept Detection Telemetry Endpoint
        if (urlObj.pathname === '/_tg/detect' && request.method === 'POST') {
            try {
                const body = await request.json();
                const result = ai.processDetection(body);
                return new Response(JSON.stringify(result), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            catch {
                return new Response('{}', { status: 400 });
            }
        }
        // If an existing response was passed (NextResponse.next())
        if (response) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
                const html = await response.text();
                const { html: defenseHtml } = ai.generateDefenses();
                let modifiedHtml = html;
                const bodyIdx = html.lastIndexOf('</body>');
                if (bodyIdx !== -1) {
                    modifiedHtml = html.slice(0, bodyIdx) + '\n' + defenseHtml + '\n' + html.slice(bodyIdx);
                }
                else {
                    modifiedHtml += '\n' + defenseHtml;
                }
                const newHeaders = new Headers(response.headers);
                newHeaders.delete('content-length');
                const { getSafeGlobalHeaders } = await Promise.resolve().then(() => __importStar(require('./header_honeypot')));
                const honeypotHeaders = getSafeGlobalHeaders(ai);
                for (const [k, v] of Object.entries(honeypotHeaders)) {
                    newHeaders.set(k, v);
                }
                return new Response(modifiedHtml, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            }
        }
        return undefined;
    };
}
/**
 * Native Express middleware.
 * Usage:
 *   const { traceGuardExpress } = require('trace-guard');
 *   app.use(traceGuardExpress());
 */
function traceGuardExpress() {
    return (req, res, next) => {
        const url = req.url || '/';
        const { getSafeGlobalHeaders } = require('./header_honeypot');
        const honeypotHeaders = getSafeGlobalHeaders(ai);
        for (const [k, v] of Object.entries(honeypotHeaders)) {
            if (res.setHeader)
                res.setHeader(k, v);
        }
        // Intercept Decoy Route
        const decoyResult = ai.checkDecoyRoute(url);
        if (decoyResult && decoyResult.detected) {
            const { generatePoisonedJsonData } = require('./json_poison');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(generatePoisonedJsonData(ai)));
        }
        // Intercept GraphQL Honeypot
        if (url === '/graphql' || url.includes('__schema')) {
            const { generateGraphQLIntrospectionHoneypot } = require('./graphql_honeypot');
            const spec = generateGraphQLIntrospectionHoneypot(ai);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(spec));
        }
        if (url === '/robots.txt') {
            const { generateRobotsTxtHoneypot } = require('./seo_honeypot');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            return res.end(generateRobotsTxtHoneypot(ai));
        }
        if (url === '/sitemap.xml') {
            const { generateSitemapXmlHoneypot } = require('./seo_honeypot');
            res.writeHead(200, { 'Content-Type': 'application/xml' });
            const host = req.headers ? req.headers.host : 'localhost';
            const protocol = req.socket?.encrypted ? 'https' : 'http';
            return res.end(generateSitemapXmlHoneypot(ai, `${protocol}://${host}`));
        }
        if (url === '/llms.txt' || url === '/llms-full.txt') {
            const { generateLlmsTxtHoneypot } = require('./llmstxt_honeypot');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            return res.end(generateLlmsTxtHoneypot(ai));
        }
        // Intercept Detection Endpoint
        if (url === '/_tg/detect' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => body += chunk);
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const result = ai.processDetection(data);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                }
                catch {
                    res.writeHead(400);
                    res.end('{}');
                }
            });
            return;
        }
        next();
    };
}
/**
 * Fastify plugin adapter.
 * Usage:
 *   fastify.register(traceGuardFastify);
 */
function traceGuardFastify(fastify, options, done) {
    fastify.addHook('onRequest', async (req, reply) => {
        const { getSafeGlobalHeaders } = require('./header_honeypot');
        const honeypotHeaders = getSafeGlobalHeaders(ai);
        for (const [k, v] of Object.entries(honeypotHeaders)) {
            reply.header(k, v);
        }
        const url = req.url || '/';
        const decoyCheck = ai.checkDecoyRoute(url);
        if (decoyCheck && decoyCheck.detected) {
            const { generatePoisonedJsonData } = require('./json_poison');
            reply.type('application/json').send(generatePoisonedJsonData(ai));
            return reply;
        }
        if (url === '/graphql' || url.includes('__schema')) {
            const { generateGraphQLIntrospectionHoneypot } = require('./graphql_honeypot');
            const spec = generateGraphQLIntrospectionHoneypot(ai);
            reply.type('application/json').send(spec);
            return reply;
        }
        if (url === '/robots.txt') {
            const { generateRobotsTxtHoneypot } = require('./seo_honeypot');
            reply.type('text/plain').send(generateRobotsTxtHoneypot(ai));
            return reply;
        }
        if (url === '/sitemap.xml') {
            const { generateSitemapXmlHoneypot } = require('./seo_honeypot');
            const protocol = req.protocol || 'http';
            const host = req.hostname || 'localhost';
            reply.type('application/xml').send(generateSitemapXmlHoneypot(ai, `${protocol}://${host}`));
            return reply;
        }
        if (url === '/llms.txt' || url === '/llms-full.txt') {
            const { generateLlmsTxtHoneypot } = require('./llmstxt_honeypot');
            reply.type('text/plain').send(generateLlmsTxtHoneypot(ai));
            return reply;
        }
        if (url === '/_tg/detect' && req.method === 'POST') {
            const result = ai.processDetection(req.body || {});
            reply.type('application/json').send(result);
            return reply;
        }
    });
    fastify.addHook('onSend', async (req, reply, payload) => {
        const contentType = reply.getHeader('content-type') || '';
        if (typeof payload === 'string' && contentType.includes('text/html')) {
            const { html: defenseHtml } = ai.generateDefenses();
            const bodyIdx = payload.lastIndexOf('</body>');
            if (bodyIdx !== -1) {
                return payload.slice(0, bodyIdx) + '\n' + defenseHtml + '\n' + payload.slice(bodyIdx);
            }
            return payload + '\n' + defenseHtml;
        }
        return payload;
    });
    done();
}
/**
 * Hono middleware helper for Bun, Deno, and Cloudflare Workers.
 * Usage:
 *   app.use('*', traceGuardHono());
 */
function traceGuardHono() {
    return async (c, next) => {
        const urlObj = new URL(c.req.url);
        const { getSafeGlobalHeaders } = await Promise.resolve().then(() => __importStar(require('./header_honeypot')));
        const honeypotHeaders = getSafeGlobalHeaders(ai);
        for (const [k, v] of Object.entries(honeypotHeaders)) {
            c.header(k, v);
        }
        // Decoy Check
        const decoyCheck = ai.checkDecoyRoute(urlObj.pathname);
        if (decoyCheck && decoyCheck.detected) {
            const { generatePoisonedJsonData } = await Promise.resolve().then(() => __importStar(require('./json_poison')));
            return c.json(generatePoisonedJsonData(ai));
        }
        // GraphQL Honeypot
        if (urlObj.pathname === '/graphql' || (urlObj.searchParams.get('query') || '').includes('__schema')) {
            const { generateGraphQLIntrospectionHoneypot } = await Promise.resolve().then(() => __importStar(require('./graphql_honeypot')));
            const spec = generateGraphQLIntrospectionHoneypot(ai);
            return c.json(spec);
        }
        if (urlObj.pathname === '/robots.txt') {
            const { generateRobotsTxtHoneypot } = await Promise.resolve().then(() => __importStar(require('./seo_honeypot')));
            return new Response(generateRobotsTxtHoneypot(ai), {
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
            });
        }
        if (urlObj.pathname === '/sitemap.xml') {
            const { generateSitemapXmlHoneypot } = await Promise.resolve().then(() => __importStar(require('./seo_honeypot')));
            return new Response(generateSitemapXmlHoneypot(ai, urlObj.origin), {
                status: 200,
                headers: { 'Content-Type': 'application/xml' },
            });
        }
        if (urlObj.pathname === '/llms.txt' || urlObj.pathname === '/llms-full.txt') {
            const { generateLlmsTxtHoneypot } = await Promise.resolve().then(() => __importStar(require('./llmstxt_honeypot')));
            return new Response(generateLlmsTxtHoneypot(ai), {
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
            });
        }
        // Telemetry Endpoint
        if (urlObj.pathname === '/_tg/detect' && c.req.method === 'POST') {
            try {
                const body = await c.req.json();
                const result = ai.processDetection(body);
                return c.json(result);
            }
            catch {
                return c.json({}, 400);
            }
        }
        await next();
        // Response HTML Ingestion
        const contentType = c.res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
            const html = await c.res.text();
            const { html: defenseHtml } = ai.generateDefenses();
            let modified = html;
            const bodyIdx = html.lastIndexOf('</body>');
            if (bodyIdx !== -1) {
                modified = html.slice(0, bodyIdx) + '\n' + defenseHtml + '\n' + html.slice(bodyIdx);
            }
            else {
                modified += '\n' + defenseHtml;
            }
            c.res = new Response(modified, c.res);
        }
    };
}
