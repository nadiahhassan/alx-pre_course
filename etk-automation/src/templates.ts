// Builds the two Excel files ETK teams fill in:
//  - board-inventory.xlsx: step 1, list every board that exists today
//  - standard-board-template.xlsx: step 2, the columns every board should have (also importable into Monday.com, Asana, Trello and Jira)

import ExcelJS from "exceljs";
import { COUNTRY_CODES } from "./country-codes.js";
import { FREQUENCIES, PROJECT_FIELDS, RISK_CATEGORIES, RISK_FIELDS, RISK_STATUSES, SECTORS, UNITS, type FieldDef } from "./standard.js";

const RED = "FFC82227", BROWN = "FF392412", TINT = "FFFBE9E8", FONT = "Arial";
const ROWS = 500;

function header(ws: ExcelJS.Worksheet, defs: { title: string; hint: string; required?: boolean; width?: number }[]) {
  ws.columns = defs.map(d => ({ header: d.title, width: d.width ?? Math.max(14, Math.min(34, d.title.length + 4)) }));
  const row = ws.getRow(1);
  row.height = 30;
  row.eachCell((c, k) => {
    const d = defs[k - 1];
    c.font = { name: FONT, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: d.required ? RED : BROWN } };
    c.alignment = { vertical: "middle", wrapText: true };
    c.note = d.hint + (d.required ? " (Required.)" : "");
  });
  ws.views = [{ state: "frozen", ySplit: 1, xSplit: 1 }];
}

function list(ws: ExcelJS.Worksheet, col: number, values: string[] | string, allowBlank = true) {
  const formulae = Array.isArray(values) ? [`"${values.join(",")}"`] : [values];
  for (let r = 2; r <= ROWS; r++) ws.getCell(r, col).dataValidation = { type: "list", allowBlank, formulae, showErrorMessage: true, errorTitle: "Pick from the list", error: "Choose one of the options in the drop-down." };
}

function body(ws: ExcelJS.Worksheet) {
  ws.eachRow((row, r) => { if (r > 1) row.eachCell(c => { c.font = { name: FONT, italic: true, color: { argb: "FF6C7C8A" } }; }); });
}

const col = (defs: FieldDef[], key: string) => defs.findIndex(d => d.key === key) + 1;

export async function buildStandardTemplate(file: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ETK automation";

  const read = wb.addWorksheet("Read me");
  read.columns = [{ width: 110 }];
  [
    ["Standard project board", true],
    ["Every country board uses these columns, so the automation can read all of them the same way.", false],
    ["", false],
    ["How to use it", true],
    ["1. Keep one row (or one item, card or issue) per project on the Projects sheet. Red headers are required.", false],
    ["2. Hover over any header to see what goes in it. Use the drop-downs where there is one.", false],
    ["3. Up to three metrics and three milestones per project. Leave unused ones blank.", false],
    ["4. Metric unit decides how status is scored: % and scores are rates, judged against the target. Numbers and $ are running totals, judged against where they should be by today.", false],
    ["5. Update the 'actual' columns and 'Spent to date' at least as often as the update frequency, then set 'Last update' to today.", false],
    ["6. Log risks on the Risks sheet. Use the project name exactly as it appears on the Projects sheet.", false],
    ["", false],
    ["Using a project tool", true],
    ["Monday.com, Asana, Trello and Jira can import this sheet to create a board. Keep the column names as they are; if a tool forces a different name, note it in the board inventory so it can be mapped.", false],
    ["Delete the grey example row before you start.", false],
  ].forEach(([t, bold], k) => { const c = read.getCell(k + 1, 1); c.value = t as string; c.font = { name: FONT, bold: !!bold, size: bold ? 13 : 11, color: { argb: bold ? RED : "FF132231" } }; c.alignment = { wrapText: true }; });

  const ws = wb.addWorksheet("Projects");
  header(ws, PROJECT_FIELDS);
  ws.addRow(["Retail market entry: Lagos and Abuja", "Nigeria", "Northbridge Foods (UK)", "Market entry", "Adaeze Okonkwo", "Tunde Bakare, Daniel Price", "2026-06-01", "2027-03-31", 180000, 96000, "Monthly", "Registration queue is slow", "2026-11-20",
    "Distributor meetings held", "Number", 0, 40, 27, "Products registered", "Number", 0, 12, 5, "", "", "", "", "",
    "Market study delivered", "2026-07-15", "2026-07-14", "Product registration complete", "2026-12-10", "", "First shipment lands", "2027-02-20", ""]);
  body(ws);
  list(ws, col(PROJECT_FIELDS, "country"), `'Countries'!$A$2:$A$${Object.keys(COUNTRY_CODES).length + 1}`);
  list(ws, col(PROJECT_FIELDS, "sector"), SECTORS);
  list(ws, col(PROJECT_FIELDS, "frequency"), FREQUENCIES);
  for (let n = 1; n <= 3; n++) list(ws, col(PROJECT_FIELDS, `metric${n}_unit`), UNITS);
  for (const k of ["start", "end", "updated", "milestone1_due", "milestone2_due", "milestone3_due"]) ws.getColumn(col(PROJECT_FIELDS, k)).numFmt = "yyyy-mm-dd";
  for (const k of ["budget", "spent"]) ws.getColumn(col(PROJECT_FIELDS, k)).numFmt = "$#,##0";

  const rs = wb.addWorksheet("Risks");
  header(rs, RISK_FIELDS);
  rs.addRow(["R-01", "Retail market entry: Lagos and Abuja", "Product registration queue times rising", "Regulatory", 3, 4, "Adaeze Okonkwo", "Use a local registration agent", "Open", "2026-12-01"]);
  body(rs);
  list(rs, col(RISK_FIELDS, "category"), RISK_CATEGORIES);
  list(rs, col(RISK_FIELDS, "likelihood"), ["1", "2", "3", "4", "5"]);
  list(rs, col(RISK_FIELDS, "impact"), ["1", "2", "3", "4", "5"]);
  list(rs, col(RISK_FIELDS, "status"), RISK_STATUSES);
  list(rs, col(RISK_FIELDS, "project"), `'Projects'!$A$2:$A$${ROWS}`);

  const cs = wb.addWorksheet("Countries", { state: "hidden" });
  cs.getCell(1, 1).value = "Country";
  Object.keys(COUNTRY_CODES).sort().forEach((c, k) => { cs.getCell(k + 2, 1).value = c; });

  await wb.xlsx.writeFile(file);
}

export async function buildInventory(file: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Boards");
  const defs = [
    { title: "Country", hint: "Country the board covers.", required: true },
    { title: "Board name", hint: "As it appears in the tool.", required: true, width: 30 },
    { title: "Tool", hint: "Where the board lives.", required: true },
    { title: "Board link or ID", hint: "Paste the board's web address. The ID is taken from it.", required: true, width: 40 },
    { title: "Board owner", hint: "Who keeps it up to date.", required: true },
    { title: "Owner email", hint: "For update reminders." , width: 28 },
    { title: "How often it's updated", hint: "In practice, not in theory." },
    { title: "Projects on it", hint: "Rough count." },
    { title: "Uses standard columns?", hint: "Yes, Partly or No." },
    { title: "Columns named differently", hint: "e.g. 'Owner' instead of 'Lead'. These get mapped.", width: 40 },
    { title: "Access granted?", hint: "Has the owner given the automation access (an API token or an invite)?" },
    { title: "Connected", hint: "Filled in when the board is live in the automation." },
    { title: "Notes", hint: "Anything odd about this board.", width: 40 },
  ];
  header(ws, defs);
  ws.addRow(["Nigeria", "Nigeria projects 2026", "Monday.com", "https://etk.monday.com/boards/1234567890", "Adaeze Okonkwo", "adaeze@example.com", "Weekly", 4, "Partly", "Owner → Lead; Value → Budget (USD)", "Yes", "", "Example row; delete it"]);
  body(ws);
  list(ws, 3, ["Monday.com", "Asana", "Trello", "Jira", "Google Sheets", "Excel", "Other"]);
  list(ws, 7, ["Daily", "Weekly", "Monthly", "Rarely"]);
  list(ws, 9, ["Yes", "Partly", "No"]);
  list(ws, 11, ["Yes", "No"]);
  list(ws, 12, ["Yes", "No"]);
  await wb.xlsx.writeFile(file);
}
