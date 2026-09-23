"use client";

// Spreadsheet-style entry grid: rows are parameters, columns are dates.
// Cells save on blur or Enter; clearing a cell deletes that entry.
// Arrow keys move between cells; Escape reverts an unsaved edit.

import { useEffect, useMemo, useRef, useState } from "react";
import { CONFIDENCE, LEVEL_LABELS, type Level } from "@/lib/constants";
import { formatDate, formatMonth, formatShortDate, parseDate } from "@/lib/format";
import { saveCell, type CellEntry } from "@/server/entry-actions";

export interface GridRow {
  id: string;
  name: string;
  unit: string;
  level: string;
  measureType: string;
}

type CellState = "saving" | "error";

const key = (parameterId: string, date: string) => `${parameterId}|${date}`;

function columnLabel(iso: string) {
  const d = new Date(iso);
  return d.getUTCDate() === 1 ? formatMonth(d) : formatShortDate(d);
}

function parseValue(raw: string): number | null | "invalid" {
  const t = raw.trim().replace(/[,£$€%\s]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : "invalid";
}

export function EntryGrid({
  projectId,
  rows,
  initialColumns,
  initialCells,
}: {
  projectId: string;
  rows: GridRow[];
  initialColumns: string[];
  initialCells: Record<string, CellEntry>;
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [cells, setCells] = useState(initialCells);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cellState, setCellState] = useState<Record<string, CellState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [defaultConfidence, setDefaultConfidence] = useState<string>("measured");
  const [newColumn, setNewColumn] = useState("");
  const inputs = useRef(new Map<string, HTMLInputElement>());

  // Pick up server changes (single-entry form, other tabs) without remounting,
  // so focus and unsaved drafts are kept.
  useEffect(() => {
    setCells(initialCells);
    setColumns((cols) => [...new Set([...cols, ...initialColumns])].sort());
  }, [initialCells, initialColumns]);

  const grouped = useMemo(() => {
    const out: { level: string; rows: { row: GridRow; index: number }[] }[] = [];
    rows.forEach((row, index) => {
      const last = out[out.length - 1];
      if (last && last.level === row.level) last.rows.push({ row, index });
      else out.push({ level: row.level, rows: [{ row, index }] });
    });
    return out;
  }, [rows]);

  const shown = (k: string) => drafts[k] ?? (cells[k] ? String(cells[k].value) : "");

  async function commit(r: number, c: number, meta: { confidence?: string; note?: string } = {}) {
    const row = rows[r];
    const date = columns[c];
    const k = key(row.id, date);
    const draft = drafts[k];
    const existing = cells[k];
    const hasMeta = meta.confidence !== undefined || meta.note !== undefined;
    if (draft === undefined && !hasMeta) return;

    const parsed = draft === undefined ? (existing?.value ?? null) : parseValue(draft);
    if (parsed === "invalid") {
      setCellState((s) => ({ ...s, [k]: "error" }));
      setErrors((e) => ({ ...e, [k]: "Enter a number" }));
      return;
    }
    if (!hasMeta && parsed === (existing?.value ?? null)) {
      setDrafts(({ [k]: _, ...rest }) => rest);
      return;
    }
    if (parsed === null && hasMeta) return; // nothing to attach metadata to

    setCellState((s) => ({ ...s, [k]: "saving" }));
    const result = await saveCell(projectId, row.id, date, parsed, {
      confidence: meta.confidence ?? (existing ? undefined : defaultConfidence),
      note: meta.note,
    });
    if (result.ok) {
      setCells(({ [k]: _, ...rest }) => (result.entry ? { ...rest, [k]: result.entry } : rest));
      setDrafts(({ [k]: _, ...rest }) => rest);
      setCellState(({ [k]: _, ...rest }) => rest);
      setErrors(({ [k]: _, ...rest }) => rest);
    } else {
      setCellState((s) => ({ ...s, [k]: "error" }));
      setErrors((e) => ({ ...e, [k]: result.error }));
    }
  }

  function focusCell(r: number, c: number) {
    if (r < 0 || r >= rows.length || c < 0 || c >= columns.length) return;
    const el = inputs.current.get(`${r}:${c}`);
    el?.focus();
    el?.select();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) {
    const el = e.currentTarget;
    const k = key(rows[r].id, columns[c]);
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length;
    const allSelected = el.selectionStart === 0 && el.selectionEnd === el.value.length;
    if (e.key === "Enter") {
      // Moving focus triggers blur, which saves. At the edge, blur in place.
      e.preventDefault();
      const next = r + (e.shiftKey ? -1 : 1);
      if (next < 0 || next >= rows.length) el.blur();
      else focusCell(next, c);
    } else if (e.key === "Escape") {
      setDrafts(({ [k]: _, ...rest }) => rest);
      setCellState(({ [k]: _, ...rest }) => rest);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(r + (e.key === "ArrowDown" ? 1 : -1), c);
    } else if (e.key === "ArrowLeft" && (atStart || allSelected)) {
      e.preventDefault();
      focusCell(r, c - 1);
    } else if (e.key === "ArrowRight" && (atEnd || allSelected)) {
      e.preventDefault();
      focusCell(r, c + 1);
    }
  }

  function addColumn() {
    const d = parseDate(newColumn);
    if (!d) return;
    const iso = d.toISOString();
    if (!columns.includes(iso)) setColumns((cols) => [...cols, iso].sort());
    setNewColumn("");
  }

  const sel = selected && rows[selected.r] && columns[selected.c] ? selected : null;
  const selKey = sel ? key(rows[sel.r].id, columns[sel.c]) : null;
  const selEntry = selKey ? cells[selKey] : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-ink-2">Confidence for new values</span>
          <select className="input w-auto py-1" value={defaultConfidence} onChange={(e) => setDefaultConfidence(e.target.value)}>
            {CONFIDENCE.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input w-auto py-1"
            value={newColumn}
            onChange={(e) => setNewColumn(e.target.value)}
            aria-label="New date column"
          />
          <button type="button" className="btn-secondary py-1" onClick={addColumn} disabled={!newColumn}>
            Add date column
          </button>
        </div>
        <p className="text-xs text-muted">Enter or ↓ saves and moves down · Esc undoes · clear a cell to delete it</p>
      </div>

      <div className="card overflow-auto">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-64 border-b border-r border-line bg-surface px-3 py-2 text-left text-xs font-medium text-muted">
                Parameter
              </th>
              {columns.map((c) => (
                <th key={c} className="sticky top-0 z-10 min-w-24 border-b border-line bg-surface px-2 py-2 text-right text-xs font-medium text-muted" title={formatDate(c)}>
                  {columnLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <Group key={g.level} level={g.level} span={columns.length + 1}>
                {g.rows.map(({ row, index: r }) => (
                  <tr key={row.id}>
                    <th scope="row" className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-1.5 text-left font-normal">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted">
                        {row.unit}
                        {row.measureType === "cumulative" && " · per period, added up"}
                      </div>
                    </th>
                    {columns.map((date, c) => {
                      const k = key(row.id, date);
                      const state = cellState[k];
                      const entry = cells[k];
                      const isSel = sel?.r === r && sel?.c === c;
                      return (
                        <td key={date} className={`border-b border-line p-0 ${isSel ? "bg-accent-soft/30" : ""}`}>
                          <input
                            ref={(el) => {
                              if (el) inputs.current.set(`${r}:${c}`, el);
                              else inputs.current.delete(`${r}:${c}`);
                            }}
                            value={shown(k)}
                            inputMode="decimal"
                            aria-label={`${row.name}, ${formatDate(date)}`}
                            title={
                              errors[k] ??
                              (entry ? `${entry.confidence}${entry.note ? ` · ${entry.note}` : ""}${entry.loggedBy ? ` · by ${entry.loggedBy}` : ""}` : "")
                            }
                            onChange={(e) => setDrafts((d) => ({ ...d, [k]: e.target.value }))}
                            onFocus={(e) => {
                              setSelected({ r, c });
                              e.currentTarget.select();
                            }}
                            onBlur={() => void commit(r, c)}
                            onKeyDown={(e) => onKeyDown(e, r, c)}
                            className={`tabular h-9 w-full min-w-24 bg-transparent px-2 text-right outline-none focus:ring-2 focus:ring-inset focus:ring-accent ${
                              state === "error" ? "ring-2 ring-inset ring-critical" : ""
                            } ${state === "saving" ? "text-muted" : ""} ${entry && entry.confidence !== "measured" ? "italic" : ""}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Group>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Values in italics are not directly measured (self-reported, estimated or modelled).</p>

      {sel && (
        <CellDetails
          key={selKey}
          rowName={rows[sel.r].name}
          date={columns[sel.c]}
          entry={selEntry}
          error={selKey ? errors[selKey] : undefined}
          onSave={(meta) => commit(sel.r, sel.c, meta)}
        />
      )}
    </div>
  );
}

function Group({ level, span, children }: { level: string; span: number; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={span} className="border-b border-line bg-surface-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-2">
          <span className="sticky left-3">{LEVEL_LABELS[level as Level] ?? level}</span>
        </td>
      </tr>
      {children}
    </>
  );
}

function CellDetails({
  rowName,
  date,
  entry,
  error,
  onSave,
}: {
  rowName: string;
  date: string;
  entry?: CellEntry;
  error?: string;
  onSave: (meta: { confidence?: string; note?: string }) => void;
}) {
  const [note, setNote] = useState(entry?.note ?? "");
  return (
    <div className="card flex flex-wrap items-end gap-4 p-4 text-sm">
      <div className="min-w-48">
        <div className="font-medium">{rowName}</div>
        <div className="text-xs text-muted">
          {formatDate(date)}
          {entry?.loggedBy && <> · last saved by {entry.loggedBy}</>}
        </div>
        {error && <div className="text-xs text-critical-ink">{error}</div>}
      </div>
      {entry ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-2">Confidence</span>
            <select className="input w-auto py-1" value={entry.confidence} onChange={(e) => onSave({ confidence: e.target.value })}>
              {CONFIDENCE.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-64 flex-1 flex-col gap-1">
            <span className="text-xs text-ink-2">Note</span>
            <input
              className="input py-1"
              value={note}
              placeholder="Add context, e.g. source or caveats"
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => note !== entry.note && onSave({ note })}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </label>
        </>
      ) : (
        <span className="text-xs text-muted">Enter a value to add confidence and a note.</span>
      )}
    </div>
  );
}
