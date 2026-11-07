// Pure rules of the wanted-cards list: name normalization and matching. No DOM, no storage.

/** Case, accents and extra spaces ignored: " Éclair  Noir " and "eclair noir" are the same name. */
export function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Adds a name (as typed) unless it is empty or already listed. Returns the new list. */
export function addName(names: readonly string[], typed: string): string[] {
  const key = normalizeName(typed);
  if (!key || names.some((n) => normalizeName(n) === key)) return [...names];
  return [...names, typed.replace(/\s+/g, " ").trim()];
}

/** `true` if this card name is in the list (exact match after normalization). */
export function isWanted(cardName: string, names: readonly string[]): boolean {
  const key = normalizeName(cardName);
  return key !== "" && names.some((n) => normalizeName(n) === key);
}
