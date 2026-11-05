// Lecture du DOM de kyara.games : offres de l'onglet Échanges et cartes qu'elles contiennent.
// Si le site change sa structure, c'est ici (et seulement ici) qu'on adapte les sélecteurs.
// Lecture seule : rien n'est modifié dans le DOM du site.

export const OFFER_SELECTOR = 'li[id^="offre-"]';
const CARD_SELECTOR = 'a[href^="/wiki/"]';
/** Lien de carte à l'intérieur d'une offre (utilisé pour détecter le survol). */
export const OFFER_CARD_SELECTOR = `${OFFER_SELECTOR} ${CARD_SELECTOR}`;

/** Une carte : son lien dans la page + son id (dernier segment de l'URL /wiki/<id>). */
export interface Card {
  el: HTMLAnchorElement;
  id: number;
}
/** Une offre : la carte proposée (`give`, absente si la page est incomplète) et les cartes demandées. */
export interface Offer {
  li: HTMLElement;
  give: Card | null;
  wants: Card[];
}

/** Id de la carte d'un lien `/wiki/<id>`, ou `null` si le lien n'a pas ce format. */
export function cardId(a: Element): number | null {
  const segment = (a.getAttribute("href") ?? "").split("/").pop() ?? "";
  return /^\d+$/.test(segment) ? Number(segment) : null;
}

function toCard(a: Element | null): Card | null {
  const id = a ? cardId(a) : null;
  return a instanceof HTMLAnchorElement && id !== null ? { el: a, id } : null;
}

/** Lit une offre. Les liens sans id valide sont ignorés. */
export function readOffer(li: HTMLElement): Offer {
  const give = toCard(li.querySelector(`.give ${CARD_SELECTOR}`));
  const wants = [...li.querySelectorAll(`.want ${CARD_SELECTOR}`)].map(toCard);
  return { li, give, wants: wants.filter((c): c is Card => c !== null) };
}

/** Barre de filtres de l'onglet Échanges (recherche + pastilles), en flex avec retour à la ligne. `null` si absente. */
export function findOfferFilters(root: ParentNode = document): HTMLElement | null {
  // pas de :has() : Firefox 115 (version minimale) ne le connaît pas
  return root.querySelector(".filters > .pills")?.parentElement ?? null;
}

/** Bouton « Voir plus d'offres » sous la liste des offres, `null` s'il n'y a plus rien à charger. */
export function findLoadMore(root: ParentNode = document): HTMLButtonElement | null {
  return root.querySelector<HTMLButtonElement>(".board > button.more");
}

/** Toutes les offres affichées dans la page. */
export function readOffers(root: ParentNode = document): Offer[] {
  return [...root.querySelectorAll<HTMLElement>(OFFER_SELECTOR)].map(readOffer);
}

/** Ids de toutes les cartes d'une offre (proposée + demandées). */
export function offerIds(offer: Offer): number[] {
  return [...(offer.give ? [offer.give] : []), ...offer.wants].map((c) => c.id);
}

/** Toutes les cartes d'une offre (proposée + demandées). */
export function offerCards(offer: Offer): Card[] {
  return offer.give ? [offer.give, ...offer.wants] : offer.wants;
}
