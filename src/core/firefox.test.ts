import { describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { filterResponseData, pageFetch } from "./firefox";

describe("filterResponseData", () => {
  it("returns null when the Firefox API is missing", () => {
    expect(filterResponseData("1")).toBeNull();
  });

  it("returns the API's filter when it exists", () => {
    const filter = { write: vi.fn() };
    const api = vi.fn(() => filter);
    Object.assign(browser.webRequest, { filterResponseData: api });
    expect(filterResponseData("42")).toBe(filter);
    expect(api).toHaveBeenCalledWith("42");
    Reflect.deleteProperty(browser.webRequest, "filterResponseData");
  });
});

describe("pageFetch", () => {
  it("uses fetch outside Firefox", async () => {
    const fn = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fn);
    await pageFetch()("/x");
    expect(fn).toHaveBeenCalledWith("/x");
  });

  it("prefers content.fetch when it exists", async () => {
    const contentFetch = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("content", { fetch: contentFetch });
    await pageFetch()("/x");
    expect(contentFetch).toHaveBeenCalledWith("/x");
  });
});
