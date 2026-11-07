import { describe, expect, it } from "vitest";
import { tintColor } from "./tint";

describe("tintColor", () => {
  it("null: transparent", () => {
    expect(tintColor(null)).toBe("transparent");
  });
  it("0: blue at opacity 0", () => {
    expect(tintColor(0)).toBe("rgba(90, 190, 255, 0.00)");
  });
  it("+100 %: full blue; beyond: clamped", () => {
    expect(tintColor(1)).toBe("rgba(90, 190, 255, 0.45)");
    expect(tintColor(5)).toBe("rgba(90, 190, 255, 0.45)");
  });
  it("-100 %: full red; below: clamped", () => {
    expect(tintColor(-1)).toBe("rgba(230, 60, 60, 0.45)");
    expect(tintColor(-3)).toBe("rgba(230, 60, 60, 0.45)");
  });
  it("in between: proportional opacity", () => {
    expect(tintColor(0.5)).toBe("rgba(90, 190, 255, 0.23)");
    expect(tintColor(-0.5)).toBe("rgba(230, 60, 60, 0.23)");
  });
  it("fullPct 100 is the default scale", () => {
    for (const r of [-2, -0.5, 0, 0.3, 1, 4]) expect(tintColor(r, 100)).toBe(tintColor(r));
  });
  it("lower threshold: full intensity sooner", () => {
    expect(tintColor(0.5, 50)).toBe("rgba(90, 190, 255, 0.45)");
    expect(tintColor(-0.25, 50)).toBe("rgba(230, 60, 60, 0.23)");
    expect(tintColor(-0.5, 50)).toBe("rgba(230, 60, 60, 0.45)");
  });
  it("higher threshold: gentler tint", () => {
    expect(tintColor(1, 200)).toBe("rgba(90, 190, 255, 0.23)");
    expect(tintColor(2, 200)).toBe("rgba(90, 190, 255, 0.45)");
  });
  it("threshold 0 or negative: any gain is full, zero stays neutral", () => {
    expect(tintColor(0.01, 0)).toBe("rgba(90, 190, 255, 0.45)");
    expect(tintColor(-0.01, 0)).toBe("rgba(230, 60, 60, 0.45)");
    expect(tintColor(0, 0)).toBe("rgba(90, 190, 255, 0.00)");
    expect(tintColor(0.01, -10)).toBe("rgba(90, 190, 255, 0.45)");
  });
  it("null stays transparent whatever the threshold", () => {
    expect(tintColor(null, 0)).toBe("transparent");
  });
});
