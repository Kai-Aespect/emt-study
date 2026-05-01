import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileQuestion,
  GraduationCap,
  Heart,
  Home,
  LineChart,
  Lock,
  Pill,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  Video,
} from 'lucide-react';

type Counts = Record<string, number>;

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
  data: Record<string, string>[];
};

const navSections = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'modules', label: 'Modules', icon: BookOpen },
  { key: 'scenarios', label: 'Scenarios', icon: Play },
  { key: 'questions', label: 'Question Bank', icon: FileQuestion },
  { key: 'ecg', label: 'ECG', icon: Activity },
  { key: 'drugs', label: 'Drugs', icon: Pill },
  { key: 'skills', label: 'Skills', icon: ClipboardCheck },
  { key: 'foundations', label: 'Foundations', icon: ShieldCheck },
  { key: 'progress', label: 'Progress', icon: LineChart },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const apiSections = new Set([
  'modules',
  'lessons',
  'scenarios',
  'questions',
  'drugs',
  'skills',
  'ecg',
  'foundations',
  'media',
]);

const currentModules = [
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
  { label: 'Practice Questions', detail: '470 available', icon: FileQuestion, tone: 'blue' },
  { label: 'Custom Scenario', detail: 'Create your own', icon: Lock, tone: 'purple' },
  { label: 'Study Plan', detail: 'Your daily plan', icon: CalendarDays, tone: 'orange' },
  { label: 'ECG Library', detail: 'Browse rhythms', icon: Activity, tone: 'green' },
  { label: 'Drug Guide', detail: 'Search medications', icon: Pill, tone: 'red' },
  { label: 'Skills Videos', detail: 'Watch and learn', icon: Video, tone: 'green' },
];

const performancePoints = [62, 51, 64, 73, 56, 68, 71, 90];

const previewFields = [
  'title',
  'display_name',
  'drug_name',
  'skill_name',
  'stem',
  'clinical_label',
  'dispatch_information',
  'foundation_topic',
  'module_name',
  'name',
];

function getRecordTitle(record: Record<string, string>) {
  for (const field of previewFields) {
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
  const [activeSection, setActiveSection] = useState('dashboard');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const apiKey = apiSections.has(activeSection) ? activeSection : 'modules';
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '4' });

    if (query) {
      params.set('q', query);
    }

    if (level) {
      params.set('level', level);
    }

    setLoading(true);
    fetch(`/api/${apiKey}?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }
        return response.json();
      })
      .then(setList)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [activeSection, query, level]);

  const activeMeta = useMemo(
    () => navSections.find((section) => section.key === activeSection) ?? navSections[0],
    [activeSection],
  );
  const counts = health?.counts ?? {};
  const totalRecords =
    (counts.modules ?? 0) +
    (counts.lessons ?? 0) +
    (counts.scenarios ?? 0) +
    (counts.questions ?? 0) +
    (counts.drugs ?? 0) +
    (counts.skills ?? 0) +
    (counts.ecg ?? 0) +
    (counts.foundations ?? 0);

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
          {navSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <button
                className={section.key === activeSection ? 'nav-item active' : 'nav-item'}
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                type="button"
              >
                <Icon aria-hidden="true" />
                <span>{section.label}</span>
                {index === 7 ? <span className="nav-divider" /> : null}
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

        <div className="plan-card">
          <strong>Pro Plan</strong>
          <span>Renews Jul 12, 2025</span>
          <button type="button">Manage Plan</button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="search-box">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search scenarios, topics, questions..."
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
            <button className="scenario-button" type="button">
              <Play aria-hidden="true" />
              Start Scenario
            </button>
          </div>
        </header>

        {error ? <div className="notice">API error: {error}</div> : null}

        <section className="hero-panel">
          <div className="welcome">
            <div>
              <h1>Welcome back, Alex</h1>
              <p>Ready to sharpen your skills and save lives today.</p>
            </div>

            <div className="stats-row">
              <article className="stat-card streak-card">
                <span>Daily Streak</span>
                <strong>
                  12 <small>days</small>
                </strong>
                <p>Best: 28 days</p>
                <div className="streak-dots" aria-hidden="true">
                  {Array.from({ length: 14 }, (_, index) => (
                    <span className={index < 9 ? 'hot' : index === 13 ? 'ring' : ''} key={index} />
                  ))}
                </div>
              </article>

              <article className="stat-card score-card">
                <span>
                  <Activity aria-hidden="true" /> Readiness Score
                </span>
                <strong>
                  86 <small>/100</small>
                </strong>
                <p>High</p>
                <div className="sparkline" aria-hidden="true">
                  {performancePoints.map((point, index) => (
                    <i key={index} style={{ height: `${point}%` }} />
                  ))}
                </div>
              </article>

              <article className="stat-card progress-card">
                <span>Overall Progress</span>
                <div className="donut">
                  <strong>63%</strong>
                </div>
                <ul>
                  <li>
                    <b className="cyan" /> Complete <span>63%</span>
                  </li>
                  <li>
                    <b className="orange" /> In Progress <span>24%</span>
                  </li>
                  <li>
                    <b /> Not Started <span>13%</span>
                  </li>
                </ul>
                <p>97 of 154 topics complete</p>
              </article>
            </div>
          </div>

          <aside className="ai-card">
            <span>AI Powered Practice</span>
            <h2>Realistic EMS Scenarios. Infinite Possibilities.</h2>
            <p>Adaptive scenarios that challenge clinical judgment and decision making.</p>
            <button type="button">
              <Sparkles aria-hidden="true" />
              Start AI Scenario
            </button>
          </aside>
        </section>

        <section className="grid three">
          <Panel title="Current Modules" action="View all">
            {currentModules.map((module) => {
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
                  <ChevronRight aria-hidden="true" />
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

          <Panel title="Upcoming Drills" action="View calendar">
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
                <strong>{counts.questions ?? 470}</strong>
                <small>112 vs prior 7 days</small>
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

          <Panel title="Database Browser" action={list ? `${list.count} records` : 'Loading'}>
            <div className="browser-tools">
              <select onChange={(event) => setActiveSection(event.target.value)} value={apiSections.has(activeMeta.key) ? activeMeta.key : 'modules'}>
                <option value="modules">Modules</option>
                <option value="lessons">Lessons</option>
                <option value="scenarios">Scenarios</option>
                <option value="questions">Questions</option>
                <option value="drugs">Drugs</option>
                <option value="skills">Skills</option>
                <option value="ecg">ECG</option>
                <option value="foundations">Foundations</option>
              </select>
              <select onChange={(event) => setLevel(event.target.value)} value={level}>
                <option value="">All levels</option>
                <option value="emt">EMT</option>
                <option value="aemt">AEMT</option>
                <option value="paramedic">Paramedic</option>
              </select>
            </div>
            <div className="records">
              {loading ? <p className="empty">Loading records...</p> : null}
              {!loading && list?.data.length === 0 ? <p className="empty">No records found.</p> : null}
              {!loading &&
                list?.data.map((record, index) => (
                  <article className="record" key={`${getRecordId(record)}-${index}`}>
                    <span>{getRecordId(record)}</span>
                    <strong>{getRecordTitle(record)}</strong>
                    <p>{record.short_summary || record.description || record.stem || record.level}</p>
                  </article>
                ))}
            </div>
          </Panel>

          <Panel title="Quick Actions">
            <div className="quick-grid">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button className="quick-action" key={action.label} type="button">
                    <span className={`quick-icon ${action.tone}`}>
                      <Icon aria-hidden="true" />
                    </span>
                    <strong>{action.label}</strong>
                    <small>{action.detail}</small>
                  </button>
                );
              })}
            </div>
          </Panel>
        </section>

        <footer>
          <Activity aria-hidden="true" />
          <span>
            Database {health?.database.connected ? 'connected' : 'checking'} - {totalRecords || '...'} study records loaded
          </span>
          <ShieldCheck aria-hidden="true" />
        </footer>
      </main>
    </div>
  );
}
