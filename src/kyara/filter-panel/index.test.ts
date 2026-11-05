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

describe("createFilterPanel : placement", () => {
  it("rien dans la page avant attach", () => {
    createFilterPanel(fakeCtx());
    expect(menu()).toBeNull();
  });
  it("attach : bouton dans la barre, pastilles d'origine cachées par l'attribut, une seule fois", () => {
    const panel = createFilterPanel(fakeCtx());
    const filters = bar();
    panel.attach(filters);
    panel.attach(filters);
    expect(filters.lastElementChild).toBe(menu());
    expect(document.querySelectorAll(".kv-menu")).toHaveLength(1);
    expect(filters.hasAttribute("data-kv-panel")).toBe(true);
  });
  it("attach(null) retire le bouton ; une nouvelle barre le récupère", () => {
    const panel = createFilterPanel(fakeCtx());
    panel.attach(bar());
    panel.attach(null);
    expect(menu()).toBeNull();
    const fresh = bar();
    panel.attach(fresh);
    expect(fresh.lastElementChild).toBe(menu());
  });
  it("rechargement de l'extension : bouton retiré et pastilles du site rendues", () => {
    const page = fakeCtx();
    const panel = createFilterPanel(page);
    const filters = bar();
    panel.attach(filters);
    page.invalidate();
    expect(menu()).toBeNull();
    expect(filters.hasAttribute("data-kv-panel")).toBe(false);
  });
  it("rechargement avant tout attach : sans erreur", () => {
    const page = fakeCtx();
    createFilterPanel(page);
    expect(() => page.invalidate()).not.toThrow();
  });
});

describe("createFilterPanel : fenêtre", () => {
  const open = () => {
    const panel = createFilterPanel(fakeCtx());
    panel.attach(bar());
    return panel;
  };
  it("bouton à icône d'entonnoir, titré, fenêtre fermée au départ", () => {
    open();
    expect(button()?.querySelector("svg path")).not.toBeNull();
    expect(button()?.title).toBe("Filtres");
    expect(popover()?.hidden).toBe(true);
    expect(button()?.getAttribute("aria-expanded")).toBe("false");
  });
  it("un clic ouvre, un autre ferme", () => {
    open();
    button()?.click();
    expect(popover()?.hidden).toBe(false);
    expect(button()?.getAttribute("aria-expanded")).toBe("true");
    button()?.click();
    expect(popover()?.hidden).toBe(true);
  });
  it("un clic dehors ferme, un clic dedans non", () => {
    open();
    button()?.click();
    popover()?.click();
    expect(popover()?.hidden).toBe(false);
    document.body.click();
    expect(popover()?.hidden).toBe(true);
  });
  it("Échap ferme, une autre touche non", () => {
    open();
    button()?.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(popover()?.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(popover()?.hidden).toBe(true);
  });
  it("2 sections dans l'ordre : Kyara puis extension", () => {
    open();
    const titles = [...document.querySelectorAll(".kv-section > h3")].map((h) => h.textContent);
    expect(titles).toEqual(["Filtres Kyara", "Filtres de l'extension"]);
  });
  it("addCategory range la catégorie (titre + contenu) dans la section de l'extension", () => {
    const panel = open();
    const content = document.createElement("p");
    content.textContent = "réglage";
    panel.addCategory("Rareté", content);
    const sections = document.querySelectorAll(".kv-section");
    const cat = sections[1]?.querySelector(".kv-cat");
    expect(cat?.querySelector("h4")?.textContent).toBe("Rareté");
    expect(cat?.contains(content)).toBe(true);
    expect(sections[0]?.querySelector(".kv-cat")).not.toBeNull(); // la pastille du site est reflétée ici
  });
  it("catégorie ajoutée avant attach : conservée quand le panneau est placé", () => {
    const panel = createFilterPanel(fakeCtx());
    panel.addCategory("Tri", document.createElement("div"));
    panel.attach(bar());
    expect(document.querySelectorAll(".kv-section")[1]?.querySelector("h4")?.textContent).toBe("Tri");
  });
});
