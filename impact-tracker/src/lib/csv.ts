// CSV import for entries. Two layouts are accepted:
//
//   Long:  parameter,date,value[,confidence][,note]   (one row per value)
//   Wide:  parameter,2026-04-01,2026-05-01,...         (the grid layout)
//
// Parameters are matched by name (case-insensitive) or id.

import Papa from "papaparse";
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
