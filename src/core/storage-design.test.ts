import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { onProfileDesignChange, readProfileDesign, writeProfileDesign } from "./storage-design";

beforeEach(() => fakeBrowser.reset());

describe("profile design", () => {
  it("reads what was written, undefined if never chosen", async () => {
    expect(await readProfileDesign()).toBeUndefined();
    await writeProfileDesign("fan");
    expect(await readProfileDesign()).toBe("fan");
  });
  it("reports changes until stopped", async () => {
    const cb = vi.fn();
    const stop = onProfileDesignChange(cb);
    await writeProfileDesign("prism");
    expect(cb).toHaveBeenCalledWith("prism");
    stop();
    await writeProfileDesign("fan");
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
