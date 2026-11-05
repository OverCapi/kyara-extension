import { describe, expect, it, vi } from "vitest";
import { safe, safeAsync } from "./errors";

describe("safe", () => {
  it("transmet les arguments", () => {
    const fn = vi.fn();
    safe("t", fn)(1, "a");
    expect(fn).toHaveBeenCalledWith(1, "a");
  });

  it("attrape une exception synchrone", () => {
    expect(() =>
      safe("t", () => {
        throw new Error("x");
      })(),
    ).not.toThrow();
  });
});

describe("safeAsync", () => {
  it("attend la fonction", async () => {
    let done = false;
    await safeAsync("t", async () => {
      await Promise.resolve();
      done = true;
    })();
    expect(done).toBe(true);
  });

  it("ne rejette jamais (rejet async)", async () => {
    await expect(safeAsync("t", () => Promise.reject(new Error("x")))()).resolves.toBeUndefined();
  });

  it("ne rejette jamais (exception synchrone)", async () => {
    const fn = safeAsync("t", () => {
      throw new Error("x");
    });
    await expect(fn()).resolves.toBeUndefined();
  });
});
