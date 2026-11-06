// Tooltip display: content (built as DOM nodes, never innerHTML) and position. No network logic.
import { t, tn } from "../../core/i18n";
import type { MarketMin } from "./market-min";

/** Tooltip state: loading, result, or failure. */
export type TipState = { kind: "loading" } | { kind: "error" } | { kind: "result"; data: MarketMin };

/** Element with a class and children; strings become text nodes, so site text is never parsed as HTML. */
function el(tag: string, className: string, ...children: Array<Node | string>): HTMLElement {
  const created = document.createElement(tag);
  if (className) created.className = className;
  created.append(...children);
  return created;
}

const row = (value: HTMLElement) => el("span", "kv-row", el("span", "", t("tooltip.market_min")), value);

function tipValue(state: TipState): HTMLElement {
  if (state.kind === "loading") return el("span", "kv-v", "…");
  if (state.kind === "error") return el("span", "kv-v kv-mut", t("tooltip.unavailable"));
  const { min } = state.data;
  if (min === null) return el("span", "kv-v kv-mut", t("tooltip.no_listing"));
  return el("span", "kv-v", String(min), el("i", "", "◆"));
}

/** Tooltip content for a card: name, market min row, and the listing count when there are listings. */
export function tipNodes(name: string, state: TipState): HTMLElement[] {
  const nodes = [el("b", "", name), row(tipValue(state))];
  if (state.kind === "result" && state.data.min !== null) {
    nodes.push(el("span", "kv-sub", tn("tooltip.listing", state.data.count)));
  }
  return nodes;
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
export function showTip(tip: HTMLElement, anchor: Element, nodes: Node[]): void {
  tip.replaceChildren(...nodes);
  tip.hidden = false;
  const pos = tipPosition(
    anchor.getBoundingClientRect(),
    { width: tip.offsetWidth, height: tip.offsetHeight },
    innerWidth,
  );
  tip.style.left = `${pos.left}px`;
  tip.style.top = `${pos.top}px`;
}
