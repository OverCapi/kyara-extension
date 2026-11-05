import { describe, expect, it } from "vitest";
import { rankByGain } from "./sort";

describe("rankByGain", () => {
  it("liste vide", () => {
    expect(rankByGain([])).toEqual([]);
  });
  it("meilleur gain en premier", () => {
    expect(rankByGain([0.1, 0.5, -0.2, 0])).toEqual([1, 0, 3, 2]);
  });
  it("gain inconnu en dernier, même derrière un gain négatif", () => {
    expect(rankByGain([null, -0.9, 0.3])).toEqual([2, 1, 0]);
  });
  it("égalité : l'ordre du site est gardé", () => {
    expect(rankByGain([0.2, 0.2, null, null])).toEqual([0, 1, 2, 3]);
  });
});
