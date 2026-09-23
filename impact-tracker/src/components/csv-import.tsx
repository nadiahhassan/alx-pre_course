"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CONFIDENCE } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { importEntriesCsv, type ImportPreview } from "@/server/entry-actions";

const EXAMPLE = `parameter,date,value,confidence,note
Journalists trained,2026-10-01,25,measured,
Reader trust score,2026-10-01,6.6,self-reported,Autumn survey`;

export function CsvImport({ projectId, parameterNames }: { projectId: string; parameterNames: string[] }) {
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState("measured");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [done, setDone] = useState<ImportPreview | null>(null);
  const [pending, start] = useTransition();

  const valid = preview?.rows.filter((r) => !r.error).length ?? 0;
  const invalid = (preview?.rows.length ?? 0) - valid;

  function run(commit: boolean) {
    start(async () => {
      const result = await importEntriesCsv(projectId, text, confidence, commit);
      if (commit) {
        setDone(result);
        setPreview(null);
        setText("");
      } else {
        setPreview(result);
        setDone(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-5">
        <div className="text-sm text-ink-2">
          <p>Two layouts work:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">Long</strong>: columns <code>parameter, date, value</code>, and optionally{" "}
              <code>confidence</code> and <code>note</code>. This is what Export CSV produces.
            </li>
            <li>
              <strong className="text-ink">Wide</strong> (like the grid): first column is the parameter name, other column headers are dates.
            </li>
          </ul>
          <p className="mt-2">
            Dates as YYYY-MM-DD or DD/MM/YYYY. Existing values for the same parameter and date are replaced.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-secondary cursor-pointer">
            Choose file
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setText(await file.text());
                  setPreview(null);
                }
              }}
            />
          </label>
          <span className="text-sm text-muted">or paste below</span>
          <button type="button" className="btn-ghost" onClick={() => setText(EXAMPLE)}>
            Insert example
          </button>
        </div>
        <textarea
          className="input font-mono text-xs"
          rows={8}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
          placeholder={EXAMPLE}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-ink-2">Confidence when the file has none</span>
            <select className="input w-auto py-1" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
              {CONFIDENCE.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" disabled={!text.trim() || pending} onClick={() => run(false)}>
            {pending && !preview ? "Checking…" : "Preview import"}
          </button>
        </div>
        <details className="text-xs text-muted">
          <summary className="cursor-pointer">Parameter names in this project</summary>
          <p className="mt-1">{parameterNames.join(" · ")}</p>
        </details>
      </div>

      {done && (
        <div className="card border-good/40 p-4 text-sm">
          Imported {done.created} new and updated {done.updated} existing values
          {done.rows.some((r) => r.error) && `; skipped ${done.rows.filter((r) => r.error).length} rows with problems`}.{" "}
          <Link href={`/projects/${projectId}/data`} className="text-accent-ink underline">
            Back to the grid
          </Link>
        </div>
      )}

      {preview?.error && <div className="card p-4 text-sm text-critical-ink">{preview.error}</div>}

      {preview && !preview.error && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <p className="text-sm">
              {preview.format === "wide" ? "Wide" : "Long"} layout · <strong>{valid}</strong> rows ready
              {invalid > 0 && (
                <>
                  {" "}
                  · <span className="text-critical-ink">{invalid} with problems (will be skipped)</span>
                </>
              )}
            </p>
            <button className="btn-primary" disabled={!valid || pending} onClick={() => run(true)}>
              {pending ? "Importing…" : `Import ${valid} rows`}
            </button>
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Line</th>
                  <th className="px-4 py-2 font-medium">Parameter</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 text-right font-medium">Value</th>
                  <th className="px-4 py-2 font-medium">Confidence</th>
                  <th className="px-4 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="tabular px-4 py-1.5 text-muted">{r.line}</td>
                    <td className="px-4 py-1.5">{r.parameterName}</td>
                    <td className="px-4 py-1.5">{r.date ? formatDate(r.date) : "–"}</td>
                    <td className="tabular px-4 py-1.5 text-right">{formatNumber(r.value)}</td>
                    <td className="px-4 py-1.5 capitalize">{r.confidence}</td>
                    <td className="px-4 py-1.5">
                      {r.error ? (
                        <span className="text-critical-ink">{r.error}</span>
                      ) : r.action === "update" ? (
                        <span className="text-warning-ink">Replaces existing value</span>
                      ) : (
                        <span className="text-good-ink">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
