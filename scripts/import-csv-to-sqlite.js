import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

dotenv.config();

const projectRoot = process.cwd();
const sourceZip =
  process.env.CSV_EXPORT_ZIP ||
  path.join(projectRoot, 'data', 'ems_study_app_database_v1_csv_exports.zip');
const csvDir = path.join(projectRoot, 'data', 'csv');
const dbPath = path.resolve(projectRoot, process.env.DATABASE_URL || './data/ems_study_app.sqlite');

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function tableNameFromFile(fileName) {
  return path.basename(fileName, '.csv').replace(/[^A-Za-z0-9_]/g, '_');
}

function unzipCsvExports() {
  if (!fs.existsSync(sourceZip)) {
    throw new Error(`CSV export ZIP not found: ${sourceZip}`);
  }

  fs.mkdirSync(csvDir, { recursive: true });
  const zip = new AdmZip(sourceZip);
  zip.extractAllTo(csvDir, true);
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return parse(text, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
}

function getHeaders(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const [headers = []] = parse(text, {
    bom: true,
    to_line: 1,
    relax_column_count: true,
  });

  return headers.map((header) => String(header).trim());
}

function createTable(db, tableName, headers) {
  db.prepare(`DROP TABLE IF EXISTS ${quoteIdentifier(tableName)}`).run();

  const columnSql = headers.map((header) => `${quoteIdentifier(header)} TEXT`).join(', ');
  db.prepare(`CREATE TABLE ${quoteIdentifier(tableName)} (${columnSql})`).run();
}

function insertRows(db, tableName, headers, rows) {
  if (rows.length === 0) {
    return;
  }

  const columnsSql = headers.map(quoteIdentifier).join(', ');
  const placeholders = headers.map(() => '?').join(', ');
  const insert = db.prepare(
    `INSERT INTO ${quoteIdentifier(tableName)} (${columnsSql}) VALUES (${placeholders})`,
  );

  const insertMany = db.transaction((records) => {
    for (const record of records) {
      insert.run(headers.map((header) => record[header] ?? ''));
    }
  });

  insertMany(rows);
}

function main() {
  unzipCsvExports();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const csvFiles = fs
    .readdirSync(csvDir)
    .filter((file) => file.toLowerCase().endsWith('.csv'))
    .sort();

  db.prepare(
    'CREATE TABLE import_manifest (table_name TEXT PRIMARY KEY, source_file TEXT NOT NULL, row_count TEXT NOT NULL, imported_at TEXT NOT NULL)',
  ).run();

  for (const file of csvFiles) {
    const filePath = path.join(csvDir, file);
    const tableName = tableNameFromFile(file);
    const headers = getHeaders(filePath);
    const rows = readCsv(filePath);

    if (headers.length === 0) {
      console.warn(`Skipping ${file}: no headers found`);
      continue;
    }

    createTable(db, tableName, headers);
    insertRows(db, tableName, headers, rows);
    db.prepare(
      'INSERT INTO import_manifest (table_name, source_file, row_count, imported_at) VALUES (?, ?, ?, ?)',
    ).run(tableName, file, String(rows.length), new Date().toISOString());
    console.log(`Imported ${rows.length.toString().padStart(5)} rows into ${tableName}`);
  }

  db.close();
  console.log(`SQLite database written to ${dbPath}`);
}

main();
