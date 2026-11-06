import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { DEBOUNCE_MS } from "../core/page";
import { fakeCtx, mockFetch, renderOffers } from "../test/helpers";
import { startFeatures } from "./runtime";
import type { Feature } from "./types";

beforeEach(() => fakeBrowser.reset());

// each test's runtime keeps watching the page: stop it, or it would react to the next test's offers
const pages: Array<ReturnType<typeof fakeCtx>> = [];
const page = () => {
  const p = fakeCtx();
  pages.push(p);
  return p;
};
afterEach(() => {
  for (const p of pages.splice(0)) p.invalidate();
  document.body.innerHTML = "";
});

const settle = async () => {
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
  await vi.advanceTimersByTimeAsync(0);
};

describe("startFeatures", () => {
  it("gives a snapshot to each feature after the debounce", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderOffers([{ give: 1, wants: [2] }]);
    mockFetch({});
    const seen = vi.fn();
    const feature: Feature = { name: "t", setup: (ctx) => ctx.onOffers(seen) };
    startFeatures(page(), [feature]);
    expect(seen).not.toHaveBeenCalled();
    await settle();
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0]?.[0].offers).toHaveLength(1);
  });

  it("marks each offer as processed (data-kv-seen) once the features have run", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const [li] = renderOffers([{ give: 1, wants: [2] }]);
    mockFetch({});
    const seenDuring: boolean[] = [];
    const feature: Feature = {
      name: "t",
      setup: (ctx) =>
        ctx.onOffers(({ offers }) => {
          for (const o of offers) seenDuring.push(o.li.hasAttribute("data-kv-seen"));
        }),
    };
    startFeatures(page(), [feature]);
    await settle();
    expect(seenDuring).toEqual([false]);
    expect(li?.hasAttribute("data-kv-seen")).toBe(true);
  });

  it("a crashing feature (setup or render) does not stop the others", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mockFetch({});
    const ok = vi.fn();
    const badSetup: Feature = {
      name: "bad-setup",
      setup() {
        throw new Error("x");
      },
    };
    const badRender: Feature = {
      name: "bad-render",
      setup: (ctx) =>
        ctx.onOffers(() => {
          throw new Error("x");
        }),
    };
    const good: Feature = { name: "good", setup: (ctx) => ctx.onOffers(ok) };
    expect(() => startFeatures(page(), [badSetup, badRender, good])).not.toThrow();
    await settle();
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("requests missing prices for acceptable offers", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderOffers([{ give: 1, wants: [2], free: [2] }]);
    const fetchMock = mockFetch({ 1: 10, 2: 4 });
    startFeatures(page(), []);
    await settle();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/fair-play/prices?ids=1,2");
  });

  it("pricesPending: true during a render whose prices are missing, false once they are stored", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderOffers([{ give: 11, wants: [12], free: [12] }]);
    mockFetch({ 11: 10, 12: 4 });
    const states: boolean[] = [];
    const feature: Feature = {
      name: "t",
      setup: (ctx) => ctx.onOffers(() => states.push(ctx.pricesPending())),
    };
    let pendingBefore = true;
    startFeatures(page(), [
      {
        name: "u",
        setup: (ctx) => {
          pendingBefore = ctx.pricesPending();
        },
      },
      feature,
    ]);
    expect(pendingBefore).toBe(false); // no snapshot yet
    await settle(); // first render: prices missing, then the fair-play reply triggers a new render
    await settle();
    expect(states).toEqual([true, false]);
  });
});
