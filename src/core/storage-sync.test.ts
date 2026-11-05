import { describe, expect, it, vi } from "vitest";
import { createStorageSync } from "./storage-sync";

describe("createStorageSync", () => {
  it("écrit la valeur", async () => {
    const write = vi.fn(async (_v: number) => {});
    await createStorageSync(write, vi.fn()).save(3);
    expect(write).toHaveBeenCalledWith(3);
  });
  it("l'écho de notre écriture n'est pas réappliqué, même en retard et dans l'ordre", async () => {
    const apply = vi.fn();
    const sync = createStorageSync(async (_v: number) => {}, apply);
    await sync.save(1);
    await sync.save(2);
    sync.onStored(1);
    sync.onStored(2);
    expect(apply).not.toHaveBeenCalled();
  });
  it("une valeur venue d'un autre onglet est appliquée", () => {
    const apply = vi.fn();
    createStorageSync(async (_v: number) => {}, apply).onStored(9);
    expect(apply).toHaveBeenCalledWith(9);
  });
  it("écriture ratée : attrapée, aucun écho attendu (la même valeur d'ailleurs est appliquée)", async () => {
    const apply = vi.fn();
    const sync = createStorageSync(async (_v: number) => Promise.reject(new Error("invalidated")), apply);
    await expect(sync.save(5)).resolves.toBeUndefined();
    sync.onStored(5);
    expect(apply).toHaveBeenCalledWith(5);
  });
});
