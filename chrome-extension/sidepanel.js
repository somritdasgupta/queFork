// queFork Agent — Side Panel UI
// Interceptor + Proxy Settings + Developer Guide

// ── Tab switching ────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// ── Interceptor ──────────────────────────────────────────────────────
let requestLog = [];
let regexMode = false;

function escapeHtml(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function matchesFilter(url, filter) {
  if (!filter) return true;
  if (regexMode) {
    try {
      return new RegExp(filter, "i").test(url);
    } catch {
      return true;
    }
  }
  return url.toLowerCase().includes(filter.toLowerCase());
}

function matchesStatus(entry, statusFilter) {
  if (!statusFilter) return true;
  if (statusFilter === "err") return entry.status === "error";
  if (entry.status !== "completed") return false;
  const code = entry.statusCode;
  switch (statusFilter) {
    case "2xx":
      return code >= 200 && code < 300;
    case "3xx":
      return code >= 300 && code < 400;
    case "4xx":
      return code >= 400 && code < 500;
    case "5xx":
      return code >= 500 && code < 600;
    default:
      return true;
  }
}

function validateRegex(pattern) {
  const errorEl = document.getElementById("regexError");
  if (!regexMode || !pattern) {
    errorEl.textContent = "";
    return;
  }
  try {
    new RegExp(pattern, "i");
    errorEl.textContent = "";
  } catch (e) {
    errorEl.textContent = "Invalid regex: " + e.message.split(": /")[0];
  }
}

function renderRequests() {
  const list = document.getElementById("requestList");
  const filter = document.getElementById("filterInput").value;
  const methodFilter = document.getElementById("filterMethod").value;
  const statusFilter = document.getElementById("filterStatus").value;

  validateRegex(filter);

  const filtered = requestLog.filter((r) => {
    if (!matchesFilter(r.url, filter)) return false;
    if (methodFilter && r.method !== methodFilter) return false;
    if (!matchesStatus(r, statusFilter)) return false;
    return true;
  });

  document.getElementById("requestCount").textContent = filtered.length;

  if (filtered.length === 0) {
    const hasFilter = filter || methodFilter || statusFilter;
    list.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">No requests${hasFilter ? " matching filter" : ""}</p>
        <p class="empty-desc">${hasFilter ? "Try adjusting your filters." : "Requests to localhost will appear here."}</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered
    .map((r) => {
      const time = new Date(r.timestamp).toLocaleTimeString();
      const statusClass =
        r.status === "completed"
          ? r.statusCode < 400
            ? "status-ok"
            : "status-err"
          : r.status === "error"
            ? "status-err"
            : "status-pending";
      const statusText =
        r.status === "completed"
          ? r.statusCode
          : r.status === "error"
            ? "ERR"
            : "...";
      const methodClass = `method-${(r.method || "get").toLowerCase()}`;
      const duration = r.duration ? `${r.duration}ms` : "";

      return `
      <div class="request-item">
        <div class="request-row">
          <span class="method-badge ${methodClass}">${r.method || "GET"}</span>
          <span class="request-url" title="${escapeHtml(r.url)}">${escapeHtml(truncateUrl(r.url))}</span>
          <span class="request-status ${statusClass}">${statusText}</span>
        </div>
        <div class="request-meta">
          <span class="meta-time">${time}</span>
          <span class="meta-type">${r.type || "xhr"}</span>
          ${duration ? `<span class="meta-duration">${duration}</span>` : ""}
          ${r.initiator && r.initiator !== "unknown" ? `<span class="meta-initiator">${escapeHtml(truncateUrl(r.initiator, 30))}</span>` : ""}
          ${r.error ? `<span class="meta-error">${escapeHtml(r.error)}</span>` : ""}
        </div>
      </div>`;
    })
    .join("");
}

function truncateUrl(url, max = 50) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path.length > max ? path.slice(0, max) + "\u2026" : path;
  } catch {
    return url.length > max ? url.slice(0, max) + "\u2026" : url;
  }
}

// Regex toggle
document.getElementById("regexToggle").addEventListener("click", () => {
  regexMode = !regexMode;
  document.getElementById("regexToggle").classList.toggle("active", regexMode);
  document.getElementById("filterInput").placeholder = regexMode
    ? "Regex pattern (e.g. :300[0-9]/api)"
    : "Filter by URL or path...";
  renderRequests();
});

// Export log as JSON
document.getElementById("exportLog").addEventListener("click", () => {
  if (requestLog.length === 0) return;
  const data = JSON.stringify(requestLog, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quefork-interceptor-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Listen for updates from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "REQUEST_LOG_UPDATE") {
    requestLog = msg.data;
    renderRequests();
  }
});

// Initial load
chrome.runtime.sendMessage({ type: "GET_REQUEST_LOG" }, (res) => {
  if (res && res.data) {
    requestLog = res.data;
    renderRequests();
  }
});

// Filter handlers
document
  .getElementById("filterInput")
  .addEventListener("input", renderRequests);
document
  .getElementById("filterMethod")
  .addEventListener("change", renderRequests);
document
  .getElementById("filterStatus")
  .addEventListener("change", renderRequests);
document.getElementById("clearLog").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_REQUEST_LOG" }, () => {
    requestLog = [];
    renderRequests();
  });
});

// ── Proxy Settings ───────────────────────────────────────────────────
let proxyMode = "direct";

document.getElementById("modeDirectBtn").addEventListener("click", () => {
  proxyMode = "direct";
  document.getElementById("modeDirectBtn").classList.add("active");
  document.getElementById("modeProxyBtn").classList.remove("active");
  document.getElementById("proxyUrlGroup").classList.add("hidden");
  document.getElementById("proxyUrlGroup2").classList.add("hidden");
});

document.getElementById("modeProxyBtn").addEventListener("click", () => {
  proxyMode = "proxy";
  document.getElementById("modeProxyBtn").classList.add("active");
  document.getElementById("modeDirectBtn").classList.remove("active");
  document.getElementById("proxyUrlGroup").classList.remove("hidden");
  document.getElementById("proxyUrlGroup2").classList.remove("hidden");
});

// Presets
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("proxyUrlInput").value = btn.dataset.url;
    proxyMode = "proxy";
    document.getElementById("modeProxyBtn").classList.add("active");
    document.getElementById("modeDirectBtn").classList.remove("active");
    document.getElementById("proxyUrlGroup").classList.remove("hidden");
    document.getElementById("proxyUrlGroup2").classList.remove("hidden");
  });
});

// Apply
document.getElementById("applyProxy").addEventListener("click", () => {
  const feedback = document.getElementById("proxyFeedback");
  const proxyUrl = document.getElementById("proxyUrlInput").value.trim();
  const customProxyUrl = document
    .getElementById("customProxyInput")
    .value.trim();

  // Save custom proxy URL to storage for queFork web app
  chrome.storage.local.set({ quefork_custom_proxy: customProxyUrl });

  chrome.runtime.sendMessage(
    {
      type: "SET_PROXY",
      data: { proxyUrl: proxyUrl, enabled: proxyMode === "proxy" },
    },
    (res) => {
      if (res && res.success) {
        feedback.textContent = res.message;
        feedback.className = "feedback-msg success";
        updateProxyStatus();
      } else {
        feedback.textContent = (res && res.error) || "Failed to apply";
        feedback.className = "feedback-msg error";
      }
      setTimeout(() => {
        feedback.textContent = "";
        feedback.className = "feedback-msg";
      }, 3000);
    },
  );
});

// Update status indicator
function updateProxyStatus() {
  chrome.runtime.sendMessage({ type: "GET_PROXY" }, (res) => {
    const statusEl = document.getElementById("proxyStatus");
    const dot = statusEl.querySelector(".status-dot");
    const text = statusEl.querySelector(".status-text");

    if (res && res.config && res.config.mode === "fixed_servers") {
      const proxy = res.config.rules && res.config.rules.singleProxy;
      dot.classList.add("active");
      text.textContent = proxy ? `${proxy.host}:${proxy.port}` : "Proxy Active";
    } else {
      dot.classList.remove("active");
      text.textContent = "Direct";
    }
  });
}

// Load saved settings
chrome.storage.local.get(["quefork_custom_proxy"], (data) => {
  if (data.quefork_custom_proxy) {
    document.getElementById("customProxyInput").value =
      data.quefork_custom_proxy;
  }
});

updateProxyStatus();

// ── Guide section toggle ─────────────────────────────────────────────
document.getElementById("guideToggle").addEventListener("click", () => {
  const section = document.getElementById("guideSection");
  const chevron = document.getElementById("guideChevron");
  section.classList.toggle("collapsed");
  chevron.textContent = section.classList.contains("collapsed")
    ? "\u25B8"
    : "\u25BE";
});
