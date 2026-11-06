import { describe, expect, it } from "vitest";
import { renderOffers } from "../test/helpers";
import {
  cardId,
  findLoadMore,
  findOfferArrow,
  findOfferFilters,
  offerCards,
  offerIds,
  readGiveButtons,
  readOffer,
  readOffers,
} from "./dom";

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

describe("findOfferArrow", () => {
  it("finds the arrow, null if missing", () => {
    const [li] = renderOffers([{ give: 1, wants: [2] }]);
    if (!li) throw new Error("no offer");
    expect(findOfferArrow(readOffer(li))?.textContent).toBe("⇄");
    li.querySelector(".arrow")?.remove();
    expect(findOfferArrow(readOffer(li))).toBeNull();
  });
});

describe("readGiveButtons", () => {
  it("matches each give button to its wanted card by name, ignores other buttons", () => {
    const [li] = renderOffers([
      { give: 1, wants: [2, 3], buttons: ["Donner Carte 3 ×1", "Donner Carte 2 ×1", "Proposer autre chose"] },
    ]);
    if (!li) throw new Error("no offer");
    const buttons = readGiveButtons(readOffer(li));
    expect(buttons.map((b) => [b.el.textContent, b.card.id])).toEqual([
      ["Donner Carte 3 ×1", 3],
      ["Donner Carte 2 ×1", 2],
    ]);
  });
  it("longest name wins when a name contains another", () => {
    const [li] = renderOffers([{ give: 1, wants: [2, 22], buttons: ["Donner Carte 22 ×1"] }]);
    if (!li) throw new Error("no offer");
    expect(readGiveButtons(readOffer(li)).map((b) => b.card.id)).toEqual([22]);
  });
  it("any clickable element, case and spaces ignored; card and profile links ignored", () => {
    const [li] = renderOffers([{ give: 1, wants: [2, 3] }]);
    if (!li) throw new Error("no offer");
    li.insertAdjacentHTML(
      "beforeend",
      '<div class="x"><a href="/echange">DONNER  carte 2</a><span role="button">Donner Carte 3</span></div>',
    );
    expect(readGiveButtons(readOffer(li)).map((b) => b.card.id)).toEqual([2, 3]);
  });
  it('owned card: the site\'s "(tu l’as)" suffix in the title is ignored', () => {
    const [li] = renderOffers([{ give: 1, wants: [2], buttons: ["Donner Carte 2 ×1"] }]);
    if (!li) throw new Error("no offer");
    const a = li.querySelector(".want a");
    a?.setAttribute("title", "Carte 2 (tu l’as)");
    expect(readGiveButtons(readOffer(li)).map((b) => b.card.id)).toEqual([2]);
    a?.querySelector("img")?.setAttribute("alt", "Carte 2");
    a?.setAttribute("title", "autre");
    expect(readGiveButtons(readOffer(li)).map((b) => b.card.id)).toEqual([2]); // alt first
  });
  it("card without a name: never matched", () => {
    const [li] = renderOffers([{ give: 1, wants: [2], buttons: ["Donner  ×1"] }]);
    if (!li) throw new Error("no offer");
    li.querySelector(".want a")?.removeAttribute("title");
    expect(readGiveButtons(readOffer(li))).toEqual([]);
  });
});
