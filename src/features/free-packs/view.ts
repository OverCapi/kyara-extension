// DOM of the free-packs feature: the "×N" option placed in the site's picker, the site's selected option shown
// as unselected (inline colors), and the relabelled cost tag of the "Ouvrir" button (data-kv-tag + CSS).
// No listener or state here (see index.ts). Texts: locales/*.json.
import { t } from "../../core/i18n";
import type { CountPicker } from "../../kyara/page-dom";

const MUTED_ATTR = "data-kv-muted";

/** The extension's option (not in the page yet: see `placeOption`). */
export function makeFreeOption(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.toggleAttribute("data-kv-free", true);
  button.title = t("packs.free_title");
  return button;
}

/**
 * Puts `option` ("×n") in the picker, before the first larger site option, styled with the classes of a
 * selected or unselected site option.
 */
export function placeOption(
  option: HTMLButtonElement,
  picker: CountPicker,
  opts: { n: number; on: boolean },
) {
  const pressed = (el: Element) => el.getAttribute("aria-pressed") === "true";
  const like = picker.options.find((o) => pressed(o.el) === opts.on) ?? picker.options[0];
  option.className = like?.el.className ?? "";
  option.textContent = t("packs.count", { n: opts.n });
  option.setAttribute("aria-pressed", String(opts.on));
  const before = picker.options.find((o) => o.n > opts.n)?.el ?? null;
  if (option.parentElement !== picker.group || option.nextElementSibling !== before) {
    picker.group.insertBefore(option, before);
  }
}

/** Shows the site's selected option `el` with the colors of the unselected `like`: our option stands for it. */
export function mute(el: HTMLElement, like: HTMLElement): void {
  if (el.hasAttribute(MUTED_ATTR)) return;
  const style = getComputedStyle(like);
  el.style.setProperty("background-color", style.backgroundColor);
  el.style.setProperty("color", style.color);
  el.toggleAttribute(MUTED_ATTR, true);
}

/** Gives the site's options back their own colors. */
export function unmuteAll(): void {
  for (const el of document.querySelectorAll<HTMLElement>(`[${MUTED_ATTR}]`)) {
    el.style.removeProperty("background-color");
    el.style.removeProperty("color");
    el.removeAttribute(MUTED_ATTR);
  }
}

const COUNT = /×\s*\d+/;
/** Text nodes of the open button we rewrote: the site's text and ours (to spot a rewrite by the site). */
const rewritten = new WeakMap<Text, { site: string; ours: string }>();

/**
 * Shows "×n" instead of the site's count in the open button's text ("Ouvrir ×5" -> "Ouvrir ×2"), or the
 * site's text again if `n` is `null`. Svelte only rewrites the text when its own value changes, so picking
 * the same site option again would otherwise keep our count: it is restored explicitly.
 */
export function labelOpenCount(button: HTMLElement | null, n: number | null): void {
  for (const node of button?.childNodes ?? []) {
    if (!(node instanceof Text)) continue;
    const seen = rewritten.get(node);
    const site = seen && node.data === seen.ours ? seen.site : node.data; // else the site wrote its own text
    rewritten.delete(node);
    if (n === null || !COUNT.test(site)) {
      node.data = site;
      continue;
    }
    const ours = site.replace(COUNT, t("packs.count", { n }));
    rewritten.set(node, { site, ours });
    node.data = ours;
  }
}

/** Shows `text` instead of the cost tag's own text (CSS), or the original text again if `text` is `null`. */
export function labelTag(tag: HTMLElement | null, text: string | null): void {
  if (!tag) return;
  if (text === null) {
    delete tag.dataset.kvTag;
    tag.style.removeProperty("--kv-fs");
    return;
  }
  // measured before hiding the original text (font-size 0)
  if (!tag.dataset.kvTag) tag.style.setProperty("--kv-fs", getComputedStyle(tag).fontSize);
  tag.dataset.kvTag = text;
}
