// Design picker of the profile page: a small floating bar, bottom right, one button per design.
// Appended to <html>, outside the site's tree. Shows the name of the active design only, to stay compact.
import { t } from "../../core/i18n";
import { listen, mountFloating, type PageContext } from "../../core/page";
import { DESIGNS, type DesignInfo, type ProfileDesign } from "./designs";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface DesignPicker {
  setVisible(visible: boolean): void;
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

/** Creates the bar, hidden. `onPick` is called when the user chooses a design. */
export function createDesignPicker(page: PageContext, onPick: (design: ProfileDesign) => void): DesignPicker {
  const bar = document.createElement("div");
  const title = document.createElement("span");
  const buttons = new Map(DESIGNS.map((info) => [info.id, makeButton(info)]));
  bar.className = "kv-design";
  bar.hidden = true;
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", t("profile.design.title"));
  title.className = "kv-design-title";
  title.textContent = t("profile.design.short");
  bar.append(title, ...buttons.values());
  mountFloating(page, bar);

  for (const [id, button] of buttons) listen(page, button, "click", () => onPick(id));
  return {
    setVisible(visible) {
      bar.hidden = !visible;
    },
    select(design) {
      for (const [id, button] of buttons) button.setAttribute("aria-pressed", String(id === design));
    },
  };
}
