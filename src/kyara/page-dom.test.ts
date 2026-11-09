import { describe, expect, it } from "vitest";
import { renderOffers } from "../test/helpers";
import {
  findCountPicker,
  findLoadMore,
  findOfferBoard,
  findOfferFilters,
  findOpenButton,
  findOpenCostTag,
} from "./page-dom";

describe("findOfferFilters", () => {
  it("site markup: the bar that holds the pills, other .filters ignored", () => {
    document.body.innerHTML =
      '<div class="filters"><input></div><div class="filters"><input><div class="pills"></div></div>';
    const found = findOfferFilters();
    expect(found?.bar).toBe(document.querySelectorAll(".filters")[1]);
    expect(found?.pills.className).toBe("pills");
  });
  it("classes renamed: closest ancestor of the search field with 2+ toggle buttons", () => {
    document.body.innerHTML =
      '<div class="mode"><button aria-pressed="true">Cartes</button><button aria-pressed="false">Éveil</button></div>' +
      '<div id="bar"><div class="line"><div><input type="search"></div><button>Proposer</button></div>' +
      '<div id="row"><button aria-pressed="false">A</button><button aria-pressed="false">B</button></div></div>';
    const found = findOfferFilters();
    expect(found?.bar.id).toBe("bar");
    expect(found?.pills.id).toBe("row");
  });
  it("the extension's own toggles do not count", () => {
    document.body.innerHTML =
      '<div><input type="search"><div class="kv-menu"><button aria-pressed="false"></button><button aria-pressed="false"></button></div></div>';
    expect(findOfferFilters()).toBeNull();
  });
  it("missing: null", () => {
    document.body.innerHTML = "";
    expect(findOfferFilters()).toBeNull();
  });
});

describe("findOfferBoard", () => {
  it("site markup .board, otherwise the parent of the offer list, null without offers", () => {
    document.body.innerHTML = '<section class="board"></section>';
    expect(findOfferBoard()?.tagName).toBe("SECTION");
    document.body.innerHTML = "";
    expect(findOfferBoard()).toBeNull();
    const [li] = renderOffers([{ give: 1, wants: [2] }]);
    const ul = document.createElement("ul");
    const board = document.createElement("main");
    board.append(ul);
    document.body.append(board);
    if (li) ul.append(li);
    expect(findOfferBoard()).toBe(board);
  });
});

describe("findLoadMore", () => {
  it("site markup: the button under the offer list", () => {
    document.body.innerHTML =
      '<section class="board"><ul class="offers"></ul><button class="btn more">Voir plus</button></section>';
    expect(findLoadMore()?.textContent).toBe("Voir plus");
  });
  it("missing (no more offers to load): null", () => {
    document.body.innerHTML =
      '<section class="board"><ul class="offers"></ul></section><button class="more">other</button>';
    expect(findLoadMore()).toBeNull();
  });
  it("classes renamed: a button after the offer list saying 'plus', never another button", () => {
    const [li] = renderOffers([{ give: 1, wants: [2] }]);
    const ul = document.createElement("ul");
    if (li) ul.append(li);
    const other = document.createElement("button");
    other.textContent = "Proposer une carte";
    const more = document.createElement("button");
    more.textContent = "Voir plus d’offres";
    document.body.append(ul, other);
    expect(findLoadMore()).toBeNull();
    document.body.append(more);
    expect(findLoadMore()).toBe(more);
  });
});

describe("findCountPicker / findOpenCostTag", () => {
  const page = (
    picker: string,
    open = '<button class="btn btn-open">Ouvrir <span class="tag">Gratuit</span></button>',
  ) => {
    document.body.innerHTML = `<div><div role="group">${picker}</div><p>x</p>${open}</div>`;
  };
  it("picker found by its ×N buttons, the extension's option left out", () => {
    page('<button>×1</button><button>× 4</button><button data-kv-free="">×2</button>');
    expect(findCountPicker()?.options.map((o) => o.n)).toEqual([1, 4]);
  });
  it("a group with another button is not the picker", () => {
    page("<button>×1</button><button>Tout</button>");
    expect(findCountPicker()).toBeNull();
    page("");
    expect(findCountPicker()).toBeNull();
  });
  it("cost tag: site markup, otherwise the last element of the button after the picker", () => {
    page("<button>×1</button>");
    expect(findOpenCostTag()?.textContent).toBe("Gratuit");
    page("<button>×1</button>", "<button>Ouvrir <em>2 gratuits</em></button>");
    expect(findOpenCostTag()?.textContent).toBe("2 gratuits");
    page("<button>×1</button>", "<button>Ouvrir</button>");
    expect(findOpenCostTag()).toBeNull();
    document.body.innerHTML = "";
    expect(findOpenCostTag()).toBeNull();
  });
  it("open button: site markup, otherwise the first button after the picker", () => {
    page("<button>×1</button>");
    expect(findOpenButton()?.className).toBe("btn btn-open");
    page("<button>×1</button>", "<button id=go>Ouvrir</button>");
    expect(findOpenButton()?.id).toBe("go");
    page("<button>×1</button>", "<span>Ouvrir</span>");
    expect(findOpenButton()).toBeNull();
  });
});
