import { describe, expect, it, vi } from "vitest";
import { mockFetch, renderOffers, startFeature } from "../../test/helpers";
import { marketTooltip, TIP_DELAY } from "./index";

const tip = () => document.querySelector<HTMLElement>(".kv-tip");
const hover = (el: Element) => el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setup() {
  const [li] = renderOffers([{ give: 5, wants: [7] }]);
  const card = li?.querySelector(".give a") as HTMLElement;
  return { card, feature: startFeature(marketTooltip) };
}

describe("market-tooltip", () => {
  it("cachée au départ", () => {
    setup();
    expect(tip()?.hidden).toBe(true);
  });

  it("après le délai : nom, puis prix minimum", async () => {
    const fetchMock = mockFetch({ items: [{ price: 7 }], total: 2 });
    const { card } = setup();
    hover(card);
    await vi.waitFor(() => expect(tip()?.innerHTML).toContain("7<i>◆</i>"), { timeout: 2000 });
    expect(tip()?.hidden).toBe(false);
    expect(tip()?.innerHTML).toContain("Carte 5");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("échec réseau : 'indisponible'", async () => {
    mockFetch({}, 500);
    const { card } = setup();
    hover(card);
    await vi.waitFor(() => expect(tip()?.innerHTML).toContain("indisponible"), { timeout: 2000 });
  });

  it("quitter la carte avant le délai : aucune requête", async () => {
    const fetchMock = mockFetch({ items: [], total: 0 });
    const { card } = setup();
    hover(card);
    hover(document.body);
    await wait(TIP_DELAY + 100);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tip()?.hidden).toBe(true);
  });

  it("se cache au scroll", async () => {
    mockFetch({ items: [{ price: 1 }], total: 1 });
    const { card } = setup();
    hover(card);
    await vi.waitFor(() => expect(tip()?.hidden).toBe(false), { timeout: 2000 });
    window.dispatchEvent(new Event("scroll"));
    expect(tip()?.hidden).toBe(true);
  });

  it("ignore un lien sans id valide", async () => {
    const fetchMock = mockFetch({});
    const { card } = setup();
    card.setAttribute("href", "/wiki/abc");
    hover(card);
    await wait(TIP_DELAY + 100);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retirée quand l'extension est rechargée", () => {
    const { feature } = setup();
    feature.page.invalidate();
    expect(tip()).toBeNull();
  });
});
