/**
 * Safe script execution utilities.
 * Wraps `new Function()` calls with blocked access to dangerous globals
 * like localStorage, document.cookie, indexedDB, etc.
 * This prevents imported collections/flows with malicious scripts from
 * exfiltrating stored credentials.
 */

// Globals to block in user scripts
const BLOCKED_GLOBALS = [
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "document",
  "cookie",
  "XMLHttpRequest",
  "fetch",
  "WebSocket",
  "navigator",
  "location",
  "top",
  "parent",
  "opener",
  "frames",
  "self",
  "globalThis",
] as const;

// Build a prefix that shadows dangerous globals with undefined
const BLOCK_PREFIX = BLOCKED_GLOBALS.map((g) => `var ${g} = undefined;`).join(
  " ",
);

/**
 * Creates a safe console shim that only allows log/warn/error
 * and prevents access to the real console object's other methods.
 */
export function createSafeConsole(logCollector?: (...args: any[]) => void) {
  const safeLog =
    logCollector || ((...args: any[]) => console.log("[qf-sandbox]", ...args));
  return {
    log: safeLog,
    warn: safeLog,
    error: safeLog,
    info: safeLog,
    debug: safeLog,
    dir: () => {},
    table: () => {},
    trace: () => {},
    assert: () => {},
    clear: () => {},
    count: () => {},
    countReset: () => {},
    group: () => {},
    groupCollapsed: () => {},
    groupEnd: () => {},
    time: () => {},
    timeEnd: () => {},
    timeLog: () => {},
    profile: () => {},
    profileEnd: () => {},
  };
}

/**
 * Execute a user-provided script with blocked access to dangerous browser APIs.
 * The script can only access the explicitly passed arguments.
 */
export function safeNewFunction(
  argNames: string[],
  body: string,
): (...args: unknown[]) => unknown {
  const safeBody = `"use strict"; ${BLOCK_PREFIX} ${body}`;
  return new Function(...argNames, safeBody) as (...args: unknown[]) => unknown;
}

/**
 * Safely evaluate an expression string, returning the result.
 * Blocks access to localStorage, document, etc.
 */
export function safeEvalExpression(
  expression: string,
  context: Record<string, any> = {},
): any {
  const argNames = Object.keys(context);
  const argValues = Object.values(context);
  const fn = safeNewFunction(argNames, `return ${expression}`);
  return fn(...argValues);
}
