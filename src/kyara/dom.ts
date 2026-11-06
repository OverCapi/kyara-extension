// Reads the kyara.games DOM: offers of the Trades tab and the cards they contain.
// If the site changes its structure, this is where (and the only place) the selectors are updated.
// Read only: nothing is changed in the site's DOM.

export const OFFER_SELECTOR = 'li[id^="offre-"]';
const CARD_SELECTOR = 'a[href^="/wiki/"]';
/** Card link inside an offer (used to detect hovering). */
export const OFFER_CARD_SELECTOR = `${OFFER_SELECTOR} ${CARD_SELECTOR}`;

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
}

/** Card id of a `/wiki/<id>` link, or `null` if the link does not have this format. */
export function cardId(a: Element): number | null {
  const segment = (a.getAttribute("href") ?? "").split("/").pop() ?? "";
  return /^\d+$/.test(segment) ? Number(segment) : null;
}

function toCard(a: Element | null): Card | null {
  const id = a ? cardId(a) : null;
  return a instanceof HTMLAnchorElement && id !== null ? { el: a, id } : null;
}

/** Reads an offer. Links without a valid id are ignored. */
export function readOffer(li: HTMLElement): Offer {
  const give = toCard(li.querySelector(`.give ${CARD_SELECTOR}`));
  const wants = [...li.querySelectorAll(`.want ${CARD_SELECTOR}`)].map(toCard);
  return { li, give, wants: wants.filter((c): c is Card => c !== null) };
}

/** Filter bar of the Trades tab (search + pills), a wrapping flex row. `null` if missing. */
export function findOfferFilters(root: ParentNode = document): HTMLElement | null {
  // no :has(): Firefox 115 (minimum version) does not support it
  return root.querySelector(".filters > .pills")?.parentElement ?? null;
}

/** "Voir plus d'offres" (load more) button under the offer list, `null` when there is nothing left to load. */
export function findLoadMore(root: ParentNode = document): HTMLButtonElement | null {
  return root.querySelector<HTMLButtonElement>(".board > button.more");
}

/** Every offer shown in the page. */
export function readOffers(root: ParentNode = document): Offer[] {
  return [...root.querySelectorAll<HTMLElement>(OFFER_SELECTOR)].map(readOffer);
}

/** Ids of every card in an offer (offered + wanted). */
export function offerIds(offer: Offer): number[] {
  return [...(offer.give ? [offer.give] : []), ...offer.wants].map((c) => c.id);
}

/** Every card in an offer (offered + wanted). */
export function offerCards(offer: Offer): Card[] {
  return offer.give ? [offer.give, ...offer.wants] : offer.wants;
}
