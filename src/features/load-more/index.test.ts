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

  describe("texte « Chargement… » du bouton", () => {
    const label = () => more?.textContent;

    it("clic de l'utilisateur : texte changé, puis remis quand les offres arrivent", () => {
      const { emit } = startFeature(loadMore);
      emit(snap(20, 0));
      more?.click();
      expect(label()).toBe("Chargement…");
      emit(snap(20, 0)); // rendu sans nouvelle offre : toujours en chargement
      expect(label()).toBe("Chargement…");
      emit(snap(40, 0));
      expect(label()).toBe("Voir plus");
    });

    it("clic automatique de load-more : texte changé, remis puis reposé au clic suivant", () => {
      filtering();
      const { emit } = startFeature(loadMore);
      emit(snap(20, 20));
      expect(label()).toBe("Chargement…");
      emit(snap(40, 40)); // offres arrivées, trop peu visibles : nouveau clic
      expect(clicked).toHaveBeenCalledTimes(2);
      expect(label()).toBe("Chargement…");
      emit(snap(60, 0));
      expect(label()).toBe("Voir plus");
    });

    it("double clic : le texte d'origine est gardé", () => {
      startFeature(loadMore);
      more?.click();
      more?.click();
      vi.advanceTimersByTime(LOAD_TIMEOUT);
      expect(label()).toBe("Voir plus");
    });

    it("remis si le chargement n'aboutit pas dans le délai", () => {
      startFeature(loadMore);
      more?.click();
      vi.advanceTimersByTime(LOAD_TIMEOUT - 1);
      expect(label()).toBe("Chargement…");
      vi.advanceTimersByTime(1);
      expect(label()).toBe("Voir plus");
    });

    it("garde le nœud texte du site (aucun nœud remplacé)", () => {
      const node = more?.firstChild;
      startFeature(loadMore);
      more?.click();
      expect(more?.firstChild).toBe(node);
    });

    it("n'écrase pas un texte réécrit par le site entre-temps", () => {
      const { emit } = startFeature(loadMore);
      more?.click();
      if (more?.firstChild) more.firstChild.nodeValue = "Plus rien";
      emit(snap(40, 0));
      expect(label()).toBe("Plus rien");
    });

    it("ignore les autres clics et un bouton sans texte", () => {
      startFeature(loadMore);
      document.body.click();
      expect(label()).toBe("Voir plus");
      more?.replaceChildren(document.createElement("span"));
      expect(() => more?.click()).not.toThrow();
    });

    it("texte remis quand l'extension est rechargée, sans minuteur ni écouteur oublié", () => {
      const { page } = startFeature(loadMore);
      more?.click();
      page.invalidate();
      expect(label()).toBe("Voir plus");
      expect(vi.getTimerCount()).toBe(0);
      more?.click();
      expect(label()).toBe("Voir plus");
    });
  });
});
