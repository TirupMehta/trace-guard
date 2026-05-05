"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTraceGuardHTML = getTraceGuardHTML;
exports.createNextRouteHandler = createNextRouteHandler;
exports.expressMiddleware = expressMiddleware;
const core_1 = require("./core");
const hook_1 = require("./hook");
const globalAi = new core_1.TraceGuardAI();
/**
 * Returns the raw HTML string for the Trace Guard script.
 * Drop this into a Next.js App Router `layout.tsx` or raw HTML template.
 */
function getTraceGuardHTML() {
    const token = globalAi.generateSessionToken();
    return (0, hook_1.getScriptToInject)(token.sessionId, token.signature);
}
/**
 * A ready-to-use Next.js Route Handler for App Router (app/_tg/validate/route.ts).
 * This works natively on Vercel Edge and Node.js runtimes.
 */
function createNextRouteHandler() {
    return async function POST(request) {
        try {
            const data = await request.json();
            const result = globalAi.analyzeSession(data.ja4 || '', data.events || [], {
                sessionId: data.sessionId,
                signature: data.signature,
                decoyTriggered: !!data.decoyTriggered,
                challengeSolved: !!data.challengeSolved,
                trapId: data.trapId,
                automation: data.automation,
                isMobile: !!data.isMobile
            });
            if (result.decision !== 'allow') {
                console.log(`\n\x1b[41m\x1b[37m 🛡️ TRACE GUARD BLOCKED \x1b[0m`);
                console.log(`\x1b[31mReason:\x1b[0m ${result.reason}`);
                console.log(`\x1b[33mScore:\x1b[0m ${result.score.toFixed(2)} / 1.00\n`);
            }
            return new Response(JSON.stringify(result), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        catch (e) {
            return new Response('Bad Request', { status: 400 });
        }
    };
}
/**
 * A ready-to-use Express middleware for Node.js backends.
 * Mount it to `app.post('/_tg/validate', expressMiddleware())`.
 */
function expressMiddleware() {
    return (req, res) => {
        try {
            const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            if (!data)
                return res.status(400).send('Missing body. Did you forget express.json()?');
            const result = globalAi.analyzeSession(data.ja4 || '', data.events || [], {
                sessionId: data.sessionId,
                signature: data.signature,
                decoyTriggered: !!data.decoyTriggered,
                challengeSolved: !!data.challengeSolved,
                trapId: data.trapId,
                automation: data.automation,
                isMobile: !!data.isMobile
            });
            if (result.decision !== 'allow') {
                console.log(`\n\x1b[41m\x1b[37m 🛡️ TRACE GUARD BLOCKED \x1b[0m`);
                console.log(`\x1b[31mReason:\x1b[0m ${result.reason}`);
                console.log(`\x1b[33mScore:\x1b[0m ${result.score.toFixed(2)} / 1.00\n`);
            }
            res.status(200).json(result);
        }
        catch (e) {
            res.status(400).send('Bad Request');
        }
    };
}
