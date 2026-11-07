// Small spinner in the bottom-right corner while fair-play prices are being fetched, hidden otherwise.
// The runtime re-renders when a fetch ends, so onOffers is enough to hide it again.
// DOM effect: one floating element on <html> (removed on invalidation). Text: locales/*.json.
import { t } from "../../core/i18n";
import { mountFloating } from "../../core/page";
import type { Feature } from "../types";
import "./style.css";

export const pricesPending: Feature = {
  name: "prices-pending",
  setup(ctx) {
    const el = document.createElement("div");
    el.className = "kv-pending";
    el.title = t("pending.title");
    el.setAttribute("role", "status");
    el.setAttribute("aria-label", t("pending.title"));
    el.hidden = true;
    mountFloating(ctx.page, el);
    ctx.onOffers(() => {
      el.hidden = !ctx.pricesPending();
    });
  },
};
