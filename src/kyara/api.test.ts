import { describe, expect, it, vi } from "vitest";
import { mockFetch } from "../test/helpers";
import { authHeaders, kyaraFetch } from "./api";

describe("authHeaders", () => {
  it("lit jeton et device id dans le localStorage", () => {
    localStorage.setItem("kyara_token", "tok");
    localStorage.setItem("kyara_device", "dev");
    expect(authHeaders()).toEqual({ authorization: "Bearer tok", "x-device-id": "dev" });
    localStorage.clear();
  });
  it("vide sans jeton", () => {
    expect(authHeaders()).toEqual({});
  });
  it("vide si le localStorage est inaccessible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(authHeaders()).toEqual({});
  });
});

describe("kyaraFetch", () => {
  it("préfixe /api, envoie les en-têtes et renvoie le JSON", async () => {
    localStorage.setItem("kyara_token", "tok");
    const fetchMock = mockFetch({ a: 1 });
    expect(await kyaraFetch("/x?y=1")).toEqual({ ok: true, status: 200, data: { a: 1 } });
    expect(fetchMock).toHaveBeenCalledWith("/api/x?y=1", { headers: { authorization: "Bearer tok" } });
    localStorage.clear();
  });
  it.each([401, 429, 500])("HTTP %i : ok=false, sans exception", async (status) => {
    mockFetch({ error: "x" }, status);
    expect(await kyaraFetch("/x")).toEqual({ ok: false, status, data: null });
  });
  it("réseau coupé : status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await kyaraFetch("/x")).toEqual({ ok: false, status: 0, data: null });
  });
  it("JSON invalide : status 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("pas du json")),
    );
    expect(await kyaraFetch("/x")).toEqual({ ok: false, status: 0, data: null });
  });
});
