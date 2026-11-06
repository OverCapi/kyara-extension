import { beforeEach, describe, expect, it } from "vitest";
import { fakeCtx } from "../../test/helpers";
import { createFilterPanel } from "./index";

beforeEach(() => {
  document.body.innerHTML = "";
});

const bar = () => {
  const el = document.createElement("div");
  el.className = "filters";
  el.innerHTML =
    '<input type="search"><div class="pills"><button type="button">Que je cherche</button></div>';
  document.body.append(el);
  return el;
};
const menu = () => document.querySelector<HTMLElement>(".kv-menu");
const button = () => document.querySelector<HTMLButtonElement>(".kv-menu-btn");
const popover = () => document.querySelector<HTMLElement>(".kv-popover");

describe("createFilterPanel: placement", () => {
  it("nothing in the page before attach", () => {
    createFilterPanel(fakeCtx());
    expect(menu()).toBeNull();
  });
  it("attach: button in the bar, original pills hidden by the attribute, only once", () => {
    const panel = createFilterPanel(fakeCtx());
    const filters = bar();
    panel.attach(filters);
    panel.attach(filters);
    expect(filters.lastElementChild).toBe(menu());
    expect(document.querySelectorAll(".kv-menu")).toHaveLength(1);
    expect(filters.hasAttribute("data-kv-panel")).toBe(true);
  });
  it("attach(null) removes the button; a new bar gets it back", () => {
    const panel = createFilterPanel(fakeCtx());
    panel.attach(bar());
    panel.attach(null);
    expect(menu()).toBeNull();
    const fresh = bar();
    panel.attach(fresh);
    expect(fresh.lastElementChild).toBe(menu());
  });
  it("extension reload: button removed and the site's pills restored", () => {
    const page = fakeCtx();
    const panel = createFilterPanel(page);
    const filters = bar();
    panel.attach(filters);
    page.invalidate();
    expect(menu()).toBeNull();
    expect(filters.hasAttribute("data-kv-panel")).toBe(false);
  });
  it("reload before any attach: no error", () => {
    const page = fakeCtx();
    createFilterPanel(page);
    expect(() => page.invalidate()).not.toThrow();
  });
});

describe("createFilterPanel: popover", () => {
  const open = () => {
    const panel = createFilterPanel(fakeCtx());
    panel.attach(bar());
    return panel;
  };
  it("funnel icon button, with a title, popover closed at first", () => {
    open();
    expect(button()?.querySelector("svg path")).not.toBeNull();
    expect(button()?.title).toBe("Filtres");
    expect(popover()?.hidden).toBe(true);
    expect(button()?.getAttribute("aria-expanded")).toBe("false");
  });
  it("one click opens, another closes", () => {
    open();
    button()?.click();
    expect(popover()?.hidden).toBe(false);
    expect(button()?.getAttribute("aria-expanded")).toBe("true");
    button()?.click();
    expect(popover()?.hidden).toBe(true);
  });
  const press = (el: Element | null | undefined) =>
    el?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
  it("a press outside closes, a press inside does not", () => {
    open();
    button()?.click();
    press(popover());
    expect(popover()?.hidden).toBe(false);
    press(document.body);
    expect(popover()?.hidden).toBe(true);
  });
  it("a click by script outside (load-more, mirrored pill) does not close", () => {
    open();
    button()?.click();
    document.body.click();
    expect(popover()?.hidden).toBe(false);
  });
  it("Escape closes, another key does not", () => {
    open();
    button()?.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(popover()?.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(popover()?.hidden).toBe(true);
  });
  it("2 sections in order: Kyara then extension", () => {
    open();
    const titles = [...document.querySelectorAll(".kv-section > h3")].map((h) => h.textContent);
    expect(titles).toEqual(["Filtres Kyara", "Filtres de l'extension"]);
  });
  it("addCategory puts the category (title + content) in the extension section", () => {
    const panel = open();
    const content = document.createElement("p");
    content.textContent = "setting";
    panel.addCategory("Rarity", content);
    const sections = document.querySelectorAll(".kv-section");
    const cat = sections[1]?.querySelector(".kv-cat");
    expect(cat?.querySelector("h4")?.textContent).toBe("Rarity");
    expect(cat?.contains(content)).toBe(true);
    expect(sections[0]?.querySelector(".kv-cat")).not.toBeNull(); // the site's pill is mirrored here
  });
  it("category added before attach: kept when the panel is placed", () => {
    const panel = createFilterPanel(fakeCtx());
    panel.addCategory("Sort", document.createElement("div"));
    panel.attach(bar());
    expect(document.querySelectorAll(".kv-section")[1]?.querySelector("h4")?.textContent).toBe("Sort");
  });
});
