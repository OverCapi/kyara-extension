import { describe, expect, it } from "vitest";
import { addName, isWanted, normalizeName } from "./match";

describe("wanted-cards match", () => {
  it("normalizes case, accents and spaces", () => {
    expect(normalizeName("  Éclair   NOIR ")).toBe("eclair noir");
  });
  it("isWanted: exact name after normalization, not a substring", () => {
    expect(isWanted("Saki Aoi", ["saki  aoi"])).toBe(true);
    expect(isWanted("Saki Aoi", ["Saki"])).toBe(false);
    expect(isWanted("Zoé", ["zoe"])).toBe(true);
  });
  it("empty card name or empty list never matches", () => {
    expect(isWanted("", [""])).toBe(false);
    expect(isWanted("Saki", [])).toBe(false);
  });
  it("addName: trims, ignores empty and duplicates", () => {
    expect(addName(["Saki"], "  Rin   Ito ")).toEqual(["Saki", "Rin Ito"]);
    expect(addName(["Saki"], "SAKI")).toEqual(["Saki"]);
    expect(addName(["Saki"], "   ")).toEqual(["Saki"]);
  });
});
