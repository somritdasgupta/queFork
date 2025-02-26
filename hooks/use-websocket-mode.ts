import { useEffect, useCallback } from "react";
import { URL_PATTERNS } from "./use-url-handler";

export function useWebSocketMode(
  url: string,
  isWebSocketMode: boolean,
  onWebSocketToggle: () => void,
  onStateUpdate?: (updates: {
    isWebSocketMode: boolean;
    method: string;
  }) => void
) {
  useEffect(() => {
    const isWebSocketUrl = URL_PATTERNS.websocket.test(url);
    const shouldBeWebSocketMode = isWebSocketUrl;

    if (shouldBeWebSocketMode !== isWebSocketMode) {
      setTimeout(() => {
        onStateUpdate?.({
          isWebSocketMode: shouldBeWebSocketMode,
          method: shouldBeWebSocketMode ? "WSS" : "GET",
        });
        onWebSocketToggle();
      }, 0);
    }
  }, [url, isWebSocketMode, onWebSocketToggle, onStateUpdate]);

  const formatWebSocketUrl = useCallback((url: string): string => {
    if (url.startsWith("ws://") || url.startsWith("wss://")) return url;
    if (url.startsWith("http://")) return url.replace("http://", "ws://");
    if (url.startsWith("https://")) return url.replace("https://", "wss://");
    return `ws://${url}`;
  }, []);

  return { formatWebSocketUrl };
}
