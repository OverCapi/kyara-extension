import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { fakeCtx } from "../test/helpers";
import { createPageWatcher, DEBOUNCE_MS, listen, mountFloating } from "./page";

beforeEach(() => {
  fakeBrowser.reset();
  vi.useFakeTimers();
});

const settle = () => vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);

describe("createPageWatcher", () => {
  it("déclenche après un changement du DOM (avec debounce)", async () => {
    const cb = vi.fn();
    const watcher = createPageWatcher(fakeCtx());
    watcher.subscribe(cb);
    document.body.append(document.createElement("div"));
    document.body.append(document.createElement("div"));
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("déclenche sur changement de stockage et de visibilité", async () => {
    const cb = vi.fn();
    createPageWatcher(fakeCtx()).subscribe(cb);
    await browser.storage.local.set({ a: 1 });
    await settle();
    document.dispatchEvent(new Event("visibilitychange"));
    await settle();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("trigger() relance manuellement", async () => {
    const cb = vi.fn();
    const watcher = createPageWatcher(fakeCtx());
    watcher.subscribe(cb);
    watcher.trigger();
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("un callback qui plante n'empêche pas les suivants", async () => {
    const next = vi.fn();
    const watcher = createPageWatcher(fakeCtx());
    watcher.subscribe(() => Promise.reject(new Error("x")));
    watcher.subscribe(next);
    watcher.trigger();
    await settle();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("s'arrête quand le contexte est invalidé", async () => {
    const cb = vi.fn();
    const ctx = fakeCtx();
    const watcher = createPageWatcher(ctx);
    watcher.subscribe(cb);
    watcher.trigger();
    ctx.invalidate();
    watcher.trigger();
    document.body.append(document.createElement("div"));
    await settle();
    expect(cb).not.toHaveBeenCalled();
  });
});

describe("listen", () => {
  it("appelle le handler puis se retire à l'invalidation", () => {
    const ctx = fakeCtx();
    const handler = vi.fn();
    listen(ctx, document, "ping", handler);
    document.dispatchEvent(new Event("ping"));
    ctx.invalidate();
    document.dispatchEvent(new Event("ping"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("attrape les erreurs du handler", () => {
    listen(fakeCtx(), document, "ping", () => {
      throw new Error("x");
    });
    expect(() => document.dispatchEvent(new Event("ping"))).not.toThrow();
  });
});

describe("mountFloating", () => {
  it("ajoute à <html> puis retire à l'invalidation", () => {
    const ctx = fakeCtx();
    const el = document.createElement("div");
    mountFloating(ctx, el);
    expect(el.parentElement).toBe(document.documentElement);
    ctx.invalidate();
    expect(el.isConnected).toBe(false);
  });
});
