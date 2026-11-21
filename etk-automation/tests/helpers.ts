import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Config } from "../src/config.js";

export function tmpConfig(over: Partial<Config> = {}): Config {
  const dir = mkdtempSync(path.join(os.tmpdir(), "etk-"));
  return { organisation: "Test org", boards: [], people: [], paths: { data: "data", inbox: "inbox", reports: "reports", exports: "exports" }, reports: { recipients: [] }, ai: { model: "claude-opus-5-5" }, dir, ...over };
}

/** A fake fetch that answers by URL prefix and records each request. */
export function fakeFetch(routes: [RegExp, (url: string, init?: RequestInit) => unknown][]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const r = routes.find(([re]) => re.test(url));
    if (!r) return new Response("not found", { status: 404 });
    const body = r[1](url, init);
    return typeof body === "string" ? new Response(body) : Response.json(body);
  }) as typeof fetch;
  return { f, calls };
}
