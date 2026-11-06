import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { writeEntries } from "../core/storage";
import { renderOffers } from "../test/helpers";
import { buildSnapshot } from "./offers";

beforeEach(() => fakeBrowser.reset());

describe("buildSnapshot", () => {
  it("no offer: empty snapshot", async () => {
    const snap = await buildSnapshot();
    expect(snap.offers).toEqual([]);
  });

  it("gathers offers and known prices", async () => {
    renderOffers([{ give: 1, wants: [2] }]);
    await writeEntries({ "f:1": { v: 9, t: 0 }, "f:2": { v: 3, t: 0 } });
    const snap = await buildSnapshot();
    expect(snap.offers).toHaveLength(1);
    expect(snap.store.fair[1]?.v).toBe(9);
    expect(snap.store.fair[2]?.v).toBe(3);
  });
});
