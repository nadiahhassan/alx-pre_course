# Impact Tracker

A spreadsheet-plus-dashboard tool for running the Global News Programme: measuring its impact, the effect of marketing and events on internal and external audiences, and (in later steps) budgets, responsibilities and partner work with Comms, Government Affairs & Public Policy (GAPP) and Marketing.

**Structure:** Programme → focus areas (e.g. Trainings) → initiatives → metrics, entries, campaigns and evidence.

Built with Next.js (App Router, TypeScript), Prisma + SQLite, Tailwind CSS and Recharts.

## Setup

Requirements: Node.js 20 or newer.

```bash
cd impact-tracker
npm install
cp .env.example .env     # SQLite file path; GEMINI_API_KEY is optional
npm run setup            # creates the database and loads the example project
npm run dev
```

Open http://localhost:3000 and sign in with one of the demo accounts (password `demo-password-2026`; they're listed on the sign-in page while `DEMO_ACCOUNTS=1`):

| Account | Role |
| --- | --- |
| `lead@example.org` | Global lead (admin): everything, including people, programme settings and budgets |
| `programme@example.org` | Programme team: initiatives, metrics, data, campaigns, evidence, snapshots |
| `comms@example.org`, `gapp@example.org` | Partners: view everything, add evidence, create share links |
| `marketing@example.org` | Marketing partner: as above, plus campaigns |

The Global lead adds and manages people under **People**.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the unit tests (status calculations, CSV parsing) |
| `npm run lint` | Type-check the project |
| `npm run build && npm start` | Production build and server |
| `npm run db:seed` | Reload the example data. **This wipes the database first.** (Plain `prisma db seed` only loads it into an empty database.) |
| `npm run db:reset` | Drop, re-migrate and reseed the database |
| `npm run db:migrate` | Create a migration after editing `prisma/schema.prisma` |
| `npm run create-admin -- <email> "<name>" "<password>"` | Create or reset a Global lead account (for real deployments) |

## What's in phase 1

- **Portfolio** (`/`): every project's overall status, timeline, metric status mix and key metrics.
- **Projects**: create and edit projects, including a five-step theory of change (inputs → activities → outputs → outcomes → impact). Projects can be archived and restored.
- **Parameters**: add, edit and archive metrics at any point without affecting existing data. Add from the shared **parameter library**, or save a project parameter to it. Library definitions are copied into projects, not linked, so editing the library never changes a running project.
- **Data entry**:
  - a grid (rows are parameters, columns are dates) with inline editing and keyboard navigation
  - confidence level and a note per value
  - a single-entry form
  - CSV import with a preview
  - CSV export
- **Dashboard**:
  - progress vs target with red / amber / green status for every metric
  - trend lines with the expected path to target
  - confidence shown on every metric
  - metrics grouped by logic-model level: impact and outcomes get large cards, outputs medium cards, activities and inputs compact rows
- **User picker**: there's no login yet. Pick who you are in the header; entries record who logged them.

## How status is calculated

The logic lives in `src/lib/status.ts`, with tests in `tests/status.test.ts`.

- **Current value** is the latest entry for a "latest value" metric, or baseline plus all entries for a "running total" metric.
- **Progress** is the share of the distance from baseline to target that has been covered. It handles "lower is better" metrics too, because the direction follows from baseline vs target.
- **Expected progress** assumes a straight line from the baseline at the project start to the target at the parameter's target date (or the project end date if none is set). It is measured at the date of the latest entry, so a quarterly metric isn't marked down in the weeks between measurements.
- **Status** compares actual progress with expected progress:

  | Status | Actual progress |
  | --- | --- |
  | On track (green) | 90% of expected or more |
  | Behind (amber) | 70–90% of expected |
  | Off track (red) | Below 70% of expected |

  Reaching the target is always green. The thresholds are in `DEFAULT_THRESHOLDS`.
- **At risk**: a metric is flagged when any leading indicator linked to it is amber or red. The logic and tests are in place now; phase 2 shows it in the UI.
- **Overall project status** is the worst status among its key metrics, or among all metrics if none are marked as key.

## CSV import format

Either the long layout (what Export CSV produces):

```csv
parameter,date,value,confidence,note
Journalists trained,2026-10-01,25,measured,
Reader trust score,2026-10-01,6.6,self-reported,Autumn survey
```

or the wide layout, like the grid:

```csv
parameter,2026-09-01,2026-10-01
Journalists trained,26,25
```

Parameters are matched by name, ignoring case. Dates can be `YYYY-MM-DD` or `DD/MM/YYYY`. Existing values for the same parameter and date are replaced.

## Project structure

```
prisma/
  schema.prisma     data model (SQLite now, Postgres-ready)
  seed.ts           example: Local News Resilience Programme
src/
  app/              routes (portfolio, projects/[id]/…, library)
  components/       UI, forms, entry grid, charts
  lib/              status logic, dashboard builder, CSV, formatting, constants
  server/           server actions and queries
tests/              Vitest unit tests
```

## Hosting (Postgres)

Local development uses SQLite. For hosting, the app uses a generated Postgres copy of the schema (`prisma/postgres/`), so nothing changes locally.

**Recommended: Vercel for the app and Neon for the database.** Both have free tiers.

1. Create a Postgres database on [Neon](https://neon.tech) and copy its connection string.
2. In [Vercel](https://vercel.com), import this GitHub repository and set:
   - **Root directory:** `impact-tracker`
   - **Build command:** `npm run build:postgres`
   - **Environment variables:**
     - `DATABASE_URL`: the Neon connection string
     - For a **demo** deployment: `DEMO_ACCOUNTS=1` and a `SEED_PASSWORD` of your choice
3. Deploy. The first build creates the tables and loads the example programme with its demo accounts. Later builds apply new migrations and leave your data alone.
4. For **real** use, don't set `DEMO_ACCOUNTS`. Create your own admin with `npm run create-admin` (run it locally with `DATABASE_URL` pointing at the hosted database) and deactivate the demo accounts under People.

Any host that runs Node.js and Postgres works the same way (Render, Railway, Fly.io).

**Access:** everyone signs in with their own account. Passwords are hashed with scrypt, sessions last 14 days, and every action that changes data checks the person's role on the server. Read-only share links (`/share/...`) open without signing in.

**After changing `prisma/schema.prisma`:**
1. Run `npm run db:postgres-schema`.
2. Create the matching Postgres migration in `prisma/postgres/migrations/<n>_<name>/migration.sql` with `npx prisma migrate diff --from-migrations prisma/postgres/migrations --to-schema-datamodel prisma/postgres/schema.prisma --shadow-database-url <an empty Postgres database> --script`.

## AI features (phase 3)

These will read `GEMINI_API_KEY` from the environment. The app works fully without it.
