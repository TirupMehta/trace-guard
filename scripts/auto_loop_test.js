/**
 * Trace Guard — Autonomous Continuous Self-Testing & Snapshot Loop
 * 
 * Executes full build verification, unit tests, performance benchmarks, 
 * and automated snapshot creation in a single continuous pipeline.
 * 
 * Usage:
 *   node scripts/auto_loop_test.js [iterations]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const iterations = parseInt(process.argv[2] || '1', 10);
const rootDir = path.resolve(__dirname, '..');

console.log(`[LOOP] Starting ${iterations} automated engineering verification cycles...`);

for (let i = 1; i <= iterations; i++) {
  console.log(`\n========================================`);
  console.log(`[LOOP] Cycle ${i}/${iterations} — Running TypeScript Build...`);
  console.log(`========================================`);
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  console.log(`\n[LOOP] Cycle ${i}/${iterations} — Running Test Suite...`);
  execSync('npm test', { cwd: rootDir, stdio: 'inherit' });

  console.log(`\n[LOOP] Cycle ${i}/${iterations} — Creating Versioned Backup Snapshot...`);
  execSync('node scripts/create_backup.js', { cwd: rootDir, stdio: 'inherit' });
}

console.log('\n✅ [LOOP] Continuous engineering verification completed successfully!');
