import { describe, expect, it } from "vitest";
import { renderOffers } from "../test/helpers";
import { readOffers } from "./dom";
import { offerRarity, RARITIES, rarityColor, rarityCssColor, rarityPalette, rgbKey } from "./rarity";

describe("rarityColor", () => {
  it.each([
    ["rgb(1, 2, 3) 0px 0px 0px 2px", "rgb(1, 2, 3)"],
    ["0 0 0 2px rgba(10,20,30,0.5)", "rgba(10,20,30,0.5)"],
    ["#ffaa00 0 0 4px", "#ffaa00"],
  ])("reads the color of %s", (shadow, color) => {
    expect(rarityColor(shadow)).toBe(color);
  });
  it("null without a color", () => {
    expect(rarityColor("")).toBeNull();
    expect(rarityColor("none")).toBeNull();
  });
});

describe("rgbKey", () => {
  it("rgb, rgba, long and short hex", () => {
    expect(rgbKey("rgb(181, 177, 187)")).toBe("181,177,187");
    expect(rgbKey("rgba(10,20,30,0.5)")).toBe("10,20,30");
    expect(rgbKey(" #b5b1bb ")).toBe("181,177,187");
    expect(rgbKey("#fff")).toBe("255,255,255");
  });
  it("unreadable: null", () => {
    expect(rgbKey("")).toBeNull();
    expect(rgbKey("red")).toBeNull();
  });
});

describe("rarityPalette / offerRarity", () => {
  const shadowOf = (hex: string) => `${hex} 0px 0px 0px 2px inset`;
  it("fallback colors when the site does not define the variables", () => {
    const palette = rarityPalette();
    expect(palette.size).toBe(RARITIES.length);
    expect(palette.get("255,77,46")).toBe("mythic");
  });
  it("the site's CSS variables take priority", () => {
    document.documentElement.style.setProperty("--M", "#010203");
    expect(rarityPalette().get("1,2,3")).toBe("mythic");
    document.documentElement.style.removeProperty("--M");
  });
  it("rarity read from the offered card", () => {
    const [li] = renderOffers([{ give: 1, wants: [2], shadow: shadowOf("rgb(245, 197, 24)") }]);
    const offer = readOffers()[0];
    expect(li).toBeDefined();
    expect(offer && offerRarity(offer, rarityPalette())).toBe("legendary");
  });
  it("unknown or missing color, or offer without an offered card: null", () => {
    renderOffers([{ give: 1, shadow: shadowOf("rgb(1, 1, 1)") }, { give: 2 }, { wants: [3] }]);
    const palette = rarityPalette();
    expect(readOffers().map((o) => offerRarity(o, palette))).toEqual([null, null, null]);
  });
});

describe("rarityCssColor", () => {
  it("the site's variable with a fallback color", () => {
    expect(rarityCssColor("mythic")).toBe("var(--M, #ff4d2e)");
  });
});
