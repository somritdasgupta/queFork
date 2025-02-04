let endpoints = [];
let targets = [];
let activeTargetIndex = 0;
let targetMode = 'active'; // 'active', 'roundrobin', or 'pattern'

// Initialize both lists
function updateLists() {
  updateEndpointList();
  updateTargetList();
}

function updateTargetList() {
  const list = document.getElementById("targetList");
  list.innerHTML = "";
  
  chrome.runtime.sendMessage({ action: "getStats" }, ({ stats }) => {
    targets.forEach((target, index) => {
      const li = document.createElement("li");
      li.classList.add('slide-in');
      if (target.protected) {
        li.classList.add('protected-target');
      }
      
      const totalRequests = Object.values(stats || {}).reduce((sum, urlStats) => {
        return sum + (urlStats.targets[target.url] || 0);
      }, 0);

      li.innerHTML = `
        <div class="target-info">
          <span class="target-url">${target.url}</span>
          ${target.pattern ? `<span class="target-pattern" title="Pattern"><i data-feather="filter"></i></span>` : ''}
          ${target.protected ? `<span class="protected-badge" title="Protected Target"><i data-feather="lock"></i></span>` : ''}
          ${index === activeTargetIndex ? '<span class="active-badge" title="Active Target"><i data-feather="check-circle"></i></span>' : ''}
        </div>
        <div class="target-actions">
          <button class="set-active" title="Set Active" data-index="${index}"><i data-feather="check"></i></button>
          ${!target.protected ? `<button class="remove-target" title="Remove" data-index="${index}"><i data-feather="trash-2"></i></button>` : ''}
        </div>
      `;
      list.appendChild(li);
    });
    
    feather.replace();
  });

  // Update current target display in info section
  const currentTargetDisplay = document.getElementById("currentTarget");
  if (currentTargetDisplay) {
    const activeTarget = targets[activeTargetIndex];
    currentTargetDisplay.innerHTML = `
      <span class="info-label">Current Target:</span>
      <span class="info-value">${activeTarget ? activeTarget.url : 'Not set'}</span>
    `;
  }
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}

function addTarget() {
  const urlInput = document.getElementById("targetUrl");
  const patternInput = document.getElementById("targetPattern");
  const modeSelect = document.getElementById("targetMode");
  
  const url = urlInput.value.trim();
  const pattern = patternInput.value.trim();
  const mode = modeSelect.value;
  
  if (!url) {
    urlInput.classList.add('error');
    setTimeout(() => urlInput.classList.remove('error'), 1000);
    return;
  }

  // Check for duplicate URLs
  if (targets.some(target => target.url.toLowerCase() === url.toLowerCase())) {
    urlInput.classList.add('warning');
    setTimeout(() => urlInput.classList.remove('warning'), 1000);
    toast('URL already exists in targets');
    return;
  }
  
  try {
    new URL(url);
    targets.push({ url, pattern, mode, protected: false });
    
    // Set as active if it's the first target or mode is 'active'
    if (targets.length === 1 || mode === 'active') {
      activeTargetIndex = targets.length - 1;
    }
    
    chrome.storage.local.set({ 
      targets,
      activeTargetIndex,
      targetMode: mode 
    }, () => {
      urlInput.value = "";
      patternInput.value = "";
      urlInput.classList.add('success');
      setTimeout(() => urlInput.classList.remove('success'), 1000);
      updateTargetList();
    });
  } catch (e) {
    urlInput.classList.add('error');
    setTimeout(() => urlInput.classList.remove('error'), 1000);
  }
}

// Event listeners for targets
document.getElementById("saveTarget").addEventListener("click", addTarget);
document.getElementById("targetUrl").addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTarget();
});

document.getElementById("targetList").addEventListener("click", (e) => {
  if (e.target.classList.contains("set-active")) {
    const index = parseInt(e.target.dataset.index);
    if (!isNaN(index)) {
      activeTargetIndex = index;
      targetMode = 'active';
      chrome.storage.local.set({ activeTargetIndex, targetMode }, updateTargetList);
    }
  } else if (e.target.classList.contains("remove-target")) {
    const index = parseInt(e.target.dataset.index);
    if (!isNaN(index) && !targets[index].protected) {
      targets.splice(index, 1);
      if (activeTargetIndex >= index) {
        activeTargetIndex = Math.max(0, activeTargetIndex - 1);
      }
      chrome.storage.local.set({ targets, activeTargetIndex }, updateTargetList);
    }
  }
});

// Load saved data
chrome.storage.local.get(["enabledEndpoints", "targets", "activeTargetIndex", "targetMode"], (result) => {
  if (result.enabledEndpoints) {
    endpoints = result.enabledEndpoints;
  }
  
  // Ensure protected target is always present and first
  const protectedTarget = {
    url: 'https://quefork.somrit.in',
    pattern: '',
    mode: 'active',
    protected: true
  };

  if (result.targets) {
    // Filter out any existing protected target to avoid duplicates
    const filteredTargets = result.targets.filter(t => t.url !== protectedTarget.url);
    // Add protected target at the beginning
    targets = [protectedTarget, ...filteredTargets];
  } else {
    targets = [protectedTarget];
  }

  if (typeof result.activeTargetIndex === 'number') activeTargetIndex = result.activeTargetIndex;
  if (result.targetMode) targetMode = result.targetMode;
  updateLists();
});

function isValidUrl(urlString) {
  try {
    // Check if it's a valid URL pattern with wildcards
    if (urlString.includes('*')) {
      // Convert wildcard pattern to regex pattern
      const regexPattern = urlString
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test('test.example.com');
    }
    // Check if it's a valid URL
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
}

// Update the updateEndpointList function to use consistent button styling
function updateEndpointList() {
  const list = document.getElementById("endpointList");
  list.innerHTML = "";
  endpoints.forEach((endpoint, index) => {
    const li = document.createElement("li");
    li.classList.add('slide-in');
    li.innerHTML = `
      <div class="endpoint-info">
        <span class="endpoint-url">${endpoint}</span>
      </div>
      <div class="endpoint-actions">
        <button class="remove-endpoint" title="Remove" data-index="${index}">
          <i data-feather="trash-2"></i>
        </button>
      </div>
    `;
    list.appendChild(li);
  });
  feather.replace();
}

function addEndpoint() {
  const input = document.getElementById("endpoint");
  const submitBtn = document.getElementById("add");
  const endpoint = input.value.trim();
  
  if (!endpoint) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 1000);
    return;
  }
  
  if (!isValidUrl(endpoint)) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 1000);
    return;
  }
  
  if (endpoints.includes(endpoint)) {
    input.classList.add('warning');
    setTimeout(() => input.classList.remove('warning'), 1000);
    return;
  }
  
  endpoints.push(endpoint);
  chrome.runtime.sendMessage({ action: "updateEndpoints", endpoints }, () => {
    input.value = "";
    input.classList.add('success');
    setTimeout(() => input.classList.remove('success'), 1000);
    updateEndpointList();
  });
}

// Add URL validation to target URL input
document.getElementById("targetUrl").addEventListener('input', (e) => {
  const submitBtn = document.getElementById("saveTarget");
  const url = e.target.value.trim();
  
  try {
    new URL(url);
    submitBtn.disabled = false;
    e.target.classList.remove('error');
  } catch (err) {
    submitBtn.disabled = true;
    if (url && !e.target.classList.contains('error')) {
      e.target.classList.add('error');
    }
  }
});

// Add URL validation to endpoint input
document.getElementById("endpoint").addEventListener('input', (e) => {
  const submitBtn = document.getElementById("add");
  const url = e.target.value.trim();
  
  if (isValidUrl(url)) {
    submitBtn.disabled = false;
    e.target.classList.remove('error');
  } else {
    submitBtn.disabled = true;
    if (url && !e.target.classList.contains('error')) {
      e.target.classList.add('error');
    }
  }
});

// Update the removeEndpoint function for better cleanup
function removeEndpoint(index) {
  endpoints.splice(index, 1);

  // First update chrome.storage
  chrome.storage.local.set({ enabledEndpoints: endpoints }, () => {
    // Then notify background script
    chrome.runtime.sendMessage({ action: "updateEndpoints", endpoints }, () => {
      // Finally update UI
      updateEndpointList();
    });
  });
}

// Update click handler for endpoint removal
document.getElementById("endpointList").addEventListener("click", (e) => {
  // Find the closest button with remove-endpoint class
  const button = e.target.closest('.remove-endpoint');
  if (button) {
    const index = parseInt(button.dataset.index);
    if (!isNaN(index)) {
      removeEndpoint(index);
    }
  }
});

document.getElementById("add").addEventListener("click", addEndpoint)

// Handle enter key in input
document.getElementById("endpoint").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addEndpoint();
  }
});

chrome.storage.local.get(["enabledEndpoints"], (result) => {
  if (result.enabledEndpoints) {
    endpoints = result.enabledEndpoints
    updateEndpointList()
  }
})

// Initialize feather icons after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Feather Icons script to be available
  const checkFeather = setInterval(() => {
    if (window.feather) {
      clearInterval(checkFeather);
      feather.replace();
    }
  }, 50);
  
  // Timeout after 2 seconds if script doesn't load
  setTimeout(() => clearInterval(checkFeather), 2000);
});

// Add this function to update UI elements based on interceptor state
function updateInterceptorUI(enabled) {
  const statusIndicator = document.getElementById('statusIndicator');
  if (statusIndicator) {
    statusIndicator.className = `status-indicator ${enabled ? 'active' : 'inactive'}`;
    statusIndicator.title = `Interceptor ${enabled ? 'Enabled' : 'Disabled'}`;
  }
}

// Add this to your initialization code
chrome.storage.local.get(["interceptorEnabled"], (result) => {
  const enabled = result.interceptorEnabled ?? true; // default to true if not set
  updateInterceptorUI(enabled);
});

// Listen for interceptor state changes
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "interceptorStateChanged") {
    updateInterceptorUI(message.enabled);
  }
});

// Update toast function to use classes only
function toast(message) {
  const toast = document.createElement('div');
  toast.className = 'warning-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

