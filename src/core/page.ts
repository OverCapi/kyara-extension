// Page watching, shared by all the code: ONE single MutationObserver (+ storage +
// tab visibility), debounced. Also provides the helpers that clean everything up when
// the extension reloads (otherwise: "Extension context invalidated" errors).
import { safe, safeAsync } from "./errors";
import { onStorageChange } from "./storage";

/** Page context. WXT's `ContentScriptContext` satisfies it. */
export interface PageContext {
  readonly isValid: boolean;
  onInvalidated(cb: () => void): unknown;
}

export const DEBOUNCE_MS = 300;

export interface PageWatcher {
  /** Adds a callback called (after debounce) on every page change. */
  subscribe(cb: () => Promise<void> | void): void;
  /** Requests a new run (debounce included). */
  trigger(): void;
}

/** Adds a DOM listener, removed automatically when the context is invalidated. Errors are caught. */
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

/**
 * Runs `cb` when `key` is pressed (case-insensitive) with no Ctrl/Meta/Alt, outside text fields.
 * Removed automatically when the context is invalidated. Errors are caught.
 */
export function onShortcut(ctx: PageContext, key: string, cb: () => void): void {
  listen<KeyboardEvent>(ctx, document, "keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== key) return;
    const el = e.target instanceof HTMLElement ? e.target : null;
    if (el?.closest("input, textarea, select, [contenteditable]:not([contenteditable=false])")) return;
    cb();
  });
}

/** Appends `el` to <html>, outside the tree managed by the site. Removed when the context is invalidated. */
export function mountFloating(ctx: PageContext, el: HTMLElement): void {
  document.documentElement.append(el);
  ctx.onInvalidated(() => el.remove());
}

/** Starts watching: DOM, storage and visibility changes fire the callbacks, 300 ms after the last signal. */
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
