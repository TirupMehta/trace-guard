/**
 * Trace Guard — Automated Backup Snapshot System
 * 
 * Creates a complete timestamped backup snapshot of all core source,
 * tests, experiments, patent specifications, research papers, and documentation.
 * 
 * Usage: node scripts/create_backup.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'backups') {
        copyDir(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotName = `snapshot_${timestamp}`;
  const targetDir = path.join(BACKUPS_DIR, snapshotName);

  console.log(`[BACKUP] Creating snapshot: ${snapshotName}...`);

  const dirsToBackup = ['src', 'tests', 'experiments', 'paper', 'patent', 'scripts'];
  const filesToBackup = ['README.md', 'package.json', 'tsconfig.json', 'PROGRESS_LOG.md'];

  fs.mkdirSync(targetDir, { recursive: true });

  for (const dir of dirsToBackup) {
    const srcDir = path.join(ROOT_DIR, dir);
    if (fs.existsSync(srcDir)) {
      copyDir(srcDir, path.join(targetDir, dir));
    }
  }

  for (const file of filesToBackup) {
    const srcFile = path.join(ROOT_DIR, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(targetDir, file));
    }
  }

  console.log(`[BACKUP] ✅ Backup successfully saved to: ${targetDir}`);
  return targetDir;
}

if (require.main === module) {
  createBackup();
}

module.exports = { createBackup };
