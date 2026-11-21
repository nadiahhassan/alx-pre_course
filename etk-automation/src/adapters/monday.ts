import type { SourceConfig } from "../config.js";
import type { RawItem } from "../standard.js";
import { env, getJson, type Fetcher } from "./index.js";

type Item = { id: string; name: string; updated_at?: string; column_values: { text: string | null; column: { title: string } }[] };
type Page = { cursor: string | null; items: Item[] };
type Resp<T> = { data?: T; errors?: { message: string }[] };

const FIELDS = "cursor items { id name updated_at column_values { text column { title } } }";

/** Monday.com GraphQL API: every item on the board, one page of 500 at a time. */
export async function fetchMonday(src: Extract<SourceConfig, { tool: "monday" }>, f: Fetcher): Promise<RawItem[]> {
  const token = env(src.tokenEnv);
  const call = async <T>(query: string, variables: Record<string, unknown>) => {
    const r = await getJson<Resp<T>>(f, "Monday.com", "https://api.monday.com/v2", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-10" }, body: JSON.stringify({ query, variables }),
    });
    if (r.errors?.length || !r.data) throw new Error(`Monday.com: ${r.errors?.map(e => e.message).join("; ") || "empty response"}`);
    return r.data;
  };
  const first = await call<{ boards: { items_page: Page }[] }>(`query ($ids: [ID!]) { boards(ids: $ids) { items_page(limit: 500) { ${FIELDS} } } }`, { ids: [src.boardId] });
  if (!first.boards.length) throw new Error(`Monday.com: board ${src.boardId} wasn't found or the token can't see it.`);
  const items: Item[] = [...first.boards[0].items_page.items];
  let cursor = first.boards[0].items_page.cursor;
  while (cursor) {
    const next = await call<{ next_items_page: Page }>(`query ($cursor: String!) { next_items_page(limit: 500, cursor: $cursor) { ${FIELDS} } }`, { cursor });
    items.push(...next.next_items_page.items);
    cursor = next.next_items_page.cursor;
  }
  return items.map(i => ({ id: i.id, name: i.name, updatedAt: i.updated_at, fields: Object.fromEntries(i.column_values.map(c => [c.column.title, c.text ?? ""])) }));
}
