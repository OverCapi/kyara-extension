// Box shown when hovering an offer's card: current minimum price on the market.
// One request per hovered card (after 250 ms on the card). The box is a single element appended to
// <html>, outside the tree managed by the site. It hides on scroll and when leaving the card.
import { safeAsync } from "../../core/errors";
import { listen, mountFloating } from "../../core/page";
import { cardId, OFFER_CARD_SELECTOR } from "../../kyara/dom";
import type { Feature } from "../types";
import { createMarketMin } from "./market-min";
import { showTip, type TipState, tipNodes } from "./view";
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
      showTip(tip, a, tipNodes(a.getAttribute("title") ?? "", state));
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
