import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

const root = process.cwd();
const dataDir = path.join(root, 'data');
const sourceDir = path.join(dataDir, 'source');
const csvDir = path.join(dataDir, 'csv_exports');
const dbPath = path.join(dataDir, 'ems_study_app.sqlite');

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function tableNameFromFile(fileName) {
  return path.basename(fileName, '.csv').replace(/[^A-Za-z0-9_]/g, '_');
}

function ensureSourceExports() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(csvDir, { recursive: true });

  const existingCsvs = fs.readdirSync(csvDir).filter((file) => file.toLowerCase().endsWith('.csv'));
  if (existingCsvs.length > 0) {
    return;
  }

  const zip = fs
    .readdirSync(sourceDir)
    .find((file) => file.toLowerCase().endsWith('.zip') && file.toLowerCase().includes('csv'));

  if (zip) {
    new AdmZip(path.join(sourceDir, zip)).extractAllTo(csvDir, true);
    return;
  }

  const workbookFile = fs
    .readdirSync(sourceDir)
    .find((file) => file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls'));

  if (!workbookFile) {
    throw new Error(`No CSV exports, CSV ZIP, or workbook found under ${sourceDir}`);
  }

  const workbook = XLSX.readFile(path.join(sourceDir, workbookFile), { cellDates: false });
  for (const sheetName of workbook.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], { blankrows: false });
    const safeName = sheetName.replace(/[^A-Za-z0-9_]/g, '_');
    fs.writeFileSync(path.join(csvDir, `${safeName}.csv`), csv, 'utf8');
  }
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.trim()) {
    return { headers: [], rows: [] };
  }

  const records = parse(text, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: false,
    trim: false,
  });
  const headerRow = parse(text, {
    bom: true,
    to_line: 1,
    relax_column_count: false,
  })[0] ?? [];

  return {
    headers: headerRow.map((header) => String(header).trim()),
    rows: records,
  };
}

function inferType(header, values) {
  const nonEmpty = values.filter((value) => value !== null && value !== undefined && String(value) !== '');
  const lower = header.toLowerCase();

  if (nonEmpty.length === 0) {
    return 'TEXT';
  }

  if (lower === 'id' || lower.endsWith('_id') || lower.includes('_id_') || lower.includes('id_nullable')) {
    return 'TEXT';
  }

  if (lower.includes('date') || lower.includes('url') || lower.includes('json') || lower.includes('text') || lower.includes('note')) {
    return 'TEXT';
  }

  if (nonEmpty.every((value) => /^-?\d+$/.test(String(value)))) {
    return 'INTEGER';
  }

  if (nonEmpty.every((value) => /^-?(\d+|\d*\.\d+)$/.test(String(value)))) {
    return 'REAL';
  }

  return 'TEXT';
}

function normalizeValue(value, sqliteType) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (sqliteType === 'INTEGER') {
    return Number.parseInt(value, 10);
  }

  if (sqliteType === 'REAL') {
    return Number.parseFloat(value);
  }

  return String(value);
}

function importTable(db, fileName) {
  const filePath = path.join(csvDir, fileName);
  const tableName = tableNameFromFile(fileName);
  const { headers, rows } = readCsv(filePath);

  if (headers.length === 0) {
    console.log(`${tableName}: 0 rows (empty source)`);
    return { tableName, rowCount: 0 };
  }

  const seen = new Set();
  for (const header of headers) {
    if (!header) {
      throw new Error(`${fileName} has an empty column header`);
    }
    if (seen.has(header)) {
      throw new Error(`${fileName} has duplicate column header: ${header}`);
    }
    seen.add(header);
  }

  const types = Object.fromEntries(
    headers.map((header) => [header, inferType(header, rows.map((row) => row[header]))]),
  );
  const columnsSql = headers
    .map((header) => `${quoteIdentifier(header)} ${types[header]}`)
    .join(', ');

  db.prepare(`DROP TABLE IF EXISTS ${quoteIdentifier(tableName)}`).run();
  db.prepare(`CREATE TABLE ${quoteIdentifier(tableName)} (${columnsSql})`).run();

  if (rows.length > 0) {
    const insert = db.prepare(
      `INSERT INTO ${quoteIdentifier(tableName)} (${headers.map(quoteIdentifier).join(', ')}) VALUES (${headers.map(() => '?').join(', ')})`,
    );
    const insertRows = db.transaction((records) => {
      for (const row of records) {
        insert.run(headers.map((header) => normalizeValue(row[header], types[header])));
      }
    });
    insertRows(rows);
  }

  console.log(`${tableName}: ${rows.length} rows`);
  return { tableName, rowCount: rows.length };
}

function createCompatibilityViews(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view')").all().map((row) => row.name);
  if (tables.includes('ai_prompts') && !tables.includes('ai_mode_prompts')) {
    db.prepare('CREATE VIEW ai_mode_prompts AS SELECT * FROM ai_prompts').run();
    console.log('ai_mode_prompts: compatibility view for ai_prompts');
  }
}

function main() {
  ensureSourceExports();

  for (const suffix of ['', '-shm', '-wal']) {
    const target = `${dbPath}${suffix}`;
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  const csvFiles = fs
    .readdirSync(csvDir)
    .filter((file) => file.toLowerCase().endsWith('.csv'))
    .sort();

  if (csvFiles.length === 0) {
    throw new Error(`No CSV files found under ${csvDir}`);
  }

  db.prepare(
    'CREATE TABLE import_manifest (table_name TEXT PRIMARY KEY, source_file TEXT NOT NULL, row_count INTEGER NOT NULL, imported_at TEXT NOT NULL)',
  ).run();

  for (const fileName of csvFiles) {
    try {
      const result = importTable(db, fileName);
      db.prepare('INSERT INTO import_manifest (table_name, source_file, row_count, imported_at) VALUES (?, ?, ?, ?)').run(
        result.tableName,
        fileName,
        result.rowCount,
        new Date().toISOString(),
      );
    } catch (error) {
      throw new Error(`Failed importing ${fileName}: ${error.message}`);
    }
  }

  createCompatibilityViews(db);
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  console.log(`SQLite database created at ${dbPath}`);
}

main();
