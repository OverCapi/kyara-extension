import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { readNoTint, readTintFull, writeNoTint, writeTintFull } from "../../core/storage";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { profitTint } from "./index";

beforeEach(() => {
  fakeBrowser.reset();
  document.documentElement.classList.remove("kv-no-tint");
});

const button = () => document.querySelector<HTMLButtonElement>(".kv-toggle");

describe("profit-tint: offer background", () => {
  it("tints from the best gain among my cards", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2] }], { fair: { 1: 10, 2: 5 }, free: [2] });
    startFeature(profitTint).emit(snap);
    expect(snap.offers[0]?.li.style.getPropertyValue("--kv-bg")).toBe("rgba(90, 190, 255, 0.45)");
  });
  it("transparent if the gain is unknown", () => {
    const snap = makeSnapshot([{ give: 1, wants: [2] }], { free: [] });
    startFeature(profitTint).emit(snap);
    expect(snap.offers[0]?.li.style.getPropertyValue("--kv-bg")).toBe("transparent");
  });
  it("offer without an offered card: ignored", () => {
    const snap = makeSnapshot([{ wants: [2] }]);
    startFeature(profitTint).emit(snap);
    expect(snap.offers[0]?.li.style.getPropertyValue("--kv-bg")).toBe("");
  });
});

describe("profit-tint: pill", () => {
  it("visible only when there are offers", () => {
    const { emit } = startFeature(profitTint);
    expect(button()?.hidden).toBe(true);
    emit(makeSnapshot([{ give: 1 }]));
    expect(button()?.hidden).toBe(false);
    document.body.replaceChildren(button() as Node);
    emit({ offers: [], store: { fair: {}, market: {} } });
    expect(button()?.hidden).toBe(true);
  });

  it("shows 'on' by default, 'off' if the preference is stored", async () => {
    startFeature(profitTint);
    await vi.waitFor(() => expect(button()?.textContent).toBe("Rentabilité on"));
    expect(button()?.getAttribute("aria-pressed")).toBe("true");
    document.querySelector(".kv-toggle")?.remove();
    await writeNoTint(true);
    startFeature(profitTint);
    await vi.waitFor(() => expect(button()?.textContent).toBe("Rentabilité off"));
    expect(document.documentElement.classList.contains("kv-no-tint")).toBe(true);
  });

  it("a click toggles and stores; another tab is followed", async () => {
    startFeature(profitTint);
    await vi.waitFor(() => expect(button()?.textContent).toBe("Rentabilité on"));
    button()?.click();
    await vi.waitFor(() => expect(button()?.textContent).toBe("Rentabilité off"));
    expect(await readNoTint()).toBe(true);
    await writeNoTint(false); // change from another tab
    await vi.waitFor(() => expect(button()?.textContent).toBe("Rentabilité on"));
    expect(document.documentElement.classList.contains("kv-no-tint")).toBe(false);
  });

  it("write failure on click: caught", async () => {
    startFeature(profitTint);
    vi.spyOn(fakeBrowser.storage.local, "set").mockRejectedValue(new Error("invalidated"));
    expect(() => button()?.click()).not.toThrow();
    await Promise.resolve();
  });

  it("removed when the extension reloads", () => {
    const { page } = startFeature(profitTint);
    page.invalidate();
    expect(button()).toBeNull();
  });
});

describe("profit-tint: color scale slider", () => {
  const slider = () => document.querySelector<HTMLInputElement>('.kv-level input[type="range"]');
  const label = () => document.querySelector(".kv-level span")?.textContent;
  const bg = (snap: ReturnType<typeof makeSnapshot>) => snap.offers[0]?.li.style.getPropertyValue("--kv-bg");
  // +50 % gain: 7.5 for 5
  const half = () => makeSnapshot([{ give: 1, wants: [2] }], { fair: { 1: 7.5, 2: 5 }, free: [2] });

  it("registered as a category, default 100 %", async () => {
    const { filters } = startFeature(profitTint);
    expect(filters.categories.map((c) => c.title)).toEqual(["Couleur des offres"]);
    await vi.waitFor(() => expect(label()).toBe("Couleur max à ±100 %"));
    expect(slider()?.value).toBe("100");
  });

  it("moving the slider recolors the current offers live and is stored", async () => {
    const snap = half();
    startFeature(profitTint).emit(snap);
    expect(bg(snap)).toBe("rgba(90, 190, 255, 0.23)");
    const el = slider();
    if (!el) throw new Error("slider missing");
    el.value = "50";
    el.dispatchEvent(new Event("input"));
    expect(bg(snap)).toBe("rgba(90, 190, 255, 0.45)");
    expect(label()).toBe("Couleur max à ±50 %");
    await vi.waitFor(async () => expect(await readTintFull()).toBe(50));
  });

  it("stored value applied at load; another tab followed; out of range clamped", async () => {
    await writeTintFull(25);
    const snap = half();
    startFeature(profitTint).emit(snap);
    await vi.waitFor(() => expect(slider()?.value).toBe("25"));
    expect(bg(snap)).toBe("rgba(90, 190, 255, 0.45)");
    await writeTintFull(200); // change from another tab
    await vi.waitFor(() => expect(slider()?.value).toBe("200"));
    expect(bg(snap)).toBe("rgba(90, 190, 255, 0.11)");
    await writeTintFull(5000);
    await vi.waitFor(() => expect(label()).toBe("Couleur max à ±200 %"));
  });
});
