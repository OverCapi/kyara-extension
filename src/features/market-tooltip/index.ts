// Box au survol d'une carte d'offre : prix minimum actuel sur le marché.
// Une requête par carte survolée (après 250 ms sur la carte). La box est un seul élément ajouté à
// <html>, hors de l'arbre géré par le site. Elle se cache au scroll et quand on quitte la carte.
import { safeAsync } from "../../core/errors";
import { listen, mountFloating } from "../../core/page";
import { cardId, OFFER_CARD_SELECTOR } from "../../kyara/dom";
import type { Feature } from "../types";
import { createMarketMin } from "./market-min";
import { showTip, type TipState, tipHtml } from "./view";
import "./style.css";

export const TIP_DELAY = 250;

export const marketTooltip: Feature = {
  name: "market-tooltip",
  setup({ page }) {
    const tip = document.createElement("div");
    tip.className = "kv-tip";
    tip.hidden = true;
    mountFloating(page, tip);
    const marketMin = createMarketMin();
    let current: Element | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const hide = () => {
      current = null;
      clearTimeout(timer);
      tip.hidden = true;
    };
    const show = (a: Element, state: TipState) =>
      showTip(tip, a, tipHtml(a.getAttribute("title") ?? "", state));
    const load = safeAsync("market-tooltip:load", async (a: Element) => {
      const id = cardId(a);
      if (id === null) return;
      show(a, { kind: "loading" });
      const data = await marketMin(id);
      if (current === a) show(a, data ? { kind: "result", data } : { kind: "error" });
    });

    listen<MouseEvent>(page, document, "mouseover", (e) => {
      const a = e.target instanceof Element ? e.target.closest(OFFER_CARD_SELECTOR) : null;
      if (a === current) return;
      hide();
      current = a;
      if (a) timer = setTimeout(() => void load(a), TIP_DELAY);
    });
    listen(page, window, "scroll", hide, { passive: true });
    page.onInvalidated(() => clearTimeout(timer));
  },
};
