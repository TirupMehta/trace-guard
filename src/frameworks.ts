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

import { TraceGuardAI } from './core';

const ai = new TraceGuardAI();

/**
 * Next.js Middleware helper for `middleware.ts`.
 * Works seamlessly on Vercel Edge Runtime, Cloudflare Pages, and Node.js.
 */
export function traceGuardNextMiddleware() {
  return async function middleware(request: Request, response?: Response): Promise<Response | undefined> {
    const urlObj = new URL(request.url);

    // 1. Intercept Decoy Route & OpenAPI Honeypots
    if (urlObj.pathname === '/openapi.json' || urlObj.pathname === '/swagger.json') {
      const { generateHoneypotOpenApiSpec } = await import('./honeypot');
      const spec = generateHoneypotOpenApiSpec(ai);
      return new Response(JSON.stringify(spec), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (urlObj.pathname === '/graphql' || (urlObj.searchParams.get('query') || '').includes('__schema')) {
      const { generateGraphQLIntrospectionHoneypot } = await import('./graphql_honeypot');
      const spec = generateGraphQLIntrospectionHoneypot(ai);
      return new Response(JSON.stringify(spec), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (urlObj.pathname === '/robots.txt') {
      const { generateRobotsTxtHoneypot } = await import('./seo_honeypot');
      return new Response(generateRobotsTxtHoneypot(ai), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (urlObj.pathname === '/sitemap.xml') {
      const { generateSitemapXmlHoneypot } = await import('./seo_honeypot');
      return new Response(generateSitemapXmlHoneypot(ai, urlObj.origin), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    if (urlObj.pathname === '/llms.txt' || urlObj.pathname === '/llms-full.txt') {
      const { generateLlmsTxtHoneypot } = await import('./llmstxt_honeypot');
      return new Response(generateLlmsTxtHoneypot(ai), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const decoyCheck = ai.checkDecoyRoute(urlObj.pathname);
    if (decoyCheck && decoyCheck.detected) {
      const { generatePoisonedJsonData } = await import('./json_poison');
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
      } catch {
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
        } else {
          modifiedHtml += '\n' + defenseHtml;
        }

        const newHeaders = new Headers(response.headers);
        newHeaders.delete('content-length');
        
        const { getSafeGlobalHeaders } = await import('./header_honeypot');
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
export function traceGuardExpress() {
  return (req: any, res: any, next: any) => {
    const url = req.url || '/';

    const { getSafeGlobalHeaders } = require('./header_honeypot');
    const honeypotHeaders = getSafeGlobalHeaders(ai);
    for (const [k, v] of Object.entries(honeypotHeaders)) {
      if (res.setHeader) res.setHeader(k, v);
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
      req.on('data', (chunk: any) => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const result = ai.processDetection(data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch {
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
export function traceGuardFastify(fastify: any, options: any, done: Function) {
  fastify.addHook('onRequest', async (req: any, reply: any) => {
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

  fastify.addHook('onSend', async (req: any, reply: any, payload: any) => {
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
export function traceGuardHono() {
  return async (c: any, next: Function) => {
    const urlObj = new URL(c.req.url);

    const { getSafeGlobalHeaders } = await import('./header_honeypot');
    const honeypotHeaders = getSafeGlobalHeaders(ai);
    for (const [k, v] of Object.entries(honeypotHeaders)) {
      c.header(k, v);
    }

    // Decoy Check
    const decoyCheck = ai.checkDecoyRoute(urlObj.pathname);
    if (decoyCheck && decoyCheck.detected) {
      const { generatePoisonedJsonData } = await import('./json_poison');
      return c.json(generatePoisonedJsonData(ai));
    }

    // GraphQL Honeypot
    if (urlObj.pathname === '/graphql' || (urlObj.searchParams.get('query') || '').includes('__schema')) {
      const { generateGraphQLIntrospectionHoneypot } = await import('./graphql_honeypot');
      const spec = generateGraphQLIntrospectionHoneypot(ai);
      return c.json(spec);
    }

    if (urlObj.pathname === '/robots.txt') {
      const { generateRobotsTxtHoneypot } = await import('./seo_honeypot');
      return new Response(generateRobotsTxtHoneypot(ai), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (urlObj.pathname === '/sitemap.xml') {
      const { generateSitemapXmlHoneypot } = await import('./seo_honeypot');
      return new Response(generateSitemapXmlHoneypot(ai, urlObj.origin), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    if (urlObj.pathname === '/llms.txt' || urlObj.pathname === '/llms-full.txt') {
      const { generateLlmsTxtHoneypot } = await import('./llmstxt_honeypot');
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
      } catch {
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
      } else {
        modified += '\n' + defenseHtml;
      }
      c.res = new Response(modified, c.res);
    }
  };
}
