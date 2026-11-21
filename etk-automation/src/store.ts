import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolvePath, type Config } from "./config.js";
import { emptyPortfolio, type Portfolio } from "./model.js";

export const dataFile = (cfg: Config, name: string) => path.join(resolvePath(cfg, cfg.paths.data), name);

export function readJson<T>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

/** Writes via a temp file and rename, so a crash never leaves half a file behind. */
export function writeJson(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  writeFileSync(tmp, JSON.stringify(value, null, 2));
  renameSync(tmp, file);
}

export const loadPortfolio = (cfg: Config): Portfolio => readJson(dataFile(cfg, "portfolio.json"), emptyPortfolio());
export const savePortfolio = (cfg: Config, p: Portfolio) => writeJson(dataFile(cfg, "portfolio.json"), { ...p, updatedAt: new Date().toISOString() });
