import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { Offer } from "../../kyara/dom";
import type { OffersSnapshot } from "../../kyara/offers";
import { startFeature } from "../../test/helpers";
import { LOAD_TIMEOUT, loadMore, MAX_AUTO_LOADS, MIN_VISIBLE } from "./index";

let more: HTMLButtonElement | null;
let clicked: Mock<() => void>;

beforeEach(() => {
  document.body.innerHTML =
    '<section class="board"><ul class="offers"></ul><button class="more">Voir plus</button></section>';
  more = document.querySelector("button.more");
  clicked = vi.fn<() => void>();
  more?.addEventListener("click", clicked);
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
});
afterEach(() => document.documentElement.removeAttribute("data-kv-filter-gain"));

/** Instantané de `total` offres dont `hidden` sont cachées par un filtre. */
function snap(total: number, hidden: number): OffersSnapshot {
  const offers: Offer[] = Array.from({ length: total }, (_, i) => {
    const li = document.createElement("li");
    if (i < hidden) li.setAttribute("data-kv-hide-gain", "");
    return { li, give: null, wants: [] };
  });
  return { offers, store: { fair: {}, market: {} }, owned: null };
}
const filtering = () => document.documentElement.setAttribute("data-kv-filter-gain", "");

describe("load-more", () => {
  it("aucun filtre actif : ne clique pas", () => {
    startFeature(loadMore).emit(snap(20, 20));
    expect(clicked).not.toHaveBeenCalled();
  });

  it("filtre actif et trop peu d'offres visibles : clique « Voir plus »", () => {
    filtering();
    startFeature(loadMore).emit(snap(20, 20 - (MIN_VISIBLE - 1)));
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it("assez d'offres visibles : ne clique pas", () => {
    filtering();
    startFeature(loadMore).emit(snap(20, 20 - MIN_VISIBLE));
    expect(clicked).not.toHaveBeenCalled();
  });

  it("attend la fin du chargement : pas de second clic tant que la liste n'a pas changé", () => {
    filtering();
    const { emit } = startFeature(loadMore);
    emit(snap(20, 20));
    emit(snap(20, 20));
    expect(clicked).toHaveBeenCalledTimes(1);
    emit(snap(40, 40)); // les offres sont arrivées, toujours trop peu visibles
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  it("chargement qui n'aboutit pas : réessaie après le délai", () => {
    filtering();
    const { emit } = startFeature(loadMore);
    emit(snap(20, 20));
    vi.setSystemTime(Date.now() + LOAD_TIMEOUT + 1);
    emit(snap(20, 20));
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  it("assez d'offres atteintes : remet le compteur à zéro", () => {
    filtering();
    const { emit } = startFeature(loadMore);
    emit(snap(20, 20));
    emit(snap(40, 0)); // 40 visibles
    emit(snap(40, 40)); // le filtre change : on peut recharger tout de suite
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  it("plafond de clics automatiques d'affilée", () => {
    filtering();
    const { emit } = startFeature(loadMore);
    for (let i = 1; i <= MAX_AUTO_LOADS + 5; i++) emit(snap(20 * i, 20 * i));
    expect(clicked).toHaveBeenCalledTimes(MAX_AUTO_LOADS);
  });

  it("plus de bouton (tout est chargé) : ne fait rien", () => {
    filtering();
    more?.remove();
    expect(() => startFeature(loadMore).emit(snap(20, 20))).not.toThrow();
    expect(clicked).not.toHaveBeenCalled();
  });

  it("onglet caché : ne clique pas", () => {
    filtering();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    startFeature(loadMore).emit(snap(20, 20));
    expect(clicked).not.toHaveBeenCalled();
  });

  describe("indicateur de chargement", () => {
    const loading = () => document.querySelector<HTMLElement>(".kv-loading");

    it("caché au départ, avec son texte ; affiché dès qu'un chargement est lancé", () => {
      filtering();
      const { emit } = startFeature(loadMore);
      expect(loading()?.hidden).toBe(true);
      expect(loading()?.textContent).toBe("Chargement d'autres offres…");
      expect(loading()?.getAttribute("role")).toBe("status");
      emit(snap(20, 20));
      expect(loading()?.hidden).toBe(false);
    });

    it("reste affiché entre deux chargements, disparaît quand il y a assez d'offres", () => {
      filtering();
      const { emit } = startFeature(loadMore);
      emit(snap(20, 20));
      emit(snap(20, 20)); // toujours en attente
      expect(loading()?.hidden).toBe(false);
      emit(snap(40, 40)); // nouvelles offres, toujours trop peu : nouveau chargement
      expect(loading()?.hidden).toBe(false);
      emit(snap(60, 0));
      expect(loading()?.hidden).toBe(true);
    });

    it("disparaît si le filtre est coupé", () => {
      filtering();
      const { emit } = startFeature(loadMore);
      emit(snap(20, 20));
      document.documentElement.removeAttribute("data-kv-filter-gain");
      emit(snap(20, 20));
      expect(loading()?.hidden).toBe(true);
    });

    it("disparaît quand il n'y a plus rien à charger", () => {
      filtering();
      const { emit } = startFeature(loadMore);
      emit(snap(20, 20));
      more?.remove();
      emit(snap(40, 40));
      expect(loading()?.hidden).toBe(true);
    });

    it("disparaît si le chargement n'aboutit pas dans le délai (aucune mise à jour de la page)", () => {
      filtering();
      startFeature(loadMore).emit(snap(20, 20));
      vi.advanceTimersByTime(LOAD_TIMEOUT - 1);
      expect(loading()?.hidden).toBe(false);
      vi.advanceTimersByTime(1);
      expect(loading()?.hidden).toBe(true);
    });

    it("retiré quand l'extension est rechargée, sans minuteur oublié", () => {
      filtering();
      const { emit, page } = startFeature(loadMore);
      emit(snap(20, 20));
      page.invalidate();
      expect(loading()).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
