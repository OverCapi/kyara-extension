import { beforeEach, describe, expect, it, vi } from "vitest";
import { FREE_IDS_ATTR, HOOK_ATTR, OPEN_COUNT_ATTR, WALLET_ATTR } from "../../kyara/packs";
import { findCountPicker } from "../../kyara/page-dom";
import { makeSnapshot, mockFetch, startFeature } from "../../test/helpers";
import { freePacksOption, worthOffering } from "./index";

const html = document.documentElement;

/**
 * Count picker + "Ouvrir" button with the site's structure; a click selects the option and, like Svelte,
 * rewrites the button's "Ouvrir ×N" text only when its own value changes.
 */
function renderPicker(counts: number[]) {
  const under = document.createElement("div");
  under.innerHTML =
    '<div class="multi" role="group" aria-label="Nombre de boosters à ouvrir"></div>' +
    '<button class="btn btn-open" type="button">Ouvrir <span class="tag">Gratuit · 2 restants</span></button>';
  const group = under.querySelector<HTMLElement>("[role=group]") as HTMLElement;
  const text = under.querySelector(".btn-open")?.firstChild as Text;
  let shown = text.data;
  const select = (el: HTMLButtonElement) => {
    const value = el.textContent === "×1" ? "Ouvrir " : `Ouvrir ${el.textContent} `;
    if (value !== shown) text.data = shown = value;
    for (const b of group.querySelectorAll("button:not([data-kv-free])")) {
      b.setAttribute("aria-pressed", String(b === el));
      b.className = b === el ? "svelte-x on" : "svelte-x";
    }
  };
  for (const n of counts) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = `×${n}`;
    b.addEventListener("click", () => select(b));
    group.append(b);
  }
  if (group.firstElementChild) select(group.firstElementChild as HTMLButtonElement);
  document.body.append(under);
  return group;
}
const option = () => document.querySelector<HTMLButtonElement>("[data-kv-free]");
const site = (n: number) =>
  [...document.querySelectorAll<HTMLButtonElement>("[role=group] > button:not([data-kv-free])")].find(
    (b) => b.textContent === `×${n}`,
  ) as HTMLButtonElement;
const tag = () => document.querySelector<HTMLElement>(".tag");
const openText = () => document.querySelector(".btn-open")?.firstChild?.textContent;
const tick = () => new Promise((r) => setTimeout(r, 0));

/** Opening page of `pack` with `free` boosters, picker `counts`; the feature started and rendered once. */
function start(opts: { pack?: string; free: Record<string, number>; counts: number[]; hook?: boolean }) {
  history.replaceState(null, "", `/ouvrir/${opts.pack ?? "all"}`);
  mockFetch({}); // the feature's own refresh (/api/me, /api/packs): nothing new
  html.setAttribute(WALLET_ATTR, JSON.stringify({ free: opts.free.all ?? 0, grants: {} }));
  html.setAttribute(FREE_IDS_ATTR, JSON.stringify(Object.keys(opts.free)));
  html.toggleAttribute(HOOK_ATTR, opts.hook ?? true);
  renderPicker(opts.counts);
  const f = startFeature(freePacksOption);
  const render = () => f.emit(makeSnapshot([]));
  render();
  return { ...f, render };
}

beforeEach(() => {
  history.replaceState(null, "", "/");
});

describe("worthOffering", () => {
  const picker = (counts: number[]) => {
    renderPicker(counts);
    return findCountPicker() ?? { group: document.body, options: [] };
  };
  it("only between 1 and the largest option, when not already offered", () => {
    expect(worthOffering(2, picker([1, 4]))).toBe(true);
    expect(worthOffering(1, picker([1, 4]))).toBe(false);
    expect(worthOffering(4, picker([1, 4]))).toBe(false);
    expect(worthOffering(5, picker([1, 5, 10]))).toBe(false);
    expect(worthOffering(12, picker([1, 5, 10]))).toBe(false);
  });
});

describe("free-packs: the option", () => {
  it("×2 placed between ×1 and ×4, unselected, styled like a site option", () => {
    start({ free: { all: 2 }, counts: [1, 4] });
    const labels = [...document.querySelectorAll("[role=group] > button")].map((b) => b.textContent);
    expect(labels).toEqual(["×1", "×2", "×4"]);
    expect(option()?.getAttribute("aria-pressed")).toBe("false");
    expect(option()?.className).toBe("svelte-x");
    expect(option()?.title).toBe("Ouvrir seulement tes boosters gratuits (aucun chakra dépensé)");
  });
  it("nothing to add: 1 free, count already offered, unknown pack, other page, no picker", () => {
    start({ free: { all: 1 }, counts: [1, 4] });
    expect(option()).toBeNull();
    document.body.replaceChildren();
    start({ free: { all: 5 }, counts: [1, 5, 10] });
    expect(option()).toBeNull();
    document.body.replaceChildren();
    start({ pack: "top", free: { all: 2 }, counts: [1, 4] });
    expect(option()).toBeNull();
    history.replaceState(null, "", "/marche");
    expect(() => start({ pack: "", free: { all: 2 }, counts: [] })).not.toThrow();
    expect(option()).toBeNull();
  });
});

describe("free-packs: safety and data", () => {
  it("page hook not installed: no option (nothing would rewrite the request)", () => {
    start({ free: { all: 2 }, counts: [1, 4], hook: false });
    expect(option()).toBeNull();
  });
  it("free boosters unknown at first: read from /api/me, then the option shows", async () => {
    history.replaceState(null, "", "/ouvrir/all");
    html.toggleAttribute(HOOK_ATTR, true);
    html.setAttribute(FREE_IDS_ATTR, '["all"]');
    const fetchMock = mockFetch({ freePacks: 6 });
    renderPicker([1, 5, 10]);
    startFeature(freePacksOption).emit(makeSnapshot([]));
    expect(option()).toBeNull();
    await vi.waitFor(() => expect(option()?.textContent).toBe("×6"));
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/me");
    expect(fetchMock).toHaveBeenCalledTimes(1); // pack ids already known: no /api/packs
  });
});

describe("free-packs: choosing ×N", () => {
  it("selects a bulk site option, asks the hook for N, shows ×N selected and the free cost", async () => {
    start({ free: { all: 2 }, counts: [1, 4] });
    option()?.click();
    await tick();
    expect(site(4).getAttribute("aria-pressed")).toBe("true");
    expect(html.getAttribute(OPEN_COUNT_ATTR)).toBe("2");
    expect(option()?.getAttribute("aria-pressed")).toBe("true");
    expect(option()?.className).toBe("svelte-x on");
    expect(site(4).hasAttribute("data-kv-muted")).toBe(true);
    expect(tag()?.dataset.kvTag).toBe("2 gratuits");
    expect(openText()).toBe("Ouvrir ×2 ");
  });
  it("no chakra warning from the site while ×N is chosen (it prices its ×4), back once cancelled", async () => {
    sessionStorage.clear();
    start({ free: { all: 2 }, counts: [1, 4] });
    option()?.click();
    await tick();
    expect(sessionStorage.getItem("kyara.open.paidok")).toBe("1");
    site(1).click();
    expect(sessionStorage.getItem("kyara.open.paidok")).toBeNull();
  });
  it("a second click on ×N changes nothing", async () => {
    start({ free: { all: 2 }, counts: [1, 4] });
    option()?.click();
    await tick();
    option()?.click();
    await tick();
    expect(html.getAttribute(OPEN_COUNT_ATTR)).toBe("2");
  });
  it("picking a site option cancels: no rewrite, colors and cost tag back", async () => {
    start({ free: { all: 2 }, counts: [1, 4] });
    option()?.click();
    await tick();
    site(1).click();
    expect(html.hasAttribute(OPEN_COUNT_ATTR)).toBe(false); // at once, before any render
    await tick();
    expect(option()?.getAttribute("aria-pressed")).toBe("false");
    expect(site(4).hasAttribute("data-kv-muted")).toBe(false);
    expect(site(4).style.color).toBe("");
    expect(tag()?.dataset.kvTag).toBeUndefined();
    expect(openText()).toBe("Ouvrir ");
  });
  it("picking the same bulk option again shows the site's count back (Svelte does not rewrite it)", async () => {
    start({ free: { all: 2 }, counts: [1, 4, 10] });
    option()?.click();
    await tick();
    site(4).click();
    await tick();
    expect(openText()).toBe("Ouvrir ×4 ");
    site(10).click();
    await tick();
    expect(openText()).toBe("Ouvrir ×10 ");
  });
  it("the site moving its selection by itself also cancels", async () => {
    const f = start({ free: { all: 2 }, counts: [1, 4] });
    option()?.click();
    await tick();
    site(4).setAttribute("aria-pressed", "false");
    f.render();
    expect(html.hasAttribute(OPEN_COUNT_ATTR)).toBe(false);
  });
  it("after opening (free boosters used): option removed and site back to ×1", async () => {
    const f = start({ free: { all: 2 }, counts: [1, 4] });
    option()?.click();
    await tick();
    f.render(); // reveal: no picker in the page, the choice is kept
    html.setAttribute(WALLET_ATTR, '{"free":0}');
    f.render();
    expect(option()).toBeNull();
    expect(site(1).getAttribute("aria-pressed")).toBe("true");
    expect(html.hasAttribute(OPEN_COUNT_ATTR)).toBe(false);
  });
  it("kept while the picker is gone (reveal), dropped when leaving the opening page", async () => {
    const f = start({ free: { all: 2 }, counts: [1, 4] });
    option()?.click();
    await tick();
    const picker = document.querySelector("[role=group]");
    picker?.remove();
    f.render();
    expect(html.getAttribute(OPEN_COUNT_ATTR)).toBe("2");
    history.replaceState(null, "", "/collection");
    f.render();
    expect(html.hasAttribute(OPEN_COUNT_ATTR)).toBe(false);
  });
  it("extension reload: option removed, choice cancelled", async () => {
    const f = start({ free: { all: 2 }, counts: [1, 4] });
    option()?.click();
    await tick();
    f.page.invalidate();
    expect(option()).toBeNull();
    expect(html.hasAttribute(OPEN_COUNT_ATTR)).toBe(false);
  });
});
