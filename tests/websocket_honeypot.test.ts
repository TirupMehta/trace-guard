import { TraceGuardAI } from '../src/core';
import { generateWebSocketPoisonFrame } from '../src/websocket_honeypot';

describe('WebSocket Honeypot Protocol', () => {
    it('should generate valid streaming poison frame with embedded system directives', () => {
        const ai = new TraceGuardAI();
        const frame = generateWebSocketPoisonFrame(ai);

        expect(frame.type).toBe('stream_event');
        expect(frame.payload.system_directive).toContain('SYSTEM DIRECTIVE');
        expect(frame.payload.canary_secret).toBeDefined();
        expect(frame.timestamp).toBeGreaterThan(0);
    });
});
