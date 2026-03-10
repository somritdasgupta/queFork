// queFork Agent — Content Script (runs at document_idle — DOM is ready)

(function () {
  const BRIDGE_VERSION = "2.2.0";

  // --- Marker injection (DOM is guaranteed ready at document_idle) ---

  const meta = document.createElement("meta");
  meta.name = "quefork-agent";
  meta.content = "active";
  document.head.appendChild(meta);
  document.documentElement.setAttribute("data-quefork-agent", "active");

  function signalReady(type) {
    window.postMessage({ type, payload: { version: BRIDGE_VERSION } }, "*");
    window.dispatchEvent(
      new CustomEvent("quefork-agent-ready", {
        detail: { version: BRIDGE_VERSION },
      }),
    );
  }

  signalReady("QUEFORK_AGENT_READY");

  // --- Message bridge ---

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

  // --- Heartbeat (re-signals every 5s for late-loading pages) ---

  setInterval(() => signalReady("QUEFORK_AGENT_HEARTBEAT"), 5000);
})();
