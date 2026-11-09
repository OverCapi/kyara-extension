// "×N" option in the site's booster count picker (/ouvrir/<pack>), N = your free boosters for that pack.
// The site only offers ×1 / ×5 / ×10 capped by what you can afford (free + chakra): with 2 free boosters
// and some chakra it shows ×1 ×4, and ×4 spends chakra. Choosing ×N selects a bulk option of the site (so
// its opening animation is kept) and sets OPEN_COUNT_ATTR: the page hook (kyara/fetch-hook.ts) then
// rewrites the open request to exactly N boosters, with no chakra. The site's chakra warning (priced on its
// bulk option) is turned off meanwhile (kyara/paid-warning.ts).
// Deliberate EXCEPTION to the "no node in the site's DOM" rule: the option sits in the site's picker,
// reinserted on every render. Picking any site option, or the option no longer making sense, cancels it.
// Safety: the option only shows once the page hook is installed (HOOK_ATTR); without it nothing would
// rewrite the request and the site's bulk option would spend chakra.
// Network: refreshes the free boosters from the API on each opening page (kyara/pack-data.ts).
// Uses `onOffers` only as a render tick (no offers on this page).
import { safe, safeAsync } from "../../core/errors";
import { tn } from "../../core/i18n";
import { listen } from "../../core/page";
import { refreshPackData } from "../../kyara/pack-data";
import { HOOK_ATTR, OPEN_COUNT_ATTR, openPagePack, readFreePacks } from "../../kyara/packs";
import { type CountPicker, findCountPicker, findOpenButton, findOpenCostTag } from "../../kyara/page-dom";
import { restorePaidWarning, skipPaidWarning } from "../../kyara/paid-warning";
import type { Feature } from "../types";
import { labelOpenCount, labelTag, makeFreeOption, mute, placeOption, unmuteAll } from "./view";
import "./style.css";

/** ×n is worth adding: more than 1, not already offered, and below the largest option (else that one is all free). */
export function worthOffering(n: number, picker: CountPicker): boolean {
  const ns = picker.options.map((o) => o.n);
  return n > 1 && n < Math.max(...ns) && !ns.includes(n);
}

export const freePacksOption: Feature = {
  name: "free-packs",
  setup(ctx) {
    const html = document.documentElement;
    const option = makeFreeOption();
    restorePaidWarning(); // left on by a choice active when the page was reloaded
    let active: HTMLButtonElement | null = null; // site option selected in our place
    let scripted = false; // our own click on a site option must not cancel the choice
    let refreshedFor: string | null = null; // opening page whose free boosters were last read

    const clickSite = (el: HTMLElement) => {
      scripted = true;
      el.click();
      scripted = false;
    };
    const cancel = () => {
      active = null;
      html.removeAttribute(OPEN_COUNT_ATTR);
      restorePaidWarning();
      unmuteAll();
      labelTag(findOpenCostTag(), null);
      labelOpenCount(findOpenButton(), null);
    };
    const apply = (n: number, picker: CountPicker, site: HTMLButtonElement) => {
      html.setAttribute(OPEN_COUNT_ATTR, String(n));
      skipPaidWarning(); // the site prices its bulk option, not the free-only opening: no chakra spent
      const like = picker.options.find((o) => o.el !== site);
      if (like) mute(site, like.el);
      labelTag(findOpenCostTag(), tn("packs.free", n));
      labelOpenCount(findOpenButton(), n);
    };
    const withdraw = (picker: CountPicker) => {
      option.remove();
      if (!active) return;
      // back to ×1: the bulk option we selected may spend chakra
      const single = picker.options.find((o) => o.n === 1) ?? picker.options[0];
      if (single) clickSite(single.el);
      cancel();
    };

    const render = () => {
      if (!ctx.page.isValid) return; // a late timer after the extension reloaded must not put the option back
      const packId = openPagePack(location.pathname);
      const picker = packId ? findCountPicker() : null;
      if (!packId) cancel();
      if (packId && refreshedFor !== location.pathname) refresh(location.pathname);
      if (!packId || !picker) return; // no picker during the reveal: the choice is kept
      const hooked = html.hasAttribute(HOOK_ATTR);
      const n = hooked ? (readFreePacks()[packId] ?? 0) : 0;
      if (!worthOffering(n, picker)) return withdraw(picker);
      if (active && active.getAttribute("aria-pressed") !== "true") cancel(); // the site's selection moved
      placeOption(option, picker, { n, on: active !== null });
      if (active) apply(n, picker, active);
    };
    // the site updates its selection after the click (and changes attributes only: the page watcher misses it)
    const renderSoon = () => setTimeout(safe("free-packs:render", render), 0);
    const refresh = (path: string) => {
      refreshedFor = path;
      void safeAsync("free-packs:refresh", async () => {
        await refreshPackData();
        renderSoon();
      })();
    };

    listen(ctx.page, option, "click", () => {
      const bulk = findCountPicker()?.options.find((o) => o.n > 1);
      if (active || !bulk) return;
      clickSite(bulk.el);
      active = bulk.el;
      renderSoon();
    });
    const isSiteOption = (el: Element | null) =>
      !!el && !!findCountPicker()?.options.some((o) => o.el === el);
    const onSiteClick = (e: Event) => {
      if (scripted || !active || !(e.target instanceof Element)) return;
      if (!isSiteOption(e.target.closest("button"))) return;
      cancel();
      renderSoon();
    };
    listen(ctx.page, document, "click", onSiteClick, { capture: true });
    ctx.page.onInvalidated(() => {
      cancel();
      option.remove();
    });
    ctx.onOffers(render);
  },
};
