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
  it("fires after a DOM change (debounced)", async () => {
    const cb = vi.fn();
    const watcher = createPageWatcher(fakeCtx());
    watcher.subscribe(cb);
    document.body.append(document.createElement("div"));
    document.body.append(document.createElement("div"));
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("fires on storage and visibility changes", async () => {
    const cb = vi.fn();
    createPageWatcher(fakeCtx()).subscribe(cb);
    await browser.storage.local.set({ a: 1 });
    await settle();
    document.dispatchEvent(new Event("visibilitychange"));
    await settle();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("trigger() reruns manually", async () => {
    const cb = vi.fn();
    const watcher = createPageWatcher(fakeCtx());
    watcher.subscribe(cb);
    watcher.trigger();
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("a crashing callback does not block the next ones", async () => {
    const next = vi.fn();
    const watcher = createPageWatcher(fakeCtx());
    watcher.subscribe(() => Promise.reject(new Error("x")));
    watcher.subscribe(next);
    watcher.trigger();
    await settle();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("stops when the context is invalidated", async () => {
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
  it("calls the handler, then removes itself on invalidation", () => {
    const ctx = fakeCtx();
    const handler = vi.fn();
    listen(ctx, document, "ping", handler);
    document.dispatchEvent(new Event("ping"));
    ctx.invalidate();
    document.dispatchEvent(new Event("ping"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("catches handler errors", () => {
    listen(fakeCtx(), document, "ping", () => {
      throw new Error("x");
    });
    expect(() => document.dispatchEvent(new Event("ping"))).not.toThrow();
  });
});

describe("mountFloating", () => {
  it("appends to <html>, then removes on invalidation", () => {
    const ctx = fakeCtx();
    const el = document.createElement("div");
    mountFloating(ctx, el);
    expect(el.parentElement).toBe(document.documentElement);
    ctx.invalidate();
    expect(el.isConnected).toBe(false);
  });
});
