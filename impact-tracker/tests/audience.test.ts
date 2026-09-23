import { describe, expect, it } from "vitest";
import { audienceBreakdown, matchesAudience, parseAudienceFilter } from "@/lib/audience";

describe("audience", () => {
  it("counts 'both' towards internal and external", () => {
    expect(matchesAudience("both", "internal")).toBe(true);
    expect(matchesAudience("both", "external")).toBe(true);
    expect(matchesAudience("internal", "external")).toBe(false);
    expect(matchesAudience("internal", "all")).toBe(true);
  });
  it("breaks statuses down by audience", () => {
    const b = audienceBreakdown([
      { audience: "external", status: "green" },
      { audience: "internal", status: "red" },
      { audience: "both", status: "amber" },
    ]);
    expect(b.external).toMatchObject({ green: 1, amber: 1, red: 0, total: 2 });
    expect(b.internal).toMatchObject({ red: 1, amber: 1, total: 2 });
  });
  it("parses the filter safely", () => {
    expect(parseAudienceFilter("internal")).toBe("internal");
    expect(parseAudienceFilter("nope")).toBe("all");
    expect(parseAudienceFilter(undefined)).toBe("all");
  });
});
