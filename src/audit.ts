/**
 * Trace Guard — Enterprise SIEM & Audit Logger
 * 
 * Formats detection events into standard security log formats:
 * 1. Common Event Format (CEF) for ArcSight / Splunk
 * 2. Syslog RFC 5424 Format
 * 3. Structured JSON Audit Streams
 * 
 * @author Tirup Mehta
 * @license ISC
 */

import { DetectionEvent } from './core';

export function formatCefEvent(event: DetectionEvent): string {
  const cefHeader = 'CEF:0|TraceGuard|TraceGuardAI|3.7.1|LLM_AGENT_DETECTED|Autonomous AI Agent Detected|8|';
  const extension = `canaryId=${event.canaryId} canaryType=${event.canaryType} secret=${event.secret} rt=${event.timestamp} msg=${encodeURIComponent(event.context || '')}`;
  return `${cefHeader}${extension}`;
}

export function formatSyslogEvent(event: DetectionEvent): string {
  const isoTime = new Date(event.timestamp).toISOString();
  return `<134>1 ${isoTime} localhost trace-guard - - - [detection canaryId="${event.canaryId}" type="${event.canaryType}"] LLM Agent Detected (${event.secret})`;
}
