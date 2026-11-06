import { describe, expect, it } from "vitest";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { giveBadge, maxBadge, tradeBadges, wantBadge } from "./index";

const want = (value: number | null, diff: number | null) =>
  wantBadge({ card: {} as never, value, diff, ratio: null });

describe("badges", () => {
  it("offered card", () => {
    expect(giveBadge(12)).toBe("≈ 12◆");
    expect(giveBadge(null)).toBe("");
  });
  it("wanted card: signed gain", () => {
    expect(want(4, 6)).toEqual({ text: "+6", sign: "1" });
    expect(want(12, -2)).toEqual({ text: "-2", sign: "-1" });
    expect(want(5, 0)).toEqual({ text: "0", sign: "0" });
  });
  it("best gain under the arrow", () => {
    expect(maxBadge(0.4)).toBe("max +40 %");
    expect(maxBadge(null)).toBe("");
  });
  it("wanted card: value alone or unknown", () => {
    expect(want(4, null)).toEqual({ text: "4◆", sign: "0" });
    expect(want(null, null)).toEqual({ text: "", sign: "0" });
  });
});

describe("trade-badges", () => {
  it("sets data-kv on every card, without adding nodes", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2, 3] }], { fair: { 1: 10, 2: 4 } });
    const before = document.body.querySelectorAll("*").length;
    startFeature(tradeBadges).emit(snap);
    const [give, w1, w2] = [snap.offers[0]?.give?.el, ...(snap.offers[0]?.wants.map((c) => c.el) ?? [])];
    expect(give?.dataset.kv).toBe("≈ 10◆");
    expect(w1?.dataset.kv).toBe("+6");
    expect(w1?.dataset.kvSign).toBe("1");
    expect(w2?.dataset.kv).toBeUndefined(); // unknown value: no badge
    expect(document.body.querySelectorAll("*").length).toBe(before);
  });
  it("unknown offered card value: no badge", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2] }], { fair: { 2: 4 } });
    startFeature(tradeBadges).emit(snap);
    expect(snap.offers[0]?.give?.el.dataset.kv).toBeUndefined();
    expect(snap.offers[0]?.wants[0]?.el.dataset.kv).toBe("4◆");
  });
  it("value became unknown: the old badge is removed", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2] }], { fair: { 1: 10, 2: 4 } });
    const { emit } = startFeature(tradeBadges);
    emit(snap);
    emit({ ...snap, store: { fair: {}, market: {} } });
    const [give, w] = [snap.offers[0]?.give?.el, snap.offers[0]?.wants[0]?.el];
    expect(give?.dataset.kv).toBeUndefined();
    expect(w?.dataset.kv).toBeUndefined();
    expect(w?.dataset.kvSign).toBeUndefined();
  });
  it("offer without an offered card: ignored", () => {
    const snap = makeSnapshot([{ wants: [2] }]);
    startFeature(tradeBadges).emit(snap);
    expect(snap.offers[0]?.wants[0]?.el.dataset.kv).toBeUndefined();
  });
  it("percentage on wanted cards and best owned gain on the arrow", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2, 3] }], {
      fair: { 1: 10, 2: 4, 3: 20 },
      owned: { 3: 1 },
    });
    const { emit } = startFeature(tradeBadges);
    emit(snap);
    const [w1, w2] = snap.offers[0]?.wants.map((c) => c.el) ?? [];
    const arrow = snap.offers[0]?.li.querySelector<HTMLElement>(".arrow");
    expect(w1?.dataset.kvPct).toBe("+150 %");
    expect(w2?.dataset.kvPct).toBe("-50 %");
    expect(arrow?.dataset.kvMax).toBe("max -50 %"); // only card 3 is owned
    expect(arrow?.dataset.kvSign).toBe("-1");
    emit({ ...snap, owned: {} });
    expect(arrow?.dataset.kvMax).toBeUndefined();
    expect(arrow?.dataset.kvSign).toBeUndefined();
  });
  it("offer without an arrow: badges still set", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2] }], { fair: { 1: 10, 2: 4 } });
    snap.offers[0]?.li.querySelector(".arrow")?.remove();
    startFeature(tradeBadges).emit(snap);
    expect(snap.offers[0]?.wants[0]?.el.dataset.kv).toBe("+6");
  });
});
