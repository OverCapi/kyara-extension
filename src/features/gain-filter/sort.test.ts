import { describe, expect, it } from "vitest";
import { rankByGain } from "./sort";

describe("rankByGain", () => {
  it("empty list", () => {
    expect(rankByGain([])).toEqual([]);
  });
  it("best gain first", () => {
    expect(rankByGain([0.1, 0.5, -0.2, 0])).toEqual([1, 0, 3, 2]);
  });
  it("unknown gain last, even behind a negative gain", () => {
    expect(rankByGain([null, -0.9, 0.3])).toEqual([2, 1, 0]);
  });
  it("tie: the site's order is kept", () => {
    expect(rankByGain([0.2, 0.2, null, null])).toEqual([0, 1, 2, 3]);
  });
});
