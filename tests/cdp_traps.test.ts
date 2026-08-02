import { generateCdpTrapScript } from '../src/cdp_traps';

describe('CDP & Browser Automation Trap Engine', () => {
  test('generates client-side CDP automation detection script', () => {
    const script = generateCdpTrapScript();
    expect(script).toContain('navigator.webdriver');
    expect(script).toContain('__TG_CDP_TRAP__');
    expect(script).toContain('SELENIUM_PHANTOM_LEAK');
    expect(script).toContain('/_tg/detect');
  });
});
