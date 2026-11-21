# Rollout playbook: one view of every ETK project

The goal: every country board feeds one portfolio automatically, so leadership sees live status, budget and risks without asking anyone for a spreadsheet.

The work is done in seven steps. Each one has an owner, a deliverable, and a check that it's done.

| Step | What | Owner | Deliverable | Done when |
|---|---|---|---|---|
| 1 | **List every board** | Nadia + each country lead | `templates/board-inventory.xlsx`, one row per board | Every country and project appears on a board in the inventory |
| 2 | **Agree the standard columns** | Nadia, signed off by the Global lead | `templates/standard-board-template.xlsx` | Leadership agrees the required (red) columns |
| 3 | **Pilot one country** (suggest Nigeria: most projects) | Nadia + Nigeria lead | Nigeria board in `config/boards.json`; first `sync` with no warnings | The dashboard's Nigeria numbers match the board, checked line by line |
| 4 | **Turn on email updates** | Nadia + IT | updates@… mailbox saving to `inbox/`; Claude API key set | One real update email goes through read → approve → dashboard |
| 5 | **Roll out to every country**, one or two a week | Nadia + country leads | One config entry per board | `sync` shows ✓ for every board |
| 6 | **Switch on outputs** | Nadia | Hourly `run`, weekly `report --ai --send`, Slack/Teams webhook | Leadership gets the Monday report; leads get their reminders |
| 7 | **Agree who owns what** | Global lead | The table below, shared with every team | Each role knows their weekly job |

## Step 1: list every board

Fill one row per board in `board-inventory.xlsx`:
- the tool, a link and the owner
- how often it's really updated
- which columns are named differently from the template

This usually shows boards nobody updates and projects that live only in someone's inbox. Note those too: they become boards in step 5.

## Step 2: standard columns

Every board needs the same core information:
- project, country, lead, dates
- budget and spend to date
- up to three metrics, each with a baseline, target and latest value
- up to three milestones
- a separate risk register

Boards don't have to look identical. A column can keep its local name if it's mapped once in config. But **every board must carry the red columns**, or that project can't be scored.

Choosing metrics: pick one or two that show the project is delivering (e.g. buyer meetings held) and one that shows it's working (e.g. distributors signed). Use the unit to say how it's judged:
- `%` and scores are rates
- numbers and `$` are running totals

## Step 3: pilot

1. Add the pilot board to `config/boards.json` and set its token.
2. Run `npm run etk -- sync` and fix every issue it lists on the board itself, not in the automation.
3. Run `npm run etk -- export`, load the file in the dashboard, and go through each project with the country lead. Every red or amber flag should be something the lead agrees with.
4. Run `npm run etk -- report` and check that the report reads well.

## Step 4: email updates

- Create one mailbox for updates. Teams forward their usual update emails there; nothing new to learn.
- Have IT (or a Power Automate / Zapier flow) save each message into `inbox/` as a `.txt` or `.eml` file.
- Set `ANTHROPIC_API_KEY`. Run `intake`, then `review`.
- **Nothing is saved until a person approves it.** Agree who approves (see below), and what to do with lines listed as "not matched".

## Step 5: roll out

Add one or two countries a week. Each new board follows the step 3 checks. Keep the inventory up to date: tick "Connected" when a board is live.

## Step 6: outputs

- **Hourly `run`:** sync, read emails, send new warnings, refresh the dashboard file.
- **Monday 07:00 `report --ai --send`:** the weekly report to leadership, with a short AI-written overview at the top.
- **Warnings** go to one Slack or Teams channel, each once. **Reminders** go to each lead whose updates are overdue.

## Step 7: who owns what

| Role | Weekly job |
|---|---|
| **Country lead** | Keeps their board's actuals, spend and milestones current, at least as often as the update frequency. Responds to reminders. |
| **Approver** (Nadia, or a named deputy per region) | Reviews AI-read email changes daily with `review` / `approve`. Handles anything "not matched". |
| **Finance** | Confirms "Spent to date" each month against the finance system. |
| **Risk owner** | Reviews their risks by the review date and updates likelihood, impact and status. |
| **Global lead** | Reads the Monday report and makes the decisions it raises. Signs off changes to the standard columns. |
| **Nadia (system owner)** | Keeps the config, tokens and schedule running. Fixes board-health issues. Adds new boards. |

## What we need from ETK

- [ ] The list of tools in use, and admin access (or an invited service account) for each
- [ ] One example board and one example update email from each country
- [ ] Who receives the weekly report, and what decisions they make from it
- [ ] Where spend comes from (Xero, QuickBooks, Sage or a spreadsheet) and who confirms it
- [ ] A mailbox for updates, and a Slack or Teams channel for warnings
- [ ] An always-on machine or cloud account to run the schedule
- [ ] A Claude API key, or approval to set one up

## Later

- **Read spend straight from the finance system** instead of the board's "Spent to date" column.
- **Write back:** approved email updates go to the source board too, not only the portfolio.
- **Share links:** turn the dashboard from a file you load into a hosted page that refreshes itself, with logins for country leads.
