import { describe, expect, it } from "vitest";
import { findTabButtons, isActiveTab } from "./profile-tabs";

function row(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML =
    '<button class="pt on">Vitrine <span>8</span></button><button class="pt">Collection</button>' +
    '<button class="pt">Échanges <span>57</span></button><button class="pt">Autre</button>';
  return el;
}

describe("findTabButtons", () => {
  it("finds the three tabs by their text", () => {
    const tabs = findTabButtons(row());
    expect(tabs.showcase?.textContent).toContain("Vitrine");
    expect(tabs.collection?.textContent).toBe("Collection");
    expect(tabs.trades?.textContent).toContain("Échanges");
  });
  it("no row, or unknown texts: nothing found", () => {
    expect(findTabButtons(null)).toEqual({ showcase: null, collection: null, trades: null });
    const other = document.createElement("div");
    other.innerHTML = "<button>A</button>";
    expect(findTabButtons(other).trades).toBeNull();
  });
});

describe("isActiveTab", () => {
  it("site class, then aria-selected", () => {
    const tabs = findTabButtons(row());
    expect(tabs.showcase && isActiveTab(tabs.showcase)).toBe(true);
    expect(tabs.collection && isActiveTab(tabs.collection)).toBe(false);
    tabs.trades?.setAttribute("aria-selected", "true");
    expect(tabs.trades && isActiveTab(tabs.trades)).toBe(true);
  });
});
