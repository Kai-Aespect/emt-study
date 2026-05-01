import path from 'node:path';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

export const databaseUrl = process.env.DATABASE_URL || './data/ems_study_app.sqlite';
export const databasePath = path.resolve(process.cwd(), databaseUrl);

let db;

export function getDb() {
  if (!db) {
    db = new Database(databasePath, { fileMustExist: true });
    db.pragma('foreign_keys = ON');
  }

  return db;
}

export function tableExists(tableName) {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);

  return Boolean(row);
}

export function getTableColumns(tableName) {
  if (!tableExists(tableName)) {
    return [];
  }

  return getDb()
    .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
    .all()
    .map((column) => column.name);
}

export function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}
