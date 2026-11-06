import { describe, expect, it } from "vitest";
import type { GainMode } from "../../core/storage";
import { passesGainFilter } from "./filter";

const f = (mode: GainMode, pct = 0) => ({ mode, pct });

describe("passesGainFilter", () => {
  it("off: everything passes, even unknown or negative gain", () => {
    expect(passesGainFilter(null, f("off", 50))).toBe(true);
    expect(passesGainFilter(-0.5, f("off"))).toBe(true);
  });
  it("neutral: neutral or profitable", () => {
    expect(passesGainFilter(0, f("neutral"))).toBe(true);
    expect(passesGainFilter(0.1, f("neutral"))).toBe(true);
    expect(passesGainFilter(-0.01, f("neutral"))).toBe(false);
  });
  it("positive: profitable only, neutral is hidden", () => {
    expect(passesGainFilter(0, f("positive"))).toBe(false);
    expect(passesGainFilter(0.01, f("positive"))).toBe(true);
    expect(passesGainFilter(-0.2, f("positive"))).toBe(false);
  });
  it("unknown gain: hidden as soon as the filter is on", () => {
    expect(passesGainFilter(null, f("neutral"))).toBe(false);
    expect(passesGainFilter(null, f("positive"))).toBe(false);
  });
  it("threshold: edge included, no rounding error", () => {
    expect(passesGainFilter(0.25, f("positive", 25))).toBe(true);
    expect(passesGainFilter(0.29, f("neutral", 29))).toBe(true);
    expect(passesGainFilter(0.2, f("neutral", 25))).toBe(false);
  });
});
