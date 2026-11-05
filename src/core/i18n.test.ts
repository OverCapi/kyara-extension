import { describe, expect, it, vi } from "vitest";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { setLocale, t, tn } from "./i18n";

const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("catalogues", () => {
  it("en et fr ont exactement les mêmes clés", () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });
  it("chaque clé a les mêmes {paramètres} dans les deux langues, et aucun texte vide", () => {
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      expect(params(fr[key]), key).toEqual(params(en[key]));
      expect(en[key].trim(), key).not.toBe("");
      expect(fr[key].trim(), key).not.toBe("");
    }
  });
  it("chaque pluriel a ses formes _one et _other", () => {
    for (const key of Object.keys(en).filter((k) => k.endsWith("_one"))) {
      expect(en).toHaveProperty(`${key.slice(0, -4)}_other`);
    }
  });
});

describe("t", () => {
  it("renvoie le texte dans la langue choisie", () => {
    setLocale("fr");
    expect(t("tooltip.unavailable")).toBe("indisponible");
    setLocale("en");
    expect(t("tooltip.unavailable")).toBe("unavailable");
  });
  it("remplace les paramètres ; un paramètre manquant reste tel quel", () => {
    setLocale("fr");
    expect(t("gauge.threshold", { pct: 12 })).toBe("Gain min ≥ 12 %");
    expect(t("gauge.threshold")).toBe("Gain min ≥ {pct} %");
  });
});

describe("tn", () => {
  it("choisit singulier ou pluriel", () => {
    setLocale("fr");
    expect(tn("tooltip.listing", 1)).toBe("1 annonce");
    expect(tn("tooltip.listing", 3)).toBe("3 annonces");
    setLocale("en");
    expect(tn("tooltip.listing", 1)).toBe("1 listing");
    expect(tn("tooltip.listing", 0)).toBe("0 listings");
  });
});

describe("langue du navigateur", () => {
  it("français reconnu, langue inconnue : anglais", async () => {
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
