import { formatCefEvent, formatSyslogEvent } from '../src/audit';
import { DetectionEvent } from '../src/core';

describe('Enterprise SIEM Audit Exporter', () => {
  const mockEvent: DetectionEvent = {
    canaryId: 'tg_123',
    canaryType: 'ax-tree-region',
    secret: 'TGCANARY_TEST123',
    timestamp: 1700000000000,
    context: 'Test AX Region Trigger',
  };

  test('formats event into valid Common Event Format (CEF)', () => {
    const cef = formatCefEvent(mockEvent);
    expect(cef).toContain('CEF:0|TraceGuard|TraceGuardAI|3.7.1|LLM_AGENT_DETECTED');
    expect(cef).toContain('canaryId=tg_123');
    expect(cef).toContain('TGCANARY_TEST123');
  });

  test('formats event into valid Syslog RFC 5424 format', () => {
    const syslog = formatSyslogEvent(mockEvent);
    expect(syslog).toContain('localhost trace-guard');
    expect(syslog).toContain('canaryId="tg_123"');
    expect(syslog).toContain('TGCANARY_TEST123');
  });
});
