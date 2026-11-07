import { describe, expect, it } from "vitest";
import { createSlider } from "./slider";

describe("createSlider", () => {
  const make = () => createSlider({ ariaLabel: "Label", min: 10, max: 110, step: 5 });

  it("builds a range with the given bounds and label", () => {
    const { root, range } = make();
    expect([range.min, range.max, range.step]).toEqual(["10", "110", "5"]);
    expect(range.getAttribute("aria-label")).toBe("Label");
    expect(root.className).toBe("kv-level");
  });
  it("show: sets value, text and fill relative to the bounds", () => {
    const { root, range, show } = make();
    show(60, "Sixty");
    expect(range.value).toBe("60");
    expect(root.querySelector("span")?.textContent).toBe("Sixty");
    expect(root.style.getPropertyValue("--kv-fill")).toBe("50%");
    show(10, "Min");
    expect(root.style.getPropertyValue("--kv-fill")).toBe("0%");
  });
});
