// Logs de développement. SEUL fichier autorisé à appeler console.*.
// `import.meta.env.DEV` est remplacé par `false` au build de prod : le corps de ces fonctions
// est alors vide et disparaît du bundle (aucun log, aucun coût en prod).

export interface Logger {
  /** Suivi normal (requêtes, rendus). Muet en prod. */
  debug(...args: unknown[]): void;
  /** Erreur attrapée ou donnée invalide. Muet en prod. */
  error(...args: unknown[]): void;
}

/** Crée un logger dont chaque ligne est préfixée `[kyara-extension:<module>]`. */
export function createLogger(module: string): Logger {
  const tag = `[kyara-extension:${module}]`;
  return {
    debug(...args) {
      if (import.meta.env.DEV) console.log(tag, ...args);
    },
    error(...args) {
      if (import.meta.env.DEV) console.error(tag, ...args);
    },
  };
}
