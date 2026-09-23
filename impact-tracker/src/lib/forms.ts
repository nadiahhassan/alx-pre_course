// Small helpers for reading and validating FormData in server actions.

import { parseDate } from "./format";

export type FieldErrors = Record<string, string>;

export interface FormState {
  errors?: FieldErrors;
  message?: string;
}

export class FormReader {
  errors: FieldErrors = {};
  constructor(private fd: FormData) {}

  text(name: string, opts: { required?: boolean; max?: number } = {}): string {
    const v = String(this.fd.get(name) ?? "").trim();
    if (opts.required && !v) this.errors[name] = "Required";
    else if (opts.max && v.length > opts.max) this.errors[name] = `Keep this under ${opts.max} characters`;
    return v;
  }

  number(name: string, opts: { required?: boolean; min?: number } = {}): number | null {
    const raw = String(this.fd.get(name) ?? "").trim().replace(/,/g, "");
    if (!raw) {
      if (opts.required) this.errors[name] = "Required";
      return null;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      this.errors[name] = "Enter a number";
      return null;
    }
    if (opts.min !== undefined && n < opts.min) this.errors[name] = `Must be at least ${opts.min}`;
    return n;
  }

  date(name: string, opts: { required?: boolean } = {}): Date | null {
    const raw = String(this.fd.get(name) ?? "").trim();
    if (!raw) {
      if (opts.required) this.errors[name] = "Required";
      return null;
    }
    const d = parseDate(raw);
    if (!d) this.errors[name] = "Enter a valid date";
    return d;
  }

  oneOf<T extends readonly string[]>(name: string, list: T, fallback: T[number]): T[number] {
    const v = String(this.fd.get(name) ?? "");
    if (!v) return fallback;
    if (!(list as readonly string[]).includes(v)) {
      this.errors[name] = "Choose an option";
      return fallback;
    }
    return v as T[number];
  }

  bool(name: string): boolean {
    return this.fd.get(name) === "on" || this.fd.get(name) === "true";
  }

  get ok() {
    return Object.keys(this.errors).length === 0;
  }
}
