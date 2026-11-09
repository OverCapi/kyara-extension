// Public profile page of kyara.games (/profil/<id>): finds the page layout and the showcase cards, then
// marks them with data-kv-* attributes that the profile-showcase feature's CSS targets.
// Nothing is tied to one profile: the cards and their images are read from the page on every render.
// Same rule as dom.ts: the site's current markup first, then a fallback on structure or text.
// DOM effect: attributes and CSS variables on the site's nodes. No node added, no network.

/** Art of a showcase card, in the two sizes served by the site's CDN. */
export interface CardArt {
  sm: string;
  lg: string;
}
/** One showcase card: its button, the card inside, its image. */
export interface ShowcaseCase {
  el: HTMLElement;
  card: HTMLElement;
  image: HTMLImageElement;
  art: CardArt | null;
}
/** Regions of the profile page. */
export interface ProfileLayout {
  /** Element holding the whole page: the ambient backdrop is drawn on it. */
  page: HTMLElement;
  /** Banner strip above the layout, `null` if the site has none. */
  banner: Element | null;
  root: HTMLElement;
  side: HTMLElement;
  head: Element | null;
  stats: Element | null;
  /** Section tabs of the main column, `null` if not found. */
  tabs: Element | null;
  main: HTMLElement;
}

const CARD_IMAGE = 'img[src*="/cards/"]';
// strict: the URL ends up inside a CSS url("…"), nothing else may get through
const CARD_SRC = /^(https:\/\/cdn\.kyara\.games\/cards\/)[a-z]+(\/\d+\.webp)$/;
const SLEEVE_CLASS = /\bbl-([a-z]+)\b/;
const RARITY_CLASS = /\br-([A-Z])\b/;
const CARD_PARTS: ReadonlyArray<readonly [selector: string, part: string]> = [
  [".tcg-top", "top"],
  [".tcg-name", "name"],
  [".gem", "gem"],
  [".art-k", "kana"],
  [".art-n", "no"],
  [".tcg-type", "type"],
  [".tcg-stats", "stats"],
  [".holo", "holo"],
  [".glare", "glare"],
];

/** `true` on a profile page (`/profil` or `/profil/<id>`). */
export const isProfilePath = (path: string): boolean => /^\/profil(\/|$)/.test(path);

/** CDN URLs of a card image in both sizes. `null` if `src` is not a known card URL. */
export function cardArt(src: string): CardArt | null {
  const match = CARD_SRC.exec(src);
  if (!match) return null;
  return { sm: `${match[1]}sm${match[2]}`, lg: `${match[1]}lg${match[2]}` };
}

/**
 * Profile page layout. Site markup: `aside.side`. Fallback: the <aside> holding the page's <h1>.
 * The main column is the element after it. `null` if the page does not look like a profile.
 */
export function findProfileLayout(root: ParentNode = document): ProfileLayout | null {
  const side = root.querySelector<HTMLElement>("aside.side") ?? root.querySelector("h1")?.closest("aside");
  const wrap = side?.parentElement;
  const page = wrap?.parentElement;
  const main = side?.nextElementSibling;
  if (!side || !wrap || !page || !(main instanceof HTMLElement)) return null;
  const head = side.firstElementChild;
  // not the last child: the owner's own profile has a row of links after the stats
  const stats = side.querySelector(":scope > .kpis") ?? side.children[1] ?? null;
  const tabs = findProfileTabs(main);
  return { page, banner: wrap.previousElementSibling, root: wrap, side, head, stats, tabs, main };
}

/** Section tabs. Site markup: `.ptabs`. Fallback: first element of the column, if it is a row of buttons. */
function findProfileTabs(main: Element): Element | null {
  const marked = main.querySelector(".ptabs");
  if (marked) return marked;
  const first = main.firstElementChild;
  return first && first.querySelectorAll(":scope > button").length >= 2 ? first : null;
}

/** Fallback: buttons with a card image, next to a heading saying "vitrine" (empty on the other tabs). */
function fallbackCases(root: ParentNode): HTMLElement[] {
  const heading = [...root.querySelectorAll("h2")].find((h) => /vitrine|showcase/i.test(h.textContent ?? ""));
  const section = heading?.closest("section");
  const first = section?.querySelector(CARD_IMAGE)?.closest("button");
  if (!first?.parentElement) return [];
  return [...first.parentElement.children].filter(
    (el): el is HTMLElement => el instanceof HTMLButtonElement && el.querySelector(CARD_IMAGE) !== null,
  );
}

function readCase(el: HTMLElement): ShowcaseCase[] {
  const image = el.querySelector<HTMLImageElement>(CARD_IMAGE);
  const art = image?.parentElement;
  const card = el.querySelector<HTMLElement>(".tcg") ?? art?.parentElement;
  if (!image || !card || card === el || !el.contains(card)) return [];
  return [{ el, card, image, art: cardArt(image.src) }];
}

/**
 * Cards of the showcase, in page order. Site markup: `.cases > .disp`. Fallback: see `fallbackCases`.
 * Empty on the other tabs, or when the profile shows no card.
 */
export function findShowcase(root: ParentNode = document): ShowcaseCase[] {
  const marked = [...root.querySelectorAll<HTMLElement>(".cases > .disp")];
  return (marked.length > 0 ? marked : fallbackCases(root)).flatMap(readCase);
}

/** Marks the page regions (`data-kv-prof`). */
export function markProfileLayout(layout: ProfileLayout): void {
  layout.page.setAttribute("data-kv-prof", "page");
  layout.banner?.setAttribute("data-kv-prof", "banner");
  layout.root.setAttribute("data-kv-prof", "root");
  layout.side.setAttribute("data-kv-prof", "side");
  layout.head?.setAttribute("data-kv-prof", "head");
  layout.head?.lastElementChild?.setAttribute("data-kv-prof", "id");
  layout.stats?.setAttribute("data-kv-prof", "stats");
  layout.tabs?.setAttribute("data-kv-prof", "tabs");
  layout.main.setAttribute("data-kv-prof", "main");
}

/** Marks what lies between the button and the card: wrappers (frame, sleeve) and decoration around them. */
function markWrappers({ el, card }: ShowcaseCase): void {
  const chain: Element[] = [];
  for (let node = card.parentElement; node && node !== el; node = node.parentElement) chain.push(node);
  chain.forEach((node, i) => {
    node.setAttribute("data-kv-show-wrap", i === chain.length - 1 ? "outer" : "inner");
  });
  for (const parent of [el, ...chain]) {
    for (const child of parent.children) {
      if (child !== card && !chain.includes(child)) child.setAttribute("data-kv-show-extra", "");
    }
  }
  const sleeve = chain.map((node) => SLEEVE_CLASS.exec(node.className)?.[1]).find(Boolean);
  if (sleeve) el.setAttribute("data-kv-show-sleeve", sleeve);
}

/** Marks the card's parts. A missing part is ignored: that text is simply not restyled. */
function markParts({ card, image }: ShowcaseCase): void {
  card.setAttribute("data-kv-show-card", "");
  card.querySelector(".art")?.setAttribute("data-kv-show-part", "art");
  image.parentElement?.setAttribute("data-kv-show-part", "art");
  image.setAttribute("data-kv-show-part", "img");
  for (const [selector, part] of CARD_PARTS) {
    card.querySelector(selector)?.setAttribute("data-kv-show-part", part);
  }
}

/** Rarity color for the CSS, from the site's own variables. No known rarity: the CSS default stays. */
function markRarity({ el, card }: ShowcaseCase): void {
  const rarity = RARITY_CLASS.exec(card.className)?.[1] ?? card.querySelector(".gem")?.textContent?.trim();
  if (rarity && /^[CUREML]$/.test(rarity)) el.style.setProperty("--kv-rar", `var(--${rarity})`);
}

function markArt({ el, art }: ShowcaseCase): void {
  if (!art) return; // unknown image URL: the site's own <img> stays visible
  el.style.setProperty("--kv-art-sm", `url("${art.sm}")`);
  el.style.setProperty("--kv-art-lg", `url("${art.lg}")`);
  el.setAttribute("data-kv-show-art", art.sm);
}

/**
 * Marks every showcase card for the design CSS: position (`--kv-i`, `--kv-n`, also on the list), art, parts, and the hero
 * (`data-kv-show-hero`: the site's favourite, otherwise the first card).
 */
export function markShowcase(cases: ShowcaseCase[]): void {
  const hero = cases.find((c) => c.el.classList.contains("fav")) ?? cases[0];
  const list = cases[0]?.el.parentElement;
  list?.setAttribute("data-kv-show-list", "");
  list?.style.setProperty("--kv-n", String(cases.length)); // the fan's columns
  cases.forEach((showcase, i) => {
    const { el } = showcase;
    el.setAttribute("data-kv-show-case", "");
    el.toggleAttribute("data-kv-show-hero", showcase === hero);
    el.style.setProperty("--kv-i", String(i));
    el.style.setProperty("--kv-n", String(cases.length));
    markWrappers(showcase);
    markParts(showcase);
    markRarity(showcase);
    markArt(showcase);
  });
}
