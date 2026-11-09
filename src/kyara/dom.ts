// Reading the offers of the Trades tab from the site's DOM. The ONLY place that knows how an offer looks.
// Each lookup tries the site's current markup first, then a fallback based on what cannot change without
// the page changing meaning (card links, their order, the button texts): a site update degrades
// gracefully instead of breaking every feature. Other page elements (filter bar, board, booster picker):
// page-dom.ts.
// DOM effect: markOffers() only (data-kv-offer / data-kv-offers attributes, used by the features' CSS).

const OFFER_SELECTOR = 'li[id^="offre-"]';
const CARD_SELECTOR = 'a[href^="/wiki/"]';
/** Set by markOffers on each offer: the features' CSS targets it instead of the site's markup. */
export const OFFER_ATTR = "data-kv-offer";
/** Set by markOffers on the list holding the offers: hides new offers before the features ran (CSS). */
export const OFFER_LIST_ATTR = "data-kv-offers";
/** Card link inside an offer (used to detect hovering): the site's markup, or an offer marked by markOffers. */
export const OFFER_CARD_SELECTOR = `${OFFER_SELECTOR} ${CARD_SELECTOR}, [${OFFER_ATTR}] ${CARD_SELECTOR}`;

/** A card: its link in the page + its id (last segment of the /wiki/<id> URL). */
export interface Card {
  el: HTMLAnchorElement;
  id: number;
}
/** An offer: the offered card (`give`, missing if the page is incomplete) and the wanted cards. */
export interface Offer {
  li: HTMLElement;
  give: Card | null;
  wants: Card[];
  /** Wanted cards you can give right now: owned AND not locked (the site shows a "Donner" button only for them). */
  free: Card[];
}

/** Card id of a `/wiki/<id>` link, or `null` if the link does not have this format. */
export function cardId(a: Element): number | null {
  const segment = (a.getAttribute("href") ?? "").split("/").pop() ?? "";
  return /^\d+$/.test(segment) ? Number(segment) : null;
}

function toCard(a: Element | null | undefined): Card | null {
  const id = a ? cardId(a) : null;
  return a instanceof HTMLAnchorElement && id !== null ? { el: a, id } : null;
}
const toCards = (links: Iterable<Element>) => [...links].map(toCard).filter((c): c is Card => c !== null);

/**
 * Offers of the page. Site markup: `<li id="offre-…">`. Fallback: list items with at least 2 card links
 * and the ⇄ trade arrow.
 */
export function findOfferItems(root: ParentNode = document): HTMLElement[] {
  const byId = [...root.querySelectorAll<HTMLElement>(OFFER_SELECTOR)];
  if (byId.length > 0) return byId;
  return [...root.querySelectorAll<HTMLElement>("li")].filter(
    (li) => li.querySelectorAll(CARD_SELECTOR).length >= 2 && (li.textContent ?? "").includes("⇄"),
  );
}

/**
 * Reads an offer. Site markup: card links in `.give` and `.want`. Fallback: the first card link is the
 * offered card, the next ones the wanted cards (the page's reading order). Invalid links are ignored.
 */
export function readOffer(li: HTMLElement): Offer {
  // the fallback only applies when the site's containers are gone, not when a side is empty
  const marked = li.querySelector(".give") !== null && li.querySelector(".want") !== null;
  const all = toCards(li.querySelectorAll(CARD_SELECTOR));
  const give = marked ? toCard(li.querySelector(`.give ${CARD_SELECTOR}`)) : (all[0] ?? null);
  const wants = marked ? toCards(li.querySelectorAll(`.want ${CARD_SELECTOR}`)) : all.slice(1);
  return { li, give, wants, free: readGiveButtons({ li, wants }).map((b) => b.card) };
}

/** Every offer shown in the page. */
export function readOffers(root: ParentNode = document): Offer[] {
  return findOfferItems(root).map(readOffer);
}

/** Marks the offers and their list (OFFER_ATTR / OFFER_LIST_ATTR) for the features' CSS. */
export function markOffers(offers: Offer[]): void {
  for (const { li } of offers) {
    li.toggleAttribute(OFFER_ATTR, true);
    li.parentElement?.toggleAttribute(OFFER_LIST_ATTR, true);
  }
}

/** Ids of every card in an offer (offered + wanted). */
export function offerIds(offer: Offer): number[] {
  return offerCards(offer).map((c) => c.id);
}

/** Every card in an offer (offered + wanted). */
export function offerCards(offer: Offer): Card[] {
  return offer.give ? [offer.give, ...offer.wants] : offer.wants;
}

/** Container of the wanted cards (the site's `.thumbs` row): parent of the first wanted card. `null` if none. */
export function findWantsRow(offer: Offer): HTMLElement | null {
  return offer.wants[0]?.el.parentElement ?? null;
}

/** Arrow (⇄) between the offered and the wanted cards: `.arrow`, otherwise the element showing ⇄. `null` if missing. */
export function findOfferArrow(offer: Offer): HTMLElement | null {
  const marked = offer.li.querySelector<HTMLElement>(".arrow");
  if (marked) return marked;
  return (
    [...offer.li.querySelectorAll<HTMLElement>("*")].find((el) => el.textContent?.trim() === "⇄") ?? null
  );
}

/** Clickable elements of an offer that can be a give button (card links excluded: they have no text). */
const ACTION_SELECTOR = 'button, [role="button"], a:not([href^="/wiki/"])';
const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

/** Name of a card: its image's `alt`, otherwise its `title` without the site's " (tu l'as)" suffix (owned cards). */
export function cardName(card: Card): string {
  return card.el.querySelector("img")?.alt || card.el.title.replace(/\s*\([^)]*\)\s*$/, "");
}

/** A "Donner <card>" (give) button and the wanted card it gives. */
export interface GiveButton {
  el: HTMLElement;
  card: Card;
}

/**
 * "Donner <card>" buttons of an offer (only shown for cards you own), each matched to its wanted card by
 * the card name (`title` of the card link). Longest name first, so "Saki Aoi" wins over "Saki".
 * Other buttons ("Proposer autre chose") are ignored.
 */
export function readGiveButtons(offer: Pick<Offer, "li" | "wants">): GiveButton[] {
  const named = offer.wants
    .map((card) => ({ card, name: normalize(cardName(card)) }))
    .filter((n) => n.name)
    .sort((a, b) => b.name.length - a.name.length);
  const buttons: GiveButton[] = [];
  for (const el of offer.li.querySelectorAll<HTMLElement>(ACTION_SELECTOR)) {
    const text = normalize(el.textContent ?? "");
    const hit = named.find((n) => text.includes(n.name));
    if (hit) buttons.push({ el, card: hit.card });
  }
  return buttons;
}
