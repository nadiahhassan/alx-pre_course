// Display and parsing helpers. All day-level dates are UTC midnight.

const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const rounded = [0, 1, 2].map((d) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: d }));

/** `round` trims derived figures (e.g. expected values) to a sensible precision. */
export function formatNumber(n: number | null | undefined, opts: { compact?: boolean; round?: boolean } = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  if (opts.compact && Math.abs(n) >= 10000) return compact.format(n);
  if (opts.round) return rounded[Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2].format(n);
  return plain.format(n);
}

/** Value with its unit: "£180K", "33%", "148 people". */
export function formatValue(n: number | null | undefined, unit: string, opts: { compact?: boolean; round?: boolean } = {}): string {
  const v = formatNumber(n, opts);
  if (v === "–") return v;
  if (unit === "£" || unit === "$" || unit === "€") return `${unit}${v}`;
  if (unit === "%") return `${v}%`;
  return unit ? `${v} ${unit}` : v;
}

export function formatPercent(fraction: number | null | undefined): string {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return "–";
  return `${Math.round(fraction * 100)}%`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "–";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatShortDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatMonth(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
}

/** yyyy-mm-dd for <input type="date">. */
export function toDateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

/** Parse yyyy-mm-dd (or d/m/yyyy) to UTC midnight. Returns null if invalid. */
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const t = s.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return utc(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) return utc(+m[3], +m[2], +m[1]);
  return null;
}

function utc(y: number, mo: number, day: number): Date | null {
  const d = new Date(Date.UTC(y, mo - 1, day));
  return d.getUTCFullYear() === y && d.getUTCMonth() === mo - 1 && d.getUTCDate() === day ? d : null;
}

/** Today at UTC midnight. */
export function today(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export function currencySymbol(code: string): string {
  return ({ GBP: "£", EUR: "€", USD: "$" } as Record<string, string>)[code] ?? code;
}
