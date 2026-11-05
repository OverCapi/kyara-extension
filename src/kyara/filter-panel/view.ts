// DOM du panneau de filtres : bouton (icône d'entonnoir) + fenêtre à 2 sections, rangées en catégories.
// Aucun écouteur ni logique ici (voir index.ts). Textes : locales/*.json.
import { t } from "../../core/i18n";

const SVG_NS = "http://www.w3.org/2000/svg";

function funnelIcon(): SVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  for (const [name, value] of Object.entries({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
    "aria-hidden": "true",
  })) {
    svg.setAttribute(name, value);
  }
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M3 5h18l-7 8v6l-4 2v-8z");
  svg.append(path);
  return svg;
}

/** Catégorie : un titre et son contenu. */
export function makeCategory(title: string, body: HTMLElement): HTMLElement {
  const category = document.createElement("div");
  category.className = "kv-cat";
  const heading = document.createElement("h4");
  heading.textContent = title;
  category.append(heading, body);
  return category;
}

/** Ligne de pastilles (retour à la ligne automatique). */
export function pillRow(pills: HTMLElement[]): HTMLElement {
  const row = document.createElement("div");
  row.className = "kv-pills";
  row.append(...pills);
  return row;
}

function makeSection(title: string): { root: HTMLElement; body: HTMLElement } {
  const root = document.createElement("section");
  root.className = "kv-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const body = document.createElement("div");
  root.append(heading, body);
  return { root, body };
}

/** Construit le bouton et la fenêtre (cachée). `kyara` et `extension` sont les corps des 2 sections. */
export function buildMenu() {
  const root = document.createElement("div");
  root.className = "kv-menu";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "kv-menu-btn";
  button.title = t("panel.title");
  button.setAttribute("aria-label", t("panel.title"));
  button.setAttribute("aria-expanded", "false");
  button.append(funnelIcon());
  const popover = document.createElement("div");
  popover.className = "kv-popover";
  popover.hidden = true;
  const kyara = makeSection(t("panel.section.kyara"));
  const extension = makeSection(t("panel.section.extension"));
  popover.append(kyara.root, extension.root);
  root.append(button, popover);
  return { root, button, popover, kyara: kyara.body, extension: extension.body };
}
