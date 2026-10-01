import { describe, expect, it } from "vitest";
import { safeRedirect } from "../lib/redirect";

describe("safeRedirect", () => {
  it("propušta putove unutar aplikacije", () => {
    expect(safeRedirect("/leaderboard")).toBe("/leaderboard");
    expect(safeRedirect("/game/abc?from=history#r3")).toBe("/game/abc?from=history#r3");
  });

  it("odbija sve što preglednik čita kao drugi origin", () => {
    for (const target of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", "/\\/evil.com"]) {
      expect(safeRedirect(target)).toBe("/");
    }
    // Tab preglednik izbacuje; rezultat mora ostati na našem originu.
    expect(safeRedirect("/\t/evil.com")).not.toMatch(/^\/\//);
  });
});
