import { beforeEach, describe, expect, it } from "vitest";
import { fetchBoard } from "../src/adapters/index.js";
import { fakeFetch, tmpConfig } from "./helpers.js";

beforeEach(() => { Object.assign(process.env, { MONDAY_TOKEN: "m", ASANA_TOKEN: "a", TRELLO_KEY: "k", TRELLO_TOKEN: "t", JIRA_EMAIL: "e@x.com", JIRA_TOKEN: "j" }); });
const cfg = tmpConfig();

describe("adapters", () => {
  it("Monday.com: follows the cursor and maps columns by title", async () => {
    let n = 0;
    const { f, calls } = fakeFetch([[/monday\.com/, () => n++ === 0
      ? { data: { boards: [{ items_page: { cursor: "c1", items: [{ id: "1", name: "A", column_values: [{ text: "Nigeria", column: { title: "Country" } }] }] } }] } }
      : { data: { next_items_page: { cursor: null, items: [{ id: "2", name: "B", column_values: [] }] } } }]]);
    const items = await fetchBoard(cfg, { tool: "monday", boardId: "9", tokenEnv: "MONDAY_TOKEN" }, f);
    expect(items.map(i => i.id)).toEqual(["1", "2"]);
    expect(items[0].fields.Country).toBe("Nigeria");
    expect((calls[0].init!.headers as Record<string, string>).Authorization).toBe("m");
    expect(JSON.parse(String(calls[1].init!.body)).variables).toEqual({ cursor: "c1" });
  });

  it("Monday.com: reports GraphQL errors clearly", async () => {
    const { f } = fakeFetch([[/monday/, () => ({ errors: [{ message: "Not authenticated" }] })]]);
    await expect(fetchBoard(cfg, { tool: "monday", boardId: "9", tokenEnv: "MONDAY_TOKEN" }, f)).rejects.toThrow(/Not authenticated/);
  });

  it("Asana: pages with offset and reads custom fields", async () => {
    const { f, calls } = fakeFetch([[/asana/, url => url.includes("offset=")
      ? { data: [{ gid: "2", name: "T2", custom_fields: [] }], next_page: null }
      : { data: [{ gid: "1", name: "T1", custom_fields: [{ name: "Budget (USD)", display_value: "5000" }] }], next_page: { offset: "o1" } }]]);
    const items = await fetchBoard(cfg, { tool: "asana", projectGid: "p", tokenEnv: "ASANA_TOKEN" }, f);
    expect(items.map(i => i.fields.Project)).toEqual(["T1", "T2"]);
    expect(items[0].fields["Budget (USD)"]).toBe("5000");
    expect(calls).toHaveLength(2);
  });

  it("Trello: resolves custom field ids, list options and checkboxes", async () => {
    const { f } = fakeFetch([
      [/customFields/, () => [{ id: "f1", name: "Country", type: "list", options: [{ id: "o1", value: { text: "Ghana" } }] }, { id: "f2", name: "Budget (USD)", type: "number" }, { id: "f3", name: "Milestone 1 done", type: "checkbox" }]],
      [/cards/, () => [{ id: "c1", name: "Card", customFieldItems: [{ idCustomField: "f1", idValue: "o1" }, { idCustomField: "f2", value: { number: "900" } }, { idCustomField: "f3", value: { checked: "true" } }] }]],
    ]);
    const [item] = await fetchBoard(cfg, { tool: "trello", boardId: "b", keyEnv: "TRELLO_KEY", tokenEnv: "TRELLO_TOKEN" }, f);
    expect(item.fields).toMatchObject({ Project: "Card", Country: "Ghana", "Budget (USD)": "900", "Milestone 1 done": "Yes" });
  });

  it("Jira: names custom fields, flattens values and follows nextPageToken", async () => {
    const { f, calls } = fakeFetch([[/atlassian/, url => url.includes("nextPageToken")
      ? { issues: [{ id: "2", key: "ZA-2", fields: { summary: "Two" } }], isLast: true }
      : { issues: [{ id: "1", key: "ZA-1", fields: { summary: "One", customfield_1: { value: "South Africa" }, customfield_2: 7000, assignee: { displayName: "Thandiwe" } } }], names: { customfield_1: "Country", customfield_2: "Budget (USD)", assignee: "Lead" }, nextPageToken: "n2", isLast: false }]]);
    const items = await fetchBoard(cfg, { tool: "jira", site: "etk.atlassian.net", jql: "project = ZA", emailEnv: "JIRA_EMAIL", tokenEnv: "JIRA_TOKEN" }, f);
    expect(items.map(i => i.id)).toEqual(["ZA-1", "ZA-2"]);
    expect(items[0].fields).toMatchObject({ Project: "One", Country: "South Africa", "Budget (USD)": 7000, Lead: "Thandiwe" });
    expect(String((calls[0].init!.headers as Record<string, string>).Authorization)).toMatch(/^Basic /);
  });

  it("Google Sheets published as CSV", async () => {
    const { f } = fakeFetch([[/docs\.google/, () => 'Project,Country\n"Mission, Kigali",Rwanda\n']]);
    const items = await fetchBoard(cfg, { tool: "sheet", url: "https://docs.google.com/x/pub?output=csv" }, f);
    expect(items[0].fields).toEqual({ Project: "Mission, Kigali", Country: "Rwanda" });
  });

  it("explains a refused token", async () => {
    const { f } = fakeFetch([[/asana/, () => { throw new Error("unused"); }]]);
    const refuse = (async () => new Response("no", { status: 401 })) as typeof fetch;
    await expect(fetchBoard(cfg, { tool: "asana", projectGid: "p", tokenEnv: "ASANA_TOKEN" }, refuse)).rejects.toThrow(/token was refused/);
    expect(f).toBeTypeOf("function");
  });
});
