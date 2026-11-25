import { describe, expect, it } from "vitest";
import { parseSite } from "./domain";

describe("parseSite", () => {
  it("normalises valid input", () => {
    expect(parseSite("Example.com")).toEqual({ url: "https://example.com", domain: "example.com" });
    expect(parseSite("https://www.Shop.Example.co.uk/path?x=1")?.domain).toBe("shop.example.co.uk");
  });
  it("rejects internal and unsafe targets", () => {
    for (const bad of ["localhost", "127.0.0.1", "http://10.0.0.5", "[::1]", "intranet.local", "a@b.com", "example.com:8080", "ftp://x.com", "nodot", ""]) {
      expect(parseSite(bad), bad).toBeNull();
    }
  });
});
