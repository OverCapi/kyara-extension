// Textes de l'extension : tout ce que l'utilisateur lit vient de src/locales/<langue>.json (en, fr).
// Langue = celle du navigateur (navigator.language), anglais si elle n'est pas prise en charge.
// Aucun effet de bord. Pour ajouter une langue : un nouveau JSON, une ligne dans `catalogs`.
import en from "../locales/en.json";
import fr from "../locales/fr.json";

/** Clé d'un texte. Le type vient de en.json : une clé inconnue ne compile pas. */
export type MessageKey = keyof typeof en;
type Catalog = Record<MessageKey, string>;

/** Nom d'un texte à pluriel : `x` pour les clés `x_one` / `x_other`. */
type PluralBase = MessageKey extends infer K ? (K extends `${infer B}_one` ? B : never) : never;

// fr doit avoir exactement les clés de en : le type l'impose, un test vérifie aussi les {paramètres}
const catalogs = { en, fr } satisfies Record<string, Catalog>;
export type Locale = keyof typeof catalogs;

function detectLocale(): Locale {
  const lang = (globalThis.navigator?.language ?? "").slice(0, 2).toLowerCase();
  return lang in catalogs ? (lang as Locale) : "en";
}

let current: Locale = detectLocale();

/** Change la langue (utilisé par les tests). */
export function setLocale(locale: Locale): void {
  current = locale;
}

/** Texte de cette clé, avec les `{paramètres}` remplacés. Un paramètre manquant reste tel quel. */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return catalogs[current][key].replace(/\{(\w+)\}/g, (whole, name: string) => String(params[name] ?? whole));
}

/** Texte à pluriel : choisit `<base>_one` ou `<base>_other` selon `count`, qui remplace `{count}`. */
export function tn(base: PluralBase, count: number): string {
  const form = new Intl.PluralRules(current).select(count);
  const key = `${base}_${form}` in catalogs[current] ? `${base}_${form}` : `${base}_other`;
  return t(key as MessageKey, { count });
}
