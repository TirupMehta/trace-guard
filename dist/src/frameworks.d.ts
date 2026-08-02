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
/**
 * Next.js Middleware helper for `middleware.ts`.
 * Works seamlessly on Vercel Edge Runtime, Cloudflare Pages, and Node.js.
 */
export declare function traceGuardNextMiddleware(): (request: Request, response?: Response) => Promise<Response | undefined>;
/**
 * Native Express middleware.
 * Usage:
 *   const { traceGuardExpress } = require('trace-guard');
 *   app.use(traceGuardExpress());
 */
export declare function traceGuardExpress(): (req: any, res: any, next: any) => any;
/**
 * Fastify plugin adapter.
 * Usage:
 *   fastify.register(traceGuardFastify);
 */
export declare function traceGuardFastify(fastify: any, options: any, done: Function): void;
/**
 * Hono middleware helper for Bun, Deno, and Cloudflare Workers.
 * Usage:
 *   app.use('*', traceGuardHono());
 */
export declare function traceGuardHono(): (c: any, next: Function) => Promise<any>;
