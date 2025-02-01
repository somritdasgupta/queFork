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
  
  // Get stats for display
  chrome.runtime.sendMessage({ action: "getStats" }, ({ stats }) => {
    targets.forEach((target, index) => {
      const li = document.createElement("li");
      li.style.animation = 'slideIn 0.3s ease-out';
      
      // Calculate total requests for this target
      const totalRequests = Object.values(stats || {}).reduce((sum, urlStats) => {
        return sum + (urlStats.targets[target.url] || 0);
      }, 0);

      // Get last accessed time
      let lastAccessed = null;
      Object.values(stats || {}).forEach(urlStats => {
        if (urlStats.targets[target.url]) {
          const timestamp = new Date(urlStats.lastAccessed);
          if (!lastAccessed || timestamp > lastAccessed) {
            lastAccessed = timestamp;
          }
        }
      });

      li.innerHTML = `
        <div class="target-info">
          <span class="target-url">${target.url}</span>
          ${target.pattern ? `<span class="target-pattern">Pattern: ${target.pattern}</span>` : ''}
          <span class="target-mode">Mode: ${target.mode}</span>
          ${index === activeTargetIndex ? '<span class="active-badge">Active</span>' : ''}
          <div class="target-stats">
            <div class="stat-item">
              <span>Requests:</span>
              <span class="stat-value">${totalRequests}</span>
            </div>
            ${lastAccessed ? `
              <div class="stat-item">
                <span>Last used:</span>
                <span class="stat-value">${timeAgo(lastAccessed)}</span>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="target-actions">
          <button class="set-active" data-index="${index}">Set Active</button>
          <button class="remove-target" data-index="${index}">Remove</button>
        </div>
      `;
      list.appendChild(li);
    });
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
  
  try {
    new URL(url);
    targets.push({ url, pattern, mode });
    
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
    if (!isNaN(index)) {
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
  if (result.targets) targets = result.targets;
  if (typeof result.activeTargetIndex === 'number') activeTargetIndex = result.activeTargetIndex;
  if (result.targetMode) targetMode = result.targetMode;
  updateLists();
});

function updateEndpointList() {
  const list = document.getElementById("endpointList")
  list.innerHTML = ""
  endpoints.forEach((endpoint, index) => {
    const li = document.createElement("li")
    li.style.animation = 'slideIn 0.3s ease-out';
    li.innerHTML = `
      <span>${endpoint}</span>
      <button data-index="${index}">Remove</button>
    `;
    list.appendChild(li)
  })
}

function addEndpoint() {
  const input = document.getElementById("endpoint")
  const endpoint = input.value.trim()
  
  if (!endpoint) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 1000);
    return;
  }
  
  if (endpoints.includes(endpoint)) {
    input.classList.add('warning');
    setTimeout(() => input.classList.remove('warning'), 1000);
    return;
  }
  
  endpoints.push(endpoint)
  chrome.runtime.sendMessage({ action: "updateEndpoints", endpoints }, () => {
    input.value = ""
    input.classList.add('success');
    setTimeout(() => input.classList.remove('success'), 1000);
    updateEndpointList()
  })
}

function removeEndpoint(index) {
  const li = document.querySelector(`#endpointList li:nth-child(${index + 1})`);
  if (!li) return;
  
  li.style.animation = 'slideOut 0.3s ease-out';
  li.addEventListener('animationend', () => {
    endpoints.splice(index, 1);
    chrome.runtime.sendMessage({ action: "updateEndpoints", endpoints }, () => {
      updateEndpointList();
    });
  });
}

// Use event delegation for remove buttons
document.getElementById("endpointList").addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") {
    const index = parseInt(e.target.dataset.index);
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

