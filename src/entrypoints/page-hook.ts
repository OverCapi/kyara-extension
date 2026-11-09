// Script injected into the page itself (MAIN world) by inject.content.ts: installs the fetch hook. No logic here.
import { installFetchHook } from "../kyara/fetch-hook";

export default defineUnlistedScript(() => installFetchHook(window));
