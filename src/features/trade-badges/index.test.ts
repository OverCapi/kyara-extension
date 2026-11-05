import { describe, expect, it } from "vitest";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { giveBadge, tradeBadges, wantBadge } from "./index";

const want = (value: number | null, diff: number | null) => wantBadge({ card: {} as never, value, diff });

describe("badges", () => {
  it("carte proposée", () => {
    expect(giveBadge(12)).toBe("≈ 12◆");
    expect(giveBadge(null)).toBe("");
  });
  it("carte demandée : gain signé", () => {
    expect(want(4, 6)).toEqual({ text: "+6", sign: "1" });
    expect(want(12, -2)).toEqual({ text: "-2", sign: "-1" });
    expect(want(5, 0)).toEqual({ text: "0", sign: "0" });
  });
  it("carte demandée : valeur seule ou inconnue", () => {
    expect(want(4, null)).toEqual({ text: "4◆", sign: "0" });
    expect(want(null, null)).toEqual({ text: "", sign: "0" });
  });
});

describe("trade-badges", () => {
  it("pose data-kv sur toutes les cartes, sans ajouter de nœud", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2, 3] }], { fair: { 1: 10, 2: 4 } });
    const before = document.body.querySelectorAll("*").length;
    startFeature(tradeBadges).emit(snap);
    const [give, w1, w2] = [snap.offers[0]?.give?.el, ...(snap.offers[0]?.wants.map((c) => c.el) ?? [])];
    expect(give?.dataset.kv).toBe("≈ 10◆");
    expect(w1?.dataset.kv).toBe("+6");
    expect(w1?.dataset.kvSign).toBe("1");
    expect(w2?.dataset.kv).toBeUndefined(); // valeur inconnue : pas de badge
    expect(document.body.querySelectorAll("*").length).toBe(before);
  });
  it("valeur de la carte proposée inconnue : pas de badge", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2] }], { fair: { 2: 4 } });
    startFeature(tradeBadges).emit(snap);
    expect(snap.offers[0]?.give?.el.dataset.kv).toBeUndefined();
    expect(snap.offers[0]?.wants[0]?.el.dataset.kv).toBe("4◆");
  });
  it("valeur devenue inconnue : l'ancien badge est retiré", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2] }], { fair: { 1: 10, 2: 4 } });
    const { emit } = startFeature(tradeBadges);
    emit(snap);
    emit({ ...snap, store: { fair: {}, market: {} } });
    const [give, w] = [snap.offers[0]?.give?.el, snap.offers[0]?.wants[0]?.el];
    expect(give?.dataset.kv).toBeUndefined();
    expect(w?.dataset.kv).toBeUndefined();
    expect(w?.dataset.kvSign).toBeUndefined();
  });
  it("offre sans carte proposée : ignorée", () => {
    const snap = makeSnapshot([{ wants: [2] }]);
    startFeature(tradeBadges).emit(snap);
    expect(snap.offers[0]?.wants[0]?.el.dataset.kv).toBeUndefined();
  });
});
