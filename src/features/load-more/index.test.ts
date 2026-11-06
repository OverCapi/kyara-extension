import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { Offer } from "../../kyara/dom";
import type { OffersSnapshot } from "../../kyara/offers";
import { startFeature } from "../../test/helpers";
import { LOAD_TIMEOUT, loadMore, MAX_AUTO_LOADS, MIN_VISIBLE } from "./index";

let more: HTMLButtonElement | null;
let clicked: Mock<() => void>;

beforeEach(() => {
  document.body.innerHTML =
    '<section class="board"><ul class="offers"></ul><button class="more">Voir plus</button></section>';
  more = document.querySelector("button.more");
  clicked = vi.fn<() => void>();
  more?.addEventListener("click", clicked);
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
});
afterEach(() => document.documentElement.removeAttribute("data-kv-filter-gain"));

/** Snapshot of `total` offers, `hidden` of which are hidden by a filter. */
function snap(total: number, hidden: number): OffersSnapshot {
  const offers: Offer[] = Array.from({ length: total }, (_, i) => {
    const li = document.createElement("li");
    if (i < hidden) li.setAttribute("data-kv-hide-gain", "");
    return { li, give: null, wants: [], free: [] };
  });
  return { offers, store: { fair: {}, market: {} } };
}
const filtering = () => document.documentElement.setAttribute("data-kv-filter-gain", "");

describe("load-more", () => {
  it("no filter on: does not click", () => {
    startFeature(loadMore).emit(snap(20, 20));
    expect(clicked).not.toHaveBeenCalled();
  });

  it("filter on and too few visible offers: clicks the load more button", () => {
    filtering();
    startFeature(loadMore).emit(snap(20, 20 - (MIN_VISIBLE - 1)));
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it("enough visible offers: does not click", () => {
    filtering();
    startFeature(loadMore).emit(snap(20, 20 - MIN_VISIBLE));
    expect(clicked).not.toHaveBeenCalled();
  });

  it("waits for loading to end: no second click until the list has changed", () => {
    filtering();
    const { emit } = startFeature(loadMore);
    emit(snap(20, 20));
    emit(snap(20, 20));
    expect(clicked).toHaveBeenCalledTimes(1);
    emit(snap(40, 40)); // the offers arrived, still too few visible
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  it("loading that never completes: retries after the timeout", () => {
    filtering();
    const { emit } = startFeature(loadMore);
    emit(snap(20, 20));
    vi.setSystemTime(Date.now() + LOAD_TIMEOUT + 1);
    emit(snap(20, 20));
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  it("enough offers reached: resets the counter", () => {
    filtering();
    const { emit } = startFeature(loadMore);
    emit(snap(20, 20));
    emit(snap(40, 0)); // 40 visible
    emit(snap(40, 40)); // the filter changes: can load again right away
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  it("prices on their way: waits for them before loading more", () => {
    filtering();
    const { emit, prices } = startFeature(loadMore);
    prices.pending = true;
    emit(snap(20, 20));
    expect(clicked).not.toHaveBeenCalled();
    prices.pending = false; // the fair-play reply re-renders
    emit(snap(20, 20));
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it("cap on consecutive automatic clicks", () => {
    filtering();
    const { emit } = startFeature(loadMore);
    for (let i = 1; i <= MAX_AUTO_LOADS + 5; i++) emit(snap(20 * i, 20 * i));
    expect(clicked).toHaveBeenCalledTimes(MAX_AUTO_LOADS);
  });

  it("no button left (everything loaded): does nothing", () => {
    filtering();
    more?.remove();
    expect(() => startFeature(loadMore).emit(snap(20, 20))).not.toThrow();
    expect(clicked).not.toHaveBeenCalled();
  });

  it("hidden tab: does not click", () => {
    filtering();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    startFeature(loadMore).emit(snap(20, 20));
    expect(clicked).not.toHaveBeenCalled();
  });

  describe("user click: MIN_VISIBLE new visible offers", () => {
    const board = () => document.querySelector(".board");

    it("keeps loading until MIN_VISIBLE more offers are visible", () => {
      filtering();
      const { emit } = startFeature(loadMore);
      emit(snap(20, 8)); // 12 visible: enough at load
      expect(clicked).not.toHaveBeenCalled();
      more?.click(); // user click
      emit(snap(40, 8 + 15)); // 17 visible: 5 new, not enough
      expect(clicked).toHaveBeenCalledTimes(2);
      emit(snap(60, 8 + 15 + 15)); // 22 visible: 10 new
      expect(clicked).toHaveBeenCalledTimes(2);
      expect(board()?.hasAttribute("data-kv-empty")).toBe(false);
    });

    it("nothing new left to load: notice under the list, removed on the next click", () => {
      filtering();
      const { emit } = startFeature(loadMore);
      emit(snap(20, 8));
      more?.click();
      more?.remove(); // everything loaded
      emit(snap(40, 28)); // still 12 visible
      expect(board()?.getAttribute("data-kv-empty")).toBe("Aucune autre offre ne correspond aux filtres.");
      board()?.append(more as HTMLButtonElement);
      more?.click();
      expect(board()?.hasAttribute("data-kv-empty")).toBe(false);
    });

    it("cap reached without any visible offer: notice; filter off: notice removed", () => {
      filtering();
      const { emit } = startFeature(loadMore);
      for (let i = 1; i <= MAX_AUTO_LOADS + 1; i++) emit(snap(20 * i, 20 * i));
      expect(board()?.hasAttribute("data-kv-empty")).toBe(true);
      document.documentElement.removeAttribute("data-kv-filter-gain");
      emit(snap(20, 20));
      expect(board()?.hasAttribute("data-kv-empty")).toBe(false);
    });

    it("round over with new visible offers: no notice, and notice removed when offers show up", () => {
      filtering();
      const { emit } = startFeature(loadMore);
      more?.remove();
      emit(snap(20, 20)); // nothing visible, nothing to load
      expect(board()?.hasAttribute("data-kv-empty")).toBe(true);
      emit(snap(20, 17)); // filter loosened: 3 visible
      expect(board()?.hasAttribute("data-kv-empty")).toBe(false);
    });

    it("notice removed when the extension reloads", () => {
      filtering();
      more?.remove();
      const { emit, page } = startFeature(loadMore);
      emit(snap(20, 20));
      page.invalidate();
      expect(board()?.hasAttribute("data-kv-empty")).toBe(false);
    });
  });

  describe("loading text on the button", () => {
    const label = () => more?.textContent;

    it("user click: text changed, then restored when the offers arrive", () => {
      const { emit } = startFeature(loadMore);
      emit(snap(20, 0));
      more?.click();
      expect(label()).toBe("Chargement…");
      emit(snap(20, 0)); // render without new offers: still loading
      expect(label()).toBe("Chargement…");
      emit(snap(40, 0));
      expect(label()).toBe("Voir plus");
    });

    it("load-more automatic click: text changed, restored, then set again on the next click", () => {
      filtering();
      const { emit } = startFeature(loadMore);
      emit(snap(20, 20));
      expect(label()).toBe("Chargement…");
      emit(snap(40, 40)); // offers arrived, too few visible: new click
      expect(clicked).toHaveBeenCalledTimes(2);
      expect(label()).toBe("Chargement…");
      emit(snap(60, 0));
      expect(label()).toBe("Voir plus");
    });

    it("double click: the original text is kept", () => {
      startFeature(loadMore);
      more?.click();
      more?.click();
      vi.advanceTimersByTime(LOAD_TIMEOUT);
      expect(label()).toBe("Voir plus");
    });

    it("restored if loading does not complete within the timeout", () => {
      startFeature(loadMore);
      more?.click();
      vi.advanceTimersByTime(LOAD_TIMEOUT - 1);
      expect(label()).toBe("Chargement…");
      vi.advanceTimersByTime(1);
      expect(label()).toBe("Voir plus");
    });

    it("keeps the site's text node (no node replaced)", () => {
      const node = more?.firstChild;
      startFeature(loadMore);
      more?.click();
      expect(more?.firstChild).toBe(node);
    });

    it("does not overwrite a text the site rewrote in the meantime", () => {
      const { emit } = startFeature(loadMore);
      more?.click();
      if (more?.firstChild) more.firstChild.nodeValue = "Nothing left";
      emit(snap(40, 0));
      expect(label()).toBe("Nothing left");
    });

    it("ignores other clicks and a button without text", () => {
      startFeature(loadMore);
      document.body.click();
      expect(label()).toBe("Voir plus");
      more?.replaceChildren(document.createElement("span"));
      expect(() => more?.click()).not.toThrow();
    });

    it("text restored when the extension reloads, with no leftover timer or listener", () => {
      const { page } = startFeature(loadMore);
      more?.click();
      page.invalidate();
      expect(label()).toBe("Voir plus");
      expect(vi.getTimerCount()).toBe(0);
      more?.click();
      expect(label()).toBe("Voir plus");
    });
  });
});
