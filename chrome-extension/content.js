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

  function markAgentReady() {
    const existing = document.querySelector('meta[name="quefork-agent"]');
    if (existing) {
      existing.setAttribute("content", "active");
    } else {
      const marker = document.createElement("meta");
      marker.name = "quefork-agent";
      marker.content = "active";
      (document.head || document.documentElement).appendChild(marker);
    }

    if (document.documentElement) {
      document.documentElement.setAttribute("data-quefork-agent", "active");
    }

    publishReadySignal("QUEFORK_AGENT_READY");

    // Notify the web app that extension bridge is active.
    window.dispatchEvent(
      new CustomEvent("quefork-agent-ready", {
        detail: { version: BRIDGE_VERSION },
      }),
    );
  }

  if (document.head || document.documentElement) {
    markAgentReady();
  } else {
    window.addEventListener("DOMContentLoaded", markAgentReady, { once: true });
  }

  // Keep a lightweight heartbeat so pages that initialize late can still detect bridge availability.
  setInterval(() => {
    if (document.documentElement) {
      document.documentElement.setAttribute("data-quefork-agent", "active");
    }
    publishReadySignal("QUEFORK_AGENT_HEARTBEAT");
  }, 5000);

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
})();
