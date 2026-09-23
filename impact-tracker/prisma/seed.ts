// Seed data: one realistic programme supporting local news organisations.
//
// By default this only loads the example into an EMPTY database, so it is
// safe to run on every deploy. `npm run db:seed` passes --reset, which wipes
// all data first and reloads the example.

import { PrismaClient } from "@prisma/client";
import { buildPayload } from "../src/lib/payload";
import { hashPassword } from "../src/lib/passwords";

// Demo sign-in password for every seeded account. Override with SEED_PASSWORD.
const PASSWORD = process.env.SEED_PASSWORD || "demo-password-2026";

const prisma = new PrismaClient();
const d = (s: string) => new Date(`${s}T00:00:00Z`);
const MONTHS = ["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01"];

async function main() {
  const reset = process.argv.includes("--reset");
  if (!reset && (await prisma.project.count()) > 0) {
    console.log("Database already has projects; skipping the example data. Use `npm run db:seed` to wipe and reload it.");
    return;
  }
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

  const passwordHash = hashPassword(PASSWORD);
  const person = (name: string, email: string, role: string, team = "") => prisma.user.create({ data: { name, email, role, team, passwordHash } });
  const lead = await person("Amira Okafor", "lead@example.org", "admin");
  const mel = await person("Tom Reeves", "programme@example.org", "programme");
  const priya = await person("Priya Shah", "comms@example.org", "partner", "comms");
  const daniel = await person("Daniel Mensah", "gapp@example.org", "partner", "gapp");
  const sofia = await person("Sofia Lindqvist", "marketing@example.org", "partner", "marketing");

  const programme = await prisma.programme.create({
    data: {
      name: "Global News Programme",
      mission: "Help news organisations and the people who work with them build the skills, audiences and support that keep reliable journalism going.",
      description: "A global programme run with Comms, Government Affairs & Public Policy and Marketing. This year's focus is training, for newsrooms outside the organisation and for colleagues inside it.",
      currency: "USD",
      budget: 500000,
      startDate: d("2026-03-01"),
      endDate: d("2027-02-28"),
    },
  });
  const trainings = await prisma.focusArea.create({
    data: {
      programmeId: programme.id,
      name: "Trainings",
      description: "Skills training for journalists and newsrooms (external), and news-literacy training that turns colleagues into programme champions (internal).",
      ownerId: lead.id,
      budget: 500000,
    },
  });

  const project = await prisma.project.create({
    data: {
      focusAreaId: trainings.id,
      name: "Newsroom Digital Skills Training",
      description:
        "Training cohorts, a shared digital toolkit and small grants that help independent local newsrooms build digital audiences and sustainable revenue.",
      ownerId: lead.id,
      startDate: d("2026-03-01"),
      endDate: d("2027-02-28"),
      budget: 420000,
      currency: "USD",
      region: "UK & Ireland",
      status: "active",
      tocInputs: "$420k budget including a grant fund; 3 programme staff; trainer network of 12 working journalists; shared analytics and CMS toolkit.",
      tocActivities: "Monthly training cohorts on audience development and revenue; toolkit onboarding and support; small grants for pilots; peer-learning roadshow.",
      tocOutputs: "300 journalists trained; 40 newsrooms onboarded to the toolkit; 30 newsrooms using audience analytics every week.",
      tocOutcomes: "Newsrooms grow digital audiences, add new revenue streams, and staff apply new skills; local readers trust their local news more.",
      tocImpact: "More local news organisations are financially sustainable, so communities keep access to reliable local reporting.",
    },
  });

  // Library definitions, reused across projects.
  const lib = {
    trained: await prisma.libraryParameter.create({
      data: { name: "People trained", definition: "Unique people completing at least one full training session.", level: "output", unit: "people", measureType: "cumulative", frequency: "monthly", dataSource: "Attendance registers" },
    }),
    orgsOnboarded: await prisma.libraryParameter.create({
      data: { name: "Organisations onboarded", definition: "Organisations with an active account and a completed onboarding call.", level: "activity", unit: "organisations", measureType: "cumulative", frequency: "monthly", dataSource: "CRM" },
    }),
    trust: await prisma.libraryParameter.create({
      data: { name: "Audience trust score", definition: "Mean answer to 'How much do you trust this outlet?' on a 1-10 scale.", level: "outcome", unit: "score (1-10)", measureType: "point", frequency: "quarterly", dataSource: "Reader survey" },
    }),
    applying: await prisma.libraryParameter.create({
      data: { name: "Trainees applying new skills", definition: "Share of trainees who report using a technique from training in the last month, surveyed 8+ weeks after training.", level: "outcome", unit: "%", measureType: "point", frequency: "quarterly", dataSource: "Follow-up survey" },
    }),
  };

  type P = {
    key: string;
    name: string;
    definition: string;
    level: string;
    unit: string;
    measureType: "point" | "cumulative";
    direction?: string;
    baseline: number;
    target: number;
    targetDate?: string;
    frequency: string;
    dataSource: string;
    isKey?: boolean;
    libraryItemId?: string;
    leadFor?: string;
    confidence: string;
    values: (number | null)[]; // one per month in MONTHS, null = no entry
  };

  const params: P[] = [
    {
      key: "grants", name: "Training grants disbursed", level: "input", unit: "$", measureType: "cumulative",
      definition: "Grant payments released to participating newsrooms to cover training time and pilots.", baseline: 0, target: 300000,
      frequency: "monthly", dataSource: "Finance system", confidence: "measured",
      values: [20000, 17000, 23000, 20000, 17000, 23000],
    },
    {
      key: "sessions", name: "Training sessions delivered", level: "activity", unit: "sessions", measureType: "cumulative",
      definition: "Live training sessions (online or in person) of at least 90 minutes.", baseline: 0, target: 48,
      frequency: "monthly", dataSource: "Training calendar", confidence: "measured",
      values: [4, 4, 5, 5, 4, 5],
    },
    {
      key: "onboarded", name: "Newsrooms onboarded to digital toolkit", level: "activity", unit: "newsrooms", measureType: "cumulative",
      definition: "Newsrooms with an active toolkit account and a completed onboarding call.", baseline: 0, target: 40,
      frequency: "monthly", dataSource: "Toolkit CRM", confidence: "measured", libraryItemId: lib.orgsOnboarded.id,
      values: [3, 5, 6, 4, 5, 4],
    },
    {
      key: "trained", name: "Journalists trained", level: "output", unit: "people", measureType: "cumulative",
      definition: "Unique journalists completing at least one full training session.", baseline: 0, target: 300,
      frequency: "monthly", dataSource: "Attendance registers", confidence: "measured", isKey: true,
      libraryItemId: lib.trained.id, leadFor: "applying",
      values: [18, 22, 30, 28, 24, 26],
    },
    {
      key: "analytics", name: "Newsrooms using analytics weekly", level: "output", unit: "newsrooms", measureType: "point",
      definition: "Newsrooms that logged into the analytics dashboard in at least 3 of the last 4 weeks.", baseline: 0, target: 30,
      frequency: "monthly", dataSource: "Toolkit usage logs", confidence: "measured", leadFor: "audience",
      values: [2, 5, 8, 10, 11, 12],
    },
    {
      key: "audience", name: "Average monthly digital audience per newsroom", level: "outcome", unit: "unique visitors", measureType: "point",
      definition: "Median monthly unique visitors across participating newsrooms' websites.", baseline: 12000, target: 18000,
      frequency: "monthly", dataSource: "Web analytics (shared toolkit)", confidence: "estimated", isKey: true,
      values: [12100, 12400, 12900, 13100, 13300, 13500],
    },
    {
      key: "revenue", name: "Newsrooms with a new revenue stream", level: "outcome", unit: "%", measureType: "point",
      definition: "Share of participating newsrooms that launched a revenue stream (memberships, events, sponsorship) since joining.", baseline: 15, target: 50,
      frequency: "monthly", dataSource: "Monthly check-in form", confidence: "self-reported", leadFor: "sustainable",
      values: [15, 18, 22, 26, 30, 33],
    },
    {
      key: "applying", name: "Trainees applying new skills", level: "outcome", unit: "%", measureType: "point",
      definition: "Share of trainees who report using a technique from training in the last month, surveyed 8+ weeks after training.", baseline: 0, target: 70,
      frequency: "quarterly", dataSource: "Follow-up survey", confidence: "self-reported", libraryItemId: lib.applying.id,
      values: [null, null, 58, null, null, 64],
    },
    {
      key: "trust", name: "Reader trust score", level: "outcome", unit: "score (1-10)", measureType: "point",
      definition: "Mean answer to 'How much do you trust this outlet?' on a 1-10 scale, across participating newsrooms' reader surveys.", baseline: 6.2, target: 7.0,
      frequency: "quarterly", dataSource: "Reader survey", confidence: "self-reported", libraryItemId: lib.trust.id,
      values: [null, null, 6.4, null, null, 6.5],
    },
    {
      key: "sustainable", name: "Financially sustainable newsrooms", level: "impact", unit: "newsrooms", measureType: "point",
      definition: "Participating newsrooms whose revenue covers operating costs for 3 consecutive months.", baseline: 8, target: 20,
      frequency: "quarterly", dataSource: "Financial returns (modelled from partial data)", confidence: "modelled", isKey: true,
      values: [8, null, null, 10, null, 11],
    },
  ];

  const ids: Record<string, string> = {};
  for (const [i, p] of params.entries()) {
    const created = await prisma.parameter.create({
      data: {
        projectId: project.id,
        name: p.name,
        definition: p.definition,
        level: p.level,
        unit: p.unit,
        direction: p.direction ?? "increase",
        measureType: p.measureType,
        baseline: p.baseline,
        target: p.target,
        targetDate: p.targetDate ? d(p.targetDate) : null,
        frequency: p.frequency,
        dataSource: p.dataSource,
        isKey: p.isKey ?? false,
        libraryItemId: p.libraryItemId,
        sortOrder: i,
      },
    });
    ids[p.key] = created.id;
    const entries = p.values.flatMap((value, m) =>
      value === null
        ? []
        : [{
            parameterId: created.id,
            date: d(MONTHS[m]),
            value,
            confidence: p.confidence,
            loggedById: m % 2 ? mel.id : lead.id,
            note: "",
          }],
    );
    await prisma.entry.createMany({ data: entries });
  }
  for (const p of params) {
    if (p.leadFor) {
      await prisma.parameter.update({ where: { id: ids[p.key] }, data: { leadingIndicatorForId: ids[p.leadFor] } });
    }
  }
  await prisma.entry.update({
    where: { parameterId_date: { parameterId: ids.audience, date: d("2026-06-01") } },
    data: { note: "Jump partly from the YouTube series driving traffic to partner sites." },
  });
  await prisma.entry.update({
    where: { parameterId_date: { parameterId: ids.sustainable, date: d("2026-09-01") } },
    data: { note: "Modelled from 14 of 22 newsrooms' returns; remainder due in October." },
  });

  // Campaigns with monthly metrics.
  const campaigns: {
    name: string; channel: string; startDate: string; endDate: string; spend: number;
    trackingTag: string; notes: string; metrics: Record<string, Record<string, number>>;
  }[] = [
    {
      name: "Local News Matters (YouTube series)", channel: "youtube", startDate: "2026-04-15", endDate: "2026-06-30",
      spend: 12000, trackingTag: "utm_campaign=lnm_youtube_2026",
      notes: "Six short documentaries on local newsrooms, each linking to the featured outlet.",
      metrics: {
        "2026-04-01": { impressions: 85000, views: 21000, clicks: 1400, "sign-ups": 90 },
        "2026-05-01": { impressions: 160000, views: 46000, clicks: 3100, "sign-ups": 240 },
        "2026-06-01": { impressions: 140000, views: 39000, clicks: 2700, "sign-ups": 210 },
      },
    },
    {
      name: "Toolkit launch email series", channel: "email", startDate: "2026-05-01", endDate: "2026-05-31",
      spend: 1500, trackingTag: "utm_campaign=toolkit_launch",
      notes: "Four-email sequence to 2,300 local editors and publishers.",
      metrics: { "2026-05-01": { sent: 9200, opens: 3900, clicks: 620, "sign-ups": 41 } },
    },
    {
      name: "Newsroom Futures roadshow", channel: "events", startDate: "2026-07-01", endDate: "2026-08-31",
      spend: 18000, trackingTag: "EVT-NF26",
      notes: "Five regional half-day events with peer case studies and toolkit demos.",
      metrics: {
        "2026-07-01": { attendees: 140, "sign-ups": 18 },
        "2026-08-01": { attendees: 165, "sign-ups": 23 },
      },
    },
  ];
  for (const c of campaigns) {
    await prisma.campaign.create({
      data: {
        projectId: project.id,
        name: c.name,
        channel: c.channel,
        startDate: d(c.startDate),
        endDate: d(c.endDate),
        spend: c.spend,
        trackingTag: c.trackingTag,
        notes: c.notes,
        metrics: {
          create: Object.entries(c.metrics).flatMap(([date, values]) =>
            Object.entries(values).map(([metric, value]) => ({ date: d(date), metric, value })),
          ),
        },
      },
    });
  }

  // Evidence.
  await prisma.evidence.createMany({
    data: [
      {
        projectId: project.id, parameterId: ids.audience, type: "quote", date: d("2026-06-18"),
        title: "Editor on the analytics dashboard",
        body: "For the first time we can see which stories people actually finish. We've moved our council coverage to the morning slot and it's our most-read section now.",
        source: "Editor, Calder Valley Voice", tags: "analytics,audience",
      },
      {
        projectId: project.id, parameterId: ids.revenue, type: "case-study", date: d("2026-08-05"),
        title: "Tyneside Tribune launches a membership scheme",
        body: "After the revenue cohort, the Tribune launched a $5/month membership with a members-only newsletter. 310 members joined in the first six weeks, covering one part-time reporter.",
        source: "Programme case study", tags: "revenue,membership",
      },
      {
        projectId: project.id, parameterId: ids.applying, type: "survey", date: d("2026-09-10"),
        title: "Follow-up survey, cohort 1-3 (n=112)",
        body: "64% say they used a technique from training in the last month. Most cited: headline testing (41%), newsletter segmentation (29%), audience surveys (18%).",
        source: "Follow-up survey, September", tags: "skills,survey",
      },
      {
        projectId: project.id, parameterId: ids.applying, type: "quote", date: d("2026-06-30"),
        title: "Trainee on newsletter skills",
        body: "I rebuilt our newsletter the week after the session. Open rates went from 22% to 38%.",
        source: "Reporter, Wharfedale Weekly", tags: "skills,newsletter",
      },
      {
        projectId: project.id, parameterId: ids.trust, type: "quote", date: d("2026-09-02"),
        title: "Reader survey comment",
        body: "They actually come to the meetings now and explain what the decisions mean for us. That's why I read them.",
        source: "Reader, Hebden Bridge", tags: "trust,readers",
      },
      {
        projectId: project.id, parameterId: ids.sustainable, type: "quote", date: d("2026-09-15"),
        title: "Publisher on sustainability",
        body: "We're closer, but one big advertiser leaving would still put us back in the red. The grant bought us time to diversify.",
        source: "Publisher, Morecambe Bay News", tags: "sustainability,risk",
      },
      {
        projectId: project.id, type: "link", date: d("2026-07-22"),
        title: "Regional press coverage of the roadshow",
        body: "Article on the Newsroom Futures roadshow and the programme's aims.",
        source: "Regional business press", url: "https://example.org/press/newsroom-futures", tags: "press",
      },
    ],
  });

  // An AI-drafted theme summary awaiting review: visible (labelled) to the
  // project lead, hidden from stakeholder views until someone approves it.
  await prisma.evidence.create({
    data: {
      projectId: project.id, parameterId: ids.revenue, type: "survey", date: d("2026-09-12"), origin: "ai",
      title: "Theme: memberships are the most common new revenue stream",
      body: "Across 38 check-in responses, memberships (14) and local events (9) were the most-cited new revenue streams. Sentiment is mostly positive, with concern about sustaining member numbers after launch.",
      source: "AI theme coding of monthly check-in forms", tags: "revenue,theme",
    },
  });

  // A frozen Q2 snapshot, built from the data as it stood on 30 June.
  const full = {
    project,
    parameters: await prisma.parameter.findMany({ where: { projectId: project.id, archivedAt: null }, include: { entries: true } }),
    campaigns: await prisma.campaign.findMany({ where: { projectId: project.id }, include: { metrics: true } }),
    evidence: await prisma.evidence.findMany({ where: { projectId: project.id } }),
  };
  const q2 = await prisma.snapshot.create({
    data: {
      projectId: project.id,
      label: "Q2 2026 as reported to the board",
      asOfDate: d("2026-06-30"),
      payload: JSON.stringify(buildPayload(full, new Date("2026-06-30T23:59:59.999Z"), { stakeholderSafe: true })),
      createdById: lead.id,
    },
  });
  await prisma.shareLink.create({
    data: { projectId: project.id, snapshotId: q2.id, view: "leadership", label: "Board pack, July", token: "example-q2-board-pack" },
  });

  // Second initiative: internal audience (colleagues across the organisation).
  const internal = await prisma.project.create({
    data: {
      focusAreaId: trainings.id,
      name: "Newsroom Champions (internal)",
      description: "News-literacy sessions for colleagues, and a champions network who explain the programme and use its stories in their own teams.",
      ownerId: mel.id,
      startDate: d("2026-03-01"),
      endDate: d("2027-02-28"),
      budget: 60000,
      currency: "USD",
      region: "Global",
      status: "active",
      tocInputs: "$60k; 1 programme lead; content from the external training; support from Comms and Marketing.",
      tocActivities: "Monthly news-literacy sessions; a champions certification; an internal case-study pack.",
      tocOutputs: "400 colleagues trained; 40 certified champions.",
      tocOutcomes: "Colleagues can explain the programme confidently and use its stories with partners and policymakers.",
      tocImpact: "The organisation speaks about news and journalism with one informed voice.",
    },
  });
  const internalParams = [
    { name: "Colleagues completing news-literacy training", level: "output", unit: "people", measureType: "cumulative", target: 400, isKey: true, values: [30, 45, 40, 25, 20, 35], confidence: "measured", dataSource: "Learning platform" },
    { name: "Certified internal champions", level: "output", unit: "champions", measureType: "cumulative", target: 40, values: [0, 4, 3, 2, 1, 3], confidence: "measured", dataSource: "Champions register", key: "champions" },
    { name: "Colleagues confident explaining the programme", level: "outcome", unit: "%", measureType: "point", baseline: 35, target: 70, isKey: true, values: [null, null, 41, null, null, 44], confidence: "self-reported", dataSource: "Quarterly pulse survey", frequency: "quarterly", key: "confidence" },
    { name: "Teams using programme case studies", level: "outcome", unit: "teams", measureType: "point", target: 15, values: [1, 2, 4, 5, 7, 9], confidence: "measured", dataSource: "Comms request log" },
  ];
  const internalIds: Record<string, string> = {};
  for (const [i, ip] of internalParams.entries()) {
    const created = await prisma.parameter.create({
      data: {
        projectId: internal.id, name: ip.name, level: ip.level, unit: ip.unit, measureType: ip.measureType,
        baseline: ip.baseline ?? 0, target: ip.target, isKey: ip.isKey ?? false, audience: "internal",
        frequency: ip.frequency ?? "monthly", dataSource: ip.dataSource, sortOrder: i,
      },
    });
    if (ip.key) internalIds[ip.key] = created.id;
    await prisma.entry.createMany({
      data: ip.values.flatMap((value, m) =>
        value === null ? [] : [{ parameterId: created.id, date: d(MONTHS[m]), value, confidence: ip.confidence, loggedById: mel.id }],
      ),
    });
  }
  // Champions are the leading indicator for colleague confidence.
  await prisma.parameter.update({ where: { id: internalIds.champions }, data: { leadingIndicatorForId: internalIds.confidence } });
  await prisma.campaign.create({
    data: {
      projectId: internal.id, name: "Internal launch: town hall and newsletter", channel: "events", audience: "internal",
      startDate: d("2026-04-20"), endDate: d("2026-05-15"), spend: 3500, trackingTag: "INT-LAUNCH-26",
      notes: "Global town hall with the Comms team, followed by a four-part internal newsletter.",
      metrics: { create: [
        { date: d("2026-04-01"), metric: "attendees", value: 620 },
        { date: d("2026-05-01"), metric: "opens", value: 4100 },
        { date: d("2026-05-01"), metric: "sign-ups", value: 85 },
      ] },
    },
  });
  await prisma.evidence.create({
    data: {
      projectId: internal.id, parameterId: internalIds.confidence, type: "quote", date: d("2026-09-08"),
      title: "Policy colleague on the champions session",
      body: "I used the local newsroom examples in a meeting with a ministry team the following week. Having real numbers made the conversation much easier.",
      source: "Champion, Government Affairs & Public Policy", tags: "gapp,champions",
    },
  });

  // Operations: spend, responsibilities, risks and decisions.
  const month = (m: string) => d(`2026-${m}-28`);
  const spendRows: { projectId: string; date: Date; amount: number; category: string; status?: string; description: string; reference?: string }[] = [];
  const months = ["03", "04", "05", "06", "07", "08", "09"];
  months.forEach((m, i) => {
    spendRows.push({ projectId: project.id, date: month(m), amount: 10000, category: "staff", description: "Programme staff and trainers", reference: `PAY-${m}` });
    spendRows.push({ projectId: internal.id, date: month(m), amount: 2000, category: "staff", description: "Session facilitation" });
    if (i > 0) spendRows.push({ projectId: project.id, date: month(m), amount: [20000, 17000, 23000, 20000, 17000, 23000][i - 1], category: "grants", description: "Newsroom training grants", reference: `GR-${m}` });
  });
  spendRows.push(
    { projectId: project.id, date: d("2026-06-30"), amount: 12000, category: "marketing", description: "Local News Matters YouTube series production", reference: "PO-4410" },
    { projectId: project.id, date: d("2026-05-31"), amount: 1500, category: "marketing", description: "Toolkit launch email series" },
    { projectId: project.id, date: d("2026-07-31"), amount: 9000, category: "events", description: "Newsroom Futures roadshow: venues and catering (July)" },
    { projectId: project.id, date: d("2026-08-31"), amount: 9000, category: "events", description: "Newsroom Futures roadshow: venues and catering (August)" },
    { projectId: project.id, date: d("2026-04-15"), amount: 24000, category: "vendors", description: "Analytics and CMS toolkit licence (annual)", reference: "PO-4102" },
    { projectId: project.id, date: d("2026-06-15"), amount: 6000, category: "travel", description: "Trainer travel, cohorts 1-3" },
    { projectId: project.id, date: d("2026-10-20"), amount: 15000, category: "events", status: "committed", description: "Cohort 7 venue booking", reference: "PO-5530" },
    { projectId: project.id, date: d("2026-11-01"), amount: 10000, category: "vendors", status: "committed", description: "Toolkit support contract (Q4)", reference: "PO-5541" },
    { projectId: internal.id, date: d("2026-04-30"), amount: 3500, category: "events", description: "Internal launch town hall" },
    { projectId: internal.id, date: d("2026-06-30"), amount: 1000, category: "other", description: "Champions certificates and materials" },
  );
  await prisma.spendEntry.createMany({ data: spendRows.map((r) => ({ ...r, status: r.status ?? "actual", reference: r.reference ?? "", createdById: lead.id })) });

  const resp = (x: { title: string; type: string; team: string; ownerId: string; dueDate: string; recurrence?: string; status?: string; projectId?: string; description?: string; completedAt?: string }) =>
    prisma.responsibility.create({
      data: {
        title: x.title, type: x.type, team: x.team, ownerId: x.ownerId, dueDate: d(x.dueDate), recurrence: x.recurrence ?? "none",
        status: x.status ?? "open", projectId: x.projectId ?? null, focusAreaId: trainings.id, description: x.description ?? "",
        completedAt: x.completedAt ? d(x.completedAt) : null,
      },
    });
  await resp({ title: "Q2 report to funders", type: "report", team: "programme", ownerId: mel.id, dueDate: "2026-07-15", recurrence: "quarterly", status: "done", completedAt: "2026-07-14" });
  await resp({ title: "Q3 report to funders", type: "report", team: "programme", ownerId: mel.id, dueDate: "2026-10-15", recurrence: "quarterly", description: "Progress against targets, spend and case studies. Use the Q3 snapshot." });
  await resp({ title: "Approve monthly expenses", type: "approval", team: "programme", ownerId: lead.id, dueDate: "2026-09-30", recurrence: "monthly" });
  await resp({ title: "Renew analytics toolkit vendor contract", type: "contract", team: "programme", ownerId: lead.id, dueDate: "2026-09-20", status: "in-progress", projectId: project.id, description: "Current licence ends in October. Vendor has proposed a 12% increase." });
  await resp({ title: "Grant agreements for cohort 4 newsrooms", type: "contract", team: "programme", ownerId: mel.id, dueDate: "2026-10-31", projectId: project.id });
  await resp({ title: "Safeguarding and data protection review", type: "compliance", team: "programme", ownerId: lead.id, dueDate: "2026-11-30", recurrence: "annually" });
  await resp({ title: "Policy briefing: local news and democracy", type: "report", team: "gapp", ownerId: daniel.id, dueDate: "2026-10-02", status: "in-progress", description: "Briefing for the ministry roundtable, using headline figures and newsroom case studies." });
  await resp({ title: "Impact figures for the corporate annual report", type: "report", team: "comms", ownerId: priya.id, dueDate: "2026-09-15", description: "Five headline stats and two case studies, cleared for external use." });
  await resp({ title: "Q4 recruitment plan for training cohorts", type: "admin", team: "marketing", ownerId: sofia.id, dueDate: "2026-10-10", projectId: project.id });
  await resp({ title: "Sign off champions certification", type: "approval", team: "programme", ownerId: mel.id, dueDate: "2026-09-26", projectId: internal.id });

  const risk = (x: { title: string; l: number; i: number; ownerId: string; mitigation: string; review?: string; status?: string; projectId?: string; description?: string }) =>
    prisma.risk.create({
      data: {
        title: x.title, likelihood: x.l, impact: x.i, ownerId: x.ownerId, mitigation: x.mitigation, reviewDate: x.review ? d(x.review) : null,
        status: x.status ?? "open", projectId: x.projectId ?? null, focusAreaId: trainings.id, description: x.description ?? "",
      },
    });
  await risk({ title: "Digital audience growth misses target", l: 4, i: 4, ownerId: mel.id, projectId: project.id, review: "2026-10-01", description: "Audience growth is off track and its leading indicator (weekly analytics use) is behind.", mitigation: "One-to-one analytics coaching for the 18 newsrooms not yet using the dashboard weekly." });
  await risk({ title: "Partner newsrooms drop out before cohort 4", l: 3, i: 4, ownerId: mel.id, projectId: project.id, review: "2026-10-15", mitigation: "Monthly check-ins; grant tranches tied to attendance; peer mentoring pairs." });
  await risk({ title: "Toolkit vendor price rise at renewal", l: 4, i: 3, ownerId: lead.id, projectId: project.id, review: "2026-09-15", mitigation: "Negotiate a two-year rate; price an alternative supplier by end of September." });
  await risk({ title: "Data protection issue with shared newsroom analytics", l: 2, i: 5, ownerId: lead.id, status: "mitigating", review: "2026-11-30", mitigation: "Data processing agreements signed with all newsrooms; access reviewed quarterly." });
  await risk({ title: "Internal budget underspent and returned at year end", l: 3, i: 2, ownerId: lead.id, projectId: internal.id, review: "2026-10-31", mitigation: "Extend champions sessions to regional offices from October." });
  await risk({ title: "Ministry roundtable postponed", l: 2, i: 3, ownerId: daniel.id, review: "2026-10-01", mitigation: "Prepare a written briefing that can be sent if the meeting slips." });

  const decision = (x: { date: string; title: string; decision: string; rationale: string; madeBy: string; projectId?: string }) =>
    prisma.decision.create({ data: { ...x, date: d(x.date), focusAreaId: trainings.id, projectId: x.projectId ?? null } });
  await decision({ date: "2026-05-12", title: "Move revenue training earlier in each cohort", decision: "Revenue sessions move from week 6 to week 2.", rationale: "Early cohorts said they needed revenue ideas before planning audience work.", madeBy: "Programme board", projectId: project.id });
  await decision({ date: "2026-06-20", title: "Fund a memberships pilot", decision: "Up to $15k of grant budget goes to five newsrooms piloting memberships.", rationale: "Memberships were the most common new revenue stream; a pilot tests whether support speeds it up.", madeBy: "Amira Okafor (Global lead)", projectId: project.id });
  await decision({ date: "2026-07-08", title: "Report Q2 from a frozen snapshot", decision: "Board and funder reports use the Q2 snapshot, not live figures.", rationale: "Figures shared with the board shouldn't change when late data arrives.", madeBy: "Programme board" });
  await decision({ date: "2026-09-10", title: "Extend champions sessions to regional offices", decision: "Run champions sessions in four regional offices from October.", rationale: "Internal spend is well behind the timeline and demand from regional teams is high.", madeBy: "Amira Okafor (Global lead)", projectId: internal.id });

  console.log(`Seeded "${project.name}" in focus area "${trainings.name}", plus the internal initiative "${internal.name}". Sign in with any @example.org demo account; password: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
