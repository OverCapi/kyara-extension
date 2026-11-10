// Design picker of the profile page: a compact row of buttons, one per design, placed right after the site's
// "Choisir ma vitrine" button (so only on one's own profile: the chosen design then applies to every profile).
// Deliberate EXCEPTION n°4 to the "no node in the site's DOM" rule, put back on every render.
// Shows the name of the active design only, to stay compact.
import { t } from "../../core/i18n";
import { listen, type PageContext } from "../../core/page";
import { DESIGNS, type DesignInfo, type ProfileDesign } from "./designs";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface DesignPicker {
  /** Puts the picker right after `anchor` (the "Choisir ma vitrine" button); `null`: removed. */
  place(anchor: Element | null): void;
  /** Shows which design is active. */
  select(design: ProfileDesign): void;
}

function makeIcon({ icon }: DesignInfo): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 18 18");
  svg.setAttribute("aria-hidden", "true");
  for (const [x, y, w, h] of icon) {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(w));
    rect.setAttribute("height", String(h));
    rect.setAttribute("rx", "1");
    svg.append(rect);
  }
  return svg;
}

function makeButton(info: DesignInfo): HTMLButtonElement {
  const button = document.createElement("button");
  const label = document.createElement("span");
  button.type = "button";
  button.dataset.kvDesignId = info.id;
  button.title = t(info.label);
  button.setAttribute("aria-label", t(info.label));
  label.textContent = t(info.label);
  button.append(makeIcon(info), label);
  return button;
}

/** Creates the picker, not placed. `onPick` is called when the user chooses a design. */
export function createDesignPicker(page: PageContext, onPick: (design: ProfileDesign) => void): DesignPicker {
  const bar = document.createElement("div");
  const buttons = new Map(DESIGNS.map((info) => [info.id, makeButton(info)]));
  bar.className = "kv-design";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", t("profile.design.title"));
  bar.append(...buttons.values());
  page.onInvalidated(() => bar.remove());

  for (const [id, button] of buttons) listen(page, button, "click", () => onPick(id));
  return {
    place(anchor) {
      if (!anchor) bar.remove();
      else if (anchor.nextElementSibling !== bar) anchor.after(bar);
    },
    select(design) {
      for (const [id, button] of buttons) button.setAttribute("aria-pressed", String(id === design));
    },
  };
}
