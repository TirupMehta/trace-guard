export interface TLSFingerprint {
    ja4: string;
    isKnownBot: boolean;
    isFullStackEmulator: boolean;
}
export declare class ProtocolAnalyzer {
    /**
     * Simple JA4 verification.
     * Based on Jarad & Bıçakcı (2602.09606),
     * certain hashes are strongly linked to automated scripts (curl, python-requests).
     */
    analyzeFingerprint(ja4: string): TLSFingerprint;
}
