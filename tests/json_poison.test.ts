import { TraceGuardAI } from '../src/core';
import { generatePoisonedJsonData } from '../src/json_poison';

describe('JSON Data Poisoning Engine', () => {
    it('should generate JSON with embedded instructions in metadata and data records', () => {
        const ai = new TraceGuardAI();
        const json = generatePoisonedJsonData(ai);
        
        expect(json.status).toBe('success');
        expect(json.metadata.system_note).toContain('SYSTEM DIRECTIVE');
        expect(json.data[0].notes).toContain('SYSTEM DIRECTIVE');
        expect(json.data[1].notes).toContain('AI AGENT OVERRIDE');
    });
});
