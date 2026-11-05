import { describe, expect, it } from "vitest";
import type { GainMode } from "../../core/storage";
import { passesGainFilter } from "./filter";

const f = (mode: GainMode, pct = 0) => ({ mode, pct });

describe("passesGainFilter", () => {
  it("off : tout passe, même gain inconnu ou négatif", () => {
    expect(passesGainFilter(null, f("off", 50))).toBe(true);
    expect(passesGainFilter(-0.5, f("off"))).toBe(true);
  });
  it("neutral : neutre ou rentable", () => {
    expect(passesGainFilter(0, f("neutral"))).toBe(true);
    expect(passesGainFilter(0.1, f("neutral"))).toBe(true);
    expect(passesGainFilter(-0.01, f("neutral"))).toBe(false);
  });
  it("positive : rentable seulement, le neutre est masqué", () => {
    expect(passesGainFilter(0, f("positive"))).toBe(false);
    expect(passesGainFilter(0.01, f("positive"))).toBe(true);
    expect(passesGainFilter(-0.2, f("positive"))).toBe(false);
  });
  it("gain inconnu : masqué dès que le filtre est actif", () => {
    expect(passesGainFilter(null, f("neutral"))).toBe(false);
    expect(passesGainFilter(null, f("positive"))).toBe(false);
  });
  it("seuil : bord inclus, sans erreur d'arrondi", () => {
    expect(passesGainFilter(0.25, f("positive", 25))).toBe(true);
    expect(passesGainFilter(0.29, f("neutral", 29))).toBe(true);
    expect(passesGainFilter(0.2, f("neutral", 25))).toBe(false);
  });
});
