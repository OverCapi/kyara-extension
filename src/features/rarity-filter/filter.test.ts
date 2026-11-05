import { describe, expect, it } from "vitest";
import { RARITIES } from "../../kyara/rarity";
import { passesRarity, toRarities } from "./filter";

describe("passesRarity", () => {
  it("aucune rareté choisie : tout passe, même rareté inconnue", () => {
    expect(passesRarity("common", [])).toBe(true);
    expect(passesRarity(null, [])).toBe(true);
  });
  it("seulement les raretés choisies", () => {
    expect(passesRarity("mythic", ["mythic", "legendary"])).toBe(true);
    expect(passesRarity("legendary", ["mythic", "legendary"])).toBe(true);
    expect(passesRarity("rare", ["mythic", "legendary"])).toBe(false);
  });
  it("rareté inconnue : masquée dès qu'une rareté est choisie", () => {
    expect(passesRarity(null, ["mythic"])).toBe(false);
  });
});

describe("toRarities", () => {
  it("garde les valeurs valides dans l'ordre des raretés, sans doublon", () => {
    expect(toRarities(["mythic", "nope", "common", "mythic"], RARITIES)).toEqual(["common", "mythic"]);
  });
  it("liste vide ou rien de valide : vide", () => {
    expect(toRarities([], RARITIES)).toEqual([]);
    expect(toRarities(["x"], RARITIES)).toEqual([]);
  });
});
