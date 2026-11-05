import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  fairKey,
  isFresh,
  onNoTintChange,
  onStorageChange,
  priceKey,
  readNoTint,
  readOwned,
  readPrices,
  writeEntries,
  writeNoTint,
} from "./storage";

beforeEach(() => fakeBrowser.reset());

describe("clés", () => {
  it("gardent le format de l'ancienne version", () => {
    expect(priceKey(7)).toBe("p:7");
    expect(fairKey(7)).toBe("f:7");
  });
});

describe("isFresh", () => {
  it("vrai sous le TTL, faux au-delà, faux si absent", () => {
    expect(isFresh({ t: 1000 }, 500, 1400)).toBe(true);
    expect(isFresh({ t: 1000 }, 500, 1600)).toBe(false);
    expect(isFresh(undefined, 500, 1000)).toBe(false);
  });
});

describe("readPrices", () => {
  it("lit fair-play et marché", async () => {
    await writeEntries({
      [fairKey(1)]: { v: 12, t: 5 },
      [priceKey(1)]: { m7: 1, m30: 2, s7: 3, last: 4, t: 5 },
    });
    const store = await readPrices([1, 2]);
    expect(store.fair[1]?.v).toBe(12);
    expect(store.market[1]?.m7).toBe(1);
    expect(store.fair[2]).toBeUndefined();
  });

  it("ignore les valeurs corrompues", async () => {
    await browser.storage.local.set({ "f:1": "n'importe quoi", "p:1": 42 });
    const store = await readPrices([1]);
    expect(store.fair[1]).toBeUndefined();
    expect(store.market[1]).toBeUndefined();
  });

  it("accepte une liste vide", async () => {
    expect(await readPrices([])).toEqual({ fair: {}, market: {} });
  });
});

describe("readOwned", () => {
  it("null si absent ou corrompu", async () => {
    expect(await readOwned()).toBeNull();
    await browser.storage.local.set({ owned: "x" });
    expect(await readOwned()).toBeNull();
    await browser.storage.local.set({ owned: [1] });
    expect(await readOwned()).toBeNull();
  });

  it("renvoie les cartes, y compris un objet vide", async () => {
    await writeEntries({ owned: { 10: 2 } });
    expect(await readOwned()).toEqual({ 10: 2 });
    await writeEntries({ owned: {} });
    expect(await readOwned()).toEqual({});
  });
});

describe("noTint", () => {
  it("faux par défaut, mémorisé ensuite", async () => {
    expect(await readNoTint()).toBe(false);
    await writeNoTint(true);
    expect(await readNoTint()).toBe(true);
  });
});

describe("écouteurs", () => {
  it("onStorageChange appelle puis se retire", async () => {
    const cb = vi.fn();
    const stop = onStorageChange(cb);
    await browser.storage.local.set({ a: 1 });
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
    await browser.storage.local.set({ a: 2 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("onNoTintChange ne réagit qu'à sa clé", async () => {
    const cb = vi.fn();
    const stop = onNoTintChange(cb);
    await browser.storage.local.set({ autre: 1 });
    expect(cb).not.toHaveBeenCalled();
    await writeNoTint(true);
    expect(cb).toHaveBeenLastCalledWith(true);
    await writeNoTint(false);
    expect(cb).toHaveBeenLastCalledWith(false);
    stop();
  });
});
