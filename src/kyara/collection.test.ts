import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { readOwned, writeEntries } from "../core/storage";
import { mockFetch } from "../test/helpers";
import { createCollectionLoader } from "./collection";

beforeEach(() => fakeBrowser.reset());

describe("createCollectionLoader", () => {
  it("uses storage without a request when the collection is known", async () => {
    await writeEntries({ owned: { 1: 2 } });
    const fetchMock = mockFetch([]);
    expect(await createCollectionLoader().load()).toEqual({ 1: 2 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("catches up on the collection with a request, and stores it", async () => {
    const fetchMock = mockFetch([{ characterId: 3, qty: 1 }]);
    expect(await createCollectionLoader().load()).toEqual({ 3: 1 });
    expect(fetchMock).toHaveBeenCalledWith("/api/me/collection?lean=1", expect.anything());
    expect(await readOwned()).toEqual({ 3: 1 });
  });

  it("never asks twice per page, even on failure", async () => {
    const fetchMock = mockFetch({ error: "unauthorized" }, 401);
    const loader = createCollectionLoader();
    expect(await loader.load()).toBeNull();
    expect(await loader.load()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("unexpected response shape: null, nothing written", async () => {
    mockFetch({ nope: true });
    expect(await createCollectionLoader().load()).toBeNull();
    expect(await readOwned()).toBeNull();
  });
});
