"use client";

import { useState, useTransition } from "react";
import { formatDate, formatNumber } from "@/lib/format";
import { importCampaignCsv, type CampaignImportResult } from "@/server/campaign-actions";

const EXAMPLE = `campaign,date,metric,value
utm_campaign=toolkit_launch,2026-06-01,clicks,210
Newsroom Futures roadshow,2026-09-01,attendees,120`;

export function CampaignImport({ projectId }: { projectId: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<CampaignImportResult | null>(null);
  const [pending, start] = useTransition();
  const valid = result?.rows.filter((r) => !r.error).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-5">
        <p className="text-sm text-ink-2">
          Columns: <code>campaign, date, metric, value</code>. The campaign column can be the campaign name or its tracking tag, which suits exports
          from ad platforms and email tools. Existing values for the same campaign, date and metric are replaced.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-secondary cursor-pointer">
            Choose file
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setText(await f.text()); setResult(null); } }} />
          </label>
          <button type="button" className="btn-ghost" onClick={() => setText(EXAMPLE)}>
            Insert example
          </button>
        </div>
        <textarea className="input font-mono text-xs" rows={7} value={text} placeholder={EXAMPLE} onChange={(e) => { setText(e.target.value); setResult(null); }} />
        <button className="btn-primary" disabled={!text.trim() || pending} onClick={() => start(async () => setResult(await importCampaignCsv(projectId, text, false)))}>
          Preview import
        </button>
      </div>
      {result?.error && <div className="card p-4 text-sm text-critical-ink">{result.error}</div>}
      {result?.written !== undefined && <div className="card p-4 text-sm">Imported {result.written} values.</div>}
      {result && !result.error && result.written === undefined && (
        <div className="card">
          <div className="flex items-center justify-between border-b border-line p-4 text-sm">
            <span>
              <strong>{valid}</strong> rows ready{result.rows.length > valid && <span className="text-critical-ink"> · {result.rows.length - valid} with problems</span>}
            </span>
            <button className="btn-primary" disabled={!valid || pending} onClick={() => start(async () => { setResult(await importCampaignCsv(projectId, text, true)); setText(""); })}>
              Import {valid} rows
            </button>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {result.rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-1.5 text-muted">{r.line}</td>
                  <td className="px-4 py-1.5">{r.campaignName}</td>
                  <td className="px-4 py-1.5">{r.date ? formatDate(r.date) : "–"}</td>
                  <td className="px-4 py-1.5">{r.metric}</td>
                  <td className="tabular px-4 py-1.5 text-right">{formatNumber(r.value)}</td>
                  <td className="px-4 py-1.5">{r.error ? <span className="text-critical-ink">{r.error}</span> : <span className="text-good-ink">OK</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
