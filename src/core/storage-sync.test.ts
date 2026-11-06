import { describe, expect, it, vi } from "vitest";
import { createStorageSync } from "./storage-sync";

describe("createStorageSync", () => {
  it("writes the value", async () => {
    const write = vi.fn(async (_v: number) => {});
    await createStorageSync(write, vi.fn()).save(3);
    expect(write).toHaveBeenCalledWith(3);
  });
  it("the echo of our own write is not reapplied, even late and in order", async () => {
    const apply = vi.fn();
    const sync = createStorageSync(async (_v: number) => {}, apply);
    await sync.save(1);
    await sync.save(2);
    sync.onStored(1);
    sync.onStored(2);
    expect(apply).not.toHaveBeenCalled();
  });
  it("a value from another tab is applied", () => {
    const apply = vi.fn();
    createStorageSync(async (_v: number) => {}, apply).onStored(9);
    expect(apply).toHaveBeenCalledWith(9);
  });
  it("failed write: caught, no echo expected (the same value from elsewhere is applied)", async () => {
    const apply = vi.fn();
    const sync = createStorageSync(async (_v: number) => Promise.reject(new Error("invalidated")), apply);
    await expect(sync.save(5)).resolves.toBeUndefined();
    sync.onStored(5);
    expect(apply).toHaveBeenCalledWith(5);
  });
});
