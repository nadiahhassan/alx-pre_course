import { describe, expect, it } from "vitest";
import { parseEntriesCsv } from "@/lib/csv";

const params = [
  { id: "p1", name: "Journalists trained" },
  { id: "p2", name: "Reader trust score" },
];

describe("parseEntriesCsv", () => {
  it("reads the long layout, matching names case-insensitively", () => {
    const r = parseEntriesCsv("parameter,date,value,confidence\njournalists TRAINED,2026-10-01,25,estimated", params);
    expect(r.format).toBe("long");
    expect(r.rows[0]).toMatchObject({ parameterId: "p1", date: "2026-10-01T00:00:00.000Z", value: 25, confidence: "estimated", error: null });
  });

  it("reads the wide layout and skips blank cells", () => {
    const r = parseEntriesCsv("parameter,2026-09-01,01/10/2026\nReader trust score,6.5,\nJournalists trained,,30", params);
    expect(r.format).toBe("wide");
    expect(r.rows).toHaveLength(2);
    expect(r.rows[1]).toMatchObject({ parameterId: "p1", date: "2026-10-01T00:00:00.000Z", value: 30 });
  });

  it("reports row-level problems", () => {
    const r = parseEntriesCsv(
      "parameter,date,value,confidence\nUnknown,2026-10-01,1,\nJournalists trained,2026-13-01,1,\nJournalists trained,2026-10-01,abc,\nJournalists trained,2026-10-01,1,guess",
      params,
    );
    expect(r.rows.map((x) => x.error)).toEqual([
      expect.stringContaining("Unknown parameter"),
      expect.stringContaining("Invalid date"),
      expect.stringContaining("Invalid value"),
      expect.stringContaining("Unknown confidence"),
    ]);
  });

  it("rejects an unrecognised header", () => {
    expect(parseEntriesCsv("foo,bar\n1,2", params).error).toMatch(/Couldn't read column/);
  });
});
