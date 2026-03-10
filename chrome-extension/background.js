// queFork Agent — Background Service Worker
// Localhost interceptor + CORS proxy for developers

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ── Intercepted request log ──────────────────────────────────────────
const interceptedRequests = [];
const MAX_LOG_SIZE = 500;

function logRequest(entry) {
  interceptedRequests.unshift({
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  if (interceptedRequests.length > MAX_LOG_SIZE)
    interceptedRequests.length = MAX_LOG_SIZE;
  // Notify side panel
  chrome.runtime
    .sendMessage({ type: "REQUEST_LOG_UPDATE", data: interceptedRequests })
    .catch(() => {});
}

// ── Noise request filter ─────────────────────────────────────────────
const NOISE_PATH_RE =
  /^\/(favicon\.(ico|png|svg|jpg)|apple-touch-icon|site\.webmanifest|robots\.txt|@vite|@react-refresh|__vite_ping|src\/.*\.(tsx?|jsx?|css|scss|less|vue|svelte)(\?.*)?|node_modules\/)($|\?)/i;

const NOISE_TYPES = new Set([
  "image",
  "stylesheet",
  "font",
  "media",
  "websocket",
  "csp_report",
  "ping",
]);

function isNoiseRequest(url, type) {
  if (NOISE_TYPES.has(type)) return true;
  try {
    const pathname = new URL(url).pathname;
    return NOISE_PATH_RE.test(pathname);
  } catch {
    return false;
  }
}

// ── Intercept web requests for logging ───────────────────────────────
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    try {
      const url = new URL(details.url);
      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "0.0.0.0" ||
        url.hostname.endsWith(".local")
      ) {
        // Skip logging health check polling from the web app itself
        if (url.pathname === "/health") return;
        // Skip noise: favicons, Vite HMR, static assets
        if (isNoiseRequest(details.url, details.type)) return;
        logRequest({
          url: details.url,
          method: details.method,
          type: details.type,
          tabId: details.tabId,
          initiator: details.initiator || "unknown",
          status: "pending",
        });
      }
    } catch {}
  },
  {
    urls: [
      "http://localhost/*",
      "http://127.0.0.1/*",
      "http://0.0.0.0/*",
      "https://localhost/*",
      "https://127.0.0.1/*",
    ],
  },
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const entry = interceptedRequests.find(
      (r) => r.url === details.url && r.status === "pending",
    );
    if (entry) {
      entry.status = "completed";
      entry.statusCode = details.statusCode;
      chrome.runtime
        .sendMessage({ type: "REQUEST_LOG_UPDATE", data: interceptedRequests })
        .catch(() => {});
    }
  },
  {
    urls: [
      "http://localhost/*",
      "http://127.0.0.1/*",
      "http://0.0.0.0/*",
      "https://localhost/*",
      "https://127.0.0.1/*",
    ],
  },
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    const entry = interceptedRequests.find(
      (r) => r.url === details.url && r.status === "pending",
    );
    if (entry) {
      entry.status = "error";
      entry.error = details.error;
      chrome.runtime
        .sendMessage({ type: "REQUEST_LOG_UPDATE", data: interceptedRequests })
        .catch(() => {});
    }
  },
  {
    urls: [
      "http://localhost/*",
      "http://127.0.0.1/*",
      "http://0.0.0.0/*",
      "https://localhost/*",
      "https://127.0.0.1/*",
    ],
  },
);

// ── Message handlers ─────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // CORS-free proxy request
  if (message.type === "PROXY_REQUEST") {
    handleProxyRequest(message.data)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // Get intercepted requests log
  if (message.type === "GET_REQUEST_LOG") {
    sendResponse({ data: interceptedRequests });
    return true;
  }

  // Clear log
  if (message.type === "CLEAR_REQUEST_LOG") {
    interceptedRequests.length = 0;
    sendResponse({ success: true });
    return true;
  }

  // Get current tab URL
  if (message.type === "GET_TAB_URL") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ url: tabs[0]?.url || "" });
    });
    return true;
  }

  // Set custom proxy configuration
  if (message.type === "SET_PROXY") {
    const { proxyUrl, enabled } = message.data;
    if (enabled && proxyUrl) {
      try {
        const parsed = new URL(proxyUrl);
        chrome.proxy.settings.set(
          {
            value: {
              mode: "fixed_servers",
              rules: {
                singleProxy: {
                  scheme: parsed.protocol.replace(":", ""),
                  host: parsed.hostname,
                  port:
                    parseInt(parsed.port) ||
                    (parsed.protocol === "https:" ? 443 : 80),
                },
                bypassList: ["<local>"],
              },
            },
            scope: "regular",
          },
          () => {
            sendResponse({
              success: true,
              message: `Proxy set to ${proxyUrl}`,
            });
          },
        );
      } catch (e) {
        sendResponse({ error: `Invalid proxy URL: ${e.message}` });
      }
    } else {
      chrome.proxy.settings.set(
        {
          value: { mode: "direct" },
          scope: "regular",
        },
        () => {
          sendResponse({ success: true, message: "Proxy disabled" });
        },
      );
    }
    return true;
  }

  // Get proxy status
  if (message.type === "GET_PROXY") {
    chrome.proxy.settings.get({ incognito: false }, (config) => {
      sendResponse({ config: config.value });
    });
    return true;
  }

  // ── Workspace storage sync ───────────────────────────────────────
  if (message.type === "QUEFORK_STORAGE_SET") {
    const { key, value } = message.data || {};
    if (key && typeof key === "string" && key.startsWith("qf_")) {
      chrome.storage.local.set({ [key]: value }, () => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ error: "Invalid key" });
    }
    return true;
  }

  if (message.type === "QUEFORK_STORAGE_GET") {
    const { key } = message.data || {};
    if (key && typeof key === "string" && key.startsWith("qf_")) {
      chrome.storage.local.get(key, (result) => {
        sendResponse({ value: result[key] ?? null });
      });
    } else {
      sendResponse({ error: "Invalid key" });
    }
    return true;
  }
});

// ── CORS-free proxy handler ──────────────────────────────────────────
async function handleProxyRequest(data) {
  const { url, method, headers, body } = data;

  try {
    const fetchOptions = {
      method: method || "GET",
      headers: headers || {},
    };

    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = body;
    }

    const start = performance.now();
    const response = await fetch(url, fetchOptions);
    const elapsed = Math.round(performance.now() - start);
    const responseBody = await response.text();

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Log proxied request
    logRequest({
      url,
      method: method || "GET",
      type: "proxy",
      status: "completed",
      statusCode: response.status,
      duration: elapsed,
      initiator: "queFork",
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      duration: elapsed,
    };
  } catch (err) {
    logRequest({
      url,
      method: method || "GET",
      type: "proxy",
      status: "error",
      error: err.message,
      initiator: "queFork",
    });

    return {
      error: err.message || "Request failed",
      status: 0,
      statusText: "Error",
      headers: {},
      body: "",
    };
  }
}
