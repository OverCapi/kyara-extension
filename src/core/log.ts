// Development logs. The ONLY file allowed to call console.*.
// `import.meta.env.DEV` is replaced with `false` in the prod build: the body of these functions
// is then empty and drops out of the bundle (no logs, no cost in prod).
export interface Logger {
  /** Normal tracing (requests, renders). Silent in prod. */
  debug(...args: unknown[]): void;
  /** Caught error or invalid data. Silent in prod. */
  error(...args: unknown[]): void;
}

/** Creates a logger whose lines are prefixed with `[kyara-extension:<module>]`. */
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
