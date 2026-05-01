# EMS Study App

Phase-one full-stack study app scaffold for EMT, AEMT, and Paramedic content.

## What is included

- React + Vite frontend at the repository root
- Node.js + Express backend
- Local SQLite database
- CSV export unzip/import script
- API routes for modules, lessons, scenarios, questions, drugs, skills, ECG, foundations, and media
- Dashboard with database status and record counts
- Basic navigation plus search/filter placeholders

AI practice mode, polished lesson/scenario flows, remediation UX, and fine-tuning are intentionally out of scope for this first build phase.

## Source data

The importer uses the CSV export ZIP as the source of truth:

`data/ems_study_app_database_v1_csv_exports.zip`

Every CSV is imported into a matching SQLite table named after the CSV file. Values are stored as text so original IDs and exported values are preserved exactly.

## Setup

1. Copy environment defaults:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

3. Import the CSV exports into SQLite:

   ```powershell
   npm run import:data
   ```

4. Run the full app:

   ```powershell
   npm run dev
   ```

5. Open the frontend:

   [http://localhost:5173](http://localhost:5173)

The local API runs on [http://localhost:3001](http://localhost:3001).

## Cloudflare

Cloudflare should use the repository root as the project root.

The `build` script runs `vite build`, and `wrangler.toml` points Workers static assets at `./dist`. The Node/Express SQLite backend is still available locally with `npm run start`; moving the database-backed API to Cloudflare would require a later D1/Workers migration.

## API routes

- `GET /api/health`
- `GET /api/modules`
- `GET /api/lessons`
- `GET /api/scenarios`
- `GET /api/questions`
- `GET /api/drugs`
- `GET /api/skills`
- `GET /api/ecg`
- `GET /api/foundations`
- `GET /api/media`

List routes support early placeholder query parameters:

- `q`
- `level`
- `module_id`
- `taxonomy_id`
- `limit`
- `offset`

## Environment

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
DATABASE_URL=./data/ems_study_app.sqlite
```

Do not expose `OPENAI_API_KEY` in frontend code. AI features are not implemented in this phase.
