"""Builds the sample dataset for the Global News Programme.

Writes sample-data/sample-data.json, which the database seed (prisma/seed.ts)
and the in-browser demo both load. The Excel template is built from the same
data by build_template.py.

Everything is referenced by name (focus area, initiative, metric), exactly
like the rows of the Excel template, so a filled-in workbook and this file
have the same shape.

Run:  python3 sample-data/build_sample_data.py
"""

import copy
import json
from pathlib import Path

from trainings_block import TRAININGS

HERE = Path(__file__).parent
MONTHS = ["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01"]
SPEND_MONTHS = ["03", "04", "05", "06", "07", "08", "09"]

ds = copy.deepcopy(TRAININGS)
ds["programme"]["demoDate"] = "2026-09-23"  # the demo's "today", so the sample reads as current
ds["programme"]["description"] = (
    "A global programme run with Comms, Government Affairs & Public Policy and Marketing, across five focus areas: "
    "trainings, product and technology partnerships, research, events, and policy and public affairs."
)

# ---------------------------------------------------------------------------
# Trainings: rescale to its share of the $500k programme budget.

DIGITAL, CHAMPIONS = "Newsroom Digital Skills Training", "Newsroom Champions (internal)"
BUDGETS = {DIGITAL: 190000, CHAMPIONS: 40000}
GRANT_SCALE, DIGITAL_SCALE, CHAMPIONS_SCALE = 0.4, 0.5, 0.6


def r100(x):
    return round(x / 100) * 100


for i in ds["initiatives"]:
    i["budget"] = BUDGETS[i["name"]]
    i["toc"]["inputs"] = i["toc"]["inputs"].replace("$420k", "$190k").replace("$60k", "$40k")
for m in ds["metrics"]:
    if m["name"] == "Training grants disbursed":
        m["target"] = 120000
for e in ds["entries"]:
    if e["metric"] == "Training grants disbursed":
        e["value"] = r100(e["value"] * GRANT_SCALE)
for s in ds["spend"]:
    if s["initiative"] == CHAMPIONS:
        s["amount"] = r100(s["amount"] * CHAMPIONS_SCALE)
    elif s["category"] == "grants":
        s["amount"] = r100(s["amount"] * GRANT_SCALE)
    else:
        s["amount"] = r100(s["amount"] * DIGITAL_SCALE)
for c in ds["campaigns"]:
    c["spend"] = r100(c["spend"] * (CHAMPIONS_SCALE if c["initiative"] == CHAMPIONS else DIGITAL_SCALE))
for d in ds["decisions"]:
    d["decision"] = d["decision"].replace("Up to $15k", "Up to $8k")
ds["focusAreas"] = [{"name": "Trainings", "description": ds["focusAreas"][0]["description"], "owner": "Nadia Hassan", "budget": 230000}]

# ---------------------------------------------------------------------------
# Helpers for the new focus areas.


def focus_area(name, owner, budget, description):
    ds["focusAreas"].append({"name": name, "description": description, "owner": owner, "budget": budget})


def initiative(name, focus, owner, budget, audience_region, description, toc):
    ds["initiatives"].append({
        "name": name, "description": description, "owner": owner, "start": "2026-03-01", "end": "2027-02-28",
        "budget": budget, "region": audience_region, "status": "active", "focusArea": focus,
        "toc": dict(zip(["inputs", "activities", "outputs", "outcomes", "impact"], toc)),
    })


def metric(ini, name, level, unit, measure, baseline, target, values, confidence, audience, definition, source,
           key=False, lead="", frequency=None, logged_by="Tom Reeves", notes=None):
    ds["metrics"].append({
        "initiative": ini, "name": name, "definition": definition, "level": level, "unit": unit, "direction": "increase",
        "measureType": measure, "baseline": baseline, "target": target, "targetDate": "", "frequency": frequency or "monthly",
        "dataSource": source, "isKey": key, "audience": audience, "leadingIndicatorFor": lead, "library": "",
    })
    for i, v in enumerate(values):
        if v is None:
            continue
        ds["entries"].append({
            "initiative": ini, "metric": name, "date": MONTHS[i], "value": v, "confidence": confidence,
            "note": (notes or {}).get(i, ""), "loggedBy": logged_by,
        })


def spend(ini, lines):
    """lines: (month 'MM' or full date, amount, category, description, status='actual')"""
    for line in lines:
        when, amount, category, description, *rest = line
        date = when if "-" in when else f"2026-{when}-28"
        ds["spend"].append({"initiative": ini, "date": date, "amount": amount, "category": category,
                            "status": rest[0] if rest else "actual", "description": description, "reference": ""})


def monthly(ini, amount, category, description, months=SPEND_MONTHS):
    spend(ini, [(m, amount, category, description) for m in months])


def campaign(ini, name, channel, audience, start, end, cost, tag, notes, metrics):
    ds["campaigns"].append({"initiative": ini, "name": name, "channel": channel, "audience": audience, "start": start,
                            "end": end, "spend": cost, "tag": tag, "notes": notes})
    for date, values in metrics.items():
        for k, v in values.items():
            ds["campaignMetrics"].append({"initiative": ini, "campaign": name, "date": date, "metric": k, "value": v})


def evidence(ini, metric_name, kind, date, title, body, source, tags, url="", origin="human"):
    ds["evidence"].append({"initiative": ini, "metric": metric_name, "type": kind, "title": title, "body": body,
                           "source": source, "url": url, "date": date, "tags": tags, "origin": origin})


def responsibility(title, kind, team, owner, due, focus, ini="", recurrence="none", status="open", description="", completed=""):
    ds["responsibilities"].append({"title": title, "description": description, "type": kind, "team": team, "owner": owner,
                                   "dueDate": due, "recurrence": recurrence, "status": status, "completedAt": completed,
                                   "notes": "", "focusArea": focus, "initiative": ini})


def risk(title, likelihood, impact, owner, focus, mitigation, review, ini="", status="open", description=""):
    ds["risks"].append({"title": title, "description": description, "likelihood": likelihood, "impact": impact,
                        "mitigation": mitigation, "status": status, "owner": owner, "reviewDate": review,
                        "focusArea": focus, "initiative": ini})


def decision(date, title, text, rationale, made_by, focus, ini=""):
    ds["decisions"].append({"date": date, "title": title, "decision": text, "rationale": rationale, "madeBy": made_by,
                            "focusArea": focus, "initiative": ini})


# ---------------------------------------------------------------------------
# Product & Technology Partnerships

PT = "Product & Technology Partnerships"
focus_area(PT, "Tom Reeves", 110000,
           "Free and discounted newsroom tools from product partners, and a feedback loop so product teams build what newsrooms need.")

TOOLS = "Newsroom Tools Partnership"
initiative(TOOLS, PT, "Tom Reeves", 80000, "Global",
           "Onboards newsrooms to partner publishing, transcription and analytics tools, with training and support.",
           ["$80k; partner tools at no cost to newsrooms; 1 partnerships manager; support desk.",
            "Newsroom onboarding; monthly tool clinics; integration support.",
            "60 partner newsrooms live; 6,000 stories published with the tools.",
            "Journalists save time on routine tasks and use the tools every week.",
            "Newsrooms spend more time on original reporting."])
metric(TOOLS, "Partner newsrooms live on the tools", "output", "newsrooms", "point", 0, 60, [6, 12, 19, 24, 29, 33], "measured", "external",
       "Newsrooms with at least one partner tool in weekly use.", "Partner dashboards", key=True)
metric(TOOLS, "Weekly active journalists on the tools", "outcome", "journalists", "point", 0, 900, [80, 160, 240, 300, 350, 390], "measured", "external",
       "Unique journalists using a partner tool in the last 7 days.", "Partner analytics", lead="Partner satisfaction (NPS)")
metric(TOOLS, "Minutes saved per story", "outcome", "minutes", "point", 0, 20, [None, None, 9, None, None, 12], "self-reported", "external",
       "Average time saved on transcription and publishing per story, from the quarterly user survey.", "User survey", frequency="quarterly")
metric(TOOLS, "Stories published with partner tools", "output", "stories", "cumulative", 0, 6000, [300, 450, 600, 700, 750, 800], "measured", "external",
       "Stories published through partner publishing tools.", "Partner analytics")
metric(TOOLS, "Partner satisfaction (NPS)", "outcome", "NPS", "point", 20, 50, [None, None, 26, None, None, 31], "self-reported", "external",
       "Net Promoter Score from newsroom users of partner tools.", "User survey", key=True, frequency="quarterly")
campaign(TOOLS, "Tools launch webinar series", "events", "external", "2026-06-01", "2026-07-31", 3000, "WEB-TOOLS-26",
         "Four webinars demonstrating partner tools to newsroom leaders.",
         {"2026-06-01": {"attendees": 210, "sign-ups": 28}, "2026-07-01": {"attendees": 180, "sign-ups": 22}})
evidence(TOOLS, "Minutes saved per story", "quote", "2026-07-10", "Reporter on automated transcription",
         "Transcribing a council meeting used to take me an evening. Now I have a draft in twenty minutes and spend the time chasing the story.",
         "Reporter, Coastal Courier", "tools,time-saved")
evidence(TOOLS, "Partner satisfaction (NPS)", "survey", "2026-09-05", "Q3 user survey (n=146)",
         "NPS rose from 26 to 31. Most common complaint: the analytics tool's setup takes too long without support.",
         "User survey, September", "survey,nps")
spend(TOOLS, [("04", 12000, "vendors", "Integration work, phase 1"), ("06", 8000, "vendors", "Integration work, phase 2"),
              ("06", 3000, "events", "Tools launch webinars"), ("2026-11-15", 8000, "vendors", "Integration work, phase 3", "committed")])
monthly(TOOLS, 3000, "staff", "Partnerships manager (part)")

FEEDBACK = "Product Feedback Loop (internal)"
initiative(FEEDBACK, PT, "Tom Reeves", 30000, "Global",
           "Brings newsroom feedback to internal product teams, so tools are built around real newsroom needs.",
           ["$30k; programme staff time; access to product teams.",
            "Monthly feedback sessions; a shared insights log; newsroom visits for product staff.",
            "24 feedback sessions held.",
            "Product teams use newsroom insights in planning and ship requested features.",
            "The organisation's products serve news organisations better."])
metric(FEEDBACK, "Newsroom feedback sessions with product teams", "activity", "sessions", "cumulative", 0, 24, [1, 2, 2, 2, 2, 2], "measured", "internal",
       "Structured sessions where newsroom users meet product teams.", "Programme log")
metric(FEEDBACK, "Product teams using newsroom insights", "outcome", "teams", "point", 0, 12, [1, 2, 3, 4, 5, 5], "measured", "internal",
       "Product teams that cite programme insights in their quarterly plans.", "Product planning docs", key=True)
metric(FEEDBACK, "Newsroom-requested features shipped", "output", "features", "cumulative", 0, 10, [0, 1, 0, 1, 1, 1], "measured", "internal",
       "Features shipped that trace back to a newsroom request in the insights log.", "Insights log")
spend(FEEDBACK, [("05", 1500, "travel", "Product team newsroom visits"), ("08", 1500, "travel", "Product team newsroom visits")])
monthly(FEEDBACK, 850, "staff", "Session facilitation", SPEND_MONTHS[1:])

# ---------------------------------------------------------------------------
# Research & Insights

RI = "Research & Insights"
focus_area(RI, "Tom Reeves", 60000, "Evidence on local news audiences and business models, for newsrooms, policymakers and internal teams.")
STUDY = "Local News Audience Study"
initiative(STUDY, RI, "Tom Reeves", 60000, "Global",
           "A large survey of local news audiences, published as short briefs and a full report.",
           ["$60k; survey panel; 1 researcher; academic adviser.",
            "Fieldwork in 6 countries; analysis; briefs and report.",
            "5,000 survey responses; 6 research briefs.",
            "Findings are cited by policymakers and press, and used by internal teams.",
            "Decisions about local news are based on evidence."])
metric(STUDY, "Survey responses collected", "activity", "responses", "cumulative", 0, 5000, [400, 700, 900, 800, 600, 500], "measured", "both",
       "Completed responses meeting quality checks.", "Survey panel")
metric(STUDY, "Research briefs published", "output", "briefs", "cumulative", 0, 6, [0, 0, 1, 0, 1, 1], "measured", "both",
       "Short briefs published on the programme website.", "Website")
metric(STUDY, "Report downloads", "output", "downloads", "cumulative", 0, 4000, [0, 0, 300, 250, 200, 150], "measured", "external",
       "Downloads of briefs and the full report.", "Website analytics", lead="Citations in policy papers and press")
metric(STUDY, "Citations in policy papers and press", "outcome", "citations", "cumulative", 0, 25, [0, 0, 1, 2, 3, 3], "measured", "external",
       "Policy documents and press articles citing the study.", "Media and policy monitoring", key=True)
metric(STUDY, "Internal teams using the findings", "outcome", "teams", "point", 0, 10, [0, 0, 2, 3, 5, 6], "self-reported", "internal",
       "Internal teams that used a finding in a plan, pitch or briefing.", "Internal survey", key=True)
evidence(STUDY, "Citations in policy papers and press", "link", "2026-08-20", "Study cited in national press",
         "Coverage of brief 2 (who pays for local news) in a national newspaper's media section.", "National press",
         "press,citation", url="https://example.org/press/local-news-study")
evidence(STUDY, "Survey responses collected", "survey", "2026-07-30", "Headline finding from brief 2",
         "62% of local news readers would pay something for local news, but only 14% currently do. Price sensitivity is highest under 35.",
         "Local News Audience Study, brief 2", "survey,revenue")
spend(STUDY, [("04", 9000, "vendors", "Survey panel, wave 1"), ("06", 9000, "vendors", "Survey panel, wave 2"), ("08", 6000, "vendors", "Survey panel, wave 3"),
              ("07", 1000, "other", "Translation")])
monthly(STUDY, 1800, "staff", "Researcher (part)", SPEND_MONTHS[:6])
spend(STUDY, [("09", 2200, "staff", "Researcher (part)")])

# ---------------------------------------------------------------------------
# Events & Convenings

EV = "Events & Convenings"
focus_area(EV, "Nadia Hassan", 70000, "The flagship summit for newsroom leaders, and internal events that keep colleagues close to the programme.")
SUMMIT = "Global News Summit 2026"
initiative(SUMMIT, EV, "Nadia Hassan", 55000, "Global (in person and online)",
           "Two-day summit in November for newsroom leaders, partners and policymakers.",
           ["$55k; venue partner; sponsors; programme and Marketing staff.",
            "Programme design; speaker and sponsor outreach; registration campaign.",
            "800 registrations; 40 speakers.",
            "Attendees rate it highly and start partnerships afterwards.",
            "A stronger network of organisations supporting local news."])
metric(SUMMIT, "Summit registrations", "output", "registrations", "cumulative", 0, 800, [0, 0, 40, 90, 150, 160], "measured", "external",
       "Confirmed registrations (in person and online).", "Registration platform", key=True, logged_by="Sofia Lindqvist")
metric(SUMMIT, "Speakers confirmed", "activity", "speakers", "cumulative", 0, 40, [0, 5, 8, 6, 4, 3], "measured", "external",
       "Speakers with signed confirmations.", "Programme plan")
metric(SUMMIT, "Sponsor and partner commitments", "input", "sponsors", "cumulative", 0, 12, [0, 1, 1, 1, 1, 1], "measured", "external",
       "Signed sponsorship or in-kind partner agreements.", "Partnership agreements")
metric(SUMMIT, "Partnerships started after events", "outcome", "partnerships", "cumulative", 0, 30, [0, 0, 3, 3, 3, 3], "self-reported", "external",
       "Collaborations between attendees reported in follow-up surveys (from this year's roadshow and meet-ups).", "Follow-up survey", key=True)
metric(SUMMIT, "Attendee satisfaction", "outcome", "score (1-10)", "point", 7.5, 8.5, [None, None, 8.1, None, None, 8.3], "self-reported", "external",
       "Average rating of programme events this year.", "Event feedback forms", frequency="quarterly")
campaign(SUMMIT, "Summit early-bird campaign", "social", "external", "2026-07-01", "2026-09-30", 4000, "utm_campaign=summit26_earlybird",
         "Social ads and partner newsletters promoting early-bird registration.",
         {"2026-07-01": {"impressions": 48000, "clicks": 1100, "sign-ups": 50}, "2026-08-01": {"impressions": 62000, "clicks": 1500, "sign-ups": 60},
          "2026-09-01": {"impressions": 55000, "clicks": 1300, "sign-ups": 45}})
evidence(SUMMIT, "Partnerships started after events", "case-study", "2026-09-12", "Two newsrooms share a data reporter",
         "After meeting at the July roadshow, two county newsrooms now share a data reporter and co-publish investigations.",
         "Programme case study", "partnerships,events")
spend(SUMMIT, [("06", 6000, "events", "Venue deposit"), ("07", 4000, "marketing", "Early-bird campaign"), ("08", 3000, "travel", "Speaker travel bookings"),
               ("2026-11-10", 22000, "events", "Venue, AV and catering balance", "committed")])
monthly(SUMMIT, 1000, "staff", "Event coordinator (part)")

LUNCH = "Lunch & Learn series (internal)"
initiative(LUNCH, EV, "Priya Shah", 15000, "Global",
           "Monthly internal sessions where newsroom partners and programme staff share stories and results with colleagues.",
           ["$15k; Comms support; guest speakers from partner newsrooms.",
            "Monthly lunch-and-learn sessions, in person and online.",
            "20 sessions; 1,200 colleague attendances.",
            "Colleagues understand the programme and share its stories.",
            "Stronger internal support for the programme."])
metric(LUNCH, "Sessions held", "activity", "sessions", "cumulative", 0, 20, [1, 2, 2, 1, 1, 2], "measured", "internal",
       "Lunch & Learn sessions delivered.", "Events calendar", logged_by="Priya Shah")
metric(LUNCH, "Colleague attendances", "output", "attendances", "cumulative", 0, 1200, [80, 140, 160, 90, 70, 150], "measured", "internal",
       "Total attendances, in person and online.", "Registration list", key=True, logged_by="Priya Shah")
metric(LUNCH, "Attendees who understand the programme better", "outcome", "%", "point", 0, 80, [None, None, 72, None, None, 76], "self-reported", "internal",
       "Share of attendees agreeing they understand the programme better after a session.", "Session feedback", frequency="quarterly", logged_by="Priya Shah")
evidence(LUNCH, "Attendees who understand the programme better", "quote", "2026-08-14", "Sales colleague after a session",
         "I finally get what the programme does. I've already used the Tyneside membership story with a client.",
         "Attendee, Advertising sales", "internal,comms")
monthly(LUNCH, 1100, "events", "Catering and streaming")

# ---------------------------------------------------------------------------
# Policy & Public Affairs (with GAPP)

PP = "Policy & Public Affairs"
focus_area(PP, "Daniel Mensah", 30000, "Working with Government Affairs & Public Policy so programme evidence informs policy on local news.")
POLICY = "Policy Engagement on Local News"
initiative(POLICY, PP, "Daniel Mensah", 30000, "UK, EU and US",
           "Briefings, consultation responses and roundtables that bring programme evidence to policymakers.",
           ["$30k; GAPP team time; programme data and case studies.",
            "Policymaker briefings; written submissions; roundtables with newsrooms.",
            "24 briefings; 6 submissions; 60 policymakers engaged.",
            "Programme evidence is cited in policy and officials ask for more.",
            "Policy that supports a sustainable local news sector."])
metric(POLICY, "Policymaker briefings held", "activity", "briefings", "cumulative", 0, 24, [1, 2, 2, 1, 3, 2], "measured", "external",
       "Meetings or calls with officials where programme evidence was presented.", "GAPP contact log", logged_by="Daniel Mensah")
metric(POLICY, "Written submissions to consultations", "output", "submissions", "cumulative", 0, 6, [0, 1, 0, 1, 0, 1], "measured", "external",
       "Formal responses to government or regulator consultations.", "GAPP tracker", lead="Programme evidence cited in policy documents", logged_by="Daniel Mensah")
metric(POLICY, "Policymakers engaged", "output", "people", "cumulative", 0, 60, [3, 6, 5, 4, 8, 6], "measured", "external",
       "Unique officials and elected representatives engaged.", "GAPP contact log", key=True, logged_by="Daniel Mensah")
metric(POLICY, "Programme evidence cited in policy documents", "outcome", "citations", "cumulative", 0, 10, [0, 0, 1, 1, 1, 1], "measured", "external",
       "Policy documents, speeches or reports citing programme data or case studies.", "Policy monitoring", key=True, logged_by="Daniel Mensah")
metric(POLICY, "Follow-up requests from officials", "outcome", "requests", "cumulative", 0, 20, [0, 1, 2, 1, 3, 2], "measured", "external",
       "Requests from officials for more data, briefings or visits.", "GAPP contact log", logged_by="Daniel Mensah")
evidence(POLICY, "Follow-up requests from officials", "quote", "2026-08-28", "Adviser in a ministry team",
         "The newsroom case studies were exactly what we needed. Could you send the survey figures by region?",
         "Policy adviser, national government", "gapp,policy")
evidence(POLICY, "Programme evidence cited in policy documents", "link", "2026-09-18", "Consultation response on local media",
         "Our written response to the local media consultation, drawing on the audience study and training results.", "GAPP",
         "gapp,submission", url="https://example.org/policy/consultation-response")
monthly(POLICY, 1400, "staff", "GAPP analyst (part)")
spend(POLICY, [("05", 2000, "travel", "Roundtable travel"), ("07", 2200, "events", "Newsroom roundtable with officials"), ("09", 2000, "travel", "Capital visits")])

# ---------------------------------------------------------------------------
# Operations for the new focus areas.

responsibility("Renew partner tool agreements for 2027", "contract", "programme", "Tom Reeves", "2026-10-30", PT, TOOLS,
               description="Three partner agreements end in December.")
responsibility("Monthly partner performance review", "report", "programme", "Tom Reeves", "2026-09-25", PT, TOOLS, recurrence="monthly")
responsibility("Quarterly insights digest for product leadership", "report", "programme", "Tom Reeves", "2026-09-19", PT, FEEDBACK, recurrence="quarterly")
responsibility("Publish brief 4: young audiences", "report", "programme", "Tom Reeves", "2026-10-20", RI, STUDY)
responsibility("Press launch plan for the full report", "admin", "comms", "Priya Shah", "2026-10-06", RI, STUDY)
responsibility("Confirm summit venue contract", "contract", "programme", "Nadia Hassan", "2026-09-30", EV, SUMMIT, status="in-progress")
responsibility("Summit registration campaign, phase 2", "admin", "marketing", "Sofia Lindqvist", "2026-10-01", EV, SUMMIT)
responsibility("Summit accessibility and safeguarding plan", "compliance", "programme", "Nadia Hassan", "2026-10-15", EV, SUMMIT)
responsibility("Book Lunch & Learn speakers for Q4", "admin", "comms", "Priya Shah", "2026-09-18", EV, LUNCH)
responsibility("Response to the local media consultation", "report", "gapp", "Daniel Mensah", "2026-09-12", PP, POLICY, status="done", completed="2026-09-11")
responsibility("Prepare evidence pack for the parliamentary committee", "report", "gapp", "Daniel Mensah", "2026-10-09", PP, POLICY, status="in-progress")
responsibility("Quarterly policy horizon scan", "report", "gapp", "Daniel Mensah", "2026-10-01", PP, POLICY, recurrence="quarterly")

risk("Partner changes tool pricing for newsrooms", 3, 4, "Tom Reeves", PT, "Agree fixed pricing to the end of 2027 in the renewal.", "2026-10-15", TOOLS)
risk("Low weekly use means partners lose interest", 3, 3, "Tom Reeves", PT, "Tool clinics for newsrooms below weekly use; share usage data with partners monthly.", "2026-10-01", TOOLS)
risk("Product teams deprioritise newsroom requests", 3, 3, "Tom Reeves", PT, "Agree two newsroom features per quarter with product leadership.", "2026-10-31", FEEDBACK)
risk("Report launch misses the policy window", 2, 4, "Tom Reeves", RI, "Publish briefs early and share embargoed findings with GAPP.", "2026-10-10", STUDY)
risk("Summit registrations fall short of 800", 3, 4, "Sofia Lindqvist", EV, "Phase 2 campaign through partner newsletters; group discounts for newsrooms.", "2026-10-01", SUMMIT)
risk("Sponsor shortfall leaves a budget gap", 4, 3, "Nadia Hassan", EV, "Scale the online track; approach two additional foundations.", "2026-09-20", SUMMIT)
risk("Election period limits access to officials", 3, 3, "Daniel Mensah", PP, "Front-load briefings before the pre-election period; focus on officials, not ministers.", "2026-11-01", POLICY)

decision("2026-06-05", "Choose the summit city", "The summit will be held in Lisbon, with an online track.", "Best mix of cost, access for global attendees and a venue partner offering a discount.", "Programme board", EV, SUMMIT)
decision("2026-07-22", "Publish research as briefs first", "Findings will be released as six short briefs before the full report.", "Policy and press interest is highest now; briefs keep the study in the news for longer.", "Tom Reeves", RI, STUDY)
decision("2026-08-12", "Prioritise transcription over analytics integrations", "Phase 3 integration budget goes to transcription tools.", "Transcription saves the most time in the user survey; analytics setup needs more support than budget allows.", "Programme board", PT, TOOLS)
decision("2026-09-02", "Lead the consultation response jointly with GAPP", "GAPP leads the consultation response; the programme supplies data and case studies.", "GAPP owns relationships with officials; the programme owns the evidence.", "Nadia Hassan (Global lead) and GAPP", PP, POLICY)

# The frozen board snapshot from the original example.
ds["snapshots"] = [{"initiative": DIGITAL, "label": "Q2 2026 as reported to the board", "asOf": "2026-06-30", "by": "Nadia Hassan", "frozenOn": "2026-07-03"}]

# ---------------------------------------------------------------------------
# Checks: every reference must resolve, and budgets must add up.

names = {i["name"] for i in ds["initiatives"]}
fas = {f["name"] for f in ds["focusAreas"]}
metric_names = {(m["initiative"], m["name"]) for m in ds["metrics"]}
people = {p["name"] for p in ds["people"]}
for m in ds["metrics"]:
    assert m["initiative"] in names, m
    assert not m["leadingIndicatorFor"] or (m["initiative"], m["leadingIndicatorFor"]) in metric_names, m
for e in ds["entries"]:
    assert (e["initiative"], e["metric"]) in metric_names, e
for key in ["campaigns", "spend", "evidence", "campaignMetrics"]:
    for r in ds[key]:
        assert r["initiative"] in names, (key, r)
for e in ds["evidence"]:
    assert not e["metric"] or (e["initiative"], e["metric"]) in metric_names, e
for i in ds["initiatives"]:
    assert i["focusArea"] in fas, i
for key in ["responsibilities", "risks", "decisions"]:
    for r in ds[key]:
        assert not r.get("focusArea") or r["focusArea"] in fas, (key, r)
        assert not r.get("initiative") or r["initiative"] in names, (key, r)
        assert not r.get("owner") or r["owner"] in people, (key, r)
assert sum(f["budget"] for f in ds["focusAreas"]) == ds["programme"]["budget"]
for f in ds["focusAreas"]:
    assert sum(i["budget"] for i in ds["initiatives"] if i["focusArea"] == f["name"]) == f["budget"], f["name"]

ds["version"] = 1
(HERE / "sample-data.json").write_text(json.dumps(ds, indent=1, ensure_ascii=False))
print(f"Wrote sample-data.json: {len(ds['focusAreas'])} focus areas, {len(ds['initiatives'])} initiatives, {len(ds['metrics'])} metrics, "
      f"{len(ds['entries'])} entries, {len(ds['campaigns'])} campaigns, {len(ds['evidence'])} evidence, {len(ds['spend'])} spend lines, "
      f"{len(ds['responsibilities'])} responsibilities, {len(ds['risks'])} risks, {len(ds['decisions'])} decisions")
