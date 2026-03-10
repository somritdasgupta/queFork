// queFork Agent — Content Script
// Injects a marker so the web app can detect the extension is installed & active.

(function() {
  function markAgentReady() {
    const existing = document.querySelector('meta[name="quefork-agent"]');
    if (existing) {
      existing.setAttribute('content', 'active');
    } else {
      const marker = document.createElement('meta');
      marker.name = 'quefork-agent';
      marker.content = 'active';
      (document.head || document.documentElement).appendChild(marker);
    }

    // Notify the web app that extension bridge is active.
    window.dispatchEvent(
      new CustomEvent('quefork-agent-ready', { detail: { version: '2.1.0' } }),
    );
  }

  if (document.head || document.documentElement) {
    markAgentReady();
  } else {
    window.addEventListener('DOMContentLoaded', markAgentReady, { once: true });
  }

  // Listen for proxy requests from the web app
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data?.type === 'QUEFORK_AGENT_PING') {
      window.postMessage(
        {
          type: 'QUEFORK_AGENT_PONG',
          id: event.data.id,
          payload: { version: '2.1.0' },
        },
        '*',
      );
      return;
    }

    if (event.data?.type === 'QUEFORK_PROXY_REQUEST') {
      chrome.runtime.sendMessage(
        { type: 'PROXY_REQUEST', data: event.data.payload },
        (response) => {
          window.postMessage({ type: 'QUEFORK_PROXY_RESPONSE', id: event.data.id, payload: response }, '*');
        }
      );
    }
  });
})();
