// Extension texts: everything the user reads comes from src/locales/<lang>.json (en, fr).
// Language = the browser's (navigator.language), English if it is not supported.
// No side effects. To add a language: a new JSON, one line in `catalogs`.
import en from "../locales/en.json";
import fr from "../locales/fr.json";

/** Key of a text. The type comes from en.json: an unknown key does not compile. */
export type MessageKey = keyof typeof en;
type Catalog = Record<MessageKey, string>;

/** Name of a plural text: `x` for the keys `x_one` / `x_other`. */
type PluralBase = MessageKey extends infer K ? (K extends `${infer B}_one` ? B : never) : never;

// fr must have exactly en's keys: the type enforces it, a test also checks the {params}
const catalogs = { en, fr } satisfies Record<string, Catalog>;
export type Locale = keyof typeof catalogs;

function detectLocale(): Locale {
  const lang = (globalThis.navigator?.language ?? "").slice(0, 2).toLowerCase();
  return lang in catalogs ? (lang as Locale) : "en";
}

let current: Locale = detectLocale();

/** Changes the language (used by tests). */
export function setLocale(locale: Locale): void {
  current = locale;
}

/** Text for this key, with its `{params}` replaced. A missing param is left as is. */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return catalogs[current][key].replace(/\{(\w+)\}/g, (whole, name: string) => String(params[name] ?? whole));
}

/** Plural text: picks `<base>_one` or `<base>_other` from `count`, which replaces `{count}`. */
export function tn(base: PluralBase, count: number): string {
  const form = new Intl.PluralRules(current).select(count);
  const key = `${base}_${form}` in catalogs[current] ? `${base}_${form}` : `${base}_other`;
  return t(key as MessageKey, { count });
}
