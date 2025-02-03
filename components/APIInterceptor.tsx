import { useEffect, useState, useCallback } from "react";

interface APIInterceptorProps {
  onRequestIntercept: (request: any) => Promise<any>;
}

interface InterceptorResult {
  hasExtension: boolean;
  interceptorEnabled: boolean; 
  toggleInterceptor: () => void;
  interceptRequest: (request: any) => Promise<any>;
  testInterceptor: () => Promise<boolean>;
}

export const useAPIInterceptor = ({
  onRequestIntercept,
}: APIInterceptorProps): InterceptorResult => {
  const [hasExtension, setHasExtension] = useState(false);
  const [interceptorEnabled, setInterceptorEnabled] = useState(true); // Default value without localStorage

  useEffect(() => {
    // Load saved state from localStorage only on client side
    const saved = window?.localStorage?.getItem("interceptorEnabled");
    if (saved !== null) {
      setInterceptorEnabled(saved === "true");
    }
  }, []);

  const toggleInterceptor = useCallback(() => {
    setInterceptorEnabled((prev) => {
      const newState = !prev;
      // Safe localStorage access
      if (typeof window !== 'undefined') {
        window.localStorage.setItem("interceptorEnabled", String(newState));
      }
      // Notifying extension of state change
      window.postMessage(
        {
          type: "INTERCEPTOR_TOGGLE",
          enabled: newState,
        },
        "*"
      );
      // Also send to extension background script
      chrome.runtime?.sendMessage?.({
        action: "toggleInterceptor",
        enabled: newState,
      });
      return newState;
    });
  }, []);

  const testInterceptor = async (): Promise<boolean> => {
    try {
      const testResponse = await interceptRequest({
        method: "GET",
        url: "http://example.com/test",
        headers: { "X-Test-Header": "test" },
      });

      // Check if the request was intercepted and redirected to localhost
      return testResponse.intercepted === true;
    } catch (error) {
      console.error("Interceptor test failed:", error);
      return false;
    }
  };

  useEffect(() => {
    // Load saved state
    const savedState = localStorage.getItem("interceptorEnabled");
    if (savedState) {
      setInterceptorEnabled(savedState === "true");
    }

    const detectExtension = () => {
      const detectionId = `detect_${Date.now()}`;

      const handleDetectionResponse = (event: MessageEvent) => {
        if (
          event.data.type === "EXTENSION_DETECTED" &&
          event.data.id === detectionId
        ) {
          setHasExtension(true);
          window.removeEventListener("message", handleDetectionResponse);
        }
      };

      window.addEventListener("message", handleDetectionResponse);
      window.postMessage({ type: "DETECT_EXTENSION", id: detectionId }, "*");

      setTimeout(() => {
        window.removeEventListener("message", handleDetectionResponse);
      }, 1000);
    };

    detectExtension();

    const handleExtensionMessage = async (event: MessageEvent) => {
      if (event.source !== window) return;
      if (
        event.data.type === "FROM_EXTENSION" &&
        event.data.action === "executeRequest"
      ) {
        try {
          const response = await onRequestIntercept(event.data);
          window.postMessage(
            { type: "TO_EXTENSION", action: "executeResponse", response },
            "*"
          );
        } catch (error) {
          window.postMessage(
            {
              type: "TO_EXTENSION",
              action: "executeResponse",
              error: error instanceof Error ? error.message : "Unknown error",
            },
            "*"
          );
        }
      }
    };

    window.addEventListener("message", handleExtensionMessage);

    return () => {
      window.removeEventListener("message", handleExtensionMessage);
    };
  }, [onRequestIntercept]);

  useEffect(() => {
    // Check extension status periodically
    const checkExtension = () => {
      const detectionId = `detect_${Date.now()}`;
      let detected = false;

      const handleDetectionResponse = (event: MessageEvent) => {
        if (
          event.data.type === "EXTENSION_DETECTED" &&
          event.data.id === detectionId
        ) {
          detected = true;
          setHasExtension(true);
        }
      };

      window.addEventListener("message", handleDetectionResponse);
      window.postMessage({ type: "DETECT_EXTENSION", id: detectionId }, "*");

      // If no response in 500ms, assume extension is not available
      setTimeout(() => {
        window.removeEventListener("message", handleDetectionResponse);
        if (!detected) {
          setHasExtension(false);
          setInterceptorEnabled(false);
        }
      }, 500);
    };

    // Check every 2 seconds
    const interval = setInterval(checkExtension, 2000);
    checkExtension(); // Initial check

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Listen for interceptor state changes from extension
    const handleExtensionStateChange = (event: MessageEvent) => {
      if (event.data.type === "INTERCEPTOR_STATE_CHANGED") {
        setInterceptorEnabled(event.data.enabled);
        localStorage.setItem("interceptorEnabled", String(event.data.enabled));
      }
    };

    window.addEventListener("message", handleExtensionStateChange);
    return () =>
      window.removeEventListener("message", handleExtensionStateChange);
  }, []);

  const interceptRequest = async (request: any) => {
    if (!hasExtension) {
      return await fallbackToProxy(request);
    }

    return new Promise((resolve, reject) => {
      const requestId = `request_${Date.now()}`;
      let timeout: NodeJS.Timeout;

      const handleResponse = (event: MessageEvent) => {
        if (event.source !== window) return;

        if (
          event.data.type === "FROM_EXTENSION" &&
          event.data.action === "executeResponse" &&
          event.data.id === requestId
        ) {
          clearTimeout(timeout);
          window.removeEventListener("message", handleResponse);

          if (event.data.error) {
            console.warn(
              "Extension failed, falling back to proxy:",
              event.data.error
            );
            fallbackToProxy(request).then(resolve).catch(reject);
          } else {
            resolve(event.data.response);
          }
        }
      };

      window.addEventListener("message", handleResponse);

      // Send request directly to extension
      window.postMessage(
        {
          type: "FROM_QUEFORK",
          action: "executeRequest",
          id: requestId,
          ...request,
        },
        "*"
      );

      // Set timeout and fallback to proxy
      timeout = setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        console.warn("Extension timeout, falling back to proxy");
        fallbackToProxy(request).then(resolve).catch(reject);
      }, 5000); // 5 second timeout
    });
  };

  const fallbackToProxy = async (request: any) => {
    const response = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  return {
    hasExtension,
    interceptorEnabled,
    toggleInterceptor,
    interceptRequest,
    testInterceptor,
  };
};
