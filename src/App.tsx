import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  Database,
  FileQuestion,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Image,
  LayoutDashboard,
  Pill,
  Search,
  Stethoscope,
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

const sections = [
  { key: 'modules', label: 'Modules', icon: LayoutDashboard },
  { key: 'lessons', label: 'Lessons', icon: BookOpen },
  { key: 'scenarios', label: 'Scenarios', icon: Stethoscope },
  { key: 'questions', label: 'Questions', icon: FileQuestion },
  { key: 'drugs', label: 'Drugs', icon: Pill },
  { key: 'skills', label: 'Skills', icon: ClipboardCheck },
  { key: 'ecg', label: 'ECG', icon: HeartPulse },
  { key: 'foundations', label: 'Foundations', icon: GraduationCap },
  { key: 'media', label: 'Media', icon: Image },
];

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

  const firstValue = Object.values(record).find(Boolean);
  return firstValue || 'Untitled record';
}

function getRecordId(record: Record<string, string>) {
  const idKey = Object.keys(record).find((key) => key.endsWith('_id') || key === 'id');
  return idKey ? record[idKey] : '';
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [activeSection, setActiveSection] = useState('modules');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '8' });

    if (query) {
      params.set('q', query);
    }

    if (level) {
      params.set('level', level);
    }

    setLoading(true);
    fetch(`/api/${activeSection}?${params.toString()}`, { signal: controller.signal })
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
    () => sections.find((section) => section.key === activeSection) ?? sections[0],
    [activeSection],
  );
  const ActiveIcon = activeMeta.icon;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Activity aria-hidden="true" />
          <div>
            <strong>EMS Study</strong>
            <span>EMT / AEMT / Paramedic</span>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          {sections.map((section) => {
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
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Phase one build</span>
            <h1>EMS study dashboard</h1>
          </div>
          <div className={health?.database.connected ? 'status online' : 'status'}>
            <Database aria-hidden="true" />
            {health?.database.connected ? 'Database connected' : 'Checking database'}
          </div>
        </header>

        {error ? <div className="notice">API error: {error}</div> : null}

        <section className="metrics" aria-label="Database counts">
          {sections.slice(0, 8).map((section) => {
            const Icon = section.icon;
            return (
              <article className="metric" key={section.key}>
                <Icon aria-hidden="true" />
                <span>{section.label}</span>
                <strong>{health?.counts?.[section.key] ?? '-'}</strong>
              </article>
            );
          })}
        </section>

        <section className="browser-panel">
          <div className="panel-heading">
            <div>
              <ActiveIcon aria-hidden="true" />
              <h2>{activeMeta.label}</h2>
            </div>
            <span>{list ? `${list.count} records` : 'Loading records'}</span>
          </div>

          <div className="filters" aria-label="Search and filter placeholders">
            <label>
              <Search aria-hidden="true" />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${activeMeta.label.toLowerCase()}`}
                type="search"
                value={query}
              />
            </label>
            <select onChange={(event) => setLevel(event.target.value)} value={level}>
              <option value="">All levels</option>
              <option value="emt">EMT</option>
              <option value="aemt">AEMT</option>
              <option value="paramedic">Paramedic</option>
            </select>
            <button className="secondary" type="button">
              More filters
            </button>
          </div>

          <div className="records">
            {loading ? <p className="empty">Loading records...</p> : null}
            {!loading && list?.data.length === 0 ? <p className="empty">No records found.</p> : null}
            {!loading &&
              list?.data.map((record, index) => (
                <article className="record" key={`${getRecordId(record)}-${index}`}>
                  <span>{getRecordId(record)}</span>
                  <strong>{getRecordTitle(record)}</strong>
                  <p>
                    {record.short_summary ||
                      record.description ||
                      record.stem ||
                      record.caption ||
                      record.level ||
                      'Record preview placeholder'}
                  </p>
                </article>
              ))}
          </div>
        </section>

        <section className="next-phase">
          <FlaskConical aria-hidden="true" />
          <p>AI practice mode, remediation flows, and polished study interactions are intentionally left for later phases.</p>
        </section>
      </main>
    </div>
  );
}
