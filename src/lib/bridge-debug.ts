const STORAGE_KEY = "qf_bridge_debug";
const QUERY_KEY = "qfBridgeDebug";

function parseToggle(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on";
}

export function isBridgeDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const fromQuery = new URLSearchParams(window.location.search).get(
      QUERY_KEY,
    );
    if (fromQuery !== null) return parseToggle(fromQuery);

    return parseToggle(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function setBridgeDebugEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Ignore storage failures (private mode/quota).
  }
}

export function bridgeDebug(
  event: string,
  details?: Record<string, unknown>,
): void {
  if (!isBridgeDebugEnabled()) return;

  if (details && Object.keys(details).length > 0) {
    console.info(`[queFork bridge] ${event}`, details);
    return;
  }

  console.info(`[queFork bridge] ${event}`);
}
