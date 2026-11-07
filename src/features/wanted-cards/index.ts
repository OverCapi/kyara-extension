// Wanted cards: the user lists card names in the filter panel; offers whose OFFERED card is on the
// list get highlighted. Optional toggle hides the other offers. The list is stored (wanted key)
// and followed across tabs. Name matching: see match.ts.
// DOM effect: data-kv-wanted on the <li>, data-kv-wanted-card on the card link, data-kv-hide-wanted
// on hidden offers, data-kv-filter-wanted on <html> while the toggle is on.
import { safeAsync } from "../../core/errors";
import { t } from "../../core/i18n";
import { onWantedChange, readWanted, type WantedCards, writeWanted } from "../../core/storage";
import { createStorageSync } from "../../core/storage-sync";
import { cardName } from "../../kyara/dom";
import type { OffersSnapshot } from "../../kyara/offers";
import type { Feature } from "../types";
import { isWanted } from "./match";
import { createView } from "./view";
import "./style.css";

export const wantedCards: Feature = {
  name: "wanted-cards",
  setup(ctx) {
    let snapshot: OffersSnapshot | null = null;
    let wanted: WantedCards = { names: [], only: false };

    const render = () => {
      if (!snapshot) return;
      for (const { li, give } of snapshot.offers) {
        if (!give) continue;
        const hit = isWanted(cardName(give), wanted.names);
        li.toggleAttribute("data-kv-wanted", hit);
        give.el.toggleAttribute("data-kv-wanted-card", hit);
        li.toggleAttribute("data-kv-hide-wanted", wanted.only && !hit);
      }
    };
    const root = document.documentElement;
    // filter on: offers not processed yet (see runtime.ts) stay hidden, no flicker
    ctx.page.onInvalidated(() => root.removeAttribute("data-kv-filter-wanted"));
    const apply = (next: WantedCards) => {
      wanted = next;
      root.toggleAttribute("data-kv-filter-wanted", next.only);
      view.show(next);
      render();
    };
    const sync = createStorageSync(writeWanted, apply);
    const view = createView((next) => {
      apply(next); // immediate visual, the write follows
      void sync.save(next);
    });

    ctx.filters.addCategory(t("panel.cat.wanted"), view.root);
    ctx.page.onInvalidated(onWantedChange(sync.onStored));
    void safeAsync("wanted-cards:init", async () => apply(await readWanted()))();
    ctx.onOffers((next) => {
      snapshot = next;
      render();
    });
  },
};
