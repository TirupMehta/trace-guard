import { traceGuardNextMiddleware, traceGuardExpress, traceGuardFastify, traceGuardHono } from '../src/frameworks';

describe('Framework Adapters — Next.js, Express, Fastify & Hono', () => {
  // ── Next.js Middleware Tests ──

  describe('traceGuardNextMiddleware', () => {
    test('intercepts /openapi.json honeypot requests', async () => {
      const middleware = traceGuardNextMiddleware();
      const req = new Request('http://localhost:3000/openapi.json');

      const res = await middleware(req);
      expect(res).toBeDefined();
      expect(res!.status).toBe(200);
      const json = await res!.json();
      expect(json.openapi).toBe('3.0.3');
      expect(json.info.title).toContain('Automated Agent Access');
    });

    test('intercepts /graphql honeypot requests', async () => {
      const middleware = traceGuardNextMiddleware();
      const req = new Request('http://localhost:3000/graphql');

      const res = await middleware(req);
      expect(res).toBeDefined();
      expect(res!.status).toBe(200);
      const json = await res!.json();
      expect(json.data.__schema).toBeDefined();
    });

    test('intercepts /robots.txt honeypot requests', async () => {
      const middleware = traceGuardNextMiddleware();
      const req = new Request('http://localhost:3000/robots.txt');

      const res = await middleware(req);
      expect(res).toBeDefined();
      expect(res!.status).toBe(200);
      const text = await res!.text();
      expect(text).toContain('User-agent: *');
      expect(text).toContain('SYSTEM DIRECTIVE');
    });

    test('intercepts /llms.txt honeypot requests', async () => {
      const middleware = traceGuardNextMiddleware();
      const req = new Request('http://localhost:3000/llms.txt');

      const res = await middleware(req);
      expect(res).toBeDefined();
      expect(res!.status).toBe(200);
      const text = await res!.text();
      expect(text).toContain('SYSTEM DIRECTIVE');
      expect(text).toContain('Trace Guard Generated llms.txt');
    });

    test('intercepts /_tg/detect POST requests', async () => {
      const middleware = traceGuardNextMiddleware();
      const req = new Request('http://localhost:3000/_tg/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canaryId: 'test', type: 'test', secret: 'test' }),
      });

      const res = await middleware(req);
      expect(res).toBeDefined();
      expect(res!.status).toBe(200);
      const json = await res!.json();
      expect(json.detected).toBeDefined();
    });

    test('injects global header honeypots on HTML responses', async () => {
      const middleware = traceGuardNextMiddleware();
      const req = new Request('http://localhost:3000/some-page');
      
      const res = await middleware(req, new Response('<html><body>Hello</body></html>', {
        headers: { 'Content-Type': 'text/html' }
      }));
      expect(res).toBeDefined();
      expect(res!.headers.get('x-ai-compliance')).toContain('SYSTEM DIRECTIVE');
      expect(res!.headers.get('server-timing')).toContain('SYSTEM DIRECTIVE');
      expect(res!.headers.get('link')).toContain('/_tg_decoy');
    });

    test('modifies HTML responses when passed a NextResponse', async () => {
      const middleware = traceGuardNextMiddleware();
      const req = new Request('http://localhost:3000/');
      const originalRes = new Response('<html><body><h1>Next Page</h1></body></html>', {
        headers: { 'Content-Type': 'text/html' },
      });

      const res = await middleware(req, originalRes);
      expect(res).toBeDefined();
      const text = await res!.text();
      expect(text).toContain('<h1>Next Page</h1>');
      expect(text).toContain('__TG_DEFENSE__');
    });
  });

  // ── Express Middleware Tests ──

  describe('traceGuardExpress', () => {
    test('passes non-matching requests to next()', () => {
      const middleware = traceGuardExpress();
      const req = { url: '/about', method: 'GET' };
      const res = {};
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    test('intercepts /graphql requests', () => {
      const middleware = traceGuardExpress();
      const req = { url: '/graphql', method: 'GET' };
      let writeHeadCalled = false;
      let endPayload = '';
      const res = {
        writeHead: () => { writeHeadCalled = true; },
        end: (payload: any) => { endPayload = payload; }
      };

      middleware(req, res, () => {});
      expect(writeHeadCalled).toBe(true);
      expect(JSON.parse(endPayload).data.__schema).toBeDefined();
    });

    test('intercepts /robots.txt requests', () => {
      const middleware = traceGuardExpress();
      const req = { url: '/robots.txt', method: 'GET' };
      let endPayload = '';
      const res = {
        writeHead: () => {},
        end: (payload: any) => { endPayload = payload; }
      };

      middleware(req, res, () => {});
      expect(endPayload).toContain('User-agent: *');
      expect(endPayload).toContain('SYSTEM DIRECTIVE');
    });

    test('intercepts /llms.txt requests', () => {
      const middleware = traceGuardExpress();
      const req = { url: '/llms.txt', method: 'GET' };
      let endPayload = '';
      const res = {
        writeHead: () => {},
        end: (payload: any) => { endPayload = payload; }
      };

      middleware(req, res, () => {});
      expect(endPayload).toContain('SYSTEM DIRECTIVE');
      expect(endPayload).toContain('Trace Guard Generated llms.txt');
    });

    test('injects global header honeypots on all requests', () => {
      const middleware = traceGuardExpress();
      const req = { url: '/api/some-route', method: 'GET' };
      const headers: Record<string, string> = {};
      const res = {
        setHeader: (k: string, v: string) => { headers[k] = v; },
        writeHead: () => {},
        end: () => {}
      };

      middleware(req, res, () => {});
      expect(headers['X-AI-Compliance']).toContain('SYSTEM DIRECTIVE');
      expect(headers['Server-Timing']).toContain('SYSTEM DIRECTIVE');
    });
  });

  // ── Fastify Plugin Tests ──

  describe('traceGuardFastify', () => {
    test('registers hooks on Fastify instance', () => {
      const hooks: Record<string, Function> = {};
      const mockFastify = {
        addHook: (name: string, fn: Function) => {
          hooks[name] = fn;
        },
      };

      traceGuardFastify(mockFastify, {}, () => {});
      expect(hooks['onRequest']).toBeDefined();
      expect(hooks['onSend']).toBeDefined();
    });

    test('intercepts /graphql requests in onRequest hook', async () => {
      const hooks: Record<string, Function> = {};
      const mockFastify = {
        addHook: (name: string, fn: Function) => {
          hooks[name] = fn;
        },
      };

      traceGuardFastify(mockFastify, {}, () => {});
      const req = { url: '/graphql' };
      let sendPayload = '';
      const reply = {
        header: () => {},
        type: () => reply,
        send: (payload: any) => { sendPayload = payload; }
      };

      await hooks['onRequest'](req, reply);
      expect(sendPayload).toBeDefined();
      expect((sendPayload as any).data.__schema).toBeDefined();
    });

    test('intercepts /robots.txt requests in onRequest hook', async () => {
      const hooks: Record<string, Function> = {};
      const mockFastify = { addHook: (n: string, f: Function) => hooks[n] = f };
      traceGuardFastify(mockFastify, {}, () => {});
      
      const req = { url: '/robots.txt' };
      let sendPayload = '';
      const reply = {
        header: () => {},
        type: () => reply,
        send: (payload: any) => { sendPayload = payload; }
      };

      await hooks['onRequest'](req, reply);
      expect(sendPayload).toContain('User-agent: *');
      expect(sendPayload).toContain('SYSTEM DIRECTIVE');
    });

    test('intercepts /llms.txt requests in onRequest hook', async () => {
      const hooks: Record<string, Function> = {};
      const mockFastify = { addHook: (n: string, f: Function) => hooks[n] = f };
      traceGuardFastify(mockFastify, {}, () => {});
      
      const req = { url: '/llms.txt' };
      let sendPayload = '';
      const reply = {
        header: () => {},
        type: () => reply,
        send: (payload: any) => { sendPayload = payload; }
      };

      await hooks['onRequest'](req, reply);
      expect(sendPayload).toContain('SYSTEM DIRECTIVE');
      expect(sendPayload).toContain('Trace Guard Generated llms.txt');
    });

    test('injects global header honeypots on onRequest hook', async () => {
      const hooks: Record<string, Function> = {};
      const mockFastify = { addHook: (n: string, f: Function) => hooks[n] = f };
      traceGuardFastify(mockFastify, {}, () => {});
      
      const req = { url: '/api/some-route' };
      const headers: Record<string, string> = {};
      const reply = {
        header: (k: string, v: string) => { headers[k] = v; },
        type: () => reply,
        send: () => {}
      };

      await hooks['onRequest'](req, reply);
      expect(headers['X-AI-Compliance']).toContain('SYSTEM DIRECTIVE');
    });
  });

  // ── Hono Middleware Tests ──

  describe('traceGuardHono', () => {
    test('modifies HTML response in Hono context', async () => {
      const middleware = traceGuardHono();
      const mockContext = {
        req: { url: 'http://localhost:3000/some-page' },
        header: () => {},
        res: new Response('<html><body><h1>Hono App</h1></body></html>', {
          headers: { 'Content-Type': 'text/html' }
        })
      };

      await middleware(mockContext, async () => {});
      const html = await mockContext.res.text();
      expect(html).toContain('<h1>Hono App</h1>');
      expect(html).toContain('__TG_DEFENSE__');
    });

    test('intercepts /graphql requests in Hono context', async () => {
      const middleware = traceGuardHono();
      const mockContext = {
        req: { url: 'http://localhost:3000/graphql', method: 'GET' },
        header: () => {},
        json: (data: any) => new Response(JSON.stringify(data)),
        res: new Response(''),
      };

      const res = await middleware(mockContext, async () => {}) as Response;
      expect(res).toBeDefined();
      const json = await res.json();
      expect(json.data.__schema).toBeDefined();
    });

    test('intercepts /robots.txt requests in Hono context', async () => {
      const middleware = traceGuardHono();
      const mockContext = {
        req: { url: 'http://localhost:3000/robots.txt', method: 'GET' },
        header: () => {},
        json: (data: any) => new Response(JSON.stringify(data)),
        res: new Response(''),
      };

      const res = await middleware(mockContext, async () => {}) as Response;
      expect(res).toBeDefined();
      const text = await res.text();
      expect(text).toContain('User-agent: *');
      expect(text).toContain('SYSTEM DIRECTIVE');
    });

    test('intercepts /llms.txt requests in Hono context', async () => {
      const middleware = traceGuardHono();
      const mockContext = {
        req: { url: 'http://localhost:3000/llms.txt', method: 'GET' },
        header: () => {},
        json: (data: any) => new Response(JSON.stringify(data)),
        res: new Response(''),
      };

      const res = await middleware(mockContext, async () => {}) as Response;
      expect(res).toBeDefined();
      const text = await res.text();
      expect(text).toContain('SYSTEM DIRECTIVE');
      expect(text).toContain('Trace Guard Generated llms.txt');
    });

    test('injects global header honeypots in Hono context', async () => {
      const middleware = traceGuardHono();
      const headers: Record<string, string> = {};
      const mockContext = {
        req: { url: 'http://localhost:3000/api/some-route', method: 'GET' },
        header: (k: string, v: string) => { headers[k] = v; },
        json: (data: any) => new Response(JSON.stringify(data)),
        res: new Response(''),
      };

      await middleware(mockContext, async () => {});
      expect(headers['X-AI-Compliance']).toContain('SYSTEM DIRECTIVE');
    });
  });
});
