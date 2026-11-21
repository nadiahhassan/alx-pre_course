import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { resolvePath, type Config, type SourceConfig } from "../config.js";
import type { RawItem } from "../standard.js";
import { getText, type Fetcher } from "./http.js";

/** Minimal CSV reader that handles quoted fields, commas and new lines inside quotes. */
export function parseCsv(textIn: string): string[][] {
  const t = textIn.replace(/^﻿/, "");
  const rows: string[][] = []; let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim()));
}

export function rowsToItems(rows: unknown[][]): RawItem[] {
  const [head, ...body] = rows;
  if (!head) return [];
  const titles = head.map(h => String(h ?? "").trim());
  return body.map((r, k) => ({ id: `row-${k + 2}`, fields: Object.fromEntries(titles.map((t, c) => [t, r[c] ?? ""]).filter(([t]) => t)) }));
}

async function readXlsx(buf: Buffer, sheet?: string): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = sheet ? wb.getWorksheet(sheet) : wb.worksheets.find(w => w.state === "visible" && !/^read ?me$/i.test(w.name)) ?? wb.worksheets[0];
  if (!ws) throw new Error(`Sheet “${sheet}” wasn't found in the workbook.`);
  const rows: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, row => {
    const vals = (row.values as unknown[]).slice(1).map(v => {
      if (v && typeof v === "object" && !(v instanceof Date)) {
        const o = v as { result?: unknown; text?: unknown; richText?: { text: string }[] };
        return o.result ?? o.text ?? o.richText?.map(x => x.text).join("") ?? "";
      }
      return v;
    });
    rows.push(vals);
  });
  return rows;
}

/** A local .xlsx/.csv file, or a Google Sheet published as CSV (File > Share > Publish to web > CSV). */
export async function fetchSheet(cfg: Config, src: Extract<SourceConfig, { tool: "sheet" }>, f: Fetcher): Promise<RawItem[]> {
  if (src.url) return rowsToItems(parseCsv(await getText(f, src.url)));
  if (!src.path) throw new Error("A sheet board needs a path or a url.");
  const file = resolvePath(cfg, src.path);
  if (/\.csv$/i.test(file)) return rowsToItems(parseCsv(readFileSync(file, "utf8")));
  return rowsToItems(await readXlsx(readFileSync(file), src.sheet));
}
