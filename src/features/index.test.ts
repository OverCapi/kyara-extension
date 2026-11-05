import { describe, expect, it } from "vitest";
import { features } from "./index";

describe("features", () => {
  it("noms uniques et non vides", () => {
    const names = features.map((f) => f.name);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
  it("contient les 4 features d'origine", () => {
    expect(features.map((f) => f.name).sort()).toEqual([
      "market-tooltip",
      "profit-tint",
      "rarity-ring",
      "trade-badges",
    ]);
  });
});
