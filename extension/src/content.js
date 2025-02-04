// Message retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Track pending requests
const pendingRequests = new Map();

// Establish connection with background script
let port = chrome.runtime.connect({ name: 'content-script' });

// Handle port disconnection and reconnection
port.onDisconnect.addListener(() => {
  console.debug('Port disconnected, attempting reconnect...');
  reconnectPort();
});

function reconnectPort() {
  try {
    port = chrome.runtime.connect({ name: 'content-script' });
    setupPortListeners();
  } catch (e) {
    console.error('Failed to reconnect port:', e);
    setTimeout(reconnectPort, RETRY_DELAY);
  }
}

function setupPortListeners() {
  port.onMessage.addListener((message) => {
    console.debug('Port received message:', message);
    if (message.type === "FROM_EXTENSION") {
      window.postMessage(message, "*");
    }
  });
}

// Helper function to send message with retries
async function sendMessageWithRetry(message, retries = MAX_RETRIES) {
  return new Promise((resolve, reject) => {
    const attemptSend = (attemptNumber) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.debug(`Attempt ${attemptNumber} failed:`, chrome.runtime.lastError);
          if (attemptNumber < retries) {
            setTimeout(() => attemptSend(attemptNumber + 1), RETRY_DELAY);
          } else {
            reject(new Error('Failed to get response after retries'));
          }
          return;
        }
        resolve(response);
      });
    };
    attemptSend(1);
  });
}

// Message handling from page to extension
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;

  try {
    switch (event.data.type) {
      case "DETECT_EXTENSION":
        window.postMessage({ 
          type: "EXTENSION_DETECTED", 
          id: event.data.id 
        }, "*");
        break;

      case "FROM_QUEFORK":
        if (event.data.action === "executeRequest") {
          try {
            const requestId = event.data.id;
            pendingRequests.set(requestId, event.data);
            
            const response = await sendMessageWithRetry(event.data);
            
            window.postMessage({
              type: "FROM_EXTENSION",
              action: "executeResponse",
              id: requestId,
              ...response
            }, "*");
            
            pendingRequests.delete(requestId);
          } catch (error) {
            console.error('Request execution failed:', error);
            window.postMessage({
              type: "FROM_EXTENSION",
              action: "executeResponse",
              id: event.data.id,
              success: false,
              error: error.message
            }, "*");
          }
        }
        break;

      case "INTERCEPTOR_TOGGLE":
        await sendMessageWithRetry({
          action: "toggleInterceptor",
          enabled: event.data.enabled
        });
        break;
    }
  } catch (error) {
    console.error('Message handling failed:', error);
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TO_QUEFORK") {
    window.postMessage({
      type: "FROM_EXTENSION",
      ...request
    }, "*");
    return true;
  }
});

// Inject the script and handle cleanup
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

// Clean up on unload
window.addEventListener('unload', () => {
  port.disconnect();
  pendingRequests.clear();
});

// Initialize
injectScript();
setupPortListeners();

