/**
 * Returns the raw HTML string for the Trace Guard script.
 * Drop this into a Next.js App Router `layout.tsx` or raw HTML template.
 */
export declare function getTraceGuardHTML(): string;
/**
 * A ready-to-use Next.js Route Handler for App Router (app/_tg/validate/route.ts).
 * This works natively on Vercel Edge and Node.js runtimes.
 */
export declare function createNextRouteHandler(): (request: Request) => Promise<Response>;
/**
 * A ready-to-use Express middleware for Node.js backends.
 * Mount it to `app.post('/_tg/validate', expressMiddleware())`.
 */
export declare function expressMiddleware(): (req: any, res: any) => any;
