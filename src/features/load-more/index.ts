// « Voir plus d'offres » automatique : quand un filtre est actif et que trop peu d'offres restent visibles,
// clique le bouton du site (un clic par mise à jour de la page) jusqu'à en avoir assez, ou jusqu'à ce qu'il
// n'y ait plus rien à charger. Le bouton affiche « Chargement… » pendant chaque chargement (label.ts).
// À enregistrer APRÈS les features de filtre : il compte ce qu'elles ont masqué.
// Effet DOM : clics sur le bouton du site + texte du bouton changé le temps du chargement. Aucune requête propre : le site charge.
// ponytail: minimum et plafond fixes ; les exposer dans le panneau si l'envie vient de les régler.
import { findLoadMore } from "../../kyara/dom";
import type { Feature } from "../types";
import { countVisible, isFiltering } from "./count";
import { watchLoadMoreLabel } from "./label";

/** Nombre d'offres visibles à atteindre. */
export const MIN_VISIBLE = 10;
/** Clics automatiques d'affilée au maximum (25 x ~20 offres) : évite de vider l'API si le filtre ne trouve rien. */
export const MAX_AUTO_LOADS = 25;
/** Le bouton du site reste actif pendant le chargement : on attend ce délai avant de recliquer sans résultat
 * (et avant de remettre son texte d'origine). */
export const LOAD_TIMEOUT = 10_000;

export const loadMore: Feature = {
  name: "load-more",
  setup(ctx) {
    const arrived = watchLoadMoreLabel(ctx.page, LOAD_TIMEOUT);
    let autoLoads = 0;
    let pending: { total: number; at: number } | null = null;
    // fin du chargement automatique : rien n'est attendu
    const stop = () => {
      pending = null;
    };

    ctx.onOffers(({ offers }) => {
      arrived(offers.length); // avant un éventuel nouveau clic, qui remet « Chargement… »
      if (!isFiltering() || countVisible(offers) >= MIN_VISIBLE) {
        autoLoads = 0;
        return stop();
      }
      const waiting = pending && offers.length === pending.total && Date.now() - pending.at < LOAD_TIMEOUT;
      if (waiting) return; // chargement en cours
      const more = findLoadMore();
      if (!more || autoLoads >= MAX_AUTO_LOADS || document.visibilityState !== "visible") return stop();
      autoLoads++;
      pending = { total: offers.length, at: Date.now() };
      more.click();
    });
  },
};
