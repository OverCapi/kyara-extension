import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import type { PriceStore } from "../core/storage";
import { readPrices } from "../core/storage";
import { mockFetch, renderOffers } from "../test/helpers";
import { readOffers } from "./dom";
import { BATCH, createFairPlayRequester, findMissing, RETRY, TTL } from "./fair-play";
import type { OffersSnapshot } from "./offers";

beforeEach(() => fakeBrowser.reset());

const NOW = 10_000_000;
const emptyStore = (): PriceStore => ({ fair: {}, market: {} });

describe("findMissing", () => {
  it("requests the offered card + my wanted cards, not the others", () => {
    renderOffers([{ give: 1, wants: [2, 3] }]);
    const { need, acceptable } = findMissing(readOffers(), { 2: 1 }, emptyStore(), new Map(), NOW);
    expect([...need].sort()).toEqual([1, 2]);
    expect(acceptable).toBe(1);
  });

  it("ignores offers that are not acceptable or have no offered card", () => {
    renderOffers([{ give: 1, wants: [3] }, { wants: [2] }]);
    const { need, acceptable } = findMissing(readOffers(), { 2: 1 }, emptyStore(), new Map(), NOW);
    expect(need.size).toBe(0);
    expect(acceptable).toBe(0);
  });

  it("unknown collection: nothing", () => {
    renderOffers([{ give: 1, wants: [2] }]);
    expect(findMissing(readOffers(), null, emptyStore(), new Map(), NOW).need.size).toBe(0);
  });

  it("fresh price: not requested again; stale price (TTL): requested again", () => {
    renderOffers([{ give: 1, wants: [2] }]);
    const store = (t: number): PriceStore => ({ fair: { 1: { v: 1, t }, 2: { v: 1, t } }, market: {} });
    expect(findMissing(readOffers(), { 2: 1 }, store(NOW - TTL + 1000), new Map(), NOW).need.size).toBe(0);
    expect(findMissing(readOffers(), { 2: 1 }, store(NOW - TTL - 1000), new Map(), NOW).need.size).toBe(2);
  });

  it("failed id: no new attempt before 5 min", () => {
    renderOffers([{ give: 1, wants: [2] }]);
    const tried = (ago: number) =>
      new Map([
        [1, NOW - ago],
        [2, NOW - ago],
      ]);
    expect(findMissing(readOffers(), { 2: 1 }, emptyStore(), tried(RETRY - 1000), NOW).need.size).toBe(0);
    expect(findMissing(readOffers(), { 2: 1 }, emptyStore(), tried(RETRY + 1000), NOW).need.size).toBe(2);
  });
});

describe("findMissing: filtered offers", () => {
  it("hidden by a price-independent filter (rarity): nothing requested", () => {
    const [li] = renderOffers([{ give: 1, wants: [2] }]);
    li?.setAttribute("data-kv-hide-rarity", "");
    li?.setAttribute("data-kv-hide-gain", "");
    const { need, acceptable } = findMissing(readOffers(), { 2: 1 }, emptyStore(), new Map(), NOW);
    expect(need.size).toBe(0);
    expect(acceptable).toBe(0);
  });

  it("hidden by the gain filter: never-priced cards only, stale prices not refreshed", () => {
    const [li] = renderOffers([{ give: 1, wants: [2] }]);
    li?.setAttribute("data-kv-hide-gain", "");
    const stale = NOW - TTL - 1000;
    const store: PriceStore = { fair: { 1: { v: 1, t: stale } }, market: {} };
    expect([...findMissing(readOffers(), { 2: 1 }, store, new Map(), NOW).need]).toEqual([2]);
  });
});

function snapshot(specs: Parameters<typeof renderOffers>[0], owned: Record<number, number>): OffersSnapshot {
  renderOffers(specs);
  return { offers: readOffers(), store: emptyStore(), owned };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("createFairPlayRequester", () => {
  it("makes ONE grouped request, stores the prices, then calls onDone", async () => {
    const fetchMock = mockFetch({ 1: 10, 2: 4 });
    const onDone = vi.fn();
    createFairPlayRequester().request(snapshot([{ give: 1, wants: [2] }], { 2: 1 }), onDone);
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/fair-play/prices?ids=1,2");
    expect((await readPrices([1, 2])).fair[2]?.v).toBe(4);
  });

  it("splits into batches of 200 ids", async () => {
    const ids = Array.from({ length: BATCH + 5 }, (_, i) => i + 1);
    const specs = ids.map((id) => ({ give: id, wants: [1000] }));
    const fetchMock = mockFetch({});
    const onDone = vi.fn();
    createFairPlayRequester().request(snapshot(specs, { 1000: 1 }), onDone);
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("one request at a time", async () => {
    const fetchMock = mockFetch({});
    const requester = createFairPlayRequester();
    const snap = snapshot([{ give: 1, wants: [2] }], { 2: 1 });
    requester.request(snap, vi.fn());
    requester.request(snap, vi.fn());
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("hidden tab: no request", async () => {
    const fetchMock = mockFetch({});
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    createFairPlayRequester().request(snapshot([{ give: 1, wants: [2] }], { 2: 1 }), vi.fn());
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("HTTP 500: nothing written, no immediate retry, onDone called", async () => {
    const fetchMock = mockFetch({ error: "x" }, 500);
    const onDone = vi.fn();
    const requester = createFairPlayRequester();
    const snap = snapshot([{ give: 1, wants: [2] }], { 2: 1 });
    requester.request(snap, onDone);
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect((await readPrices([1, 2])).fair).toEqual({});
    requester.request(snap, onDone);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("failed response: remaining batches skipped, no request at all for RETRY", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const ids = Array.from({ length: BATCH + 5 }, (_, i) => i + 1);
    const fetchMock = mockFetch({}, 429);
    const onDone = vi.fn();
    const requester = createFairPlayRequester();
    requester.request(
      snapshot(
        ids.map((id) => ({ give: id, wants: [1000] })),
        { 1000: 1 },
      ),
      onDone,
    );
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1); // second batch not sent
    document.body.innerHTML = "";
    const other = snapshot([{ give: 5000, wants: [5001] }], { 5001: 1 });
    requester.request(other, onDone);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + RETRY + 1);
    requester.request(other, onDone);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    vi.useRealTimers();
  });

  it("pending: missing prices or request in flight; not when paused or tab hidden", async () => {
    mockFetch({ 1: 10, 2: 4 });
    const requester = createFairPlayRequester();
    const snap = snapshot([{ give: 1, wants: [2] }], { 2: 1 });
    expect(requester.pending(snap)).toBe(true);
    const onDone = vi.fn();
    requester.request(snap, onDone);
    expect(requester.pending({ ...snap, owned: {} })).toBe(true); // in flight
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(requester.pending(snap)).toBe(false); // ids just tried
    expect(createFairPlayRequester().pending({ ...snap, owned: {} })).toBe(false);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    expect(createFairPlayRequester().pending(snap)).toBe(false);
  });

  it("storage error: caught, onDone called", async () => {
    mockFetch({ 1: 10 });
    vi.spyOn(fakeBrowser.storage.local, "set").mockRejectedValue(new Error("context invalidated"));
    const onDone = vi.fn();
    createFairPlayRequester().request(snapshot([{ give: 1, wants: [2] }], { 2: 1 }), onDone);
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("nothing to request: no request", async () => {
    const fetchMock = mockFetch({});
    createFairPlayRequester().request(snapshot([{ give: 1, wants: [2] }], {}), vi.fn());
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
