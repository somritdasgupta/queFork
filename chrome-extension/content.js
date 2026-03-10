// queFork Agent — Content Script
// Injects a marker so the web app can detect the extension is installed & active.

(function () {
  const BRIDGE_VERSION = "2.1.0";

  function publishReadySignal(type) {
    window.postMessage(
      {
        type,
        payload: { version: BRIDGE_VERSION },
      },
      "*",
    );
  }

  function upsertMetaMarker() {
    const existing = document.querySelector('meta[name="quefork-agent"]');
    if (existing) {
      existing.setAttribute("content", "active");
      return true;
    }

    const parent = document.head || document.documentElement;
    if (!parent) return false;

    const marker = document.createElement("meta");
    marker.name = "quefork-agent";
    marker.content = "active";
    parent.appendChild(marker);
    return true;
  }

  function setRootMarker() {
    if (document.documentElement) {
      document.documentElement.setAttribute("data-quefork-agent", "active");
      return true;
    }
    return false;
  }

  function markAgentReady(signalType = "QUEFORK_AGENT_READY") {
    const markerOk = upsertMetaMarker();
    const rootOk = setRootMarker();

    if (!markerOk && !rootOk) return false;

    publishReadySignal(signalType);

    // Notify the web app that extension bridge is active.
    window.dispatchEvent(
      new CustomEvent("quefork-agent-ready", {
        detail: { version: BRIDGE_VERSION },
      }),
    );

    return true;
  }

  function ensureReadyMarkersEventually() {
    if (markAgentReady()) return;

    const tryReady = () => {
      if (!markAgentReady()) return;

      window.removeEventListener("DOMContentLoaded", tryReady);
      window.removeEventListener("load", tryReady);
      observer.disconnect();
    };

    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", tryReady, { once: true });
      window.addEventListener("load", tryReady, { once: true });
    }

    const observer = new MutationObserver(() => {
      tryReady();
    });

    observer.observe(document, {
      childList: true,
      subtree: true,
    });

    // Safety stop to avoid observing forever on unsupported pages.
    setTimeout(() => observer.disconnect(), 10000);
  }

  // Listen for proxy requests from the web app
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "QUEFORK_AGENT_PING") {
      window.postMessage(
        {
          type: "QUEFORK_AGENT_PONG",
          id: data.id,
          payload: { version: BRIDGE_VERSION },
        },
        "*",
      );
      return;
    }

    if (data.type === "QUEFORK_PROXY_REQUEST") {
      chrome.runtime.sendMessage(
        { type: "PROXY_REQUEST", data: data.payload },
        (response) => {
          const payload = chrome.runtime.lastError
            ? {
                error: chrome.runtime.lastError.message || "Bridge unavailable",
                status: 0,
              }
            : response;

          window.postMessage(
            { type: "QUEFORK_PROXY_RESPONSE", id: data.id, payload },
            "*",
          );
        },
      );
    }
  });

  ensureReadyMarkersEventually();

  // Keep a lightweight heartbeat so pages that initialize late can still detect bridge availability.
  setInterval(() => {
    markAgentReady("QUEFORK_AGENT_HEARTBEAT");
  }, 5000);
})();
