import { describe, expect, it } from "vitest";
import { features } from "./index";

describe("features", () => {
  it("unique, non-empty names", () => {
    const names = features.map((f) => f.name);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
  it("contains every feature", () => {
    expect(features.map((f) => f.name).sort()).toEqual([
      "gain-filter",
      "give-buttons",
      "load-more",
      "market-tooltip",
      "prices-pending",
      "profit-tint",
      "rarity-filter",
      "rarity-ring",
      "trade-badges",
    ]);
  });
});
