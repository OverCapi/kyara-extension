// Builds the Collection and Trades sections shown under the showcase, from the profile's data. Pure DOM building
// (createElement, no innerHTML), nothing attached: the caller places the result. Card images come from the site's
// CDN and each card links to its /wiki page, like everywhere on the site.
import { t } from "../../../core/i18n";
import {
  cardImageUrl,
  type ProfileCard,
  type ProfileData,
  type SeriesProgress,
} from "../../../kyara/profile-api";

/** Ids of the two sections, used to jump to them. */
export const SECTION_IDS = { collection: "kv-sec-collection", trades: "kv-sec-trades" } as const;

const RARITIES = [
  ["M", "rarity.mythic"],
  ["L", "rarity.legendary"],
  ["E", "rarity.epic"],
  ["R", "rarity.rare"],
  ["U", "rarity.uncommon"],
  ["C", "rarity.common"],
] as const;

type Child = Node | string;

function el(tag: string, className: string, children: Child[] = []): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.append(...children);
  return node;
}

const formatNumber = (n: number): string => n.toLocaleString();
const formatPct = (part: number, whole: number): string =>
  whole > 0 ? `${((part / whole) * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })} %` : "–";

function heading(level: "h2" | "h3", label: string, badge?: string): HTMLElement {
  return el(level, "kv-psec-title", badge === undefined ? [label] : [label, el("span", "kv-badge", [badge])]);
}

function rarityBar(data: ProfileData): HTMLElement {
  const bar = el("div", "kv-rbar");
  bar.setAttribute("aria-hidden", "true");
  for (const [code] of RARITIES) {
    const n = data.byRarity[code] ?? 0;
    if (n === 0) continue;
    const part = el("span", "");
    part.dataset.kvR = code;
    part.style.setProperty("--kv-w", String(n));
    bar.append(part);
  }
  return bar;
}

function rarityChips(data: ProfileData): HTMLElement {
  return el(
    "ul",
    "kv-rchips",
    RARITIES.map(([code, key]) => {
      const n = data.byRarity[code] ?? 0;
      const chip = el("li", "", [
        el("span", "kv-dot"),
        el("span", "kv-rchip-label", [t(key)]),
        el("b", "", [formatNumber(n)]),
        el("small", "", [formatPct(n, data.owned)]),
      ]);
      chip.dataset.kvR = code;
      return chip;
    }),
  );
}

function universe(series: SeriesProgress, index: number): HTMLElement {
  const fill = el("i", "");
  fill.style.setProperty("--kv-p", `${Math.min(100, (series.owned / series.total) * 100)}%`);
  const item = el("li", "", [
    el("span", "kv-uni-name", [series.name]),
    el("span", "kv-uni-count", [`${formatNumber(series.owned)}/${formatNumber(series.total)}`]),
    el("span", "kv-uni-bar", [fill]),
  ]);
  item.toggleAttribute("data-kv-done", series.owned >= series.total);
  item.style.setProperty("--kv-i", String(index));
  return item;
}

function tile(card: ProfileCard, index: number): HTMLElement {
  const link = el("a", "kv-tile");
  const img = document.createElement("img");
  img.src = cardImageUrl(card.id);
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  link.setAttribute("href", `/wiki/${card.id}`);
  link.title = card.series ? `${card.name} · ${card.series}` : card.name;
  link.dataset.kvR = card.rarity;
  link.style.setProperty("--kv-i", String(index));
  link.append(img, el("span", "kv-tile-name", [card.name]), el("span", "kv-tile-sub", [card.series]));
  if (card.spare > 0) link.append(el("b", "kv-tile-spare", [`×${card.spare}`]));
  return link;
}

function strip(cards: ProfileCard[]): HTMLElement {
  return el("div", "kv-strip", cards.map(tile));
}

function collectionSection(data: ProfileData): HTMLElement {
  const section = el("section", "kv-psec", [
    el("header", "kv-psec-h", [
      heading("h2", t("profile.sec.collection")),
      el("span", "kv-psec-count", [
        t("profile.sec.unique", { owned: formatNumber(data.owned), total: formatNumber(data.catalogSize) }),
      ]),
    ]),
    rarityBar(data),
    rarityChips(data),
  ]);
  if (data.series.length > 0) {
    section.append(heading("h3", t("profile.sec.universes")), el("ul", "kv-unis", data.series.map(universe)));
  }
  section.id = SECTION_IDS.collection;
  return section;
}

function tradesSection(data: ProfileData): HTMLElement {
  const g = data.feminine ? "f" : "m";
  const section = el("section", "kv-psec", [
    el("header", "kv-psec-h", [heading("h2", t("profile.sec.trades"))]),
  ]);
  if (data.wishlist.length > 0) {
    section.append(
      heading("h3", t(`profile.sec.wants_${g}`), formatNumber(data.wishlistCount)),
      strip(data.wishlist),
    );
  }
  if (data.doubles.length > 0) {
    section.append(
      heading("h3", t(`profile.sec.offers_${g}`), formatNumber(data.doublesCount)),
      strip(data.doubles),
    );
  }
  if (data.wishlist.length === 0 && data.doubles.length === 0) {
    section.append(el("p", "kv-psec-empty", [t("profile.sec.no_trades")]));
  }
  section.id = SECTION_IDS.trades;
  return section;
}

/** Both sections in one container (not attached to the page). */
export function buildSections(data: ProfileData): HTMLElement {
  const root = el("div", "kv-psecs", [collectionSection(data), tradesSection(data)]);
  root.setAttribute("data-kv-sections", "");
  return root;
}
