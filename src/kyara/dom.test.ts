import { describe, expect, it } from "vitest";
import { renderOffers } from "../test/helpers";
import { cardId, offerCards, offerIds, readOffer, readOffers } from "./dom";

describe("cardId", () => {
  it("lit le dernier segment de /wiki/<id>", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/wiki/42");
    expect(cardId(a)).toBe(42);
  });
  it("null si le lien n'a pas d'id numérique", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/wiki/abc");
    expect(cardId(a)).toBeNull();
    expect(cardId(document.createElement("a"))).toBeNull();
  });
});

describe("readOffer / readOffers", () => {
  it("lit la carte proposée et les cartes demandées", () => {
    const [li] = renderOffers([{ give: 5, wants: [7, 8] }]);
    const offer = readOffer(li as HTMLElement);
    expect(offer.give?.id).toBe(5);
    expect(offer.wants.map((c) => c.id)).toEqual([7, 8]);
    expect(offerIds(offer)).toEqual([5, 7, 8]);
    expect(offerCards(offer)).toHaveLength(3);
  });
  it("offre sans carte proposée", () => {
    const [li] = renderOffers([{ wants: [7] }]);
    const offer = readOffer(li as HTMLElement);
    expect(offer.give).toBeNull();
    expect(offerIds(offer)).toEqual([7]);
    expect(offerCards(offer)).toHaveLength(1);
  });
  it("ignore les liens sans id valide", () => {
    const [li] = renderOffers([{ give: 5, wants: [7] }]);
    li?.querySelector(".want")?.insertAdjacentHTML("beforeend", '<a href="/wiki/zzz">?</a>');
    expect(readOffer(li as HTMLElement).wants).toHaveLength(1);
  });
  it("readOffers renvoie toutes les offres de la page, [] sinon", () => {
    expect(readOffers()).toEqual([]);
    renderOffers([{ give: 1 }, { give: 2 }]);
    expect(readOffers()).toHaveLength(2);
  });
});
