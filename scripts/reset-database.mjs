import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dbPath = path.join(root, 'data', 'ems_study_app.sqlite');

for (const suffix of ['', '-shm', '-wal']) {
  const target = `${dbPath}${suffix}`;
  if (fs.existsSync(target)) {
    fs.rmSync(target, { force: true });
    console.log(`Removed ${target}`);
  }
}

console.log('Database reset complete. Run npm run import:data to rebuild it.');
