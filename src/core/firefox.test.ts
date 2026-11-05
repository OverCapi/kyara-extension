import { describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { filterResponseData, pageFetch } from "./firefox";

describe("filterResponseData", () => {
  it("renvoie null si l'API Firefox est absente", () => {
    expect(filterResponseData("1")).toBeNull();
  });

  it("renvoie le filtre de l'API quand elle existe", () => {
    const filter = { write: vi.fn() };
    const api = vi.fn(() => filter);
    Object.assign(browser.webRequest, { filterResponseData: api });
    expect(filterResponseData("42")).toBe(filter);
    expect(api).toHaveBeenCalledWith("42");
    Reflect.deleteProperty(browser.webRequest, "filterResponseData");
  });
});

describe("pageFetch", () => {
  it("utilise fetch hors Firefox", async () => {
    const fn = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fn);
    await pageFetch()("/x");
    expect(fn).toHaveBeenCalledWith("/x");
  });

  it("préfère content.fetch quand il existe", async () => {
    const contentFetch = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("content", { fetch: contentFetch });
    await pageFetch()("/x");
    expect(contentFetch).toHaveBeenCalledWith("/x");
  });
});
