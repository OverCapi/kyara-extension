import { describe, expect, it } from "vitest";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { rarityRing } from "./index";

describe("rarity-ring", () => {
  it("pose couleur et attribut sur la carte proposée", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2], shadow: "rgb(9, 8, 7) 0 0 0 2px" }]);
    startFeature(rarityRing).emit(snap);
    const give = snap.offers[0]?.give?.el;
    expect(give?.style.getPropertyValue("--kv-rar")).toBe("rgb(9, 8, 7)");
    expect(give?.hasAttribute("data-kv-rar")).toBe(true);
  });
  it("carte sans couleur : rien", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2] }]);
    startFeature(rarityRing).emit(snap);
    expect(snap.offers[0]?.wants[0]?.el.hasAttribute("data-kv-rar")).toBe(false);
  });
  it("offre sans carte proposée : ignorée", () => {
    const snap = makeSnapshot([{ wants: [2] }]);
    expect(() => startFeature(rarityRing).emit(snap)).not.toThrow();
  });
});
