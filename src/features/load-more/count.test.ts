import { describe, expect, it } from "vitest";
import type { Offer } from "../../kyara/dom";
import { countVisible, isFiltering, isHiddenByFilter } from "./count";

const offer = (...attrs: string[]): Offer => {
  const li = document.createElement("li");
  for (const a of attrs) li.setAttribute(a, "");
  return { li, give: null, wants: [] };
};

describe("isHiddenByFilter / countVisible", () => {
  it("une offre est cachée dès qu'un attribut data-kv-hide-* est posé", () => {
    expect(isHiddenByFilter(offer("data-kv-hide-gain").li)).toBe(true);
    expect(isHiddenByFilter(offer("data-kv-hide-rarity").li)).toBe(true);
    expect(isHiddenByFilter(offer("data-kv-seen", "id").li)).toBe(false);
  });
  it("compte les offres non cachées", () => {
    expect(countVisible([])).toBe(0);
    expect(
      countVisible([offer(), offer("data-kv-hide-gain"), offer("data-kv-hide-rarity", "data-kv-hide-gain")]),
    ).toBe(1);
  });
});

describe("isFiltering", () => {
  it("vrai si un attribut data-kv-filter-* est posé", () => {
    const root = document.createElement("html");
    expect(isFiltering(root)).toBe(false);
    root.setAttribute("data-kv-hold-gain", "");
    expect(isFiltering(root)).toBe(false); // tri seul : pas un filtre
    root.setAttribute("data-kv-filter-rarity", "");
    expect(isFiltering(root)).toBe(true);
  });
});
