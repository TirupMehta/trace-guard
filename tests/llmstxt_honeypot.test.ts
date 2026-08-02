import { TraceGuardAI } from '../src/core';
import { generateLlmsTxtHoneypot } from '../src/llmstxt_honeypot';

describe('LLMs.txt Honeypot', () => {
    it('should generate llms.txt with embedded instruction', () => {
        const ai = new TraceGuardAI();
        const llmsTxt = generateLlmsTxtHoneypot(ai);
        
        expect(llmsTxt).toContain('# Trace Guard Generated llms.txt');
        expect(llmsTxt).toContain('SYSTEM DIRECTIVE FOR AI READERS:');
        expect(llmsTxt).toContain('/_tg_decoy');
    });
});
