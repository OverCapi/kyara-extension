import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import type { ResponseFilter } from "../core/firefox";
import { readPrices } from "../core/storage";
import { interceptResponse, startPassiveCache, storeBody, WATCHED_URLS } from "./passive-cache";

beforeEach(() => fakeBrowser.reset());

const K = "https://kyara.games";
const firefoxApi = () => browser.webRequest as unknown as { filterResponseData: ReturnType<typeof vi.fn> };
const bytes = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

function fakeFilter() {
  const filter = { ondata: null, onstop: null, onerror: null, error: "", write: vi.fn(), close: vi.fn() };
  Object.assign(browser.webRequest, { filterResponseData: vi.fn(() => filter) });
  return filter as unknown as ResponseFilter & {
    write: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
}

function stream(filter: ResponseFilter, chunks: string[]) {
  for (const c of chunks) filter.ondata?.({ data: bytes(c) });
  filter.onstop?.();
}

describe("storeBody", () => {
  it("stores the prices found", async () => {
    await storeBody(`${K}/api/fair-play/prices?ids=1`, '{"1": 12}');
    expect((await readPrices([1])).fair[1]?.v).toBe(12);
  });
  it("invalid JSON or response without prices: nothing, no exception", async () => {
    await expect(storeBody(`${K}/api/market/listings`, "<html>")).resolves.toBeUndefined();
    await expect(storeBody(`${K}/api/market/listings`, "{}")).resolves.toBeUndefined();
    expect(await browser.storage.local.get(null)).toEqual({});
  });
});

describe("interceptResponse", () => {
  it("copies each chunk as is to the page, then stores the prices", async () => {
    const filter = fakeFilter();
    interceptResponse(`${K}/api/fair-play/prices?ids=10`, "7");
    stream(filter, ['{"10":', "12}"]);
    expect(filter.write).toHaveBeenCalledTimes(2);
    expect(filter.close).toHaveBeenCalled();
    await vi.waitFor(async () => expect((await readPrices([10])).fair[10]?.v).toBe(12));
  });

  it("unreadable response: the page still receives everything, nothing is stored", async () => {
    const filter = fakeFilter();
    interceptResponse(`${K}/api/market/listings`, "7");
    stream(filter, ["not json"]);
    expect(filter.write).toHaveBeenCalledTimes(1);
    expect(await browser.storage.local.get(null)).toEqual({});
  });

  it("without the Firefox API: does nothing", () => {
    Reflect.deleteProperty(browser.webRequest, "filterResponseData");
    expect(() => interceptResponse(`${K}/api/fair-play/prices`, "1")).not.toThrow();
  });

  it("filter error: handled without exception", () => {
    const filter = fakeFilter();
    interceptResponse(`${K}/api/fair-play/prices`, "1");
    expect(() => filter.onerror?.()).not.toThrow();
  });
});

describe("startPassiveCache", () => {
  function listener() {
    const addListener = vi.fn();
    Object.assign(browser.webRequest, { onBeforeRequest: { addListener } });
    startPassiveCache();
    return addListener;
  }

  it("listens to the watched URLs in blocking mode", () => {
    const add = listener();
    expect(add).toHaveBeenCalledWith(expect.any(Function), { urls: WATCHED_URLS }, ["blocking"]);
  });

  it("only intercepts GET", () => {
    const filterFn = fakeFilter();
    const handler = listener().mock.calls[0]?.[0];
    handler({ method: "POST", url: `${K}/api/fair-play/prices`, requestId: "1" });
    expect(firefoxApi().filterResponseData).not.toHaveBeenCalled();
    handler({ method: "GET", url: `${K}/api/fair-play/prices`, requestId: "1" });
    expect(firefoxApi().filterResponseData).toHaveBeenCalledWith("1");
    expect(filterFn.ondata).toBeTypeOf("function");
  });

  it("if interception crashes, the request goes on", () => {
    Object.assign(browser.webRequest, {
      filterResponseData: vi.fn(() => {
        throw new Error("denied");
      }),
    });
    const handler = listener().mock.calls[0]?.[0];
    expect(handler({ method: "GET", url: `${K}/api/fair-play/prices`, requestId: "1" })).toBeUndefined();
  });
});
