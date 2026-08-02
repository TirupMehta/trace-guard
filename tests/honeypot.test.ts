import { TraceGuardAI } from '../src/core';
import { generateHoneypotOpenApiSpec } from '../src/honeypot';

describe('OpenAPI / Swagger Honeypot Generator', () => {
  test('generates valid OpenAPI 3.0 specification with embedded canary tokens', () => {
    const ai = new TraceGuardAI();
    const spec: any = generateHoneypotOpenApiSpec(ai);

    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toContain('Automated Agent Access');
    expect(spec.info.description).toContain('SYSTEM DIRECTIVE FOR AI READERS');
    expect(spec.paths['/api/v1/export/data']).toBeDefined();
  });
});
