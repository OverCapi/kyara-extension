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
  it("2 catégories : Cartes (pastilles ordinaires) et Mes offres (celle qui a un compteur)", () => {
    const { filters, host, mirror } = setup();
    mirror.sync(filters);
    expect(titles(host)).toEqual(["Cartes", "Mes offres"]);
    expect(labels(host)).toEqual(["Que je n’ai pas", "Que je cherche", "Mes offres 0"]);
  });
  it("catégorie vide : pas de titre", () => {
    const { filters, host, mirror } = setup('<button type="button">Que je cherche</button>');
    mirror.sync(filters);
    expect(titles(host)).toEqual(["Cartes"]);
  });
  it("aucune pastille : rien", () => {
    const { filters, host, mirror } = setup("");
    mirror.sync(filters);
    expect(host.children).toHaveLength(0);
  });
  it("la copie reprend l'état de l'original", () => {
    const { filters, host, mirror } = setup();
    mirror.sync(filters);
    expect(copies(host).map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "true", "false"]);
  });
  it("un clic sur la copie clique l'original, puis la copie suit son nouvel état", async () => {
    const { filters, host, mirror } = setup();
    const source = filters.querySelector<HTMLButtonElement>(".pills > button");
    source?.addEventListener("click", () => source.setAttribute("aria-pressed", "true"));
    mirror.sync(filters);
    copies(host)[0]?.click();
    await vi.waitFor(() => expect(copies(host)[0]?.getAttribute("aria-pressed")).toBe("true"));
  });
  it("mêmes pastilles : la copie n'est pas reconstruite, mais son état est mis à jour", () => {
    const { filters, host, mirror } = setup();
    mirror.sync(filters);
    const before = copies(host);
    filters.querySelector(".pills > button")?.setAttribute("aria-pressed", "true");
    mirror.sync(filters);
    expect(copies(host)[0]).toBe(before[0]);
    expect(before[0]?.getAttribute("aria-pressed")).toBe("true");
  });
  it("texte changé (ex. compteur) : reconstruite", () => {
    const { filters, host, mirror } = setup();
    mirror.sync(filters);
    const counter = filters.querySelector(".n");
    if (counter) counter.textContent = "3";
    mirror.sync(filters);
    expect(labels(host)).toContain("Mes offres 3");
  });
  it("pastilles recréées par le site avec le même texte : reconstruite, le clic vise les nouvelles", () => {
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
