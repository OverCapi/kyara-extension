import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPillMirror } from "./mirror";

beforeEach(() => {
  document.body.innerHTML = "";
});

const PILLS =
  '<button type="button" aria-pressed="false">Que je n’ai pas</button>' +
  '<button type="button" aria-pressed="true">Que je cherche</button>' +
  '<button type="button" aria-pressed="false">Mes offres <span class="n">0</span></button>';

function setup(pills = PILLS) {
  const filters = document.createElement("div");
  filters.className = "filters";
  filters.innerHTML = `<input type="search"><div class="pills">${pills}</div>`;
  document.body.append(filters);
  const host = document.createElement("div");
  const mirror = createPillMirror(host);
  return { filters, host, mirror };
}
const titles = (host: HTMLElement) => [...host.querySelectorAll("h4")].map((h) => h.textContent);
const labels = (host: HTMLElement) => [...host.querySelectorAll(".kv-pill")].map((b) => b.textContent);
const copies = (host: HTMLElement) => [...host.querySelectorAll<HTMLButtonElement>(".kv-pill")];

describe("createPillMirror", () => {
  it("2 categories: Cards (regular pills) and My offers (the one with a counter)", () => {
    const { filters, host, mirror } = setup();
    mirror.sync(filters);
    expect(titles(host)).toEqual(["Cartes", "Mes offres"]);
    expect(labels(host)).toEqual(["Que je n’ai pas", "Que je cherche", "Mes offres 0"]);
  });
  it("empty category: no title", () => {
    const { filters, host, mirror } = setup('<button type="button">Que je cherche</button>');
    mirror.sync(filters);
    expect(titles(host)).toEqual(["Cartes"]);
  });
  it("no pill: nothing", () => {
    const { filters, host, mirror } = setup("");
    mirror.sync(filters);
    expect(host.children).toHaveLength(0);
  });
  it("the copy takes the original's state", () => {
    const { filters, host, mirror } = setup();
    mirror.sync(filters);
    expect(copies(host).map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "true", "false"]);
  });
  it("a click on the copy clicks the original, then the copy follows its new state", async () => {
    const { filters, host, mirror } = setup();
    const source = filters.querySelector<HTMLButtonElement>(".pills > button");
    source?.addEventListener("click", () => source.setAttribute("aria-pressed", "true"));
    mirror.sync(filters);
    copies(host)[0]?.click();
    await vi.waitFor(() => expect(copies(host)[0]?.getAttribute("aria-pressed")).toBe("true"));
  });
  it("same pills: the copy is not rebuilt, but its state is updated", () => {
    const { filters, host, mirror } = setup();
    mirror.sync(filters);
    const before = copies(host);
    filters.querySelector(".pills > button")?.setAttribute("aria-pressed", "true");
    mirror.sync(filters);
    expect(copies(host)[0]).toBe(before[0]);
    expect(before[0]?.getAttribute("aria-pressed")).toBe("true");
  });
  it("changed text (e.g. counter): rebuilt", () => {
    const { filters, host, mirror } = setup();
    mirror.sync(filters);
    const counter = filters.querySelector(".n");
    if (counter) counter.textContent = "3";
    mirror.sync(filters);
    expect(labels(host)).toContain("Mes offres 3");
  });
  it("pills recreated by the site with the same text: rebuilt, the click targets the new ones", () => {
    const { filters, host, mirror } = setup();
    mirror.sync(filters);
    const pills = filters.querySelector(".pills");
    if (pills) pills.innerHTML = PILLS;
    const fresh = filters.querySelector<HTMLButtonElement>(".pills > button");
    const clicked = vi.fn();
    fresh?.addEventListener("click", clicked);
    mirror.sync(filters);
    copies(host)[0]?.click();
    expect(clicked).toHaveBeenCalledTimes(1);
  });
});
