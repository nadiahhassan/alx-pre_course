import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

// Credentials never go in this file. Each board names the environment variable that holds its token.
const Source = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("monday"), boardId: z.string(), tokenEnv: z.string().default("MONDAY_TOKEN") }),
  z.object({ tool: z.literal("asana"), projectGid: z.string(), tokenEnv: z.string().default("ASANA_TOKEN") }),
  z.object({ tool: z.literal("trello"), boardId: z.string(), keyEnv: z.string().default("TRELLO_KEY"), tokenEnv: z.string().default("TRELLO_TOKEN") }),
  z.object({ tool: z.literal("jira"), site: z.string(), jql: z.string(), emailEnv: z.string().default("JIRA_EMAIL"), tokenEnv: z.string().default("JIRA_TOKEN") }),
  z.object({ tool: z.literal("sheet"), path: z.string().optional(), url: z.string().optional(), sheet: z.string().optional() }),
]);

const Board = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "Use lower-case letters, numbers and hyphens"),
  name: z.string(),
  kind: z.enum(["projects", "risks"]).default("projects"),
  source: Source,
  // Standard field key -> the column title on this board, only where it differs from the template.
  fields: z.record(z.string(), z.string()).default({}),
  enabled: z.boolean().default(true),
});

const PersonSchema = z.object({ name: z.string(), role: z.string().default(""), base: z.string(), capacity: z.number().int().positive().default(3), email: z.string().optional() });

const ConfigSchema = z.object({
  organisation: z.string().default("ETK Group"),
  boards: z.array(Board),
  people: z.array(PersonSchema).default([]),
  paths: z.object({
    data: z.string().default("data"),
    inbox: z.string().default("inbox"),
    reports: z.string().default("reports"),
    exports: z.string().default("exports"),
  }).default({ data: "data", inbox: "inbox", reports: "reports", exports: "exports" }),
  reports: z.object({ recipients: z.array(z.string()).default([]), from: z.string().optional() }).default({ recipients: [] }),
  ai: z.object({ model: z.string().default("claude-opus-5-5") }).default({ model: "claude-opus-5-5" }),
});

export type Config = z.infer<typeof ConfigSchema> & { dir: string };
export type BoardConfig = z.infer<typeof Board>;
export type SourceConfig = z.infer<typeof Source>;

export function loadConfig(file: string): Config {
  if (!existsSync(file)) throw new Error(`No config at ${file}. Copy config/boards.example.json to config/boards.json and fill it in.`);
  const parsed = ConfigSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) throw new Error(`Config ${file} isn't valid:\n` + parsed.error.issues.map(i => `- ${i.path.join(".")}: ${i.message}`).join("\n"));
  const ids = parsed.data.boards.map(b => b.id), dup = ids.find((id, k) => ids.indexOf(id) !== k);
  if (dup) throw new Error(`Board id “${dup}” is used twice in ${file}.`);
  // Relative paths are relative to the folder that holds the config's parent, i.e. the package root.
  return { ...parsed.data, dir: path.resolve(path.dirname(file), "..") };
}

export const resolvePath = (cfg: Config, p: string) => (path.isAbsolute(p) ? p : path.join(cfg.dir, p));
