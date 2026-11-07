import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { readWanted, writeWanted } from "../../core/storage";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { wantedCards } from "./index";

beforeEach(() => fakeBrowser.reset());

// fake offered cards are named "Carte <id>"; offer 4 has no offered card
const specs = [{ give: 1 }, { give: 2 }, { give: 3 }, { wants: [1] }];
const attr = (snap: ReturnType<typeof makeSnapshot>, name: string) =>
  snap.offers.map((o) => o.li.hasAttribute(name));
const input = () => document.querySelector<HTMLInputElement>(".kv-wanted-input") as HTMLInputElement;
const add = (name: string) => {
  input().value = name;
  input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
};
const chips = () => [...document.querySelectorAll(".kv-pills .kv-pill")].map((b) => b.textContent);
const toggle = () =>
  [...document.querySelectorAll(".kv-pill")].find((b) => b.textContent?.startsWith("Seulement"));
const filterOn = () => document.documentElement.hasAttribute("data-kv-filter-wanted");

function start() {
  const snap = makeSnapshot(specs);
  const feature = startFeature(wantedCards);
  feature.emit(snap);
  return { snap, ...feature };
}

describe("wanted-cards", () => {
  it("adds a category with an input and the toggle", () => {
    const { filters } = start();
    expect(filters.categories.map((c) => c.title)).toEqual(["Cartes recherchées"]);
    expect(input()).not.toBeNull();
    expect(toggle()?.getAttribute("aria-pressed")).toBe("false");
  });

  it("highlights offers proposing a wanted card (name normalized), nothing hidden", () => {
    const { snap } = start();
    add("carte 2");
    expect(attr(snap, "data-kv-wanted")).toEqual([false, true, false, false]);
    expect(snap.offers[1]?.give?.el.hasAttribute("data-kv-wanted-card")).toBe(true);
    expect(attr(snap, "data-kv-hide-wanted")).toEqual([false, false, false, false]);
    expect(chips()).toEqual(["carte 2 ×"]);
  });

  it("empty or duplicate name is ignored; input is cleared", () => {
    start();
    add("Carte 2");
    add("CARTE 2");
    add("  ");
    expect(chips()).toEqual(["Carte 2 ×"]);
    expect(input().value).toBe("");
  });

  it("other keys do nothing", () => {
    start();
    input().value = "Carte 1";
    input().dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(chips()).toEqual([]);
  });

  it("clicking a chip removes the name", () => {
    const { snap } = start();
    add("Carte 2");
    (document.querySelector(".kv-pills .kv-pill") as HTMLElement).click();
    expect(chips()).toEqual([]);
    expect(attr(snap, "data-kv-wanted")).toEqual([false, false, false, false]);
  });

  it("toggle hides offers without a wanted card (offer without a card ignored), flags <html>", () => {
    const { snap } = start();
    add("Carte 2");
    (toggle() as HTMLElement).click();
    expect(attr(snap, "data-kv-hide-wanted")).toEqual([true, false, true, false]);
    expect(filterOn()).toBe(true);
    (toggle() as HTMLElement).click();
    expect(attr(snap, "data-kv-hide-wanted")).toEqual([false, false, false, false]);
    expect(filterOn()).toBe(false);
  });

  it("stores the list and the toggle", async () => {
    start();
    add("Carte 1");
    (toggle() as HTMLElement).click();
    await vi.waitFor(async () => expect(await readWanted()).toEqual({ names: ["Carte 1"], only: true }));
  });

  it("restores the stored value", async () => {
    await writeWanted({ names: ["Carte 3"], only: true });
    const { snap } = start();
    await vi.waitFor(() => expect(attr(snap, "data-kv-wanted")).toEqual([false, false, true, false]));
    expect(attr(snap, "data-kv-hide-wanted")).toEqual([true, true, false, false]);
    expect(chips()).toEqual(["Carte 3 ×"]);
  });

  it("corrupted stored value: empty list, filter off", async () => {
    await browser.storage.local.set({ wanted: "oops" });
    const { snap } = start();
    await Promise.resolve();
    expect(attr(snap, "data-kv-wanted")).toEqual([false, false, false, false]);
    expect(filterOn()).toBe(false);
  });

  it("a change from another tab is followed", async () => {
    const { snap } = start();
    await writeWanted({ names: ["Carte 1"], only: false });
    await vi.waitFor(() => expect(attr(snap, "data-kv-wanted")).toEqual([true, false, false, false]));
  });

  it("write failure: caught", async () => {
    start();
    vi.spyOn(fakeBrowser.storage.local, "set").mockRejectedValue(new Error("invalidated"));
    add("Carte 1");
    await Promise.resolve();
    expect(chips()).toEqual(["Carte 1 ×"]);
  });

  it("new render reapplies; reload removes the <html> flag", () => {
    const { snap, emit, page } = start();
    add("Carte 1");
    (toggle() as HTMLElement).click();
    for (const { li } of snap.offers) li.removeAttribute("data-kv-hide-wanted");
    emit(snap);
    expect(attr(snap, "data-kv-hide-wanted")).toEqual([false, true, true, false]);
    page.invalidate();
    expect(filterOn()).toBe(false);
  });
});
