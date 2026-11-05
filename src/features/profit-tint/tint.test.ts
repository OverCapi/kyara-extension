import { describe, expect, it } from "vitest";
import { tintColor } from "./tint";

describe("tintColor", () => {
  it("null : transparent", () => {
    expect(tintColor(null)).toBe("transparent");
  });
  it("0 : bleu à opacité 0", () => {
    expect(tintColor(0)).toBe("rgba(90, 190, 255, 0.00)");
  });
  it("+100 % : bleu plein ; au-delà : borné", () => {
    expect(tintColor(1)).toBe("rgba(90, 190, 255, 0.45)");
    expect(tintColor(5)).toBe("rgba(90, 190, 255, 0.45)");
  });
  it("-100 % : rouge plein ; en deçà : borné", () => {
    expect(tintColor(-1)).toBe("rgba(230, 60, 60, 0.45)");
    expect(tintColor(-3)).toBe("rgba(230, 60, 60, 0.45)");
  });
  it("intermédiaire : opacité proportionnelle", () => {
    expect(tintColor(0.5)).toBe("rgba(90, 190, 255, 0.23)");
    expect(tintColor(-0.5)).toBe("rgba(230, 60, 60, 0.23)");
  });
});
