import { describe, expect, it } from "vitest";
import { checkBasicAuth, isPublicPath } from "@/lib/basic-auth";

const header = (user: string, pass: string) => "Basic " + btoa(`${user}:${pass}`);

describe("checkBasicAuth", () => {
  it("accepts the right password with any username", () => {
    expect(checkBasicAuth(header("anyone", "s3cret"), "s3cret")).toBe(true);
    expect(checkBasicAuth(header("", "s3cret"), "s3cret")).toBe(true);
  });
  it("rejects wrong, missing or malformed credentials", () => {
    expect(checkBasicAuth(header("a", "wrong"), "s3cret")).toBe(false);
    expect(checkBasicAuth(header("a", "s3cret2"), "s3cret")).toBe(false);
    expect(checkBasicAuth(null, "s3cret")).toBe(false);
    expect(checkBasicAuth("Bearer x", "s3cret")).toBe(false);
    expect(checkBasicAuth("Basic !!!", "s3cret")).toBe(false);
  });
  it("allows passwords containing colons", () => {
    expect(checkBasicAuth(header("u", "a:b:c"), "a:b:c")).toBe(true);
  });
});

describe("isPublicPath", () => {
  it("leaves share links and static assets open", () => {
    expect(isPublicPath("/share/abc123")).toBe(true);
    expect(isPublicPath("/_next/static/x.js")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/projects/1")).toBe(false);
    expect(isPublicPath("/shared")).toBe(false);
  });
});
