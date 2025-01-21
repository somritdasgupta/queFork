"use client";

// websocket-context.tsx
import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { WebSocketContextType } from "./types";
import { toast } from "sonner";

interface WebSocketProviderProps {
  children: React.ReactNode;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

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
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const latencyCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeProtocols, setActiveProtocols] = useState<string[]>([]);
  const [protocolHandlers, setProtocolHandlers] = useState<Record<string, any>>(
    {}
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

  const initializeProtocolHandlers = (protocols: string[], config?: any) => {
    const handlers: Record<string, any> = {};

    protocols.forEach((protocol) => {
      switch (protocol) {
        case "graphql-ws":
          handlers[protocol] = {
            init: () => {
              sendMessage(
                JSON.stringify({
                  type: "connection_init",
                  payload: {},
                })
              );
            },
            handleMessage: (data: any) => {
              if (data.type === "connection_ack") {
                toast.success("GraphQL Connection Initialized");
              } else if (data.type === "next") {
                toast.success("Received subscription data");
              }
            },
          };
          break;

        case "mqtt":
          handlers[protocol] = {
            init: () => {
              sendMessage(
                JSON.stringify({
                  type: "mqtt_connect",
                  clientId: `mqtt_${Math.random().toString(16).slice(2)}`,
                  keepalive: 60,
                })
              );
            },
            handleMessage: (data: any) => {
              if (data.type === "publish") {
                toast.success(`Received message on topic ${data.topic}`);
              } else if (data.type === "suback") {
                toast.success(`Subscribed to topic ${data.topic}`);
              }
            },
          };
          break;

        case "socketio":
          handlers[protocol] = {
            init: () => {
              // Socket.IO handshake
              sendMessage("40");
            },
            handleMessage: (data: any) => {
              if (typeof data === "string" && data.startsWith("42")) {
                toast.success("Received Socket.IO event");
              }
            },
          };
          break;
      }
    });

    setProtocolHandlers(handlers);
  };

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
      wsRef.current.send(JSON.stringify({
        type: 'ping',
        timestamp
      }));
      lastPingTimestamp.current = timestamp;
    }
  }, []);

  const handlePong = (timestamp: number) => {
    const latency = Date.now() - timestamp;
    if (latency > 0) { // Only update if latency is valid
      setCurrentLatency(latency);
      setStats(prev => ({
        ...prev,
        minLatency: Math.min(prev.minLatency, latency),
        maxLatency: Math.max(prev.maxLatency, latency),
        averageLatency: prev.averageLatency === 0 
          ? latency 
          : (prev.averageLatency + latency) / 2,
        latencyHistory: [...prev.latencyHistory, { timestamp: Date.now(), value: latency }].slice(-60)
      }));
    }
  };

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            handlePong(data.timestamp);
            return;
          }
        } catch {}
      }

      // Handle regular messages
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
        }));
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
      latencyHistory: []
    });
    setCurrentLatency(null);
  };

  const connect = useCallback(
    (protocols?: string[], config?: any) => {
      resetStats(); // Reset stats before new connection
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      try {
        setConnectionStatus("connecting");
        const wsUrl =
          url.startsWith("ws://") || url.startsWith("wss://")
            ? url
            : `ws://${url}`;

        // Clear previous protocol handlers
        setProtocolHandlers({});
        setActiveProtocols([]);

        // Create new connection with protocols
        wsRef.current = new WebSocket(wsUrl, protocols);
        connectionStartTimeRef.current = Date.now();

        if (protocols?.length) {
          setActiveProtocols(protocols);
          // Initialize with provided config
          initializeProtocolHandlers(protocols, config);
        }

        wsRef.current.onopen = () => {
          setIsConnected(true);
          setConnectionStatus("connected");
          setMessages((prev) => [
            ...prev,
            {
              type: "received",
              content: `Connected to ${wsUrl}${
                protocols?.length ? ` with ${protocols.join(", ")}` : ""
              }`,
              timestamp: new Date().toISOString(),
            },
          ]);
          toast.success(
            `Connected successfully${
              protocols?.length ? ` with ${protocols[0]}` : ""
            }`
          );
          sendPing();
          const pingInterval = setInterval(sendPing, 1000);
          pingIntervalRef.current = pingInterval;
        };

        wsRef.current.onmessage = handleWebSocketMessage;

        wsRef.current.onclose = () => {
          setIsConnected(false);
          setConnectionStatus("disconnected");
          setMessages((prev) => [
            ...prev,
            {
              type: "received",
              content: `Disconnected from ${wsUrl}`,
              timestamp: new Date().toISOString(),
            },
          ]);
          setStats((prev) => ({
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1,
          }));
        };

        wsRef.current.onerror = () => {
          setConnectionStatus("error");
          // Add error message
          setMessages((prev) => [
            ...prev,
            {
              type: "received",
              content: `Connection error with ${wsUrl}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        };
      } catch (error) {
        setConnectionStatus("error");
        toast.error("Connection failed");
      }

      // Start latency monitoring
      const pingInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          lastPingTimestamp.current = Date.now();
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, 1000);

      return () => clearInterval(pingInterval);
    },
    [url, sendPing, handleWebSocketMessage]
  );

  const startPingInterval = () => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

    // Send initial ping
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "ping", timestamp: Date.now() })
      );
      pingTimestampRef.current = Date.now();
    }

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "ping", timestamp: Date.now() })
        );
        pingTimestampRef.current = Date.now();
      }
    }, 1000);

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  };

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

  const disconnect = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      connectionStartTimeRef.current = null;
    }
    resetStats();
  };

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("WebSocket is not connected");
      return;
    }

    try {
      // Send the message regardless of type
      wsRef.current.send(content);

      // Only add to UI and stats if it's not a ping/pong message
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

  const onUrlChange = (newUrl: string) => {
    if (newUrl !== url) {
      resetStats();
      setUrl(newUrl);
    }
  };

  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  const value = {
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
    currentLatency, // Make sure this is included in the context value
    lastLatency,
    activeProtocols,
    setActiveProtocols,
    protocolHandlers,
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
