import { Tab } from "@/types/tabs";

export const formatDomain = (url: string): string => {
  try {
    const urlObj = new URL(url.replace(/^ws(s)?:\/\//i, "http$1://"));
    const parts = urlObj.hostname.split(".");
    return parts.length > 2 ? parts[parts.length - 2] : parts[0];
  } catch {
    return url.split("/")[0];
  }
};

export const getMethodColorClass = (method: string) => {
  switch (method?.toUpperCase()) {
    case "GET":
      return "text-emerald-400 border-emerald-500/20";
    case "POST":
      return "text-blue-400 border-blue-500/20";
    case "PUT":
      return "text-yellow-400 border-yellow-500/20";
    case "DELETE":
      return "text-red-400 border-red-500/20";
    case "PATCH":
      return "text-purple-400 border-purple-500/20";
    default:
      return "text-slate-400 border-slate-500/20";
  }
};

export const getEmptyTabState = () => ({
  method: "GET",
  url: "",
  headers: [
    { key: "", value: "", enabled: true, showSecrets: false, type: "" },
  ],
  params: [{ key: "", value: "", enabled: true, showSecrets: false, type: "" }],
  body: { type: "none" as const, content: "" },
  auth: { type: "none" as const },
  response: null,
  isLoading: false,
  isWebSocketMode: false,
  preRequestScript: "",
  testScript: "",
  testResults: [],
  scriptLogs: [],
  wsState: {
    isConnected: false,
    connectionStatus: "disconnected" as const,
    messages: [],
  },
});

export const getTabStatus = (tab: Tab) => {
  if (tab.state.isWebSocketMode) {
    const wsState = tab.state.wsState;
    if (wsState) {
      switch (wsState.connectionStatus) {
        case "connected":
          return { color: "bg-green-500", tooltip: "WebSocket Connected" };
        case "connecting":
          return {
            color: "bg-yellow-500 animate-pulse",
            tooltip: "Connecting...",
          };
        case "error":
          return { color: "bg-red-500", tooltip: "Connection Error" };
        default:
          return { color: "bg-slate-500", tooltip: "Disconnected" };
      }
    }
    return { color: "bg-purple-500/50", tooltip: "WebSocket Mode" };
  }

  if (tab.state.isLoading) {
    return { color: "bg-blue-500 animate-pulse", tooltip: "Loading" };
  }
  if (tab.state.response) {
    const status = tab.state.response.status;
    if (status >= 200 && status < 300) {
      return { color: "bg-emerald-500", tooltip: `Success (${status})` };
    }
    if (status >= 400) {
      return { color: "bg-red-500", tooltip: `Error (${status})` };
    }
  }
  return { color: "bg-slate-500", tooltip: "Ready" };
};
