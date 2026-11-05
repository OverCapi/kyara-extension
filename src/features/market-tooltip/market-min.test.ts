import { describe, expect, it, vi } from "vitest";
import { mockFetch } from "../../test/helpers";
import { createMarketMin, TIP_TTL } from "./market-min";

const listing = { items: [{ price: 7 }], total: 3 };

describe("createMarketMin", () => {
  it("demande l'annonce la moins chère et renvoie prix et nombre", async () => {
    const fetchMock = mockFetch(listing);
    expect(await createMarketMin()(5)).toEqual({ min: 7, count: 3 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/market/listings?characterId=5&type=fixed&sort=price_asc&pageSize=1",
    );
  });

  it("garde le résultat 2 min, puis redemande", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const fetchMock = mockFetch(listing);
    const marketMin = createMarketMin();
    await marketMin(5);
    vi.advanceTimersByTime(TIP_TTL - 1000);
    await marketMin(5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    await marketMin(5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("échec HTTP ou réponse inattendue : null, non mis en cache", async () => {
    const fetchMock = mockFetch({}, 500);
    const marketMin = createMarketMin();
    expect(await marketMin(5)).toBeNull();
    expect(await marketMin(5)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    mockFetch("pas un objet");
    expect(await marketMin(6)).toBeNull();
  });
});
