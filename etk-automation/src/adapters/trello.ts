import type { SourceConfig } from "../config.js";
import type { RawItem } from "../standard.js";
import { env, getJson, type Fetcher } from "./index.js";

type Field = { id: string; name: string; type: string; options?: { id: string; value: { text: string } }[] };
type Card = { id: string; name: string; dateLastActivity?: string; customFieldItems?: { idCustomField: string; idValue?: string; value?: Record<string, string> }[] };

/** Trello: every open card on the board, with Custom Fields as columns. */
export async function fetchTrello(src: Extract<SourceConfig, { tool: "trello" }>, f: Fetcher): Promise<RawItem[]> {
  const auth = new URLSearchParams({ key: env(src.keyEnv), token: env(src.tokenEnv) });
  const base = `https://api.trello.com/1/boards/${encodeURIComponent(src.boardId)}`;
  const fields = await getJson<Field[]>(f, "Trello", `${base}/customFields?${auth}`);
  const cards = await getJson<Card[]>(f, "Trello", `${base}/cards?customFieldItems=true&fields=name,dateLastActivity&${auth}`);
  const byId = new Map(fields.map(x => [x.id, x]));
  return cards.map(c => {
    const vals: Record<string, unknown> = { Project: c.name };
    for (const it of c.customFieldItems ?? []) {
      const def = byId.get(it.idCustomField);
      if (!def) continue;
      if (def.type === "list") vals[def.name] = def.options?.find(o => o.id === it.idValue)?.value.text ?? "";
      else if (def.type === "checkbox") vals[def.name] = it.value?.checked === "true" ? "Yes" : "";
      else vals[def.name] = it.value?.text ?? it.value?.number ?? it.value?.date ?? "";
    }
    return { id: c.id, name: c.name, updatedAt: c.dateLastActivity, fields: vals };
  });
}
