// Loads the sample Global News Programme from sample-data/sample-data.json,
// the same data the in-browser demo and the Excel template use.
//
// By default this only loads into an EMPTY database, so it is safe to run on
// every deploy. `npm run db:seed` passes --reset, which wipes all data first.
// Pass --file=path/to/data.json to load a different dataset of the same shape.

import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildPayload } from "../src/lib/payload";
import { hashPassword } from "../src/lib/passwords";

// Demo sign-in password for every seeded account. Override with SEED_PASSWORD.
const PASSWORD = process.env.SEED_PASSWORD || "demo-password-2026";
const prisma = new PrismaClient();
const d = (s: string) => new Date(`${s}T00:00:00Z`);
const optDate = (s?: string | null) => (s ? d(s) : null);

interface Dataset {
  programme: { name: string; mission: string; description: string; currency: string; budget: number; start: string; end: string };
  people: { name: string; email: string; role: string; team: string }[];
  focusAreas: { name: string; description: string; owner: string; budget: number }[];
  library: { name: string; definition: string; level: string; unit: string; direction: string; measureType: string; frequency: string; dataSource: string }[];
  initiatives: {
    name: string; focusArea: string; description: string; owner: string; start: string; end: string; budget: number; region: string; status: string;
    toc: { inputs: string; activities: string; outputs: string; outcomes: string; impact: string };
  }[];
  metrics: {
    initiative: string; name: string; definition: string; level: string; unit: string; direction: string; measureType: string; baseline: number;
    target: number; targetDate: string; frequency: string; dataSource: string; isKey: boolean; audience: string; leadingIndicatorFor: string; library: string;
  }[];
  entries: { initiative: string; metric: string; date: string; value: number; confidence: string; note: string; loggedBy: string }[];
  campaigns: { initiative: string; name: string; channel: string; audience: string; start: string; end: string; spend: number; tag: string; notes: string }[];
  campaignMetrics: { initiative: string; campaign: string; date: string; metric: string; value: number }[];
  evidence: { initiative: string; metric: string; type: string; title: string; body: string; source: string; url: string; date: string; tags: string; origin: string }[];
  spend: { initiative: string; date: string; amount: number; category: string; status: string; description: string; reference: string }[];
  responsibilities: {
    title: string; description: string; type: string; team: string; owner: string; dueDate: string; recurrence: string; status: string;
    completedAt: string; notes: string; focusArea: string; initiative: string;
  }[];
  risks: {
    title: string; description: string; likelihood: number; impact: number; mitigation: string; status: string; owner: string; reviewDate: string;
    focusArea: string; initiative: string;
  }[];
  decisions: { date: string; title: string; decision: string; rationale: string; madeBy: string; focusArea: string; initiative: string }[];
  snapshots: { initiative: string; label: string; asOf: string; by: string; frozenOn: string }[];
}

function loadDataset(): Dataset {
  const arg = process.argv.find((a) => a.startsWith("--file="));
  const file = arg ? path.resolve(arg.slice(7)) : path.join(__dirname, "..", "sample-data", "sample-data.json");
  return JSON.parse(readFileSync(file, "utf8"));
}

async function wipe() {
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.spendEntry.deleteMany(),
    prisma.responsibility.deleteMany(),
    prisma.risk.deleteMany(),
    prisma.decision.deleteMany(),
    prisma.shareLink.deleteMany(),
    prisma.snapshot.deleteMany(),
    prisma.evidence.deleteMany(),
    prisma.campaignMetric.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.entry.deleteMany(),
    prisma.parameter.deleteMany(),
    prisma.libraryParameter.deleteMany(),
    prisma.project.deleteMany(),
    prisma.focusArea.deleteMany(),
    prisma.programme.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  const reset = process.argv.includes("--reset");
  if (!reset && (await prisma.project.count()) > 0) {
    console.log("Database already has data; skipping the sample. Use `npm run db:seed` to wipe and reload it.");
    return;
  }
  const ds = loadDataset();
  await wipe();

  // People
  const passwordHash = hashPassword(PASSWORD);
  const person = new Map<string, string>();
  for (const p of ds.people) {
    const u = await prisma.user.create({ data: { name: p.name, email: p.email.toLowerCase(), role: p.role, team: p.role === "partner" ? p.team : "", passwordHash } });
    person.set(p.name, u.id);
  }
  const who = (name?: string) => (name ? person.get(name) ?? null : null);

  // Programme and focus areas
  const g = ds.programme;
  const programme = await prisma.programme.create({
    data: { name: g.name, mission: g.mission, description: g.description, currency: g.currency, budget: g.budget, startDate: d(g.start), endDate: d(g.end) },
  });
  const focus = new Map<string, string>();
  for (const [i, f] of ds.focusAreas.entries()) {
    const fa = await prisma.focusArea.create({ data: { programmeId: programme.id, name: f.name, description: f.description, ownerId: who(f.owner), budget: f.budget, sortOrder: i } });
    focus.set(f.name, fa.id);
  }

  // Library
  const library = new Map<string, string>();
  for (const l of ds.library) {
    const item = await prisma.libraryParameter.create({
      data: { name: l.name, definition: l.definition, level: l.level, unit: l.unit, direction: l.direction, measureType: l.measureType, frequency: l.frequency, dataSource: l.dataSource },
    });
    library.set(l.name, item.id);
  }

  // Initiatives
  const project = new Map<string, string>();
  for (const i of ds.initiatives) {
    const p = await prisma.project.create({
      data: {
        focusAreaId: focus.get(i.focusArea) ?? null, name: i.name, description: i.description, ownerId: who(i.owner),
        startDate: d(i.start), endDate: d(i.end), budget: i.budget, currency: g.currency, region: i.region, status: i.status,
        tocInputs: i.toc.inputs, tocActivities: i.toc.activities, tocOutputs: i.toc.outputs, tocOutcomes: i.toc.outcomes, tocImpact: i.toc.impact,
      },
    });
    project.set(i.name, p.id);
  }

  // Metrics, then leading-indicator links once every metric exists
  const metric = new Map<string, string>();
  const key = (initiative: string, name: string) => `${initiative}|${name}`;
  for (const [i, m] of ds.metrics.entries()) {
    const p = await prisma.parameter.create({
      data: {
        projectId: project.get(m.initiative)!, name: m.name, definition: m.definition, level: m.level, unit: m.unit, direction: m.direction,
        measureType: m.measureType, baseline: m.baseline, target: m.target, targetDate: optDate(m.targetDate), frequency: m.frequency,
        dataSource: m.dataSource, isKey: m.isKey, audience: m.audience, libraryItemId: m.library ? library.get(m.library) ?? null : null, sortOrder: i,
      },
    });
    metric.set(key(m.initiative, m.name), p.id);
  }
  for (const m of ds.metrics) {
    if (m.leadingIndicatorFor) {
      await prisma.parameter.update({ where: { id: metric.get(key(m.initiative, m.name))! }, data: { leadingIndicatorForId: metric.get(key(m.initiative, m.leadingIndicatorFor)) } });
    }
  }
  await prisma.entry.createMany({
    data: ds.entries.map((e) => ({
      parameterId: metric.get(key(e.initiative, e.metric))!, date: d(e.date), value: e.value, confidence: e.confidence, note: e.note, loggedById: who(e.loggedBy),
    })),
  });

  // Campaigns and their results
  for (const c of ds.campaigns) {
    await prisma.campaign.create({
      data: {
        projectId: project.get(c.initiative)!, name: c.name, channel: c.channel, audience: c.audience, startDate: d(c.start), endDate: optDate(c.end),
        spend: c.spend, trackingTag: c.tag, notes: c.notes,
        metrics: {
          create: ds.campaignMetrics
            .filter((m) => m.initiative === c.initiative && m.campaign === c.name)
            .map((m) => ({ date: d(m.date), metric: m.metric, value: m.value })),
        },
      },
    });
  }

  // Evidence
  await prisma.evidence.createMany({
    data: ds.evidence.map((e) => ({
      projectId: project.get(e.initiative)!, parameterId: e.metric ? metric.get(key(e.initiative, e.metric)) ?? null : null, type: e.type, title: e.title,
      body: e.body, source: e.source, url: e.url, date: d(e.date), tags: e.tags, origin: e.origin || "human",
    })),
  });

  // Operations
  const lead = ds.people.find((p) => p.role === "admin")?.name;
  await prisma.spendEntry.createMany({
    data: ds.spend.map((s) => ({
      projectId: project.get(s.initiative)!, date: d(s.date), amount: s.amount, category: s.category, status: s.status, description: s.description,
      reference: s.reference, createdById: who(lead),
    })),
  });
  for (const r of ds.responsibilities) {
    await prisma.responsibility.create({
      data: {
        title: r.title, description: r.description, type: r.type, team: r.team, ownerId: who(r.owner), dueDate: d(r.dueDate), recurrence: r.recurrence,
        status: r.status, completedAt: optDate(r.completedAt), notes: r.notes, focusAreaId: focus.get(r.focusArea) ?? null, projectId: project.get(r.initiative) ?? null,
      },
    });
  }
  for (const r of ds.risks) {
    await prisma.risk.create({
      data: {
        title: r.title, description: r.description, likelihood: r.likelihood, impact: r.impact, mitigation: r.mitigation, status: r.status, ownerId: who(r.owner),
        reviewDate: optDate(r.reviewDate), focusAreaId: focus.get(r.focusArea) ?? null, projectId: project.get(r.initiative) ?? null,
      },
    });
  }
  await prisma.decision.createMany({
    data: ds.decisions.map((x) => ({
      date: d(x.date), title: x.title, decision: x.decision, rationale: x.rationale, madeBy: x.madeBy,
      focusAreaId: focus.get(x.focusArea) ?? null, projectId: project.get(x.initiative) ?? null,
    })),
  });

  // Snapshots, frozen from the data as it stood on each as-of date
  for (const [n, s] of ds.snapshots.entries()) {
    const projectId = project.get(s.initiative)!;
    const [p, parameters, campaigns, evidence] = await Promise.all([
      prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
      prisma.parameter.findMany({ where: { projectId, archivedAt: null }, include: { entries: true } }),
      prisma.campaign.findMany({ where: { projectId }, include: { metrics: true } }),
      prisma.evidence.findMany({ where: { projectId } }),
    ]);
    const payload = buildPayload({ project: p, parameters, campaigns, evidence }, new Date(`${s.asOf}T23:59:59.999Z`), { stakeholderSafe: true });
    const snap = await prisma.snapshot.create({
      data: { projectId, label: s.label, asOfDate: d(s.asOf), payload: JSON.stringify(payload), createdById: who(s.by), createdAt: s.frozenOn ? d(s.frozenOn) : undefined },
    });
    if (n === 0) {
      await prisma.shareLink.create({ data: { projectId, snapshotId: snap.id, view: "leadership", label: "Board pack, July", token: "example-q2-board-pack" } });
    }
  }

  console.log(
    `Loaded "${g.name}": ${ds.focusAreas.length} focus areas, ${ds.initiatives.length} initiatives, ${ds.metrics.length} metrics, ${ds.entries.length} entries. ` +
      `Sign in with any of ${ds.people.map((p) => p.email).join(", ")}; password: ${PASSWORD}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
