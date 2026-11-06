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
    return { li, give: null, wants: [] };
  });
  return { offers, store: { fair: {}, market: {} }, owned: null };
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
