import { beforeEach, describe, expect, it, vi } from "vitest";
import { restorePaidWarning, skipPaidWarning } from "./paid-warning";

const SITE_KEY = "kyara.open.paidok";

beforeEach(() => sessionStorage.clear());

describe("paid-warning", () => {
  it("skip turns the site's warning off, restore turns it back on", () => {
    skipPaidWarning();
    expect(sessionStorage.getItem(SITE_KEY)).toBe("1");
    skipPaidWarning(); // idempotent
    restorePaidWarning();
    expect(sessionStorage.getItem(SITE_KEY)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
  it("already confirmed by the user: left on after restore", () => {
    sessionStorage.setItem(SITE_KEY, "1");
    skipPaidWarning();
    restorePaidWarning();
    expect(sessionStorage.getItem(SITE_KEY)).toBe("1");
  });
  it("restore without skip changes nothing", () => {
    restorePaidWarning();
    expect(sessionStorage.length).toBe(0);
  });
  it("sessionStorage not accessible: no throw", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => skipPaidWarning()).not.toThrow();
    expect(() => restorePaidWarning()).not.toThrow();
    spy.mockRestore();
  });
});
