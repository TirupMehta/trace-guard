export interface TraceGuardOptions {
    enabled?: boolean;
    threshold?: number;
    mode?: 'block' | 'challenge' | 'monitor';
    onDetection?: (result: any) => void;
    exclude?: string[];
}
export declare const getScriptToInject: (sessionId: string, signature: string) => string;
export declare function setupHook(options?: TraceGuardOptions): void;
