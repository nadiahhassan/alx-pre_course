# ETK project automation

Pulls every country's project board into one portfolio. It also:
- reads email updates with AI, and queues each change for a person to approve
- sends warnings and update reminders
- writes the weekly report
- produces the file the [projects dashboard](../portfolio-tracker/portfolio-tracker.html) loads

```
Monday.com ─┐
Asana ──────┤                                   ┌─► Warnings to Slack / Teams, reminders to leads
Trello ─────┼─► sync ─► one portfolio ─► rules ─┼─► Weekly report (email, HTML, Markdown)
Jira ───────┤      ▲                            └─► dashboard-data.json ─► dashboard
Sheets ─────┘      │
Email inbox ─► AI reads it ─► you approve ─┘
```

For the rollout steps and who does what, see [PLAYBOOK.md](PLAYBOOK.md).

## Try it in two minutes (no accounts needed)

```bash
cd etk-automation
npm install
npm run demo
```

This syncs the example boards in `examples/boards/` and checks each board's columns. Then it:
- lists the warnings
- writes a weekly report
- writes `demo-output/exports/dashboard-data.json`

Open the dashboard, go to **Bring in updates > Live data file** and load that file.

The Kenya example shows a board whose columns have different names (`Owner` instead of `Lead`, `KPI 1 goal` instead of `Metric 1 target`). The `fields` map in `config/demo.json` handles it.

AI email reading is skipped unless a Claude API key is set (see below).

## Set it up for real

1. **Fill in the board inventory** (`templates/board-inventory.xlsx`): one row per board that exists today.
2. **Move boards onto the standard template** (`templates/standard-board-template.xlsx`). Red columns are required. Monday.com, Asana, Trello and Jira can import it to create a board. Boards you can't rename are fine: map their columns in config instead.
3. **Write the config.** Copy `config/boards.example.json` to `config/boards.json`, with one entry per board. `fields` is only needed where a column is named differently from the template.
4. **Give it access.** Set the token for each tool as an environment variable. Tokens never go in the config. See `.env.example`.

| Tool | What to set | Where to get it |
|---|---|---|
| Monday.com | `MONDAY_TOKEN` | Profile picture > Developers > My access tokens. The board id is the number in the board's URL. |
| Asana | `ASANA_TOKEN` | My settings > Apps > Developer apps > Personal access token. The project gid is in the project's URL. |
| Trello | `TRELLO_KEY`, `TRELLO_TOKEN` | trello.com/power-ups/admin > your Power-Up > API key, then generate a token. Use Custom Fields for the template columns. |
| Jira Cloud | `JIRA_EMAIL`, `JIRA_TOKEN` | id.atlassian.com > Security > API tokens. Set `site` and a `jql` that selects the project issues. |
| Google Sheets | nothing | File > Share > Publish to web > CSV, then use the link as `url`. Or download it as .xlsx and use `path`. |
| Excel / CSV | nothing | `path` to the file, e.g. on a shared drive. |
| Claude (AI) | `ANTHROPIC_API_KEY` | console.anthropic.com > API keys. Or run `ant auth login`. |
| Slack / Teams | `SLACK_WEBHOOK_URL` / `TEAMS_WEBHOOK_URL` | An incoming webhook for the channel. |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Your mail provider's SMTP settings. |

5. **Check every board:** run `npm run etk -- sync`. Each board gets a ✓, or a list of exactly what's wrong (missing columns, unknown countries, rows without a budget). Fix those on the boards and run it again.

## Commands

```bash
npm run etk -- sync              # pull every board; --board nigeria for one
npm run etk -- intake            # read new emails in inbox/ with AI
npm run etk -- review            # see changes waiting for approval
npm run etk -- approve all       # or approve E20261121-001-1 E20261121-001-3
npm run etk -- reject E20261121-001-2
npm run etk -- alerts            # new warnings to Slack/Teams, reminders to leads (--dry-run to preview)
npm run etk -- report --ai --send  # weekly report, with an AI summary, emailed to reports.recipients
npm run etk -- export            # dashboard-data.json for the dashboard
npm run etk -- status            # one line per project
npm run etk -- run               # sync + intake + alerts + export, for a scheduler
npm run etk -- templates         # rebuild the Excel templates
```

## How emails get in

Every country sends updates to one mailbox, e.g. `updates@…`. A mail rule, Power Automate or Zapier saves each message as a `.txt` or `.eml` file in `inbox/`.

`intake` sends each file to Claude (`claude-opus-5-5`) with a list of the projects, metrics and open milestones. Claude returns the changes in a fixed structure. The code then:
- checks every change against the portfolio, and drops anything that doesn't match a real project, metric or open milestone
- lists anything it couldn't match as "not matched", for a person to handle
- moves read files to `inbox/processed/`, or to `inbox/failed/` if they couldn't be read

**Nothing is saved until someone approves it.** Approved changes appear in the dashboard's activity feed as "Email (AI)".

If Claude's safety system declines an email, the request falls back to another model automatically (`fallbacks: "default"`). If that also declines, the email is moved to `inbox/failed` for a person to read.

## Schedule it

On any always-on machine (a small cloud VM, or an office server):

```cron
# Every hour: pull boards, read emails, send new warnings, refresh the dashboard file
0 * * * *  cd /srv/etk-automation && npm run etk -- run >> logs/run.log 2>&1
# Monday 07:00: weekly report with AI summary, emailed to leadership
0 7 * * 1  cd /srv/etk-automation && npm run etk -- report --ai --send >> logs/report.log 2>&1
```

`data/` holds the portfolio and its history, so keep it on a disk that is backed up.

Point `paths.exports` at a shared folder (SharePoint, Google Drive or Dropbox sync) so the dashboard file is always where people expect it.

`deploy/github-actions.example.yml` shows the same schedule on GitHub Actions. It stores `data/` between runs on a separate branch.

## Status rules

These are the same rules the dashboard uses, so the numbers always match:
- **Running totals** (people trained, meetings held, $ raised) are compared with where they should be by today, on a straight line from start to end.
- **Rates and scores** (%, /5, days) are compared with their target, measured from the baseline. Lower is better when the target is below the baseline.
- **Thresholds:** at 90% or more of expected, a metric is on track. From 70% it is behind, and below 70% it is off track. A project takes the worst status of its metrics.

**Warnings also fire for:**
- overspend
- spending more than 10 points ahead of time
- overdue milestones (red after 14 days)
- no update for 30 days
- high risks (score 15 or more)

Each warning is sent once, when it first appears.

## Development

```bash
npm run lint   # type-check
npm test       # unit tests; adapters are tested against recorded API shapes, no network
```

The adapters follow each tool's public API: the Monday.com GraphQL `items_page` / `next_items_page`, Asana tasks with offset paging, Trello cards with Custom Fields, and Jira `search/jql` with `nextPageToken`. Test each one against a real board during the pilot before relying on it.
