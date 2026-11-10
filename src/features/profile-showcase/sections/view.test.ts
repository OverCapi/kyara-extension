import { describe, expect, it } from "vitest";
import type { ProfileData } from "../../../kyara/profile-api";
import { buildSections, SECTION_IDS } from "./view";

const card = (id: number, spare = 0) => ({ id, name: `Card ${id}`, rarity: "L", series: "Naruto", spare });
const DATA: ProfileData = {
  feminine: false,
  owned: 100,
  catalogSize: 6736,
  byRarity: { M: 10, L: 0, C: 90 },
  series: [
    { name: "Naruto", owned: 52, total: 119 },
    { name: "Re:ZERO", owned: 45, total: 45 },
  ],
  wishlist: [card(1), card(2)],
  wishlistCount: 16,
  doubles: [card(3, 2)],
  doublesCount: 41,
};

describe("buildSections", () => {
  it("builds the collection: count, rarity bar without empty rarities, chips, universes", () => {
    const root = buildSections(DATA);
    const coll = root.querySelector(`#${SECTION_IDS.collection}`);
    expect(coll?.textContent).toContain("Collection");
    expect(coll?.querySelectorAll(".kv-rbar > span")).toHaveLength(2);
    expect(coll?.querySelectorAll(".kv-rchips li")).toHaveLength(6);
    expect(coll?.querySelectorAll(".kv-unis li")).toHaveLength(2);
    expect(coll?.querySelectorAll(".kv-unis li[data-kv-done]")).toHaveLength(1);
  });
  it("builds the trades: strips of linked tiles, counts, spares", () => {
    const trades = buildSections(DATA).querySelector(`#${SECTION_IDS.trades}`);
    const tiles = trades?.querySelectorAll<HTMLAnchorElement>(".kv-tile");
    expect(tiles).toHaveLength(3);
    expect(tiles?.[0]?.getAttribute("href")).toBe("/wiki/1");
    expect(tiles?.[0]?.querySelector("img")?.getAttribute("src")).toContain("/cards/sm/1.webp");
    expect(trades?.textContent).toContain("Il cherche");
    expect(trades?.textContent).toContain("16");
    expect(trades?.querySelector(".kv-tile-spare")?.textContent).toBe("×2");
  });
  it("feminine player: feminine labels", () => {
    expect(buildSections({ ...DATA, feminine: true }).textContent).toContain("Elle échange");
  });
  it("nothing to show: no strip, an empty message, no universes", () => {
    const root = buildSections({ ...DATA, wishlist: [], doubles: [], series: [], owned: 0 });
    expect(root.querySelector(".kv-strip")).toBeNull();
    expect(root.querySelector(".kv-unis")).toBeNull();
    expect(root.querySelector(".kv-psec-empty")).not.toBeNull();
    expect(root.querySelector(".kv-rchips small")?.textContent).toBe("–");
  });
});
