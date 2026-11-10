// Redesign of the public profile page: the showcase cards take center stage, with their full art, and the
// profile becomes a wide header over an ambient backdrop. Several designs, chosen live from a small floating
// bar (designs.ts, picker.ts); "site" keeps the site's own look.
// Only attributes and CSS variables go on the site's nodes (kyara/profile-dom.ts); the CSS does the rest.
// Every redesign rule is scoped to data-kv-design on <html>: removing it restores the site at once.
// Storage: profileDesign key. Network: the large card images, loaded by the browser from the site's CDN.
// Uses `onOffers` only as a render tick (no offers on this page).
import { safeAsync } from "../../core/errors";
import { listen } from "../../core/page";
import { onProfileDesignChange, readProfileDesign, writeProfileDesign } from "../../core/storage-design";
import { createStorageSync } from "../../core/storage-sync";
import {
  findProfileLayout,
  findShowcase,
  isProfilePath,
  markProfileLayout,
  markShowcase,
  type ProfileLayout,
} from "../../kyara/profile-dom";
import { markProfileStats } from "../../kyara/profile-stats";
import type { Feature } from "../types";
import { createAmbient } from "./ambient";
import { type ProfileDesign, toDesign } from "./designs";
import { createDesignPicker } from "./picker";
import { createProfileSections } from "./sections";
import "./styles/page/layout.css";
import "./styles/page/stats.css";
import "./styles/designs/poster.css";
import "./styles/designs/stage.css";
import "./styles/designs/ribbon.css";
import "./styles/designs/gallery.css";
import "./styles/designs/fan.css";
import "./styles/designs/orbit.css";
import "./styles/designs/prism.css";
import "./sections/sections.css";
import "./sections/themes.css";
import "./styles/page/responsive.css";
import "./styles/page/picker.css";

const DESIGN_ATTR = "data-kv-design";
/** Set once the page is marked: until then the CSS keeps the page hidden, for a moment at most. */
const READY_ATTR = "data-kv-prof-ready";

/** Sets the design on <html> ("site", or leaving the profile: no attribute, so no redesign). */
function applyDesignAttr(design: ProfileDesign, onProfile: boolean): void {
  const html = document.documentElement;
  if (onProfile && design !== "site") html.setAttribute(DESIGN_ATTR, design);
  else html.removeAttribute(DESIGN_ATTR);
}

export const profileShowcase: Feature = {
  name: "profile-showcase",
  setup(ctx) {
    const html = document.documentElement;
    const ambient = createAmbient();
    const sections = createProfileSections(ctx.page);
    let design: ProfileDesign | null = null; // null until the stored choice is read
    let layout: ProfileLayout | null = null;

    const render = () => {
      if (!ctx.page.isValid || design === null) return;
      const onProfile = isProfilePath(location.pathname);
      applyDesignAttr(design, onProfile);
      picker.select(design);
      layout = onProfile ? findProfileLayout() : null;
      picker.setVisible(layout !== null);
      sections.update(layout, design !== "site");
      html.toggleAttribute(READY_ATTR, layout !== null);
      if (!layout) return;
      markProfileLayout(layout);
      if (layout.stats) markProfileStats(layout.stats);
      const cases = findShowcase();
      markShowcase(cases);
      const hero = cases.find((c) => c.el.hasAttribute("data-kv-show-hero"))?.art?.sm;
      const current = ambient.current();
      const stillThere = cases.some((c) => c.art?.sm === current);
      if (hero && !stillThere) ambient.show(layout.page, hero);
    };
    const choose = (next: ProfileDesign) => {
      design = next;
      render();
    };
    const sync = createStorageSync<ProfileDesign>(writeProfileDesign, choose);
    const picker = createDesignPicker(ctx.page, (next) => {
      choose(next);
      void sync.save(next);
    });

    // the ambient backdrop follows the card under the pointer (or the keyboard focus)
    const follow = (event: Event) => {
      if (!layout || !(event.target instanceof Element)) return;
      const url = event.target.closest("[data-kv-show-art]")?.getAttribute("data-kv-show-art");
      if (url) ambient.show(layout.page, url);
    };
    listen(ctx.page, document, "mouseover", follow, { passive: true });
    listen(ctx.page, document, "focusin", follow);

    ctx.page.onInvalidated(onProfileDesignChange((value) => sync.onStored(toDesign(value))));
    ctx.page.onInvalidated(() => {
      html.removeAttribute(DESIGN_ATTR);
      html.removeAttribute(READY_ATTR);
    });
    ctx.onOffers(render);
    void safeAsync("profile-showcase:init", async () => choose(toDesign(await readProfileDesign())))();
  },
};
