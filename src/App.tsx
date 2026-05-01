import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileQuestion,
  Filter,
  GraduationCap,
  Heart,
  Home,
  Image,
  Pill,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  Video,
} from 'lucide-react';

type Counts = Record<string, number>;
type ApiKey =
  | 'modules'
  | 'lessons'
  | 'scenarios'
  | 'questions'
  | 'drugs'
  | 'skills'
  | 'ecg'
  | 'foundations'
  | 'media';
type PageKey = 'dashboard' | ApiKey;

type HealthResponse = {
  ok: boolean;
  database: {
    connected: boolean;
    path: string;
  };
  counts: Counts;
};

type ListResponse = {
  table: string;
  columns: string[];
  count: number;
  limit: number;
  offset: number;
  data: Record<string, string>[];
};

type PageConfig = {
  key: PageKey;
  apiKey?: ApiKey;
  label: string;
  eyebrow: string;
  description: string;
  icon: typeof Home;
  accent: string;
  primaryField: string;
  secondaryFields: string[];
  metricLabel: string;
};

const pages: PageConfig[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    eyebrow: 'Command Center',
    description: 'Your EMS study readiness, current priorities, and database status in one view.',
    icon: Home,
    accent: 'orange',
    primaryField: 'title',
    secondaryFields: [],
    metricLabel: 'Records',
  },
  {
    key: 'modules',
    apiKey: 'modules',
    label: 'Modules',
    eyebrow: 'Curriculum',
    description: 'Browse structured EMT, AEMT, Paramedic, and shared training modules.',
    icon: BookOpen,
    accent: 'teal',
    primaryField: 'title',
    secondaryFields: ['level', 'module_type', 'short_summary'],
    metricLabel: 'Modules',
  },
  {
    key: 'lessons',
    apiKey: 'lessons',
    label: 'Lessons',
    eyebrow: 'Learning Library',
    description: 'Review lesson summaries, red flags, field pearls, and difficulty levels.',
    icon: GraduationCap,
    accent: 'orange',
    primaryField: 'title',
    secondaryFields: ['level', 'difficulty_1_to_5', 'short_summary'],
    metricLabel: 'Lessons',
  },
  {
    key: 'scenarios',
    apiKey: 'scenarios',
    label: 'Scenarios',
    eyebrow: 'Field Practice',
    description: 'Explore realistic scenario records by level, setting, acuity, and outcome.',
    icon: Play,
    accent: 'coral',
    primaryField: 'dispatch_information',
    secondaryFields: ['level', 'setting', 'initial_impression'],
    metricLabel: 'Scenarios',
  },
  {
    key: 'questions',
    apiKey: 'questions',
    label: 'Questions',
    eyebrow: 'Question Bank',
    description: 'Search assessment items, cognitive levels, rationales, traps, and formats.',
    icon: FileQuestion,
    accent: 'teal',
    primaryField: 'stem',
    secondaryFields: ['level', 'item_type', 'cognitive_level'],
    metricLabel: 'Questions',
  },
  {
    key: 'drugs',
    apiKey: 'drugs',
    label: 'Drugs',
    eyebrow: 'Medication Cards',
    description: 'Review medication names, classes, routes, indications, and safety notes.',
    icon: Pill,
    accent: 'orange',
    primaryField: 'drug_name',
    secondaryFields: ['class_id', 'level_scope', 'indications'],
    metricLabel: 'Drugs',
  },
  {
    key: 'skills',
    apiKey: 'skills',
    label: 'Skills',
    eyebrow: 'Psychomotor Prep',
    description: 'Browse skills, checklists, critical failures, and performance expectations.',
    icon: ClipboardCheck,
    accent: 'teal',
    primaryField: 'skill_name',
    secondaryFields: ['level_scope', 'category', 'description'],
    metricLabel: 'Skills',
  },
  {
    key: 'ecg',
    apiKey: 'ecg',
    label: 'ECG',
    eyebrow: 'Rhythm Lab',
    description: 'Study ECG records, rhythm labels, interpretations, and media references.',
    icon: Activity,
    accent: 'coral',
    primaryField: 'rhythm_name',
    secondaryFields: ['clinical_label', 'difficulty_1_to_5', 'teaching_points'],
    metricLabel: 'ECG Records',
  },
  {
    key: 'foundations',
    apiKey: 'foundations',
    label: 'Foundations',
    eyebrow: 'Core Review',
    description: 'Reinforce anatomy, physiology, operations, safety, and clinical basics.',
    icon: ShieldCheck,
    accent: 'teal',
    primaryField: 'foundation_topic',
    secondaryFields: ['category', 'level_scope', 'summary'],
    metricLabel: 'Foundations',
  },
  {
    key: 'media',
    apiKey: 'media',
    label: 'Media',
    eyebrow: 'Asset Browser',
    description: 'Browse media assets, captions, clinical labels, licenses, and attribution.',
    icon: Image,
    accent: 'orange',
    primaryField: 'clinical_label',
    secondaryFields: ['asset_type', 'file_name', 'caption'],
    metricLabel: 'Media Assets',
  },
];

const apiPages = pages.filter((page) => page.apiKey);

const dashboardModules = [
  { title: 'Cardiovascular Emergencies', done: 12, total: 18, percent: 67, icon: Heart, tone: 'red' },
  { title: 'Respiratory Emergencies', done: 8, total: 14, percent: 57, icon: Stethoscope, tone: 'blue' },
  { title: 'Trauma Assessment & Management', done: 9, total: 20, percent: 45, icon: UserRound, tone: 'purple' },
  { title: 'Pharmacology Essentials', done: 6, total: 16, percent: 38, icon: Pill, tone: 'green' },
];

const weakAreas = [
  { title: '12-Lead ECG Interpretation', missed: 82, percent: 42, icon: Activity, tone: 'red' },
  { title: 'Medication Dosages', missed: 68, percent: 48, icon: Pill, tone: 'orange' },
  { title: 'Airway Management', missed: 55, percent: 51, icon: Stethoscope, tone: 'blue' },
  { title: 'Neurological Assessment', missed: 41, percent: 56, icon: GraduationCap, tone: 'purple' },
];

const upcomingDrills = [
  { date: 'May 21', title: '12-Lead ECG Drill', time: '7:00 PM', duration: '15 min' },
  { date: 'May 22', title: 'Airway Management Drill', time: '8:00 PM', duration: '20 min' },
  { date: 'May 23', title: 'Medication Calculation Drill', time: '6:30 PM', duration: '15 min' },
  { date: 'May 24', title: 'Trauma Triage Drill', time: '10:00 AM', duration: '20 min' },
];

const quickActions = [
  { label: 'Practice Questions', detail: 'Question bank', icon: FileQuestion, target: 'questions' as PageKey },
  { label: 'Scenario Library', detail: 'Run a field case', icon: Play, target: 'scenarios' as PageKey },
  { label: 'Study Plan', detail: 'Daily priorities', icon: CalendarDays, target: 'modules' as PageKey },
  { label: 'ECG Library', detail: 'Browse rhythms', icon: Activity, target: 'ecg' as PageKey },
  { label: 'Drug Guide', detail: 'Medication cards', icon: Pill, target: 'drugs' as PageKey },
  { label: 'Skills Checklists', detail: 'Performance steps', icon: Video, target: 'skills' as PageKey },
];

const performancePoints = [62, 51, 64, 73, 56, 68, 71, 90];

const fallbackFields = [
  'title',
  'display_name',
  'drug_name',
  'skill_name',
  'stem',
  'clinical_label',
  'dispatch_information',
  'foundation_topic',
  'rhythm_name',
  'file_name',
  'name',
];

function getPage(key: PageKey) {
  return pages.find((page) => page.key === key) ?? pages[0];
}

function getCount(counts: Counts, page: PageConfig) {
  return page.apiKey ? (counts[page.apiKey] ?? 0) : 0;
}

function getRecordTitle(record: Record<string, string>, page: PageConfig) {
  if (record[page.primaryField]) {
    return record[page.primaryField];
  }

  for (const field of fallbackFields) {
    if (record[field]) {
      return record[field];
    }
  }

  return Object.values(record).find(Boolean) || 'Untitled record';
}

function getRecordId(record: Record<string, string>) {
  const idKey = Object.keys(record).find((key) => key.endsWith('_id') || key === 'id');
  return idKey ? record[idKey] : '';
}

function getPreview(record: Record<string, string>, page: PageConfig) {
  return page.secondaryFields
    .map((field) => record[field])
    .filter(Boolean)
    .join(' - ');
}

function formatValue(value: string | number | undefined) {
  if (value === undefined || value === '') {
    return '-';
  }
  return value.toString();
}

function SkeletonCards() {
  return (
    <div className="record-grid">
      {Array.from({ length: 6 }, (_, index) => (
        <article className="record-card skeleton-card" key={index}>
          <span />
          <strong />
          <p />
          <p />
        </article>
      ))}
    </div>
  );
}

function EmptyState({ page, hasQuery }: { page: PageConfig; hasQuery: boolean }) {
  const Icon = hasQuery ? Search : Database;
  return (
    <div className="empty-state">
      <Icon aria-hidden="true" />
      <h2>{hasQuery ? 'No matching records' : `No ${page.label.toLowerCase()} loaded`}</h2>
      <p>
        {hasQuery
          ? 'Try clearing the search box or changing the level filter.'
          : 'The API responded, but this dataset is empty.'}
      </p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <header>
        <h2>{title}</h2>
        {action ? <button type="button">{action}</button> : null}
      </header>
      {children}
    </section>
  );
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [activePageKey, setActivePageKey] = useState<PageKey>('dashboard');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [listError, setListError] = useState('');

  const activePage = useMemo(() => getPage(activePageKey), [activePageKey]);
  const activeApiKey = activePage.apiKey ?? 'modules';
  const counts = health?.counts ?? {};
  const totalRecords = apiPages.reduce((total, page) => total + getCount(counts, page), 0);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Health check failed with ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        setHealth(payload);
        setHealthError('');
      })
      .catch((err) => setHealthError(err.message));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: activePageKey === 'dashboard' ? '4' : '12' });

    if (query) {
      params.set('q', query);
    }

    if (level) {
      params.set('level', level);
    }

    setLoading(true);
    setListError('');
    fetch(`/api/${activeApiKey}?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }
        return response.json();
      })
      .then(setList)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setListError(err.message);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [activeApiKey, activePageKey, query, level]);

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Activity aria-hidden="true" />
          </div>
          <div>
            <strong>
              PulsePrep <span>EMS</span>
            </strong>
            <small>Prepare. Perform. Save Lives.</small>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <button
                className={page.key === activePageKey ? 'nav-item active' : 'nav-item'}
                key={page.key}
                onClick={() => setActivePageKey(page.key)}
                type="button"
              >
                <Icon aria-hidden="true" />
                <span>{page.label}</span>
                {page.apiKey ? <b>{formatValue(counts[page.apiKey])}</b> : null}
              </button>
            );
          })}
        </nav>

        <div className="level-card">
          <ShieldCheck aria-hidden="true" />
          <div>
            <span>Current Level</span>
            <strong>Paramedic</strong>
            <button type="button">Change Level</button>
          </div>
          <ChevronRight aria-hidden="true" />
        </div>

        <div className={health?.database.connected ? 'db-card online' : 'db-card'}>
          <Database aria-hidden="true" />
          <div>
            <strong>{health?.database.connected ? 'Database connected' : 'Database pending'}</strong>
            <span>{healthError || 'SQLite API routes preserved'}</span>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="search-box">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${activePage.key === 'dashboard' ? 'scenarios, topics, questions' : activePage.label.toLowerCase()}`}
              type="search"
              value={query}
            />
            <kbd>Ctrl K</kbd>
          </div>

          <div className="profile-zone">
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell aria-hidden="true" />
              <span>3</span>
            </button>
            <div className="profile">
              <div className="avatar">AM</div>
              <div>
                <strong>Alex Morgan</strong>
                <span>Paramedic</span>
              </div>
            </div>
            <button className="scenario-button" onClick={() => setActivePageKey('scenarios')} type="button">
              <Play aria-hidden="true" />
              Start Scenario
            </button>
          </div>
        </header>

        {activePageKey === 'dashboard' ? (
          <Dashboard
            counts={counts}
            health={health}
            list={list}
            listError={listError}
            loading={loading}
            query={query}
            setActivePageKey={setActivePageKey}
            totalRecords={totalRecords}
          />
        ) : (
          <DataPage
            health={health}
            level={level}
            list={list}
            listError={listError}
            loading={loading}
            page={activePage}
            query={query}
            setLevel={setLevel}
          />
        )}
      </main>
    </div>
  );
}

function Dashboard({
  counts,
  health,
  list,
  listError,
  loading,
  query,
  setActivePageKey,
  totalRecords,
}: {
  counts: Counts;
  health: HealthResponse | null;
  list: ListResponse | null;
  listError: string;
  loading: boolean;
  query: string;
  setActivePageKey: (key: PageKey) => void;
  totalRecords: number;
}) {
  return (
    <>
      <section className="hero-panel">
        <div className="welcome">
          <span className="eyebrow">Premium EMS Training</span>
          <h1>Welcome back, Alex</h1>
          <p>Sharpen clinical judgment with modules, lessons, scenarios, drugs, skills, ECG, and foundations review.</p>

          <div className="stats-row">
            <article className="stat-card">
              <span>Database Status</span>
              <strong>{health?.database.connected ? 'Live' : '...'}</strong>
              <p>{health?.database.connected ? 'SQLite connected' : 'Checking API health'}</p>
            </article>

            <article className="stat-card score-card">
              <span>
                <Activity aria-hidden="true" /> Readiness Score
              </span>
              <strong>
                86 <small>/100</small>
              </strong>
              <p>High readiness</p>
              <div className="sparkline" aria-hidden="true">
                {performancePoints.map((point, index) => (
                  <i key={index} style={{ height: `${point}%` }} />
                ))}
              </div>
            </article>

            <article className="stat-card progress-card">
              <span>Content Loaded</span>
              <div className="donut">
                <strong>{totalRecords || '-'}</strong>
              </div>
              <ul>
                <li>
                  <b className="cyan" /> Questions <span>{counts.questions ?? '-'}</span>
                </li>
                <li>
                  <b className="orange" /> Lessons <span>{counts.lessons ?? '-'}</span>
                </li>
                <li>
                  <b /> Scenarios <span>{counts.scenarios ?? '-'}</span>
                </li>
              </ul>
            </article>
          </div>
        </div>

        <aside className="scenario-card">
          <span>Scenario Practice</span>
          <h2>Realistic EMS cases without AI mode enabled yet.</h2>
          <p>Use the scenario database now. Adaptive AI practice remains reserved for a later phase.</p>
          <button onClick={() => setActivePageKey('scenarios')} type="button">
            <Stethoscope aria-hidden="true" />
            Browse Scenarios
          </button>
        </aside>
      </section>

      <section className="metric-strip" aria-label="Database counts">
        {apiPages.map((page) => {
          const Icon = page.icon;
          return (
            <button
              className={`metric-tile ${page.accent}`}
              key={page.key}
              onClick={() => setActivePageKey(page.key)}
              type="button"
            >
              <Icon aria-hidden="true" />
              <span>{page.label}</span>
              <strong>{counts[page.apiKey!] ?? '-'}</strong>
            </button>
          );
        })}
      </section>

      <section className="grid three">
        <Panel title="Current Modules" action="View all">
          {dashboardModules.map((module) => {
            const Icon = module.icon;
            return (
              <div className="module-row" key={module.title}>
                <div className={`round-icon ${module.tone}`}>
                  <Icon aria-hidden="true" />
                </div>
                <div>
                  <strong>{module.title}</strong>
                  <span>
                    {module.done} of {module.total} topics
                  </span>
                </div>
                <div className="mini-progress">
                  <i style={{ width: `${module.percent}%` }} />
                </div>
                <b>{module.percent}%</b>
              </div>
            );
          })}
        </Panel>

        <Panel title="Weak Areas" action="Review all">
          {weakAreas.map((area) => {
            const Icon = area.icon;
            return (
              <div className="weak-row" key={area.title}>
                <div className={`round-icon ${area.tone}`}>
                  <Icon aria-hidden="true" />
                </div>
                <div>
                  <strong>{area.title}</strong>
                  <span>{area.missed} questions missed</span>
                </div>
                <div className="mini-progress danger">
                  <i style={{ width: `${area.percent}%` }} />
                </div>
                <b>{area.percent}%</b>
              </div>
            );
          })}
        </Panel>

        <Panel title="Upcoming Drills" action="Calendar">
          {upcomingDrills.map((drill) => (
            <div className="drill-row" key={drill.title}>
              <time>
                {drill.date.split(' ')[0]}
                <strong>{drill.date.split(' ')[1]}</strong>
              </time>
              <div>
                <strong>{drill.title}</strong>
                <span>{drill.time}</span>
              </div>
              <mark>{drill.duration}</mark>
            </div>
          ))}
        </Panel>
      </section>

      <section className="grid lower">
        <Panel title="Recent Performance" action="Last 7 Days">
          <div className="performance-card">
            <div className="performance-summary">
              <span>Avg. Score</span>
              <strong>78%</strong>
              <small>Up 7% vs prior 7 days</small>
              <span>Questions Answered</span>
              <strong>{counts.questions ?? '-'}</strong>
              <small>Local database count</small>
            </div>
            <div className="chart-bars" aria-hidden="true">
              {performancePoints.map((point, index) => (
                <i key={index} style={{ height: `${point}%` }}>
                  <span />
                </i>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Quick Actions">
          <div className="quick-grid">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button className="quick-action" key={action.label} onClick={() => setActivePageKey(action.target)} type="button">
                  <span className="quick-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <strong>{action.label}</strong>
                  <small>{action.detail}</small>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Live Module Preview" action={list ? `${list.count} records` : 'Loading'}>
          {listError ? <ErrorState message={listError} compact /> : null}
          {loading ? <SkeletonCards /> : null}
          {!loading && !listError ? (
            <div className="records compact">
              {list?.data.map((record, index) => (
                <article className="record" key={`${getRecordId(record)}-${index}`}>
                  <span>{getRecordId(record)}</span>
                  <strong>{getRecordTitle(record, getPage('modules'))}</strong>
                  <p>{getPreview(record, getPage('modules')) || 'Module preview'}</p>
                </article>
              ))}
              {!list?.data.length ? <EmptyState hasQuery={Boolean(query)} page={getPage('modules')} /> : null}
            </div>
          ) : null}
        </Panel>
      </section>

      <footer>
        <Activity aria-hidden="true" />
        <span>Database {health?.database.connected ? 'connected' : 'checking'} - {totalRecords || '...'} study records loaded</span>
        <ShieldCheck aria-hidden="true" />
      </footer>
    </>
  );
}

function DataPage({
  health,
  level,
  list,
  listError,
  loading,
  page,
  query,
  setLevel,
}: {
  health: HealthResponse | null;
  level: string;
  list: ListResponse | null;
  listError: string;
  loading: boolean;
  page: PageConfig;
  query: string;
  setLevel: (level: string) => void;
}) {
  const Icon = page.icon;
  const shownColumns = [page.primaryField, ...page.secondaryFields].filter((field, index, fields) => fields.indexOf(field) === index);

  return (
    <>
      <section className={`page-hero ${page.accent}`}>
        <div>
          <span className="eyebrow">{page.eyebrow}</span>
          <h1>{page.label}</h1>
          <p>{page.description}</p>
        </div>
        <div className="page-hero-metrics">
          <Icon aria-hidden="true" />
          <strong>{list?.count ?? '-'}</strong>
          <span>{page.metricLabel}</span>
        </div>
      </section>

      <section className="filter-panel">
        <div className="filter-title">
          <Filter aria-hidden="true" />
          <div>
            <strong>Search and filters</strong>
            <span>Connected to GET /api/{page.apiKey}</span>
          </div>
        </div>
        <label>
          Level
          <select onChange={(event) => setLevel(event.target.value)} value={level}>
            <option value="">All levels</option>
            <option value="emt">EMT</option>
            <option value="aemt">AEMT</option>
            <option value="paramedic">Paramedic</option>
            <option value="shared">Shared</option>
          </select>
        </label>
        <div className={health?.database.connected ? 'route-pill online' : 'route-pill'}>
          <Database aria-hidden="true" />
          {health?.database.connected ? 'Database connected' : 'Checking database'}
        </div>
      </section>

      {listError ? <ErrorState message={listError} /> : null}

      <section className="data-layout">
        <div className="record-grid-wrap">
          <div className="section-heading">
            <div>
              <h2>{page.label} records</h2>
              <p>
                Showing {list?.data.length ?? 0} of {list?.count ?? 0}
                {query ? ` for "${query}"` : ''}
              </p>
            </div>
            <span>{page.apiKey}</span>
          </div>

          {loading ? <SkeletonCards /> : null}
          {!loading && !listError && list?.data.length === 0 ? <EmptyState hasQuery={Boolean(query || level)} page={page} /> : null}
          {!loading && !listError && list?.data.length ? (
            <div className="record-grid">
              {list.data.map((record, index) => (
                <article className={`record-card ${page.accent}`} key={`${getRecordId(record)}-${index}`}>
                  <div className="record-card-top">
                    <span>{getRecordId(record) || page.label}</span>
                    <CheckCircle2 aria-hidden="true" />
                  </div>
                  <h2>{getRecordTitle(record, page)}</h2>
                  <p>{getPreview(record, page) || 'No preview fields available for this record.'}</p>
                  <div className="record-meta">
                    {shownColumns.slice(0, 4).map((field) => (
                      <span key={field}>
                        <b>{field.replaceAll('_', ' ')}</b>
                        {formatValue(record[field])}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="detail-rail">
          <Panel title="Route Health">
            <div className="health-stack">
              <div>
                <Database aria-hidden="true" />
                <span>API route</span>
                <strong>/api/{page.apiKey}</strong>
              </div>
              <div>
                <Sparkles aria-hidden="true" />
                <span>AI mode</span>
                <strong>Not enabled</strong>
              </div>
              <div>
                <CheckCircle2 aria-hidden="true" />
                <span>Database</span>
                <strong>{health?.database.connected ? 'Connected' : 'Pending'}</strong>
              </div>
            </div>
          </Panel>

          <Panel title="Columns">
            <div className="column-list">
              {(list?.columns ?? []).slice(0, 12).map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>
          </Panel>
        </aside>
      </section>
    </>
  );
}

function ErrorState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={compact ? 'error-state compact-error' : 'error-state'}>
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>Something could not load</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
