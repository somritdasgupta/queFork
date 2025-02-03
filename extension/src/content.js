// Listen for detection messages
window.addEventListener("message", (event) => {
  if (event.source !== window) return

  if (event.data.type === "DETECT_EXTENSION") {
    // Respond to the detection message
    window.postMessage({ type: "EXTENSION_DETECTED", id: event.data.id }, "*")
  } else if (event.data.type === "FROM_QUEFORK") {
    // Handle request interception
    chrome.runtime.sendMessage(event.data, (response) => {
      window.postMessage({ type: "FROM_EXTENSION", ...response, id: event.data.id }, "*")
    })
  } else if (event.data.type === "INTERCEPTOR_TOGGLE") {
    chrome.runtime.sendMessage({ 
      action: "toggleInterceptor", 
      enabled: event.data.enabled 
    })
  }
})

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TO_QUEFORK") {
    window.postMessage({ 
      type: "FROM_EXTENSION", 
      ...request 
    }, "*")
    return true // Keep message channel open for async response
  }
})

// Update request handling
window.addEventListener("message", (event) => {
  if (event.source !== window) return

  if (event.data.type === "FROM_QUEFORK" && event.data.action === "executeRequest") {
    console.debug('Content script received request:', event.data)
    
    chrome.runtime.sendMessage(event.data, (response) => {
      console.debug('Content script received response:', response)
      
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError)
        window.postMessage({ 
          type: "FROM_EXTENSION", 
          action: "executeResponse",
          id: event.data.id,
          error: chrome.runtime.lastError.message 
        }, "*")
        return
      }

      window.postMessage({ 
        type: "FROM_EXTENSION", 
        action: "executeResponse",
        id: event.data.id,
        ...response 
      }, "*")
    })
    return true // Keep message channel open
  }
})

// Replace inline script injection with external script
const injectScript = () => {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
};

injectScript();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INTERCEPTOR_STATE_CHANGED") {
    // Forward to webpage
    window.postMessage({
      type: "INTERCEPTOR_STATE_CHANGED",
      enabled: message.enabled
    }, "*");
  }
});

// Listen for messages from webpage
window.addEventListener("message", (event) => {
  if (event.data.type === "INTERCEPTOR_TOGGLE") {
    // Forward to background script
    chrome.runtime.sendMessage({
      action: "toggleInterceptor",
      enabled: event.data.enabled
    });
  }
});

