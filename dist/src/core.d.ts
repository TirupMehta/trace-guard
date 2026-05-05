import { MouseEvent } from './behavioral';
export declare class TraceGuardAI {
    private behavioral;
    private protocol;
    private pathCache;
    private serverSecret;
    generateSessionToken(): {
        sessionId: string;
        signature: string;
    };
    analyzeSession(ja4: string, mouseEvents: MouseEvent[], options?: {
        sessionId?: string;
        signature?: string;
        decoyTriggered?: boolean;
        trapId?: string;
        automation?: {
            webdriver?: boolean;
            chrome?: boolean;
            languages?: boolean;
            plugins?: boolean;
            notification?: boolean;
            headless?: boolean;
            softwareRenderer?: boolean;
            nativePatched?: boolean;
        };
        challengeSolved?: boolean;
        isMobile?: boolean;
    }): {
        score: number;
        decision: 'allow' | 'challenge' | 'block';
        reason: string;
        features: any;
    };
}
