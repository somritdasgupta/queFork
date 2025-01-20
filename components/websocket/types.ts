import { MutableRefObject } from "react";

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
  };
  latencyHistory: Array<{ timestamp: number; value: number }>;
  currentLatency: number | null;
  connectionTime: number | null;
  messages: Array<{
    type: "sent" | "received";
    content: string;
    timestamp: string;
  }>;
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  setMessagesBulk: (messages: Array<{
    type: "sent" | "received";
    content: string;
    timestamp: string;
  }>) => void;
  activeProtocols: string[];
  setActiveProtocols: (protocols: string[]) => void;
  protocolHandlers: Record<string, {
    init: () => void;
    handleMessage: (data: any) => void;
  }>;
}
