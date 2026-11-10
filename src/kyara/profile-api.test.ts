import { describe, expect, it } from "vitest";
import { mockFetch } from "../test/helpers";
import { cardImageUrl, fetchProfile, parseProfile, profileIdFromPath } from "./profile-api";

const ID = "942d5d82-5845-4365-99d6-3c305862e315";
const card = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Card ${id}`,
  rarity: "M",
  series: "Re:ZERO",
  ...extra,
});
const PROFILE = {
  pseudo: "Kin-5",
  feminine: false,
  owned: 3127,
  catalogSize: 6736,
  byRarity: { M: 36, C: 717, X: "bad" },
  series: [{ name: "ONE PIECE", owned: 88, total: 195 }, { name: "no total", owned: 1, total: 0 }, "junk"],
  wishlist: [card(1), { id: "2", name: "bad id" }, null],
  wishlistCount: 16,
  doubles: [card(3, { spare: 2 })],
  doublesCount: 41,
};

describe("profileIdFromPath", () => {
  it("reads the player id of a profile path only", () => {
    expect(profileIdFromPath(`/profil/${ID}`)).toBe(ID);
    expect(profileIdFromPath(`/profil/${ID}/`)).toBe(ID);
    expect(profileIdFromPath("/profil")).toBeNull();
    expect(profileIdFromPath("/profil/abc")).toBeNull();
    expect(profileIdFromPath(`/marche/${ID}`)).toBeNull();
  });
});

describe("cardImageUrl", () => {
  it("points to the site's CDN", () => {
    expect(cardImageUrl(88572)).toBe("https://cdn.kyara.games/cards/sm/88572.webp");
  });
});

describe("parseProfile", () => {
  it("keeps the valid data and drops the rest", () => {
    const data = parseProfile(PROFILE);
    expect(data?.owned).toBe(3127);
    expect(data?.byRarity).toEqual({ M: 36, C: 717, X: 0 });
    expect(data?.series).toEqual([{ name: "ONE PIECE", owned: 88, total: 195 }]);
    expect(data?.wishlist.map((c) => c.id)).toEqual([1]);
    expect(data?.wishlist[0]?.spare).toBe(0);
    expect(data?.doubles[0]?.spare).toBe(2);
    expect(data?.wishlistCount).toBe(16);
    expect(data?.doublesCount).toBe(41);
  });
  it("missing lists and counts: empty, the count never below the list", () => {
    const data = parseProfile({ pseudo: "A", wishlist: [card(1), card(2)], feminine: true });
    expect(data?.feminine).toBe(true);
    expect(data?.wishlistCount).toBe(2);
    expect(data?.doubles).toEqual([]);
    expect(data?.series).toEqual([]);
    expect(data?.byRarity).toEqual({});
  });
  it("not a profile: null", () => {
    expect(parseProfile(null)).toBeNull();
    expect(parseProfile([])).toBeNull();
    expect(parseProfile({ owned: 3 })).toBeNull();
  });
});

describe("fetchProfile", () => {
  it("asks the public profile and parses it", async () => {
    const fetch = mockFetch(PROFILE);
    const data = await fetchProfile(ID);
    expect(fetch.mock.calls[0]?.[0]).toBe(`/api/users/${ID}`);
    expect(data?.doublesCount).toBe(41);
  });
  it("HTTP error or rejected fetch: null, no throw", async () => {
    mockFetch({}, 500);
    expect(await fetchProfile(ID)).toBeNull();
    mockFetch({ not: "a profile" });
    expect(await fetchProfile(ID)).toBeNull();
  });
});
