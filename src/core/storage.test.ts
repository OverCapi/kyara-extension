import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  DEFAULT_TINT_FULL,
  fairKey,
  isFresh,
  onNoTintChange,
  onStorageChange,
  onTintFullChange,
  priceKey,
  readNoTint,
  readPrices,
  readTintFull,
  writeEntries,
  writeNoTint,
  writeTintFull,
} from "./storage";

beforeEach(() => fakeBrowser.reset());

describe("keys", () => {
  it("keep the old version's format", () => {
    expect(priceKey(7)).toBe("p:7");
    expect(fairKey(7)).toBe("f:7");
  });
});

describe("isFresh", () => {
  it("true under the TTL, false beyond, false if missing", () => {
    expect(isFresh({ t: 1000 }, 500, 1400)).toBe(true);
    expect(isFresh({ t: 1000 }, 500, 1600)).toBe(false);
    expect(isFresh(undefined, 500, 1000)).toBe(false);
  });
});

describe("readPrices", () => {
  it("reads fair-play and market", async () => {
    await writeEntries({
      [fairKey(1)]: { v: 12, t: 5 },
      [priceKey(1)]: { m7: 1, m30: 2, s7: 3, last: 4, t: 5 },
    });
    const store = await readPrices([1, 2]);
    expect(store.fair[1]?.v).toBe(12);
    expect(store.market[1]?.m7).toBe(1);
    expect(store.fair[2]).toBeUndefined();
  });

  it("ignores corrupted values", async () => {
    await browser.storage.local.set({ "f:1": "garbage", "p:1": 42 });
    const store = await readPrices([1]);
    expect(store.fair[1]).toBeUndefined();
    expect(store.market[1]).toBeUndefined();
  });

  it("accepts an empty list", async () => {
    expect(await readPrices([])).toEqual({ fair: {}, market: {} });
  });
});

describe("noTint", () => {
  it("false by default, stored afterwards", async () => {
    expect(await readNoTint()).toBe(false);
    await writeNoTint(true);
    expect(await readNoTint()).toBe(true);
  });
});

describe("listeners", () => {
  it("onStorageChange calls, then removes itself", async () => {
    const cb = vi.fn();
    const stop = onStorageChange(cb);
    await browser.storage.local.set({ a: 1 });
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
    await browser.storage.local.set({ a: 2 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("onNoTintChange only reacts to its own key", async () => {
    const cb = vi.fn();
    const stop = onNoTintChange(cb);
    await browser.storage.local.set({ other: 1 });
    expect(cb).not.toHaveBeenCalled();
    await writeNoTint(true);
    expect(cb).toHaveBeenLastCalledWith(true);
    await writeNoTint(false);
    expect(cb).toHaveBeenLastCalledWith(false);
    stop();
  });
});

describe("tint scale", () => {
  it("default 100, stored value read back", async () => {
    expect(await readTintFull()).toBe(DEFAULT_TINT_FULL);
    await writeTintFull(40);
    expect(await readTintFull()).toBe(40);
  });
  it("corrupted or non-positive value: default", async () => {
    for (const bad of ["x", 0, -5, Number.NaN, null]) {
      await browser.storage.local.set({ tintFull: bad });
      expect(await readTintFull()).toBe(DEFAULT_TINT_FULL);
    }
  });
  it("onTintFullChange follows its key only, then stops", async () => {
    const cb = vi.fn();
    const stop = onTintFullChange(cb);
    await browser.storage.local.set({ other: 1 });
    expect(cb).not.toHaveBeenCalled();
    await writeTintFull(25);
    expect(cb).toHaveBeenLastCalledWith(25);
    stop();
    await writeTintFull(30);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
