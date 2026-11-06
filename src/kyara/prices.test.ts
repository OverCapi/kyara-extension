import { describe, expect, it } from "vitest";
import type { PriceStore } from "../core/storage";
import type { Card, Offer } from "./dom";
import { analyzeOffer, cardValue, pctText, signed } from "./prices";

const price = (m7: number | null, m30: number | null = null, last: number | null = null) => ({
  m7,
  m30,
  s7: null,
  last,
  t: 0,
});
const store = (fair: Record<number, number>, market: PriceStore["market"] = {}): PriceStore => ({
  fair: Object.fromEntries(Object.entries(fair).map(([id, v]) => [id, { v, t: 0 }])),
  market,
});
const card = (id: number): Card => ({ el: document.createElement("a"), id });
/** Offer; `free` = ids of the wanted cards you can give. */
const offer = (give: number | null, wants: number[], free: number[] = []): Offer => {
  const cards = wants.map(card);
  return {
    li: document.createElement("li"),
    give: give === null ? null : card(give),
    wants: cards,
    free: cards.filter((c) => free.includes(c.id)),
  };
};

describe("cardValue", () => {
  it("fair-play first (0 included)", () => {
    expect(cardValue(store({ 1: 0 }, { 1: price(9) }), 1)).toBe(0);
  });
  it("otherwise 7-day median, then 30-day, then last price", () => {
    expect(cardValue(store({}, { 1: price(9, 8, 7) }), 1)).toBe(9);
    expect(cardValue(store({}, { 1: price(null, 8, 7) }), 1)).toBe(8);
    expect(cardValue(store({}, { 1: price(null, null, 7) }), 1)).toBe(7);
  });
  it("null if unknown", () => {
    expect(cardValue(store({}), 1)).toBeNull();
    expect(cardValue(store({}, { 1: price(null) }), 1)).toBeNull();
  });
});

describe("analyzeOffer", () => {
  it("computes G, W and G - W", () => {
    const a = analyzeOffer(offer(1, [2, 3]), store({ 1: 10, 2: 4, 3: 12 }));
    expect(a.give).toBe(10);
    expect(a.wants.map((w) => [w.value, w.diff, w.ratio])).toEqual([
      [4, 6, 1.5],
      [12, -2, -2 / 12],
    ]);
  });
  it("diff null if G or W is unknown", () => {
    expect(analyzeOffer(offer(1, [2]), store({ 2: 4 })).wants[0]).toMatchObject({
      value: 4,
      diff: null,
      ratio: null,
    });
    expect(analyzeOffer(offer(1, [2]), store({ 1: 4 })).wants[0]).toMatchObject({
      value: null,
      diff: null,
    });
  });
  it("offer without an offered card", () => {
    expect(analyzeOffer(offer(null, [2]), store({ 2: 4 })).give).toBeNull();
  });
  it("best ratio: only cards I can give (owned and not locked), W floored at 1", () => {
    const s = store({ 1: 10, 2: 5, 3: 0 });
    expect(analyzeOffer(offer(1, [2, 3], [2]), s).bestRatio).toBe(1); // (10-5)/5
    expect(analyzeOffer(offer(1, [2, 3], [2, 3]), s).bestRatio).toBe(10); // (10-0)/max(0,1)
  });
  it("negative ratio kept, null without a card I can give", () => {
    const s = store({ 1: 5, 2: 10 });
    expect(analyzeOffer(offer(1, [2], [2]), s).bestRatio).toBe(-0.5);
    expect(analyzeOffer(offer(1, [2]), s).bestRatio).toBeNull();
  });
});

describe("signed / pctText", () => {
  it("adds the + sign to positive numbers only", () => {
    expect([signed(6), signed(-2), signed(0)]).toEqual(["+6", "-2", "0"]);
  });
  it("rounded signed percentage", () => {
    expect(pctText(0.404)).toBe("+40 %");
    expect(pctText(-0.5)).toBe("-50 %");
    expect(pctText(0)).toBe("0 %");
  });
});
