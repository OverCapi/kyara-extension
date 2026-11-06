// HTML escaping: apply to any text coming from the site before inserting it through innerHTML.

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** Replaces & < > " with their HTML entities. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ENTITIES[c] ?? c);
}
