// Settings shared by every test (see vitest.config.ts):
//  - dev logs off (tests stay silent);
//  - a test fails if the code emits console.error or console.warn ("zero error / zero warning" rule).
import { afterEach, beforeEach, expect, vi } from "vitest";
import { setLocale } from "../core/i18n";
import { stopAllFeatures } from "./helpers";

beforeEach(() => {
  setLocale("fr"); // tests check the French texts
  vi.stubEnv("DEV", false);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  stopAllFeatures();
  expect(console.error).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  // floating elements appended to <html> by the features (pill, tooltip)
  for (const el of document.documentElement.querySelectorAll(":scope > :not(head):not(body)")) el.remove();
  document.documentElement.classList.remove("kv-no-tint");
  for (const name of document.documentElement.getAttributeNames()) {
    if (name.startsWith("data-kv-")) document.documentElement.removeAttribute(name); // settings set by the features
  }
});
