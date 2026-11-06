import { describe, expect, it, vi } from "vitest";
import { createLogger } from "./log";

describe("createLogger", () => {
  it("writes with the prefix in dev", () => {
    vi.stubEnv("DEV", true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    createLogger("mod").debug("a", 1);
    expect(spy).toHaveBeenCalledWith("[kyara-extension:mod]", "a", 1);
  });

  it("log.error writes to console.error in dev", () => {
    vi.stubEnv("DEV", true);
    createLogger("mod").error("boom");
    expect(console.error).toHaveBeenCalledWith("[kyara-extension:mod]", "boom");
    vi.mocked(console.error).mockClear(); // expected here: the global guard must not fail
  });

  it("stays silent outside dev", () => {
    vi.stubEnv("DEV", false);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    createLogger("mod").debug("a");
    createLogger("mod").error("b");
    expect(spy).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
