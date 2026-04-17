import { TraceGuardAI } from './core';
import { setupHook, TraceGuardOptions } from './hook';

function traceGuard(options?: TraceGuardOptions) {
  setupHook(options);
  return traceGuard; // allow chaining or further calls
}

// Expose the core class for manual mode developers
traceGuard.TraceGuardAI = TraceGuardAI;

// Auto-enable zero-setup on require()
setupHook({ enabled: true });

export = traceGuard;
