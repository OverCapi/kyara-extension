// Collection and Trades on the same page as the showcase: fetches the profile's data once per player, places the
// sections at the end of the main column, and turns the site's Collection / Échanges tabs into jumps to them.
// Deliberate EXCEPTION n°3 to the "no node in the site's DOM" rule: the sections container sits in the site's main
// column (put back on every render if the site removes it). Network: one GET /api/users/<id> per player and page.
import { listen, type PageContext } from "../../../core/page";
import { fetchProfile, type ProfileData, profileIdFromPath } from "../../../kyara/profile-api";
import type { ProfileLayout } from "../../../kyara/profile-dom";
import { findTabButtons, isActiveTab, type ProfileTabs } from "../../../kyara/profile-tabs";
import { buildSections, SECTION_IDS } from "./view";

export interface ProfileSections {
  /** Shows the sections for this page (`enabled` false, or no layout: removed). */
  update(layout: ProfileLayout | null, enabled: boolean): void;
}

/** Creates the controller. Everything is removed when the extension is reloaded. */
export function createProfileSections(page: PageContext): ProfileSections {
  const cache = new Map<string, ProfileData | null>();
  let root: HTMLElement | null = null;
  let rootFor: string | null = null;
  let tabs: ProfileTabs = findTabButtons(null);
  let backToShowcaseFor: string | null = null; // player whose page was brought back to the showcase tab
  let last: { layout: ProfileLayout | null; enabled: boolean } = { layout: null, enabled: false };

  const place = (id: string, layout: ProfileLayout) => {
    const data = cache.get(id);
    if (!data) return;
    if (rootFor !== id) {
      root?.remove();
      root = buildSections(data);
      rootFor = id;
    }
    if (root && root.parentElement !== layout.main) layout.main.append(root);
  };
  const load = (id: string) => {
    cache.set(id, null); // in flight, and a failure is not retried on this page
    fetchProfile(id)
      .then((data) => {
        cache.set(id, data);
        if (page.isValid) update(last.layout, last.enabled);
      })
      .catch(() => undefined); // fetchProfile never rejects
  };
  // on arrival on another tab (link, reload), come back once to the showcase: the sections show the rest
  const showShowcase = (id: string) => {
    if (backToShowcaseFor === id || !tabs.showcase) return;
    backToShowcaseFor = id;
    if (!isActiveTab(tabs.showcase)) tabs.showcase.click();
  };
  const update = (layout: ProfileLayout | null, enabled: boolean) => {
    last = { layout, enabled };
    const id = profileIdFromPath(location.pathname);
    tabs = findTabButtons(enabled ? (layout?.tabs ?? null) : null);
    if (!enabled || !layout || !id) {
      root?.remove();
      return;
    }
    if (!cache.has(id)) load(id);
    showShowcase(id);
    place(id, layout);
  };

  // Collection / Échanges tabs: jump to our section instead of replacing the showcase
  listen<MouseEvent>(
    page,
    document,
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      const key = target === tabs.collection ? "collection" : target === tabs.trades ? "trades" : null;
      const section = key && root?.isConnected ? document.getElementById(SECTION_IDS[key]) : null;
      if (!section) return;
      event.preventDefault();
      event.stopPropagation();
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    { capture: true },
  );
  page.onInvalidated(() => root?.remove());
  return { update };
}
