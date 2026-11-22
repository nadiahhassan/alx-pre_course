"""Builds sample-data.json: the illustrative projects the app starts with.

The same file seeds the shared database (once, after publishing) and is what the app loads
in practice mode, when the shared database isn't available. Run: python3 build_sample.py
"""
import json
from datetime import date, timedelta

BASE = date(2026, 11, 21)  # the day the sample "is"
d = lambda days: (BASE + timedelta(days=days)).isoformat()
ts = lambda days, hour=9: f"{d(days)}T{hour:02d}:00:00Z"


def metric(mid, name, mode, unit, baseline, target, freq, hist):
    return {"id": mid, "name": name, "mode": mode, "unit": unit, "baseline": baseline, "target": target, "frequency": freq,
            "history": [{"date": d(a), "value": v, "by": by} for a, v, by in hist]}


def lines(*rows):
    return [{"id": f"l{k+1}", "name": n, "amount": a, "spent": s, "rule": r} for k, (n, a, s, r) in enumerate(rows)]


def ms(*rows):
    return [{"id": f"m{k+1}", "name": n, "due": d(due), "done": None if done is None else d(done), "clientSignoff": cs}
            for k, (n, due, done, cs) in enumerate(rows)]


def project(pid, **kw):
    base = {"id": pid, "status": "active", "currency": "USD", "committed": 0, "returnComment": "", "createdAt": ts(-200), "approvedAt": ts(-198),
            "externals": {}, "members": []}
    base.update(kw)
    base["lastUpdate"] = kw.get("lastUpdate", d(-5))
    return base


projects = [
    project("ng-retail", name="Retail market entry: Lagos and Abuja", country="Nigeria", countryCode="566", team="Nigeria programmes", sector="Market entry",
            client="Northbridge Foods (UK)", funder="", grantRef="", ownerId="tunde", approverId="adaeze", members=["adaeze"], start=d(-150), end=d(120),
            budgetLines=lines(("Staff time", 90000, 52000, ""), ("Travel", 30000, 18000, "Economy only"), ("Regulatory fees", 40000, 21000, ""), ("Events", 20000, 5000, "")),
            committed=6000, externals={"client": "northbridge"},
            metrics=[metric("meetings", "Distributor meetings held", "count", "", 0, 40, "Monthly", [(-120, 6, "tunde"), (-90, 13, "tunde"), (-60, 19, "tunde"), (-30, 24, "tunde"), (-5, 27, "tunde")]),
                     metric("registered", "Products registered", "count", "", 0, 12, "Monthly", [(-60, 2, "tunde"), (-5, 5, "tunde")])],
            milestones=ms(("Market study delivered", -110, -112, "approved"), ("Distributor shortlist", -40, -38, "pending"), ("Product registration complete", 20, None, None), ("First shipment lands", 90, None, None))),
    project("ng-youth", name="Youth digital skills programme", country="Nigeria", countryCode="566", team="Nigeria programmes", sector="Capacity building",
            client="", funder="Foundation partner (education)", grantRef="FP-2026-014", ownerId="tunde", approverId="adaeze", members=["adaeze"], start=d(-300), end=d(245),
            budgetLines=lines(("Training delivery", 380000, 205000, ""), ("Employer partnerships", 120000, 48000, ""), ("Sub-grants to partners", 100000, 52000, "Signed agreement needed"), ("Monitoring and evaluation", 50000, 25000, "Max 10% of total")),
            committed=40000, externals={"funder": "funder", "partner": "partner"},
            metrics=[metric("trained", "Young people trained", "count", "", 0, 5000, "Monthly", [(-270, 300, "tunde"), (-210, 1100, "tunde"), (-150, 1700, "tunde"), (-90, 2200, "tunde"), (-30, 2550, "tunde"), (-3, 2700, "tunde")]),
                     metric("jobs", "In work within 6 months", "rate", "%", 0, 45, "Quarterly", [(-120, 28, "tunde"), (-30, 41, "tunde")])],
            milestones=ms(("Cohort 3 graduation", -30, -28, None), ("Cohort 4 starts", 10, None, None), ("Employer partners signed", 40, None, None))),
    project("ng-fintech", name="Fintech licensing support", country="Nigeria", countryCode="566", team="Nigeria programmes", sector="Regulatory compliance",
            client="Kestrel Pay", funder="", grantRef="", ownerId="adaeze", approverId="nadia", members=["daniel"], start=d(-120), end=d(60),
            budgetLines=lines(("Staff time", 60000, 58000, ""), ("Legal fees", 30000, 24000, "")), committed=4000,
            metrics=[metric("compliance", "Compliance requirements met", "rate", "%", 30, 100, "Monthly", [(-90, 45, "adaeze"), (-60, 62, "adaeze"), (-30, 70, "adaeze"), (-9, 74, "adaeze")])],
            milestones=ms(("Gap analysis", -95, -96, None), ("Licence application filed", -20, None, None), ("Licence decision", 50, None, None)), lastUpdate=d(-9)),
    project("gh-distributor", name="Distributor search: medical devices", country="Ghana", countryCode="288", team="Ghana programmes", sector="Partner search",
            client="Helix Medical", funder="", grantRef="", ownerId="kwame", approverId="ama", members=[], start=d(-90), end=d(90),
            budgetLines=lines(("Staff time", 26000, 12400, ""), ("Travel", 9000, 7100, "Economy only"), ("Events and venues", 15000, 4500, ""), ("Sub-grants to partners", 10000, 0, "Signed agreement needed")),
            committed=8500,
            metrics=[metric("screened", "Distributors screened", "count", "", 0, 30, "Weekly", [(-70, 5, "kwame"), (-55, 11, "kwame"), (-42, 14, "kwame")]),
                     metric("shortlisted", "Distributors shortlisted", "count", "", 0, 5, "Weekly", [(-42, 2, "kwame")])],
            milestones=ms(("Longlist agreed", -60, -61, None), ("Shortlist presented", -10, None, None), ("Contracts signed", 70, None, None)), lastUpdate=d(-42)),
    project("gh-cocoa", name="Cocoa supply-chain compliance", country="Ghana", countryCode="288", team="Ghana programmes", sector="Regulatory compliance",
            client="Bramble Chocolate", funder="", grantRef="", ownerId="kwame", approverId="ama", members=["daniel"], start=d(-200), end=d(100),
            budgetLines=lines(("Field mapping team", 70000, 48000, ""), ("Data tools", 20000, 15000, ""), ("Travel", 30000, 15000, "")), committed=3000,
            metrics=[metric("farms", "Farms mapped with GPS", "count", "", 0, 3000, "Monthly", [(-170, 200, "kwame"), (-110, 1100, "kwame"), (-58, 1850, "kwame"), (-29, 2250, "kwame")]),
                     metric("files", "Suppliers with due-diligence files", "rate", "%", 0, 100, "Monthly", [(-100, 40, "kwame"), (-58, 62, "kwame"), (-29, 71, "kwame")])],
            milestones=ms(("Supplier survey", -150, -152, None), ("Farm mapping complete", 30, None, None), ("Due-diligence statement", 95, None, None)), lastUpdate=d(-29)),
    project("gh-port", name="Port logistics study", country="Ghana", countryCode="288", team="Ghana programmes", sector="Market entry",
            client="Atlas Freight", funder="", grantRef="", ownerId="efua", approverId="ama", members=[], start=d(-80), end=d(40),
            budgetLines=lines(("Consultants", 30000, 21000, ""), ("Travel", 8000, 5500, "")), committed=0,
            metrics=[metric("interviews", "Shipper interviews", "count", "", 0, 40, "Monthly", [(-50, 10, "efua"), (-20, 18, "efua")])],
            milestones=ms(("Inception report", -60, -58, None), ("Draft report", -21, None, None), ("Final report", 35, None, None)), lastUpdate=d(-20)),
    project("ke-energy", name="Market entry: renewable energy", country="Kenya", countryCode="404", team="Kenya programmes", sector="Market entry",
            client="Solano Energy", funder="", grantRef="", ownerId="wanjiru", approverId="nadia", members=["grace"], start=d(-180), end=d(180),
            budgetLines=lines(("Staff time", 120000, 64000, ""), ("Travel", 40000, 25000, ""), ("Partner events", 40000, 15000, "")), committed=10000,
            metrics=[metric("sites", "Site visits completed", "count", "", 0, 20, "Monthly", [(-150, 3, "wanjiru"), (-100, 8, "wanjiru"), (-50, 11, "wanjiru"), (-4, 12, "wanjiru")]),
                     metric("mous", "Partnership MoUs signed", "count", "", 0, 4, "Monthly", [(-60, 1, "wanjiru"), (-4, 2, "wanjiru")])],
            milestones=ms(("Policy review", -150, -150, None), ("Site visits complete", -20, -25, None), ("Partner MoUs signed", 60, None, None)), lastUpdate=d(-4)),
]

# A new project waiting for Ama's approval, and one monthly update waiting for her too.
projects.append(project("gh-agro", status="pending", name="Agro-processing investor scoping", country="Ghana", countryCode="288", team="Ghana programmes", sector="Investment",
                        client="", funder="Atlas Agri Fund", grantRef="AAF-77", ownerId="efua", approverId="ama", members=[], start=d(10), end=d(190),
                        budgetLines=lines(("Consultants", 28000, 0, ""), ("Travel", 7000, 0, "Economy only"), ("Investor event", 15000, 0, "")), committed=0, createdAt=ts(-1), approvedAt=None,
                        metrics=[metric("sites", "Processing sites assessed", "count", "", 0, 8, "Monthly", [])],
                        milestones=ms(("Site shortlist", 60, None, None), ("Investment memo", 170, None, None)), lastUpdate=d(-1)))

updates = [{
    "id": "u-gh-distributor-2026-11", "projectId": "gh-distributor", "period": "2026-11", "by": "kwame", "submittedAt": ts(-1, 9), "status": "pending", "source": "Email (AI, checked by Kwame)",
    "metrics": [{"metricId": "screened", "value": 26}, {"metricId": "shortlisted", "value": 4}],
    "spend": [{"lineId": "l2", "amount": 1200}, {"lineId": "l1", "amount": 2400}],
    "milestonesDone": ["m2"], "risk": {"text": "Two distributors want exclusivity for the whole of Ghana"},
    "note": "Back from the field. Shortlist presented to Helix on Tuesday.", "evidence": {"files": ["shortlist.pdf", "kumasi-receipts.jpg"], "personalData": False, "consent": False},
    "comment": "", "decidedBy": None, "decidedAt": None,
}]

risks = [
    {"id": "r1", "projectId": "ng-fintech", "title": "Licence decision delayed by regulator backlog", "category": "Regulatory", "l": 4, "i": 4, "ownerId": "adaeze", "mitigation": "Weekly calls with the regulator", "status": "Open", "review": d(7), "trend": "up", "needsScoring": False},
    {"id": "r2", "projectId": "ng-retail", "title": "Product registration queue times rising", "category": "Regulatory", "l": 3, "i": 4, "ownerId": "tunde", "mitigation": "Use a local registration agent", "status": "Monitoring", "review": d(14), "trend": "steady", "needsScoring": False},
    {"id": "r3", "projectId": "gh-distributor", "title": "No recent contact from distributor longlist", "category": "Delivery", "l": 4, "i": 3, "ownerId": "kwame", "mitigation": "Book in-person visits", "status": "Open", "review": d(-2), "trend": "up", "needsScoring": False},
    {"id": "r4", "projectId": "gh-cocoa", "title": "Smallholder land titles incomplete", "category": "Partner", "l": 3, "i": 4, "ownerId": "kwame", "mitigation": "Work with cooperatives on proof of land use", "status": "Escalated", "review": d(10), "trend": "steady", "needsScoring": False, "escalatedBy": "ama", "escalatedAt": ts(-7)},
    {"id": "r5", "projectId": "gh-port", "title": "Port strike risk in December", "category": "Political", "l": 4, "i": 5, "ownerId": "efua", "mitigation": "Prepare a second port option", "status": "Open", "review": d(3), "trend": "up", "needsScoring": False},
    {"id": "r6", "projectId": "ng-youth", "title": "Employer partners slow to commit", "category": "Partner", "l": 2, "i": 4, "ownerId": "tunde", "mitigation": "Bring the employer roundtable forward", "status": "Monitoring", "review": d(21), "trend": "down", "needsScoring": False},
    {"id": "r7", "projectId": "ke-energy", "title": "Grid connection policy change", "category": "Political", "l": 2, "i": 5, "ownerId": "wanjiru", "mitigation": "Track the draft regulation", "status": "Monitoring", "review": d(25), "trend": "steady", "needsScoring": False},
]

snapshots = [{
    "id": "s-ng-youth-2026-09", "projectId": "ng-youth", "audience": "funder", "org": "funder", "title": "Youth digital skills programme: quarterly report", "asOf": d(-52),
    "summary": "Training is on pace: 2,550 young people trained against a plan of about 2,600 by this point. 41% of graduates from cohort 2 were in work within six months, close to the 45% target. Spend is on budget.",
    "kpis": [{"label": "Young people trained", "value": "2,550 of 5,000"}, {"label": "In work within 6 months", "value": "41% (target 45%)"}, {"label": "Grant spent", "value": "$310k of $650k"}],
    "lines": [{"name": "Training delivery", "amount": 380000, "spent": 195000}, {"name": "Employer partnerships", "amount": 120000, "spent": 44000}, {"name": "Sub-grants to partners", "amount": 100000, "spent": 48000}, {"name": "Monitoring and evaluation", "amount": 50000, "spent": 23000}],
    "milestones": [{"name": "Cohort 3 graduation", "due": d(-30), "done": None}, {"name": "Cohort 4 starts", "due": d(10), "done": None}],
    "story": "Amaka finished cohort 2 and now builds websites for three Lagos shops (shared with consent).",
    "signedBy": "adaeze", "signedAt": ts(-50), "nextReport": d(40),
}, {
    "id": "s-ng-retail-2026-10", "projectId": "ng-retail", "audience": "client", "org": "northbridge", "title": "Northbridge market entry: October update", "asOf": d(-30),
    "summary": "The distributor shortlist was delivered. Product registration is slower than planned: 3 of 12 products are registered. We have engaged a local agent to speed this up.",
    "kpis": [{"label": "Distributor meetings", "value": "24"}, {"label": "Products registered", "value": "3 of 12"}],
    "lines": [], "milestones": [{"name": "Market study delivered", "due": d(-110), "done": d(-112)}, {"name": "Distributor shortlist", "due": d(-40), "done": d(-38)}, {"name": "Product registration complete", "due": d(20), "done": None}],
    "story": "", "signedBy": "adaeze", "signedAt": ts(-29), "nextReport": d(10),
}]

access = [
    {"id": "a-funder", "org": "funder", "email": "programmes@foundation.example", "projectIds": ["ng-youth"], "expires": d(130), "invitedBy": "nadia", "approvedBy": "daniel", "lastView": ts(-2), "status": "active"},
    {"id": "a-northbridge", "org": "northbridge", "email": "ops@northbridge.example", "projectIds": ["ng-retail"], "expires": d(220), "invitedBy": "adaeze", "approvedBy": "nadia", "lastView": ts(0), "status": "active"},
    {"id": "a-partner", "org": "partner", "email": "data@lagostechhub.example", "projectIds": ["ng-youth"], "expires": d(40), "invitedBy": "tunde", "approvedBy": "nadia", "lastView": None, "status": "active"},
]

questions = [{"id": "q1", "projectId": "ng-retail", "fromId": "northbridge", "text": "Can we see the list of products still waiting for registration?", "at": ts(-3), "answer": "", "answeredBy": None}]

audit = [
    {"id": "e1", "at": ts(-50), "who": "adaeze", "action": "Signed off and shared a report with Foundation partner", "target": "ng-youth"},
    {"id": "e2", "at": ts(-7), "who": "ama", "action": "Escalated a risk to leadership: Smallholder land titles incomplete", "target": "gh-cocoa"},
    {"id": "e3", "at": ts(-1, 9), "who": "kwame", "action": "Sent the November update for approval", "target": "gh-distributor"},
    {"id": "e4", "at": ts(-1, 11), "who": "efua", "action": "Submitted a new project for approval", "target": "gh-agro"},
]

data = {"base": BASE.isoformat(), "projects": projects, "updates": updates, "risks": risks, "snapshots": snapshots, "access": access, "questions": questions, "audit": audit, "messages": [], "settings": [{"id": "dashboard", "mode": "everyone", "allowed": [], "requests": []}]}
# Every project's spend must stay within its budget lines; every reference must resolve.
ids = {p["id"] for p in projects}
for col in ("updates", "risks", "snapshots", "questions"):
    for row in data[col]:
        assert row["projectId"] in ids, (col, row["id"])
for a in access:
    assert all(pid in ids for pid in a["projectIds"])
with open("sample-data.json", "w") as f:
    json.dump(data, f, indent=1)
print({k: len(v) for k, v in data.items()})
