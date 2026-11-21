import type { SourceConfig } from "../config.js";
import type { RawItem } from "../standard.js";
import { env, getJson, type Fetcher } from "./index.js";

type Task = { gid: string; name: string; modified_at?: string; custom_fields?: { name: string; display_value: string | null }[] };
type Resp = { data: Task[]; next_page: { offset: string } | null };

/** Asana: every task in the project, with its custom fields as columns. */
export async function fetchAsana(src: Extract<SourceConfig, { tool: "asana" }>, f: Fetcher): Promise<RawItem[]> {
  const headers = { Authorization: `Bearer ${env(src.tokenEnv)}`, Accept: "application/json" };
  const out: RawItem[] = [];
  let offset: string | null = null;
  do {
    const q = new URLSearchParams({ opt_fields: "name,modified_at,custom_fields.name,custom_fields.display_value", limit: "100" });
    if (offset) q.set("offset", offset);
    const r: Resp = await getJson<Resp>(f, "Asana", `https://app.asana.com/api/1.0/projects/${encodeURIComponent(src.projectGid)}/tasks?${q}`, { headers });
    for (const t of r.data) out.push({ id: t.gid, name: t.name, updatedAt: t.modified_at, fields: { Project: t.name, ...Object.fromEntries((t.custom_fields ?? []).map(c => [c.name, c.display_value ?? ""])) } });
    offset = r.next_page?.offset ?? null;
  } while (offset);
  return out;
}
