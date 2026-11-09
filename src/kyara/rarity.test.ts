import { describe, expect, it } from "vitest";
import { renderOffers } from "../test/helpers";
import { readOffers } from "./dom";
import {
  offerRarity,
  RARITIES,
  rarityColor,
  rarityCssColor,
  rarityFromText,
  rarityPalette,
  rgbKey,
} from "./rarity";

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
  it("color not recognized (site changed): the rarity name under the offered card", () => {
    const [li] = renderOffers([{ give: 1, wants: [2], shadow: shadowOf("rgb(1, 1, 1)") }]);
    li?.querySelector(".give")?.append("Épique · Gate");
    const offer = readOffers()[0];
    expect(offer && offerRarity(offer, rarityPalette())).toBe("epic");
  });
});

describe("rarityFromText", () => {
  it("the first rarity name followed by ·, whole word only", () => {
    expect(rarityFromText("Youji Itami Rare · Gate par x · expire")).toBe("rare");
    expect(rarityFromText("Peu commune · Haikyu")).toBe("uncommon");
    expect(rarityFromText("Commune · A Mythique · B")).toBe("common");
    expect(rarityFromText("LÉGENDAIRE · X")).toBe("legendary");
  });
  it("no rarity name, or a name inside another word, or without ·: null", () => {
    expect(rarityFromText("Rarement · x")).toBeNull();
    expect(rarityFromText("Exemplaire mythique")).toBeNull();
    expect(rarityFromText("")).toBeNull();
  });
});

describe("rarityCssColor", () => {
  it("the site's variable with a fallback color", () => {
    expect(rarityCssColor("mythic")).toBe("var(--M, #ff4d2e)");
  });
});
