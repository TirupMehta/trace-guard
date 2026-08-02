/**
 * Trace Guard — CDP & Browser Automation Fingerprint Trap Engine
 * 
 * Injects lightweight DOM traps that detect underlying headless automation frameworks
 * used by LLM agents (e.g. Playwright CDP, Selenium, Puppeteer Stealth leaks).
 * 
 * @author Tirup Mehta
 * @license ISC
 */

export function generateCdpTrapScript(): string {
  return `
(function() {
  if (window.__TG_CDP_TRAP__) return;
  window.__TG_CDP_TRAP__ = true;

  var checkAutomation = function() {
    var detected = false;
    var reason = '';

    if (navigator.webdriver) {
      detected = true;
      reason = 'NAVIGATOR_WEBDRIVER_TRUE';
    } else if (window.__nightmare || window._phantom || window.callPhantom || window.__selenium_evaluate) {
      detected = true;
      reason = 'SELENIUM_PHANTOM_LEAK';
    } else if (window.document.documentElement.getAttribute('webdriver')) {
      detected = true;
      reason = 'ATTRIBUTE_WEBDRIVER_PRESENT';
    }

    if (detected) {
      try {
        fetch('/_tg/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canaryId: 'cdp_trap_001',
            type: 'hidden-input',
            secret: 'CDP_AUTOMATION_LEAK',
            context: 'Headless Automation Leak: ' + reason,
            t: Date.now()
          })
        });
      } catch (e) {}
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAutomation);
  } else {
    checkAutomation();
  }
})();
`;
}
