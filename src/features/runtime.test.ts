import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { DEBOUNCE_MS } from "../core/page";
import { fakeCtx, mockFetch, renderOffers } from "../test/helpers";
import { startFeatures } from "./runtime";
import type { Feature } from "./types";

beforeEach(() => fakeBrowser.reset());

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
    startFeatures(fakeCtx(), [feature]);
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
    startFeatures(fakeCtx(), [feature]);
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
    expect(() => startFeatures(fakeCtx(), [badSetup, badRender, good])).not.toThrow();
    await settle();
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("requests missing prices for acceptable offers", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderOffers([{ give: 1, wants: [2] }]);
    await fakeBrowser.storage.local.set({ owned: { 2: 1 } });
    const fetchMock = mockFetch({ 1: 10, 2: 4 });
    startFeatures(fakeCtx(), []);
    await settle();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/fair-play/prices?ids=1,2");
  });
});
