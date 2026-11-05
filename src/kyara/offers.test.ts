import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { writeEntries } from "../core/storage";
import { renderOffers } from "../test/helpers";
import { buildSnapshot } from "./offers";

beforeEach(() => fakeBrowser.reset());

describe("buildSnapshot", () => {
  it("sans offre : instantané vide, collection non chargée", async () => {
    const load = vi.fn();
    const snap = await buildSnapshot({ load });
    expect(snap.offers).toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });

  it("réunit offres, prix connus et cartes possédées", async () => {
    renderOffers([{ give: 1, wants: [2] }]);
    await writeEntries({ "f:1": { v: 9, t: 0 }, "f:2": { v: 3, t: 0 } });
    const snap = await buildSnapshot({ load: async () => ({ 2: 1 }) });
    expect(snap.offers).toHaveLength(1);
    expect(snap.owned).toEqual({ 2: 1 });
    expect(snap.store.fair[1]?.v).toBe(9);
    expect(snap.store.fair[2]?.v).toBe(3);
  });

  it("collection inconnue : owned null", async () => {
    renderOffers([{ give: 1 }]);
    expect((await buildSnapshot({ load: async () => null })).owned).toBeNull();
  });
});
