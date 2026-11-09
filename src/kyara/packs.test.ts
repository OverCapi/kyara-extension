import { describe, expect, it } from "vitest";
import {
  FREE_IDS_ATTR,
  freePacks,
  openPagePack,
  opensPacks,
  parseFreePackIds,
  parseWallet,
  pathOf,
  readFreePacks,
  readWallet,
  rewriteOpenMany,
  storePackData,
  WALLET_ATTR,
} from "./packs";

describe("parseWallet", () => {
  const user = { freePacks: 2, bonusPacks: 1, grants: { daily: 3, bad: "x" }, chakra: 300 };
  it("bootstrap `me`: free + bonus, gifts per pack (invalid -> 0)", () => {
    expect(parseWallet({ me: user })).toEqual({ free: 3, grants: { daily: 3, bad: 0 } });
  });
  it("single open `user`, and `user` of the LAST bulk open result", () => {
    expect(parseWallet({ user: { freePacks: 1 } })).toEqual({ free: 1, grants: {} });
    const results = [{ user: { freePacks: 5 } }, { user: { freePacks: 4 } }];
    expect(parseWallet({ results })?.free).toBe(4);
  });
  it("no user, or not an object: null", () => {
    expect(parseWallet({ me: { pseudo: "x" } })).toBeNull();
    expect(parseWallet({ results: [1] })).toBeNull();
    expect(parseWallet([])).toBeNull();
    expect(parseWallet(null)).toBeNull();
  });
  it("negative or non-numeric counts count as 0", () => {
    expect(parseWallet({ me: { freePacks: -2, bonusPacks: "3" } })?.free).toBe(0);
  });
});

describe("parseFreePackIds", () => {
  it("usesFreePacks, or price 0 when the field is missing", () => {
    const packs = [
      { id: "all", usesFreePacks: true, price: 0 },
      { id: "daily", usesFreePacks: false, price: 0 },
      { id: "old", price: 0 },
      { id: "top", price: 750 },
      { usesFreePacks: true },
      "junk",
    ];
    expect(parseFreePackIds(packs)).toEqual(["all", "old"]);
  });
  it("not a list: null", () => {
    expect(parseFreePackIds({ packs: [] })).toBeNull();
  });
});

describe("freePacks", () => {
  it("shared stock on the packs that use it, plus each pack's gifts", () => {
    expect(freePacks({ free: 2, grants: { all: 1, chest: 1 } }, ["all", "isekai"])).toEqual({
      all: 3,
      isekai: 2,
      chest: 1,
    });
  });
});

describe("storePackData / readFreePacks", () => {
  const html = document.documentElement;
  it("wallet from /api/me, ids from /api/packs, stored separately; the map once both are known", () => {
    storePackData({ id: "u", freePacks: 2, grants: { top: 1 } });
    expect(readWallet()).toEqual({ free: 2, grants: { top: 1 } });
    expect(readFreePacks()).toEqual({});
    storePackData([{ id: "all", usesFreePacks: true }]);
    expect(readFreePacks()).toEqual({ all: 2, top: 1 });
    storePackData({ results: [{ user: { freePacks: 0 } }] }); // after an open: only the wallet changes
    expect(readFreePacks()).toEqual({ all: 0 });
  });
  it("unrelated response: nothing stored", () => {
    storePackData({ notifications: [] });
    expect(html.hasAttribute(WALLET_ATTR)).toBe(false);
  });
  it("missing, invalid JSON or wrong shape: empty / null", () => {
    expect(readFreePacks()).toEqual({});
    html.setAttribute(WALLET_ATTR, "{oops");
    html.setAttribute(FREE_IDS_ATTR, "{}");
    expect(readWallet()).toBeNull();
    expect(readFreePacks()).toEqual({});
    html.setAttribute(WALLET_ATTR, '{"free":"x"}');
    expect(readWallet()).toBeNull();
    html.setAttribute(WALLET_ATTR, '{"free":3}');
    html.setAttribute(FREE_IDS_ATTR, '["all",4]');
    expect(readFreePacks()).toEqual({ all: 3 });
  });
});

describe("openPagePack", () => {
  it("pack id of /ouvrir/<id>, null elsewhere", () => {
    expect(openPagePack("/ouvrir/all")).toBe("all");
    expect(openPagePack("/ouvrir/season-2026-fall/")).toBe("season-2026-fall");
    expect(openPagePack("/ouvrir/")).toBeNull();
    expect(openPagePack("/marche")).toBeNull();
  });
});

describe("pathOf", () => {
  it("absolute or relative URL; unreadable -> null", () => {
    expect(pathOf("/api/packs?x=1")).toBe("/api/packs");
    expect(pathOf("https://kyara.games/api/me/bootstrap")).toBe("/api/me/bootstrap");
    expect(pathOf("http://[bad")).toBeNull();
  });
});

describe("rewriteOpenMany", () => {
  const url = "/api/packs/all/open-many";
  it("exact count, no chakra, other fields kept", () => {
    const body = rewriteOpenMany(url, JSON.stringify({ count: 4, maxChakra: 300, x: 1 }), 2);
    expect(JSON.parse(body ?? "")).toEqual({ count: 2, maxChakra: 0, x: 1 });
  });
  it("left untouched: other URL, single open, no count asked, body not a JSON object", () => {
    expect(rewriteOpenMany("/api/packs/all/open", '{"count":4}', 2)).toBeNull();
    expect(rewriteOpenMany("/api/market", '{"count":4}', 2)).toBeNull();
    expect(rewriteOpenMany(url, '{"count":4}', 0)).toBeNull();
    expect(rewriteOpenMany(url, '{"count":4}', Number.NaN)).toBeNull();
    expect(rewriteOpenMany(url, "{oops", 2)).toBeNull();
    expect(rewriteOpenMany(url, "[4]", 2)).toBeNull();
    expect(rewriteOpenMany(url, undefined, 2)).toBeNull();
    expect(rewriteOpenMany(url, '{"amount":4}', 2)).toBeNull(); // format changed: no count to replace
  });
});

describe("opensPacks", () => {
  it("any POST under /api/packs/<id>/", () => {
    expect(opensPacks("/api/packs/all/open-many", "POST")).toBe(true);
    expect(opensPacks("https://kyara.games/api/packs/x/whatever", "post")).toBe(true);
    expect(opensPacks("/api/packs/all/open", "GET")).toBe(false);
    expect(opensPacks("/api/packs", "POST")).toBe(false);
    expect(opensPacks("/api/packs/all", "POST")).toBe(false);
    expect(opensPacks("/api/market/buy", "POST")).toBe(false);
  });
});
