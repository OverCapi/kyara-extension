import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { readGainFilter, writeGainFilter } from "../../core/storage";
import { makeSnapshot, startFeature } from "../../test/helpers";
import { gainFilter } from "./index";

beforeEach(() => fakeBrowser.reset());

const gauge = () => document.querySelector<HTMLElement>(".kv-gauge");
const input = () => document.querySelector<HTMLInputElement>('.kv-gauge input[type="range"]');
const modeButton = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>(".kv-mode")].find((b) => b.textContent === label);
const sortButton = () => document.querySelector<HTMLButtonElement>(".kv-sort");
const pressed = () => document.querySelector('.kv-mode:not(.kv-sort)[aria-pressed="true"]')?.textContent;
const hidden = (snap: ReturnType<typeof makeSnapshot>) =>
  snap.offers.map((o) => o.li.hasAttribute("data-kv-hide-gain"));

// offre 1 : +100 % (10 contre 5, possédée) ; offre 2 : +20 % (6 contre 5) ; offre 3 : gain inconnu ;
// offre 4 : neutre (5 contre 5) ; offre 5 : -20 % (4 contre 5)
const specs = [
  { give: 1, wants: [2] },
  { give: 3, wants: [2] },
  { give: 9, wants: [2] },
  { give: 4, wants: [2] },
  { give: 5, wants: [2] },
];
const opts = { fair: { 1: 10, 2: 5, 3: 6, 4: 5, 5: 4 }, owned: { 2: 1 } };

async function setSlider(value: string) {
  const el = input();
  if (!el) throw new Error("jauge absente");
  el.value = value;
  el.dispatchEvent(new Event("input"));
}

function clickMode(label: string) {
  const el = modeButton(label);
  if (!el) throw new Error(`mode ${label} absent`);
  el.click();
}

describe("gain-filter", () => {
  it("Off par défaut : rien n'est masqué, curseur grisé", async () => {
    const snap = makeSnapshot(specs, opts);
    startFeature(gainFilter).emit(snap);
    await vi.waitFor(() => expect(pressed()).toBe("Off"));
    expect(input()?.disabled).toBe(true);
    expect(input()?.step).toBe("1");
    expect(hidden(snap)).toEqual([false, false, false, false, false]);
  });

  it("Neutre et + : neutres et rentables ; Positif : rentables seulement ; mémorisé", async () => {
    const snap = makeSnapshot(specs, opts);
    startFeature(gainFilter).emit(snap);
    await vi.waitFor(() => expect(pressed()).toBe("Off"));
    clickMode("Neutre et +");
    expect(hidden(snap)).toEqual([false, false, true, false, true]);
    expect(input()?.disabled).toBe(false);
    clickMode("Positif");
    expect(pressed()).toBe("Positif");
    expect(hidden(snap)).toEqual([false, false, true, true, true]);
    await vi.waitFor(async () =>
      expect(await readGainFilter()).toEqual({ mode: "positive", pct: 0, sort: true }),
    );
    clickMode("Off");
    expect(hidden(snap)).toEqual([false, false, false, false, false]);
  });

  it("le curseur filtre au pas de 1 % et mémorise", async () => {
    await writeGainFilter({ mode: "neutral", pct: 0, sort: true });
    const snap = makeSnapshot(specs, opts);
    startFeature(gainFilter).emit(snap);
    await vi.waitFor(() => expect(pressed()).toBe("Neutre et +"));
    await setSlider("21");
    expect(gauge()?.textContent).toContain("21 %");
    expect(hidden(snap)).toEqual([false, true, true, true, true]);
    await setSlider("20");
    expect(hidden(snap)).toEqual([false, false, true, true, true]);
    await vi.waitFor(async () =>
      expect(await readGainFilter()).toEqual({ mode: "neutral", pct: 20, sort: true }),
    );
  });

  it("un changement venu d'un autre onglet est suivi", async () => {
    const snap = makeSnapshot(specs, opts);
    startFeature(gainFilter).emit(snap);
    await writeGainFilter({ mode: "positive", pct: 90, sort: true });
    await vi.waitFor(() => expect(hidden(snap)).toEqual([false, true, true, true, true]));
    expect(input()?.value).toBe("90");
    expect(pressed()).toBe("Positif");
  });

  it("anciens formats repris ; hors échelle : borné", async () => {
    await browser.storage.local.set({ minGain: 500 });
    startFeature(gainFilter).emit(makeSnapshot(specs, opts));
    await vi.waitFor(() => expect(input()?.value).toBe("100"));
    expect(pressed()).toBe("Neutre et +");
    await browser.storage.local.set({ minGain: { on: false, pct: 30 } });
    await vi.waitFor(() => expect(pressed()).toBe("Off"));
    expect(input()?.value).toBe("30");
  });

  it("valeur corrompue : Off", async () => {
    await browser.storage.local.set({ minGain: { mode: "tout", pct: -3 } });
    startFeature(gainFilter).emit(makeSnapshot(specs, opts));
    await vi.waitFor(() => expect(pressed()).toBe("Off"));
    expect(input()?.value).toBe("0");
  });

  it("tri : meilleure offre en premier via `order`, gain inconnu en dernier", async () => {
    const snap = makeSnapshot(specs, opts);
    startFeature(gainFilter).emit(snap);
    await vi.waitFor(() => expect(pressed()).toBe("Off"));
    // gains : +100 %, +20 %, inconnu, 0 %, -20 %
    expect(snap.offers.map((o) => o.li.style.order)).toEqual(["0", "1", "4", "2", "3"]);
  });

  it("pastille de tri : coupe le tri (order retiré) et mémorise ; les nœuds ne bougent pas", async () => {
    const snap = makeSnapshot(specs, opts);
    startFeature(gainFilter).emit(snap);
    await vi.waitFor(() => expect(sortButton()?.getAttribute("aria-pressed")).toBe("true"));
    const ids = [...document.querySelectorAll("li")].map((li) => li.id);
    sortButton()?.click();
    expect(snap.offers.map((o) => o.li.style.order)).toEqual(["", "", "", "", ""]);
    expect(sortButton()?.getAttribute("aria-pressed")).toBe("false");
    await vi.waitFor(async () => expect((await readGainFilter()).sort).toBe(false));
    expect([...document.querySelectorAll("li")].map((li) => li.id)).toEqual(ids);
    sortButton()?.click();
    expect(snap.offers[0]?.li.style.order).toBe("0");
  });

  it("ancien format sans tri : tri actif", async () => {
    await browser.storage.local.set({ minGain: { mode: "off", pct: 0 } });
    startFeature(gainFilter).emit(makeSnapshot(specs, opts));
    await vi.waitFor(() => expect(sortButton()?.getAttribute("aria-pressed")).toBe("true"));
  });

  it("offre sans carte proposée : ignorée", () => {
    const snap = makeSnapshot([{ wants: [2] }]);
    startFeature(gainFilter).emit(snap);
    expect(hidden(snap)).toEqual([false]);
  });

  it("range ses réglages dans 2 catégories du panneau : Rentabilité et Tri", () => {
    const { filters } = startFeature(gainFilter);
    expect(filters.categories.map((c) => c.title)).toEqual(["Rentabilité", "Tri"]);
    expect(filters.categories[0]?.el.querySelector('input[type="range"]')).not.toBeNull();
    expect(filters.categories[1]?.el.querySelector(".kv-sort")).not.toBeNull();
  });

  it("échec d'écriture : attrapé", async () => {
    startFeature(gainFilter).emit(makeSnapshot([{ give: 1 }]));
    vi.spyOn(fakeBrowser.storage.local, "set").mockRejectedValue(new Error("invalidated"));
    clickMode("Positif");
    await Promise.resolve();
    expect(pressed()).toBe("Positif");
  });

  it("offres pas encore traitées retenues (hold) tant que tri ou filtre est actif ; filtre signalé à load-more", async () => {
    const root = document.documentElement;
    const { page } = startFeature(gainFilter);
    expect(root.hasAttribute("data-kv-hold-gain")).toBe(true); // tri actif par défaut, avant même le stockage
    expect(root.hasAttribute("data-kv-filter-gain")).toBe(false);
    await vi.waitFor(() => expect(pressed()).toBe("Off"));
    clickMode("Positif");
    expect(root.hasAttribute("data-kv-filter-gain")).toBe(true);
    sortButton()?.click(); // tri coupé, filtre toujours actif
    expect(root.hasAttribute("data-kv-hold-gain")).toBe(true);
    clickMode("Off");
    expect(root.hasAttribute("data-kv-hold-gain")).toBe(false); // ni tri ni filtre : rien à retenir
    expect(root.hasAttribute("data-kv-filter-gain")).toBe(false);
    clickMode("Neutre et +");
    page.invalidate();
    expect(root.hasAttribute("data-kv-hold-gain")).toBe(false);
    expect(root.hasAttribute("data-kv-filter-gain")).toBe(false);
  });
});
