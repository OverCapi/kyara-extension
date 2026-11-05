import { describe, expect, it } from "vitest";
import { features } from "./index";

describe("features", () => {
  it("noms uniques et non vides", () => {
    const names = features.map((f) => f.name);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
  it("contient toutes les features", () => {
    expect(features.map((f) => f.name).sort()).toEqual([
      "gain-filter",
      "load-more",
      "market-tooltip",
      "profit-tint",
      "rarity-filter",
      "rarity-ring",
      "trade-badges",
    ]);
  });
});
