// « Voir plus d'offres » automatique : quand un filtre est actif et que trop peu d'offres restent visibles,
// clique le bouton du site (un clic par mise à jour de la page) jusqu'à en avoir assez, ou jusqu'à ce qu'il
// n'y ait plus rien à charger. Un indicateur « chargement » (view.ts) est affiché pendant ce temps.
// À enregistrer APRÈS les features de filtre : il compte ce qu'elles ont masqué.
// Effet DOM : clics sur le bouton du site + indicateur sur <html>. Aucune requête propre : le site charge.
// ponytail: minimum et plafond fixes ; les exposer dans le panneau si l'envie vient de les régler.
import { safe } from "../../core/errors";
import { findLoadMore } from "../../kyara/dom";
import type { Feature } from "../types";
import { countVisible, isFiltering } from "./count";
import { createIndicator } from "./view";
import "./style.css";

/** Nombre d'offres visibles à atteindre. */
export const MIN_VISIBLE = 10;
/** Clics automatiques d'affilée au maximum (25 x ~20 offres) : évite de vider l'API si le filtre ne trouve rien. */
export const MAX_AUTO_LOADS = 25;
/** Le bouton du site reste actif pendant le chargement : on attend ce délai avant de recliquer sans résultat. */
export const LOAD_TIMEOUT = 10_000;

export const loadMore: Feature = {
  name: "load-more",
  setup(ctx) {
    const indicator = createIndicator(ctx.page);
    let autoLoads = 0;
    let pending: { total: number; at: number } | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // fin du chargement automatique : rien n'est attendu, l'indicateur disparaît
    const stop = () => {
      pending = null;
      clearTimeout(timer);
      indicator.hide();
    };
    ctx.page.onInvalidated(() => clearTimeout(timer));

    ctx.onOffers(({ offers }) => {
      if (!isFiltering() || countVisible(offers) >= MIN_VISIBLE) {
        autoLoads = 0;
        return stop();
      }
      const waiting = pending && offers.length === pending.total && Date.now() - pending.at < LOAD_TIMEOUT;
      if (waiting) return; // chargement en cours : l'indicateur reste affiché
      const more = findLoadMore();
      if (!more || autoLoads >= MAX_AUTO_LOADS || document.visibilityState !== "visible") return stop();
      autoLoads++;
      pending = { total: offers.length, at: Date.now() };
      indicator.show();
      clearTimeout(timer);
      timer = setTimeout(safe("load-more:timeout", stop), LOAD_TIMEOUT); // le chargement n'aboutit pas
      more.click();
    });
  },
};
