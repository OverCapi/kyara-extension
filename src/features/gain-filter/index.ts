// "Minimum gain" filter: depending on the chosen mode (Off / Neutral and up / Positive) and the gauge threshold
// (gauge.ts, in the filter panel), hides the offers whose best gain (among your
// wanted cards) does not qualify.
// Sort: when on, offers from most to least profitable.
// DOM effect: data-kv-hide-gain attribute on the <li> (CSS hides it) and `order` style on the <li> (sort).
// While sort or filter is on, offers not processed yet are hidden (no flicker).
// The last snapshot is kept to reapply the filter as soon as the setting changes.

import { t } from "../../core/i18n";
import { rankByGain } from "../../core/rank";
import type { GainFilter } from "../../core/storage";
import type { OffersSnapshot } from "../../kyara/offers";
import { analyzeOffer } from "../../kyara/prices";
import type { Feature } from "../types";
import { passesGainFilter } from "./filter";
import { createGauge } from "./gauge";
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
        // the site's list is a flex column: `order` reorders without moving Svelte's nodes
        offer.li.style.order = filter.sort ? String(rank[i]) : "";
      });
    };
    const root = document.documentElement;
    // Offers that arrived but are not processed yet (see runtime.ts): hidden by CSS while sort or
    // filter is on, otherwise they would show in the wrong place / unfiltered, then jump.
    const syncRoot = () => {
      root.toggleAttribute("data-kv-hold-gain", filter.mode !== "off" || filter.sort);
      root.toggleAttribute("data-kv-filter-gain", filter.mode !== "off"); // read by load-more
    };
    ctx.page.onInvalidated(() => {
      root.removeAttribute("data-kv-hold-gain");
      root.removeAttribute("data-kv-filter-gain");
    });
    syncRoot(); // default setting (sorting on) right at load, before reading storage
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
