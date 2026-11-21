// One adapter per tool. Each fetches a board's items and returns them as column title -> value,
// so the same standard mapping works whatever the tool.

import type { Config, SourceConfig } from "../config.js";
import type { RawItem } from "../standard.js";
import { fetchMonday } from "./monday.js";
import { fetchAsana } from "./asana.js";
import { fetchTrello } from "./trello.js";
import { fetchJira } from "./jira.js";
import { fetchSheet } from "./sheet.js";

export type { Fetcher } from "./http.js";
import type { Fetcher } from "./http.js";

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Set the ${name} environment variable (the board's access token). It is never stored in config.`);
  return v;
}

export async function fetchBoard(cfg: Config, source: SourceConfig, f: Fetcher = fetch): Promise<RawItem[]> {
  switch (source.tool) {
    case "monday": return fetchMonday(source, f);
    case "asana": return fetchAsana(source, f);
    case "trello": return fetchTrello(source, f);
    case "jira": return fetchJira(source, f);
    case "sheet": return fetchSheet(cfg, source, f);
  }
}

/** JSON request with a readable error that names the tool and status. */
export async function getJson<T>(f: Fetcher, tool: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await f(url, init);
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 300);
    const why = res.status === 401 || res.status === 403 ? "the token was refused. Check it has access to this board" : res.status === 404 ? "the board wasn't found. Check its id" : res.status === 429 ? "the tool is rate-limiting us. Try again in a few minutes" : "the request failed";
    throw new Error(`${tool}: ${why} (HTTP ${res.status}). ${body}`);
  }
  return (await res.json()) as T;
}
