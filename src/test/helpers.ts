import { vi } from "vitest";
// Outils de test partagés.
import type { PageContext } from "../core/page";

/** Faux contexte de page : `invalidate()` simule le rechargement de l'extension. */
export function fakeCtx(): PageContext & { invalidate(): void } {
  const callbacks: Array<() => void> = [];
  const ctx = {
    isValid: true,
    onInvalidated(cb: () => void) {
      callbacks.push(cb);
    },
    invalidate() {
      ctx.isValid = false;
      for (const cb of callbacks) cb();
    },
  };
  return ctx;
}

/** Remplace `fetch` par un faux qui renvoie `body` en JSON avec ce statut. */
export function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}
