import { describe, expect, it } from "vitest";
import { markProfileStats } from "./profile-stats";

function renderStats(): HTMLElement {
  const stats = document.createElement("div");
  stats.innerHTML =
    `<div class="kpi coll"><span class="ring-w"><svg class="ring"><circle class="ring-bg"></circle>` +
    `<circle class="ring-fg"></circle></svg><b class="ring-p">46 %</b></span>` +
    `<div><b class="kv">3 115<span class="kt">/6 736</span></b><span class="kl">Cartes</span></div></div>` +
    `<div class="kpi"><b class="kv m">36</b><span class="kl">Mythiques</span></div>` +
    `<div class="kpi"><b class="kv">1 677</b><span class="kl">Boosters</span></div>` +
    `<div class="kpi rank"><div class="rk-h"><span class="rk-k">名人</span><b>Maître</b><span class="kl">25 pts</span></div>` +
    `<div class="rk-bar"><i style="width: 72%"></i></div></div>`;
  document.body.append(stats);
  return stats;
}
const kinds = (stats: Element) => [...stats.children].map((c) => c.getAttribute("data-kv-stat"));

describe("markProfileStats", () => {
  it("names the tiles by position", () => {
    const stats = renderStats();
    markProfileStats(stats);
    expect(kinds(stats)).toEqual(["coll", "small", "small", "rank"]);
    expect((stats.children[2] as HTMLElement).style.getPropertyValue("--kv-i")).toBe("2");
  });
  it("marks the parts", () => {
    const stats = renderStats();
    markProfileStats(stats);
    for (const part of ["value", "total", "label", "ring", "ring-bg", "ring-fg", "ring-pct"]) {
      expect(stats.children[0]?.querySelector(`[data-kv-stat-part="${part}"]`)).not.toBeNull();
    }
    for (const part of ["seal", "rank", "bar", "fill", "label"]) {
      expect(stats.children[3]?.querySelector(`[data-kv-stat-part="${part}"]`)).not.toBeNull();
    }
  });
  it("marks only the mythic tile as accent", () => {
    const stats = renderStats();
    markProfileStats(stats);
    expect(stats.children[1]?.hasAttribute("data-kv-stat-accent")).toBe(true);
    expect(stats.children[2]?.hasAttribute("data-kv-stat-accent")).toBe(false);
  });
  it("site changed: tiles still named, unknown parts ignored", () => {
    const stats = document.createElement("div");
    stats.innerHTML = "<p>a</p><p>b</p>";
    markProfileStats(stats);
    expect(kinds(stats)).toEqual(["coll", "rank"]);
    expect(stats.querySelector("[data-kv-stat-part]")).toBeNull();
  });
  it("empty block: nothing happens", () => {
    expect(() => markProfileStats(document.createElement("div"))).not.toThrow();
  });
});
