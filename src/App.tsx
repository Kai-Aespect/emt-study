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

type DetailResponse = {
  data: Record<string, string>;
  related: Record<string, Record<string, string>[]>;
};

type ProgressState = {
  completedLessons: string[];
  completedScenarios: string[];
  answeredQuestions: Record<string, boolean>;
  flaggedQuestions: string[];
  savedEcgs: string[];
  checkedSkillSteps: Record<string, string[]>;
  lastActivityDate: string;
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
  filters: string[];
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
    filters: [],
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
    filters: ['level'],
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
    filters: ['level', 'difficulty'],
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
    filters: ['level', 'age_group', 'setting', 'difficulty'],
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
    filters: ['level', 'difficulty', 'item_type'],
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
    filters: ['level'],
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
    filters: ['level'],
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
    filters: ['difficulty', 'ecg_type'],
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
    filters: ['cluster'],
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
    filters: ['asset_type', 'verification_status'],
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

const defaultProgress: ProgressState = {
  completedLessons: [],
  completedScenarios: [],
  answeredQuestions: {},
  flaggedQuestions: [],
  savedEcgs: [],
  checkedSkillSteps: {},
  lastActivityDate: '',
};

function readProgress(): ProgressState {
  try {
    const raw = window.localStorage.getItem('emsStudyProgress');
    return raw ? { ...defaultProgress, ...JSON.parse(raw) } : defaultProgress;
  } catch {
    return defaultProgress;
  }
}

function writeProgress(progress: ProgressState) {
  window.localStorage.setItem('emsStudyProgress', JSON.stringify(progress));
}

function toggleInArray(items: string[], id: string) {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
}

function isCorrectOption(option: Record<string, string>, question: Record<string, string>) {
  return option.is_correct === 'True' || option.option_key === question.correct_answer_key;
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
  const [stats, setStats] = useState<Counts>({});
  const [activePageKey, setActivePageKey] = useState<PageKey>('dashboard');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [listError, setListError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<Record<string, string> | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [progress, setProgress] = useState<ProgressState>(() => readProgress());

  const activePage = useMemo(() => getPage(activePageKey), [activePageKey]);
  const activeApiKey = activePage.apiKey ?? 'modules';
  const counts = Object.keys(stats).length ? stats : (health?.counts ?? {});
  const totalRecords = apiPages.reduce((total, page) => total + getCount(counts, page), 0);

  function updateProgress(updater: (progress: ProgressState) => ProgressState) {
    setProgress((current) => {
      const next = updater({ ...current, lastActivityDate: new Date().toISOString().slice(0, 10) });
      writeProgress(next);
      return next;
    });
  }

  function updateFilter(key: string, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openRecord(record: Record<string, string>) {
    setSelectedRecord(record);
    setDetail(null);
    setDetailError('');

    const id = getRecordId(record);
    const detailRoutes = new Set<PageKey>(['modules', 'lessons', 'scenarios', 'questions', 'drugs', 'skills', 'ecg', 'foundations']);
    if (!id || !activePage.apiKey || !detailRoutes.has(activePage.key)) {
      setDetail({ data: record, related: {} });
      return;
    }

    setDetailLoading(true);
    fetch(`/api/${activePage.apiKey}/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Detail request failed with ${response.status}`);
        }
        return response.json();
      })
      .then(setDetail)
      .catch((err) => setDetailError(err.message))
      .finally(() => setDetailLoading(false));
  }

  function closeDetail() {
    setSelectedRecord(null);
    setDetail(null);
    setDetailError('');
  }

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
    fetch('/api/stats')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Stats request failed with ${response.status}`);
        }
        return response.json();
      })
      .then(setStats)
      .catch((err) => setHealthError(err.message));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: activePageKey === 'dashboard' ? '4' : '12' });

    if (query) {
      params.set('q', query);
    }

    for (const [key, value] of Object.entries(filters)) {
      if (value && activePage.filters.includes(key)) {
        params.set(key, value);
      }
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
  }, [activeApiKey, activePage.filters, activePageKey, filters, query]);

  useEffect(() => {
    setSelectedRecord(null);
    setDetail(null);
    setDetailError('');
    setFilters({});
  }, [activePageKey]);

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
            progress={progress}
            query={query}
            setActivePageKey={setActivePageKey}
            totalRecords={totalRecords}
          />
        ) : (
          <DataPage
            closeDetail={closeDetail}
            detail={detail}
            detailError={detailError}
            detailLoading={detailLoading}
            filters={filters}
            health={health}
            list={list}
            listError={listError}
            loading={loading}
            openRecord={openRecord}
            page={activePage}
            progress={progress}
            query={query}
            selectedRecord={selectedRecord}
            updateFilter={updateFilter}
            updateProgress={updateProgress}
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
  progress,
  query,
  setActivePageKey,
  totalRecords,
}: {
  counts: Counts;
  health: HealthResponse | null;
  list: ListResponse | null;
  listError: string;
  loading: boolean;
  progress: ProgressState;
  query: string;
  setActivePageKey: (key: PageKey) => void;
  totalRecords: number;
}) {
  const moduleRows = list?.data.length ? list.data : [];
  const scoreTotal = Object.keys(progress.answeredQuestions).length;
  const scoreCorrect = Object.values(progress.answeredQuestions).filter(Boolean).length;

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
                <Activity aria-hidden="true" /> Local Progress
              </span>
              <strong>
                {scoreTotal ? Math.round((scoreCorrect / scoreTotal) * 100) : 0}
                <small>%</small>
              </strong>
              <p>{scoreCorrect} of {scoreTotal} questions correct</p>
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
          {(moduleRows.length ? moduleRows : dashboardModules).slice(0, 4).map((module, index) => {
            if ('module_id' in module) {
              const percent = [67, 57, 45, 38][index] ?? 35;
              return (
                <button className="module-row clickable-row" key={module.module_id} onClick={() => setActivePageKey('modules')} type="button">
                  <div className="round-icon blue">
                    <BookOpen aria-hidden="true" />
                  </div>
                  <div>
                    <strong>{module.title}</strong>
                    <span>{module.level} - {module.module_type}</span>
                  </div>
                  <div className="mini-progress">
                    <i style={{ width: `${percent}%` }} />
                  </div>
                  <b>{percent}%</b>
                </button>
              );
            }
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

        <DatabaseBrowser initialList={list} initialLoading={loading} initialError={listError} query={query} />
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
  closeDetail,
  detail,
  detailError,
  detailLoading,
  filters,
  health,
  list,
  listError,
  loading,
  openRecord,
  page,
  progress,
  query,
  selectedRecord,
  updateFilter,
  updateProgress,
}: {
  closeDetail: () => void;
  detail: DetailResponse | null;
  detailError: string;
  detailLoading: boolean;
  filters: Record<string, string>;
  health: HealthResponse | null;
  list: ListResponse | null;
  listError: string;
  loading: boolean;
  openRecord: (record: Record<string, string>) => void;
  page: PageConfig;
  progress: ProgressState;
  query: string;
  selectedRecord: Record<string, string> | null;
  updateFilter: (key: string, value: string) => void;
  updateProgress: (updater: (progress: ProgressState) => ProgressState) => void;
}) {
  const Icon = page.icon;
  const shownColumns = [page.primaryField, ...page.secondaryFields].filter((field, index, fields) => fields.indexOf(field) === index);

  if (selectedRecord) {
    return (
      <DetailView
        closeDetail={closeDetail}
        detail={detail}
        detailError={detailError}
        detailLoading={detailLoading}
        page={page}
        progress={progress}
        record={selectedRecord}
        updateProgress={updateProgress}
      />
    );
  }

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
          Filters
          <div className="filter-controls">
            {page.filters.map((filterKey) => (
              <FilterSelect filterKey={filterKey} filters={filters} key={filterKey} updateFilter={updateFilter} />
            ))}
            {!page.filters.length ? <span className="muted">No structured filters for this page.</span> : null}
          </div>
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
          {!loading && !listError && list?.data.length === 0 ? <EmptyState hasQuery={Boolean(query || Object.values(filters).some(Boolean))} page={page} /> : null}
          {!loading && !listError && list?.data.length ? (
            <div className="record-grid">
              {list.data.map((record, index) => (
                <button className={`record-card ${page.accent}`} key={`${getRecordId(record)}-${index}`} onClick={() => openRecord(record)} type="button">
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
                </button>
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

function FilterSelect({
  filterKey,
  filters,
  updateFilter,
}: {
  filterKey: string;
  filters: Record<string, string>;
  updateFilter: (key: string, value: string) => void;
}) {
  const options: Record<string, string[]> = {
    level: ['', 'emt', 'aemt', 'paramedic', 'shared'],
    difficulty: ['', '1', '2', '3', '4', '5'],
    item_type: ['', 'single_best_answer', 'multi_select', 'calculation'],
    age_group: ['', 'adult', 'pediatric', 'geriatric'],
    setting: ['', 'home', 'street', 'clinic', 'ambulance'],
    ecg_type: ['', 'rhythm_strip', '12_lead'],
    cluster: ['', 'ap', 'ops', 'clinical', 'safety'],
    asset_type: ['', 'ecg_raw', 'image', 'audio', 'video'],
    verification_status: ['', 'draft', 'verified'],
  };

  return (
    <select onChange={(event) => updateFilter(filterKey, event.target.value)} value={filters[filterKey] ?? ''}>
      {(options[filterKey] ?? ['']).map((option) => (
        <option key={option || 'all'} value={option}>
          {option ? option.replaceAll('_', ' ') : `All ${filterKey.replaceAll('_', ' ')}`}
        </option>
      ))}
    </select>
  );
}

function DetailView({
  closeDetail,
  detail,
  detailError,
  detailLoading,
  page,
  progress,
  record,
  updateProgress,
}: {
  closeDetail: () => void;
  detail: DetailResponse | null;
  detailError: string;
  detailLoading: boolean;
  page: PageConfig;
  progress: ProgressState;
  record: Record<string, string>;
  updateProgress: (updater: (progress: ProgressState) => ProgressState) => void;
}) {
  const data = detail?.data ?? record;
  const related = detail?.related ?? {};
  const id = getRecordId(data);

  return (
    <section className="detail-view">
      <button className="back-button" onClick={closeDetail} type="button">
        <ChevronRight aria-hidden="true" />
        Back to {page.label}
      </button>

      {detailError ? <ErrorState message={detailError} /> : null}
      {detailLoading ? <SkeletonCards /> : null}

      {!detailLoading ? (
        <>
          <div className={`detail-hero ${page.accent}`}>
            <span>{id || page.label}</span>
            <h1>{getRecordTitle(data, page)}</h1>
            <p>{getPreview(data, page) || data.short_summary || data.indications || data.caption || 'Detailed database record.'}</p>
          </div>

          {page.key === 'modules' ? <ModuleDetail data={data} lessons={related.lessons ?? []} /> : null}
          {page.key === 'lessons' ? <LessonDetail data={data} objectives={related.objectives ?? []} progress={progress} updateProgress={updateProgress} /> : null}
          {page.key === 'scenarios' ? <ScenarioPractice data={data} branches={related.branches ?? []} progress={progress} steps={related.steps ?? []} updateProgress={updateProgress} /> : null}
          {page.key === 'questions' ? <QuestionPractice data={data} options={related.options ?? []} progress={progress} rationales={related.rationales ?? []} updateProgress={updateProgress} /> : null}
          {page.key === 'drugs' ? <DrugDetail data={data} /> : null}
          {page.key === 'skills' ? <SkillChecklist data={data} progress={progress} steps={related.steps ?? []} updateProgress={updateProgress} /> : null}
          {page.key === 'ecg' ? <EcgDetail data={data} progress={progress} updateProgress={updateProgress} /> : null}
          {page.key === 'foundations' ? <FoundationDetail data={data} /> : null}
          {page.key === 'media' ? <MediaDetail data={data} /> : null}
        </>
      ) : null}
    </section>
  );
}

function DatabaseBrowser({
  initialError,
  initialList,
  initialLoading,
  query,
}: {
  initialError: string;
  initialList: ListResponse | null;
  initialLoading: boolean;
  query: string;
}) {
  const [browserKey, setBrowserKey] = useState<ApiKey>('modules');
  const [level, setLevel] = useState('');
  const [browserList, setBrowserList] = useState<ListResponse | null>(initialList);
  const [browserLoading, setBrowserLoading] = useState(initialLoading);
  const [browserError, setBrowserError] = useState(initialError);
  const page = getPage(browserKey);

  useEffect(() => {
    if (browserKey === 'modules' && initialList && !level) {
      setBrowserList(initialList);
      setBrowserLoading(initialLoading);
      setBrowserError(initialError);
    }
  }, [browserKey, initialError, initialList, initialLoading, level]);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '8' });
    if (query) {
      params.set('q', query);
    }
    if (level) {
      params.set('level', level);
    }

    setBrowserLoading(true);
    setBrowserError('');
    fetch(`/api/${browserKey}?${params.toString()}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Database browser request failed with ${response.status}`);
        }
        return response.json();
      })
      .then(setBrowserList)
      .catch((err) => setBrowserError(err.message))
      .finally(() => setBrowserLoading(false));
  }, [browserKey, level, query]);

  return (
    <Panel title="Database Browser" action={browserList ? `${browserList.count} records` : 'Loading'}>
      <div className="browser-controls">
        <select onChange={(event) => setBrowserKey(event.target.value as ApiKey)} value={browserKey}>
          {apiPages.map((apiPage) => (
            <option key={apiPage.key} value={apiPage.key}>
              {apiPage.label}
            </option>
          ))}
        </select>
        <select onChange={(event) => setLevel(event.target.value)} value={level}>
          <option value="">All levels</option>
          <option value="emt">EMT</option>
          <option value="aemt">AEMT</option>
          <option value="paramedic">Paramedic</option>
          <option value="shared">Shared</option>
        </select>
      </div>
      {browserError ? <ErrorState message={browserError} compact /> : null}
      {browserLoading ? <SkeletonCards /> : null}
      {!browserLoading && !browserError ? (
        <div className="records compact scroll-list">
          {browserList?.data.map((record, index) => (
            <article className="record" key={`${getRecordId(record)}-${index}`}>
              <span>{getRecordId(record)}</span>
              <strong>{getRecordTitle(record, page)}</strong>
              <p>{getPreview(record, page) || 'Database record'}</p>
            </article>
          ))}
          {!browserList?.data.length ? <EmptyState hasQuery={Boolean(query || level)} page={page} /> : null}
        </div>
      ) : null}
    </Panel>
  );
}

function FieldBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="field-block">
      <span>{label}</span>
      <p>{formatValue(value)}</p>
    </div>
  );
}

function ModuleDetail({ data, lessons }: { data: Record<string, string>; lessons: Record<string, string>[] }) {
  return (
    <div className="detail-grid">
      <Panel title="Module Summary">
        <FieldBlock label="Level" value={data.level} />
        <FieldBlock label="Type" value={data.module_type} />
        <FieldBlock label="Estimated minutes" value={data.est_minutes} />
        <FieldBlock label="Summary" value={data.short_summary} />
      </Panel>
      <Panel title="Related Lessons">
        <div className="related-list">
          {lessons.map((lesson) => (
            <article key={lesson.lesson_id}>
              <strong>{lesson.title}</strong>
              <span>{lesson.level} - difficulty {lesson.difficulty_1_to_5}</span>
            </article>
          ))}
          {!lessons.length ? <p className="muted">No related lessons found.</p> : null}
        </div>
      </Panel>
    </div>
  );
}

function LessonDetail({
  data,
  objectives,
  progress,
  updateProgress,
}: {
  data: Record<string, string>;
  objectives: Record<string, string>[];
  progress: ProgressState;
  updateProgress: (updater: (progress: ProgressState) => ProgressState) => void;
}) {
  const completed = progress.completedLessons.includes(data.lesson_id);
  return (
    <div className="detail-grid">
      <Panel title="Lesson Detail">
        <FieldBlock label="Summary" value={data.short_summary} />
        <FieldBlock label="Why it matters" value={data.why_it_matters} />
        <FieldBlock label="Must know points" value={data.must_know_points} />
        <FieldBlock label="Red flags" value={data.red_flags} />
        <FieldBlock label="Common mistakes" value={data.common_mistakes} />
        <FieldBlock label="Field pearls" value={data.field_pearls} />
        <button
          className="state-button"
          onClick={() => updateProgress((current) => ({ ...current, completedLessons: toggleInArray(current.completedLessons, data.lesson_id) }))}
          type="button"
        >
          {completed ? 'Mark incomplete' : 'Mark complete'}
        </button>
      </Panel>
      <Panel title="Objectives">
        <div className="related-list">
          {objectives.map((objective) => (
            <article key={objective.objective_id}>
              <strong>{objective.objective_text}</strong>
              <span>{objective.bloom_level} - {objective.assessed_by}</span>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ScenarioPractice({
  branches,
  data,
  progress,
  steps,
  updateProgress,
}: {
  branches: Record<string, string>[];
  data: Record<string, string>;
  progress: ProgressState;
  steps: Record<string, string>[];
  updateProgress: (updater: (progress: ProgressState) => ProgressState) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [showDebrief, setShowDebrief] = useState(false);
  const step = steps[stepIndex];
  const completed = progress.completedScenarios.includes(data.scenario_id);

  return (
    <div className="practice-panel">
      <Panel title="Scenario Header">
        <FieldBlock label="Dispatch" value={data.dispatch_information} />
        <FieldBlock label="Scene cues" value={data.scene_cues} />
        <FieldBlock label="Safety hazards" value={data.safety_hazards} />
      </Panel>
      <Panel title={`Step ${stepIndex + 1} of ${steps.length || 1}`}>
        {step ? (
          <>
            <FieldBlock label={step.phase || 'Cue'} value={step.cue_text} />
            <FieldBlock label="Expected action" value={step.expected_action} />
            <FieldBlock label="Consequence" value={step.consequence_text} />
          </>
        ) : (
          <p className="muted">No scenario steps found. Use scenario header for review.</p>
        )}
        <div className="button-row">
          <button onClick={() => setStepIndex(Math.max(0, stepIndex - 1))} type="button">Previous Step</button>
          <button onClick={() => setStepIndex(Math.min(Math.max(steps.length - 1, 0), stepIndex + 1))} type="button">Next Step</button>
          <button onClick={() => { setStepIndex(0); setShowDebrief(false); }} type="button">Restart</button>
          <button onClick={() => setShowDebrief(true)} type="button">Debrief</button>
          <button
            onClick={() => updateProgress((current) => ({ ...current, completedScenarios: toggleInArray(current.completedScenarios, data.scenario_id) }))}
            type="button"
          >
            {completed ? 'Uncomplete' : 'Complete'}
          </button>
        </div>
        {showDebrief ? (
          <div className="debrief">
            <strong>Debrief</strong>
            <p>{branches[0]?.debrief_note || 'Linear scenario complete. Review missed priorities, reassessment, and scope limits.'}</p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function QuestionPractice({
  data,
  options,
  progress,
  rationales,
  updateProgress,
}: {
  data: Record<string, string>;
  options: Record<string, string>[];
  progress: ProgressState;
  rationales: Record<string, string>[];
  updateProgress: (updater: (progress: ProgressState) => ProgressState) => void;
}) {
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const correct = options.find((option) => isCorrectOption(option, data));
  const isCorrect = selected && correct && selected === correct.option_key;
  const flagged = progress.flaggedQuestions.includes(data.question_id);

  return (
    <Panel title="Practice Question">
      <h2 className="question-stem">{data.stem}</h2>
      <div className="option-list">
        {options.map((option) => (
          <button
            className={selected === option.option_key ? 'selected' : ''}
            key={option.option_id}
            onClick={() => !submitted && setSelected(option.option_key)}
            type="button"
          >
            <b>{option.option_key}</b>
            {option.option_text}
          </button>
        ))}
      </div>
      <div className="button-row">
        <button
          onClick={() => {
            setSubmitted(true);
            updateProgress((current) => ({ ...current, answeredQuestions: { ...current.answeredQuestions, [data.question_id]: Boolean(isCorrect) } }));
          }}
          type="button"
        >
          Submit Answer
        </button>
        <button
          onClick={() => updateProgress((current) => ({ ...current, flaggedQuestions: toggleInArray(current.flaggedQuestions, data.question_id) }))}
          type="button"
        >
          {flagged ? 'Unflag' : 'Flag Question'}
        </button>
      </div>
      {submitted ? (
        <div className={isCorrect ? 'answer-result correct' : 'answer-result incorrect'}>
          <strong>{isCorrect ? 'Correct' : `Incorrect - correct answer is ${correct?.option_key ?? data.correct_answer_key}`}</strong>
          {rationales.map((rationale) => (
            <p key={rationale.rationale_id}>{rationale.rationale_text}</p>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function DrugDetail({ data }: { data: Record<string, string> }) {
  return (
    <div className="detail-grid">
      <Panel title="Medication Card">
        <FieldBlock label="Generic name" value={data.generic_name} />
        <FieldBlock label="Class" value={data.class_name} />
        <FieldBlock label="Indications" value={data.indications} />
        <FieldBlock label="Dose" value={data.adult_dose_text} />
        <FieldBlock label="Route" value={data.route_text} />
      </Panel>
      <Panel title="Safety">
        <FieldBlock label="Contraindications" value={data.contraindications} />
        <FieldBlock label="Adverse effects" value={data.adverse_effects} />
        <FieldBlock label="Monitoring" value={data.monitoring} />
        <FieldBlock label="Protocol variation note" value={data.protocol_variation_note} />
      </Panel>
    </div>
  );
}

function SkillChecklist({
  data,
  progress,
  steps,
  updateProgress,
}: {
  data: Record<string, string>;
  progress: ProgressState;
  steps: Record<string, string>[];
  updateProgress: (updater: (progress: ProgressState) => ProgressState) => void;
}) {
  const checked = progress.checkedSkillSteps[data.skill_id] ?? [];
  return (
    <Panel title="Skill Checklist">
      <FieldBlock label="Indications" value={data.indications} />
      <div className="checklist">
        {steps.map((step) => (
          <label key={step.skill_step_id}>
            <input
              checked={checked.includes(step.skill_step_id)}
              onChange={() => updateProgress((current) => ({
                ...current,
                checkedSkillSteps: {
                  ...current.checkedSkillSteps,
                  [data.skill_id]: toggleInArray(current.checkedSkillSteps[data.skill_id] ?? [], step.skill_step_id),
                },
              }))}
              type="checkbox"
            />
            <span>{step.step_order}. {step.action_text}</span>
          </label>
        ))}
      </div>
      <button
        className="state-button"
        onClick={() => updateProgress((current) => ({ ...current, checkedSkillSteps: { ...current.checkedSkillSteps, [data.skill_id]: [] } }))}
        type="button"
      >
        Reset Checklist
      </button>
    </Panel>
  );
}

function EcgDetail({
  data,
  progress,
  updateProgress,
}: {
  data: Record<string, string>;
  progress: ProgressState;
  updateProgress: (updater: (progress: ProgressState) => ProgressState) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const saved = progress.savedEcgs.includes(data.ecg_id);
  return (
    <Panel title="ECG Drill">
      <FieldBlock label="Type" value={data.ecg_type} />
      <FieldBlock label="Difficulty" value={data.difficulty_1_to_5} />
      {revealed ? (
        <>
          <FieldBlock label="Rhythm name" value={data.rhythm_name} />
          <FieldBlock label="Identification pearls" value={data.identification_pearls} />
          <FieldBlock label="Common confusions" value={data.common_confusions} />
          <FieldBlock label="Immediate priorities" value={data.immediate_priorities} />
          <FieldBlock label="Treatment considerations" value={data.treatment_considerations_by_level} />
        </>
      ) : (
        <p className="muted">Review the ECG metadata, then reveal the answer when ready.</p>
      )}
      <div className="button-row">
        <button onClick={() => setRevealed(true)} type="button">Reveal Answer</button>
        <button onClick={() => updateProgress((current) => ({ ...current, savedEcgs: toggleInArray(current.savedEcgs, data.ecg_id) }))} type="button">
          {saved ? 'Remove from Review' : 'Save to Review'}
        </button>
      </div>
    </Panel>
  );
}

function FoundationDetail({ data }: { data: Record<string, string> }) {
  return (
    <Panel title="Foundation Review">
      <FieldBlock label="Cluster" value={data.cluster} />
      <FieldBlock label="Summary" value={data.short_summary} />
      <FieldBlock label="Core concepts" value={data.core_concepts} />
      <FieldBlock label="Mnemonic" value={data.mnemonic} />
      <FieldBlock label="Revisit priority" value={data.revisit_priority} />
    </Panel>
  );
}

function MediaDetail({ data }: { data: Record<string, string> }) {
  return (
    <Panel title="Media Manifest">
      <div className="manifest-only">Manifest only</div>
      <FieldBlock label="Asset type" value={data.asset_type} />
      <FieldBlock label="File name" value={data.file_name} />
      <FieldBlock label="Folder path" value={data.folder_path} />
      <FieldBlock label="Caption" value={data.caption} />
      <FieldBlock label="Verification status" value={data.verification_status} />
      <FieldBlock label="Attribution" value={data.attribution_text} />
    </Panel>
  );
}
