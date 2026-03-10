// queFork Agent — Side Panel UI
// Localhost interceptor log + Proxy settings

// ── Tab switching ────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Interceptor ──────────────────────────────────────────────────────
let requestLog = [];

function renderRequests() {
  const list = document.getElementById('requestList');
  const filter = document.getElementById('filterInput').value.toLowerCase();
  const methodFilter = document.getElementById('filterMethod').value;

  const filtered = requestLog.filter(r => {
    if (filter && !r.url.toLowerCase().includes(filter)) return false;
    if (methodFilter && r.method !== methodFilter) return false;
    return true;
  });

  document.getElementById('requestCount').textContent = filtered.length;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">No requests${filter || methodFilter ? ' matching filter' : ''}</p>
        <p class="empty-desc">Requests to localhost will appear here automatically.</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(r => {
    const time = new Date(r.timestamp).toLocaleTimeString();
    const statusClass = r.status === 'completed'
      ? (r.statusCode < 400 ? 'status-ok' : 'status-err')
      : r.status === 'error' ? 'status-err' : 'status-pending';
    const statusText = r.status === 'completed' ? r.statusCode : r.status === 'error' ? 'ERR' : '...';
    const methodClass = `method-${(r.method || 'get').toLowerCase()}`;
    const duration = r.duration ? `${r.duration}ms` : '';

    return `
      <div class="request-item">
        <div class="request-row">
          <span class="method-badge ${methodClass}">${r.method || 'GET'}</span>
          <span class="request-url" title="${r.url}">${truncateUrl(r.url)}</span>
          <span class="request-status ${statusClass}">${statusText}</span>
        </div>
        <div class="request-meta">
          <span class="meta-time">${time}</span>
          <span class="meta-type">${r.type || 'xhr'}</span>
          ${duration ? `<span class="meta-duration">${duration}</span>` : ''}
          ${r.initiator && r.initiator !== 'unknown' ? `<span class="meta-initiator">${truncateUrl(r.initiator, 30)}</span>` : ''}
          ${r.error ? `<span class="meta-error">${r.error}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

function truncateUrl(url, max = 50) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path.length > max ? path.slice(0, max) + '...' : path;
  } catch {
    return url.length > max ? url.slice(0, max) + '...' : url;
  }
}

// Listen for updates from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'REQUEST_LOG_UPDATE') {
    requestLog = msg.data;
    renderRequests();
  }
});

// Initial load
chrome.runtime.sendMessage({ type: 'GET_REQUEST_LOG' }, (res) => {
  if (res && res.data) {
    requestLog = res.data;
    renderRequests();
  }
});

// Filter handlers
document.getElementById('filterInput').addEventListener('input', renderRequests);
document.getElementById('filterMethod').addEventListener('change', renderRequests);
document.getElementById('clearLog').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_REQUEST_LOG' }, () => {
    requestLog = [];
    renderRequests();
  });
});

// ── Proxy Settings ───────────────────────────────────────────────────
let proxyMode = 'direct';

document.getElementById('modeDirectBtn').addEventListener('click', () => {
  proxyMode = 'direct';
  document.getElementById('modeDirectBtn').classList.add('active');
  document.getElementById('modeProxyBtn').classList.remove('active');
  document.getElementById('proxyUrlGroup').style.display = 'none';
  document.getElementById('proxyUrlGroup2').style.display = 'none';
});

document.getElementById('modeProxyBtn').addEventListener('click', () => {
  proxyMode = 'proxy';
  document.getElementById('modeProxyBtn').classList.add('active');
  document.getElementById('modeDirectBtn').classList.remove('active');
  document.getElementById('proxyUrlGroup').style.display = 'block';
  document.getElementById('proxyUrlGroup2').style.display = 'block';
});

// Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('proxyUrlInput').value = btn.dataset.url;
    proxyMode = 'proxy';
    document.getElementById('modeProxyBtn').classList.add('active');
    document.getElementById('modeDirectBtn').classList.remove('active');
    document.getElementById('proxyUrlGroup').style.display = 'block';
    document.getElementById('proxyUrlGroup2').style.display = 'block';
  });
});

// Apply
document.getElementById('applyProxy').addEventListener('click', () => {
  const feedback = document.getElementById('proxyFeedback');
  const proxyUrl = document.getElementById('proxyUrlInput').value.trim();
  const customProxyUrl = document.getElementById('customProxyInput').value.trim();

  // Save custom proxy URL to storage for queFork web app
  chrome.storage.local.set({ quefork_custom_proxy: customProxyUrl });

  chrome.runtime.sendMessage({
    type: 'SET_PROXY',
    data: { proxyUrl: proxyUrl, enabled: proxyMode === 'proxy' },
  }, (res) => {
    if (res && res.success) {
      feedback.textContent = res.message;
      feedback.className = 'feedback-msg success';
      updateProxyStatus();
    } else {
      feedback.textContent = (res && res.error) || 'Failed to apply';
      feedback.className = 'feedback-msg error';
    }
    setTimeout(() => { feedback.textContent = ''; feedback.className = 'feedback-msg'; }, 3000);
  });
});

// Update status indicator
function updateProxyStatus() {
  chrome.runtime.sendMessage({ type: 'GET_PROXY' }, (res) => {
    const statusEl = document.getElementById('proxyStatus');
    const dot = statusEl.querySelector('.status-dot');
    const text = statusEl.querySelector('.status-text');

    if (res && res.config && res.config.mode === 'fixed_servers') {
      const proxy = res.config.rules && res.config.rules.singleProxy;
      dot.classList.add('active');
      text.textContent = proxy ? `${proxy.host}:${proxy.port}` : 'Proxy Active';
    } else {
      dot.classList.remove('active');
      text.textContent = 'Direct';
    }
  });
}

// Load saved settings
chrome.storage.local.get(['quefork_custom_proxy'], (data) => {
  if (data.quefork_custom_proxy) {
    document.getElementById('customProxyInput').value = data.quefork_custom_proxy;
  }
});

updateProxyStatus();
