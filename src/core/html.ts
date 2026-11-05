// Échappement HTML : à appliquer à tout texte venant du site avant de l'insérer via innerHTML.

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** Remplace & < > " par leurs entités HTML. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ENTITIES[c] ?? c);
}
