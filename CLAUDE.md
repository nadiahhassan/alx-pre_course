# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What's here

| Folder | What it is |
|---|---|
| `0x02-git/`, `bash/`, `c/`, `js/` | Early ALX course exercises. Leave them alone unless asked. |
| `impact-tracker/` | The full Impact Tracker web app (Next.js). Has its own `CLAUDE.md` / `AGENTS.md`; read those before changing it. |
| `impact-tracker/demo/` | Standalone, clickable demo of the app as one HTML file (no server needed). |
| `impact-tracker/sample-data/` | Generators for the shared sample dataset and the Excel template. |
| `gni-impact-scorecard/` | One-page impact scorecard tailored to Google News Initiative programmes. |
| `impact-studio/` | General impact planner and tracker for any project: a guided five-step setup, then tracking and reporting. |
| `portfolio-tracker/` | Multi-country projects dashboard concept for ETK Group: world map, people, budget, risk register, update inbox with AI extraction, reports. |

The owner is Nadia Hassan. She is also the "Global lead" persona (lead@example.org) in the sample data.

## Impact Tracker app (`impact-tracker/`)

- **Stack:** Next.js 16 (App Router, `proxy.ts` instead of middleware, async params/cookies/headers), React 19, TypeScript, Tailwind v4, Prisma 6, SQLite locally, plus a generated Postgres schema in `prisma/postgres/`.
- **Commands** (run inside `impact-tracker/`):
  - `npm run dev`: start the dev server
  - `npm run lint`: type-check
  - `npm test`: Vitest unit tests
  - `npm run build`: production build
  - `npm run db:seed`: wipe the database and reload the sample data
- Run `npm run lint` and `npm test` before committing app changes.
- **Don't run `prisma migrate reset`.** Prisma blocks it when an AI agent runs it, and you must not work around that block. Use `npm run db:seed` to reset the data.
- If type-checking fails on stale generated types, delete `.next/types` and try again.
- To free the dev server's port, use `fuser -k <port>/tcp`, not `pkill -f`.
- Demo sign-in: any seeded email; the password is `demo-password-2026` (override it with `SEED_PASSWORD`). The login page lists the demo accounts when `DEMO_ACCOUNTS=1`.

## Sample data and template (`impact-tracker/sample-data/`)

- `sample-data.json` is the single source of truth for the database seed, the HTML demo and the Excel template. It refers to everything by name, not by id.
- Don't hand-edit the generated files. Edit `trainings_block.py` / `build_sample_data.py`, then run:
  - `python3 build_sample_data.py` (its built-in checks confirm references resolve and budgets add up)
  - `python3 build_template.py`
- Then run `npm run db:seed` and update the demo so all three match.

## Standalone demo pages

These pages are all self-contained HTML files published as claude.ai artifacts:
- `impact-tracker/demo/impact-tracker-demo.html`
- `gni-impact-scorecard/gni-impact-scorecard.html`
- `impact-studio/impact-studio.html`
- `portfolio-tracker/portfolio-tracker.html` (brand colours sit in one block at the top of its CSS; the world map is pre-projected Natural Earth 110m paths embedded as `const MAP`)

Rules for these pages:

- **The repo copy is the source.** Edit the HTML file in the repo directly, then republish it.
  - The working sources for the Impact Tracker demo (`app.js`, `head.html`) lived in a temporary scratchpad and may be gone.
  - Its sample data sits in the page as `const ORIGINAL = {...}`. To refresh it, replace that line with the contents of `sample-data.json`.
- **No build step and no external requests.** Fonts come only from Google Fonts. Scripts load only from cdnjs.cloudflare.com, pinned to an exact version (for example SheetJS `xlsx` 0.18.5).
- **No `alert`, `confirm` or `prompt`.** They don't work in artifacts. For destructive actions, use the in-page "click again to confirm" pattern instead.
- **Light and dark themes:** colours are CSS tokens on `:root`, redefined for dark mode. Keep both themes working. Exception: the ETK dashboard (`portfolio-tracker/`) is light-only with a white background, at the owner's request.
- **Saved state** goes in `localStorage`, wrapped in try/catch. The keys are:
  - `impact-tracker-demo-v4` (Impact Tracker demo)
  - `gni-scorecard-v1` (GNI scorecard)
  - `impact-studio-v1` (Impact Studio)
  - `portfolio-tracker-v1` (ETK projects dashboard)

  Bump the key, or migrate the stored data, if the stored shape changes.
- **AI features** use the artifact `sample` capability. Hide the feature when it isn't available.
- **Label all example figures, quotes and names as illustrative.** Never present them as real results, and never style a page as an official Google product.

## Status logic (shared idea across the tools)

- **Running totals** are compared with where they should be by today, assuming straight-line progress from start to end.
- **Rates and scores** are compared with their target directly, measured from the baseline. Lower-is-better works by setting the target below the baseline.
- **Thresholds:** at 90% or more of expected, a metric is on track. From 70% it is behind, and below 70% it is off track.

Keep any new view consistent with these rules.

## Writing style

- Write user-facing text in plain, direct English: short sentences, active voice, and buttons that say exactly what they do.
- Use British spelling in the UI copy ("programme", "organisation").

## Git

- Work on the branch you're given. Commit with clear messages and push with `git push -u origin <branch>`.
- Don't open pull requests unless asked.
