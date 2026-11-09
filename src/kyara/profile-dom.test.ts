import { describe, expect, it } from "vitest";
import {
  cardArt,
  findProfileLayout,
  findShowcase,
  isProfilePath,
  markProfileLayout,
  markShowcase,
} from "./profile-dom";

const SRC = "https://cdn.kyara.games/cards/sm/88572.webp";

/** Same structure as the site: frame + optional sleeve around the card. */
function siteCase(opts: { fav?: boolean; sleeve?: string; src?: string } = {}): string {
  const card =
    `<div class="tcg r-M"><div class="tcg-top"><span class="tcg-name">Emilia</span><span class="gem">M</span></div>` +
    `<div class="art"><img src="${opts.src ?? SRC}"><span class="art-k">エミリア</span><span class="art-n">#8</span></div>` +
    `<div class="tcg-type">Re:ZERO</div><div class="tcg-stats"><span>POW 99</span></div>` +
    `<div class="holo"></div><div class="glare"></div></div>`;
  const inner = opts.sleeve
    ? `<span class="bl bl-${opts.sleeve}"><span class="back"></span><span class="bubble">${card}</span></span>`
    : card;
  return `<button class="disp ${opts.fav ? "fav" : ""}"><span class="glass"><span class="lift">${inner}</span><span class="shine"></span></span></button>`;
}

function renderSite(cases: string): void {
  document.body.innerHTML =
    `<main><section class="band"></section><div class="wrap"><aside class="side"><div class="head"><div class="id"><h1>Kin-5</h1></div></div>` +
    `<div class="kpis"></div></aside><div class="main"><div class="ptabs"><button>A</button></div><section><h2>Sa vitrine</h2>` +
    `<div class="cases">${cases}</div></section></div></div></main>`;
}

describe("isProfilePath", () => {
  it("recognizes profile pages only", () => {
    expect(isProfilePath("/profil/942d5d82")).toBe(true);
    expect(isProfilePath("/profil")).toBe(true);
    expect(isProfilePath("/profils")).toBe(false);
    expect(isProfilePath("/marche")).toBe(false);
  });
});

describe("cardArt", () => {
  it("gives both sizes", () => {
    expect(cardArt(SRC)).toEqual({
      sm: "https://cdn.kyara.games/cards/sm/88572.webp",
      lg: "https://cdn.kyara.games/cards/lg/88572.webp",
    });
  });
  it("refuses any other URL (it would end up in a CSS url())", () => {
    expect(cardArt("https://evil.test/cards/sm/1.webp")).toBeNull();
    expect(cardArt('https://cdn.kyara.games/cards/sm/1.webp");x:y')).toBeNull();
    expect(cardArt("")).toBeNull();
  });
});

describe("findProfileLayout", () => {
  it("finds the regions in the site's markup", () => {
    renderSite(siteCase());
    const layout = findProfileLayout();
    expect(layout?.side.tagName).toBe("ASIDE");
    expect(layout?.main.className).toBe("main");
    expect(layout?.page.tagName).toBe("MAIN");
    expect(layout?.banner?.className).toBe("band");
    expect(layout?.stats?.className).toBe("kpis");
  });
  it("fallback: the aside holding the h1, classes renamed", () => {
    renderSite(siteCase());
    document.querySelector("aside")?.setAttribute("class", "x1");
    expect(findProfileLayout()?.side.className).toBe("x1");
  });
  it("owner's profile: the links row after the stats is not taken for the stats", () => {
    renderSite(siteCase());
    const links = document.createElement("div");
    links.className = "side-links";
    document.querySelector("aside")?.append(links);
    expect(findProfileLayout()?.stats?.className).toBe("kpis");
  });
  it("fallback: stats are the second element of the column, classes renamed", () => {
    renderSite(siteCase());
    document.querySelector(".kpis")?.setAttribute("class", "x2");
    document.querySelector("aside")?.append(document.createElement("div"));
    expect(findProfileLayout()?.stats?.className).toBe("x2");
  });
  it("tabs: site markup, then a first row of buttons, otherwise nothing", () => {
    renderSite(siteCase());
    expect(findProfileLayout()?.tabs?.className).toBe("ptabs");
    const tabs = document.querySelector(".ptabs");
    tabs?.setAttribute("class", "x3");
    expect(findProfileLayout()?.tabs).toBeNull(); // a single button: not a row of tabs
    tabs?.append(document.createElement("button"));
    expect(findProfileLayout()?.tabs?.className).toBe("x3");
  });
  it("aside with one child: no stats", () => {
    document.body.innerHTML = `<section><div><aside><h1>A</h1></aside><div></div></div></section>`;
    expect(findProfileLayout()?.stats).toBeNull();
  });
  it("not a profile: null", () => {
    document.body.innerHTML = "<h1>Marché</h1>";
    expect(findProfileLayout()).toBeNull();
    document.body.innerHTML = "<div><div><aside><h1>A</h1></aside></div></div>";
    expect(findProfileLayout()).toBeNull();
  });
});

describe("findShowcase", () => {
  it("reads every card, with its art", () => {
    renderSite(siteCase() + siteCase({ sleeve: "holo" }));
    const cases = findShowcase();
    expect(cases).toHaveLength(2);
    expect(cases[1]?.art?.lg).toContain("/lg/88572.webp");
  });
  it("is not tied to a card: any other image is read", () => {
    renderSite(siteCase({ src: "https://cdn.kyara.games/cards/sm/5.webp" }));
    expect(findShowcase()[0]?.art?.sm).toContain("/sm/5.webp");
  });
  it("unknown image host: the card stays, without art", () => {
    renderSite(siteCase({ src: "https://other.test/cards/sm/5.webp" }));
    expect(findShowcase()[0]?.art).toBeNull();
  });
  it("fallback: buttons with a card image under a 'vitrine' heading, classes renamed", () => {
    renderSite(siteCase());
    const list = document.querySelector(".cases");
    list?.setAttribute("class", "x");
    for (const el of document.querySelectorAll(".disp, .tcg")) el.removeAttribute("class");
    list?.append(document.createElement("button"));
    const cases = findShowcase();
    expect(cases).toHaveLength(1);
    expect(cases[0]?.card.querySelector("img")).not.toBeNull();
  });
  it("fallback: no 'vitrine' heading (other tabs), no case", () => {
    document.body.innerHTML = `<section><h2>Sa collection</h2><button><span><img src="${SRC}"></span></button></section>`;
    expect(findShowcase()).toEqual([]);
  });
  it("button without a card image: ignored", () => {
    renderSite(`<button class="disp"></button>`);
    expect(findShowcase()).toEqual([]);
  });
  it("image directly in the button (no card around it): ignored", () => {
    renderSite(`<button class="disp"><img src="${SRC}"></button>`);
    expect(findShowcase()).toEqual([]);
  });
});

describe("marks", () => {
  it("marks the regions", () => {
    renderSite(siteCase());
    const layout = findProfileLayout();
    if (layout) markProfileLayout(layout);
    for (const part of ["page", "banner", "root", "side", "head", "id", "stats", "tabs", "main"]) {
      expect(document.querySelector(`[data-kv-prof="${part}"]`)).not.toBeNull();
    }
  });
  it("marks position, art, parts and wrappers", () => {
    renderSite(siteCase() + siteCase());
    const cases = findShowcase();
    markShowcase(cases);
    const el = cases[1]?.el;
    expect(el?.style.getPropertyValue("--kv-i")).toBe("1");
    expect(el?.style.getPropertyValue("--kv-n")).toBe("2");
    expect(el?.style.getPropertyValue("--kv-art-lg")).toContain("/lg/88572.webp");
    expect(el?.getAttribute("data-kv-show-art")).toBe(SRC);
    expect(el?.querySelector(".glass")?.getAttribute("data-kv-show-wrap")).toBe("outer");
    expect(el?.querySelector(".lift")?.getAttribute("data-kv-show-wrap")).toBe("inner");
    expect(el?.querySelector(".shine")?.hasAttribute("data-kv-show-extra")).toBe(true);
    expect(el?.querySelector(".tcg-name")?.getAttribute("data-kv-show-part")).toBe("name");
    expect(el?.querySelector(".art")?.getAttribute("data-kv-show-part")).toBe("art");
    expect(document.querySelector(".cases")?.hasAttribute("data-kv-show-list")).toBe(true);
  });
  it("hero: the first card without a favourite, otherwise the favourite", () => {
    renderSite(siteCase() + siteCase());
    markShowcase(findShowcase());
    expect(document.querySelectorAll(".disp")[0]?.hasAttribute("data-kv-show-hero")).toBe(true);
    renderSite(siteCase() + siteCase({ fav: true }));
    markShowcase(findShowcase());
    expect(document.querySelectorAll(".disp")[0]?.hasAttribute("data-kv-show-hero")).toBe(false);
    expect(document.querySelectorAll(".disp")[1]?.hasAttribute("data-kv-show-hero")).toBe(true);
  });
  it("sleeve: its kind on the case, its decoration marked", () => {
    renderSite(siteCase({ sleeve: "holo" }));
    markShowcase(findShowcase());
    expect(document.querySelector(".disp")?.getAttribute("data-kv-show-sleeve")).toBe("holo");
    expect(document.querySelector(".back")?.hasAttribute("data-kv-show-extra")).toBe(true);
    expect(document.querySelector(".bubble")?.getAttribute("data-kv-show-wrap")).toBe("inner");
  });
  it("rarity color: from the class, otherwise the gem, nothing if unknown", () => {
    renderSite(siteCase());
    markShowcase(findShowcase());
    const el = () => document.querySelector<HTMLElement>(".disp");
    expect(el()?.style.getPropertyValue("--kv-rar")).toBe("var(--M)");
    renderSite(siteCase());
    document.querySelector(".tcg")?.setAttribute("class", "tcg");
    const gem = document.querySelector(".gem");
    if (gem) gem.textContent = "L";
    markShowcase(findShowcase());
    expect(el()?.style.getPropertyValue("--kv-rar")).toBe("var(--L)");
    if (gem) gem.textContent = "?";
    el()?.style.removeProperty("--kv-rar");
    markShowcase(findShowcase());
    expect(el()?.style.getPropertyValue("--kv-rar")).toBe("");
  });
  it("no art: no art variable", () => {
    renderSite(siteCase({ src: "https://other.test/cards/sm/5.webp" }));
    markShowcase(findShowcase());
    expect(document.querySelector(".disp")?.hasAttribute("data-kv-show-art")).toBe(false);
  });
  it("no case: nothing happens", () => {
    expect(() => markShowcase([])).not.toThrow();
  });
});
