# EMS Study App

Full-stack EMS study app for EMT, AEMT, and Paramedic content.

## Stack

- React + Vite frontend at the repository root
- Node.js + Express API
- Local SQLite database for development
- CSV/XLSX source-data import scripts
- Cloudflare Worker/Pages static deployment scaffold

AI practice mode, payments, and user accounts are not implemented yet.

## Data Layout

Source files live in:

```text
data/source/
```

CSV exports live in:

```text
data/csv_exports/
```

The local SQLite database is generated at:

```text
data/ems_study_app.sqlite
```

The importer prefers CSV files in `data/csv_exports`. If that folder is empty, it extracts a CSV ZIP from `data/source`. If no ZIP exists, it converts the workbook in `data/source` into CSV exports.

## Setup

```powershell
npm install
npm run import:data
npm run verify:data
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173)
API: [http://localhost:3001](http://localhost:3001)

If SQLite is locked by a running server, stop the dev server before re-importing:

```powershell
npm run reset:data
npm run import:data
```

## Scripts

```powershell
npm run import:data   # rebuild data/ems_study_app.sqlite from CSV/XLSX source
npm run verify:data   # verify required tables and row counts
npm run reset:data    # remove SQLite database files
npm run server        # start Express API
npm run client        # start Vite frontend
npm run dev           # start API and frontend together
npm run build         # import data, then build Vite frontend
npm run deploy        # wrangler deploy
```

## API Routes

- `GET /api/health`
- `GET /api/stats`
- `GET /api/modules`
- `GET /api/modules/:id`
- `GET /api/lessons`
- `GET /api/lessons/:id`
- `GET /api/scenarios`
- `GET /api/scenarios/:id`
- `GET /api/scenarios/:id/steps`
- `GET /api/questions`
- `GET /api/questions/:id`
- `GET /api/questions/:id/options`
- `GET /api/questions/:id/rationales`
- `GET /api/drugs`
- `GET /api/drugs/:id`
- `GET /api/skills`
- `GET /api/skills/:id`
- `GET /api/skills/:id/steps`
- `GET /api/ecg`
- `GET /api/ecg/:id`
- `GET /api/foundations`
- `GET /api/foundations/:id`
- `GET /api/media`
- `GET /api/references`

Route mappings:

- `/api/ecg` queries `ecg_bank`
- `/api/media` queries `media_manifest`
- `/api/scenarios/:id/steps` queries `scenario_steps`
- `/api/skills/:id/steps` queries `skill_steps`
- `/api/questions/:id/options` queries `question_options`
- `/api/questions/:id/rationales` queries `question_rationales`

## Expected Main Counts

```text
modules: 24
lessons: 576
scenarios: 187
questions: 470
drugs: 10
skills: 11
ecg_bank: 12
foundations: 20
```

Run `npm run verify:data` to confirm the full database.

## Cloudflare Deployment

The repository includes `wrangler.toml` for Cloudflare static deployment, but Cloudflare Workers cannot use the local `better-sqlite3` database file directly.

Local development uses:

```text
SQLite via Node/Express: data/ems_study_app.sqlite
```

Cloudflare production currently uses:

```text
Static Vite assets plus Worker fallback metadata
```

For full database-backed Cloudflare production, migrate the same CSV data into Cloudflare D1:

1. Create a D1 database in Cloudflare.
2. Use `scripts/import-data.mjs` locally to generate SQLite.
3. Export SQL from SQLite:

   ```powershell
   sqlite3 data/ems_study_app.sqlite .dump > data/ems_study_app_d1.sql
   ```

4. Import into D1:

   ```powershell
   wrangler d1 execute <DATABASE_NAME> --file=data/ems_study_app_d1.sql
   ```

5. Replace the Worker fallback API with D1 queries.

## Environment

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
DATABASE_URL=./data/ems_study_app.sqlite
```

Do not expose `OPENAI_API_KEY` in frontend code.
