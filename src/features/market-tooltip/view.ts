// Affichage de l'infobulle : texte (HTML échappé) et position. Aucune logique réseau.
import { escapeHtml } from "../../core/html";
import type { MarketMin } from "./market-min";

/** État de l'infobulle : chargement, résultat, ou échec. */
export type TipState = { kind: "loading" } | { kind: "error" } | { kind: "result"; data: MarketMin };

const row = (value: string) => `<span class="kv-row"><span>Min marché</span>${value}</span>`;

/** HTML de l'infobulle pour une carte. Le nom vient du site : il est échappé. */
export function tipHtml(name: string, state: TipState): string {
  const title = `<b>${escapeHtml(name)}</b>`;
  if (state.kind === "loading") return title + row('<span class="kv-v">…</span>');
  if (state.kind === "error") return title + row('<span class="kv-v kv-mut">indisponible</span>');
  const { min, count } = state.data;
  if (min === null) return title + row('<span class="kv-v kv-mut">aucune annonce</span>');
  const sub = `<span class="kv-sub">${count} annonce${count > 1 ? "s" : ""}</span>`;
  return title + row(`<span class="kv-v">${min}<i>◆</i></span>`) + sub;
}

const MARGIN = 8;

/** Position de l'infobulle : au-dessus de la carte (en dessous si pas la place), toujours dans l'écran. */
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

/** Remplit l'infobulle et la place près de `anchor`. */
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
