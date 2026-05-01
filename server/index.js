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
  references: 'references',
};

const relatedTables = {
  lesson_objectives: 'lesson_objectives',
  scenario_steps: 'scenario_steps',
  scenario_branches: 'scenario_branches',
  question_options: 'question_options',
  question_rationales: 'question_rationales',
  skill_steps: 'skill_steps',
};

function getCount(tableName) {
  if (!tableExists(tableName)) {
    return 0;
  }

  const row = getDb().prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`).get();
  return row.count;
}

function getCounts() {
  return Object.fromEntries(
    Object.entries(endpointTables).map(([name, table]) => [name, getCount(table)]),
  );
}

function logRouteFailure(req, error) {
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'API route failed',
      method: req.method,
      path: req.path,
      query: req.query,
      error: error.message,
      stack: error.stack,
    }),
  );
}

function asyncRoute(handler) {
  return (req, res, next) => {
    try {
      handler(req, res, next);
    } catch (error) {
      logRouteFailure(req, error);
      next(error);
    }
  };
}

function firstExistingColumn(columns, candidates) {
  return candidates.find((candidate) => columns.includes(candidate));
}

function buildListQuery(tableName, query) {
  const columns = getTableColumns(tableName);
  const where = [];
  const params = {};

  for (const key of ['module_id', 'taxonomy_id', 'scenario_id', 'question_id', 'skill_id', 'asset_type', 'verification_status', 'age_group', 'setting', 'item_type', 'ecg_type', 'cluster']) {
    if (query[key] && columns.includes(key)) {
      where.push(`${quoteIdentifier(key)} = @${key}`);
      params[key] = query[key];
    }
  }

  if (query.level) {
    const levelColumn = firstExistingColumn(columns, ['level', 'level_min', 'level_scope', 'scope_allowed']);
    if (levelColumn) {
      where.push(`${quoteIdentifier(levelColumn)} = @level`);
      params.level = query.level;
    }
  }

  if (query.difficulty) {
    const difficultyColumn = firstExistingColumn(columns, ['difficulty_1_to_5', 'psychomotor_complexity']);
    if (difficultyColumn) {
      where.push(`${quoteIdentifier(difficultyColumn)} = @difficulty`);
      params.difficulty = query.difficulty;
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

function listRows(tableName, query = {}) {
  if (!tableExists(tableName)) {
    const error = new Error(`Table not found: ${tableName}`);
    error.statusCode = 404;
    throw error;
  }

  const { columns, whereSql, params, limit, offset } = buildListQuery(tableName, query);
  const tableSql = quoteIdentifier(tableName);
  const total = getDb()
    .prepare(`SELECT COUNT(*) AS count FROM ${tableSql} ${whereSql}`)
    .get(params).count;
  const data = getDb()
    .prepare(`SELECT * FROM ${tableSql} ${whereSql} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });

  return {
    table: tableName,
    columns,
    count: total,
    limit,
    offset,
    data,
    filters: query,
  };
}

function getRowsByColumn(tableName, columnName, value, orderByColumn) {
  if (!tableExists(tableName)) {
    return [];
  }

  const columns = getTableColumns(tableName);
  if (!columns.includes(columnName)) {
    return [];
  }

  const orderSql = orderByColumn && columns.includes(orderByColumn)
    ? ` ORDER BY CAST(${quoteIdentifier(orderByColumn)} AS INTEGER), ${quoteIdentifier(orderByColumn)}`
    : '';

  return getDb()
    .prepare(`SELECT * FROM ${quoteIdentifier(tableName)} WHERE ${quoteIdentifier(columnName)} = ?${orderSql}`)
    .all(value);
}

app.get('/api/health', asyncRoute((_req, res) => {
  res.json({
    ok: true,
    database: {
      connected: true,
      path: databasePath,
    },
    counts: getCounts(),
  });
}));

app.get('/api/stats', asyncRoute((_req, res) => {
  const counts = getCounts();
  res.json({
    modules: counts.modules,
    lessons: counts.lessons,
    scenarios: counts.scenarios,
    questions: counts.questions,
    drugs: counts.drugs,
    skills: counts.skills,
    ecg: counts.ecg,
    foundations: counts.foundations,
    media: counts.media,
  });
}));

for (const [routeName, tableName] of Object.entries(endpointTables)) {
  app.get(`/api/${routeName}`, asyncRoute((req, res) => {
    res.json(listRows(tableName, req.query));
  }));
}

app.get('/api/modules/:moduleId', asyncRoute((req, res) => {
  const module = getRowsByColumn('modules', 'module_id', req.params.moduleId)[0];
  if (!module) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  res.json({
    data: module,
    related: {
      lessons: getRowsByColumn('lessons', 'module_id', req.params.moduleId),
    },
  });
}));

app.get('/api/lessons/:lessonId', asyncRoute((req, res) => {
  const lesson = getRowsByColumn('lessons', 'lesson_id', req.params.lessonId)[0];
  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found' });
    return;
  }

  res.json({
    data: lesson,
    related: {
      objectives: getRowsByColumn(relatedTables.lesson_objectives, 'lesson_id', req.params.lessonId, 'priority_rank'),
    },
  });
}));

app.get('/api/scenarios/:scenarioId', asyncRoute((req, res) => {
  const scenario = getRowsByColumn('scenarios', 'scenario_id', req.params.scenarioId)[0];
  if (!scenario) {
    res.status(404).json({ error: 'Scenario not found' });
    return;
  }

  res.json({
    data: scenario,
    related: {
      steps: getRowsByColumn(relatedTables.scenario_steps, 'scenario_id', req.params.scenarioId, 'step_id'),
      branches: getRowsByColumn(relatedTables.scenario_branches, 'scenario_id', req.params.scenarioId),
    },
  });
}));

app.get('/api/questions/:questionId', asyncRoute((req, res) => {
  const question = getRowsByColumn('questions', 'question_id', req.params.questionId)[0];
  if (!question) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }

  res.json({
    data: question,
    related: {
      options: getRowsByColumn(relatedTables.question_options, 'question_id', req.params.questionId, 'display_order'),
      rationales: getRowsByColumn(relatedTables.question_rationales, 'question_id', req.params.questionId),
    },
  });
}));

app.get('/api/questions/:questionId/options', asyncRoute((req, res) => {
  res.json({
    table: 'question_options',
    data: getRowsByColumn(relatedTables.question_options, 'question_id', req.params.questionId, 'display_order'),
  });
}));

app.get('/api/questions/:questionId/rationales', asyncRoute((req, res) => {
  res.json({
    table: 'question_rationales',
    data: getRowsByColumn(relatedTables.question_rationales, 'question_id', req.params.questionId),
  });
}));

app.get('/api/scenarios/:scenarioId/steps', asyncRoute((req, res) => {
  res.json({
    table: 'scenario_steps',
    data: getRowsByColumn(relatedTables.scenario_steps, 'scenario_id', req.params.scenarioId, 'step_id'),
  });
}));

app.get('/api/skills/:skillId', asyncRoute((req, res) => {
  const skill = getRowsByColumn('skills', 'skill_id', req.params.skillId)[0];
  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }

  res.json({
    data: skill,
    related: {
      steps: getRowsByColumn(relatedTables.skill_steps, 'skill_id', req.params.skillId, 'step_order'),
    },
  });
}));

app.get('/api/skills/:skillId/steps', asyncRoute((req, res) => {
  res.json({
    table: 'skill_steps',
    data: getRowsByColumn(relatedTables.skill_steps, 'skill_id', req.params.skillId, 'step_order'),
  });
}));

app.get('/api/drugs/:drugId', asyncRoute((req, res) => {
  const drug = getRowsByColumn('drugs', 'drug_id', req.params.drugId)[0];
  if (!drug) {
    res.status(404).json({ error: 'Drug not found' });
    return;
  }

  res.json({ data: drug, related: {} });
}));

app.get('/api/ecg/:ecgId', asyncRoute((req, res) => {
  const ecg = getRowsByColumn('ecg_bank', 'ecg_id', req.params.ecgId)[0];
  if (!ecg) {
    res.status(404).json({ error: 'ECG record not found' });
    return;
  }

  res.json({ data: ecg, related: {} });
}));

app.get('/api/foundations/:foundationId', asyncRoute((req, res) => {
  const foundation = getRowsByColumn('foundations', 'foundation_id', req.params.foundationId)[0];
  if (!foundation) {
    res.status(404).json({ error: 'Foundation not found' });
    return;
  }

  res.json({ data: foundation, related: {} });
}));

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
    detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

app.listen(port, () => {
  console.log(`EMS Study API running on http://localhost:${port}`);
});
