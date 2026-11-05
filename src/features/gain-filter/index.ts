// Filtre "gain minimum" : selon le mode choisi (Off / Neutre et + / Positif) et le seuil de la jauge
// (gauge.ts, dans le panneau de filtres), masque les offres dont le meilleur gain (parmi tes
// cartes demandées) ne convient pas.
// Tri : si activé, offres de la plus rentable à la moins rentable.
// Effet DOM : attribut data-kv-hide-gain sur le <li> (le CSS le cache) et style `order` sur le <li> (tri).
// Tant que le tri ou le filtre est actif, les offres pas encore traitées sont cachées (pas de clignotement).
// Le dernier instantané est gardé pour réappliquer le filtre dès que le réglage bouge.

import { t } from "../../core/i18n";
import type { GainFilter } from "../../core/storage";
import type { OffersSnapshot } from "../../kyara/offers";
import { analyzeOffer } from "../../kyara/prices";
import type { Feature } from "../types";
import { passesGainFilter } from "./filter";
import { createGauge } from "./gauge";
import { rankByGain } from "./sort";
import "./style.css";

export const gainFilter: Feature = {
  name: "gain-filter",
  setup(ctx) {
    let snapshot: OffersSnapshot | null = null;
    let filter: GainFilter = { mode: "off", pct: 0, sort: true };
    const render = () => {
      if (!snapshot) return;
      const { offers, store, owned } = snapshot;
      const ratios = offers.map((o) => (o.give ? analyzeOffer(o, store, owned).bestRatio : null));
      const rank = rankByGain(ratios);
      offers.forEach((offer, i) => {
        if (!offer.give) return;
        offer.li.toggleAttribute("data-kv-hide-gain", !passesGainFilter(ratios[i] ?? null, filter));
        // la liste du site est en flex colonne : `order` réordonne sans déplacer les nœuds de Svelte
        offer.li.style.order = filter.sort ? String(rank[i]) : "";
      });
    };
    const root = document.documentElement;
    // Offres arrivées mais pas encore traitées (voir runtime.ts) : cachées par le CSS tant que le tri ou
    // le filtre est actif, sinon elles s'afficheraient à la mauvaise place / non filtrées, puis sauteraient.
    const syncRoot = () => {
      root.toggleAttribute("data-kv-hold-gain", filter.mode !== "off" || filter.sort);
      root.toggleAttribute("data-kv-filter-gain", filter.mode !== "off"); // lu par load-more
    };
    ctx.page.onInvalidated(() => {
      root.removeAttribute("data-kv-hold-gain");
      root.removeAttribute("data-kv-filter-gain");
    });
    syncRoot(); // réglage par défaut (tri actif) dès le chargement, avant la lecture du stockage
    const gauge = createGauge(ctx.page, (next) => {
      filter = next;
      syncRoot();
      render();
    });
    ctx.filters.addCategory(t("panel.cat.profit"), gauge.profit);
    ctx.filters.addCategory(t("panel.cat.sort"), gauge.sort);
    ctx.onOffers((next) => {
      snapshot = next;
      render();
    });
  },
};
