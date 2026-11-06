import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { readRarities, writeRarities } from "../../core/storage";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { rarityFilter } from "./index";

beforeEach(() => fakeBrowser.reset());

const shadow = (rgb: string) => `rgb(${rgb}) 0px 0px 0px 2px inset`;
const LEGENDARY = shadow("245, 197, 24");
const MYTHIC = shadow("255, 77, 46");
const COMMON = shadow("181, 177, 187");

// offer 1 legendary, 2 mythic, 3 common, 4 without color, 5 without an offered card
const specs = [
  { give: 1, shadow: LEGENDARY },
  { give: 2, shadow: MYTHIC },
  { give: 3, shadow: COMMON },
  { give: 4 },
  { wants: [2] },
];
const hidden = (snap: ReturnType<typeof makeSnapshot>) =>
  snap.offers.map((o) => o.li.hasAttribute("data-kv-hide-rarity"));
const chip = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>(".kv-chip")].find((b) => b.textContent === label);
const pressed = () =>
  [...document.querySelectorAll(".kv-chip")]
    .filter((b) => b.getAttribute("aria-pressed") === "true")
    .map((b) => b.textContent);

function start() {
  const snap = makeSnapshot(specs);
  const feature = startFeature(rarityFilter);
  feature.emit(snap);
  return { snap, ...feature };
}

describe("rarity-filter", () => {
  it("adds a Rarity category with one chip per rarity and its hint", () => {
    const { filters } = start();
    expect(filters.categories.map((c) => c.title)).toEqual(["Rareté"]);
    expect([...document.querySelectorAll(".kv-chip")].map((b) => b.textContent)).toEqual([
      "Commune",
      "Peu commune",
      "Rare",
      "Épique",
      "Légendaire",
      "Mythique",
    ]);
    expect(document.querySelector(".kv-hint")?.textContent).toContain("Aucune sélection");
    expect((chip("Mythique") as HTMLElement).style.getPropertyValue("--kv-rar")).toBe("var(--M, #ff4d2e)");
  });

  it("no selection: nothing is hidden", () => {
    const { snap } = start();
    expect(hidden(snap)).toEqual([false, false, false, false, false]);
    expect(pressed()).toEqual([]);
  });

  it("a chip keeps only that rarity, unknown rarity hidden, offer without a card ignored", () => {
    const { snap } = start();
    chip("Légendaire")?.click();
    expect(hidden(snap)).toEqual([false, true, true, true, false]);
    expect(pressed()).toEqual(["Légendaire"]);
  });

  it("multi-select, then deselect", () => {
    const { snap } = start();
    chip("Légendaire")?.click();
    chip("Mythique")?.click();
    expect(hidden(snap)).toEqual([false, false, true, true, false]);
    chip("Légendaire")?.click();
    chip("Mythique")?.click();
    expect(hidden(snap)).toEqual([false, false, false, false, false]);
  });

  it("stores the choice, in rarity order", async () => {
    start();
    chip("Mythique")?.click();
    chip("Commune")?.click();
    await vi.waitFor(async () => expect(await readRarities()).toEqual(["mythic", "common"]));
  });

  it("restores the stored choice; invalid values ignored", async () => {
    await browser.storage.local.set({ rarities: ["epic", "nope", 3] });
    const { snap } = start();
    await vi.waitFor(() => expect(pressed()).toEqual(["Épique"]));
    expect(hidden(snap)).toEqual([true, true, true, true, false]);
  });

  it("stored value that is not a list: no rarity", async () => {
    await browser.storage.local.set({ rarities: "mythic" });
    const { snap } = start();
    await Promise.resolve();
    expect(hidden(snap)).toEqual([false, false, false, false, false]);
  });

  it("a change from another tab is followed", async () => {
    const { snap } = start();
    await writeRarities(["mythic"]);
    await vi.waitFor(() => expect(hidden(snap)).toEqual([true, false, true, true, false]));
    expect(pressed()).toEqual(["Mythique"]);
  });

  it("write failure: caught", async () => {
    start();
    vi.spyOn(fakeBrowser.storage.local, "set").mockRejectedValue(new Error("invalidated"));
    chip("Rare")?.click();
    await Promise.resolve();
    expect(pressed()).toEqual(["Rare"]);
  });

  it("new page render: the filter is reapplied", () => {
    const { snap, emit } = start();
    chip("Légendaire")?.click();
    for (const { li } of snap.offers) li.removeAttribute("data-kv-hide-rarity"); // the site redraws its offers
    emit(snap);
    expect(hidden(snap)).toEqual([false, true, true, true, false]);
  });

  it("active filter flagged on <html> (offers held before processing), removed when nothing is selected or on reload", () => {
    const { page } = start();
    const active = () => document.documentElement.hasAttribute("data-kv-filter-rarity");
    expect(active()).toBe(false);
    chip("Rare")?.click();
    expect(active()).toBe(true);
    chip("Rare")?.click();
    expect(active()).toBe(false);
    chip("Rare")?.click();
    page.invalidate();
    expect(active()).toBe(false);
  });
});
