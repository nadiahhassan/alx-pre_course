"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { RESPONSIBILITY_STATUSES } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import {
  deleteDecision, deleteResponsibility, deleteRisk, deleteSpend, importSpendCsv, setResponsibilityStatus, type SpendImportResult,
} from "@/server/operations-actions";

export function OperationsTabs() {
  const path = usePathname();
  const tabs = [
    ["/operations", "Overview"],
    ["/operations/budget", "Budget & spend"],
    ["/operations/responsibilities", "Responsibilities"],
    ["/operations/risks", "Risks"],
    ["/operations/decisions", "Decisions"],
  ];
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line text-sm print:hidden">
      {tabs.map(([href, label]) => {
        const active = href === "/operations" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 ${active ? "border-accent font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const label = (s: string) => s[0].toUpperCase() + s.slice(1).replace(/-/g, " ");

/** Status dropdown on a responsibility row. Marking a repeating item done shows when the next one is due. */
export function ResponsibilityStatus({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <select
        aria-label="Status"
        className="input w-auto py-1 text-xs"
        defaultValue={status}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const r = await setResponsibilityStatus(id, e.target.value);
            setNote(r.next ? `Next one due ${formatDate(r.next)}` : "");
          })
        }
      >
        {RESPONSIBILITY_STATUSES.map((s) => (
          <option key={s} value={s}>
            {label(s)}
          </option>
        ))}
      </select>
      {note && <span className="text-xs text-good-ink">{note}</span>}
    </span>
  );
}

const DELETE = { spend: deleteSpend, responsibility: deleteResponsibility, risk: deleteRisk, decision: deleteDecision };

export function DeleteButton({ kind, id }: { kind: keyof typeof DELETE; id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn-ghost px-2 py-1" disabled={pending} onClick={() => confirm("Delete this item?") && start(() => DELETE[kind](id))}>
      Delete
    </button>
  );
}

const EXAMPLE = `date,initiative,amount,category,status,description,reference
2026-09-30,Newsroom Digital Skills Training,18000,grants,actual,September grant tranche,FIN-2291
2026-10-15,Newsroom Digital Skills Training,9500,events,committed,Venue for cohort 7,PO-5530
2026-09-30,Newsroom Champions (internal),2100,staff,actual,Session facilitation,FIN-2295`;

export function SpendImport() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<SpendImportResult | null>(null);
  const [pending, start] = useTransition();
  const valid = result?.rows.filter((r) => !r.error).length ?? 0;
  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-5">
        <p className="text-sm text-ink-2">
          Paste or upload a finance export with columns <code>date, initiative, amount</code>, and optionally <code>category</code>, <code>status</code>{" "}
          (actual or committed), <code>description</code> and <code>reference</code>. Each row is added as a new spend line.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-secondary cursor-pointer">
            Choose file
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setText(await f.text()); setResult(null); } }} />
          </label>
          <button type="button" className="btn-ghost" onClick={() => { setText(EXAMPLE); setResult(null); }}>
            Insert example
          </button>
        </div>
        <textarea className="input font-mono text-xs" rows={7} value={text} placeholder={EXAMPLE} onChange={(e) => { setText(e.target.value); setResult(null); }} />
        <button className="btn-primary" disabled={!text.trim() || pending} onClick={() => start(async () => setResult(await importSpendCsv(text, false)))}>
          Preview import
        </button>
      </div>
      {result?.error && <div className="card p-4 text-sm text-critical-ink">{result.error}</div>}
      {result?.written !== undefined && (
        <div className="card p-4 text-sm">
          Imported {result.written} spend lines.{" "}
          <Link href="/operations/budget" className="text-accent-ink underline">
            Back to budget
          </Link>
        </div>
      )}
      {result && !result.error && result.written === undefined && (
        <div className="card">
          <div className="flex items-center justify-between border-b border-line p-4 text-sm">
            <span>
              <strong>{valid}</strong> rows ready{result.rows.length > valid && <span className="text-critical-ink"> · {result.rows.length - valid} with problems (will be skipped)</span>}
            </span>
            <button className="btn-primary" disabled={!valid || pending} onClick={() => start(async () => { setResult(await importSpendCsv(text, true)); setText(""); })}>
              Import {valid} rows
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {result.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-1.5 text-muted">{r.line}</td>
                    <td className="px-4 py-1.5">{r.date ? formatDate(r.date) : "–"}</td>
                    <td className="px-4 py-1.5">{r.initiative}</td>
                    <td className="tabular px-4 py-1.5 text-right">{formatNumber(r.amount)}</td>
                    <td className="px-4 py-1.5">{r.category} · {r.status}</td>
                    <td className="px-4 py-1.5">{r.error ? <span className="text-critical-ink">{r.error}</span> : <span className="text-good-ink">OK</span>}</td>
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
