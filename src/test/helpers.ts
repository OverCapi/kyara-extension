import { vi } from "vitest";
// Outils de test partagés.
import type { PageContext } from "../core/page";
import type { Feature } from "../features/types";
import { readOffers } from "../kyara/dom";
import type { FilterPanel } from "../kyara/filter-panel";
import type { OffersSnapshot } from "../kyara/offers";

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
  const fn = vi.fn(async (..._args: unknown[]) => new Response(JSON.stringify(body), { status }));
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

/** Instantané d'offres prêt à l'emploi : rend les offres dans la page et fixe prix fair-play et collection. */
export function makeSnapshot(
  specs: OfferSpec[],
  opts: { fair?: Record<number, number>; owned?: Record<number, number> | null } = {},
): OffersSnapshot {
  renderOffers(specs);
  const fair = Object.fromEntries(Object.entries(opts.fair ?? {}).map(([id, v]) => [id, { v, t: 0 }]));
  return { offers: readOffers(), store: { fair, market: {} }, owned: opts.owned ?? null };
}

const startedPages: Array<ReturnType<typeof fakeCtx>> = [];

/** Invalide les contextes de toutes les features démarrées par un test (retire leurs écouteurs). */
export function stopAllFeatures(): void {
  for (const page of startedPages.splice(0)) page.invalidate();
}

/** Faux panneau de filtres : range les catégories directement dans la page (les tests les y retrouvent). */
export function fakePanel(): FilterPanel & { categories: Array<{ title: string; el: HTMLElement }> } {
  const categories: Array<{ title: string; el: HTMLElement }> = [];
  return {
    categories,
    attach() {},
    addCategory(title, el) {
      categories.push({ title, el });
      document.body.append(el);
    },
  };
}

/** Démarre une feature avec un faux contexte. `emit(snapshot)` simule une mise à jour de la page. */
export function startFeature(feature: Feature) {
  const page = fakeCtx();
  startedPages.push(page);
  const listeners: Array<(snapshot: OffersSnapshot) => void> = [];
  const filters = fakePanel();
  feature.setup({ page, filters, onOffers: (cb) => void listeners.push(cb) });
  return {
    page,
    filters,
    emit(snapshot: OffersSnapshot) {
      for (const listener of listeners) listener(snapshot);
    },
  };
}
