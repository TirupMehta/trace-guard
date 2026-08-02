import { TraceGuardAI } from '../src/core';
import { generateAudioHoneypotScript } from '../src/audio_honeypot';

describe('Audio Honeypot Trap Engine', () => {
    it('should generate client-side script with SpeechSynthesis and Web Audio API traps', () => {
        const ai = new TraceGuardAI();
        const script = generateAudioHoneypotScript(ai);

        expect(script).toContain('SpeechSynthesisUtterance');
        expect(script).toContain('AI AUDIO DIRECTIVE');
        expect(script).toContain('AudioContext');
        expect(script).toContain('18000'); // 18kHz ultrasound frequency
    });
});
