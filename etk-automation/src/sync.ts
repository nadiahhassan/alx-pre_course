// Pulls every enabled board, turns it into the standard shape and merges it into the portfolio.
// Merging keeps history: a changed metric adds a new point instead of overwriting the old one.

import { fetchBoard, type Fetcher } from "./adapters/index.js";
import type { BoardConfig, Config } from "./config.js";
import type { BoardHealth, FeedItem, Portfolio, Project, Risk } from "./model.js";
import { fmt, latest, money } from "./rules.js";
import { normalizeProjects, normalizeRisks } from "./standard.js";

export interface SyncResult { portfolio: Portfolio; changes: number; health: BoardHealth[] }

const toolLabel: Record<string, string> = { monday: "Monday.com", asana: "Asana", trello: "Trello", jira: "Jira", sheet: "Spreadsheet" };

/** Merges one fresh project into its stored copy, returning feed lines for what changed. */
export function mergeProject(old: Project | undefined, fresh: Project, source: string, now: string): { project: Project; feed: FeedItem[] } {
  const feed: FeedItem[] = [];
  const note = (text: string) => feed.push({ at: now, projectId: fresh.id, source, text });
  if (!old) {
    note(`New project added from ${source}.`);
    return { project: { ...fresh, metrics: fresh.metrics.map(m => ({ ...m, source, history: m.history.map(h => ({ ...h, source })) })) }, feed };
  }
  const metrics = fresh.metrics.map(m => {
    const prev = old.metrics.find(x => x.id === m.id);
    const history = prev ? [...prev.history] : [];
    const incoming = latest(m);
    const last = history.at(-1);
    if (incoming && (!last || last.value !== incoming.value)) {
      // Never write a point dated before the last one: the tool's "last update" can lag.
      const date = last && incoming.date < last.date ? last.date : incoming.date;
      if (last && last.date === date) history[history.length - 1] = { date, value: incoming.value, source };
      else history.push({ date, value: incoming.value, source });
      note(`${m.name}: ${fmt(last?.value ?? null, m.unit)} → ${fmt(incoming.value, m.unit)}.`);
    }
    return { ...m, source, history };
  });
  if (old.spent !== fresh.spent) note(`Spend updated to ${money(fresh.spent)} (was ${money(old.spent)}).`);
  if (old.budget !== fresh.budget) note(`Budget changed to ${money(fresh.budget)} (was ${money(old.budget)}).`);
  for (const ms of fresh.milestones) {
    const was = old.milestones.find(x => x.name === ms.name);
    if (ms.done && !was?.done) note(`Milestone done: ${ms.name}.`);
    if (was && was.due !== ms.due && !ms.done) note(`“${ms.name}” moved from ${was.due} to ${ms.due}.`);
  }
  if (old.lead !== fresh.lead) note(`Lead changed to ${fresh.lead}.`);
  const changed = feed.length > 0;
  return { project: { ...fresh, metrics, lastUpdate: changed && fresh.lastUpdate < old.lastUpdate ? old.lastUpdate : fresh.lastUpdate, archived: false }, feed };
}

export async function syncAll(cfg: Config, portfolio: Portfolio, opts: { today: string; now?: string; fetcher?: Fetcher; only?: string } ): Promise<SyncResult> {
  const now = opts.now ?? new Date().toISOString();
  const boards = cfg.boards.filter(b => b.enabled && (!opts.only || b.id === opts.only));
  const projectsOut = new Map(portfolio.projects.map(p => [p.id, p]));
  const feed: FeedItem[] = [];
  const health: BoardHealth[] = [];
  const freshRisks: Risk[] = [];
  const riskBoardsOk = new Set<string>();

  // Projects first, so risk boards can match project names.
  const ordered = [...boards.filter(b => b.kind === "projects"), ...boards.filter(b => b.kind === "risks")];
  for (const b of ordered) {
    const h: BoardHealth = { boardId: b.id, boardName: b.name, tool: toolLabel[b.source.tool], checkedAt: now, ok: true, items: 0, issues: [] };
    health.push(h);
    let items;
    try { items = await fetchBoard(cfg, b.source, opts.fetcher); }
    catch (e) { h.ok = false; h.issues.push((e as Error).message); continue; }
    h.items = items.length;
    const source = `${toolLabel[b.source.tool]}: ${b.name}`;
    if (b.kind === "projects") {
      const { rows, issues } = normalizeProjects(items, b.id, b.fields, opts.today);
      h.issues.push(...issues);
      const seen = new Set(rows.map(r => r.id));
      for (const fresh of rows) {
        const { project, feed: f } = mergeProject(projectsOut.get(fresh.id), fresh, source, now);
        projectsOut.set(project.id, project);
        feed.push(...f);
      }
      // Items removed from the board are kept (with their history) but marked archived.
      for (const p of projectsOut.values()) if (p.boardId === b.id && !seen.has(p.id) && !p.archived) { p.archived = true; feed.push({ at: now, projectId: p.id, source, text: "Removed from the board, so archived." }); }
    } else {
      const { rows, issues } = normalizeRisks(items, b.id, b.fields, [...projectsOut.values()].filter(p => !p.archived), opts.today);
      h.issues.push(...issues);
      freshRisks.push(...rows);
      riskBoardsOk.add(b.id);
    }
    h.ok = h.issues.length === 0;
  }

  // Risk boards replace their own risks; risks added from emails (or boards that failed this run) are kept.
  const keptRisks = portfolio.risks.filter(r => !riskBoardsOk.has(r.source));
  for (const r of freshRisks) {
    const was = portfolio.risks.find(x => x.id === r.id && x.source === r.source);
    if (!was) feed.push({ at: now, projectId: r.projectId, source: "Risk register", text: `New risk: ${r.title}.` });
    else if (was.status !== r.status) feed.push({ at: now, projectId: r.projectId, source: "Risk register", text: `Risk “${r.title}” is now ${r.status.toLowerCase()}.` });
  }
  const healthOut = [...portfolio.boardHealth.filter(x => !health.some(y => y.boardId === x.boardId)), ...health];
  return {
    portfolio: { ...portfolio, projects: [...projectsOut.values()], risks: [...keptRisks, ...freshRisks], feed: [...portfolio.feed, ...feed].slice(-2000), boardHealth: healthOut },
    changes: feed.length, health,
  };
}

export type { BoardConfig };
