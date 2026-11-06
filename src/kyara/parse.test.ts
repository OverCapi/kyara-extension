import { describe, expect, it } from "vitest";
import { parseFair, parseMarketMin, parsePrices, parseResponse } from "./parse";

const K = "https://kyara.games";
const NOW = 1000;

describe("parsePrices", () => {
  const listing = {
    items: [
      {
        character: { id: 1 },
        prices: { characterId: 1, median7d: 18, median30d: 19, sales7d: 400, lastPrice: 15 },
      },
      {
        character: { id: 2 },
        prices: { characterId: 2, median7d: null, median30d: 7, sales7d: 0, lastPrice: 5 },
      },
    ],
  };

  it("finds the medians at any depth", () => {
    const out = parsePrices(listing, NOW);
    expect(Object.keys(out).sort()).toEqual(["p:1", "p:2"]);
    expect(out["p:1"]).toEqual({ m7: 18, m30: 19, s7: 400, last: 15, t: NOW });
    expect(out["p:2"]).toMatchObject({ m7: null, m30: 7 });
  });

  it("sets null on missing or invalid fields", () => {
    const out = parsePrices({ characterId: 3, median7d: "x" }, NOW);
    expect(out["p:3"]).toEqual({ m7: null, m30: null, s7: null, last: null, t: NOW });
  });

  it("ignores what is not a price", () => {
    expect(parsePrices(null)).toEqual({});
    expect(parsePrices("text")).toEqual({});
    expect(parsePrices({ characterId: "1", median7d: 1 })).toEqual({});
    expect(parsePrices({ characterId: 1 })).toEqual({});
  });

  it("stops on overly nested JSON", () => {
    let deep: unknown = { characterId: 9, median7d: 1 };
    for (let i = 0; i < 100; i++) deep = { child: deep };
    expect(parsePrices(deep)).toEqual({});
  });
});

describe("parseFair", () => {
  it("keeps numbers (0 included), ignores the rest", () => {
    const out = parseFair({ 1: 12, 2: 0, 3: null, 4: "5" }, NOW);
    expect(Object.keys(out).sort()).toEqual(["f:1", "f:2"]);
    expect(out["f:1"]).toEqual({ v: 12, t: NOW });
  });

  it("ignores non-numeric ids and unexpected shapes", () => {
    expect(parseFair({ abc: 1 })).toEqual({});
    expect(parseFair([1, 2])).toEqual({});
    expect(parseFair(null)).toEqual({});
    expect(parseFair("x")).toEqual({});
  });
});

describe("parseMarketMin", () => {
  it("reads min price and number of listings", () => {
    expect(parseMarketMin({ items: [{ price: 7 }], total: 3 })).toEqual({ min: 7, count: 3 });
  });
  it("no listings", () => {
    expect(parseMarketMin({ items: [], total: 0 })).toEqual({ min: null, count: 0 });
    expect(parseMarketMin({})).toEqual({ min: null, count: 0 });
  });
  it("unexpected shape: null", () => {
    expect(parseMarketMin(null)).toBeNull();
    expect(parseMarketMin([1])).toBeNull();
  });
});

describe("parseResponse", () => {
  it("routes to the right format from the URL", () => {
    expect(Object.keys(parseResponse(`${K}/api/fair-play/prices?ids=1,2`, { 1: 12 }, NOW))).toEqual(["f:1"]);
    expect(
      Object.keys(parseResponse(`${K}/api/market/listings?page=1`, { characterId: 1, median7d: 1 }, NOW)),
    ).toEqual(["p:1"]);
  });
  it("API error (logged out): nothing", () => {
    expect(parseResponse(`${K}/api/fair-play/prices?ids=1`, { error: "unauthorized" })).toEqual({});
  });
  it("invalid URL: nothing", () => {
    expect(parseResponse("not a url", {})).toEqual({});
  });
});
