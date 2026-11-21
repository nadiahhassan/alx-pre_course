import { COUNTRY_CODES } from "./country-codes.js";

// Spellings people actually type, mapped to the names used by the map data.
const ALIASES: Record<string, string> = {
  "uk": "United Kingdom", "great britain": "United Kingdom", "britain": "United Kingdom", "england": "United Kingdom", "scotland": "United Kingdom", "wales": "United Kingdom",
  "usa": "United States of America", "us": "United States of America", "united states": "United States of America",
  "ivory coast": "Côte d'Ivoire", "cote d'ivoire": "Côte d'Ivoire", "cote divoire": "Côte d'Ivoire",
  "drc": "Dem. Rep. Congo", "dr congo": "Dem. Rep. Congo", "democratic republic of the congo": "Dem. Rep. Congo", "congo-kinshasa": "Dem. Rep. Congo",
  "republic of the congo": "Congo", "congo-brazzaville": "Congo",
  "car": "Central African Rep.", "central african republic": "Central African Rep.",
  "south sudan": "S. Sudan", "eswatini": "eSwatini", "swaziland": "eSwatini",
  "equatorial guinea": "Eq. Guinea", "western sahara": "W. Sahara", "the gambia": "Gambia",
  "uae": "United Arab Emirates", "bosnia": "Bosnia and Herz.", "czech republic": "Czechia",
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z' -]/g, "").trim();
const BY_NORM = new Map(Object.entries(COUNTRY_CODES).map(([name, code]) => [norm(name), { name, code }]));

/** Turns whatever a board says ("Nigeria", "UK", "Ivory Coast") into the map's name and code, or null. */
export function resolveCountry(input: string): { name: string; code: string } | null {
  const n = norm(input || "");
  if (!n) return null;
  const alias = ALIASES[n];
  if (alias) return { name: alias === "Côte d'Ivoire" ? alias : alias, code: COUNTRY_CODES[alias] };
  return BY_NORM.get(n) ?? null;
}
