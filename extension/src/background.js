const storage = {
  get: (key) => chrome.storage.local.get(key),
  set: (key, value) => chrome.storage.local.set({ [key]: value }),
};

let enabledEndpoints = [];
let interceptorEnabled = true;
let targetUrls = ['http://localhost:3000']; // default value, now an array

let targets = [];
let activeTargetIndex = 0;
let targetMode = 'active';
let roundRobinIndex = 0;

let requestStats = {};

// Load saved target URLs
chrome.storage.local.get(["targetUrls"], (result) => {
  if (result.targetUrls && result.targetUrls.length > 0) {
    targetUrls = result.targetUrls;
  }
});

// Load configuration
chrome.storage.local.get(["targets", "activeTargetIndex", "targetMode", "requestStats"], (result) => {
  if (result.targets) targets = result.targets;
  if (typeof result.activeTargetIndex === 'number') activeTargetIndex = result.activeTargetIndex;
  if (result.targetMode) targetMode = result.targetMode;
  if (result.requestStats) requestStats = result.requestStats;
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
    chrome.storage.local.set({ interceptorEnabled }, () => {
      sendResponse({ success: true });
    });
    return true; // indicates async response
  }

  // Only intercept if enabled
  if (request.action === "executeRequest" && interceptorEnabled) {
    console.debug("Background received request:", request);

    const targetUrl = getTargetForUrl(request.url);
    if (!targetUrl) {
      sendResponse({
        success: false,
        error: "No target URL configured"
      });
      return true;
    }

    // Update stats before making the request
    updateStats(request.url, targetUrl);

    fetch(`${targetUrl}/api/proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request)
    })
    .then(async (response) => {
      const responseData = await response.json();
      sendResponse({ success: true, response: responseData });
    })
    .catch((error) => {
      console.error("Background fetch error:", error);
      sendResponse({
        success: false,
        error: error.message || "Failed to fetch"
      });
    });

    return true; // Keep message channel open for async response
  }

  if (request.action === "getStats") {
    sendResponse({ stats: requestStats });
    return false;
  }

  return true; // Required for async response
});

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
    case 'pattern':
      // Try to find a matching pattern
      const matchingTarget = targets.find(target => 
        target.pattern && new RegExp(target.pattern).test(requestUrl)
      );
      if (matchingTarget) return matchingTarget.url;
      // Fall through to active if no pattern matches
      
    case 'roundrobin':
      if (targets.length === 0) return null;
      roundRobinIndex = (roundRobinIndex + 1) % targets.length;
      return targets[roundRobinIndex].url;
      
    case 'active':
    default:
      return targets[activeTargetIndex]?.url || null;
  }
}

function updateStats(url, targetUrl) {
  if (!requestStats[url]) {
    requestStats[url] = {
      count: 0,
      lastAccessed: null,
      targets: {}
    };
  }
  
  requestStats[url].count++;
  requestStats[url].lastAccessed = new Date().toISOString();
  
  if (!requestStats[url].targets[targetUrl]) {
    requestStats[url].targets[targetUrl] = 0;
  }
  requestStats[url].targets[targetUrl]++;
  
  chrome.storage.local.set({ requestStats });
}
