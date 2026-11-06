// Background script entry point: starts the passive price cache. No logic here.
// Firefox only: the passive cache relies on filterResponseData, missing from Chrome.
// ponytail: no passive cache on Chrome; a MAIN world script intercepting fetch if the request volume becomes a problem.
import { startPassiveCache } from "../kyara/passive-cache";

export default defineBackground(() => {
  // build constant: on Chrome, the passive cache is removed from the bundle
  if (import.meta.env.FIREFOX) startPassiveCache();
});
