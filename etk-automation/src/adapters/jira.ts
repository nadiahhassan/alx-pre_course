import type { SourceConfig } from "../config.js";
import type { RawItem } from "../standard.js";
import { env, getJson, type Fetcher } from "./index.js";

type Issue = { id: string; key: string; fields: Record<string, unknown> };
type Resp = { issues: Issue[]; names?: Record<string, string>; nextPageToken?: string; isLast?: boolean };

/** Flattens Jira field values (options, users, arrays, numbers) into plain text. */
function flat(v: unknown): unknown {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return v;
  if (Array.isArray(v)) return v.map(x => String(flat(x))).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["value", "displayName", "name"]) if (typeof o[k] === "string") return o[k];
    if (o.type === "doc") return ""; // rich-text body, not a column
  }
  return "";
}

/** Jira Cloud: every issue matching the board's JQL, with field names (including custom fields) as columns. */
export async function fetchJira(src: Extract<SourceConfig, { tool: "jira" }>, f: Fetcher): Promise<RawItem[]> {
  const headers = { Authorization: "Basic " + Buffer.from(`${env(src.emailEnv)}:${env(src.tokenEnv)}`).toString("base64"), Accept: "application/json" };
  const out: RawItem[] = [];
  let token: string | undefined;
  do {
    const q = new URLSearchParams({ jql: src.jql, fields: "*all", expand: "names", maxResults: "100" });
    if (token) q.set("nextPageToken", token);
    const r = await getJson<Resp>(f, "Jira", `https://${src.site.replace(/^https?:\/\//, "")}/rest/api/3/search/jql?${q}`, { headers });
    const names = r.names ?? {};
    for (const i of r.issues) {
      const fields: Record<string, unknown> = { Project: i.fields.summary ?? i.key };
      for (const [id, v] of Object.entries(i.fields)) fields[names[id] ?? id] = flat(v);
      out.push({ id: i.key, name: String(i.fields.summary ?? i.key), updatedAt: typeof i.fields.updated === "string" ? i.fields.updated : undefined, fields });
    }
    token = r.isLast === false || (r.isLast == null && r.nextPageToken) ? r.nextPageToken : undefined;
  } while (token);
  return out;
}
