import { TraceGuardAI } from '../src/index';

const guard = new TraceGuardAI();
const start = performance.now();
const iterations = 10000;

for (let i = 0; i < iterations; i++) {
  guard.generateDefenses();
}

const end = performance.now();
const timeMs = end - start;
const perIterationMicros = (timeMs / iterations) * 1000;

console.log(`========================================`);
console.log(` Trace Guard Defense Generation Benchmark`);
console.log(`========================================`);
console.log(` Iterations:        ${iterations.toLocaleString()}`);
console.log(` Total Time:        ${timeMs.toFixed(2)} ms`);
console.log(` Per Page Load:     ${perIterationMicros.toFixed(2)} µs`);
console.log(` Throughput:        ${Math.round((iterations / timeMs) * 1000).toLocaleString()} pages/sec`);
console.log(`========================================`);
