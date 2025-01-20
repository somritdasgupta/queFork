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
    pingCount: 0,  // Add this to track ping messages separately
    pongCount: 0,  // Add this to track pong messages separately
    lastMessageTime: null as number | null,
  });
  
  const [latencyHistory, setLatencyHistory] = useState<Array<{ timestamp: number; value: number }>>([]);
  const pingTimestampRef = useRef<number | null>(null);

  // Add message handler reference to prevent recreation
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add messages state to context
  const [messages, setMessages] = useState<Array<{
    type: "sent" | "received";
    content: string;
    timestamp: string;
  }>>([]);

  // Add connection time tracking
  const [connectionTime, setConnectionTime] = useState<number | null>(null);

  // Add last latency state
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const latencyCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeProtocols, setActiveProtocols] = useState<string[]>([]);
  const [protocolHandlers, setProtocolHandlers] = useState<Record<string, any>>({});

  useEffect(() => {
    // Update connection time every second when connected
    let timer: NodeJS.Timeout;
    if (isConnected && connectionStartTimeRef.current) {
      timer = setInterval(() => {
        setConnectionTime(Math.floor((Date.now() - connectionStartTimeRef.current!) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isConnected]);

  const initializeProtocolHandlers = (protocols: string[]) => {
    const handlers: Record<string, any> = {};
    
    protocols.forEach(protocol => {
      switch(protocol) {
        case 'graphql-ws':
          handlers[protocol] = {
            init: () => {
              sendMessage(JSON.stringify({
                type: 'connection_init',
                payload: {}
              }));
            },
            handleMessage: (data: any) => {
              if (data.type === 'connection_ack') {
                toast.success('GraphQL Connection Initialized');
              }
            }
          };
          break;
          
        case 'mqtt':
          handlers[protocol] = {
            init: () => {
              sendMessage(JSON.stringify({
                type: 'mqtt_connect',
                clientId: `mqtt_${Math.random().toString(16).slice(2)}`,
                keepalive: 60
              }));
            },
            handleMessage: (data: any) => {
              if (data.type === 'connack') {
                toast.success('MQTT Connection Established');
              }
            }
          };
          break;

        // Add other protocol handlers
      }
    });

    setProtocolHandlers(handlers);
  };

  const isPingPongMessage = (message: string): boolean => {
    try {
      const data = JSON.parse(message);
      return data.type === 'ping' || data.type === 'pong';
    } catch {
      return false;
    }
  };

  const connect = useCallback((protocols?: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    try {
      setConnectionStatus("connecting");
      const wsUrl = url.startsWith('ws://') || url.startsWith('wss://') ? url : `ws://${url}`;
      
      wsRef.current = new WebSocket(wsUrl, protocols);
      connectionStartTimeRef.current = Date.now();

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus("connected");
        setActiveProtocols(protocols || []);
        // Add connection message
        setMessages(prev => [...prev, {
          type: "received",
          content: `Connected to ${wsUrl}${protocols?.length ? ` with ${protocols.join(', ')}` : ''}`,
          timestamp: new Date().toISOString()
        }]);
        toast.success(`Connected successfully${protocols?.length ? ` with ${protocols[0]}` : ''}`);

        if (protocols?.length) {
          initializeProtocolHandlers(protocols);
        }
        startPingInterval();
      };

      wsRef.current.onmessage = (event) => {
        try {
          // Skip ping/pong messages entirely
          if (isPingPongMessage(event.data)) {
            // Only handle latency update for pong messages
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'pong' && pingTimestampRef.current) {
                const latency = Date.now() - pingTimestampRef.current;
                setLastLatency(latency);
                setLatencyHistory(prev => {
                  const newHistory = [...prev, { timestamp: Date.now(), value: latency }];
                  return newHistory.filter(item => Date.now() - item.timestamp < 120000);
                });
              }
            } catch {}
            return;
          }

          // Handle protocol-specific messages
          if (activeProtocols.length > 0) {
            try {
              const data = JSON.parse(event.data);
              activeProtocols.forEach(protocol => {
                if (protocolHandlers[protocol]?.handleMessage) {
                  protocolHandlers[protocol].handleMessage(data);
                }
              });
            } catch {}
          }

          // Add to messages and update stats only for non-ping/pong messages
          setMessages(prev => [...prev, {
            type: "received",
            content: event.data,
            timestamp: new Date().toISOString()
          }]);

          setStats(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
            lastMessageTime: Date.now()
          }));

        } catch (error) {
          console.error('Error handling message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus("disconnected");
        // Add disconnection message
        setMessages(prev => [...prev, {
          type: "received",
          content: `Disconnected from ${wsUrl}`,
          timestamp: new Date().toISOString()
        }]);
        setStats(prev => ({
          ...prev,
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));
      };

      wsRef.current.onerror = () => {
        setConnectionStatus("error");
        // Add error message
        setMessages(prev => [...prev, {
          type: "received",
          content: `Connection error with ${wsUrl}`,
          timestamp: new Date().toISOString()
        }]);
      };
    } catch (error) {
      setConnectionStatus("error");
      toast.error("Connection failed");
    }
  }, [url, activeProtocols]);

  const startPingInterval = () => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

    // Send initial ping
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      pingTimestampRef.current = Date.now();
    }

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
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
      wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: startTime }));
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

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      // Check for ping/pong messages first
      if (isPingPongMessage(event.data)) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong' && pingTimestampRef.current) {
            const latency = Date.now() - pingTimestampRef.current;
            setLastLatency(latency);
            setLatencyHistory(prev => {
              const newHistory = [...prev, { timestamp: Date.now(), value: latency }];
              return newHistory.filter(item => Date.now() - item.timestamp < 120000);
            });
          }
        } catch {}
        return; // Skip UI updates for ping/pong
      }

      // Handle regular messages
      setMessages(prev => [...prev, {
        type: "received",
        content: event.data,
        timestamp: new Date().toISOString()
      }]);

      setStats(prev => ({
        ...prev,
        messagesReceived: prev.messagesReceived + 1,
        lastMessageTime: Date.now()
      }));

    } catch (error) {
      console.error('Error handling message:', error);
    }
  }, []);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.onmessage = handleWebSocketMessage;
    }
  }, [handleWebSocketMessage]);

  const disconnect = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      connectionStartTimeRef.current = null;
    }
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
        setMessages(prev => [...prev, {
          type: "sent",
          content,
          timestamp: new Date().toISOString()
        }]);

        setStats(prev => ({
          ...prev,
          messagesSent: prev.messagesSent + 1,
          lastMessageTime: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    }
  }, []);

  const clearMessages = () => {
    setMessages([]);
  };

  const setMessagesBulk = (newMessages: Array<{
    type: "sent" | "received";
    content: string;
    timestamp: string;
  }>) => {
    setMessages(newMessages);
  };

  const onUrlChange = (newUrl: string) => {
    setUrl(newUrl);
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
    latencyHistory,
    messages,
    sendMessage,
    clearMessages,
    connectionTime,
    setMessagesBulk,
    currentLatency: latencyHistory[latencyHistory.length - 1]?.value ?? 0,
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
