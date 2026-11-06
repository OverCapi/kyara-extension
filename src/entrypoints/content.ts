// Content script entry point (kyara.games pages): starts the features. No logic here.
import { features } from "../features";
import { startFeatures } from "../features/runtime";

export default defineContentScript({
  matches: ["https://kyara.games/*"],
  main(ctx) {
    startFeatures(ctx, features);
  },
});
