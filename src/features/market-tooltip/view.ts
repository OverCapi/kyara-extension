// Tooltip display: text (escaped HTML) and position. No network logic.
import { escapeHtml } from "../../core/html";
import { t, tn } from "../../core/i18n";
import type { MarketMin } from "./market-min";

/** Tooltip state: loading, result, or failure. */
export type TipState = { kind: "loading" } | { kind: "error" } | { kind: "result"; data: MarketMin };

const row = (value: string) => `<span class="kv-row"><span>${t("tooltip.market_min")}</span>${value}</span>`;

/** Tooltip HTML for a card. The name comes from the site: it is escaped. */
export function tipHtml(name: string, state: TipState): string {
  const title = `<b>${escapeHtml(name)}</b>`;
  if (state.kind === "loading") return title + row('<span class="kv-v">…</span>');
  if (state.kind === "error")
    return title + row(`<span class="kv-v kv-mut">${t("tooltip.unavailable")}</span>`);
  const { min, count } = state.data;
  if (min === null) return title + row(`<span class="kv-v kv-mut">${t("tooltip.no_listing")}</span>`);
  const sub = `<span class="kv-sub">${tn("tooltip.listing", count)}</span>`;
  return title + row(`<span class="kv-v">${min}<i>◆</i></span>`) + sub;
}

const MARGIN = 8;

/** Tooltip position: above the card (below if there is no room), always on screen. */
export function tipPosition(
  anchor: { left: number; top: number; bottom: number; width: number },
  size: { width: number; height: number },
  viewportWidth: number,
): { left: number; top: number } {
  const centered = anchor.left + anchor.width / 2 - size.width / 2;
  const left = Math.min(Math.max(MARGIN, centered), viewportWidth - size.width - MARGIN);
  const above = anchor.top - size.height - MARGIN;
  return { left, top: above >= MARGIN ? above : anchor.bottom + MARGIN };
}

/** Fills the tooltip and places it near `anchor`. */
export function showTip(tip: HTMLElement, anchor: Element, html: string): void {
  tip.innerHTML = html;
  tip.hidden = false;
  const pos = tipPosition(
    anchor.getBoundingClientRect(),
    { width: tip.offsetWidth, height: tip.offsetHeight },
    innerWidth,
  );
  tip.style.left = `${pos.left}px`;
  tip.style.top = `${pos.top}px`;
}
