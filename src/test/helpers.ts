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

export interface OfferSpec {
  /** Id de la carte proposée (omis = offre sans carte proposée). */
  give?: number;
  wants?: number[];
  /** `box-shadow` inline de l'image de la carte proposée (couleur de rareté du site). */
  shadow?: string;
}

/** Ajoute à la page des offres avec la même structure que kyara.games. Renvoie les <li>. */
export function renderOffers(specs: OfferSpec[]): HTMLElement[] {
  const card = (id: number, shadow = "") =>
    `<a href="/wiki/${id}" title="Carte ${id}"><img style="box-shadow:${shadow}"></a>`;
  return specs.map((s, i) => {
    const li = document.createElement("li");
    li.id = `offre-${i + 1}`;
    li.innerHTML =
      `<div class="thumbs"><div class="give">${s.give ? card(s.give, s.shadow) : ""}</div>` +
      `<div class="want">${(s.wants ?? []).map((id) => card(id)).join("")}</div></div>`;
    document.body.append(li);
    return li;
  });
}
