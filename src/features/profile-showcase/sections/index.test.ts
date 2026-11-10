import { beforeEach, describe, expect, it, vi } from "vitest";
import { findProfileLayout } from "../../../kyara/profile-dom";
import { fakeCtx, mockFetch } from "../../../test/helpers";
import { createProfileSections } from "./index";
import { SECTION_IDS } from "./view";

const ID = "942d5d82-5845-4365-99d6-3c305862e315";
const PROFILE = {
  pseudo: "K",
  owned: 3,
  catalogSize: 10,
  byRarity: { M: 3 },
  wishlist: [{ id: 1, name: "A" }],
};

function renderPage(active = 0): void {
  const tabs = ["Vitrine", "Collection", "Échanges"]
    .map((label, i) => `<button class="${i === active ? "on" : ""}">${label}</button>`)
    .join("");
  document.body.innerHTML = `<main><div><aside><h1>K</h1></aside><div class="col"><div class="ptabs">${tabs}</div></div></div></main>`;
}
const layout = () => findProfileLayout();
const section = () => document.getElementById(SECTION_IDS.collection);

beforeEach(() => {
  window.history.replaceState({}, "", `/profil/${ID}`);
  renderPage();
});

describe("profile sections", () => {
  it("fetches once, then shows the sections at the end of the main column", async () => {
    const fetch = mockFetch(PROFILE);
    const sections = createProfileSections(fakeCtx());
    sections.update(layout(), true);
    await vi.waitFor(() => expect(section()).not.toBeNull());
    expect(section()?.closest(".col")).not.toBeNull();
    sections.update(layout(), true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("put back if the site removed them", async () => {
    mockFetch(PROFILE);
    const sections = createProfileSections(fakeCtx());
    sections.update(layout(), true);
    await vi.waitFor(() => expect(section()).not.toBeNull());
    renderPage();
    sections.update(layout(), true);
    expect(section()).not.toBeNull();
  });
  it("disabled (site design) or no layout: removed", async () => {
    mockFetch(PROFILE);
    const sections = createProfileSections(fakeCtx());
    sections.update(layout(), true);
    await vi.waitFor(() => expect(section()).not.toBeNull());
    sections.update(layout(), false);
    expect(section()).toBeNull();
    sections.update(null, true);
    expect(section()).toBeNull();
  });
  it("own profile without id, or failed request: nothing", async () => {
    const fetch = mockFetch({}, 500);
    window.history.replaceState({}, "", "/profil");
    const sections = createProfileSections(fakeCtx());
    sections.update(layout(), true);
    expect(fetch).not.toHaveBeenCalled();
    window.history.replaceState({}, "", `/profil/${ID}`);
    sections.update(layout(), true);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    sections.update(layout(), true);
    expect(section()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1); // no retry on this page
  });
  it("the Collection tab jumps to the section instead of switching", async () => {
    mockFetch(PROFILE);
    const sections = createProfileSections(fakeCtx());
    sections.update(layout(), true);
    await vi.waitFor(() => expect(section()).not.toBeNull());
    const scroll = vi.fn();
    const target = section();
    if (target) target.scrollIntoView = scroll;
    const siteHandler = vi.fn();
    const tab = document.querySelectorAll("button")[1];
    tab?.addEventListener("click", siteHandler);
    tab?.click();
    expect(scroll).toHaveBeenCalled();
    expect(siteHandler).not.toHaveBeenCalled();
    document.querySelectorAll("button")[0]?.click(); // other tabs keep working
  });
  it("arriving on another tab: back to the showcase once", () => {
    mockFetch(PROFILE);
    renderPage(2);
    const showcase = document.querySelectorAll("button")[0];
    const click = vi.fn();
    showcase?.addEventListener("click", click);
    const sections = createProfileSections(fakeCtx());
    sections.update(layout(), true);
    sections.update(layout(), true);
    expect(click).toHaveBeenCalledTimes(1);
  });
  it("extension reloaded: removed", async () => {
    mockFetch(PROFILE);
    const page = fakeCtx();
    const sections = createProfileSections(page);
    sections.update(layout(), true);
    await vi.waitFor(() => expect(section()).not.toBeNull());
    page.invalidate();
    expect(section()).toBeNull();
  });
});
