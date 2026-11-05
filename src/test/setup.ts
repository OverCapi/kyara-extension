// Réglages communs à tous les tests (voir vitest.config.ts) :
//  - logs de dev coupés (les tests restent silencieux) ;
//  - un test échoue si le code émet console.error ou console.warn (règle "zéro erreur / zéro warning").
import { afterEach, beforeEach, expect, vi } from "vitest";

beforeEach(() => {
  vi.stubEnv("DEV", false);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  expect(console.error).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});
