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
  /** Wanted cards you can give right now: owned AND not locked (the site shows a "Donner" button only for them). */
  free: Card[];
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
  const wants = [...li.querySelectorAll(`.want ${CARD_SELECTOR}`)]
    .map(toCard)
    .filter((c): c is Card => c !== null);
  return { li, give, wants, free: readGiveButtons({ li, wants }).map((b) => b.card) };
}

/** Filter bar of the Trades tab (search + pills), a wrapping flex row. `null` if missing. */
export function findOfferFilters(root: ParentNode = document): HTMLElement | null {
  // parent of .pills rather than :has(), which keeps the selector cheap on every render
  return root.querySelector(".filters > .pills")?.parentElement ?? null;
}

/** "Voir plus d'offres" (load more) button under the offer list, `null` when there is nothing left to load. */
export function findLoadMore(root: ParentNode = document): HTMLButtonElement | null {
  return root.querySelector<HTMLButtonElement>(".board > button.more");
}

/** Board holding the offer list and the load more button. `null` if missing. */
export function findOfferBoard(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(".board");
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

/** Arrow (⇄) between the offered and the wanted cards. `null` if missing. */
export function findOfferArrow(offer: Offer): HTMLElement | null {
  return offer.li.querySelector<HTMLElement>(".arrow");
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
// ponytail: matched by name, since the buttons carry no card id; switch to an id if the site adds one.
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
