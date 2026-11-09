import { beforeEach, describe, expect, it, vi } from "vitest";
import { installFetchHook } from "./fetch-hook";
import { HOOK_ATTR, OPEN_COUNT_ATTR, readFreePacks } from "./packs";

const html = document.documentElement;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Fake site fetch answering by path, then the hook installed on top of it. */
function setup(routes: Record<string, () => Response>) {
  const site = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return (routes[new URL(url, "https://kyara.games").pathname] ?? (() => json({})))();
  });
  vi.stubGlobal("fetch", site);
  installFetchHook(window);
  return site;
}
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  html.removeAttribute(OPEN_COUNT_ATTR);
});

describe("installFetchHook: free boosters read from the site's responses", () => {
  const routes = {
    "/api/packs": () =>
      json([
        { id: "all", usesFreePacks: true },
        { id: "top", price: 750 },
      ]),
    "/api/me/bootstrap": () => json({ me: { freePacks: 2, bonusPacks: 0, grants: { top: 1 } } }),
    "/api/packs/all/open-many": () => json({ results: [{ user: { freePacks: 0 } }] }),
  };
  it("published once both the pack list and the user are known, updated by an open", async () => {
    setup(routes);
    await fetch("/api/packs");
    await flush();
    expect(readFreePacks()).toEqual({});
    await fetch(new URL("https://kyara.games/api/me/bootstrap"));
    await flush();
    expect(readFreePacks()).toEqual({ all: 2, top: 1 });
    await fetch(new Request("https://kyara.games/api/packs/all/open-many", { method: "POST" }));
    await flush();
    expect(readFreePacks()).toEqual({ all: 0 });
  });
  it("the page still gets the full response (read through a clone)", async () => {
    setup(routes);
    const res = await fetch("/api/packs");
    expect(await res.json()).toHaveLength(2);
  });
  it("error response, invalid JSON, other URL: nothing read, no error", async () => {
    setup({
      "/api/packs": () => new Response("{oops", { status: 200 }),
      "/api/me/bootstrap": () => json({ me: { freePacks: 9 } }, 500),
    });
    await fetch("/api/packs");
    await fetch("/api/me/bootstrap");
    await fetch("/api/market");
    await flush();
    expect(readFreePacks()).toEqual({});
  });
  it("marks <html> once installed (the feature waits for it)", () => {
    setup({});
    expect(html.hasAttribute(HOOK_ATTR)).toBe(true);
  });
});

describe("installFetchHook: bulk open rewrite", () => {
  const open = () =>
    fetch("/api/packs/all/open-many", { method: "POST", body: JSON.stringify({ count: 4, maxChakra: 300 }) });
  it("feature's choice set: exact count, no chakra", async () => {
    const site = setup({});
    html.setAttribute(OPEN_COUNT_ATTR, "2");
    await open();
    expect(JSON.parse(String(site.mock.calls[0]?.[1]?.body))).toEqual({ count: 2, maxChakra: 0 });
    expect(site.mock.calls[0]?.[1]?.method).toBe("POST");
  });
  it("no choice set: the request goes through untouched", async () => {
    const site = setup({});
    await open();
    expect(JSON.parse(String(site.mock.calls[0]?.[1]?.body))).toEqual({ count: 4, maxChakra: 300 });
  });
  it("choice on, but the open request is not recognized: refused, nothing sent", async () => {
    const site = setup({});
    html.setAttribute(OPEN_COUNT_ATTR, "2");
    const refused = "Ouverture annulée par Kyara Extension : le site a changé, rien n'a été dépensé.";
    await expect(fetch("/api/packs/all/open", { method: "POST", body: "{}" })).rejects.toThrow(refused);
    await expect(fetch("/api/packs/all/open-bulk", { method: "POST", body: '{"count":4}' })).rejects.toThrow(
      refused,
    );
    await expect(fetch("/api/packs/all/open-many", { method: "POST", body: '{"amount":4}' })).rejects.toThrow(
      refused,
    );
    await expect(
      fetch(new Request("https://kyara.games/api/packs/all/open-many", { method: "POST", body: "{}" })),
    ).rejects.toThrow(refused);
    expect(site).not.toHaveBeenCalled();
  });
  it("choice on: other requests (pack list, other POSTs) go through", async () => {
    const site = setup({});
    html.setAttribute(OPEN_COUNT_ATTR, "2");
    await fetch("/api/packs");
    await fetch("/api/market/buy", { method: "POST", body: "{}" });
    expect(site).toHaveBeenCalledTimes(2);
  });
  it("a rejected request still rejects for the site", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    installFetchHook(window);
    await expect(fetch("/api/packs")).rejects.toThrow("offline");
  });
});
