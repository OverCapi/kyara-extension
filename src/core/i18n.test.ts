import { describe, expect, it, vi } from "vitest";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { setLocale, t, tn } from "./i18n";

const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("catalogs", () => {
  it("en and fr have exactly the same keys", () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });
  it("each key has the same {params} in both languages, and no empty text", () => {
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      expect(params(fr[key]), key).toEqual(params(en[key]));
      expect(en[key].trim(), key).not.toBe("");
      expect(fr[key].trim(), key).not.toBe("");
    }
  });
  it("each plural has its _one and _other forms", () => {
    for (const key of Object.keys(en).filter((k) => k.endsWith("_one"))) {
      expect(en).toHaveProperty(`${key.slice(0, -4)}_other`);
    }
  });
});

describe("t", () => {
  it("returns the text in the chosen language", () => {
    setLocale("fr");
    expect(t("tooltip.unavailable")).toBe("indisponible");
    setLocale("en");
    expect(t("tooltip.unavailable")).toBe("unavailable");
  });
  it("replaces params; a missing param is left as is", () => {
    setLocale("fr");
    expect(t("gauge.threshold", { pct: 12 })).toBe("Gain min ≥ 12 %");
    expect(t("gauge.threshold")).toBe("Gain min ≥ {pct} %");
  });
});

describe("tn", () => {
  it("picks singular or plural", () => {
    setLocale("fr");
    expect(tn("tooltip.listing", 1)).toBe("1 annonce");
    expect(tn("tooltip.listing", 3)).toBe("3 annonces");
    setLocale("en");
    expect(tn("tooltip.listing", 1)).toBe("1 listing");
    expect(tn("tooltip.listing", 0)).toBe("0 listings");
  });
});

describe("browser language", () => {
  it("French is recognized, unknown language: English", async () => {
    for (const [lang, expected] of [
      ["fr-FR", "indisponible"],
      ["de-DE", "unavailable"],
      ["en-US", "unavailable"],
    ] as const) {
      Object.defineProperty(navigator, "language", { value: lang, configurable: true });
      vi.resetModules();
      const fresh = await import("./i18n");
      expect(fresh.t("tooltip.unavailable"), lang).toBe(expected);
    }
  });
});
