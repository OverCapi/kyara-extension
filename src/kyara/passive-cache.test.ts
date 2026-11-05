import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import type { ResponseFilter } from "../core/firefox";
import { readOwned, readPrices } from "../core/storage";
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
  it("stocke les prix trouvés", async () => {
    await storeBody(`${K}/api/fair-play/prices?ids=1`, '{"1": 12}');
    expect((await readPrices([1])).fair[1]?.v).toBe(12);
  });
  it("JSON invalide ou réponse sans prix : rien, sans exception", async () => {
    await expect(storeBody(`${K}/api/market/listings`, "<html>")).resolves.toBeUndefined();
    await expect(storeBody(`${K}/api/market/listings`, "{}")).resolves.toBeUndefined();
    expect(await readOwned()).toBeNull();
  });
});

describe("interceptResponse", () => {
  it("recopie chaque morceau tel quel vers la page, puis stocke la collection", async () => {
    const filter = fakeFilter();
    interceptResponse(`${K}/api/me/collection?lean=1`, "7");
    stream(filter, ['[{"characterId":10,', '"qty":2}]']);
    expect(filter.write).toHaveBeenCalledTimes(2);
    expect(filter.close).toHaveBeenCalled();
    await vi.waitFor(async () => expect(await readOwned()).toEqual({ 10: 2 }));
  });

  it("réponse illisible : la page reçoit quand même tout, rien n'est stocké", async () => {
    const filter = fakeFilter();
    interceptResponse(`${K}/api/market/listings`, "7");
    stream(filter, ["pas du json"]);
    expect(filter.write).toHaveBeenCalledTimes(1);
    expect(await readOwned()).toBeNull();
  });

  it("sans API Firefox : ne fait rien", () => {
    Reflect.deleteProperty(browser.webRequest, "filterResponseData");
    expect(() => interceptResponse(`${K}/api/me/collection`, "1")).not.toThrow();
  });

  it("filtre en erreur : géré sans exception", () => {
    const filter = fakeFilter();
    interceptResponse(`${K}/api/me/collection`, "1");
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

  it("écoute les URLs surveillées en mode bloquant", () => {
    const add = listener();
    expect(add).toHaveBeenCalledWith(expect.any(Function), { urls: WATCHED_URLS }, ["blocking"]);
  });

  it("n'intercepte que les GET", () => {
    const filterFn = fakeFilter();
    const handler = listener().mock.calls[0]?.[0];
    handler({ method: "POST", url: `${K}/api/me/collection`, requestId: "1" });
    expect(firefoxApi().filterResponseData).not.toHaveBeenCalled();
    handler({ method: "GET", url: `${K}/api/me/collection`, requestId: "1" });
    expect(firefoxApi().filterResponseData).toHaveBeenCalledWith("1");
    expect(filterFn.ondata).toBeTypeOf("function");
  });

  it("si l'interception plante, la requête continue", () => {
    Object.assign(browser.webRequest, {
      filterResponseData: vi.fn(() => {
        throw new Error("denied");
      }),
    });
    const handler = listener().mock.calls[0]?.[0];
    expect(handler({ method: "GET", url: `${K}/api/me/collection`, requestId: "1" })).toBeUndefined();
  });
});
