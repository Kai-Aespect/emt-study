import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const root = process.cwd();
const dbPath = path.join(root, 'data', 'ems_study_app.sqlite');

const requiredTables = [
  'readme',
  'data_dictionary',
  'taxonomy',
  'modules',
  'lessons',
  'lesson_objectives',
  'foundations',
  'foundations_review_map',
  'remediation_rules',
  'skills',
  'skill_steps',
  'drugs',
  'drug_classes',
  'ecg_bank',
  'calculation_drills',
  'scenarios',
  'scenario_steps',
  'scenario_branches',
  'questions',
  'question_options',
  'question_rationales',
  'psychometrics',
  'references',
  'content_links',
  'content_reference_links',
  'media_manifest',
  'media_links',
  'protocol_overrides',
  'glossary',
  'slide_inventory',
  'slide_mapping',
  'qc_log',
  'changelog',
  'chunk_manifest',
  'ai_mode_prompts',
  'sql_schema',
];

const expectedCounts = {
  modules: 24,
  lessons: 576,
  scenarios: 187,
  questions: 470,
  drugs: 10,
  skills: 11,
  ecg_bank: 12,
  foundations: 20,
};

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

if (!fs.existsSync(dbPath)) {
  throw new Error(`Database does not exist: ${dbPath}`);
}

const db = new Database(dbPath, { fileMustExist: true });
const objects = db
  .prepare("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name")
  .all();
const objectNames = new Set(objects.map((object) => object.name));

let failed = false;
for (const tableName of requiredTables) {
  if (!objectNames.has(tableName)) {
    console.error(`MISSING: ${tableName}`);
    failed = true;
    continue;
  }

  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`).get();
  console.log(`${tableName}: ${row.count}`);
  if (row.count === 0) {
    console.error(`EMPTY: ${tableName}`);
    failed = true;
  }

  if (expectedCounts[tableName] !== undefined && row.count !== expectedCounts[tableName]) {
    console.error(`COUNT MISMATCH: ${tableName} expected ${expectedCounts[tableName]}, got ${row.count}`);
    failed = true;
  }
}

db.close();

if (failed) {
  process.exit(1);
}

console.log('Database verification passed.');
