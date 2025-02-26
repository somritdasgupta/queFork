import { useMemo, useCallback } from "react";
import { UrlVariable, UrlType } from "@/types/url-bar";

export const URL_PATTERNS = {
  websocket: /^wss?:\/\/|socket\.io|websocket/,
  socketIO:
    /socket\.io|engine\.io|\?EIO=[3-4]|transport=websocket|\/socket\.io\/?/,
} as const;

export function useUrlHandler(variables: UrlVariable[]) {
  const isValidUrl = useCallback(
    (urlString: string): boolean => {
      if (!urlString || urlString.match(/^(https?:\/\/|wss?:\/\/)$/))
        return false;

      // First substitute variables to check if the URL would be valid
      let processedUrl = urlString;
      const hasVariables = urlString.includes("{{");

      if (hasVariables) {
        const matches = urlString.match(/\{\{([^}]+)\}\}/g) || [];
        let allVarsFound = true;

        matches.forEach((match) => {
          const varName = match.slice(2, -2);
          const variable = variables.find((v) => v.key === varName);

          if (variable) {
            processedUrl = processedUrl.replace(match, variable.value);
          } else {
            allVarsFound = false;
          }
        });

        if (!allVarsFound) return false;
      }

      // Now validate the processed URL
      return /^(https?:\/\/|wss?:\/\/)?(localhost|[\w-]+\.[\w.-]+)(:\d+)?([/?].*)?$/.test(
        processedUrl
      );
    },
    [variables]
  );

  const getUrlType = useCallback(
    (url: string): UrlType =>
      URL_PATTERNS.websocket.test(url) ? "websocket" : "http",
    []
  );

  const detectWebSocketProtocol = useCallback(
    (url: string) => (URL_PATTERNS.socketIO.test(url) ? "sio" : "wss"),
    []
  );

  return {
    isValidUrl,
    getUrlType,
    detectWebSocketProtocol,
  };
}
