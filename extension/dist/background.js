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
    }).catch(console.debug); // Handle potential errors

    // Save state
    chrome.storage.local.set({ interceptorEnabled });
    // Notify web pages with error handling
    broadcastToTabs({
      type: "INTERCEPTOR_STATE_CHANGED",
      enabled: interceptorEnabled,
    });

    sendResponse({ success: true });
    return true;
  }

  // Simplified request handling
  if (request.action === "executeRequest" && interceptorEnabled) {
    handleRequest(request, sendResponse);
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
  try {
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
      broadcastMessage({
        action: "statsUpdated",
        stats: requestStats,
      });
    });
  } catch (e) {
    console.error("Failed to update stats:", e);
  }
}

// Helper function to safely send messages to tabs
async function sendMessageToTab(tabId, message) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    console.debug(`Failed to send message to tab ${tabId}:`, error);
    return null;
  }
}

// Helper function to broadcast message to all tabs
async function broadcastToTabs(message) {
  const tabs = await chrome.tabs.query({});
  const sendPromises = tabs.map(tab => sendMessageToTab(tab.id, message));
  await Promise.allSettled(sendPromises);
}

// Add connection handling for reliable communication
chrome.runtime.onConnect.addListener((port) => {
  console.debug('New connection established');
  
  port.onDisconnect.addListener(() => {
    console.debug('Connection disconnected');
  });
  
  port.onMessage.addListener((msg) => {
    console.debug('Received message on port:', msg);
  });
});

// Listen for tab updates to ensure content scripts are ready
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.debug('Tab ready:', tabId);
  }
});

// Keep track of connected ports
const connectedPorts = new Set();

// Connection management
chrome.runtime.onConnect.addListener((port) => {
  connectedPorts.add(port);
  
  port.onDisconnect.addListener(() => {
    connectedPorts.delete(port);
  });
});

// Safe message broadcasting
async function broadcastMessage(message) {
  try {
    // Send to connected ports
    connectedPorts.forEach(port => {
      try {
        port.postMessage(message);
      } catch (e) {
        console.debug('Failed to send message to port:', e);
      }
    });

    // Send to tabs with error handling
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(async tab => {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch (e) {
        // Ignore errors for tabs that can't receive messages
        console.debug(`Tab ${tab.id} not ready for messages`);
      }
    }));
  } catch (e) {
    console.debug('Broadcast failed:', e);
  }
}

// Separate request handling logic
async function handleRequest(request, sendResponse) {
  try {
    console.debug("Processing request:", request);
    const startTime = performance.now();
    
    // Make the fetch request
    const response = await fetch(request.url, {
      method: request.method || "GET",
      headers: request.headers,
      body: request.method !== "GET" ? JSON.stringify(request.body) : undefined,
    });

    // Process response
    const contentType = response.headers.get("content-type");
    const responseData = contentType?.includes("application/json") 
      ? await response.json()
      : await response.text();

    // Calculate metrics
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    const size = new Blob([JSON.stringify(responseData)]).size;

    // Update stats safely
    updateStats(request.url, request.targetUrl);
    
    // Send response
    sendResponse({
      success: true,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData,
        contentType,
        time: `${duration}ms`,
        size: formatBytes(size),
      },
    });
  } catch (error) {
    console.error("Request failed:", error);
    sendResponse({
      success: false,
      error: error.message || "Request failed",
    });
  }
}

// Initialize connection tracking on startup
chrome.runtime.onInstalled.addListener(() => {
  console.debug('Extension installed/updated');
  connectedPorts.clear();
});
