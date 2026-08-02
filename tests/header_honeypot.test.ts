import { TraceGuardAI } from '../src/core';
import { getSafeGlobalHeaders } from '../src/header_honeypot';

describe('HTTP Header Honeypot', () => {
    it('should generate headers with embedded instructions', () => {
        const ai = new TraceGuardAI();
        const headers = getSafeGlobalHeaders(ai);
        
        expect(headers['X-AI-Compliance']).toContain('SYSTEM DIRECTIVE');
        expect(headers['Server-Timing']).toContain('SYSTEM DIRECTIVE');
        expect(headers['Link']).toContain('rel="alternate"');
        expect(headers['Link']).toContain('/_tg_decoy');
    });
});
