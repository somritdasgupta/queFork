import { MutableRefObject } from "react";

export interface ProtocolConfig {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  defaultUrl?: string;
  name: string;
  color: string;
  description?: string;
  urlPattern: RegExp;
  placeholder: string;
}

export interface WebSocketContextType {
  ws: MutableRefObject<WebSocket | null>;
  isConnected: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  connect: (protocols?: string[]) => void;
  disconnect: () => void;
  url: string;
  onUrlChange: (url: string) => void;
  stats: {
    messagesSent: number;
    messagesReceived: number;
    reconnectAttempts: number;
    lastMessageTime: number | null;
    minLatency: number;
    maxLatency: number;
    averageLatency: number;
    bytesTransferred: number;
    latencyHistory: Array<{ timestamp: number; value: number }>;
  };
  currentLatency: number | null;
  connectionTime: number | null;
  connectionStartTime: number | null; // Add this field
  messages: Array<{
    type: "sent" | "received";
    content: string;
    timestamp: string;
  }>;
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  setMessagesBulk: (
    messages: Array<{
      type: "sent" | "received";
      content: string;
      timestamp: string;
    }>
  ) => void;
  activeProtocols: string[];
  setActiveProtocols: (protocols: string[]) => void;
  protocolHandlers: Record<
    string,
    {
      init: () => void;
      handleMessage: (data: any) => void;
    }
  >;
  protocolConfig: ProtocolConfig;
  updateProtocolConfig: (config: Partial<ProtocolConfig>) => void;
  subscribeToTopic: (topic: string) => void;
  unsubscribeFromTopic: (topic: string) => void;
}

export interface WebSocketStats {
  protocols: string[];
  messagesSent: number;
  messagesReceived: number;
  avgLatency: number | null;
  connectionDuration: number;
  bytesTransferred: number;
  messages: Array<{
    type: "sent" | "received";
    content: string;
    timestamp: string;
  }>;
  lastConnected: string;
}
