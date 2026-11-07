import { describe, expect, it } from "vitest";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { pricesPending } from "./index";

const el = () => document.querySelector<HTMLElement>(".kv-pending");

describe("prices-pending", () => {
  it("is hidden until prices are pending, then hidden again", () => {
    const { emit, prices } = startFeature(pricesPending);
    const snap = makeSnapshot([{ give: 1 }]);
    expect(el()?.hidden).toBe(true);
    emit(snap);
    expect(el()?.hidden).toBe(true);
    prices.pending = true;
    emit(snap);
    expect(el()?.hidden).toBe(false);
    prices.pending = false;
    emit(snap);
    expect(el()?.hidden).toBe(true);
  });

  it("has an accessible label", () => {
    startFeature(pricesPending);
    expect(el()?.title).toBe("Chargement des prix…");
    expect(el()?.getAttribute("aria-label")).toBe("Chargement des prix…");
  });

  it("removes the element when the extension is reloaded (setup.ts fails on console noise)", () => {
    startFeature(pricesPending).page.invalidate();
    expect(el()).toBeNull();
  });
});
