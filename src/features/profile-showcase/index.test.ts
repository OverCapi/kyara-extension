import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { startFeature } from "../../test/helpers";
import { createAmbient } from "./ambient";
import { DEFAULT_DESIGN, DESIGNS, toDesign } from "./designs";
import { profileShowcase } from "./index";

const html = document.documentElement;

function renderProfile(ids: number[] = [1, 2]): void {
  const cases = ids
    .map(
      (id) =>
        `<button class="disp"><span class="glass"><div class="tcg"><div class="art">` +
        `<img src="https://cdn.kyara.games/cards/sm/${id}.webp"></div></div></span></button>`,
    )
    .join("");
  document.body.innerHTML = `<section><div><aside class="side"><h1>K</h1></aside><div><div class="cases">${cases}</div></div></div></section>`;
}

async function start(design?: string) {
  if (design) await browser.storage.local.set({ profileDesign: design });
  const feature = startFeature(profileShowcase);
  await vi.waitFor(() => expect(picker()?.querySelector("[aria-pressed=true]")).not.toBeNull());
  return feature;
}
const picker = () => document.querySelector<HTMLElement>(".kv-design");
const designButton = (id: string) => document.querySelector<HTMLElement>(`[data-kv-design-id="${id}"]`);

beforeEach(() => {
  fakeBrowser.reset();
  window.history.replaceState({}, "", "/profil/abc");
  renderProfile();
});

describe("toDesign", () => {
  it("known ids pass, everything else gives the default", () => {
    expect(toDesign("fan")).toBe("fan");
    expect(toDesign("nope")).toBe(DEFAULT_DESIGN);
    expect(toDesign(undefined)).toBe(DEFAULT_DESIGN);
    expect(toDesign(42)).toBe(DEFAULT_DESIGN);
  });
  it("every design has a distinct id and an icon", () => {
    expect(new Set(DESIGNS.map((d) => d.id)).size).toBe(DESIGNS.length);
    expect(DESIGNS.every((d) => d.icon.length > 0)).toBe(true);
  });
});

describe("createAmbient", () => {
  it("puts each new art on the hidden layer, and ignores the art already shown", () => {
    const page = document.createElement("div");
    const ambient = createAmbient();
    ambient.show(page, "a.webp");
    expect(page.getAttribute("data-kv-bd")).toBe("a");
    expect(page.style.getPropertyValue("--kv-bd-a")).toContain("a.webp");
    ambient.show(page, "a.webp");
    expect(page.getAttribute("data-kv-bd")).toBe("a");
    ambient.show(page, "b.webp");
    expect(page.getAttribute("data-kv-bd")).toBe("b");
    expect(page.style.getPropertyValue("--kv-bd-b")).toContain("b.webp");
    expect(ambient.current()).toBe("b.webp");
  });
});

describe("profile-showcase", () => {
  it("default: first design on a profile, picker shown and page marked", async () => {
    const f = await start();
    f.emit({ offers: [], store: { fair: {}, market: {} } });
    expect(html.getAttribute("data-kv-design")).toBe(DEFAULT_DESIGN);
    expect(html.hasAttribute("data-kv-prof-ready")).toBe(true);
    expect(picker()?.hidden).toBe(false);
    expect(document.querySelectorAll("[data-kv-show-case]")).toHaveLength(2);
    expect(document.querySelector("[data-kv-prof=page]")?.getAttribute("data-kv-bd")).toBe("a");
  });
  it("reads the stored design", async () => {
    await start("prism");
    expect(html.getAttribute("data-kv-design")).toBe("prism");
    expect(designButton("prism")?.getAttribute("aria-pressed")).toBe("true");
  });
  it("corrupted stored value: the default", async () => {
    await start("deleted-design");
    expect(html.getAttribute("data-kv-design")).toBe(DEFAULT_DESIGN);
  });
  it("picking a design applies it at once and stores it", async () => {
    await start();
    designButton("ribbon")?.click();
    expect(html.getAttribute("data-kv-design")).toBe("ribbon");
    await vi.waitFor(async () => {
      expect((await browser.storage.local.get("profileDesign")).profileDesign).toBe("ribbon");
    });
    expect(html.getAttribute("data-kv-design")).toBe("ribbon"); // our own echo changes nothing
  });
  it('"site" removes the redesign but keeps the picker', async () => {
    await start();
    designButton("site")?.click();
    expect(html.hasAttribute("data-kv-design")).toBe(false);
    expect(picker()?.hidden).toBe(false);
    expect(designButton("site")?.getAttribute("aria-pressed")).toBe("true");
  });
  it("follows a change from another tab", async () => {
    await start();
    await browser.storage.local.set({ profileDesign: "fan" });
    await vi.waitFor(() => expect(html.getAttribute("data-kv-design")).toBe("fan"));
  });
  it("outside a profile: no redesign, no picker", async () => {
    window.history.replaceState({}, "", "/marche");
    await start();
    expect(html.hasAttribute("data-kv-design")).toBe(false);
    expect(html.hasAttribute("data-kv-prof-ready")).toBe(false);
    expect(picker()?.hidden).toBe(true);
  });
  it("leaving the profile removes the redesign", async () => {
    const f = await start();
    window.history.replaceState({}, "", "/marche");
    f.emit({ offers: [], store: { fair: {}, market: {} } });
    expect(html.hasAttribute("data-kv-design")).toBe(false);
  });
  it("site changed: profile path without the layout, no picker and nothing marked", async () => {
    document.body.innerHTML = "<p>?</p>";
    await start();
    expect(picker()?.hidden).toBe(true);
    expect(document.querySelector("[data-kv-show-case]")).toBeNull();
  });
  it("the backdrop follows the hovered or focused card", async () => {
    await start();
    const page = document.querySelector("[data-kv-prof=page]");
    const second = document.querySelectorAll("[data-kv-show-case]")[1];
    second?.dispatchEvent(new Event("mouseover", { bubbles: true }));
    expect(page?.getAttribute("data-kv-bd")).toBe("b");
    expect(page?.getAttribute("style")).toContain("/sm/2.webp");
    document.querySelector("h1")?.dispatchEvent(new Event("focusin", { bubbles: true }));
    expect(page?.getAttribute("data-kv-bd")).toBe("b"); // not a card: no change
  });
  it("the backdrop changes with the page's cards: nothing is tied to one profile", async () => {
    const f = await start();
    renderProfile([7, 8]);
    f.emit({ offers: [], store: { fair: {}, market: {} } });
    expect(document.querySelector("[data-kv-prof=page]")?.getAttribute("style")).toContain("/sm/7.webp");
  });
  it("extension reloaded: everything is removed", async () => {
    const f = await start();
    f.page.invalidate();
    expect(html.hasAttribute("data-kv-design")).toBe(false);
    expect(html.hasAttribute("data-kv-prof-ready")).toBe(false);
    expect(picker()).toBeNull();
    f.emit({ offers: [], store: { fair: {}, market: {} } });
    expect(html.hasAttribute("data-kv-design")).toBe(false);
  });
});
