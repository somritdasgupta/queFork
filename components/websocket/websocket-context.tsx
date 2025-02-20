"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { ProtocolConfig, WebSocketContextType } from "./types";
import { toast } from "sonner";
import { HistoryItem, WebSocketStats } from "@/types";

interface WebSocketProviderProps {
  children: React.ReactNode;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Update initial state with required properties
const initialProtocolConfig: ProtocolConfig = {
  name: "Default",
  color: "#000000",
  urlPattern: /^wss?:\/\//,
  placeholder: "ws://",
  autoReconnect: false,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
};

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [url, setUrl] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const connectionStartTimeRef = useRef<number | null>(null);
  // Add new state for stats
  const [stats, setStats] = useState({
    messagesSent: 0,
    messagesReceived: 0,
    reconnectAttempts: 0,
    packetLoss: 0,
    pingCount: 0,
    pongCount: 0,
    lastMessageTime: null as number | null,
    messageRate: 0,
    bytesTransferred: 0,
    lastMinuteMessages: 0,
    minLatency: Infinity,
    maxLatency: 0,
    averageLatency: 0,
    successfulConnections: 0,
    failedConnections: 0,
    uptime: 0,
    latencyHistory: [] as { timestamp: number; value: number }[],
  });

  const pingTimestampRef = useRef<number | null>(null);

  // Add message handler reference to prevent recreation
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(
    null
  );
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add messages state to context
  const [messages, setMessages] = useState<
    Array<{
      type: "sent" | "received";
      content: string;
      timestamp: string;
    }>
  >([]);

  // Add connection time tracking
  const [connectionTime, setConnectionTime] = useState<number | null>(null);

  // Add last latency state
  const [] = useState<number | null>(null);
  const latencyCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeProtocols, setActiveProtocols] = useState<string[]>([]);
  const [protocolHandlers] = useState<Record<string, any>>({});

  // Update protocolConfig state with proper initial value
  const [protocolConfig, setProtocolConfig] = useState<ProtocolConfig>(
    initialProtocolConfig
  );
  const [currentLatency, setCurrentLatency] = useState<number | null>(null);
  const lastPingTimestamp = useRef<number | null>(null);

  useEffect(() => {
    // Update connection time every second when connected
    let timer: NodeJS.Timeout;
    if (isConnected && connectionStartTimeRef.current) {
      timer = setInterval(() => {
        setConnectionTime(
          Math.floor((Date.now() - connectionStartTimeRef.current!) / 1000)
        );
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isConnected]);

  const isPingPongMessage = (message: string): boolean => {
    try {
      const data = JSON.parse(message);
      return data.type === "ping" || data.type === "pong";
    } catch {
      return false;
    }
  };

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const timestamp = Date.now();
      wsRef.current.send(
        JSON.stringify({
          type: "ping",
          timestamp,
        })
      );
      lastPingTimestamp.current = timestamp;
    }
  }, []);

  const handlePong = (timestamp: number) => {
    const latency = Date.now() - timestamp;
    if (latency > 0) {
      // Only update if latency is valid
      setCurrentLatency(latency);
      setStats((prev) => ({
        ...prev,
        minLatency: Math.min(prev.minLatency, latency),
        maxLatency: Math.max(prev.maxLatency, latency),
        averageLatency:
          prev.averageLatency === 0
            ? latency
            : (prev.averageLatency + latency) / 2,
        latencyHistory: [
          ...prev.latencyHistory,
          { timestamp: Date.now(), value: latency },
        ].slice(-60),
      }));
    }
  };

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    messageHandlerRef.current = handleWebSocketMessage;

    try {
      if (typeof event.data === "string") {
        // Calculate bytes for received message
        const bytes = new Blob([event.data]).size;

        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") {
            handlePong(data.timestamp);
            return;
          }
        } catch {}

        if (!isPingPongMessage(event.data)) {
          setMessages((prev) => [
            ...prev,
            {
              type: "received",
              content: event.data,
              timestamp: new Date().toISOString(),
            },
          ]);

          setStats((prev) => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
            lastMessageTime: Date.now(),
            bytesTransferred: prev.bytesTransferred + bytes,
          }));
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }, []);

  const resetStats = () => {
    setStats({
      messagesSent: 0,
      messagesReceived: 0,
      reconnectAttempts: 0,
      packetLoss: 0,
      pingCount: 0,
      pongCount: 0,
      lastMessageTime: null,
      messageRate: 0,
      bytesTransferred: 0,
      lastMinuteMessages: 0,
      minLatency: Infinity,
      maxLatency: 0,
      averageLatency: 0,
      successfulConnections: 0,
      failedConnections: 0,
      uptime: 0,
      latencyHistory: [],
    });
    setCurrentLatency(null);
  };

  const updateHistoryOnDisconnect = useCallback(() => {
    if (!url || !currentHistoryId.current) return;

    const wsStats: WebSocketStats = {
      protocols: activeProtocols,
      messagesSent: stats.messagesSent,
      messagesReceived: stats.messagesReceived,
      avgLatency: stats.averageLatency,
      connectionDuration: connectionTime || 0,
      messages: messages, // Save messages in history
      lastConnected: new Date().toISOString(),
    };

    const historyItem: HistoryItem = {
      id: currentHistoryId.current,
      type: "websocket",
      method: "WS",
      url: url,
      timestamp: new Date().toISOString(),
      wsStats,
      request: {
        headers: [],
        params: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
      },
    };

    // Update existing history
    const existingHistory = JSON.parse(
      localStorage.getItem("apiHistory") || "[]"
    );
    const updatedHistory = [
      historyItem,
      ...existingHistory.filter(
        (item: HistoryItem) => item.id !== historyItem.id
      ),
    ];
    localStorage.setItem("apiHistory", JSON.stringify(updatedHistory));

    window.dispatchEvent(
      new CustomEvent("websocketHistoryUpdated", {
        detail: { history: updatedHistory },
      })
    );
  }, [url, stats, connectionTime, activeProtocols, messages]);

  // Add reference to keep track of current history item ID
  const currentHistoryId = useRef<string | null>(null);

  // Add function to update history periodically
  const updateHistoryPeriodically = useCallback(() => {
    if (!url || !currentHistoryId.current) return;

    const existingHistory = JSON.parse(
      localStorage.getItem("apiHistory") || "[]"
    );
    const updatedHistory = existingHistory.map((item: HistoryItem) => {
      if (
        item.type === "websocket" &&
        item.url === url &&
        item.id === currentHistoryId.current
      ) {
        return {
          ...item,
          wsStats: {
            ...item.wsStats,
            messagesSent: stats.messagesSent,
            messagesReceived: stats.messagesReceived,
            avgLatency: stats.averageLatency,
            connectionDuration: connectionTime || 0,
            protocols: activeProtocols,
          },
        };
      }
      return item;
    });

    localStorage.setItem("apiHistory", JSON.stringify(updatedHistory));
  }, [url, stats, connectionTime, activeProtocols]);

  // Add periodic update effect
  useEffect(() => {
    let updateInterval: NodeJS.Timeout;

    if (isConnected) {
      // Update history every 2 seconds while connected
      updateInterval = setInterval(updateHistoryPeriodically, 2000);
    }

    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
        // Final update when cleaning up
        updateHistoryPeriodically();
      }
    };
  }, [isConnected, updateHistoryPeriodically]);

  // Update window unload handler
  useEffect(() => {
    const handleUnload = () => {
      if (isConnected) {
        updateHistoryPeriodically();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [isConnected, updateHistoryPeriodically]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      // First, remove message handler to prevent any further messages
      if (wsRef.current.onmessage) {
        wsRef.current.onmessage = null;
      }

      // Update history before closing
      updateHistoryOnDisconnect();

      // Close and cleanup WebSocket
      wsRef.current.close();
      wsRef.current = null;

      // Clear all intervals
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (latencyCheckIntervalRef.current)
        clearInterval(latencyCheckIntervalRef.current);

      // Reset only connection-specific refs
      connectionStartTimeRef.current = null;
      pingIntervalRef.current = null;
      latencyCheckIntervalRef.current = null;
      messageHandlerRef.current = null;

      // Only update connection states
      setIsConnected(false);
      setConnectionStatus("disconnected");
      // Note: Not clearing messages or stats here
    }
  }, [updateHistoryOnDisconnect]);

  const initializeNewConnection = (wsUrl: string, protocols?: string[]) => {
    try {
      setConnectionStatus("connecting");
      setMessages([]); // Clear messages before new connection

      const formattedUrl =
        wsUrl.startsWith("ws://") || wsUrl.startsWith("wss://")
          ? wsUrl
          : `ws://${wsUrl}`;

      wsRef.current = new WebSocket(formattedUrl);
      connectionStartTimeRef.current = Date.now();
      currentHistoryId.current = Date.now().toString();

      // Configure WebSocket
      wsRef.current.binaryType = "blob";

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus("connected");
        toast.success("Connected successfully");

        // Start ping monitoring
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        sendPing();
        pingIntervalRef.current = setInterval(sendPing, 1000);

        // Set active protocols
        setActiveProtocols(protocols || ["websocket"]);
      };

      wsRef.current.onclose = (event) => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        setIsConnected(false);
        setConnectionStatus("disconnected");
        toast.info(
          `Connection closed${event.reason ? `: ${event.reason}` : ""}`
        );
      };

      wsRef.current.onerror = () => {
        setConnectionStatus("error");
        toast.error("Connection failed - please check the URL and try again");
      };

      wsRef.current.onmessage = handleWebSocketMessage;
    } catch (error) {
      console.error("Connection setup error:", error);
      setConnectionStatus("error");
      toast.error("Failed to establish connection");
      disconnect();
    }
  };

  const connect = useCallback(
    async (protocols?: string[]) => {
      if (!url) {
        toast.error("Please enter a WebSocket URL");
        return;
      }

      // Clear previous messages and stats only when making a new connection
      setMessages([]);
      resetStats();

      if (wsRef.current) {
        disconnect();
      }

      initializeNewConnection(url, protocols);
    },
    [url, disconnect]
  );

  const checkLatency = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const startTime = Date.now();
      wsRef.current.send(
        JSON.stringify({ type: "ping", timestamp: startTime })
      );
      pingTimestampRef.current = startTime;
    }
  }, []);

  const startLatencyMonitoring = useCallback(() => {
    // Initial latency check
    checkLatency();

    // Set up interval for periodic checks
    latencyCheckIntervalRef.current = setInterval(checkLatency, 5000);

    return () => {
      if (latencyCheckIntervalRef.current) {
        clearInterval(latencyCheckIntervalRef.current);
      }
    };
  }, [checkLatency]);

  useEffect(() => {
    if (isConnected) {
      return startLatencyMonitoring();
    }
    return () => {
      if (latencyCheckIntervalRef.current) {
        clearInterval(latencyCheckIntervalRef.current);
      }
    };
  }, [isConnected, startLatencyMonitoring]);

  const onUrlChange = useCallback(
    (newUrl: string) => {
      // Don't allow URL changes while connected
      if (isConnected) {
        toast.error("Please disconnect first before changing URL");
        return;
      }

      if (newUrl !== url) {
        resetStats();
        // Ensure proper WebSocket URL format
        const formattedUrl =
          newUrl.startsWith("ws://") || newUrl.startsWith("wss://")
            ? newUrl
            : newUrl.startsWith("http://") || newUrl.startsWith("https://")
              ? newUrl.replace(/^http/, "ws")
              : `ws://${newUrl}`;
        setUrl(formattedUrl);
      }
    },
    [url, isConnected]
  );

  const handleHistorySelect = useCallback(
    (event: CustomEvent) => {
      const { url: historyUrl, messages, stats: historyStats } = event.detail;
      if (historyUrl) {
        onUrlChange(historyUrl);

        // Restore messages and stats from history
        if (messages) {
          setMessages(messages);
          setStats((prev) => ({
            ...prev,
            messagesSent: historyStats?.messagesSent || 0,
            messagesReceived: historyStats?.messagesReceived || 0,
            averageLatency: historyStats?.avgLatency || 0,
            // Keep other stats at initial values
            minLatency: Infinity,
            maxLatency: 0,
            latencyHistory: [],
            lastMessageTime: null,
          }));
        }
      }
    },
    [onUrlChange]
  );

  useEffect(() => {
    window.addEventListener(
      "setWebSocketProtocol",
      handleHistorySelect as EventListener
    );
    return () => {
      window.removeEventListener(
        "setWebSocketProtocol",
        handleHistorySelect as EventListener
      );
    };
  }, [handleHistorySelect]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("WebSocket is not connected");
      return;
    }

    try {
      wsRef.current.send(content);
      const bytes = new Blob([content]).size;

      if (!isPingPongMessage(content)) {
        setMessages((prev) => [
          ...prev,
          {
            type: "sent",
            content,
            timestamp: new Date().toISOString(),
          },
        ]);

        setStats((prev) => ({
          ...prev,
          messagesSent: prev.messagesSent + 1,
          lastMessageTime: Date.now(),
          bytesTransferred: prev.bytesTransferred + bytes,
        }));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  }, []);

  const clearMessages = () => {
    setMessages([]);
  };

  const setMessagesBulk = (
    newMessages: Array<{
      type: "sent" | "received";
      content: string;
      timestamp: string;
    }>
  ) => {
    setMessages(newMessages);
  };

  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  // Fix updateProtocolConfig to handle partial updates
  const updateProtocolConfig = useCallback(
    (config: Partial<ProtocolConfig>) => {
      setProtocolConfig((prev) => ({
        ...prev,
        ...config,
      }));
    },
    []
  );

  const subscribeToTopic = (topic: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage(JSON.stringify({ type: "subscribe", topic }));
    }
  };

  const unsubscribeFromTopic = (topic: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage(JSON.stringify({ type: "unsubscribe", topic }));
    }
  };

  const value: WebSocketContextType = {
    ws: wsRef,
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    url,
    onUrlChange,
    connectionStartTime: connectionStartTimeRef.current,
    stats,
    messages,
    sendMessage,
    clearMessages,
    connectionTime,
    setMessagesBulk,
    currentLatency,
    activeProtocols,
    setActiveProtocols,
    protocolHandlers,
    protocolConfig,
    updateProtocolConfig,
    subscribeToTopic,
    unsubscribeFromTopic,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
};
