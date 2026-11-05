import { describe, expect, it, vi } from "vitest";
import { createLogger } from "./log";

describe("createLogger", () => {
  it("écrit avec le préfixe en dev", () => {
    vi.stubEnv("DEV", true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    createLogger("mod").debug("a", 1);
    expect(spy).toHaveBeenCalledWith("[kyara-extension:mod]", "a", 1);
  });

  it("log.error écrit sur console.error en dev", () => {
    vi.stubEnv("DEV", true);
    createLogger("mod").error("boom");
    expect(console.error).toHaveBeenCalledWith("[kyara-extension:mod]", "boom");
    vi.mocked(console.error).mockClear(); // attendu ici : on ne veut pas que le garde-fou global échoue
  });

  it("reste muet hors dev", () => {
    vi.stubEnv("DEV", false);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    createLogger("mod").debug("a");
    createLogger("mod").error("b");
    expect(spy).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
