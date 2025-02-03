const storage = {
  get: (key) => chrome.storage.local.get(key),
  set: (key, value) => chrome.storage.local.set({ [key]: value }),
};

const PROTECTED_TARGET = {
  url: "https://quefork.somrit.in",
  pattern: "",
  mode: "active",
  protected: true,
};

let enabledEndpoints = [];
let interceptorEnabled = true;
let targetUrls = ["http://localhost:3000"]; // default value, now an array

let targets = [PROTECTED_TARGET];
let activeTargetIndex = 0;
let targetMode = "active";
let roundRobinIndex = 0;

let requestStats = {};

// Load saved target URLs
chrome.storage.local.get(["targetUrls"], (result) => {
  if (result.targetUrls && result.targetUrls.length > 0) {
    targetUrls = result.targetUrls;
  }
});

// Load configuration
chrome.storage.local.get(
  ["targets", "activeTargetIndex", "targetMode", "requestStats"],
  (result) => {
    if (result.targets) {
      // Ensure protected target is always present
      if (!result.targets.some((t) => t.url === PROTECTED_TARGET.url)) {
        targets = [PROTECTED_TARGET, ...result.targets];
      } else {
        targets = result.targets;
      }
    }
    if (typeof result.activeTargetIndex === "number")
      activeTargetIndex = result.activeTargetIndex;
    if (result.targetMode) targetMode = result.targetMode;
    if (result.requestStats) requestStats = result.requestStats;
  }
);

function updateExtensionBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  chrome.action.setBadgeBackgroundColor({
    color: enabled ? "#4ade80" : "#94a3b8",
  });
}

// Update initial badge state on load
chrome.storage.local.get(["interceptorEnabled"], (result) => {
  if (typeof result.interceptorEnabled === "boolean") {
    interceptorEnabled = result.interceptorEnabled;
  }
  updateExtensionBadge(interceptorEnabled);
});

// Handle opening side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Set default side panel state
chrome.sidePanel.setOptions({
  enabled: true,
  path: 'sidepanel.html'
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateEndpoints") {
    enabledEndpoints = request.endpoints;
    chrome.storage.local.set({ enabledEndpoints }, () => {
      sendResponse({ success: true });
    });
    return true; // indicates async response
  }

  if (request.action === "detectExtension") {
    sendResponse({ detected: true });
    return false; // synchronous response
  }

  if (request.action === "toggleInterceptor") {
    interceptorEnabled = request.enabled;
    // Update the badge immediately
    updateExtensionBadge(interceptorEnabled);

    // Broadcast state change to all extension views
    chrome.runtime.sendMessage({
      action: "interceptorStateChanged",
      enabled: interceptorEnabled,
    });
    // Save state
    chrome.storage.local.set({ interceptorEnabled });
    // Notify web page
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, {
          type: "INTERCEPTOR_STATE_CHANGED",
          enabled: interceptorEnabled,
        });
      });
    });
    sendResponse({ success: true });
    return true;
  }

  // Simplified request handling
  if (request.action === "executeRequest" && interceptorEnabled) {
    console.debug("Background received request:", request);
    const startTime = performance.now();

    // Update stats before making the request
    updateStats(request.url, "interceptor");

    // Direct fetch to the requested URL (can be localhost)
    fetch(request.url, {
      method: request.method || "GET",
      headers: request.headers,
      body: request.method !== "GET" ? JSON.stringify(request.body) : undefined,
    })
      .then(async (response) => {
        const contentType = response.headers.get("content-type");
        let responseData;

        if (contentType?.includes("application/json")) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        // Calculate response size
        const blob = new Blob([JSON.stringify(responseData)]);
        const size = blob.size;

        // Calculate time taken
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Immediately notify popup of stats update
        chrome.runtime.sendMessage({
          action: "statsUpdated",
          stats: requestStats,
        });

        sendResponse({
          success: true,
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseData,
            contentType,
            time: `${Math.round(duration)}ms`,
            size: formatBytes(size),
          },
        });
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        sendResponse({
          success: false,
          error: error.message || "Failed to fetch",
        });
      });

    return true; // Keep channel open for async response
  }

  if (request.action === "getStats") {
    sendResponse({ stats: requestStats });
    return false;
  }

  return true; // Required for async response
});

// Add this helper function
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Load saved endpoints on startup
chrome.storage.local.get(["enabledEndpoints"], (result) => {
  if (result.enabledEndpoints) {
    enabledEndpoints = result.enabledEndpoints;
  }
});

// Load saved state
chrome.storage.local.get(["interceptorEnabled"], (result) => {
  if (typeof result.interceptorEnabled === "boolean") {
    interceptorEnabled = result.interceptorEnabled;
  }
});

function getTargetForUrl(requestUrl) {
  switch (targetMode) {
    case "pattern":
      // Try to find a matching pattern
      const matchingTarget = targets.find(
        (target) =>
          target.pattern && new RegExp(target.pattern).test(requestUrl)
      );
      if (matchingTarget) return matchingTarget.url;
    // Fall through to active if no pattern matches

    case "roundrobin":
      if (targets.length === 0) return null;
      roundRobinIndex = (roundRobinIndex + 1) % targets.length;
      return targets[roundRobinIndex].url;

    case "active":
    default:
      return targets[activeTargetIndex]?.url || null;
  }
}

// Add real-time stats update
function updateStats(url, targetUrl) {
  // Initialize stats object if not exists
  if (!requestStats[url]) {
    requestStats[url] = {
      count: 0,
      lastAccessed: null,
      targets: {},
    };
  }

  // Update counts
  requestStats[url].count = (requestStats[url].count || 0) + 1;
  requestStats[url].lastAccessed = new Date().toISOString();

  // Update target specific counts
  if (!requestStats[url].targets) {
    requestStats[url].targets = {};
  }
  if (!requestStats[url].targets[targetUrl]) {
    requestStats[url].targets[targetUrl] = 0;
  }
  requestStats[url].targets[targetUrl]++;

  // Save to storage and broadcast update
  chrome.storage.local.set({ requestStats }, () => {
    // Broadcast to all extension pages
    chrome.runtime.sendMessage({
      action: "statsUpdated",
      stats: requestStats,
    });
  });
}
