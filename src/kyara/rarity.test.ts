import { describe, expect, it } from "vitest";
import { renderOffers } from "../test/helpers";
import { readOffers } from "./dom";
import { offerRarity, RARITIES, rarityColor, rarityCssColor, rarityPalette, rgbKey } from "./rarity";

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

describe("rgbKey", () => {
  it("rgb, rgba, hex long et court", () => {
    expect(rgbKey("rgb(181, 177, 187)")).toBe("181,177,187");
    expect(rgbKey("rgba(10,20,30,0.5)")).toBe("10,20,30");
    expect(rgbKey(" #b5b1bb ")).toBe("181,177,187");
    expect(rgbKey("#fff")).toBe("255,255,255");
  });
  it("illisible : null", () => {
    expect(rgbKey("")).toBeNull();
    expect(rgbKey("rouge")).toBeNull();
  });
});

describe("rarityPalette / offerRarity", () => {
  const shadowOf = (hex: string) => `${hex} 0px 0px 0px 2px inset`;
  it("couleurs de secours quand le site ne définit pas les variables", () => {
    const palette = rarityPalette();
    expect(palette.size).toBe(RARITIES.length);
    expect(palette.get("255,77,46")).toBe("mythic");
  });
  it("variables CSS du site prioritaires", () => {
    document.documentElement.style.setProperty("--M", "#010203");
    expect(rarityPalette().get("1,2,3")).toBe("mythic");
    document.documentElement.style.removeProperty("--M");
  });
  it("rareté lue sur la carte proposée", () => {
    const [li] = renderOffers([{ give: 1, wants: [2], shadow: shadowOf("rgb(245, 197, 24)") }]);
    const offer = readOffers()[0];
    expect(li).toBeDefined();
    expect(offer && offerRarity(offer, rarityPalette())).toBe("legendary");
  });
  it("couleur inconnue, absente ou offre sans carte proposée : null", () => {
    renderOffers([{ give: 1, shadow: shadowOf("rgb(1, 1, 1)") }, { give: 2 }, { wants: [3] }]);
    const palette = rarityPalette();
    expect(readOffers().map((o) => offerRarity(o, palette))).toEqual([null, null, null]);
  });
});

describe("rarityCssColor", () => {
  it("variable du site avec couleur de secours", () => {
    expect(rarityCssColor("mythic")).toBe("var(--M, #ff4d2e)");
  });
});
