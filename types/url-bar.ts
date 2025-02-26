export type UrlProtocol = "wss" | "sio";
export type UrlType = "websocket" | "http";

export interface UrlVariable {
  key: string;
  value: string;
  type?: "text" | "secret";
}

export interface UrlBarProps {
  method: string;
  url: string;
  isLoading: boolean;
  wsState?: {
    isConnected: boolean;
    connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  };
  isWebSocketMode: boolean;
  variables: UrlVariable[];
  recentUrls?: string[];
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSendRequest: () => void;
  onWebSocketToggle: () => void;
  onCancel?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  className?: string;
  isMobile?: boolean;
  hasExtension?: boolean;
  hideMethodSelector?: boolean; 
}
