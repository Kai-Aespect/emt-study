import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { databasePath, getDb, getTableColumns, quoteIdentifier, tableExists } from './db.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

const endpointTables = {
  modules: 'modules',
  lessons: 'lessons',
  scenarios: 'scenarios',
  questions: 'questions',
  drugs: 'drugs',
  skills: 'skills',
  ecg: 'ecg_bank',
  foundations: 'foundations',
  media: 'media_manifest',
};

function getCount(tableName) {
  if (!tableExists(tableName)) {
    return 0;
  }

  const row = getDb().prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`).get();
  return row.count;
}

function buildListQuery(tableName, query) {
  const columns = getTableColumns(tableName);
  const where = [];
  const params = {};

  for (const key of ['level', 'module_id', 'taxonomy_id']) {
    if (query[key] && columns.includes(key)) {
      where.push(`${quoteIdentifier(key)} = @${key}`);
      params[key] = query[key];
    }
  }

  if (query.q) {
    const searchableColumns = columns.filter((column) => column !== '');
    const clauses = searchableColumns.map((column, index) => {
      const param = `q${index}`;
      params[param] = `%${query.q}%`;
      return `${quoteIdentifier(column)} LIKE @${param}`;
    });

    if (clauses.length > 0) {
      where.push(`(${clauses.join(' OR ')})`);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const requestedLimit = Number(query.limit || 100);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 100;
  const offset = Number.isFinite(Number(query.offset)) ? Math.max(Number(query.offset), 0) : 0;

  return { columns, whereSql, params, limit, offset };
}

app.get('/api/health', (_req, res) => {
  const counts = Object.fromEntries(
    Object.entries(endpointTables).map(([name, table]) => [name, getCount(table)]),
  );

  res.json({
    ok: true,
    database: {
      connected: true,
      path: databasePath,
    },
    counts,
  });
});

for (const [routeName, tableName] of Object.entries(endpointTables)) {
  app.get(`/api/${routeName}`, (req, res) => {
    if (!tableExists(tableName)) {
      res.status(404).json({ error: `Table not found: ${tableName}` });
      return;
    }

    const { columns, whereSql, params, limit, offset } = buildListQuery(tableName, req.query);
    const tableSql = quoteIdentifier(tableName);
    const total = getDb()
      .prepare(`SELECT COUNT(*) AS count FROM ${tableSql} ${whereSql}`)
      .get(params).count;
    const data = getDb()
      .prepare(`SELECT * FROM ${tableSql} ${whereSql} LIMIT @limit OFFSET @offset`)
      .all({ ...params, limit, offset });

    res.json({
      table: tableName,
      columns,
      count: total,
      limit,
      offset,
      data,
      filters: {
        q: req.query.q || '',
        level: req.query.level || '',
        module_id: req.query.module_id || '',
        taxonomy_id: req.query.taxonomy_id || '',
      },
    });
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`EMS Study API running on http://localhost:${port}`);
});
