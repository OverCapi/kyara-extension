import { describe, expect, it } from "vitest";
import { RARITIES } from "../../kyara/rarity";
import { passesRarity, toRarities } from "./filter";

describe("passesRarity", () => {
  it("no rarity chosen: everything passes, even unknown rarity", () => {
    expect(passesRarity("common", [])).toBe(true);
    expect(passesRarity(null, [])).toBe(true);
  });
  it("only the chosen rarities", () => {
    expect(passesRarity("mythic", ["mythic", "legendary"])).toBe(true);
    expect(passesRarity("legendary", ["mythic", "legendary"])).toBe(true);
    expect(passesRarity("rare", ["mythic", "legendary"])).toBe(false);
  });
  it("unknown rarity: hidden as soon as a rarity is chosen", () => {
    expect(passesRarity(null, ["mythic"])).toBe(false);
  });
});

describe("toRarities", () => {
  it("keeps valid values in rarity order, without duplicates", () => {
    expect(toRarities(["mythic", "nope", "common", "mythic"], RARITIES)).toEqual(["common", "mythic"]);
  });
  it("empty list or nothing valid: empty", () => {
    expect(toRarities([], RARITIES)).toEqual([]);
    expect(toRarities(["x"], RARITIES)).toEqual([]);
  });
});
