// Surveillance de la page, partagée par tout le code : UN seul MutationObserver (+ stockage +
// visibilité de l'onglet), avec debounce. Fournit aussi les helpers qui nettoient tout quand
// l'extension est rechargée (sinon : erreurs "Extension context invalidated").
import { safe, safeAsync } from "./errors";
import { onStorageChange } from "./storage";

/** Contexte de la page. Le `ContentScriptContext` de WXT le satisfait. */
export interface PageContext {
  readonly isValid: boolean;
  onInvalidated(cb: () => void): unknown;
}

export const DEBOUNCE_MS = 300;

export interface PageWatcher {
  /** Ajoute un callback appelé (après debounce) à chaque changement de la page. */
  subscribe(cb: () => Promise<void> | void): void;
  /** Demande un nouveau passage (debounce inclus). */
  trigger(): void;
}

/** Ajoute un écouteur DOM retiré automatiquement à l'invalidation du contexte. Erreurs attrapées. */
export function listen<E extends Event>(
  ctx: PageContext,
  target: EventTarget,
  type: string,
  handler: (event: E) => void,
  options?: AddEventListenerOptions,
): void {
  const wrapped = safe(`listen:${type}`, handler as (event: Event) => void);
  target.addEventListener(type, wrapped, options);
  ctx.onInvalidated(() => target.removeEventListener(type, wrapped, options));
}

/** Ajoute `el` à <html>, hors de l'arbre géré par le site. Retiré à l'invalidation du contexte. */
export function mountFloating(ctx: PageContext, el: HTMLElement): void {
  document.documentElement.append(el);
  ctx.onInvalidated(() => el.remove());
}

/** Démarre la surveillance : DOM, stockage et visibilité déclenchent les callbacks, 300 ms après le dernier signal. */
export function createPageWatcher(ctx: PageContext): PageWatcher {
  const callbacks: Array<() => Promise<void> | void> = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = safeAsync("page-watcher", async () => {
    if (!ctx.isValid) return;
    for (const cb of callbacks) await safeAsync("page-watcher:callback", cb)();
  });
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), DEBOUNCE_MS);
  };

  const observer = new MutationObserver(safe("page-watcher:mutation", trigger));
  observer.observe(document.body ?? document.documentElement, { childList: true, subtree: true });
  const stopStorage = onStorageChange(safe("page-watcher:storage", trigger));
  listen(ctx, document, "visibilitychange", trigger);
  ctx.onInvalidated(() => {
    clearTimeout(timer);
    observer.disconnect();
    stopStorage();
  });
  return { subscribe: (cb) => void callbacks.push(cb), trigger };
}
