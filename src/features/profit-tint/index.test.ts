import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { readNoTint, writeNoTint } from "../../core/storage";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { profitTint } from "./index";

beforeEach(() => {
  fakeBrowser.reset();
  document.documentElement.classList.remove("kv-no-tint");
});

const button = () => document.querySelector<HTMLButtonElement>(".kv-toggle");

describe("profit-tint : fond de l'offre", () => {
  it("teinte selon le meilleur gain parmi mes cartes", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2] }], { fair: { 1: 10, 2: 5 }, owned: { 2: 1 } });
    startFeature(profitTint).emit(snap);
    expect(snap.offers[0]?.li.style.getPropertyValue("--kv-bg")).toBe("rgba(90, 190, 255, 0.45)");
  });
  it("transparent si gain inconnu", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2] }], { owned: {} });
    startFeature(profitTint).emit(snap);
    expect(snap.offers[0]?.li.style.getPropertyValue("--kv-bg")).toBe("transparent");
  });
  it("offre sans carte proposée : ignorée", () => {
    const snap = makeSnapshot([{ wants: [2] }]);
    startFeature(profitTint).emit(snap);
    expect(snap.offers[0]?.li.style.getPropertyValue("--kv-bg")).toBe("");
  });
});

describe("profit-tint : pastille", () => {
  it("visible seulement quand il y a des offres", () => {
    const { emit } = startFeature(profitTint);
    expect(button()?.hidden).toBe(true);
    emit(makeSnapshot([{ give: 1 }]));
    expect(button()?.hidden).toBe(false);
    document.body.replaceChildren(button() as Node);
    emit({ offers: [], store: { fair: {}, market: {} }, owned: null });
    expect(button()?.hidden).toBe(true);
  });

  it("affiche 'on' par défaut, 'off' si la préférence est mémorisée", async () => {
    startFeature(profitTint);
    await vi.waitFor(() => expect(button()?.textContent).toBe("Rentabilité on"));
    expect(button()?.getAttribute("aria-pressed")).toBe("true");
    document.querySelector(".kv-toggle")?.remove();
    await writeNoTint(true);
    startFeature(profitTint);
    await vi.waitFor(() => expect(button()?.textContent).toBe("Rentabilité off"));
    expect(document.documentElement.classList.contains("kv-no-tint")).toBe(true);
  });

  it("un clic bascule et mémorise ; un autre onglet est suivi", async () => {
    startFeature(profitTint);
    await vi.waitFor(() => expect(button()?.textContent).toBe("Rentabilité on"));
    button()?.click();
    await vi.waitFor(() => expect(button()?.textContent).toBe("Rentabilité off"));
    expect(await readNoTint()).toBe(true);
    await writeNoTint(false); // changement venu d'un autre onglet
    await vi.waitFor(() => expect(button()?.textContent).toBe("Rentabilité on"));
    expect(document.documentElement.classList.contains("kv-no-tint")).toBe(false);
  });

  it("échec d'écriture au clic : attrapé", async () => {
    startFeature(profitTint);
    vi.spyOn(fakeBrowser.storage.local, "set").mockRejectedValue(new Error("invalidated"));
    expect(() => button()?.click()).not.toThrow();
    await Promise.resolve();
  });

  it("retirée quand l'extension est rechargée", () => {
    const { page } = startFeature(profitTint);
    page.invalidate();
    expect(button()).toBeNull();
  });
});
