// Seed data: one realistic programme supporting local news organisations.
//
// By default this only loads the example into an EMPTY database, so it is
// safe to run on every deploy. `npm run db:seed` passes --reset, which wipes
// all data first and reloads the example.

import { PrismaClient } from "@prisma/client";
import { buildPayload } from "../src/lib/payload";

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
    prisma.shareLink.deleteMany(),
    prisma.snapshot.deleteMany(),
    prisma.evidence.deleteMany(),
    prisma.campaignMetric.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.entry.deleteMany(),
    prisma.parameter.deleteMany(),
    prisma.libraryParameter.deleteMany(),
    prisma.project.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const [lead, mel, comms] = await Promise.all([
    prisma.user.create({ data: { name: "Amira Okafor", email: "amira@example.org", role: "admin" } }),
    prisma.user.create({ data: { name: "Tom Reeves", email: "tom@example.org" } }),
    prisma.user.create({ data: { name: "Priya Shah", email: "priya@example.org" } }),
  ]);

  const project = await prisma.project.create({
    data: {
      name: "Local News Resilience Programme",
      description:
        "A 12-month programme helping independent local news organisations build digital audiences and sustainable revenue through training, a shared digital toolkit and small grants.",
      ownerId: lead.id,
      startDate: d("2026-03-01"),
      endDate: d("2027-02-28"),
      budget: 450000,
      currency: "GBP",
      region: "North of England",
      status: "active",
      tocInputs: "£450k grant fund; 3 programme staff; trainer network of 12 working journalists; shared analytics and CMS toolkit.",
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
      key: "grants", name: "Grant funding disbursed", level: "input", unit: "£", measureType: "cumulative",
      definition: "Grant payments released to participating newsrooms.", baseline: 0, target: 450000,
      frequency: "monthly", dataSource: "Finance system", confidence: "measured",
      values: [30000, 25000, 35000, 30000, 25000, 35000],
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
        body: "After the revenue cohort, the Tribune launched a £4/month membership with a members-only newsletter. 310 members joined in the first six weeks, covering one part-time reporter.",
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

  console.log(`Seeded "${project.name}" with ${params.length} parameters, ${campaigns.length} campaigns, 8 evidence items and a Q2 snapshot.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
