import { describe, expect, it } from "vitest";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { gainLabel, giveButtons } from "./index";

const buttons = ["Donner Carte 2 ×1", "Donner Carte 3 ×1", "Donner Carte 4 ×1", "Proposer autre chose"];
const buttonEls = () => [...document.querySelectorAll<HTMLButtonElement>(".acts button")];

describe("gainLabel", () => {
  it("gain in ◆ and %, empty when unknown", () => {
    expect(gainLabel({ card: {} as never, value: 5, diff: 2, ratio: 0.4 })).toBe("+2◆ · +40 %");
    expect(gainLabel({ card: {} as never, value: null, diff: null, ratio: null })).toBe("");
    expect(gainLabel(undefined)).toBe("");
  });
});

describe("give-buttons", () => {
  it("labels and sorts the give buttons, leaves the other buttons alone", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2, 3, 4], buttons }], { fair: { 1: 10, 2: 15, 3: 5 } });
    const before = document.body.querySelectorAll("*").length;
    startFeature(giveButtons).emit(snap);
    const [b2, b3, b4, other] = buttonEls();
    expect(b2?.dataset.kvGain).toBe("-5◆ · -33 %");
    expect(b2?.dataset.kvSign).toBe("-1");
    expect(b3?.dataset.kvGain).toBe("+5◆ · +100 %");
    expect(b3?.dataset.kvSign).toBe("1");
    expect(b4?.dataset.kvGain).toBeUndefined(); // unknown value: no label
    expect([b3, b2, b4].map((b) => b?.style.order)).toEqual(["0", "1", "2"]);
    expect([b2, b3, b4].every((b) => b?.hasAttribute("data-kv-give"))).toBe(true);
    expect(other?.hasAttribute("data-kv-give")).toBe(false);
    expect(other?.style.order).toBe("");
    expect(document.body.querySelectorAll("*").length).toBe(before);
  });
  it("gain became unknown: the label is removed", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2], buttons }], { fair: { 1: 10, 2: 5 } });
    const { emit } = startFeature(giveButtons);
    emit(snap);
    emit({ ...snap, store: { fair: {}, market: {} } });
    const [b2] = buttonEls();
    expect(b2?.dataset.kvGain).toBeUndefined();
    expect(b2?.dataset.kvSign).toBeUndefined();
  });
  it("offer without give buttons: nothing to do", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2], buttons: ["Proposer autre chose"] }], {
      fair: { 1: 10 },
    });
    startFeature(giveButtons).emit(snap);
    expect(buttonEls()[0]?.attributes.length).toBe(0);
  });
});
