import { TraceGuardAI } from '../src/index';

const guard = new TraceGuardAI();
const start = performance.now();
const iterations = 1000000;

for (let i = 0; i < iterations; i++) {
  guard.analyzeSession('t13d1516w2-t13d3111w2', [
    { x: 0, y: 0, t: 0 },
    { x: 50, y: 50, t: 100 },
    { x: 100, y: 100, t: 200 },
    { x: 120, y: 130, t: 300 }
  ]);
}

const end = performance.now();
const timeMs = end - start;
console.log(`Execution Time: ${timeMs.toFixed(2)} ms`);
