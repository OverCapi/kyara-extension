import { describe, expect, it, vi } from "vitest";
import { safe, safeAsync } from "./errors";

describe("safe", () => {
  it("forwards the arguments", () => {
    const fn = vi.fn();
    safe("t", fn)(1, "a");
    expect(fn).toHaveBeenCalledWith(1, "a");
  });

  it("catches a synchronous exception", () => {
    expect(() =>
      safe("t", () => {
        throw new Error("x");
      })(),
    ).not.toThrow();
  });
});

describe("safeAsync", () => {
  it("awaits the function", async () => {
    let done = false;
    await safeAsync("t", async () => {
      await Promise.resolve();
      done = true;
    })();
    expect(done).toBe(true);
  });

  it("never rejects (async rejection)", async () => {
    await expect(safeAsync("t", () => Promise.reject(new Error("x")))()).resolves.toBeUndefined();
  });

  it("never rejects (synchronous exception)", async () => {
    const fn = safeAsync("t", () => {
      throw new Error("x");
    });
    await expect(fn()).resolves.toBeUndefined();
  });
});
