import { describe, expect, it } from "vitest";
import { can, canUpdateResponsibility } from "@/lib/permissions";
import { hashPassword, verifyPassword } from "@/lib/passwords";

describe("permissions", () => {
  const admin = { role: "admin", team: "" };
  const programme = { role: "programme", team: "" };
  const marketing = { role: "partner", team: "marketing" };
  const gapp = { role: "partner", team: "gapp" };
  const viewer = { role: "viewer", team: "" };

  it("lets the Global lead do everything", () => {
    for (const a of ["manage-users", "manage-programme", "edit-data", "edit-campaigns", "edit-evidence", "approve-ai", "share"] as const) {
      expect(can(admin, a)).toBe(true);
    }
  });
  it("lets the programme team edit data but not users or budgets", () => {
    expect(can(programme, "edit-data")).toBe(true);
    expect(can(programme, "approve-ai")).toBe(true);
    expect(can(programme, "manage-users")).toBe(false);
    expect(can(programme, "manage-programme")).toBe(false);
  });
  it("lets partners add evidence and share; only marketing edits campaigns", () => {
    expect(can(gapp, "edit-evidence")).toBe(true);
    expect(can(gapp, "share")).toBe(true);
    expect(can(gapp, "edit-campaigns")).toBe(false);
    expect(can(marketing, "edit-campaigns")).toBe(true);
    expect(can(marketing, "edit-data")).toBe(false);
    expect(can(marketing, "approve-ai")).toBe(false);
  });
  it("keeps operations with the Global lead and programme team; partners update their own team's items", () => {
    expect(can(admin, "edit-operations")).toBe(true);
    expect(can(programme, "edit-operations")).toBe(true);
    expect(can(gapp, "edit-operations")).toBe(false);
    expect(canUpdateResponsibility(gapp, "gapp")).toBe(true);
    expect(canUpdateResponsibility(gapp, "comms")).toBe(false);
    expect(canUpdateResponsibility(viewer, "programme")).toBe(false);
    expect(canUpdateResponsibility(programme, "marketing")).toBe(true);
  });
  it("gives viewers and signed-out users read-only access", () => {
    expect(can(viewer, "edit-evidence")).toBe(false);
    expect(can(null, "share")).toBe(false);
  });
});

describe("passwords", () => {
  it("verifies the right password only", () => {
    const h = hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(verifyPassword("x", "garbage")).toBe(false);
  });
  it("salts each hash", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });
});
