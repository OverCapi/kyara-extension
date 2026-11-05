import { describe, expect, it } from "vitest";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { rarityColor, rarityRing } from "./index";

describe("rarityColor", () => {
  it.each([
    ["rgb(1, 2, 3) 0px 0px 0px 2px", "rgb(1, 2, 3)"],
    ["0 0 0 2px rgba(10,20,30,0.5)", "rgba(10,20,30,0.5)"],
    ["#ffaa00 0 0 4px", "#ffaa00"],
  ])("lit la couleur de %s", (shadow, color) => {
    expect(rarityColor(shadow)).toBe(color);
  });
  it("null sans couleur", () => {
    expect(rarityColor("")).toBeNull();
    expect(rarityColor("none")).toBeNull();
  });
});

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
