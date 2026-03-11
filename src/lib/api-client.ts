import type {
  RequestConfig,
  ResponseData,
  KeyValuePair,
  TestResult,
  Environment,
} from "@/types/api";
import { safeNewFunction, createSafeConsole } from "@/lib/safe-eval";
import { bridgeDebug } from "@/lib/bridge-debug";

// ── Custom proxy support ──────────────────────────────────────────────
function getCustomProxyUrl(): string | null {
  try {
    return localStorage.getItem("quefork_custom_proxy_url") || null;
  } catch {
    return null;
  }
}

export function setCustomProxyUrl(url: string | null) {
  try {
    if (url) localStorage.setItem("quefork_custom_proxy_url", url);
    else localStorage.removeItem("quefork_custom_proxy_url");
  } catch {
    // Ignore storage write errors (private mode/quota exceeded).
  }
}

export function getCustomProxyUrlValue(): string | null {
  return getCustomProxyUrl();
}

// ── CORS Proxy strategies ─────────────────────────────────────────────
const CORS_PROXIES: {
  name: string;
  buildUrl: (url: string) => string;
  extraHeaders?: Record<string, string>;
}[] = [
  {
    name: "corsproxy.io",
    buildUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  },
  {
    name: "allorigins",
    buildUrl: (url) =>
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
  {
    name: "codetabs",
    buildUrl: (url) =>
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  },
  {
    name: "cors.sh",
    buildUrl: (url) => `https://proxy.cors.sh/${url}`,
    extraHeaders: { "x-cors-api-key": "temp_key" },
  },
  {
    name: "thingproxy",
    buildUrl: (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
  },
  {
    name: "corsproxy.org",
    buildUrl: (url) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
  },
  {
    name: "corsanywhere",
    buildUrl: (url) => `https://cors-anywhere.herokuapp.com/${url}`,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────
function resolveVariables(text: string, env: Environment | null): string {
  if (!env || !text) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = env.variables.find((v) => v.enabled && v.key === key);
    return v ? v.value : `{{${key}}}`;
  });
}

function buildUrl(url: string, params: KeyValuePair[]): string {
  const enabled = params.filter((p) => p.enabled && p.key);
  if (!enabled.length) return url;
  const separator = url.includes("?") ? "&" : "?";
  const qs = enabled
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
  return `${url}${separator}${qs}`;
}

function hasHeaderCaseInsensitive(
  headers: Record<string, string>,
  name: string,
): boolean {
  return Object.keys(headers).some(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
}

function buildHeaders(config: RequestConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  config.headers
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      headers[h.key] = h.value;
    });

  if (config.auth.type === "bearer" && config.auth.bearer?.token) {
    if (!hasHeaderCaseInsensitive(headers, "Authorization")) {
      headers["Authorization"] = `Bearer ${config.auth.bearer.token}`;
    }
  } else if (config.auth.type === "basic" && config.auth.basic) {
    if (!hasHeaderCaseInsensitive(headers, "Authorization")) {
      const encoded = btoa(
        `${config.auth.basic.username}:${config.auth.basic.password}`,
      );
      headers["Authorization"] = `Basic ${encoded}`;
    }
  } else if (
    config.auth.type === "api-key" &&
    config.auth.apiKey?.addTo === "header"
  ) {
    headers[config.auth.apiKey.key] = config.auth.apiKey.value;
  } else if (config.auth.type === "oauth2" && config.auth.oauth2?.accessToken) {
    if (!hasHeaderCaseInsensitive(headers, "Authorization")) {
      headers["Authorization"] = `Bearer ${config.auth.oauth2.accessToken}`;
    }
  }

  if (config.body.type === "json" || config.body.type === "graphql") {
    if (!hasHeaderCaseInsensitive(headers, "Content-Type")) {
      headers["Content-Type"] = "application/json";
    }
  } else if (config.protocol === "soap") {
    if (!hasHeaderCaseInsensitive(headers, "Content-Type")) {
      headers["Content-Type"] = "text/xml; charset=utf-8";
    }
    if (!hasHeaderCaseInsensitive(headers, "SOAPAction")) {
      headers["SOAPAction"] = '""';
    }
  } else if (config.body.type === "xml") {
    if (!hasHeaderCaseInsensitive(headers, "Content-Type")) {
      headers["Content-Type"] = "application/xml";
    }
  } else if (config.body.type === "x-www-form-urlencoded") {
    if (!hasHeaderCaseInsensitive(headers, "Content-Type")) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  }

  return headers;
}

function buildBody(config: RequestConfig): string | FormData | undefined {
  if (
    config.method === "GET" ||
    config.method === "HEAD" ||
    config.body.type === "none"
  )
    return undefined;

  // SOAP: auto-wrap in envelope if not already present
  if (
    config.protocol === "soap" &&
    (config.body.type === "xml" || config.body.type === "raw")
  ) {
    const raw = (config.body.raw || "").trim();
    if (
      raw &&
      !raw.includes("soap:Envelope") &&
      !raw.includes("soapenv:Envelope") &&
      !raw.includes("Envelope")
    ) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header/>
  <soap:Body>
    ${raw}
  </soap:Body>
</soap:Envelope>`;
    }
    return raw || undefined;
  }

  if (
    config.body.type === "json" ||
    config.body.type === "raw" ||
    config.body.type === "xml"
  ) {
    return config.body.raw;
  }

  if (config.body.type === "graphql") {
    try {
      const variables = config.body.graphql.variables
        ? JSON.parse(config.body.graphql.variables)
        : {};
      const payload: Record<string, any> = {
        query: config.body.graphql.query,
        variables,
      };
      if (config.body.graphql.operationName) {
        payload.operationName = config.body.graphql.operationName;
      }
      return JSON.stringify(payload);
    } catch {
      return JSON.stringify({ query: config.body.graphql.query });
    }
  }

  if (config.body.type === "form-data") {
    const fd = new FormData();
    config.body.formData
      .filter((f) => f.enabled && f.key)
      .forEach((f) => fd.append(f.key, f.value));
    return fd as any;
  }

  if (config.body.type === "x-www-form-urlencoded") {
    return config.body.formData
      .filter((f) => f.enabled && f.key)
      .map((f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
      .join("&");
  }

  return undefined;
}

function isLocalhostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "0.0.0.0"
    );
  } catch {
    return false;
  }
}

// ── Extension detection latch ─────────────────────────────────────────
let extensionEverDetected = false;

function hasExtensionBridgeMarker(): boolean {
  if (typeof document === "undefined") return false;
  const meta = document.querySelector('meta[name="quefork-agent"]');
  if (meta?.getAttribute("content") === "active") return true;
  if (document.documentElement?.getAttribute("data-quefork-agent") === "active")
    return true;
  return false;
}

if (typeof window !== "undefined") {
  const latchExtension = () => {
    extensionEverDetected = true;
  };
  window.addEventListener("quefork-agent-ready", latchExtension);
  window.addEventListener("message", (e) => {
    const d = e.data as { type?: string } | undefined;
    if (
      d?.type === "QUEFORK_AGENT_READY" ||
      d?.type === "QUEFORK_AGENT_HEARTBEAT" ||
      d?.type === "QUEFORK_AGENT_PONG"
    ) {
      latchExtension();
    }
  });
}

// ── Local agent failure cache ─────────────────────────────────────────
let localAgentDownUntil = 0;
const LOCAL_AGENT_COOLDOWN_MS = 30_000;

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers as Record<string, string>;
}

async function tryExtensionFetch(
  url: string,
  options: RequestInit,
): Promise<Response | null> {
  if (typeof window === "undefined") return null;

  const hasMarker = hasExtensionBridgeMarker();
  if (!hasMarker && !extensionEverDetected) return null;
  extensionEverDetected = true;
  const timeoutMs = 2500;

  return new Promise((resolve) => {
    const startedAt = performance.now();
    const requestId = `qf-ext-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };

    const onMessage = (event: MessageEvent) => {
      // In extension isolated worlds, source can be inconsistent.
      // Match only on message shape and request id.
      const data = event.data as
        | { type?: string; id?: string; payload?: any }
        | undefined;

      if (!data || data.type !== "QUEFORK_PROXY_RESPONSE") return;
      if (data.id !== requestId) return;

      cleanup();
      const payload = data.payload || {};
      bridgeDebug("proxy-response", {
        requestId,
        hasMarker,
        elapsedMs: Math.round(performance.now() - startedAt),
        status: payload.status ?? null,
        hasError: Boolean(payload.error),
      });

      if (payload.error || payload.status === 0) {
        resolve(null);
        return;
      }

      resolve(
        new Response(payload.body ?? "", {
          status: payload.status ?? 200,
          statusText: payload.statusText ?? "OK",
          headers: payload.headers || {},
        }),
      );
    };

    const timeout = setTimeout(() => {
      cleanup();
      bridgeDebug("proxy-timeout", {
        requestId,
        hasMarker,
        elapsedMs: Math.round(performance.now() - startedAt),
        timeoutMs,
      });
      resolve(null);
    }, timeoutMs);

    window.addEventListener("message", onMessage);
    bridgeDebug("proxy-request", {
      requestId,
      hasMarker,
      timeoutMs,
      method: (options.method || "GET").toUpperCase(),
      url,
    });
    window.postMessage(
      {
        type: "QUEFORK_PROXY_REQUEST",
        id: requestId,
        payload: {
          url,
          method: (options.method || "GET").toUpperCase(),
          headers: normalizeHeaders(options.headers),
          body: typeof options.body === "string" ? options.body : undefined,
        },
      },
      "*",
    );
  });
}

// ── Check if queFork Agent is available ───────────────────────────────
async function tryAgentFetch(
  url: string,
  options: RequestInit,
): Promise<Response | null> {
  // Skip if we recently confirmed the local agent is unreachable
  if (Date.now() < localAgentDownUntil) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const healthRes = await fetch("http://localhost:9119/health", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!healthRes.ok) {
      localAgentDownUntil = Date.now() + LOCAL_AGENT_COOLDOWN_MS;
      return null;
    }

    // Agent is alive — use it as proxy
    const agentRes = await fetch("http://localhost:9119/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        method: (options.method || "GET").toUpperCase(),
        headers: normalizeHeaders(options.headers),
        body: typeof options.body === "string" ? options.body : undefined,
      }),
    });
    return agentRes;
  } catch {
    localAgentDownUntil = Date.now() + LOCAL_AGENT_COOLDOWN_MS;
    return null;
  }
}

// ── Fetch with proxy cascade ──────────────────────────────────────────
type FetchResult = { res: Response; route: import("@/types/api").ProxyRoute };

async function fetchWithProxy(
  url: string,
  options: RequestInit,
  useProxy: boolean,
): Promise<FetchResult> {
  // Localhost requests always go direct
  if (isLocalhostUrl(url)) {
    return { res: await fetch(url, options), route: "direct" };
  }

  // If proxy disabled, just try direct
  if (!useProxy) {
    return { res: await fetch(url, options), route: "direct" };
  }

  // 1) Try direct fetch first (might work if API allows CORS)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      mode: "cors",
    });
    clearTimeout(timeout);
    // If we get any response (even 4xx), CORS is not blocking us
    return { res, route: "direct" };
  } catch (directErr: any) {
    // TypeError = CORS blocked or network error, continue to proxies
    if (directErr.name !== "TypeError" && directErr.name !== "AbortError") {
      throw directErr;
    }
  }

  // 2) Try Chrome extension bridge if available
  const extensionRes = await tryExtensionFetch(url, options);
  if (extensionRes) return { res: extensionRes, route: "extension" };

  // 3) Try local queFork Agent service if available
  const agentRes = await tryAgentFetch(url, options);
  if (agentRes) return { res: agentRes, route: "agent" };

  // 3.5) Try custom proxy (Vercel/Edge Function) if configured
  const customProxy = getCustomProxyUrl();
  if (customProxy) {
    try {
      const proxyRes = await fetch(customProxy, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          method: (options.method || "GET").toUpperCase(),
          headers: options.headers || {},
          body: typeof options.body === "string" ? options.body : undefined,
        }),
      });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        return {
          res: new Response(proxyData.body, {
            status: proxyData.status,
            statusText: proxyData.statusText,
            headers: proxyData.headers || {},
          }),
          route: "custom-proxy" as const,
        };
      }
    } catch (e: any) {
      // Custom proxy failed, continue to built-in proxies
    }
  }

  // 4) Cascade through CORS proxies
  const errors: string[] = [];
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy.buildUrl(url);
      // For proxy requests, strip auth headers by default to prevent credential leakage
      // through third-party proxy services. Only keep safe headers.
      const cleanHeaders: Record<string, string> = {};
      const origHeaders = (options.headers as Record<string, string>) || {};

      // Strip Authorization and sensitive headers — third-party proxies can log them
      for (const [k, v] of Object.entries(origHeaders)) {
        const lower = k.toLowerCase();
        if (["content-type", "accept", "accept-language"].includes(lower)) {
          cleanHeaders[k] = v;
        }
      }

      // Warn in console that auth headers were stripped for this proxy request
      const strippedKeys = Object.keys(origHeaders).filter((k) => {
        const lower = k.toLowerCase();
        return (
          lower === "authorization" ||
          (lower !== "content-type" &&
            lower !== "accept" &&
            lower !== "accept-language")
        );
      });
      if (strippedKeys.length > 0) {
        console.warn(
          `[qF] ⚠️ Auth/sensitive headers (${strippedKeys.join(", ")}) stripped for third-party proxy "${proxy.name}". Use queFork Agent or a custom proxy to preserve credentials.`,
        );
      }

      const proxyHeaders = {
        ...cleanHeaders,
        ...(proxy.extraHeaders || {}),
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      // Use no-cors mode as fallback, then cors mode
      const res = await fetch(proxyUrl, {
        ...options,
        headers: proxyHeaders,
        signal: controller.signal,
        mode: "cors",
      });
      clearTimeout(timeout);

      // Accept any non-5xx response
      if (res.status < 500) return { res, route: "cors-proxy" as const };
      errors.push(`${proxy.name}: HTTP ${res.status}`);
    } catch (e: any) {
      errors.push(`${proxy.name}: ${e.message || "failed"}`);
      continue;
    }
  }

  // 4) All proxies failed — try one more time with no-cors to at least confirm connectivity
  throw new Error(
    `CORS blocked by the target server.\n\n` +
      `All ${CORS_PROXIES.length} proxy strategies failed:\n${errors.join("\n")}\n\n` +
      `The proxy is doing its best, but some APIs actively reject proxy servers too.`,
  );
}

// ── Execute Request ───────────────────────────────────────────────────
export async function executeRequest(
  config: RequestConfig,
  activeEnv?: Environment | null,
  useProxy: boolean = true,
  flowVars?: Record<string, any>,
): Promise<ResponseData> {
  // Guard: realtime protocols use their own panel-based connections
  const realtimeProtocols = ["websocket", "sse", "socketio"];
  if (realtimeProtocols.includes(config.protocol)) {
    return {
      status: 0,
      statusText: "Error",
      headers: {},
      body: `${config.protocol.toUpperCase()} connections are managed via the real-time panel, not HTTP requests. Use the Connect button instead.`,
      size: 0,
      time: 0,
      error: `${config.protocol} is a real-time protocol`,
    };
  }

  const env = activeEnv || null;
  const resolvedConfig = {
    ...config,
    url: resolveVariables(config.url, env),
    headers: config.headers.map((h) => ({
      ...h,
      key: resolveVariables(h.key, env),
      value: resolveVariables(h.value, env),
    })),
    params: config.params.map((p) => ({
      ...p,
      key: resolveVariables(p.key, env),
      value: resolveVariables(p.value, env),
    })),
    body: {
      ...config.body,
      raw: resolveVariables(config.body.raw, env),
    },
  };

  let url = resolvedConfig.url;
  if (!url)
    return {
      status: 0,
      statusText: "Error",
      headers: {},
      body: "URL is required",
      size: 0,
      time: 0,
      error: "URL is required",
    };

  if (!/^https?:\/\//i.test(url) && !/^wss?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  if (
    resolvedConfig.auth.type === "api-key" &&
    resolvedConfig.auth.apiKey?.addTo === "query"
  ) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}${encodeURIComponent(resolvedConfig.auth.apiKey.key)}=${encodeURIComponent(resolvedConfig.auth.apiKey.value)}`;
  }

  url = buildUrl(url, resolvedConfig.params);

  // Auto-refresh OAuth2 token if enabled and expired/expiring (30s buffer)
  if (
    resolvedConfig.auth.type === "oauth2" &&
    resolvedConfig.auth.oauth2?.autoRefresh &&
    resolvedConfig.auth.oauth2.tokenUrl &&
    resolvedConfig.auth.oauth2.clientId &&
    resolvedConfig.auth.oauth2.tokenExpiresAt &&
    Date.now() > resolvedConfig.auth.oauth2.tokenExpiresAt - 30000
  ) {
    try {
      const { accessToken, expiresAt } = await fetchOAuth2Token(
        resolvedConfig.auth.oauth2,
      );
      resolvedConfig.auth = {
        ...resolvedConfig.auth,
        oauth2: {
          ...resolvedConfig.auth.oauth2,
          accessToken,
          tokenExpiresAt: expiresAt,
        },
      };
    } catch {
      console.warn("[qF] OAuth2 auto-refresh failed, using existing token.");
    }
  }

  // SOAP always uses POST
  if (resolvedConfig.protocol === "soap" && resolvedConfig.method === "GET") {
    resolvedConfig.method = "POST";
  }

  const headers = buildHeaders(resolvedConfig);
  const body = buildBody(resolvedConfig);

  if (config.preScript) {
    try {
      runScript(config.preScript, {}, config, env, flowVars);
    } catch {
      console.warn("[qF] Pre-script execution failed.");
    }
  }

  const start = performance.now();
  try {
    const fetchHeaders: Record<string, string> = {};
    Object.entries(headers).forEach(([k, v]) => {
      fetchHeaders[k] = v;
    });
    if (body instanceof FormData) delete fetchHeaders["Content-Type"];

    const { res, route } = await fetchWithProxy(
      url,
      {
        method: resolvedConfig.method,
        headers: fetchHeaders,
        body: body as any,
      },
      useProxy,
    );

    const elapsed = performance.now() - start;
    const text = await res.text();
    const resHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });

    const response: ResponseData = {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
      body: text,
      size: new Blob([text]).size,
      time: Math.round(elapsed),
      proxyRoute: route,
    };

    if (config.postScript) {
      try {
        runScript(config.postScript, response, config, env, flowVars);
      } catch {
        console.warn("[qF] Post-script execution failed.");
      }
    }

    return response;
  } catch (err: any) {
    const elapsed = performance.now() - start;
    const isCorsLikely =
      err.message?.includes("proxy strategies failed") ||
      err.message === "Failed to fetch" ||
      err.name === "TypeError";
    const errorBody = isCorsLikely
      ? `⛔ CORS Blocked\n\nThe target server (${url}) does not allow cross-origin requests from browsers.\n\n${err.message}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nThis is a server-side restriction. Some APIs (especially financial APIs, internal APIs) actively reject proxy servers too.\n\n🔧 Solutions:\n\n1. Install queFork Agent — runs a local proxy on your machine, bypasses ALL CORS restrictions\n   → github.com/somritdasgupta/queFork\n\n2. Set up a custom CORS proxy server or use a public CORS proxy\n\n3. Use curl / httpie from your terminal for these APIs\n\n4. If you control the API, add CORS headers:\n   Access-Control-Allow-Origin: *`
      : err.message || "Request failed";
    return {
      status: 0,
      statusText: isCorsLikely ? "CORS Error" : "Error",
      headers: {},
      body: errorBody,
      size: 0,
      time: Math.round(elapsed),
      error: err.message,
    };
  }
}

// ── Scripting API ─────────────────────────────────────────────────────
function createQfApi(
  env: Environment | null,
  config: RequestConfig,
  flowVars?: Record<string, any>,
) {
  // If flowVars provided (running inside a flow), qf.variables reads/writes flow vars
  // Otherwise uses an ephemeral store for standalone request scripts
  const store = flowVars || ({} as Record<string, any>);
  return {
    environment: {
      get: (key: string) => {
        if (!env) return undefined;
        const v = env.variables.find((v) => v.key === key && v.enabled);
        return v?.value;
      },
      set: function (key: string, value: string) {
        if (env) {
          const existing = env.variables.find((v) => v.key === key);
          if (existing) existing.value = value;
          else
            env.variables.push({
              id: crypto.randomUUID(),
              key,
              value,
              enabled: true,
            });
        }
        return this;
      },
      remove: function (key: string) {
        if (env) {
          const idx = env.variables.findIndex((v) => v.key === key);
          if (idx !== -1) env.variables.splice(idx, 1);
        }
        return this;
      },
      list: () =>
        env?.variables
          .filter((v) => v.enabled)
          .map((v) => ({ key: v.key, value: v.value })) || [],
      clear: () => {
        if (env) env.variables = [];
      },
    },
    variables: {
      get: (key: string) => store[key],
      set: function (key: string, value: any) {
        store[key] = value;
        return this;
      },
      remove: function (key: string) {
        delete store[key];
        return this;
      },
      list: () => ({ ...store }),
      clear: function () {
        Object.keys(store).forEach((k) => delete store[k]);
        return this;
      },
    },
    request: {
      method: config.method,
      url: config.url,
      headers: Object.fromEntries(
        config.headers.filter((h) => h.enabled).map((h) => [h.key, h.value]),
      ),
      params: Object.fromEntries(
        config.params.filter((p) => p.enabled).map((p) => [p.key, p.value]),
      ),
    },
    sendRequest: async (opts: {
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: string;
    }) => {
      const res = await fetch(opts.url || config.url, {
        method: opts.method || "GET",
        headers: opts.headers,
        body: opts.body,
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      return {
        status: res.status,
        body: text,
        json: () => json,
        headers: Object.fromEntries(res.headers.entries()),
      };
    },
    log: (...args: any[]) => console.log("[qf]", ...args),
  };
}

export function runTests(
  testScript: string,
  response: ResponseData,
  env?: Environment | null,
  config?: RequestConfig,
  flowVars?: Record<string, any>,
): TestResult[] {
  const results: TestResult[] = [];
  const test = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ name, passed: true, message: "Passed" });
    } catch (e: any) {
      results.push({ name, passed: false, message: e.message || "Failed" });
    }
  };
  const expect = (val: any) => ({
    toBe: (expected: any) => {
      if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`);
    },
    toContain: (expected: any) => {
      if (
        (typeof val === "string" || Array.isArray(val)) &&
        !val.includes(expected)
      )
        throw new Error(`Expected to contain "${expected}"`);
      if (typeof val !== "string" && !Array.isArray(val))
        throw new Error(`Expected a string or array, got ${typeof val}`);
    },
    toBeTruthy: () => {
      if (!val) throw new Error(`Expected truthy, got ${val}`);
    },
    toBeFalsy: () => {
      if (val) throw new Error(`Expected falsy, got ${val}`);
    },
    toBeGreaterThan: (n: number) => {
      if (val <= n) throw new Error(`Expected > ${n}, got ${val}`);
    },
    toBeLessThan: (n: number) => {
      if (val >= n) throw new Error(`Expected < ${n}, got ${val}`);
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(val) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(expected)}`);
    },
    toHaveProperty: (prop: string) => {
      if (!(prop in val)) throw new Error(`Missing property "${prop}"`);
    },
    toHaveLength: (len: number) => {
      if (val?.length !== len)
        throw new Error(`Expected length ${len}, got ${val?.length}`);
    },
  });

  const defaultConfig: RequestConfig = {
    id: "",
    name: "",
    protocol: "rest",
    method: "GET",
    url: "",
    params: [],
    headers: [],
    body: {
      type: "none",
      raw: "",
      formData: [],
      graphql: { query: "", variables: "{}" },
    },
    auth: { type: "none" },
    preScript: "",
    postScript: "",
    tests: "",
  };
  const qf = createQfApi(env || null, config || defaultConfig, flowVars);

  // Add response to qf object so scripts use qf.response.*
  (qf as any).response = {
    status: response.status,
    statusText: response.statusText,
    body: response.body,
    headers: response.headers,
    time: response.time,
    json: () => {
      try {
        return JSON.parse(response.body);
      } catch {
        return null;
      }
    },
  };

  // Backward compat: also expose as pm for any legacy scripts
  const pm = {
    response: (qf as any).response,
    environment: qf.environment,
    request: qf.request,
  };

  try {
    const fn = safeNewFunction(
      ["test", "expect", "qf", "pm", "response"],
      testScript,
    );
    fn(test, expect, qf, pm, (qf as any).response);
  } catch (e: any) {
    results.push({ name: "Script Error", passed: false, message: e.message });
  }
  return results;
}

function runScript(
  script: string,
  response: any,
  request: RequestConfig,
  env: Environment | null,
  flowVars?: Record<string, any>,
) {
  const qf = createQfApi(env, request, flowVars);
  (qf as any).response = response;
  const pm = { response, request, environment: qf.environment };
  const safeConsole = createSafeConsole();
  const fn = safeNewFunction(["qf", "pm", "console"], script);
  fn(qf, pm, safeConsole);
}

export async function fetchOAuth2Token(
  config: RequestConfig["auth"]["oauth2"],
): Promise<{ accessToken: string; expiresAt?: number }> {
  if (!config) throw new Error("OAuth2 config required");
  const body = new URLSearchParams();
  body.append("client_id", config.clientId);
  body.append("client_secret", config.clientSecret);
  if (config.grantType === "client_credentials") {
    body.append("grant_type", "client_credentials");
    if (config.scope) body.append("scope", config.scope);
  }
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (data.access_token) {
    const expiresAt = data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined;
    return { accessToken: data.access_token, expiresAt };
  }
  throw new Error(
    data.error_description || data.error || "Failed to get token",
  );
}
