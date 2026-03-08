// queFork Agent — Content Script
// Injects a marker so the web app can detect the extension is installed & active.

(function() {
  // Set a global marker the web app can check
  const marker = document.createElement('meta');
  marker.name = 'quefork-agent';
  marker.content = 'active';
  document.head.appendChild(marker);

  // Also dispatch a custom event the web app can listen for
  window.dispatchEvent(new CustomEvent('quefork-agent-ready', { detail: { version: '2.0.0' } }));

  // Listen for proxy requests from the web app
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
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
