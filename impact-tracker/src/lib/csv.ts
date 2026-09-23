// CSV import for entries. Two layouts are accepted:
//
//   Long:  parameter,date,value[,confidence][,note]   (one row per value)
//   Wide:  parameter,2026-04-01,2026-05-01,...         (the grid layout)
//
// Parameters are matched by name (case-insensitive) or id.

import Papa from "papaparse";
import { normalizeMetricName } from "./campaigns";
import { CONFIDENCE, isOneOf } from "./constants";
import { parseDate } from "./format";

export interface CsvRow {
  line: number;
  parameterName: string;
  parameterId: string | null;
  date: string | null; // ISO
  value: number | null;
  confidence: string;
  note: string;
  error: string | null;
}

export interface CsvResult {
  format: "long" | "wide" | "unknown";
  rows: CsvRow[];
  error: string | null;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function parseEntriesCsv(
  text: string,
  parameters: { id: string; name: string }[],
  defaultConfidence = "measured",
): CsvResult {
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: "greedy" });
  const [header, ...body] = parsed.data;
  if (!header || header.length < 2) {
    return { format: "unknown", rows: [], error: "The file needs a header row and at least two columns." };
  }

  const byName = new Map(parameters.map((p) => [norm(p.name), p.id]));
  const ids = new Set(parameters.map((p) => p.id));
  const findParam = (s: string) => byName.get(norm(s)) ?? (ids.has(s.trim()) ? s.trim() : null);

  const cols = header.map(norm);
  const iParam = cols.findIndex((c) => c === "parameter" || c === "metric" || c === "name");
  const iDate = cols.indexOf("date");
  const iValue = cols.indexOf("value");

  const makeRow = (line: number, name: string, dateRaw: string, valueRaw: string, confRaw = "", note = ""): CsvRow => {
    const parameterId = findParam(name);
    const date = parseDate(dateRaw);
    const cleaned = valueRaw.trim().replace(/[,£$€%]/g, "");
    const value = cleaned === "" ? null : Number(cleaned);
    const confidence = confRaw.trim().toLowerCase() || defaultConfidence;
    let error: string | null = null;
    if (!name.trim()) error = "Missing parameter";
    else if (!parameterId) error = `Unknown parameter “${name.trim()}”`;
    else if (!date) error = `Invalid date “${dateRaw}” (use YYYY-MM-DD)`;
    else if (value === null || !Number.isFinite(value)) error = `Invalid value “${valueRaw}”`;
    else if (!isOneOf(CONFIDENCE, confidence)) error = `Unknown confidence “${confRaw}”`;
    return {
      line,
      parameterName: name.trim(),
      parameterId,
      date: date?.toISOString() ?? null,
      value: value !== null && Number.isFinite(value) ? value : null,
      confidence,
      note: note.trim(),
      error,
    };
  };

  if (iParam >= 0 && iDate >= 0 && iValue >= 0) {
    const iConf = cols.indexOf("confidence");
    const iNote = cols.indexOf("note");
    const rows = body.map((r, i) =>
      makeRow(i + 2, r[iParam] ?? "", r[iDate] ?? "", r[iValue] ?? "", iConf >= 0 ? r[iConf] : "", iNote >= 0 ? r[iNote] : ""),
    );
    return { format: "long", rows, error: null };
  }

  // Wide: first column is the parameter, remaining headers are dates. Blank cells are skipped.
  const dateCols = header.slice(1).map((h) => parseDate(h));
  const badHeader = dateCols.findIndex((d) => !d);
  if (badHeader >= 0) {
    return {
      format: "unknown",
      rows: [],
      error: `Couldn't read column “${header[badHeader + 1]}”. Use either columns parameter,date,value or parameter followed by date columns (YYYY-MM-DD).`,
    };
  }
  const rows: CsvRow[] = [];
  body.forEach((r, i) => {
    header.slice(1).forEach((h, j) => {
      const cell = r[j + 1] ?? "";
      if (cell.trim() === "") return;
      rows.push(makeRow(i + 2, r[0] ?? "", h, cell));
    });
  });
  return { format: "wide", rows, error: null };
}

export function toCsv(rows: (string | number)[][]): string {
  return Papa.unparse(rows);
}

export interface CampaignCsvRow {
  line: number;
  campaignName: string;
  campaignId: string | null;
  date: string | null;
  metric: string;
  value: number | null;
  error: string | null;
}

/**
 * Campaign metrics CSV: campaign,date,metric,value. The campaign column
 * matches a campaign name or tracking tag (case-insensitive).
 */
export function parseCampaignCsv(
  text: string,
  campaigns: { id: string; name: string; trackingTag: string }[],
): { rows: CampaignCsvRow[]; error: string | null } {
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: "greedy" });
  const [header, ...body] = parsed.data;
  const cols = (header ?? []).map(norm);
  const iC = cols.findIndex((c) => c === "campaign" || c === "tracking tag" || c === "tag");
  const iD = cols.indexOf("date");
  const iM = cols.indexOf("metric");
  const iV = cols.indexOf("value");
  if (iC < 0 || iD < 0 || iM < 0 || iV < 0) {
    return { rows: [], error: "The header must include campaign, date, metric and value columns." };
  }
  const lookup = new Map<string, string>();
  for (const c of campaigns) {
    lookup.set(norm(c.name), c.id);
    if (c.trackingTag) lookup.set(norm(c.trackingTag), c.id);
  }
  const rows = body.map((r, i): CampaignCsvRow => {
    const name = (r[iC] ?? "").trim();
    const campaignId = lookup.get(norm(name)) ?? null;
    const date = parseDate(r[iD] ?? "");
    const metric = normalizeMetricName(r[iM] ?? "");
    const raw = (r[iV] ?? "").trim().replace(/[,£$€%]/g, "");
    const value = raw === "" ? null : Number(raw);
    let error: string | null = null;
    if (!campaignId) error = `Unknown campaign “${name}”`;
    else if (!date) error = `Invalid date “${r[iD] ?? ""}”`;
    else if (!metric) error = "Missing metric name";
    else if (value === null || !Number.isFinite(value)) error = `Invalid value “${r[iV] ?? ""}”`;
    return {
      line: i + 2,
      campaignName: name,
      campaignId,
      date: date?.toISOString() ?? null,
      metric,
      value: value !== null && Number.isFinite(value) ? value : null,
      error,
    };
  });
  return { rows, error: null };
}
