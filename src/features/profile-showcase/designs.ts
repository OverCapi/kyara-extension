// Designs offered for the profile page: ids, their label keys and the small icon drawn in the picker.
// Pure data, no side effects. The look of each design lives in the CSS files next to it.
import type { MessageKey } from "../../core/i18n";

export type ProfileDesign = "stage" | "ribbon" | "fan" | "prism" | "site";

/** Rectangle of a picker icon, on an 18×18 grid: x, y, width, height. */
export type IconRect = readonly [x: number, y: number, w: number, h: number];

export interface DesignInfo {
  id: ProfileDesign;
  /** Key of the name in locales/*.json. */
  label: MessageKey;
  icon: readonly IconRect[];
}

export const DEFAULT_DESIGN: ProfileDesign = "stage";

export const DESIGNS: readonly DesignInfo[] = [
  {
    id: "stage",
    label: "profile.design.stage",
    icon: [
      [1, 2, 8, 14],
      [11, 2, 6, 6],
      [11, 10, 6, 6],
    ],
  },
  {
    id: "ribbon",
    label: "profile.design.ribbon",
    icon: [
      [1, 2, 9, 14],
      [12, 2, 2, 14],
      [15, 2, 2, 14],
    ],
  },
  {
    id: "fan",
    label: "profile.design.fan",
    icon: [
      [2, 5, 4, 11],
      [7, 2, 4, 14],
      [12, 5, 4, 11],
    ],
  },
  {
    id: "prism",
    label: "profile.design.prism",
    icon: [
      [1, 2, 7, 6],
      [10, 2, 7, 6],
      [1, 10, 7, 6],
      [10, 10, 7, 6],
    ],
  },
  {
    id: "site",
    label: "profile.design.site",
    icon: [
      [1, 4, 4, 4],
      [7, 4, 4, 4],
      [13, 4, 4, 4],
      [1, 10, 4, 4],
      [7, 10, 4, 4],
    ],
  },
];

/** Stored value as a known design. The default if missing, unknown or corrupted. */
export function toDesign(value: unknown): ProfileDesign {
  return DESIGNS.find((d) => d.id === value)?.id ?? DEFAULT_DESIGN;
}
