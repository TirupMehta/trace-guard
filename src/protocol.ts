export interface TLSFingerprint {
  ja4: string;
  isKnownBot: boolean;
  isFullStackEmulator: boolean;
}

const SCRIPT_HASHES = [
  'c01_0001_0001', // Example: python-requests
  'c01_0002_0002', // Example: curl
];

const BROWSER_HASHES = [
  'c01_a001_b001', // Example: Chrome
  'c01_a002_b002', // Example: Firefox
];

export class ProtocolAnalyzer {
  /**
   * Simple JA4 verification.
   * Based on Jarad & Bıçakcı (2602.09606), 
   * certain hashes are strongly linked to automated scripts (curl, python-requests).
   */
  public analyzeFingerprint(ja4: string): TLSFingerprint {
    if (SCRIPT_HASHES.some(h => ja4.includes(h))) {
      return { ja4, isKnownBot: true, isFullStackEmulator: false };
    }

    if (BROWSER_HASHES.some(h => ja4.includes(h))) {
      // Browsers pass JA4, but could be Puppeteer/Playwright
      return { ja4, isKnownBot: false, isFullStackEmulator: true };
    }

    return { ja4, isKnownBot: false, isFullStackEmulator: false };
  }
}
