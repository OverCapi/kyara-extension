import { describe, expect, it } from "vitest";
import { renderOffers } from "../test/helpers";
import { cardId, findLoadMore, findOfferFilters, offerCards, offerIds, readOffer, readOffers } from "./dom";

describe("cardId", () => {
  it("reads the last segment of /wiki/<id>", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/wiki/42");
    expect(cardId(a)).toBe(42);
  });
  it("null if the link has no numeric id", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/wiki/abc");
    expect(cardId(a)).toBeNull();
    expect(cardId(document.createElement("a"))).toBeNull();
  });
});

describe("readOffer / readOffers", () => {
  it("reads the offered card and the wanted cards", () => {
    const [li] = renderOffers([{ give: 5, wants: [7, 8] }]);
    const offer = readOffer(li as HTMLElement);
    expect(offer.give?.id).toBe(5);
    expect(offer.wants.map((c) => c.id)).toEqual([7, 8]);
    expect(offerIds(offer)).toEqual([5, 7, 8]);
    expect(offerCards(offer)).toHaveLength(3);
  });
  it("offer without an offered card", () => {
    const [li] = renderOffers([{ wants: [7] }]);
    const offer = readOffer(li as HTMLElement);
    expect(offer.give).toBeNull();
    expect(offerIds(offer)).toEqual([7]);
    expect(offerCards(offer)).toHaveLength(1);
  });
  it("ignores links without a valid id", () => {
    const [li] = renderOffers([{ give: 5, wants: [7] }]);
    li?.querySelector(".want")?.insertAdjacentHTML("beforeend", '<a href="/wiki/zzz">?</a>');
    expect(readOffer(li as HTMLElement).wants).toHaveLength(1);
  });
  it("readOffers returns every offer in the page, [] otherwise", () => {
    expect(readOffers()).toEqual([]);
    renderOffers([{ give: 1 }, { give: 2 }]);
    expect(readOffers()).toHaveLength(2);
  });
});

describe("findOfferFilters", () => {
  it("finds the bar that holds the pills, ignores other .filters", () => {
    document.body.innerHTML =
      '<div class="filters"><input></div><div class="filters"><input><div class="pills"></div></div>';
    expect(findOfferFilters()).toBe(document.querySelectorAll(".filters")[1]);
  });
  it("missing: null", () => {
    document.body.innerHTML = "";
    expect(findOfferFilters()).toBeNull();
  });
});

describe("findLoadMore", () => {
  it("finds the button under the offer list", () => {
    document.body.innerHTML =
      '<section class="board"><ul class="offers"></ul><button class="btn more">Voir plus</button></section>';
    expect(findLoadMore()?.textContent).toBe("Voir plus");
  });
  it("missing (no more offers to load): null", () => {
    document.body.innerHTML =
      '<section class="board"><ul class="offers"></ul></section><button class="more">other</button>';
    expect(findLoadMore()).toBeNull();
  });
});
