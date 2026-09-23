"""Builds the Excel template (impact-tracker-template.xlsx) from sample-data.json.

The workbook has one sheet per kind of data, pre-filled with the sample
programme. Replace the rows with your own and load the file into the demo
("Load your data"). Column headers must stay as they are: the loader reads
them by name.

Run:  python3 sample-data/build_template.py
"""

import json
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

HERE = Path(__file__).parent
ds = json.loads((HERE / "sample-data.json").read_text())

FONT = "Arial"
HEAD_FILL = PatternFill("solid", fgColor="2F3A45")
CALC_FILL = PatternFill("solid", fgColor="E7E6E1")
NOTE_FILL = PatternFill("solid", fgColor="FFF4CC")
THIN = Side(style="thin", color="D5D3CC")
MAX_ROWS = 2000  # dropdowns cover this many rows
CALC_ROWS = 500  # calculated columns cover this many rows

LEVELS = "input,activity,output,outcome,impact"
CHOICES = {
    "level": LEVELS,
    "direction": "increase,decrease",
    "measure": "point,cumulative",
    "frequency": "weekly,monthly,quarterly,annually,ad-hoc",
    "yesno": "Yes,No",
    "audience": "external,internal,both",
    "confidence": "measured,self-reported,estimated,modelled",
    "role": "admin,programme,partner,viewer",
    "team": "comms,gapp,marketing",
    "ownerteam": "programme,comms,gapp,marketing",
    "status": "planning,active,paused,completed",
    "channel": "youtube,social,email,events,paid-search,press,other",
    "evidence": "quote,survey,case-study,link",
    "origin": "human,ai",
    "category": "staff,grants,events,marketing,travel,vendors,other",
    "spendstatus": "actual,committed",
    "resptype": "report,contract,approval,compliance,admin,other",
    "recurrence": "none,monthly,quarterly,annually",
    "respstatus": "open,in-progress,blocked,done",
    "riskstatus": "open,mitigating,closed",
    "scale": "1,2,3,4,5",
}
REFS = {
    "focus": "'Focus areas'!$A$2:$A$200",
    "initiative": "Initiatives!$A$2:$A$500",
    "person": "People!$A$2:$A$300",
}


def d(s):
    return date.fromisoformat(s) if s else None


# (header, key, width, validation, kind) — kind: text | date | money | number | bool
SHEETS = {
    "People": [("Name", "name", 22, None, "text"), ("Email", "email", 28, None, "text"), ("Role", "role", 12, "role", "text"),
               ("Partner team", "team", 14, "team", "text")],
    "Focus areas": [("Name", "name", 32, None, "text"), ("Description", "description", 60, None, "text"), ("Owner", "owner", 20, "person", "text"),
                    ("Budget", "budget", 12, None, "money")],
    "Initiatives": [("Name", "name", 34, None, "text"), ("Focus area", "focusArea", 30, "focus", "text"), ("Description", "description", 50, None, "text"),
                    ("Owner", "owner", 18, "person", "text"), ("Start date", "start", 12, None, "date"), ("End date", "end", 12, None, "date"),
                    ("Budget", "budget", 11, None, "money"), ("Region", "region", 18, None, "text"), ("Status", "status", 11, "status", "text"),
                    ("ToC: inputs", "toc.inputs", 36, None, "text"), ("ToC: activities", "toc.activities", 36, None, "text"),
                    ("ToC: outputs", "toc.outputs", 36, None, "text"), ("ToC: outcomes", "toc.outcomes", 36, None, "text"),
                    ("ToC: impact", "toc.impact", 36, None, "text")],
    "Metrics": [("Initiative", "initiative", 30, "initiative", "text"), ("Metric", "name", 40, None, "text"), ("Definition", "definition", 44, None, "text"),
                ("Level", "level", 10, "level", "text"), ("Unit", "unit", 14, None, "text"), ("Good direction", "direction", 13, "direction", "text"),
                ("How entries combine", "measureType", 16, "measure", "text"), ("Baseline", "baseline", 10, None, "number"),
                ("Target", "target", 10, None, "number"), ("Target date", "targetDate", 12, None, "date"), ("Frequency", "frequency", 11, "frequency", "text"),
                ("Data source", "dataSource", 22, None, "text"), ("Key metric", "isKey", 10, "yesno", "bool"), ("Audience", "audience", 11, "audience", "text"),
                ("Leading indicator for", "leadingIndicatorFor", 34, None, "text"), ("Library definition", "library", 24, None, "text")],
    "Entries": [("Initiative", "initiative", 30, "initiative", "text"), ("Metric", "metric", 40, None, "text"), ("Date", "date", 12, None, "date"),
                ("Value", "value", 10, None, "number"), ("Confidence", "confidence", 14, "confidence", "text"), ("Note", "note", 40, None, "text"),
                ("Logged by", "loggedBy", 18, "person", "text")],
    "Library": [("Name", "name", 30, None, "text"), ("Definition", "definition", 50, None, "text"), ("Level", "level", 10, "level", "text"),
                ("Unit", "unit", 14, None, "text"), ("Good direction", "direction", 13, "direction", "text"),
                ("How entries combine", "measureType", 16, "measure", "text"), ("Frequency", "frequency", 11, "frequency", "text"),
                ("Data source", "dataSource", 22, None, "text")],
    "Campaigns": [("Initiative", "initiative", 30, "initiative", "text"), ("Campaign", "name", 36, None, "text"), ("Channel", "channel", 11, "channel", "text"),
                  ("Audience", "audience", 11, "audience", "text"), ("Start date", "start", 12, None, "date"), ("End date", "end", 12, None, "date"),
                  ("Spend", "spend", 10, None, "money"), ("Tracking tag", "tag", 28, None, "text"), ("Notes", "notes", 44, None, "text")],
    "Campaign results": [("Initiative", "initiative", 30, "initiative", "text"), ("Campaign", "campaign", 36, None, "text"), ("Date", "date", 12, None, "date"),
                         ("Metric", "metric", 14, None, "text"), ("Value", "value", 10, None, "number")],
    "Evidence": [("Initiative", "initiative", 30, "initiative", "text"), ("Metric", "metric", 34, None, "text"), ("Type", "type", 11, "evidence", "text"),
                 ("Title", "title", 34, None, "text"), ("Text", "body", 60, None, "text"), ("Source", "source", 28, None, "text"),
                 ("Link", "url", 30, None, "text"), ("Date", "date", 12, None, "date"), ("Tags", "tags", 20, None, "text"),
                 ("Origin", "origin", 9, "origin", "text")],
    "Spend": [("Initiative", "initiative", 32, "initiative", "text"), ("Date", "date", 12, None, "date"), ("Amount", "amount", 11, None, "money"),
              ("Category", "category", 11, "category", "text"), ("Status", "status", 11, "spendstatus", "text"), ("Description", "description", 40, None, "text"),
              ("Reference", "reference", 14, None, "text")],
    "Responsibilities": [("Title", "title", 44, None, "text"), ("Description", "description", 40, None, "text"), ("Type", "type", 12, "resptype", "text"),
                         ("Team", "team", 12, "ownerteam", "text"), ("Owner", "owner", 18, "person", "text"), ("Focus area", "focusArea", 28, "focus", "text"),
                         ("Initiative", "initiative", 30, "initiative", "text"), ("Due date", "dueDate", 12, None, "date"),
                         ("Repeats", "recurrence", 11, "recurrence", "text"), ("Status", "status", 11, "respstatus", "text"),
                         ("Completed on", "completedAt", 13, None, "date"), ("Notes", "notes", 30, None, "text")],
    "Risks": [("Title", "title", 44, None, "text"), ("Description", "description", 36, None, "text"), ("Likelihood (1-5)", "likelihood", 11, "scale", "number"),
              ("Impact (1-5)", "impact", 10, "scale", "number"), ("Status", "status", 11, "riskstatus", "text"), ("Owner", "owner", 18, "person", "text"),
              ("Focus area", "focusArea", 28, "focus", "text"), ("Initiative", "initiative", 30, "initiative", "text"), ("Next review", "reviewDate", 12, None, "date"),
              ("Mitigation", "mitigation", 50, None, "text")],
    "Decisions": [("Date", "date", 12, None, "date"), ("Title", "title", 40, None, "text"), ("Decision", "decision", 50, None, "text"),
                  ("Why", "rationale", 50, None, "text"), ("Made by", "madeBy", 26, None, "text"), ("Focus area", "focusArea", 28, "focus", "text"),
                  ("Initiative", "initiative", 30, "initiative", "text")],
    "Snapshots": [("Initiative", "initiative", 32, "initiative", "text"), ("Label", "label", 36, None, "text"), ("Data as of", "asOf", 12, None, "date"),
                  ("Frozen by", "by", 18, "person", "text"), ("Frozen on", "frozenOn", 12, None, "date")],
}
DATA = {
    "People": ds["people"], "Focus areas": ds["focusAreas"], "Initiatives": ds["initiatives"], "Metrics": ds["metrics"], "Entries": ds["entries"],
    "Library": ds["library"], "Campaigns": ds["campaigns"], "Campaign results": ds["campaignMetrics"], "Evidence": ds["evidence"], "Spend": ds["spend"],
    "Responsibilities": ds["responsibilities"], "Risks": ds["risks"], "Decisions": ds["decisions"], "Snapshots": ds["snapshots"],
}
# Calculated columns appended to the right of a sheet: (header, formula template with {r}, width, number format)
CALC = {
    "Risks": [("Score (calculated)", "=IF(AND(ISNUMBER(C{r}),ISNUMBER(D{r})),C{r}*D{r},\"\")", 11, "0"),
              ("Rating (calculated)", "=IF(K{r}=\"\",\"\",IF(K{r}>=15,\"High\",IF(K{r}>=8,\"Medium\",\"Low\")))", 12, "@")],
    "Spend": [("Focus area (calculated)", "=IFERROR(INDEX(Initiatives!$B$2:$B$500,MATCH(A{r},Initiatives!$A$2:$A$500,0)),\"\")", 30, "@")],
    "Metrics": [("Focus area (calculated)", "=IFERROR(INDEX(Initiatives!$B$2:$B$500,MATCH(A{r},Initiatives!$A$2:$A$500,0)),\"\")", 30, "@")],
}


def get(row, key):
    if key.startswith("toc."):
        return row.get("toc", {}).get(key[4:], "")
    return row.get(key, "")


def style_header(ws, headers, calc_from=None):
    for c, h in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=c, value=h)
        cell.font = Font(name=FONT, bold=True, color="FFFFFF", size=10)
        cell.fill = HEAD_FILL if not calc_from or c < calc_from else PatternFill("solid", fgColor="6B6A65")
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    ws.row_dimensions[1].height = 30
    ws.freeze_panes = "A2"


wb = Workbook()
readme = wb.active
readme.title = "Read me"

# Programme sheet: field / value pairs.
prog = wb.create_sheet("Programme")
style_header(prog, ["Field", "Value", "Notes"])
p = ds["programme"]
rows = [("Name", p["name"], ""), ("Mission", p["mission"], "One or two sentences"), ("Description", p["description"], ""),
        ("Currency", p["currency"], "USD, GBP or EUR"), ("Budget", p["budget"], "Total programme budget. Focus area budgets should add up to this."),
        ("Start date", d(p["start"]), "YYYY-MM-DD"), ("End date", d(p["end"]), "YYYY-MM-DD"),
        ("Demo date", d(p.get("demoDate", "2026-09-23")), "The 'today' the demo uses, so example data reads as current. Change it to your presentation date if your data is current.")]
for r, (f, v, n) in enumerate(rows, start=2):
    prog.cell(row=r, column=1, value=f).font = Font(name=FONT, bold=True, size=10)
    c = prog.cell(row=r, column=2, value=v)
    c.font = Font(name=FONT, size=10)
    c.alignment = Alignment(wrap_text=True, vertical="top")
    if isinstance(v, date):
        c.number_format = "yyyy-mm-dd"
    if f == "Budget":
        c.number_format = "#,##0"
    prog.cell(row=r, column=3, value=n).font = Font(name=FONT, size=9, color="6B6A65", italic=True)
prog.column_dimensions["A"].width = 14
prog.column_dimensions["B"].width = 70
prog.column_dimensions["C"].width = 60
dv = DataValidation(type="list", formula1='"USD,GBP,EUR"', allow_blank=False)
prog.add_data_validation(dv)
dv.add("B5")

for name, cols in SHEETS.items():
    ws = wb.create_sheet(name)
    calc = CALC.get(name, [])
    headers = [c[0] for c in cols] + [c[0] for c in calc]
    style_header(ws, headers, calc_from=len(cols) + 1 if calc else None)
    for r, row in enumerate(DATA[name], start=2):
        for c, (_, key, _, _, kind) in enumerate(cols, start=1):
            v = get(row, key)
            if kind == "date":
                v = d(v) if v else None
            elif kind == "bool":
                v = "Yes" if v else "No"
            elif v == "":
                v = None
            cell = ws.cell(row=r, column=c, value=v)
            cell.font = Font(name=FONT, size=10)
            cell.alignment = Alignment(vertical="top", wrap_text=kind == "text" and cols[c - 1][2] >= 36)
            if kind == "date":
                cell.number_format = "yyyy-mm-dd"
            elif kind == "money":
                cell.number_format = "#,##0"
    # Calculated columns: formulas down to MAX_ROWS so new rows calculate too.
    last_data = max(len(DATA[name]) + 1, 2)
    for k, (h, formula, width, fmt) in enumerate(calc):
        col = len(cols) + 1 + k
        for r in range(2, CALC_ROWS + 1):
            cell = ws.cell(row=r, column=col, value=formula.format(r=r))
            cell.fill = CALC_FILL
            cell.font = Font(name=FONT, size=10, color="000000")
            cell.number_format = fmt
        ws.column_dimensions[get_column_letter(col)].width = width
    for c, (_, _, width, validation, _) in enumerate(cols, start=1):
        letter = get_column_letter(c)
        ws.column_dimensions[letter].width = width
        if validation:
            f1 = REFS.get(validation) or f'"{CHOICES[validation]}"'
            dv = DataValidation(type="list", formula1=f1, allow_blank=True, showErrorMessage=True,
                                errorTitle="Choose from the list", error="Pick a value from the dropdown.")
            ws.add_data_validation(dv)
            dv.add(f"{letter}2:{letter}{MAX_ROWS}")
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{last_data}"

# Help comments on the trickiest headers.
wb["Metrics"]["G1"].comment = Comment("point = the latest value counts (e.g. a % or a score).\ncumulative = each entry is added up (e.g. people trained per month).", "Impact Tracker")
wb["Metrics"]["O1"].comment = Comment("Optional. The exact name of another metric in the same initiative. If this metric falls behind, that one is flagged 'at risk'.", "Impact Tracker")
wb["Metrics"]["P1"].comment = Comment("Optional. The exact name of a row on the Library sheet this metric was copied from.", "Impact Tracker")
wb["Entries"]["B1"].comment = Comment("Must match a metric name on the Metrics sheet for the same initiative.", "Impact Tracker")
wb["Evidence"]["B1"].comment = Comment("Optional. Leave blank for evidence about the whole initiative.", "Impact Tracker")
wb["Evidence"]["J1"].comment = Comment("ai = AI-generated. It stays hidden from stakeholder views until someone approves it in the app.", "Impact Tracker")
wb["Spend"]["E1"].comment = Comment("actual = paid. committed = ordered or contracted, not yet paid.", "Impact Tracker")

# Summary: formulas only.
sm = wb.create_sheet("Summary")
style_header(sm, ["Focus area", "Budget", "Allocated to initiatives", "Unallocated", "Paid to date", "Committed", "Paid share of budget",
                  "Initiatives", "Metrics", "Open risks", "Open responsibilities"])
fa_rows = len(ds["focusAreas"])
for i in range(fa_rows + 5):  # a few spare rows for new focus areas
    r = i + 2
    src = i + 2
    cells = [
        f"=IF('Focus areas'!A{src}=\"\",\"\",'Focus areas'!A{src})",
        f"=IF(A{r}=\"\",\"\",'Focus areas'!D{src})",
        f"=IF(A{r}=\"\",\"\",SUMIFS(Initiatives!$G$2:$G$500,Initiatives!$B$2:$B$500,A{r}))",
        f"=IF(A{r}=\"\",\"\",B{r}-C{r})",
        f"=IF(A{r}=\"\",\"\",SUMIFS(Spend!$C$2:$C$500,Spend!$H$2:$H$500,A{r},Spend!$E$2:$E$500,\"actual\"))",
        f"=IF(A{r}=\"\",\"\",SUMIFS(Spend!$C$2:$C$500,Spend!$H$2:$H$500,A{r},Spend!$E$2:$E$500,\"committed\"))",
        f"=IF(OR(A{r}=\"\",N(B{r})=0),\"\",E{r}/B{r})",
        f"=IF(A{r}=\"\",\"\",COUNTIF(Initiatives!$B$2:$B$500,A{r}))",
        f"=IF(A{r}=\"\",\"\",COUNTIF(Metrics!$Q$2:$Q$500,A{r}))",
        f"=IF(A{r}=\"\",\"\",COUNTIFS(Risks!$G$2:$G$500,A{r},Risks!$E$2:$E$500,\"<>closed\"))",
        f"=IF(A{r}=\"\",\"\",COUNTIFS(Responsibilities!$F$2:$F$500,A{r},Responsibilities!$J$2:$J$500,\"<>done\"))",
    ]
    for c, f in enumerate(cells, start=1):
        cell = sm.cell(row=r, column=c, value=f)
        cell.font = Font(name=FONT, size=10)
        cell.fill = CALC_FILL
        cell.number_format = {2: "#,##0", 3: "#,##0", 4: "#,##0;(#,##0);-", 5: "#,##0", 6: "#,##0", 7: "0.0%"}.get(c, "0")
total = fa_rows + 5 + 2
sm.cell(row=total, column=1, value="Programme").font = Font(name=FONT, bold=True, size=10)
for c, letter in [(2, "B"), (3, "C"), (4, "D"), (5, "E"), (6, "F"), (8, "H"), (9, "I"), (10, "J"), (11, "K")]:
    cell = sm.cell(row=total, column=c, value=f"=SUM({letter}2:{letter}{total - 1})")
    cell.font = Font(name=FONT, bold=True, size=10)
    cell.number_format = "#,##0" if c <= 6 else "0"
    cell.border = Border(top=THIN)
cell = sm.cell(row=total, column=7, value=f"=IF(N(B{total})=0,\"\",E{total}/B{total})")
cell.font = Font(name=FONT, bold=True, size=10)
cell.number_format = "0.0%"
check = total + 2
sm.cell(row=check, column=1, value="Check").font = Font(name=FONT, bold=True, size=10)
sm.cell(row=check, column=2, value=f"=IF(ROUND(B{total}-Programme!B6,0)=0,\"Focus area budgets add up to the programme budget\",\"Focus area budgets differ from the programme budget by \"&TEXT(B{total}-Programme!B6,\"#,##0\"))").font = Font(name=FONT, size=10)
sm.cell(row=check + 1, column=1, value="Note").font = Font(name=FONT, bold=True, size=10)
sm.cell(row=check + 1, column=2, value="Calculated from the other sheets. Don't type here; the app works these out itself too.").font = Font(name=FONT, size=9, italic=True, color="6B6A65")
for c, w in enumerate([32, 12, 16, 12, 12, 12, 14, 11, 9, 11, 14], start=1):
    sm.column_dimensions[get_column_letter(c)].width = w

# Read me.
readme.column_dimensions["A"].width = 26
readme.column_dimensions["B"].width = 100
lines = [
    ("Impact Tracker data template", None, "title"),
    ("What this is", "Everything the Impact Tracker demo shows, in one workbook. It is pre-filled with a sample Global News Programme (5 focus areas, 8 initiatives). Replace the rows with your own programme, then load the file into the demo.", None),
    ("How to use it", "1. Start with Programme, People, Focus areas and Initiatives.\n2. Add Metrics for each initiative, then their Entries (one row per metric per date).\n3. Optionally add Campaigns, Campaign results, Evidence, Spend, Responsibilities, Risks, Decisions and Snapshots.\n4. In the demo, choose \"Load your data\" in the dark bar at the top and pick this file. The demo checks every row and tells you about anything it can't use before replacing the data.", None),
    ("Legend", "White cells: yours to edit.   Grey columns (dark grey header): calculated, don't type in them.   Dropdowns: pick a value from the list.", None),
    ("Rules", "• Keep the column headers exactly as they are. You can add, delete and reorder rows.\n• Names link sheets together, so they must match exactly: an Initiative's \"Focus area\", a Metric's \"Initiative\", an Entry's \"Metric\", an Owner's name on People.\n• Dates as real dates or text in YYYY-MM-DD.\n• Money as plain numbers, in the programme currency.\n• Delete a sample row to remove it; leave a sheet with just its header row to have none of that kind.", None),
    ("Sheets", "Programme · People · Focus areas · Initiatives · Metrics · Entries · Library · Campaigns · Campaign results · Evidence · Spend · Responsibilities · Risks · Decisions · Snapshots · Summary (calculated)", None),
    ("Choices", "Level: input, activity, output, outcome, impact.  How entries combine: point (latest value counts) or cumulative (entries are added up).  Audience: external, internal, both.  Confidence: measured, self-reported, estimated, modelled.  Role: admin (Global lead), programme, partner, viewer. Partners need a team: comms, gapp, marketing.", None),
    ("Example row", "Metrics sheet: Newsroom Digital Skills Training | Journalists trained | Unique journalists completing at least one full training session | output | people | increase | cumulative | 0 | 300 | (blank) | monthly | Attendance registers | Yes | external | Trainees applying new skills | People trained", None),
    ("Source", "Sample figures are illustrative, made up for the demo. They are not real results.", None),
]
r = 1
for label, text, kind in lines:
    if kind == "title":
        readme.cell(row=r, column=1, value=label).font = Font(name=FONT, bold=True, size=16)
        r += 2
        continue
    readme.cell(row=r, column=1, value=label).font = Font(name=FONT, bold=True, size=10)
    c = readme.cell(row=r, column=2, value=text)
    c.font = Font(name=FONT, size=10)
    c.alignment = Alignment(wrap_text=True, vertical="top")
    readme.cell(row=r, column=1).alignment = Alignment(vertical="top")
    if label == "Legend":
        c.fill = NOTE_FILL
    readme.row_dimensions[r].height = max(18, 15 * (text.count("\n") + 1 + len(text) // 110))
    r += 1

# No cached values are stored, so ask Excel / Sheets to calculate everything on open.
from openpyxl.workbook.properties import CalcProperties
wb.calculation = CalcProperties(fullCalcOnLoad=True)

out = HERE / "impact-tracker-template.xlsx"
wb.save(out)
print(f"Wrote {out.name}")
