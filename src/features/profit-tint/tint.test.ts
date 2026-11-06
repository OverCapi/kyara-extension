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
});
