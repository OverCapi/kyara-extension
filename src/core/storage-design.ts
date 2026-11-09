// Stored choice of the profile page design (key below, listed with the others in storage.ts).
// The value is not validated here: the profile-showcase feature knows the designs and validates it.
import { browser } from "wxt/browser";
import { onKeyChange } from "./storage";

const PROFILE_DESIGN_KEY = "profileDesign";

/** Stored profile design, not validated. `undefined` if never chosen. */
export async function readProfileDesign(): Promise<unknown> {
  const { [PROFILE_DESIGN_KEY]: value } = await browser.storage.local.get(PROFILE_DESIGN_KEY);
  return value;
}

/** Stores the chosen profile design. */
export const writeProfileDesign = (value: string): Promise<void> =>
  browser.storage.local.set({ [PROFILE_DESIGN_KEY]: value });

/** Calls `cb(value)` when the profile design changes (other tabs included). */
export const onProfileDesignChange = (cb: (value: unknown) => void): (() => void) =>
  onKeyChange(PROFILE_DESIGN_KEY, cb);
